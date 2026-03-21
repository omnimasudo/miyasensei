import asyncio
import json
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from web3 import Web3
from web3.contract import Contract
from eth_account import Account
from hexbytes import HexBytes

@dataclass
class NFTMetadata:
    name: str
    description: str
    image: str
    attributes: List[Dict[str, Any]]

@dataclass
class NFTToken:
    token_id: int
    contract_address: str
    owner: str
    metadata: Optional[NFTMetadata]
    token_uri: Optional[str]

class ERC721_ABI:
    ABI = [
        {"inputs": [{"internalType": "address", "name": "owner", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "ownerOf", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "name", "outputs": [{"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
        {"inputs": [], "name": "symbol", "outputs": [{"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "tokenURI", "outputs": [{"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "bool", "name": "approved", "type": "bool"}], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
        {"inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "operator", "type": "address"}], "name": "isApprovedForAll", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},
        {"inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "getApproved", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"},
        {"anonymous": False, "inputs": [{"indexed": True, "internalType": "address", "name": "from", "type": "address"}, {"indexed": True, "internalType": "address", "name": "to", "type": "address"}, {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "Transfer", "type": "event"},
        {"anonymous": False, "inputs": [{"indexed": True, "internalType": "address", "name": "owner", "type": "address"}, {"indexed": True, "internalType": "address", "name": "approved", "type": "address"}, {"indexed": True, "internalType": "uint256", "name": "tokenId", "type": "uint256"}], "name": "Approval", "type": "event"},
        {"anonymous": False, "inputs": [{"indexed": True, "internalType": "address", "name": "owner", "type": "address"}, {"indexed": True, "internalType": "address", "name": "operator", "type": "address"}, {"indexed": False, "internalType": "bool", "name": "approved", "type": "bool"}], "name": "ApprovalForAll", "type": "event"}
    ]

class NFTOperations:
    def __init__(self, w3: Web3, wallet_manager: Any):
        self.w3 = w3
        self.wallet_manager = wallet_manager
        self.contract_cache: Dict[str, Contract] = {}

    def _get_contract(self, contract_address: str) -> Contract:
        if contract_address not in self.contract_cache:
            self.contract_cache[contract_address] = self.w3.eth.contract(
                address=contract_address,
                abi=ERC721_ABI.ABI
            )
        return self.contract_cache[contract_address]

    async def get_nft_balance(self, contract_address: str, wallet_address: str) -> int:
        try:
            contract = self._get_contract(contract_address)
            balance = await contract.functions.balanceOf(wallet_address).call()
            return balance
        except Exception:
            return 0

    async def get_nft_owner(self, contract_address: str, token_id: int) -> Optional[str]:
        try:
            contract = self._get_contract(contract_address)
            owner = await contract.functions.ownerOf(token_id).call()
            return owner
        except Exception:
            return None

    async def get_nft_token_uri(self, contract_address: str, token_id: int) -> Optional[str]:
        try:
            contract = self._get_contract(contract_address)
            token_uri = await contract.functions.tokenURI(token_id).call()
            return token_uri
        except Exception:
            return None

    async def get_nft_metadata(self, contract_address: str, token_id: int) -> Optional[NFTMetadata]:
        try:
            token_uri = await self.get_nft_token_uri(contract_address, token_id)
            if not token_uri:
                return None

            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(token_uri) as response:
                    if response.status == 200:
                        data = await response.json()
                        return NFTMetadata(
                            name=data.get('name', ''),
                            description=data.get('description', ''),
                            image=data.get('image', ''),
                            attributes=data.get('attributes', [])
                        )
        except Exception:
            pass
        return None

    async def get_nft_info(self, contract_address: str, token_id: int) -> Optional[NFTToken]:
        try:
            owner = await self.get_nft_owner(contract_address, token_id)
            token_uri = await self.get_nft_token_uri(contract_address, token_id)
            metadata = await self.get_nft_metadata(contract_address, token_id)

            if owner:
                return NFTToken(
                    token_id=token_id,
                    contract_address=contract_address,
                    owner=owner,
                    metadata=metadata,
                    token_uri=token_uri
                )
        except Exception:
            pass
        return None

    async def transfer_nft(self, contract_address: str, from_address: str, to_address: str, token_id: int) -> Optional[str]:
        try:
            contract = self._get_contract(contract_address)

            nonce = await self.w3.eth.get_transaction_count(from_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.transferFrom(from_address, to_address, token_id).build_transaction({
                'from': from_address,
                'nonce': nonce,
                'gas': 150000,
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

    async def approve_nft(self, contract_address: str, owner_address: str, approved_address: str, token_id: int) -> Optional[str]:
        try:
            contract = self._get_contract(contract_address)

            nonce = await self.w3.eth.get_transaction_count(owner_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.approve(approved_address, token_id).build_transaction({
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

    async def set_approval_for_all(self, contract_address: str, owner_address: str, operator_address: str, approved: bool) -> Optional[str]:
        try:
            contract = self._get_contract(contract_address)

            nonce = await self.w3.eth.get_transaction_count(owner_address)
            gas_price = await self.w3.eth.gas_price

            tx = await contract.functions.setApprovalForAll(operator_address, approved).build_transaction({
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

    async def is_approved_for_all(self, contract_address: str, owner_address: str, operator_address: str) -> bool:
        try:
            contract = self._get_contract(contract_address)
            approved = await contract.functions.isApprovedForAll(owner_address, operator_address).call()
            return approved
        except Exception:
            return False

    async def get_approved(self, contract_address: str, token_id: int) -> Optional[str]:
        try:
            contract = self._get_contract(contract_address)
            approved = await contract.functions.getApproved(token_id).call()
            return approved
        except Exception:
            return None

    async def get_wallet_nfts(self, contract_address: str, wallet_address: str) -> List[NFTToken]:
        try:
            balance = await self.get_nft_balance(contract_address, wallet_address)
            nfts = []

            for i in range(min(balance, 50)):
                token_id = await self._find_token_by_index(contract_address, wallet_address, i)
                if token_id is not None:
                    nft_info = await self.get_nft_info(contract_address, token_id)
                    if nft_info:
                        nfts.append(nft_info)

            return nfts
        except Exception:
            return []

    async def _find_token_by_index(self, contract_address: str, owner: str, index: int) -> Optional[int]:
        try:
            contract = self._get_contract(contract_address)

            current_block = await self.w3.eth.block_number
            from_block = max(0, current_block - 100000)

            transfer_events = await self.w3.eth.get_logs({
                'address': contract_address,
                'topics': [
                    self.w3.keccak(text="Transfer(address,address,uint256)").hex(),
                    None,
                    self.w3.to_hex(owner),
                    None
                ],
                'fromBlock': from_block,
                'toBlock': current_block
            })

            owned_tokens = set()
            for event in transfer_events:
                token_id = int(event['topics'][3], 16)
                owned_tokens.add(token_id)

            if index < len(owned_tokens):
                return list(owned_tokens)[index]
        except Exception:
            pass
        return None

    async def get_collection_info(self, contract_address: str) -> Optional[Dict[str, Any]]:
        try:
            contract = self._get_contract(contract_address)

            name = await contract.functions.name().call()
            symbol = await contract.functions.symbol().call()

            return {
                'address': contract_address,
                'name': name,
                'symbol': symbol
            }
        except Exception:
            return None

    async def get_nft_transfers(self, contract_address: str, from_block: int, to_block: int) -> List[Dict[str, Any]]:
        try:
            transfer_events = await self.w3.eth.get_logs({
                'address': contract_address,
                'topics': [
                    self.w3.keccak(text="Transfer(address,address,uint256)").hex()
                ],
                'fromBlock': from_block,
                'toBlock': to_block
            })

            transfers = []
            for event in transfer_events:
                transfer = {
                    'from': self.w3.to_checksum_address(event['topics'][1]),
                    'to': self.w3.to_checksum_address(event['topics'][2]),
                    'token_id': int(event['topics'][3], 16),
                    'transaction_hash': event['transactionHash'].hex(),
                    'block_number': event['blockNumber']
                }
                transfers.append(transfer)

            return transfers
        except Exception:
            return []

    async def estimate_nft_transfer_gas(self, contract_address: str, from_address: str, to_address: str, token_id: int) -> int:
        try:
            contract = self._get_contract(contract_address)
            gas_estimate = await contract.functions.transferFrom(from_address, to_address, token_id).estimate_gas({
                'from': from_address
            })
            return gas_estimate
        except Exception:
            return 150000

    async def batch_nft_transfer(self, contract_address: str, from_address: str, transfers: List[Tuple[str, int]]) -> List[Optional[str]]:
        results = []
        for to_address, token_id in transfers:
            tx_hash = await self.transfer_nft(contract_address, from_address, to_address, token_id)
            results.append(tx_hash)
        return results

    def is_valid_nft_contract(self, contract_address: str) -> bool:
        return self.w3.is_address(contract_address)

    async def get_nft_floor_price(self, contract_address: str) -> Optional[float]:
        try:
            transfers = await self.get_nft_transfers(contract_address,
                                                   await self.w3.eth.block_number - 10000,
                                                   await self.w3.eth.block_number)

            if not transfers:
                return None

            prices = []
            for transfer in transfers:
                price = await self._estimate_transfer_price(transfer['transaction_hash'])
                if price:
                    prices.append(price)

            return min(prices) if prices else None
        except Exception:
            return None

    async def _estimate_transfer_price(self, tx_hash: str) -> Optional[float]:
        try:
            tx = await self.w3.eth.get_transaction(tx_hash)
            receipt = await self.w3.eth.get_transaction_receipt(tx_hash)

            gas_used = receipt['gasUsed']
            gas_price = tx['gasPrice']

            eth_cost = gas_used * gas_price / 10**18
            return eth_cost
        except Exception:
            return None