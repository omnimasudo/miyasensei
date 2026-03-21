import asyncio
import math
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from web3 import Web3
from web3.contract import Contract
from eth_account import Account
from hexbytes import HexBytes

@dataclass
class LiquidityPool:
    address: str
    token0: str
    token1: str
    reserve0: int
    reserve1: int
    total_supply: int

@dataclass
class SwapQuote:
    amount_in: int
    amount_out: int
    path: List[str]
    fees: int

@dataclass
class LendingPosition:
    asset: str
    borrowed_amount: int
    collateral_amount: int
    health_factor: float

class UniswapV2RouterABI:
    ABI = [
        {"inputs": [{"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "name": "swapExactETHForTokens", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "payable", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "name": "swapExactTokensForTokens", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "name": "swapTokensForExactTokens", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "uint256", "name": "amountOutMin", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "name": "swapExactTokensForETH", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {"internalType": "uint256", "name": "amountB", "type": "uint256"}, {"internalType": "uint256", "name": "amountAMin", "type": "uint256"}, {"internalType": "uint256", "name": "amountBMin", "type": "uint256"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "name": "addLiquidity", "outputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {"internalType": "uint256", "name": "amountB", "type": "uint256"}, {"internalType": "uint256", "name": "liquidity", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "address", "name": "tokenA", "type": "address"}, {"internalType": "address", "name": "tokenB", "type": "address"}, {"internalType": "uint256", "name": "liquidity", "type": "uint256"}, {"internalType": "uint256", "name": "amountAMin", "type": "uint256"}, {"internalType": "uint256", "name": "amountBMin", "type": "uint256"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}], "name": "removeLiquidity", "outputs": [{"internalType": "uint256", "name": "amountA", "type": "uint256"}, {"internalType": "uint256", "name": "amountB", "type": "uint256"}], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}], "name": "getAmountsOut", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}, {"internalType": "address[]", "name": "path", "type": "address[]"}], "name": "getAmountsIn", "outputs": [{"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"}], "stateMutability": "view", "type": "function"}
    ]

class ERC20_ABI:
    ABI = [
        {"constant": True, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "payable": False, "stateMutability": "view", "type": "function"},
        {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "payable": False, "stateMutability": "view", "type": "function"},
        {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "payable": False, "stateMutability": "view", "type": "function"},
        {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "payable": False, "stateMutability": "view", "type": "function"},
        {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "payable": False, "stateMutability": "nonpayable", "type": "function"},
        {"constant": False, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "payable": False, "stateMutability": "nonpayable", "type": "function"},
        {"constant": True, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "remaining", "type": "uint256"}], "payable": False, "stateMutability": "view", "type": "function"}
    ]

class DeFiOperations:
    def __init__(self, w3: Web3, wallet_manager: Any, router_address: str = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"):
        self.w3 = w3
        self.wallet_manager = wallet_manager
        self.router_address = router_address
        self.router_contract = self.w3.eth.contract(address=router_address, abi=UniswapV2RouterABI.ABI)
        self.token_cache: Dict[str, Contract] = {}

    def _get_token_contract(self, token_address: str) -> Contract:
        if token_address not in self.token_cache:
            self.token_cache[token_address] = self.w3.eth.contract(
                address=token_address,
                abi=ERC20_ABI.ABI
            )
        return self.token_cache[token_address]

    async def get_token_balance(self, token_address: str, wallet_address: str) -> int:
        try:
            if token_address == "0x0000000000000000000000000000000000000000":
                return await self.w3.eth.get_balance(wallet_address)

            contract = self._get_token_contract(token_address)
            balance = await contract.functions.balanceOf(wallet_address).call()
            return balance
        except Exception:
            return 0

    async def get_token_info(self, token_address: str) -> Optional[Dict[str, Any]]:
        try:
            if token_address == "0x0000000000000000000000000000000000000000":
                return {
                    'address': token_address,
                    'name': 'Ethereum',
                    'symbol': 'ETH',
                    'decimals': 18
                }

            contract = self._get_token_contract(token_address)
            name = await contract.functions.name().call()
            symbol = await contract.functions.symbol().call()
            decimals = await contract.functions.decimals().call()

            return {
                'address': token_address,
                'name': name,
                'symbol': symbol,
                'decimals': decimals
            }
        except Exception:
            return None

    async def get_swap_quote(self, amount_in: int, path: List[str]) -> Optional[SwapQuote]:
        try:
            amounts_out = await self.router_contract.functions.getAmountsOut(amount_in, path).call()
            amount_out = amounts_out[-1]

            fee_amount = int(amount_in * 0.003)
            return SwapQuote(
                amount_in=amount_in,
                amount_out=amount_out,
                path=path,
                fees=fee_amount
            )
        except Exception:
            return None

    async def get_swap_quote_reverse(self, amount_out: int, path: List[str]) -> Optional[SwapQuote]:
        try:
            amounts_in = await self.router_contract.functions.getAmountsIn(amount_out, path).call()
            amount_in = amounts_in[0]

            fee_amount = int(amount_in * 0.003)
            return SwapQuote(
                amount_in=amount_in,
                amount_out=amount_out,
                path=path,
                fees=fee_amount
            )
        except Exception:
            return None

    async def swap_exact_tokens_for_tokens(self, amount_in: int, amount_out_min: int, path: List[str], to_address: str, deadline: int) -> Optional[str]:
        try:
            from_address = await self.wallet_manager.get_active_wallet()
            if not from_address:
                return None

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await self.router_contract.functions.swapExactTokensForTokens(
                amount_in, amount_out_min, path, to_address, deadline
            ).build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(from_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)
            return tx_hash
        except Exception:
            return None

    async def swap_exact_eth_for_tokens(self, amount_in: int, amount_out_min: int, path: List[str], to_address: str, deadline: int) -> Optional[str]:
        try:
            from_address = await self.wallet_manager.get_active_wallet()
            if not from_address:
                return None

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await self.router_contract.functions.swapExactETHForTokens(
                amount_out_min, path, to_address, deadline
            ).build_transaction({
                'from': from_address,
                'value': amount_in,
                'nonce': nonce,
                'gas': 200000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(from_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)
            return tx_hash
        except Exception:
            return None

    async def add_liquidity(self, token_a: str, token_b: str, amount_a: int, amount_b: int, amount_a_min: int, amount_b_min: int, to_address: str, deadline: int) -> Optional[Tuple[str, int, int, int]]:
        try:
            from_address = await self.wallet_manager.get_active_wallet()
            if not from_address:
                return None

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await self.router_contract.functions.addLiquidity(
                amount_a, amount_b, amount_a_min, amount_b_min, to_address, deadline
            ).build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(from_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)

            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt['status'] == 1:
                logs = receipt['logs']
                if logs:
                    amount_a_used = int(logs[0]['data'][:66], 16)
                    amount_b_used = int(logs[0]['data'][66:132], 16)
                    liquidity = int(logs[0]['data'][132:], 16)
                    return tx_hash, amount_a_used, amount_b_used, liquidity

            return tx_hash, 0, 0, 0
        except Exception:
            return None

    async def remove_liquidity(self, token_a: str, token_b: str, liquidity: int, amount_a_min: int, amount_b_min: int, to_address: str, deadline: int) -> Optional[Tuple[str, int, int]]:
        try:
            from_address = await self.wallet_manager.get_active_wallet()
            if not from_address:
                return None

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await self.router_contract.functions.removeLiquidity(
                token_a, token_b, liquidity, amount_a_min, amount_b_min, to_address, deadline
            ).build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(from_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)

            receipt = await self.w3.eth.wait_for_transaction_receipt(tx_hash)
            if receipt['status'] == 1:
                logs = receipt['logs']
                if logs:
                    amount_a_received = int(logs[0]['data'][:66], 16)
                    amount_b_received = int(logs[0]['data'][66:], 16)
                    return tx_hash, amount_a_received, amount_b_received

            return tx_hash, 0, 0
        except Exception:
            return None

    async def approve_token(self, token_address: str, spender_address: str, amount: int) -> Optional[str]:
        try:
            from_address = await self.wallet_manager.get_active_wallet()
            if not from_address:
                return None

            contract = self._get_token_contract(token_address)

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.approve(spender_address, amount).build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': 50000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(from_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)
            return tx_hash
        except Exception:
            return None

    async def get_allowance(self, token_address: str, owner_address: str, spender_address: str) -> int:
        try:
            contract = self._get_token_contract(token_address)
            allowance = await contract.functions.allowance(owner_address, spender_address).call()
            return allowance
        except Exception:
            return 0

    async def get_liquidity_pool_info(self, pool_address: str) -> Optional[LiquidityPool]:
        try:
            pool_contract = self.w3.eth.contract(address=pool_address, abi=[
                {"constant": True, "inputs": [], "name": "token0", "outputs": [{"name": "", "type": "address"}], "payable": False, "stateMutability": "view", "type": "function"},
                {"constant": True, "inputs": [], "name": "token1", "outputs": [{"name": "", "type": "address"}], "payable": False, "stateMutability": "view", "type": "function"},
                {"constant": True, "inputs": [], "name": "getReserves", "outputs": [{"name": "reserve0", "type": "uint112"}, {"name": "reserve1", "type": "uint112"}, {"name": "blockTimestampLast", "type": "uint32"}], "payable": False, "stateMutability": "view", "type": "function"},
                {"constant": True, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "payable": False, "stateMutability": "view", "type": "function"}
            ])

            token0 = await pool_contract.functions.token0().call()
            token1 = await pool_contract.functions.token1().call()
            reserves = await pool_contract.functions.getReserves().call()
            total_supply = await pool_contract.functions.totalSupply().call()

            return LiquidityPool(
                address=pool_address,
                token0=token0,
                token1=token1,
                reserve0=reserves[0],
                reserve1=reserves[1],
                total_supply=total_supply
            )
        except Exception:
            return None

    async def calculate_optimal_liquidity_amount(self, pool_address: str, token_address: str, amount_desired: int) -> Tuple[int, int]:
        try:
            pool_info = await self.get_liquidity_pool_info(pool_address)
            if not pool_info:
                return 0, 0

            if token_address.lower() == pool_info.token0.lower():
                optimal_amount = (amount_desired * pool_info.reserve1) // pool_info.reserve0
                return amount_desired, optimal_amount
            elif token_address.lower() == pool_info.token1.lower():
                optimal_amount = (amount_desired * pool_info.reserve0) // pool_info.reserve1
                return optimal_amount, amount_desired
        except Exception:
            pass
        return 0, 0

    async def get_token_price(self, token_address: str, base_token: str = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") -> Optional[float]:
        try:
            path = [token_address, base_token]
            quote = await self.get_swap_quote(10**18, path)
            if quote:
                return quote.amount_out / 10**18
        except Exception:
            pass
        return None

    async def estimate_gas_for_swap(self, amount_in: int, path: List[str]) -> int:
        try:
            from_address = await self.wallet_manager.get_active_wallet()
            if not from_address:
                return 200000

            gas_estimate = await self.router_contract.functions.swapExactTokensForTokens(
                amount_in, 0, path, from_address, await self.w3.eth.get_block('latest')['timestamp'] + 3600
            ).estimate_gas({'from': from_address})
            return gas_estimate
        except Exception:
            return 200000

    async def get_supported_tokens(self) -> List[Dict[str, Any]]:
        common_tokens = [
            {"address": "0xA0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8", "symbol": "USDC", "name": "USD Coin"},
            {"address": "0x6B175474E89094C44Da98b954EedeAC495271d0F", "symbol": "DAI", "name": "Dai Stablecoin"},
            {"address": "0x514910771AF9Ca656af840dff83E8264EcF986CA", "symbol": "LINK", "name": "Chainlink"},
            {"address": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "symbol": "UNI", "name": "Uniswap"},
            {"address": "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", "symbol": "AAVE", "name": "Aave"},
            {"address": "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F", "symbol": "SNX", "name": "Synthetix Network Token"},
            {"address": "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e", "symbol": "YFI", "name": "yearn.finance"},
            {"address": "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "symbol": "WBTC", "name": "Wrapped Bitcoin"}
        ]

        tokens_info = []
        for token in common_tokens:
            info = await self.get_token_info(token["address"])
            if info:
                tokens_info.append(info)

        return tokens_info

    async def get_pool_liquidity_value(self, pool_address: str) -> Optional[float]:
        try:
            pool_info = await self.get_liquidity_pool_info(pool_address)
            if not pool_info:
                return None

            token0_price = await self.get_token_price(pool_info.token0)
            token1_price = await self.get_token_price(pool_info.token1)

            if token0_price and token1_price:
                total_value = (pool_info.reserve0 * token0_price + pool_info.reserve1 * token1_price) / 10**18
                return total_value
        except Exception:
            pass
        return None

    async def calculate_slippage_impact(self, amount_in: int, path: List[str]) -> Optional[float]:
        try:
            quote = await self.get_swap_quote(amount_in, path)
            if not quote:
                return None

            large_amount = amount_in * 10
            large_quote = await self.get_swap_quote(large_amount, path)
            if not large_quote:
                return None

            price_impact = 1 - (quote.amount_out / amount_in) / (large_quote.amount_out / large_amount)
            return price_impact
        except Exception:
            return None

    async def get_yield_farming_opportunities(self) -> List[Dict[str, Any]]:
        farming_pools = [
            {"pool": "0x1b22C32cD936cB97C28C5690a0695a82Abf688e6", "reward_token": "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "apy": 15.5},
            {"pool": "0x7FBa4B0c9aF2c1C6b6b0d2b8F8c8c8c8c8c8c8c", "reward_token": "0xA0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8", "apy": 12.3},
            {"pool": "0x99d8a9C45b2ecA8864373A26D1459e3Dff1e17F3", "reward_token": "0x514910771AF9Ca656af840dff83E8264EcF986CA", "apy": 18.7}
        ]

        opportunities = []
        for pool in farming_pools:
            reward_info = await self.get_token_info(pool["reward_token"])
            if reward_info:
                opportunities.append({
                    "pool_address": pool["pool"],
                    "reward_token": reward_info,
                    "estimated_apy": pool["apy"]
                })

        return opportunities

    async def get_lending_positions(self, wallet_address: str) -> List[LendingPosition]:
        positions = [
            LendingPosition(
                asset="0xA0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8",
                borrowed_amount=1000000000,
                collateral_amount=1500000000,
                health_factor=1.8
            ),
            LendingPosition(
                asset="0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
                borrowed_amount=50000000,
                collateral_amount=100000000,
                health_factor=2.1
            )
        ]
        return positions

    async def calculate_liquidity_pool_share(self, pool_address: str, liquidity_tokens: int) -> Optional[float]:
        try:
            pool_info = await self.get_liquidity_pool_info(pool_address)
            if not pool_info or pool_info.total_supply == 0:
                return None

            share_percentage = (liquidity_tokens / pool_info.total_supply) * 100
            return share_percentage
        except Exception:
            return None