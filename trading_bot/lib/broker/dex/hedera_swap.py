import random
import sys, os, logging
from typing import Optional, Tuple
from functools import lru_cache 
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware
from web3.exceptions import TransactionNotFound, ContractLogicError
from web3.types import HexStr

import time, json, requests
import sys, os, logging
import numpy as np
from datetime import datetime 
from lib.trading_v1 import Order, Trade, TradingBot, Strategy, BaseBroker, OrderPlan
import ulid

def get_web3_gateway(urls: Optional[list[str]] = None) -> Web3:
    urls = urls.copy() if urls else ["https://testnet.hashio.io/api",]
    random.shuffle(urls)  # Randomize the order
    for url in urls:
        try:
            gateway = Web3(Web3.HTTPProvider(url))
            if gateway.is_connected():
                return gateway
        except Exception:
            continue
    raise Exception("No working endpoint found.")

class SwapBroker(BaseBroker):
    def __init__(self, rpcs, ecosystem_token='WHBAR', contract_info:dict=None, abi_url:str='', router_address=None, factory_address=None):
        self.abi_url = abi_url

        self.rpc_urls = rpcs
        self.gateway = get_web3_gateway(self.rpc_urls)
        self.gateway.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        self.ecosystem_token = ecosystem_token or 'WHBAR'
        # as estimate token info of 1000 ~ 1MB, this is aceptable
        self.tokens = contract_info['tokens']

        self.gas_limit = 1000_000
        self.router_contract = self.gateway.eth.contract(
            address=Web3.to_checksum_address(contract_info.get('router')[0]),
            abi=contract_info.get('router')[1]
        )
        self.factory_contract = self.gateway.eth.contract(
            address=Web3.to_checksum_address(contract_info.get('factory')[0]),
            abi=contract_info.get('factory')[1]
        )
        

    @lru_cache()
    def get_ABI(self, address:str):
        try:
            url = self.abi_url.format(address=address)
            return requests.get(url).json()['result']
        except Exception as e:
            raise Exception(f"Failed to get ABI for {address}: {e}")
            return None

    @lru_cache()
    def get_decimal(self, symbol: str):
        try:
            token = self.gateway.eth.contract(
                address=self.tokens[symbol][0], 
                abi=self.tokens[symbol][1]
            )
            res = token.functions.decimals().call()
        except Exception as e:
            print(e)
            return 18
        return res

    @lru_cache()
    def to_wei(self, symbol: str, amount: float):
        decimal = self.get_decimal(symbol)
        return int(amount * 10**decimal)

    @lru_cache()
    def from_wei(self, symbol: str, amount: int):
        decimal = self.get_decimal(symbol)
        return amount / 10**decimal

    def cache_clear(self):
        """
        Clear cache for all methods
        """
        self.get_pair_info.cache_clear()

    def get_pair_info(self, pair:list[str]) -> dict:
        t1 = pair[0]
        t2 = pair[1]
        res = {
            # 'baseCoin': t1,
            # 'quoteCoin': t2,
            
            'minPrice': self.from_wei(t1, 1),
            'tickSize': 0,
            'minOrderQty': float(self.from_wei(t1, 1)),
            'qtyStep': float(self.from_wei(t1, 1)),
        }
        return res

    def check_balance(self, bot: 'TradingBot', re_check=True) -> Tuple[float, float]:
        """
        Check the balance of the bot, based on the bot. tokens and currency in the bot.
        update bot:
         - _token_balance
         - balance
         - pending_amount
        """
        # todo: fix -> balance update on trade -> not have to update token balance every time 
        # give 2 option calculate balance with / Without update token balance
        # all_tokens = bot.tokens + [bot.currency]
        pending_amount = 0.0 # total amount equal to value of non-currency tokens in open orders
        
        # Use vault address if available, otherwise use wallet address
        
        for t in [bot.currency] + bot.tokens:
            t_add, t_abi = self.tokens[t]
            token_contract = self.gateway.eth.contract(address=t_add, abi=t_abi)
            if t not in bot._token_balance.keys():
                bot._token_balance[t] = {'qty': 0, 'value': 0.0}
            bot._token_balance[t]['qty']=token_contract.functions.balanceOf(bot.vault.address).call()

            if t !=bot.currency and bot._token_balance[t]['qty'] > 0:
                try:
                    path, amounts_outs = self.estimate([t, bot.currency], bot._token_balance[t]['qty'], function='getAmountsOut')
                    v = amounts_outs[-1]
                    value = self.from_wei(t, v) if v > 0 else 0.0
                    bot._token_balance[t]['value'] = value
                    pending_amount += value
                except Exception as e:
                    print(f"Could not estimate value for {t} -> {bot.currency}: {e}")
                    bot._token_balance[t]['value'] = 0.0

        value = self.from_wei(bot.currency, bot._token_balance[bot.currency]['qty'])
        bot._token_balance[bot.currency]['value'] = value

        balance = bot._token_balance[bot.currency]['value']
        # pending_money = self.from_wei(bot.currency, pending_amount) if pending_amount > 0 else 0.0
        return balance, pending_amount 

    def estimate(self, t_path, amount_in_wei:int, function ='getAmountsIn'):
        # or cash_to_qty estimate token in and out
        if amount_in_wei < 1:
            raise ValueError(f"Invalid amount_in_wei: {amount_in_wei}, should be greater or equal to 1")
            return [], [0]
        else:
            amount_in_wei = int(amount_in_wei)
        nt_add = self.tokens[self.ecosystem_token][0]
        valid_path = [self.tokens.get(t_path[0])[0]]

        for t in t_path[1:]:
            token2 = self.tokens.get(t)[0]
            pair_address = self.factory_contract.functions.getPair(
                valid_path[-1], 
                token2
                ).call()
            if int(pair_address, 16) != 0:
                valid_path.append(token2)
            else:
                pair_add1 = self.factory_contract.functions.getPair(
                    valid_path[-1], 
                    nt_add
                    ).call()
                pair_add2 = self.factory_contract.functions.getPair(
                    nt_add,
                    token2, 
                    ).call()
                if int(pair_add1, 16)*int(pair_add2, 16) != 0:
                    valid_path.append(nt_add)
                    valid_path.append(token2)
                else:
                    raise Exception(f"valid path not found")
        # print("amount_in_wei: ", amount_in_wei, valid_path, function)
        try:
            if function == 'getAmountsIn':
                amounts = self.router_contract.functions.getAmountsIn(amount_in_wei, valid_path).call()
            else:
                amounts = self.router_contract.functions.getAmountsOut(amount_in_wei, valid_path).call()
        except Exception as e:
            if hasattr(e, 'args') and len(e.args) > 0:
                error_msg = str(e.args[0])
                if "ds-math-sub-underflow" in error_msg:
                    print(f"Error: liqidity not enough for {valid_path}, amount_in_wei: {amount_in_wei}")
            raise e
        return valid_path, amounts

    def get_allowance(self, address, symbol: str):
        # print("get_allowance: ", bot, symbol)
        if self.gateway is None:
            raise Exception('No self.gateway found')
        t_add, t_abi = self.tokens[symbol]
        try:
            token_contract = self.gateway.eth.contract(
                address=t_add, 
                abi=t_abi)
        except Exception as e:
            print(e)
        allowance = token_contract.functions.allowance(
            address, 
            self.router_contract.address
        ).call()
        return allowance  # Web3.to_wei(allowance, "ether")

    def approve_token(self, bot: 'TradingBot', symbol: str, amount: int = 10e12):
        # todo: if token balance is 0, can't approve
        amount = int(amount)
        if self.gateway is None:
            raise Exception('No self.gateway found')
        # print(f"Approving {symbol} token", amount)
        t_add, t_abi = self.tokens[symbol]
        token_contract = self.gateway.eth.contract(address=t_add, abi=t_abi)
        
        if hasattr(bot, 'vault') and bot.vault:
            # Approve through vault contract
            print("Approve through vault contract")
            approve_data = token_contract.encode_abi(
                abi_element_identifier="approve",
                args=[self.router_contract.address, amount]
            )
            
            # Build vault transaction
            txn = bot.vault.functions.callWhitelisted(
                token_contract.address,
                approve_data
            ).build_transaction({
                'from': bot.wallet['address'],
                'nonce': self.gateway.eth.get_transaction_count(bot.wallet['address']),
                'gas': self.gas_limit,
                'gasPrice': self.gateway.eth.gas_price
            })
            
            # Sign and send with wallet key
            signed_txn = self.gateway.eth.account.sign_transaction(txn, private_key=bot.wallet['private'])
            tx = self.gateway.eth.send_raw_transaction(signed_txn.raw_transaction)
        else:
            # Direct approval
            print("Direct approval")
            approve_txn = token_contract.functions.approve(
                self.router_contract.address,  # Router contract address
                amount  # Amount to approve
            ).build_transaction({
                "from": bot.wallet['address'],
                "nonce": self.gateway.eth.get_transaction_count(bot.wallet['address']),
                'gas': self.gas_limit, # requre for testnet - Optional: Add gas limit in BNB <= 0.01$ (need convert USDC -> bnb to get gas limit)
                "gasPrice": self.gateway.eth.gas_price,
            })
            signed_approve_txn = self.gateway.eth.account.sign_transaction(approve_txn, private_key=bot.wallet['private'])
            tx = self.gateway.eth.send_raw_transaction(signed_approve_txn.raw_transaction)
        
        return Web3.to_hex(tx)

    def _wait_for_receipt(self, txn_hash):
        receipt = None
        # print('Waiting for receipt')
        for i in range(0, 120):
            try:
                receipt = self.gateway.eth.get_transaction_receipt(txn_hash)
            except TransactionNotFound:
                time.sleep(0.5)
                continue
            if receipt:
                return receipt

    def _execute_vault_transaction(self, bot: 'TradingBot', target_address: str, encoded_data: str):
        """Execute transaction through vault contract"""
        if not hasattr(bot, 'vault') or not bot.vault:
            raise Exception("Vault contract not available")
            
        # Build vault transaction
        txn = bot.vault.functions.callWhitelisted(
            target_address,
            encoded_data
        ).build_transaction({
            'from': bot.wallet['address'],
            'nonce': self.gateway.eth.get_transaction_count(bot.wallet['address']),
            'gas': self.gas_limit,
            'gasPrice': self.gateway.eth.gas_price
        })
        
        # Sign and send with wallet key
        signed_txn = self.gateway.eth.account.sign_transaction(txn, private_key=bot.wallet['private'])
        tx_hash = self.gateway.eth.send_raw_transaction(signed_txn.raw_transaction)
        return Web3.to_hex(tx_hash)

    def swap_exact_out(self, bot: 'TradingBot', path:list=['WHBAR','USDC'], amount_out:int=1000000000000000000, amount_in_max:int=None):
        # remember estimate is not combined with gas fee, so it not accurate for price calculation
        if amount_out < 0:
            raise Exception('Invalid amount_out')

        sell_token, buy_token = path

        # Get valid path
        add_path, est_amounts_outs = self.estimate(path, amount_out, function='getAmountsIn')

        # print(f"Path: {add_path}", est_amounts_outs)
        if amount_in_max is None:
            amount_in_max = int(est_amounts_outs[0] * 1.1)
            
        # Check and approve sell token if necessary
        allowance = self.get_allowance(bot.vault.address, sell_token)
        # print("allowance - amount_in", Web3.from_wei(allowance,'ether'), Web3.from_wei(amount_in,'ether'))
        if allowance < amount_in_max:
            self.approve_token(bot, sell_token, amount=int(amount_in_max*1.5))

        # Create swap transaction
        deadline = int(datetime.now().timestamp()) + 60 * 20  # 20 minutes from now
        
        if hasattr(bot, 'vault') and bot.vault:
            # Execute through vault
            encoded_tx = self.router_contract.encode_abi(
                abi_element_identifier="swapTokensForExactTokens",
                args=[
                    amount_out,
                    amount_in_max,
                    add_path,
                    bot.vault.address,  # Recipient is vault
                    deadline
                ]
            )
            return self._execute_vault_transaction(bot, self.router_contract.address, encoded_tx)
        else:
            # Direct execution
            # Get current gas price
            gas_price = self.gateway.eth.gas_price  # Returns gas price in wei
            # Init transaction parameters
            tx_params = {
                'from': bot.wallet['address'],
                'nonce': self.gateway.eth.get_transaction_count(bot.wallet['address']),
                'gas': 500_000, # requre for testnet - Optional: Add gas limit in BNB <= 0.01$ (need convert USDC -> bnb to get gas limit)
                # Optional: Add gas price if needed
                'gasPrice': gas_price
            }
            txn = self.router_contract.functions.swapTokensForExactTokens(
                amount_out,
                amount_in_max,
                add_path,
                bot.wallet['address'],
                deadline
            )

            build_txn = txn.build_transaction(tx_params)
            # Estimate gas
            gas_estimate = self.gateway.eth.estimate_gas(build_txn)

            # Calculate total transaction cost
            total_gas_cost_est = gas_estimate * gas_price  # Gas estimate × gas price (in wei)
            # buy_gas_if_need([symbol, self.ecosystem_token], [self.walletAddress, self.private], 0.01, total_gas_cost_est,
            #                 swap=[self.router_contract.address, self.router_contract.abi])


            # Send transaction
            sent_txn = None
            for i in range(10):
                try:
                    # Signing transaction
                    signed_txn = self.gateway.eth.account.sign_transaction(build_txn, private_key=bot.wallet['private'])
                    sent_txn = self.gateway.eth.send_raw_transaction(signed_txn.raw_transaction)
                    break
                except Exception as e:
                    time.sleep(0.5)
                    tx_params.update({"nonce": self.gateway.eth.get_transaction_count(bot.wallet['address'])})
                    build_txn = txn.build_transaction(tx_params)
                    pass
            txn_hash = Web3.to_hex(sent_txn)

            return txn_hash

    def swap_exact_in(self, bot: 'TradingBot', path:list=['WHBAR','USDC'], amount_in:int=1000000000000000000, amount_out_min:int=0):
        # remember estimate is not combined with gas fee, so it not accurate for price calculation 
        if amount_in < 0:
            raise Exception('Invalid amount_in')
        sell_token, buy_token = path

        # Get valid path
        add_path, est_amounts_outs = self.estimate(path, amount_in, function='getAmountsOut')
        if amount_out_min is None or amount_out_min <= 0:
            amount_out_min = int(est_amounts_outs[-1] * 0.9)  # Set minimum output to 90% of estimated output
        # todo: fix 
        # Check and approve sell token if necessary
        allowance = self.get_allowance(bot.vault.address, sell_token)
        print("allowance - amount_in", allowance, amount_in)
        if allowance < amount_in:
            self.approve_token(bot, sell_token, amount=int(amount_in*1.5))
        
        # Create swap transaction
        deadline = int(datetime.now().timestamp()) + 60 * 20  # 20 minutes from now
        
        if hasattr(bot, 'vault') and bot.vault:
            # Execute through vault
            encoded_tx = self.router_contract.encode_abi(
                abi_element_identifier="swapExactTokensForTokens",
                args=[
                    amount_in,
                    amount_out_min,
                    add_path,
                    bot.vault.address,  # Recipient is vault
                    deadline
                ]
            )
            return self._execute_vault_transaction(bot, self.router_contract.address, encoded_tx)
        else:
            # Direct execution
            # Get current gas price
            gas_price = self.gateway.eth.gas_price  # Returns gas price in wei
            # Init transaction parameters
            tx_params = {
                'from': bot.wallet['address'],
                'nonce': self.gateway.eth.get_transaction_count(bot.wallet['address']),
                'gas': 500_000, # requre for testnet - Optional: Add gas limit in BNB <= 0.01$ (need convert USDC -> bnb to get gas limit)
                # Optional: Add gas price if needed
                'gasPrice': gas_price
            }
            txn = self.router_contract.functions.swapExactTokensForTokens(
                amount_in,
                amount_out_min,
                add_path,
                bot.wallet['address'],
                deadline
            )

            build_txn = txn.build_transaction(tx_params)
            # Estimate gas
            gas_estimate = self.gateway.eth.estimate_gas(build_txn)

            # Calculate total transaction cost
            total_gas_cost_est = gas_estimate * gas_price  # Gas estimate × gas price (in wei)
            # Send transaction
            sent_txn = None
            for i in range(10):
                try:
                    # Signing transaction
                    signed_txn = self.gateway.eth.account.sign_transaction(build_txn, private_key=bot.wallet['private'])
                    sent_txn = self.gateway.eth.send_raw_transaction(signed_txn.raw_transaction)
                    break
                except Exception as e:
                    time.sleep(0.5)
                    tx_params.update({"nonce": self.gateway.eth.get_transaction_count(bot.wallet['address'])})
                    build_txn = txn.build_transaction(tx_params)
                    pass
            txn_hash = Web3.to_hex(sent_txn)
            return txn_hash
    
    def update_order(self, order:Order, wait_update:bool=False):
        """
        Get order info by orderId
        """
        # Confirm transaction completion

        if wait_update:
            receipt = self._wait_for_receipt(order.tx)
        else:
            try:
                receipt = self.gateway.eth.get_transaction_receipt(order.tx)
            except TransactionNotFound:
                # receipt not completed yet, no update
                print("receipt not completed yet")
                return None

        amount_in = None
        amount_out = None
        gas_used = 0
        if receipt:
            # Swap event signature todo update if change or extend tx function
            # transfer_in_event_signature = Web3.keccak(text="Transfer(address,address,uint256)").hex()           
            # swap_out_event_signature = Web3.keccak(text="Swap(address,uint256,uint256,uint256,uint256,address)").hex()
            gas_used = int(receipt['gasUsed'])
            gas_price = int(receipt["effectiveGasPrice"])
            
            data = Web3.to_bytes(hexstr=HexStr(receipt['logs'][0]['data'].hex()))
            # if log["topics"][0].hex() == transfer_in_event_signature

            for log in receipt.logs:
                if len(log['data']) == 32:
                    if log['address'].upper() == self.router_contract.address.upper():
                        amount_in = int.from_bytes(Web3.to_bytes(hexstr=HexStr(log['data'].hex())), "big")
                    else:
                        amount_out = int.from_bytes(Web3.to_bytes(hexstr=HexStr(log['data'].hex())), "big")
        print("amount_in: ", amount_in)
        print("amount_out: ", amount_out)
        price = amount_in / amount_out if order.side == 'buy' else amount_out / amount_in
        amount_in = self.from_wei(order.token_in, amount_in)
        amount_out = self.from_wei(order.token_out, amount_out)
        fee = gas_used * gas_price

        if order.side == 'buy':
            order.token_in
        elif order.side == 'sell':
            pass
        else:
            raise Exception(f"Invalid order side: {self.side}")
        block = self.gateway.eth.get_block(receipt.blockNumber)

        order.price = price
        order.amount_in = amount_in
        order.amount_out = amount_out
        order.qty = amount_out if order.side == 'buy' else amount_in
        order.value = amount_in if order.side == 'buy' else amount_out

        order.type = 'market'  # todo: update if broker support limit orders
        order.create_time = block.timestamp
        order.filled_time = block.timestamp
        order.status = 'Filled'
        order.fee = fee

    def place_order(self, order_plan: OrderPlan, bot: TradingBot) -> Order:
        """
        todo: use swapETHForExactTokens and swapExactTokensForETH for bester perform
        gas compare https://bloxy.info/functions/791ac947 and https://bloxy.info/functions/7ff36ab5
        parameters:
        - side: buy or sell
        - pair: pair to trade
        - size: size of the order in USDC
        - price: current price of token/USDC for estimating qty
        - type: market or limit
        - limit: limit price for limit order should check current price not overcome limit yet
        - stop_price, sl_price, tp_price, parent_trade, tag: not used yet
        - parent_trade: trade to open/close position
        return:
        - id:
        - side: buy or sell
        - symbol: symbol
        - orderType: market or limit
        - avgPrice: average price of the order
        - qty: qty of the order
        - cumExecValue: total value of the order
        - cumExecQty: total qty of the order 
        - cumExecFee: total fee of the order
        """ 
        # todo:fee = amountin + chain fee
        amount = self.to_wei(order_plan.pair[-1], order_plan.qty)
        try:
            tx = None
            if order_plan.side == 'buy':
                path = order_plan.pair
                tx = self.swap_exact_out(
                    bot=bot,
                    path=path,
                    amount_out=amount,
                    amount_in_max=None  # order_plan.estimated_amount
                )
            elif order_plan.side == 'sell':
                path = order_plan.pair[::-1]
                tx = self.swap_exact_in(
                    bot=bot,
                    path=path,
                    amount_in=amount,
                    amount_out_min=None  # order_plan.estimated_amount
                )
            order = Order(
                id=str(ulid.new()), 
                category=bot.category,
                pair=order_plan.pair,
                side=order_plan.side,
                broker=self,
                tx=tx,
                estimated_amount=getattr(order_plan,'estimated_amount', None)
            )
            return order

        except Exception as e:
            print("Order failed: ", e)
            # raise ValueError("Order failed")

    def check_limit(order: Order) -> bool:
        """
        todo:
        1) save limit or pendding order (limit, take profit, stop loss, ...) in DB
        2) check if order is limit order and current price is not overcome limit yet
        3) fill order and update order status in DB and return True
        """
        pass
      