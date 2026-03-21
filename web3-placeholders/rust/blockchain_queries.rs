use std::collections::HashMap;
use tokio::sync::Mutex;
use web3::types::{Address, H256, U256, Transaction, TransactionReceipt, Block, Log, FilterBuilder, BlockNumber};
use web3::Web3;
use web3::transports::Http;
use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TransactionInfo {
    pub hash: H256,
    pub block_number: U256,
    pub timestamp: u64,
    pub from: Address,
    pub to: Option<Address>,
    pub value: U256,
    pub gas_used: U256,
    pub gas_price: U256,
    pub status: bool,
    pub logs: Vec<Log>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockInfo {
    pub number: U256,
    pub hash: H256,
    pub timestamp: u64,
    pub gas_used: U256,
    pub gas_limit: U256,
    pub transaction_count: usize,
    pub miner: Address,
    pub size: usize,
}

#[derive(Clone, Debug)]
pub struct ContractEvent {
    pub address: Address,
    pub event_name: String,
    pub args: HashMap<String, serde_json::Value>,
    pub block_number: U256,
    pub transaction_hash: H256,
    pub log_index: U256,
}

#[derive(Clone, Debug)]
pub struct TokenTransfer {
    pub token_address: Address,
    pub from: Address,
    pub to: Address,
    pub value: U256,
    pub transaction_hash: H256,
    pub block_number: U256,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
pub struct AddressActivity {
    pub address: Address,
    pub transaction_count: usize,
    pub first_seen: u64,
    pub last_seen: u64,
    pub total_value_sent: U256,
    pub total_value_received: U256,
    pub unique_interactions: usize,
}

pub struct BlockchainQueries {
    web3: Web3<Http>,
    event_cache: Mutex<HashMap<String, Vec<ContractEvent>>>,
    address_cache: Mutex<HashMap<Address, AddressActivity>>,
}

impl BlockchainQueries {
    pub fn new(web3: Web3<Http>) -> Self {
        Self {
            web3,
            event_cache: Mutex::new(HashMap::new()),
            address_cache: Mutex::new(HashMap::new()),
        }
    }

    pub async fn get_transaction_info(&self, tx_hash: H256) -> Result<Option<TransactionInfo>, Box<dyn std::error::Error>> {
        let tx = self.web3.eth().transaction(TransactionId::Hash(tx_hash)).await?;
        let receipt = self.web3.eth().transaction_receipt(tx_hash).await?;

        if let (Some(tx), Some(receipt)) = (tx, receipt) {
            let block = self.web3.eth().block(BlockNumber::Number(receipt.block_number.unwrap())).await?
                .ok_or("Block not found")?;

            Ok(Some(TransactionInfo {
                hash: tx_hash,
                block_number: receipt.block_number.unwrap(),
                timestamp: block.timestamp.as_u64(),
                from: tx.from.unwrap_or(Address::zero()),
                to: tx.to,
                value: tx.value,
                gas_used: receipt.gas_used,
                gas_price: tx.gas_price,
                status: receipt.status == Some(1.into()),
                logs: receipt.logs,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_block_info(&self, block_number: U256) -> Result<Option<BlockInfo>, Box<dyn std::error::Error>> {
        let block = self.web3.eth().block(BlockNumber::Number(block_number), false).await?;

        if let Some(block) = block {
            Ok(Some(BlockInfo {
                number: block.number.unwrap(),
                hash: block.hash.unwrap(),
                timestamp: block.timestamp.as_u64(),
                gas_used: block.gas_used,
                gas_limit: block.gas_limit,
                transaction_count: block.transactions.len(),
                miner: block.author,
                size: block.size.unwrap_or(0),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn get_latest_block_number(&self) -> Result<U256, Box<dyn std::error::Error>> {
        Ok(self.web3.eth().block_number().await?)
    }

    pub async fn get_block_transactions(&self, block_number: U256, include_details: bool) -> Result<Vec<TransactionInfo>, Box<dyn std::error::Error>> {
        let block = self.web3.eth().block(BlockNumber::Number(block_number), true).await?
            .ok_or("Block not found")?;

        let mut transactions = Vec::new();

        for tx_hash in block.transactions {
            if let H256(tx_hash_bytes) = tx_hash {
                if include_details {
                    if let Some(tx_info) = self.get_transaction_info(tx_hash_bytes.into()).await? {
                        transactions.push(tx_info);
                    }
                } else {
                    transactions.push(TransactionInfo {
                        hash: tx_hash_bytes.into(),
                        block_number,
                        timestamp: block.timestamp.as_u64(),
                        from: Address::zero(), // Would need to fetch individual tx
                        to: None,
                        value: U256::zero(),
                        gas_used: U256::zero(),
                        gas_price: U256::zero(),
                        status: true,
                        logs: vec![],
                    });
                }
            }
        }

        Ok(transactions)
    }

    pub async fn get_address_transactions(&self, address: Address, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<TransactionInfo>, Box<dyn std::error::Error>> {
        let filter = FilterBuilder::default()
            .from_block(BlockNumber::Number(from_block))
            .to_block(BlockNumber::Number(to_block))
            .build();

        let logs = self.web3.eth().logs(filter).await?;
        let mut transactions = Vec::new();
        let mut seen_hashes = std::collections::HashSet::new();

        for log in logs {
            if let Some(tx_hash) = log.transaction_hash {
                if seen_hashes.insert(tx_hash) {
                    if let Some(tx_info) = self.get_transaction_info(tx_hash).await? {
                        if tx_info.from == address || tx_info.to == Some(address) {
                            transactions.push(tx_info);
                            if transactions.len() >= limit {
                                break;
                            }
                        }
                    }
                }
            }
        }

        Ok(transactions)
    }

    pub async fn get_token_transfers(&self, token_address: Address, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<TokenTransfer>, Box<dyn std::error::Error>> {
        let transfer_event_signature = self.web3.eth().web3().sha3("Transfer(address,address,uint256)".as_bytes())?;

        let filter = FilterBuilder::default()
            .address(vec![token_address])
            .topics(Some(vec![transfer_event_signature]), None, None, None)
            .from_block(BlockNumber::Number(from_block))
            .to_block(BlockNumber::Number(to_block))
            .build();

        let logs = self.web3.eth().logs(filter).await?;
        let mut transfers = Vec::new();

        for log in logs.iter().take(limit) {
            if log.topics.len() >= 3 {
                let from = Address::from_slice(&log.topics[1][12..]);
                let to = Address::from_slice(&log.topics[2][12..]);
                let value = U256::from_big_endian(&log.data.0);

                let block = self.web3.eth().block(BlockNumber::Number(log.block_number.unwrap())).await?
                    .ok_or("Block not found")?;

                let transfer = TokenTransfer {
                    token_address,
                    from,
                    to,
                    value,
                    transaction_hash: log.transaction_hash.unwrap(),
                    block_number: log.block_number.unwrap(),
                    timestamp: block.timestamp.as_u64(),
                };

                transfers.push(transfer);
            }
        }

        Ok(transfers)
    }

    pub async fn get_contract_events(&self, contract_address: Address, event_signature: H256, from_block: U256, to_block: U256) -> Result<Vec<ContractEvent>, Box<dyn std::error::Error>> {
        let filter = FilterBuilder::default()
            .address(vec![contract_address])
            .topics(Some(vec![event_signature]), None, None, None)
            .from_block(BlockNumber::Number(from_block))
            .to_block(BlockNumber::Number(to_block))
            .build();

        let logs = self.web3.eth().logs(filter).await?;
        let mut events = Vec::new();

        for log in logs {
            let event = ContractEvent {
                address: contract_address,
                event_name: self.get_event_name_from_signature(event_signature),
                args: self.decode_event_data(&log.data.0, &log.topics),
                block_number: log.block_number.unwrap(),
                transaction_hash: log.transaction_hash.unwrap(),
                log_index: log.log_index.unwrap(),
            };

            events.push(event);
        }

        Ok(events)
    }

    fn get_event_name_from_signature(&self, signature: H256) -> String {
        let signatures = [
            ("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "Transfer"),
            ("0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925", "Approval"),
            ("0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1", "Sync"),
            ("0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f6", "Mint"),
            ("0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496b", "Burn"),
        ];

        for (sig, name) in signatures.iter() {
            if signature == H256::from_slice(&hex::decode(sig.trim_start_matches("0x")).unwrap()) {
                return name.to_string();
            }
        }

        "Unknown".to_string()
    }

    fn decode_event_data(&self, data: &[u8], topics: &[H256]) -> HashMap<String, serde_json::Value> {
        let mut args = HashMap::new();

        if topics.len() > 1 {
            args.insert("from".to_string(), serde_json::json!(format!("{:?}", Address::from_slice(&topics[1][12..]))));
        }
        if topics.len() > 2 {
            args.insert("to".to_string(), serde_json::json!(format!("{:?}", Address::from_slice(&topics[2][12..]))));
        }
        if data.len() >= 32 {
            args.insert("value".to_string(), serde_json::json!(U256::from_big_endian(data).to_string()));
        }

        args
    }

    pub async fn get_address_activity(&self, address: Address, days_back: u64) -> Result<Option<AddressActivity>, Box<dyn std::error::Error>> {
        {
            let cache = self.address_cache.lock().await;
            if let Some(activity) = cache.get(&address) {
                return Ok(Some(activity.clone()));
            }
        }

        let current_block = self.get_latest_block_number().await?;
        let blocks_per_day = 5760;
        let from_block = current_block.saturating_sub(U256::from(days_back * blocks_per_day));

        let transactions = self.get_address_transactions(address, from_block, current_block, 1000).await?;

        if transactions.is_empty() {
            return Ok(None);
        }

        let first_tx = transactions.iter().min_by_key(|tx| tx.timestamp).unwrap();
        let last_tx = transactions.iter().max_by_key(|tx| tx.timestamp).unwrap();

        let total_sent = transactions.iter()
            .filter(|tx| tx.from == address)
            .map(|tx| tx.value)
            .fold(U256::zero(), |acc, x| acc + x);

        let total_received = transactions.iter()
            .filter(|tx| tx.to == Some(address))
            .map(|tx| tx.value)
            .fold(U256::zero(), |acc, x| acc + x);

        let mut unique_addresses = std::collections::HashSet::new();
        for tx in &transactions {
            unique_addresses.insert(tx.from);
            if let Some(to) = tx.to {
                unique_addresses.insert(to);
            }
        }

        let activity = AddressActivity {
            address,
            transaction_count: transactions.len(),
            first_seen: first_tx.timestamp,
            last_seen: last_tx.timestamp,
            total_value_sent: total_sent,
            total_value_received: total_received,
            unique_interactions: unique_addresses.len().saturating_sub(1),
        };

        let mut cache = self.address_cache.lock().await;
        cache.insert(address, activity.clone());

        Ok(Some(activity))
    }

    pub async fn get_gas_price_history(&self, blocks_back: usize) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let current_block = self.get_latest_block_number().await?;
        let mut gas_prices = Vec::new();

        for i in 0..blocks_back.min(100) {
            let block_num = current_block.saturating_sub(U256::from(i));
            if let Some(block_info) = self.get_block_info(block_num).await? {
                let avg_gas_price = if block_info.transaction_count > 0 {
                    let txs = self.get_block_transactions(block_num, false).await?;
                    if let Some(first_tx) = txs.first() {
                        first_tx.gas_price
                    } else {
                        U256::zero()
                    }
                } else {
                    U256::zero()
                };

                gas_prices.push(serde_json::json!({
                    "block_number": block_info.number.to_string(),
                    "timestamp": block_info.timestamp,
                    "gas_price": avg_gas_price.to_string(),
                    "gas_used": block_info.gas_used.to_string(),
                    "gas_limit": block_info.gas_limit.to_string()
                }));
            }
        }

        Ok(gas_prices)
    }

    pub async fn get_network_stats(&self) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let current_block = self.get_latest_block_number().await?;
        let block_info = self.get_block_info(current_block).await?.ok_or("Block not found")?;

        let gas_prices = self.get_gas_price_history(10).await?;
        let avg_gas_price = if !gas_prices.is_empty() {
            let sum: f64 = gas_prices.iter()
                .filter_map(|gp| gp["gas_price"].as_str().and_then(|s| s.parse::<f64>().ok()))
                .sum();
            sum / gas_prices.len() as f64
        } else {
            0.0
        };

        Ok(serde_json::json!({
            "current_block": current_block.to_string(),
            "gas_price_gwei": avg_gas_price / 1e9,
            "network_utilization": (block_info.gas_used.as_u128() as f64 / block_info.gas_limit.as_u128() as f64) * 100.0,
            "timestamp": block_info.timestamp
        }))
    }

    pub async fn search_transactions_by_value(&self, min_value: U256, max_value: U256, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<TransactionInfo>, Box<dyn std::error::Error>> {
        let mut transactions = Vec::new();
        let mut current_block = from_block;

        while current_block <= to_block && transactions.len() < limit {
            let block_txs = self.get_block_transactions(current_block, true).await?;

            for tx in block_txs {
                if tx.value >= min_value && tx.value <= max_value {
                    transactions.push(tx);
                    if transactions.len() >= limit {
                        break;
                    }
                }
            }

            current_block = current_block + 1;
        }

        Ok(transactions)
    }

    pub async fn get_contract_balance_history(&self, contract_address: Address, from_block: U256, to_block: U256) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut balance_history = Vec::new();

        for block_num in (from_block.as_u64()..=to_block.as_u64().min(from_block.as_u64() + 100)).step_by(100) {
            let balance = self.web3.eth().balance(contract_address, Some(BlockNumber::Number(U256::from(block_num)))).await?;
            let block = self.web3.eth().block(BlockNumber::Number(U256::from(block_num)), false).await?
                .ok_or("Block not found")?;

            balance_history.push(serde_json::json!({
                "block_number": block_num,
                "timestamp": block.timestamp.as_u64(),
                "balance": balance.to_string()
            }));
        }

        Ok(balance_history)
    }

    pub async fn get_pending_transactions(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let pending_block = self.web3.eth().block(BlockNumber::Pending, true).await?;
        let mut transactions = Vec::new();

        if let Some(block) = pending_block {
            for tx in block.transactions {
                if let web3::types::Transaction { hash, from, to, value, gas_price, gas, .. } = tx {
                    transactions.push(serde_json::json!({
                        "hash": format!("{:?}", hash),
                        "from": format!("{:?}", from.unwrap_or(Address::zero())),
                        "to": to.map(|a| format!("{:?}", a)),
                        "value": value.to_string(),
                        "gas_price": gas_price.to_string(),
                        "gas_limit": gas.to_string()
                    }));
                }
            }
        }

        Ok(transactions)
    }

    pub async fn get_transaction_confirmations(&self, tx_hash: H256) -> Result<u64, Box<dyn std::error::Error>> {
        let receipt = self.web3.eth().transaction_receipt(tx_hash).await?;
        let current_block = self.get_latest_block_number().await?;

        if let Some(receipt) = receipt {
            if let Some(block_number) = receipt.block_number {
                return Ok(current_block.saturating_sub(block_number).as_u64());
            }
        }

        Ok(0)
    }

    pub async fn get_address_balance_history(&self, address: Address, days_back: u64) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let current_block = self.get_latest_block_number().await?;
        let blocks_per_day = 5760;
        let from_block = current_block.saturating_sub(U256::from(days_back * blocks_per_day));

        let mut balance_history = Vec::new();

        for block_num in (from_block.as_u64()..=current_block.as_u64()).step_by(blocks_per_day as usize) {
            let balance = self.web3.eth().balance(address, Some(BlockNumber::Number(U256::from(block_num)))).await?;
            let block = self.web3.eth().block(BlockNumber::Number(U256::from(block_num)), false).await?
                .ok_or("Block not found")?;

            balance_history.push(serde_json::json!({
                "timestamp": block.timestamp.as_u64(),
                "balance": balance.to_string(),
                "block_number": block_num
            }));
        }

        Ok(balance_history)
    }

    pub async fn get_most_active_addresses(&self, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let transactions = self.get_block_transactions(from_block, true).await?;
        let mut address_activity = HashMap::new();

        for tx in transactions {
            let from_count = address_activity.entry(tx.from).or_insert(serde_json::json!({
                "address": format!("{:?}", tx.from),
                "tx_count": 0,
                "total_value": "0"
            }));
            from_count["tx_count"] = serde_json::json!(from_count["tx_count"].as_u64().unwrap_or(0) + 1);
            from_count["total_value"] = serde_json::json!((U256::from_dec_str(from_count["total_value"].as_str().unwrap_or("0")).unwrap_or(U256::zero()) + tx.value).to_string());

            if let Some(to) = tx.to {
                let to_count = address_activity.entry(to).or_insert(serde_json::json!({
                    "address": format!("{:?}", to),
                    "tx_count": 0,
                    "total_value": "0"
                }));
                to_count["tx_count"] = serde_json::json!(to_count["tx_count"].as_u64().unwrap_or(0) + 1);
            }
        }

        let mut sorted_addresses: Vec<_> = address_activity.into_iter().collect();
        sorted_addresses.sort_by(|a, b| b.1["tx_count"].as_u64().unwrap_or(0).cmp(&a.1["tx_count"].as_u64().unwrap_or(0)));

        Ok(sorted_addresses.into_iter().take(limit).map(|(_, v)| v).collect())
    }

    pub async fn get_large_transactions(&self, min_value: U256, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<TransactionInfo>, Box<dyn std::error::Error>> {
        self.search_transactions_by_value(min_value, U256::max_value(), from_block, to_block, limit).await
    }

    pub async fn get_contract_creation_info(&self, contract_address: Address) -> Result<Option<serde_json::Value>, Box<dyn std::error::Error>> {
        let code = self.web3.eth().code(contract_address, None).await?;
        if code.0.is_empty() {
            return Ok(None);
        }

        let current_block = self.get_latest_block_number().await?;
        let from_block = current_block.saturating_sub(U256::from(100000));

        let logs = self.web3.eth().logs(FilterBuilder::default()
            .from_block(BlockNumber::Number(from_block))
            .to_block(BlockNumber::Number(current_block))
            .build()).await?;

        for log in logs {
            if let Some(tx_hash) = log.transaction_hash {
                if let Some(tx_info) = self.get_transaction_info(tx_hash).await? {
                    if tx_info.to.is_none() && tx_info.status {
                        let receipt = self.web3.eth().transaction_receipt(tx_hash).await?;
                        if let Some(receipt) = receipt {
                            if let Some(contract_addr) = receipt.contract_address {
                                if contract_addr == contract_address {
                                    return Ok(Some(serde_json::json!({
                                        "contract_address": format!("{:?}", contract_address),
                                        "creator_address": format!("{:?}", tx_info.from),
                                        "creation_tx_hash": format!("{:?}", tx_info.hash),
                                        "creation_block": tx_info.block_number.to_string(),
                                        "creation_timestamp": tx_info.timestamp
                                    })));
                                }
                            }
                        }
                    }
                }
            }
        }

        Ok(Some(serde_json::json!({
            "contract_address": format!("{:?}", contract_address),
            "creator_address": null,
            "creation_tx_hash": null,
            "creation_block": null,
            "creation_timestamp": null
        })))
    }

    pub async fn get_block_time_average(&self, blocks: usize) -> Result<f64, Box<dyn std::error::Error>> {
        let current_block = self.get_latest_block_number().await?;
        let mut timestamps = Vec::new();

        for i in 0..blocks.min(100) {
            let block_num = current_block.saturating_sub(U256::from(i));
            if let Some(block_info) = self.get_block_info(block_num).await? {
                timestamps.push(block_info.timestamp);
            }
        }

        if timestamps.len() < 2 {
            return Ok(15.0);
        }

        let time_diffs: Vec<f64> = timestamps.windows(2)
            .map(|w| w[0] as f64 - w[1] as f64)
            .collect();

        let avg_block_time = time_diffs.iter().sum::<f64>() / time_diffs.len() as f64;
        Ok(avg_block_time)
    }

    pub async fn get_network_hashrate(&self) -> Result<Option<u64>, Box<dyn std::error::Error>> {
        let current_block = self.get_latest_block_number().await?;
        if let Some(block_info) = self.get_block_info(current_block).await? {
            let avg_block_time = self.get_block_time_average(10).await?;
            let hashrate = (block_info.gas_limit.as_u128() as f64 / avg_block_time) as u64;
            Ok(Some(hashrate))
        } else {
            Ok(None)
        }
    }

    pub async fn get_transaction_volume(&self, from_block: U256, to_block: U256) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let transactions = self.get_block_transactions(from_block, true).await?;

        let total_volume = transactions.iter().map(|tx| tx.value).fold(U256::zero(), |acc, x| acc + x);
        let tx_count = transactions.len();
        let avg_tx_value = if tx_count > 0 {
            total_volume / U256::from(tx_count)
        } else {
            U256::zero()
        };

        let mut unique_addresses = std::collections::HashSet::new();
        for tx in &transactions {
            unique_addresses.insert(tx.from);
            if let Some(to) = tx.to {
                unique_addresses.insert(to);
            }
        }

        Ok(serde_json::json!({
            "total_volume": total_volume.to_string(),
            "transaction_count": tx_count,
            "average_transaction_value": avg_tx_value.to_string(),
            "unique_addresses": unique_addresses.len(),
            "blocks_analyzed": (to_block - from_block).to_string()
        }))
    }

    pub async fn get_address_labels(&self, addresses: Vec<Address>) -> HashMap<Address, String> {
        let mut labels = HashMap::new();

        let known_labels = [
            (Address::from_slice(&hex::decode("").unwrap()), "Null Address"),
            (Address::from_slice(&hex::decode("C02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2").unwrap()), "WETH"),
            (Address::from_slice(&hex::decode("A0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8").unwrap()), "USDC"),
            (Address::from_slice(&hex::decode("6B175474E89094C44Da98b954EedeAC495271d0F").unwrap()), "DAI"),
            (Address::from_slice(&hex::decode("7a250d5630B4cF539739dF2C5dAcb4c659F2488D").unwrap()), "Uniswap V2 Router"),
            (Address::from_slice(&hex::decode("5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f").unwrap()), "Uniswap V2 Factory"),
        ];

        for address in addresses {
            let label = known_labels.iter()
                .find(|(addr, _)| *addr == address)
                .map(|(_, label)| label.to_string())
                .unwrap_or_else(|| "Unknown".to_string());
            labels.insert(address, label);
        }

        labels
    }
}