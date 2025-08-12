from datetime import datetime
from web3 import Web3
import sys, time, yaml, requests
from apscheduler.schedulers.blocking import BlockingScheduler
import pandas as pd
import talib
from db import init_db
from lib.trading_v1 import Order, Trade, TradingBot, Strategy,OrderPlan
# from lib.broker.dex.bsc_pancake import PancakeBroker
from lib.broker.dex.hedera_swap import SwapBroker
from db.connection import get_engine, get_session

with open('configs/hedera_chain.yaml', 'r') as file:
    chain_info = yaml.safe_load(file)


class MyStrategy(Strategy):
    def __init__(self, interval:str, db_engine):
        # order -> add parent trade id | state new / open / closed
        self.order_queue = []

        super().__init__(
            interval=interval,
            db_engine=db_engine)
        
    # === customize this function to fetch data from your database or API ===
    def get_data(self, tokens: list, currency: str) -> pd.DataFrame:
        """
        Get market data for the given tokens
        """
        current = int(time.time()) + 5
        # WHBAR/USDC
        api_url = f"https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/pools/0xc5b707348da504e9be1bd4e21525459830e7b11d/ohlcv/minute?aggregate=5&before_timestamp={current}&limit=60&include_empty_intervals=true"
        rsi_period = 14

        response = requests.get(api_url)
        if response.status_code != 200:
            raise Exception(f"Error {response.status_code}: {response.text}")

        # Parse OHLCV
        raw_data = response.json()
        candles = raw_data.get("data", {}).get("attributes", {}).get("ohlcv_list", [])

        # Create DataFrame
        df = pd.DataFrame(candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='s')
        df[['open', 'high', 'low', 'close', 'volume']] = df[['open', 'high', 'low', 'close', 'volume']].astype(float)

        # Calculate RSI
        df[f'RSI_{rsi_period}'] = talib.RSI(df['close'], timeperiod=rsi_period)
        df['symbol'] = tokens[0]+currency  # Assuming single token for simplicity
        return df

    # === customize this function to run your trading strategy ===
    def run(self, pair: list, data: pd.DataFrame, budget: float, bot: TradingBot) -> OrderPlan | None:
        print(f'Running strategy: {self.__class__.__name__} with pair: {pair} and budget: {budget} and data: {data.shape[0]} rows')
        # get bot info
        rsi = data['RSI_14'].values
        print(f'RSI values: {rsi[-5:]}')

        amount=budget*0.5
        price = float(data['close'].iloc[-1])
        qty = amount/ price  # calculate qty based on last close price
        if ((rsi[-1] < 30 and rsi[-2] < rsi[-1] and rsi[-3] >= rsi[-2] and rsi[-4] >= rsi[-3]) 
                or (rsi[-1] < 30 and rsi[-2] - rsi[-1] > 10)):
            print(f"Buy signal for {pair} at price {price}, qty {qty}")
            bot.buy(pair=pair, price=price, qty=qty,estimated_amount=amount)
        # close trades on sell signal
        elif ((rsi[-1] > 70 and rsi[-2] > rsi[-1] and rsi[-3] <= rsi[-2] and rsi[-4] <= rsi[-3])
                or (rsi[-1] > 70 and rsi[-1] - rsi[-2] > 10)):
            print(f"Sell signal for {pair} at price {price}, qty {qty}")
            bot.sell(pair=pair, price=price)
        else:
            print("No signal")
        return None

# === Run the bot ===
def bot_run(bot: TradingBot):
    bot.run()
    bot.checking_orders()
    num_process_trade = sum([len(v) for k, v in bot.process_trades.items()])
    if num_process_trade > 0:
        print(f"Processing {num_process_trade} trades: {bot.process_trades}")
    i = 0
    while i < 3 and num_process_trade > 0:
        bot.checking_orders()
        num_process_trade = sum([len(v) for k, v in bot.process_trades.items()])
        i += 1
        time.sleep(5)
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print('Time', now, " - process trades: ",bot.checking_orders(), "open trades: ", bot.open_trades, "history trades: ", bot.history_trades)

def get_vault_state(vault_contract):
    """Get vault state from vault contract"""
    try:
        # Get vault state to check if it's active
        vault_state = vault_contract.functions.getVaultState().call()
        # Get run and stop timestamps from vault contract
        run_timestamp = vault_contract.functions.runTimestamp().call()
        stop_timestamp = vault_contract.functions.stopTimestamp().call()
        
        state = {
            "total_shares": vault_state[0],
            "total_balance" : vault_state[1],
            "shareholder_count" : vault_state[2],
            "deposits_closed" : vault_state[3],
            "vault_closed" : vault_state[4],
            "run_timestamp" : run_timestamp,
            "stop_timestamp" : stop_timestamp
        } 
        return state
    except Exception as e:
        print(f"Error getting vault state: {e}")
        return None

def close_all_trades(bot, trade_token, currency):
    """Close all open trades/orders for the given token pair"""
    print(f"Closing all open trades for {trade_token}/{currency}")
    
    # Create symbol in the format expected by the bot (currency + trade_token)
    symbol = currency + trade_token
    
    # Check if there are open trades for this symbol
    open_trades = bot.open_trades.get(symbol, [])
    if not open_trades:
        print("No open trades to close")
        return True
    
    print(f"Found {len(open_trades)} open trades to close")
    
    # Close all open trades by selling
    try:
        print(f"Closing trade {trade_token}")
        # Use the pair format [currency, trade_token] as expected by the bot
        bot.sell(pair=[currency, trade_token], price=0)  # Market order to close
    except Exception as e:
        print(f"Error closing trade: {e}")
    
    return False  # Return False if there were trades to close

def wait_for_orders(bot, max_wait=60):
    """Wait for all orders to close or fail"""
    print("Waiting for orders to complete...")
    start_time = time.time()
    
    while time.time() - start_time < max_wait:
        # Check orders status
        bot.checking_orders()
        
        # Count open trades
        total_open = sum([len(v) for k, v in bot.open_trades.items()])
        
        if total_open == 0:
            print("All orders completed successfully")
            return True
        
        print(f"Still waiting... {total_open} open trades remaining")
        time.sleep(5)
    
    print(f"Timeout waiting for orders after {max_wait} seconds")
    return False

def swap_remaining_tokens(bot, trade_token, currency):
    """Swap all remaining token2 (trade_token) to token1 (currency)"""
    print(f"Swapping remaining {trade_token} to {currency}")
    
    try:
        # Check vault balance of trade_token using broker's check_balance method
        balance, pending = bot._broker.check_balance(bot)
        
        # Get the specific token balance from bot's token balance
        token2_balance = bot._token_balance.get(trade_token, {}).get('qty', 0)
        if token2_balance > 0:
            token2_balance = bot._broker.from_wei(trade_token, token2_balance)
        
        print(f"Vault {trade_token} balance: {token2_balance}")
        
        if token2_balance <= 0:
            print(f"No {trade_token} to swap")
            return True
        
        # Get current price for swap
        current_price = bot._broker.get_price([trade_token, currency])
        print(f"Current {trade_token}/{currency} price: {current_price}")
        
        # Swap all remaining token2 to token1
        swap_amount = token2_balance * 0.99  # Leave small amount for gas
        print(f"Swapping {swap_amount} {trade_token} to {currency}")
        
        # Convert to wei for the swap
        swap_amount_wei = bot._broker.to_wei(trade_token, swap_amount)
        
        # Execute swap through vault using path format
        result = bot._broker.swap_exact_in(
            bot=bot,
            path=[trade_token, currency],  # Use path format as required by the broker
            amount_in=swap_amount_wei,
            amount_out_min=0  # No slippage protection for closing
        )
        
        print(f"Swap transaction: {result}")
        return True
        
    except Exception as e:
        print(f"Error swapping remaining tokens: {e}")
        return False

def vault_withdraw(bot, trade_token, currency):
    """Execute vault withdrawal sequence"""
    # check vault state
    vault_state = bot.vault.functions.getVaultState().call()
    if vault_state[4]:  # is closed
        print("Vault is closed, skipping withdraw")
        return False
    print("=== Starting vault withdraw sequence ===")
    
    # Step 1: Close all open trades/orders
    print("Step 1: Closing all open trades...")
    close_all_trades(bot, trade_token, currency)
    
    # Step 2: Wait for all orders to close or fail
    print("Step 2: Waiting for orders to complete...")
    if not wait_for_orders(bot):
        print("Warning: Some orders may not have completed")
    
    # Step 3: Check vault token2 balance and swap to token1
    print("Step 3: Swapping remaining tokens...")
    if not swap_remaining_tokens(bot, trade_token, currency):
        print("Warning: Failed to swap remaining tokens")
    
    # Step 4: Wait for swap transaction receipt
    print("Step 4: Waiting for swap transaction...")
    time.sleep(10)  # Wait for transaction to be mined
    
    # Step 5: Call vault withdraw
    print("Step 5: Calling vault withdraw...")
    try:
        # Call vault withdraw function directly (only manager can call this)
        result = bot.vault.functions.withdraw().build_transaction({
            'from': bot.wallet['address'],
            'nonce': bot._broker.gateway.eth.get_transaction_count(bot.wallet['address']),
            'gas': 200_000,  # should scale by number of shareholders
            'gasPrice': bot._broker.gateway.eth.gas_price
        })
        
        # Sign and send transaction
        signed_txn = bot._broker.gateway.eth.account.sign_transaction(result, bot.wallet['private'])
        tx_hash = bot._broker.gateway.eth.send_raw_transaction(signed_txn.raw_transaction)
        
        print(f"Vault withdraw transaction sent: {tx_hash.hex()}")
        
        # Wait for receipt
        # receipt = bot._broker.gateway.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
        # print(f"Vault withdraw completed: {receipt}")        
        return True
        
    except Exception as e:
        print(f"Error calling vault withdraw: {e}")
        return False

def bot_run_with_vault_check(bot, trade_token, currency):
    """Run bot with vault time checking logic"""
    try:
        # Get vault timestamps
        vault_state = get_vault_state(bot.vault)
        if vault_state is None:
            print("Could not get vault state, skipping execution")
            return
        
        current_time = int(time.time())
        print(f"Current time: {datetime.fromtimestamp(current_time)}")
        
        # Check if we should run the bot
        if current_time < vault_state['run_timestamp']:
            print(f"Before run time ({datetime.fromtimestamp(vault_state['run_timestamp'])}), skipping bot execution")
            return
        elif current_time >= vault_state['stop_timestamp']:
            print(f"After stop time ({datetime.fromtimestamp(vault_state['stop_timestamp'])}), executing vault withdrawal")
            vault_withdraw(bot, trade_token, currency)
            return
        else:
            print(f"During run time, executing normal bot operations")
            print(f"Vault state: {vault_state}")
            bot.update_balance()
            bot.update_fund()
            bot_run(bot)
            
    except Exception as e:
        print(f"Error in bot run with vault check: {e}")
        sys.exit(1)

def renew_vault_state(bot, deposit_time:int=3600, live_time:int=7200, max_shareholders:int=50):
    """Update vault state"""
    block = bot._broker.gateway.eth.get_block('latest')
    update_txn = bot.vault.functions.updateVault(
        bot.currency,
        bot.trade_token,
        block['timestamp'] + deposit_time,                        # runTimestamp
        block['timestamp'] + live_time,                        # stopTimestamp
        max_shareholders                                                # maxShareholders
    ).build_transaction({
        'from': bot.wallet['address'],
        'nonce': bot._broker.gateway.eth.get_transaction_count(bot.wallet['address']),
        'gas': 100_000,
        'gasPrice': bot._broker.gateway.eth.gas_price
    })
    signed_txn = bot._broker.gateway.eth.account.sign_transaction(update_txn, bot.wallet['private'])
    tx_hash = bot._broker.gateway.eth.send_raw_transaction(signed_txn.raw_transaction)
    print(f"Vault update transaction sent: {tx_hash.hex()}")
    return tx_hash.hex()

if __name__ == '__main__':
    chain = chain_info.get('mainnet', {})  # testnet or 'mainnet'

    native_token='HBAR'
    ecosystem_token='WHBAR'  
    supported_tokens=list(set(chain.get('contracts')['tokens'].keys())-set(['router','factory','USDC', native_token]))
    print(f"Supported tokens: {supported_tokens}")
    currency = 'USDC'  # default currency
    try:
        if len(sys.argv) < 2:
            raise Exception("No token provided")
        trade_token = str(sys.argv[1]).upper()
        currency = str(sys.argv[2]).upper() if len(sys.argv) > 2 else currency
        if trade_token not in supported_tokens:
            raise(f"Token {trade_token} not supported, must be one of {supported_tokens}")
    except Exception as e:
        print(e)
        print("Using default token: WHBAR")
        trade_token = 'WHBAR'  # default token to trade

    print(f"Trading token: {trade_token}")

    init_db()
    # === Broker ===
    broker = SwapBroker(
        rpcs=chain.get('rpcs'),
        ecosystem_token=ecosystem_token,
        contract_info=chain.get('contracts'),
        abi_url='',
        # router_address=chain.get('contracts').get('router'),
        # factory_address=chain.get('contracts').get('factory'),
    )
    db = get_session()
    engine = get_engine()
    # === Setup your strategy ===
    strat = MyStrategy(
        interval='5m',
        db_engine=engine)
    # === Trading bot ===
    vault = broker.gateway.eth.contract(
        address=Web3.to_checksum_address(chain.get('contracts').get('vault')[0]),
        abi=chain.get('contracts').get('vault')[1]
    )
    # print(vault.functions.getVaultState().call())

    bot = TradingBot(
        id='hedera_bot_v1',
        tokens=[trade_token], # , 'ETH'
        currency=currency,
        call_budget=0.5,
        invest_amount=1,
        balance=None,
        broker=broker,
        category='spot',
        strategy=strat,
        db=db,
        wallet=chain.get('wallet', {}),
        vault=vault
    )

    # print("bot balance:", bot.invest_amount, bot.balance, bot.pending_money)


    # === SCHEDULER === 
    scheduler = BlockingScheduler()
    try:
        scheduler.add_job(
            bot_run_with_vault_check,
            trigger='cron',
            # minute='0-55/5',
            second=20, # thong thuong du lieu 5p co sau 9-10s 
            kwargs={'bot': bot, 'trade_token': trade_token, 'currency': currency},
        )
        scheduler.start()
    except Exception as e:
        if isinstance(e, KeyboardInterrupt):
            print("Process interrupted by user.")
        else:
            print(f"An error occurred: {e}")

        print("Shutting down scheduler…")
        scheduler.shutdown(wait=False)  # stop scheduling new runs
        # Wait for running jobs to finish
        while scheduler.get_jobs():
            print(f"Waiting for {len(scheduler.get_jobs())} jobs to complete…")
            time.sleep(1)
        print("All jobs done. Exiting.")
        sys.exit(0)

