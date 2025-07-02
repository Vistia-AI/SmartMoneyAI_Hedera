from datetime import datetime
import sys, time, yaml, requests
from apscheduler.schedulers.blocking import BlockingScheduler
import pandas as pd
import talib
from db import init_db
from lib.trading import Order, Trade, TradingBot, Strategy,OrderPlan
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
        api_url = f"https://api.geckoterminal.com/api/v2/networks/hedera-hashgraph/pools/0xb4e267d955b0bbbc1ba5f39f9c92cc8369a1f712/ohlcv/minute?aggregate=5&before_timestamp={current}&limit=60&include_empty_intervals=true"
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


if __name__ == '__main__':
    chain = chain_info.get('testnet', {})  # testnet or 'mainnet'

    native_token='HBAR'
    ecosystem_token='WHBAR'  
    supported_tokens=list(set(chain.get('contracts').keys())-set(['router','factory','USDC', native_token, ecosystem_token]))
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
    bot = TradingBot(
        id='test',
        tokens=[trade_token], # , 'ETH'
        currency=currency,
        call_budget=0.01,
        invest_amount=10,
        balance=None,
        broker=broker,
        category='spot',
        strategy=strat,
        db=db,
        wallet=chain.get('wallet', {}),
    )

    print("bot balance:", bot.invest_amount, bot.balance, bot.pending_money)
    # === SCHEDULER === 
    scheduler = BlockingScheduler()
    try:
        scheduler.add_job(
            bot_run,
            trigger='cron',
            # minute='0-55/5',
            # second=59,
            second='0-59/15',
            kwargs={'bot': bot},
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