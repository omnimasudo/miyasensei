import asyncio
import time
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass
from web3 import Web3
from web3.contract import Contract
from eth_account import Account
from hexbytes import HexBytes

@dataclass
class TransactionInfo:
    hash: str
    block_number: int
    timestamp: int
    from_address: str
    to_address: Optional[str]
    value: int
    gas_used: int
    gas_price: int
    status: bool
    logs: List[Dict[str, Any]]

@dataclass
class BlockInfo:
    number: int
    hash: str
    timestamp: int
    gas_used: int
    gas_limit: int
    transaction_count: int
    miner: str
    size: int

@dataclass
class ContractEvent:
    address: str
    event_name: str
    args: Dict[str, Any]
    block_number: int
    transaction_hash: str
    log_index: int

@dataclass
class TokenTransfer:
    token_address: str
    from_address: str
    to_address: str
    value: int
    transaction_hash: str
    block_number: int
    timestamp: int

@dataclass
class AddressActivity:
    address: str
    transaction_count: int
    first_seen: int
    last_seen: int
    total_value_sent: int
    total_value_received: int
    unique_interactions: int

class BlockchainQueries:
    def __init__(self, w3: Web3):
        self.w3 = w3
        self.event_cache: Dict[str, List[Dict[str, Any]]] = {}
        self.address_cache: Dict[str, AddressActivity] = {}

    async def get_transaction_info(self, tx_hash: str) -> Optional[TransactionInfo]:
        try:
            tx = await self.w3.eth.get_transaction(tx_hash)
            receipt = await self.w3.eth.get_transaction_receipt(tx_hash)
            block = await self.w3.eth.get_block(receipt['blockNumber'])

            return TransactionInfo(
                hash=tx_hash,
                block_number=receipt['blockNumber'],
                timestamp=block['timestamp'],
                from_address=tx['from'],
                to_address=tx.get('to'),
                value=tx['value'],
                gas_used=receipt['gasUsed'],
                gas_price=tx['gasPrice'],
                status=receipt['status'] == 1,
                logs=receipt['logs']
            )
        except Exception:
            return None

    async def get_block_info(self, block_number: int) -> Optional[BlockInfo]:
        try:
            block = await self.w3.eth.get_block(block_number, full_transactions=False)

            return BlockInfo(
                number=block['number'],
                hash=block['hash'].hex(),
                timestamp=block['timestamp'],
                gas_used=block['gasUsed'],
                gas_limit=block['gasLimit'],
                transaction_count=len(block['transactions']),
                miner=block['miner'],
                size=len(block['extraData']) if 'extraData' in block else 0
            )
        except Exception:
            return None

    async def get_latest_block_number(self) -> int:
        return await self.w3.eth.block_number

    async def get_block_transactions(self, block_number: int, include_details: bool = False) -> List[TransactionInfo]:
        try:
            block = await self.w3.eth.get_block(block_number, full_transactions=True)
            transactions = []

            for tx in block['transactions']:
                if include_details:
                    tx_info = await self.get_transaction_info(tx['hash'].hex())
                    if tx_info:
                        transactions.append(tx_info)
                else:
                    transactions.append(TransactionInfo(
                        hash=tx['hash'].hex(),
                        block_number=block_number,
                        timestamp=block['timestamp'],
                        from_address=tx['from'],
                        to_address=tx.get('to'),
                        value=tx['value'],
                        gas_used=0,
                        gas_price=tx['gasPrice'],
                        status=True,
                        logs=[]
                    ))

            return transactions
        except Exception:
            return []

    async def get_address_transactions(self, address: str, from_block: int, to_block: int, limit: int = 100) -> List[TransactionInfo]:
        try:
            logs = await self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'topics': [[
                    self.w3.keccak(text="Transfer(address,address,uint256)").hex()
                ]],
                'address': None
            })

            transactions = []
            seen_hashes = set()

            for log in logs:
                tx_hash = log['transactionHash'].hex()
                if tx_hash in seen_hashes:
                    continue
                seen_hashes.add(tx_hash)

                tx_info = await self.get_transaction_info(tx_hash)
                if tx_info and (tx_info.from_address.lower() == address.lower() or
                              (tx_info.to_address and tx_info.to_address.lower() == address.lower())):
                    transactions.append(tx_info)
                    if len(transactions) >= limit:
                        break

            return transactions
        except Exception:
            return []

    async def get_token_transfers(self, token_address: str, from_block: int, to_block: int, limit: int = 100) -> List[TokenTransfer]:
        try:
            transfer_event_signature = self.w3.keccak(text="Transfer(address,address,uint256)").hex()

            logs = await self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'address': token_address,
                'topics': [transfer_event_signature]
            })

            transfers = []
            for log in logs:
                try:
                    from_addr = self.w3.to_checksum_address(log['topics'][1])
                    to_addr = self.w3.to_checksum_address(log['topics'][2])
                    value = int(log['data'], 16)

                    block = await self.w3.eth.get_block(log['blockNumber'])

                    transfer = TokenTransfer(
                        token_address=token_address,
                        from_address=from_addr,
                        to_address=to_addr,
                        value=value,
                        transaction_hash=log['transactionHash'].hex(),
                        block_number=log['blockNumber'],
                        timestamp=block['timestamp']
                    )
                    transfers.append(transfer)

                    if len(transfers) >= limit:
                        break
                except Exception:
                    continue

            return transfers
        except Exception:
            return []

    async def get_contract_events(self, contract_address: str, event_signature: str, from_block: int, to_block: int) -> List[ContractEvent]:
        try:
            logs = await self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': to_block,
                'address': contract_address,
                'topics': [event_signature]
            })

            events = []
            for log in logs:
                try:
                    event = ContractEvent(
                        address=contract_address,
                        event_name=self._get_event_name_from_signature(event_signature),
                        args=self._decode_event_data(log['data'], log['topics']),
                        block_number=log['blockNumber'],
                        transaction_hash=log['transactionHash'].hex(),
                        log_index=log['logIndex']
                    )
                    events.append(event)
                except Exception:
                    continue

            return events
        except Exception:
            return []

    def _get_event_name_from_signature(self, signature: str) -> str:
        event_signatures = {
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": "Transfer",
            "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": "Approval",
            "0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1": "Sync",
            "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f6": "Mint",
            "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496b": "Burn"
        }
        return event_signatures.get(signature, "Unknown")

    def _decode_event_data(self, data: str, topics: List[str]) -> Dict[str, Any]:
        try:
            args = {}
            if len(topics) > 1:
                args['from'] = self.w3.to_checksum_address(topics[1])
            if len(topics) > 2:
                args['to'] = self.w3.to_checksum_address(topics[2])
            if data and data != '0x':
                args['value'] = int(data, 16)
            return args
        except Exception:
            return {}

    async def get_address_activity(self, address: str, days_back: int = 30) -> Optional[AddressActivity]:
        try:
            if address in self.address_cache:
                return self.address_cache[address]

            current_block = await self.w3.eth.block_number
            blocks_per_day = 5760
            from_block = max(0, current_block - (days_back * blocks_per_day))

            transactions = await self.get_address_transactions(address, from_block, current_block, limit=1000)

            if not transactions:
                return None

            first_tx = min(transactions, key=lambda x: x.timestamp)
            last_tx = max(transactions, key=lambda x: x.timestamp)

            total_sent = sum(tx.value for tx in transactions if tx.from_address.lower() == address.lower())
            total_received = sum(tx.value for tx in transactions if tx.to_address and tx.to_address.lower() == address.lower())

            unique_addresses = set()
            for tx in transactions:
                unique_addresses.add(tx.from_address.lower())
                if tx.to_address:
                    unique_addresses.add(tx.to_address.lower())

            activity = AddressActivity(
                address=address,
                transaction_count=len(transactions),
                first_seen=first_tx.timestamp,
                last_seen=last_tx.timestamp,
                total_value_sent=total_sent,
                total_value_received=total_received,
                unique_interactions=len(unique_addresses) - 1
            )

            self.address_cache[address] = activity
            return activity
        except Exception:
            return None

    async def get_gas_price_history(self, blocks_back: int = 100) -> List[Dict[str, Any]]:
        try:
            current_block = await self.w3.eth.block_number
            gas_prices = []

            for i in range(min(blocks_back, 100)):
                block_num = current_block - i
                block = await self.w3.eth.get_block(block_num)

                avg_gas_price = 0
                if block['transactions']:
                    tx = await self.w3.eth.get_transaction(block['transactions'][0].hex())
                    avg_gas_price = tx['gasPrice']

                gas_prices.append({
                    'block_number': block_num,
                    'timestamp': block['timestamp'],
                    'gas_price': avg_gas_price,
                    'gas_used': block['gasUsed'],
                    'gas_limit': block['gasLimit']
                })

            return gas_prices
        except Exception:
            return []

    async def get_network_stats(self) -> Dict[str, Any]:
        try:
            current_block = await self.w3.eth.block_number
            block = await self.w3.eth.get_block(current_block)

            gas_prices = await self.get_gas_price_history(10)
            avg_gas_price = sum(gp['gas_price'] for gp in gas_prices) / len(gas_prices) if gas_prices else 0

            return {
                'current_block': current_block,
                'gas_price_gwei': avg_gas_price / 10**9,
                'network_utilization': (block['gasUsed'] / block['gasLimit']) * 100,
                'timestamp': block['timestamp']
            }
        except Exception:
            return {}

    async def search_transactions_by_value(self, min_value: int, max_value: int, from_block: int, to_block: int, limit: int = 50) -> List[TransactionInfo]:
        try:
            transactions = []
            current_block = from_block

            while current_block <= to_block and len(transactions) < limit:
                block_txs = await self.get_block_transactions(current_block, include_details=True)

                for tx in block_txs:
                    if min_value <= tx.value <= max_value:
                        transactions.append(tx)
                        if len(transactions) >= limit:
                            break

                current_block += 1

            return transactions
        except Exception:
            return []

    async def get_contract_balance_history(self, contract_address: str, from_block: int, to_block: int) -> List[Dict[str, Any]]:
        try:
            balance_history = []

            for block_num in range(from_block, min(to_block, from_block + 100) + 1):
                try:
                    balance = await self.w3.eth.get_balance(contract_address, block_num)
                    block = await self.w3.eth.get_block(block_num)

                    balance_history.append({
                        'block_number': block_num,
                        'timestamp': block['timestamp'],
                        'balance': balance
                    })
                except Exception:
                    continue

            return balance_history
        except Exception:
            return []

    async def get_pending_transactions(self) -> List[Dict[str, Any]]:
        try:
            pending_tx = await self.w3.eth.get_block('pending', full_transactions=True)
            transactions = []

            for tx in pending_tx['transactions']:
                transactions.append({
                    'hash': tx['hash'].hex(),
                    'from': tx['from'],
                    'to': tx.get('to'),
                    'value': tx['value'],
                    'gas_price': tx['gasPrice'],
                    'gas_limit': tx['gas']
                })

            return transactions
        except Exception:
            return []

    async def get_transaction_confirmations(self, tx_hash: str) -> int:
        try:
            tx_receipt = await self.w3.eth.get_transaction_receipt(tx_hash)
            current_block = await self.w3.eth.block_number

            if tx_receipt['blockNumber'] is None:
                return 0

            return current_block - tx_receipt['blockNumber']
        except Exception:
            return 0

    async def get_address_balance_history(self, address: str, days_back: int = 7) -> List[Dict[str, Any]]:
        try:
            current_block = await self.w3.eth.block_number
            blocks_per_day = 5760
            from_block = max(0, current_block - (days_back * blocks_per_day))

            balance_history = []
            for block_num in range(from_block, current_block + 1, blocks_per_day // 24):
                try:
                    balance = await self.w3.eth.get_balance(address, block_num)
                    block = await self.w3.eth.get_block(block_num)

                    balance_history.append({
                        'timestamp': block['timestamp'],
                        'balance': balance,
                        'block_number': block_num
                    })
                except Exception:
                    continue

            return balance_history
        except Exception:
            return []

    async def get_token_balance_history(self, token_address: str, wallet_address: str, from_block: int, to_block: int) -> List[Dict[str, Any]]:
        try:
            transfers = await self.get_token_transfers(token_address, from_block, to_block, limit=1000)

            balance = 0
            balance_history = []

            for transfer in sorted(transfers, key=lambda x: x.block_number):
                if transfer.from_address.lower() == wallet_address.lower():
                    balance -= transfer.value
                elif transfer.to_address.lower() == wallet_address.lower():
                    balance += transfer.value

                balance_history.append({
                    'block_number': transfer.block_number,
                    'timestamp': transfer.timestamp,
                    'balance': balance,
                    'transaction_hash': transfer.transaction_hash
                })

            return balance_history
        except Exception:
            return []

    async def get_most_active_addresses(self, from_block: int, to_block: int, limit: int = 10) -> List[Dict[str, Any]]:
        try:
            transactions = await self.get_block_transactions(from_block, include_details=True)
            address_activity = {}

            for tx in transactions:
                from_addr = tx.from_address.lower()
                to_addr = tx.to_address.lower() if tx.to_address else None

                if from_addr not in address_activity:
                    address_activity[from_addr] = {'address': from_addr, 'tx_count': 0, 'total_value': 0}
                address_activity[from_addr]['tx_count'] += 1
                address_activity[from_addr]['total_value'] += tx.value

                if to_addr:
                    if to_addr not in address_activity:
                        address_activity[to_addr] = {'address': to_addr, 'tx_count': 0, 'total_value': 0}
                    address_activity[to_addr]['tx_count'] += 1

            sorted_addresses = sorted(address_activity.values(), key=lambda x: x['tx_count'], reverse=True)
            return sorted_addresses[:limit]
        except Exception:
            return []

    async def get_large_transactions(self, min_value: int, from_block: int, to_block: int, limit: int = 20) -> List[TransactionInfo]:
        return await self.search_transactions_by_value(min_value, float('inf'), from_block, to_block, limit)

    async def get_contract_creation_info(self, contract_address: str) -> Optional[Dict[str, Any]]:
        try:
            code = await self.w3.eth.get_code(contract_address)
            if code == b'':
                return None

            current_block = await self.w3.eth.block_number
            from_block = max(0, current_block - 100000)

            logs = await self.w3.eth.get_logs({
                'fromBlock': from_block,
                'toBlock': current_block,
                'topics': [self.w3.keccak(text="ContractCreated(address,address)").hex()]
            })

            for log in logs:
                if len(log['topics']) > 1:
                    created_address = self.w3.to_checksum_address(log['topics'][1])
                    if created_address.lower() == contract_address.lower():
                        tx_info = await self.get_transaction_info(log['transactionHash'].hex())
                        if tx_info:
                            return {
                                'contract_address': contract_address,
                                'creator_address': tx_info.from_address,
                                'creation_tx_hash': tx_info.hash,
                                'creation_block': tx_info.block_number,
                                'creation_timestamp': tx_info.timestamp
                            }

            return {
                'contract_address': contract_address,
                'creator_address': None,
                'creation_tx_hash': None,
                'creation_block': None,
                'creation_timestamp': None
            }
        except Exception:
            return None

    async def get_block_time_average(self, blocks: int = 100) -> float:
        try:
            current_block = await self.w3.eth.block_number
            timestamps = []

            for i in range(min(blocks, 100)):
                block = await self.w3.eth.get_block(current_block - i)
                timestamps.append(block['timestamp'])

            if len(timestamps) < 2:
                return 15.0

            time_diffs = [timestamps[i] - timestamps[i+1] for i in range(len(timestamps)-1)]
            avg_block_time = sum(time_diffs) / len(time_diffs)

            return avg_block_time
        except Exception:
            return 15.0

    async def get_network_hashrate(self) -> Optional[int]:
        try:
            current_block = await self.w3.eth.block_number
            block = await self.w3.eth.get_block(current_block)

            if hasattr(block, 'difficulty') and block['difficulty']:
                avg_block_time = await self.get_block_time_average(10)
                hashrate = int(block['difficulty'] / avg_block_time)
                return hashrate
        except Exception:
            pass
        return None

    async def get_transaction_volume(self, from_block: int, to_block: int) -> Dict[str, Any]:
        try:
            transactions = await self.get_block_transactions(from_block, include_details=True)

            total_volume = sum(tx.value for tx in transactions)
            tx_count = len(transactions)
            avg_tx_value = total_volume / tx_count if tx_count > 0 else 0

            unique_addresses = set()
            for tx in transactions:
                unique_addresses.add(tx.from_address.lower())
                if tx.to_address:
                    unique_addresses.add(tx.to_address.lower())

            return {
                'total_volume': total_volume,
                'transaction_count': tx_count,
                'average_transaction_value': avg_tx_value,
                'unique_addresses': len(unique_addresses),
                'blocks_analyzed': to_block - from_block + 1
            }
        except Exception:
            return {}

    async def get_address_labels(self, addresses: List[str]) -> Dict[str, str]:
        known_labels = {
            "0x0000000000000000000000000000000000000000": "Null Address",
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "WETH",
            "0xA0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8": "USDC",
            "0x6B175474E89094C44Da98b954EedeAC495271d0F": "DAI",
            "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D": "Uniswap V2 Router",
            "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f": "Uniswap V2 Factory"
        }

        labels = {}
        for address in addresses:
            labels[address] = known_labels.get(address.lower(), "Unknown")

        return labels