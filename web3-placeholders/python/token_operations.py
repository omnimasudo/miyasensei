import asyncio
import json
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from decimal import Decimal
from web3 import Web3
from web3.contract import Contract
from eth_account import Account
from hexbytes import HexBytes

@dataclass
class TokenInfo:
    address: str
    symbol: str
    name: str
    decimals: int
    total_supply: int
    balance: int

@dataclass
class TokenTransfer:
    from_address: str
    to_address: str
    amount: int
    token_address: str
    transaction_hash: str
    block_number: int

class ERC20_ABI:
    ABI = [
        {"constant": True, "inputs": [], "name": "name", "outputs": [{"name": "", "type": "string"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
        {"constant": True, "inputs": [], "name": "totalSupply", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
        {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
        {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
        {"constant": False, "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "approve", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
        {"constant": True, "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}], "name": "allowance", "outputs": [{"name": "", "type": "uint256"}], "type": "function"},
        {"anonymous": False, "inputs": [{"indexed": True, "name": "_from", "type": "address"}, {"indexed": True, "name": "_to", "type": "address"}, {"indexed": False, "name": "_value", "type": "uint256"}], "name": "Transfer", "type": "event"},
        {"anonymous": False, "inputs": [{"indexed": True, "name": "_owner", "type": "address"}, {"indexed": True, "name": "_spender", "type": "address"}, {"indexed": False, "name": "_value", "type": "uint256"}], "name": "Approval", "type": "event"}
    ]

class TokenOperations:
    def __init__(self, w3: Web3, wallet_manager: Any):
        self.w3 = w3
        self.wallet_manager = wallet_manager
        self.token_cache: Dict[str, TokenInfo] = {}

    async def get_token_info(self, token_address: str) -> Optional[TokenInfo]:
        if token_address in self.token_cache:
            return self.token_cache[token_address]

        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)

            name = await contract.functions.name().call()
            symbol = await contract.functions.symbol().call()
            decimals = await contract.functions.decimals().call()
            total_supply = await contract.functions.totalSupply().call()

            token_info = TokenInfo(
                address=token_address,
                symbol=symbol,
                name=name,
                decimals=decimals,
                total_supply=total_supply,
                balance=0
            )

            self.token_cache[token_address] = token_info
            return token_info
        except Exception:
            return None

    async def get_token_balance(self, token_address: str, wallet_address: str) -> int:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)
            balance = await contract.functions.balanceOf(wallet_address).call()
            return balance
        except Exception:
            return 0

    async def transfer_tokens(self, token_address: str, from_address: str, to_address: str, amount: int) -> Optional[str]:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.transfer(to_address, amount).build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': 100000,
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

    async def approve_tokens(self, token_address: str, owner_address: str, spender_address: str, amount: int) -> Optional[str]:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)

            nonce = await self.w3.eth.get_transaction_count(owner_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.approve(spender_address, amount).build_transaction({
                'from': owner_address,
                'nonce': nonce,
                'gas': 50000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(owner_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)
            return tx_hash
        except Exception:
            return None

    async def get_allowance(self, token_address: str, owner_address: str, spender_address: str) -> int:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)
            allowance = await contract.functions.allowance(owner_address, spender_address).call()
            return allowance
        except Exception:
            return 0

    async def transfer_from(self, token_address: str, from_address: str, to_address: str, amount: int, spender_address: str) -> Optional[str]:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)

            nonce = await self.w3.eth.get_transaction_count(spender_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.transferFrom(from_address, to_address, amount).build_transaction({
                'from': spender_address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': gas_price,
                'chainId': await self.w3.eth.chain_id
            })

            signed_tx = await self.wallet_manager.sign_transaction(spender_address, tx)
            if not signed_tx:
                return None

            tx_hash = await self.wallet_manager.send_transaction(signed_tx)
            return tx_hash
        except Exception:
            return None

    def format_token_amount(self, amount: int, decimals: int) -> Decimal:
        return Decimal(amount) / Decimal(10 ** decimals)

    def parse_token_amount(self, amount: Decimal, decimals: int) -> int:
        return int(amount * Decimal(10 ** decimals))

    async def get_token_transfers(self, token_address: str, from_block: int, to_block: int) -> List[TokenTransfer]:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)

            transfer_filter = contract.events.Transfer.create_filter(
                fromBlock=from_block,
                toBlock=to_block
            )

            events = await self.w3.eth.get_filter_logs(transfer_filter.filter_id)

            transfers = []
            for event in events:
                transfer = TokenTransfer(
                    from_address=event['args']['_from'],
                    to_address=event['args']['_to'],
                    amount=event['args']['_value'],
                    token_address=token_address,
                    transaction_hash=event['transactionHash'].hex(),
                    block_number=event['blockNumber']
                )
                transfers.append(transfer)

            return transfers
        except Exception:
            return []

    async def get_multiple_token_balances(self, token_addresses: List[str], wallet_address: str) -> Dict[str, int]:
        balances = {}
        for token_address in token_addresses:
            balance = await self.get_token_balance(token_address, wallet_address)
            balances[token_address] = balance
        return balances

    async def estimate_transfer_gas(self, token_address: str, from_address: str, to_address: str, amount: int) -> int:
        try:
            contract = self.w3.eth.contract(address=token_address, abi=ERC20_ABI.ABI)
            gas_estimate = await contract.functions.transfer(to_address, amount).estimate_gas({
                'from': from_address
            })
            return gas_estimate
        except Exception:
            return 100000

    async def batch_transfer(self, token_address: str, from_address: str, transfers: List[Tuple[str, int]]) -> List[Optional[str]]:
        results = []
        for to_address, amount in transfers:
            tx_hash = await self.transfer_tokens(token_address, from_address, to_address, amount)
            results.append(tx_hash)
        return results

    def is_valid_token_address(self, address: str) -> bool:
        return self.w3.is_address(address)

    async def get_token_price_usd(self, token_address: str) -> Optional[Decimal]:
        try:
            token_info = await self.get_token_info(token_address)
            if not token_info:
                return None

            total_supply = self.format_token_amount(token_info.total_supply, token_info.decimals)

            mock_price = Decimal('1.0')
            return mock_price
        except Exception:
            return None

    async def calculate_token_value(self, token_address: str, amount: int) -> Optional[Decimal]:
        price = await self.get_token_price_usd(token_address)
        if not price:
            return None

        token_info = await self.get_token_info(token_address)
        if not token_info:
            return None

        token_amount = self.format_token_amount(amount, token_info.decimals)
        return token_amount * price