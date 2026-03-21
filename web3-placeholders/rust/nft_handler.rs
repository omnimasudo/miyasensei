use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use web3::types::{Address, H256, U256, TransactionParameters, TransactionReceipt, Log};
use web3::Web3;
use web3::transports::Http;
use web3::contract::{Contract, Options};
use serde::{Serialize, Deserialize};
use hex;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NFTMetadata {
    pub name: String,
    pub description: String,
    pub image: String,
    pub attributes: Vec<serde_json::Value>,
}

#[derive(Clone, Debug)]
pub struct NFTToken {
    pub token_id: U256,
    pub contract_address: Address,
    pub owner: Address,
    pub metadata: Option<NFTMetadata>,
    pub token_uri: Option<String>,
}

#[derive(Clone, Debug)]
pub struct NFTTransfer {
    pub contract_address: Address,
    pub from: Address,
    pub to: Address,
    pub token_id: U256,
    pub transaction_hash: H256,
    pub block_number: U256,
    pub timestamp: u64,
}

#[derive(Clone, Debug)]
pub struct NFTApproval {
    pub contract_address: Address,
    pub owner: Address,
    pub approved: Address,
    pub token_id: U256,
    pub transaction_hash: H256,
    pub block_number: U256,
}

pub struct NFTOperations {
    web3: Web3<Http>,
    wallet_manager: Arc<dyn WalletManagerTrait>,
    contract_cache: Arc<Mutex<HashMap<Address, Contract<Http>>>>,
    erc721_abi: serde_json::Value,
}

#[async_trait::async_trait]
pub trait WalletManagerTrait: Send + Sync {
    async fn get_active_wallet(&self) -> Option<Address>;
    async fn sign_transaction(&self, from_address: Address, tx_request: &TransactionRequest) -> Result<SignedTransaction, Box<dyn std::error::Error>>;
    async fn send_transaction(&self, signed_tx: &SignedTransaction) -> Result<H256, Box<dyn std::error::Error>>;
    async fn get_wallet_nonce(&self, address: Address) -> Result<U256, Box<dyn std::error::Error>>;
    async fn estimate_gas(&self, tx_request: &TransactionRequest) -> Result<U256, Box<dyn std::error::Error>>;
    async fn get_gas_price(&self) -> Result<U256, Box<dyn std::error::Error>>;
}

#[derive(Clone, Debug)]
pub struct TransactionRequest {
    pub to: Option<Address>,
    pub value: U256,
    pub data: Vec<u8>,
    pub gas_limit: Option<U256>,
    pub gas_price: Option<U256>,
    pub nonce: Option<U256>,
}

#[derive(Clone, Debug)]
pub struct SignedTransaction {
    pub raw_transaction: Vec<u8>,
    pub transaction_hash: H256,
}

impl NFTOperations {
    pub fn new(web3: Web3<Http>, wallet_manager: Arc<dyn WalletManagerTrait>) -> Self {
        let erc721_abi = serde_json::json!([
            {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
            {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"tokenURI","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},
            {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
            {"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"}
        ]);

        Self {
            web3,
            wallet_manager,
            contract_cache: Arc::new(Mutex::new(HashMap::new())),
            erc721_abi,
        }
    }

    async fn get_contract(&self, contract_address: Address) -> Result<Contract<Http>, Box<dyn std::error::Error>> {
        {
            let cache = self.contract_cache.lock().await;
            if let Some(contract) = cache.get(&contract_address) {
                return Ok(contract.clone());
            }
        }

        let contract = Contract::from_json(self.web3.eth(), contract_address, self.erc721_abi.to_string().as_bytes())?;

        let mut cache = self.contract_cache.lock().await;
        cache.insert(contract_address, contract.clone());

        Ok(contract)
    }

    pub async fn get_nft_balance(&self, contract_address: Address, wallet_address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let balance: U256 = contract.query("balanceOf", (wallet_address,), None, Options::default(), None).await?;
        Ok(balance)
    }

    pub async fn get_nft_owner(&self, contract_address: Address, token_id: U256) -> Result<Address, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let owner: Address = contract.query("ownerOf", (token_id,), None, Options::default(), None).await?;
        Ok(owner)
    }

    pub async fn get_nft_token_uri(&self, contract_address: Address, token_id: U256) -> Result<String, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let token_uri: String = contract.query("tokenURI", (token_id,), None, Options::default(), None).await?;
        Ok(token_uri)
    }

    pub async fn get_nft_metadata(&self, contract_address: Address, token_id: U256) -> Result<Option<NFTMetadata>, Box<dyn std::error::Error>> {
        match self.get_nft_token_uri(contract_address, token_id).await {
            Ok(token_uri) => {
                match self.fetch_metadata_from_uri(&token_uri).await {
                    Ok(metadata) => Ok(Some(metadata)),
                    Err(_) => Ok(None),
                }
            },
            Err(_) => Ok(None),
        }
    }

    async fn fetch_metadata_from_uri(&self, uri: &str) -> Result<NFTMetadata, Box<dyn std::error::Error>> {
        let client = reqwest::Client::new();
        let response = client.get(uri).send().await?;
        let json: serde_json::Value = response.json().await?;

        let metadata = NFTMetadata {
            name: json.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            description: json.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            image: json.get("image").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            attributes: json.get("attributes").and_then(|v| v.as_array()).cloned().unwrap_or_default(),
        };

        Ok(metadata)
    }

    pub async fn get_nft_info(&self, contract_address: Address, token_id: U256) -> Result<Option<NFTToken>, Box<dyn std::error::Error>> {
        match self.get_nft_owner(contract_address, token_id).await {
            Ok(owner) => {
                let metadata = self.get_nft_metadata(contract_address, token_id).await?;
                let token_uri = self.get_nft_token_uri(contract_address, token_id).await.ok();

                let nft = NFTToken {
                    token_id,
                    contract_address,
                    owner,
                    metadata,
                    token_uri,
                };

                Ok(Some(nft))
            },
            Err(_) => Ok(None),
        }
    }

    pub async fn transfer_nft(&self, contract_address: Address, from_address: Address, to_address: Address, token_id: U256) -> Result<H256, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let tx = contract.call("transferFrom", (from_address, to_address, token_id), from_address, Options::default()).await?;

        let gas_estimate = self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await?;

        let signed_tx = self.wallet_manager.sign_transaction(from_address, &TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: Some(gas_estimate),
            gas_price: None,
            nonce: None,
        }).await?;

        self.wallet_manager.send_transaction(&signed_tx).await
    }

    pub async fn approve_nft(&self, contract_address: Address, owner_address: Address, approved_address: Address, token_id: U256) -> Result<H256, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let tx = contract.call("approve", (approved_address, token_id), owner_address, Options::default()).await?;

        let gas_estimate = self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await?;

        let signed_tx = self.wallet_manager.sign_transaction(owner_address, &TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: Some(gas_estimate),
            gas_price: None,
            nonce: None,
        }).await?;

        self.wallet_manager.send_transaction(&signed_tx).await
    }

    pub async fn set_approval_for_all(&self, contract_address: Address, owner_address: Address, operator_address: Address, approved: bool) -> Result<H256, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let tx = contract.call("setApprovalForAll", (operator_address, approved), owner_address, Options::default()).await?;

        let gas_estimate = self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await?;

        let signed_tx = self.wallet_manager.sign_transaction(owner_address, &TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: Some(gas_estimate),
            gas_price: None,
            nonce: None,
        }).await?;

        self.wallet_manager.send_transaction(&signed_tx).await
    }

    pub async fn is_approved_for_all(&self, contract_address: Address, owner_address: Address, operator_address: Address) -> Result<bool, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let approved: bool = contract.query("isApprovedForAll", (owner_address, operator_address), None, Options::default(), None).await?;
        Ok(approved)
    }

    pub async fn get_approved(&self, contract_address: Address, token_id: U256) -> Result<Address, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let approved: Address = contract.query("getApproved", (token_id,), None, Options::default(), None).await?;
        Ok(approved)
    }

    pub async fn get_wallet_nfts(&self, contract_address: Address, wallet_address: Address) -> Result<Vec<NFTToken>, Box<dyn std::error::Error>> {
        let balance = self.get_nft_balance(contract_address, wallet_address).await?;
        let mut nfts = Vec::new();

        for i in 0..balance.min(50.into()) {
            if let Some(token_id) = self.find_token_by_index(contract_address, wallet_address, i.as_u64() as usize).await? {
                if let Some(nft_info) = self.get_nft_info(contract_address, token_id).await? {
                    nfts.push(nft_info);
                }
            }
        }

        Ok(nfts)
    }

    async fn find_token_by_index(&self, contract_address: Address, owner: Address, index: usize) -> Result<Option<U256>, Box<dyn std::error::Error>> {
        let current_block = self.web3.eth().block_number().await?;
        let from_block = current_block.saturating_sub(100000);

        let transfer_event_signature = self.web3.eth().web3().sha3("Transfer(address,address,uint256)".as_bytes())?;

        let logs = self.web3.eth().logs(web3::types::FilterBuilder::default()
            .address(vec![contract_address])
            .topics(Some(vec![transfer_event_signature]), None, Some(vec![self.address_to_topic(owner)]), None)
            .from_block(web3::types::BlockNumber::Number(from_block))
            .to_block(web3::types::BlockNumber::Number(current_block))
            .build()).await?;

        let mut owned_tokens = std::collections::HashSet::new();

        for log in logs {
            if log.topics.len() >= 4 {
                let token_id = U256::from_big_endian(&log.topics[3][..]);
                owned_tokens.insert(token_id);
            }
        }

        let owned_tokens_vec: Vec<U256> = owned_tokens.into_iter().collect();
        if index < owned_tokens_vec.len() {
            Ok(Some(owned_tokens_vec[index]))
        } else {
            Ok(None)
        }
    }

    fn address_to_topic(&self, address: Address) -> H256 {
        let mut topic = [0u8; 32];
        topic[12..32].copy_from_slice(address.as_bytes());
        H256::from(topic)
    }

    pub async fn get_collection_info(&self, contract_address: Address) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;

        let name: String = contract.query("name", (), None, Options::default(), None).await?;
        let symbol: String = contract.query("symbol", (), None, Options::default(), None).await?;

        let info = serde_json::json!({
            "address": format!("{:?}", contract_address),
            "name": name,
            "symbol": symbol
        });

        Ok(info)
    }

    pub async fn get_nft_transfers(&self, contract_address: Address, from_block: U256, to_block: U256) -> Result<Vec<NFTTransfer>, Box<dyn std::error::Error>> {
        let transfer_event_signature = self.web3.eth().web3().sha3("Transfer(address,address,uint256)".as_bytes())?;

        let logs = self.web3.eth().logs(web3::types::FilterBuilder::default()
            .address(vec![contract_address])
            .topics(Some(vec![transfer_event_signature]), None, None, None)
            .from_block(web3::types::BlockNumber::Number(from_block))
            .to_block(web3::types::BlockNumber::Number(to_block))
            .build()).await?;

        let mut transfers = Vec::new();

        for log in logs {
            if log.topics.len() >= 4 {
                let from = Address::from_slice(&log.topics[1][12..]);
                let to = Address::from_slice(&log.topics[2][12..]);
                let token_id = U256::from_big_endian(&log.topics[3][..]);

                let block = self.web3.eth().block(web3::types::BlockNumber::Number(log.block_number.unwrap())).await?
                    .ok_or("Block not found")?;

                let transfer = NFTTransfer {
                    contract_address,
                    from,
                    to,
                    token_id,
                    transaction_hash: log.transaction_hash.unwrap(),
                    block_number: log.block_number.unwrap(),
                    timestamp: block.timestamp.as_u64(),
                };

                transfers.push(transfer);
            }
        }

        Ok(transfers)
    }

    pub async fn estimate_nft_transfer_gas(&self, contract_address: Address, from_address: Address, to_address: Address, token_id: U256) -> Result<U256, Box<dyn std::error::Error>> {
        let contract = self.get_contract(contract_address).await?;
        let tx = contract.call("transferFrom", (from_address, to_address, token_id), from_address, Options::default()).await?;

        self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(contract_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await
    }

    pub async fn batch_nft_transfer(&self, contract_address: Address, from_address: Address, transfers: Vec<(Address, U256)>) -> Result<Vec<Result<H256, Box<dyn std::error::Error>>>, Box<dyn std::error::Error>> {
        let mut results = Vec::new();

        for (to_address, token_id) in transfers {
            let result = self.transfer_nft(contract_address, from_address, to_address, token_id).await;
            results.push(result);
        }

        Ok(results)
    }

    pub fn is_valid_nft_contract(&self, contract_address: Address) -> bool {
        contract_address != Address::zero()
    }

    pub async fn get_nft_floor_price(&self, contract_address: Address) -> Result<Option<f64>, Box<dyn std::error::Error>> {
        let current_block = self.web3.eth().block_number().await?;
        let from_block = current_block.saturating_sub(10000);

        let transfers = self.get_nft_transfers(contract_address, from_block, current_block).await?;

        if transfers.is_empty() {
            return Ok(None);
        }

        let mut prices = Vec::new();
        for transfer in transfers {
            if let Some(price) = self.estimate_transfer_price(transfer.transaction_hash).await? {
                prices.push(price);
            }
        }

        if prices.is_empty() {
            Ok(None)
        } else {
            Ok(Some(prices.into_iter().fold(f64::INFINITY, f64::min)))
        }
    }

    async fn estimate_transfer_price(&self, tx_hash: H256) -> Result<Option<f64>, Box<dyn std::error::Error>> {
        let tx = self.web3.eth().transaction(TransactionId::Hash(tx_hash)).await?;
        let receipt = self.web3.eth().transaction_receipt(tx_hash).await?;

        if let (Some(tx), Some(receipt)) = (tx, receipt) {
            let gas_used = receipt.gas_used;
            let gas_price = tx.gas_price;
            let eth_cost = (gas_used * gas_price).as_u128() as f64 / 1e18;
            Ok(Some(eth_cost))
        } else {
            Ok(None)
        }
    }

    pub async fn get_nft_approval_events(&self, contract_address: Address, from_block: U256, to_block: U256) -> Result<Vec<NFTApproval>, Box<dyn std::error::Error>> {
        let approval_event_signature = self.web3.eth().web3().sha3("Approval(address,address,uint256)".as_bytes())?;

        let logs = self.web3.eth().logs(web3::types::FilterBuilder::default()
            .address(vec![contract_address])
            .topics(Some(vec![approval_event_signature]), None, None, None)
            .from_block(web3::types::BlockNumber::Number(from_block))
            .to_block(web3::types::BlockNumber::Number(to_block))
            .build()).await?;

        let mut approvals = Vec::new();

        for log in logs {
            if log.topics.len() >= 4 {
                let owner = Address::from_slice(&log.topics[1][12..]);
                let approved = Address::from_slice(&log.topics[2][12..]);
                let token_id = U256::from_big_endian(&log.topics[3][..]);

                let approval = NFTApproval {
                    contract_address,
                    owner,
                    approved,
                    token_id,
                    transaction_hash: log.transaction_hash.unwrap(),
                    block_number: log.block_number.unwrap(),
                };

                approvals.push(approval);
            }
        }

        Ok(approvals)
    }

    pub async fn get_nft_collection_stats(&self, contract_address: Address) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let current_block = self.web3.eth().block_number().await?;
        let from_block = current_block.saturating_sub(100000);

        let transfers = self.get_nft_transfers(contract_address, from_block, current_block).await?;
        let floor_price = self.get_nft_floor_price(contract_address).await?;

        let unique_holders = transfers.iter()
            .map(|t| t.to)
            .collect::<std::collections::HashSet<_>>()
            .len();

        let total_transfers = transfers.len();

        let stats = serde_json::json!({
            "contract_address": format!("{:?}", contract_address),
            "total_transfers": total_transfers,
            "unique_holders": unique_holders,
            "floor_price_eth": floor_price,
            "time_range_days": 7
        });

        Ok(stats)
    }

    pub async fn monitor_nft_transfers(&self, contract_address: Address, callback: Box<dyn Fn(NFTTransfer) + Send + Sync>) -> Result<(), Box<dyn std::error::Error>> {
        let transfer_event_signature = self.web3.eth().web3().sha3("Transfer(address,address,uint256)".as_bytes())?;

        let filter = web3::types::FilterBuilder::default()
            .address(vec![contract_address])
            .topics(Some(vec![transfer_event_signature]), None, None, None)
            .build();

        let mut stream = self.web3.eth_subscribe().subscribe_logs(filter).await?;

        while let Some(log) = stream.next().await {
            if log.topics.len() >= 4 {
                let from = Address::from_slice(&log.topics[1][12..]);
                let to = Address::from_slice(&log.topics[2][12..]);
                let token_id = U256::from_big_endian(&log.topics[3][..]);

                let block = self.web3.eth().block(web3::types::BlockNumber::Number(log.block_number.unwrap())).await?
                    .ok_or("Block not found")?;

                let transfer = NFTTransfer {
                    contract_address,
                    from,
                    to,
                    token_id,
                    transaction_hash: log.transaction_hash.unwrap(),
                    block_number: log.block_number.unwrap(),
                    timestamp: block.timestamp.as_u64(),
                };

                callback(transfer);
            }
        }

        Ok(())
    }
}