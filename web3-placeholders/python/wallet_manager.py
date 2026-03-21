import asyncio
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import web3
from web3 import Web3, Account
from web3.middleware import geth_poa_middleware
from eth_account import Account as EthAccount
from eth_account.messages import encode_defunct
from eth_keys import keys
from hexbytes import HexBytes

class WalletType(Enum):
    METAMASK = "metamask"
    WALLET_CONNECT = "wallet_connect"
    LEDGER = "ledger"
    TREZOR = "trezor"
    PRIVATE_KEY = "private_key"

@dataclass
class WalletConnection:
    address: str
    chain_id: int
    balance: int
    is_connected: bool
    wallet_type: WalletType

class WalletManager:
    def __init__(self, rpc_url: str = "https://mainnet.infura.io/v3/YOUR_PROJECT_ID"):
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)
        self.connections: Dict[str, WalletConnection] = {}
        self._private_keys: Dict[str, str] = {}

    async def connect_wallet(self, wallet_type: WalletType, private_key: Optional[str] = None) -> str:
        if wallet_type == WalletType.PRIVATE_KEY and private_key:
            account = EthAccount.from_key(private_key)
            address = account.address
            self._private_keys[address] = private_key
        else:
            address = self._generate_mock_address()

        chain_id = await self.w3.eth.chain_id
        balance = await self.w3.eth.get_balance(address)

        connection = WalletConnection(
            address=address,
            chain_id=chain_id,
            balance=balance,
            is_connected=True,
            wallet_type=wallet_type
        )

        self.connections[address] = connection
        return address

    def disconnect_wallet(self, address: str) -> bool:
        if address in self.connections:
            self.connections[address].is_connected = False
            if address in self._private_keys:
                del self._private_keys[address]
            return True
        return False

    async def sign_message(self, address: str, message: str) -> Optional[str]:
        if address not in self._private_keys:
            return None

        private_key = self._private_keys[address]
        account = EthAccount.from_key(private_key)

        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        return signed_message.signature.hex()

    async def sign_transaction(self, address: str, tx_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if address not in self._private_keys:
            return None

        private_key = self._private_keys[address]
        account = EthAccount.from_key(private_key)

        gas_price = await self.w3.eth.gas_price
        nonce = await self.w3.eth.get_transaction_count(address)

        tx = {
            'nonce': nonce,
            'gasPrice': gas_price,
            'gas': 21000,
            'to': tx_data.get('to'),
            'value': tx_data.get('value', 0),
            'data': tx_data.get('data', b''),
            'chainId': await self.w3.eth.chain_id
        }

        signed_tx = account.sign_transaction(tx)
        return {
            'rawTransaction': signed_tx.rawTransaction.hex(),
            'hash': signed_tx.hash.hex(),
            'r': signed_tx.r,
            's': signed_tx.s,
            'v': signed_tx.v
        }

    async def send_transaction(self, signed_tx: Dict[str, Any]) -> str:
        tx_hash = self.w3.eth.send_raw_transaction(HexBytes(signed_tx['rawTransaction']))
        return tx_hash.hex()

    async def get_wallet_balance(self, address: str) -> int:
        return await self.w3.eth.get_balance(address)

    async def estimate_gas(self, tx_data: Dict[str, Any]) -> int:
        return await self.w3.eth.estimate_gas(tx_data)

    def _generate_mock_address(self) -> str:
        private_key = secrets.token_hex(32)
        account = EthAccount.from_key(private_key)
        return account.address

    async def switch_network(self, chain_id: int) -> bool:
        try:
            await self.w3.provider.make_request("wallet_switchEthereumChain", [{"chainId": hex(chain_id)}])
            return True
        except Exception:
            return False

    async def add_network(self, network_config: Dict[str, Any]) -> bool:
        try:
            await self.w3.provider.make_request("wallet_addEthereumChain", [network_config])
            return True
        except Exception:
            return False

    def get_connected_wallets(self) -> List[WalletConnection]:
        return [conn for conn in self.connections.values() if conn.is_connected]

    async def monitor_balance_changes(self, address: str, callback: callable):
        current_balance = await self.get_wallet_balance(address)

        while True:
            await asyncio.sleep(10)
            new_balance = await self.get_wallet_balance(address)

            if new_balance != current_balance:
                callback(address, current_balance, new_balance)
                current_balance = new_balance

    def generate_wallet(self) -> Tuple[str, str]:
        account = EthAccount.create()
        return account.address, account.key.hex()

    def validate_address(self, address: str) -> bool:
        return self.w3.is_address(address)

    def checksum_address(self, address: str) -> str:
        return self.w3.to_checksum_address(address)

    async def get_transaction_receipt(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        try:
            receipt = await self.w3.eth.get_transaction_receipt(tx_hash)
            return dict(receipt) if receipt else None
        except Exception:
            return None

    async def wait_for_transaction(self, tx_hash: str, timeout: int = 120) -> Optional[Dict[str, Any]]:
        return await self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)