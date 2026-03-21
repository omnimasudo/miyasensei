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
pub struct TokenInfo {
    pub address: Address,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: U256,
}

#[derive(Clone, Debug)]
pub struct TokenBalance {
    pub token: TokenInfo,
    pub balance: U256,
    pub formatted_balance: String,
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
pub struct ApprovalEvent {
    pub token_address: Address,
    pub owner: Address,
    pub spender: Address,
    pub value: U256,
    pub transaction_hash: H256,
    pub block_number: U256,
}

pub struct TokenOperations {
    web3: Web3<Http>,
    wallet_manager: Arc<dyn WalletManagerTrait>,
    token_cache: Arc<Mutex<HashMap<Address, TokenInfo>>>,
    erc20_abi: serde_json::Value,
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

impl TokenOperations {
    pub fn new(web3: Web3<Http>, wallet_manager: Arc<dyn WalletManagerTrait>) -> Self {
        let erc20_abi = serde_json::json!([
            {"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},
            {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},
            {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},
            {"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
            {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
            {"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
            {"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},
            {"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"remaining","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
            {"anonymous":false,"inputs":[{"indexed":true,"name":"_from","type":"address"},{"indexed":true,"name":"_to","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Transfer","type":"event"},
            {"anonymous":false,"inputs":[{"indexed":true,"name":"_owner","type":"address"},{"indexed":true,"name":"_spender","type":"address"},{"indexed":false,"name":"_value","type":"uint256"}],"name":"Approval","type":"event"}
        ]);

        Self {
            web3,
            wallet_manager,
            token_cache: Arc::new(Mutex::new(HashMap::new())),
            erc20_abi,
        }
    }

    pub async fn get_token_info(&self, token_address: Address) -> Result<TokenInfo, Box<dyn std::error::Error>> {
        {
            let cache = self.token_cache.lock().await;
            if let Some(token_info) = cache.get(&token_address) {
                return Ok(token_info.clone());
            }
        }

        let contract = Contract::from_json(self.web3.eth(), token_address, self.erc20_abi.to_string().as_bytes())?;

        let name: String = contract.query("name", (), None, Options::default(), None).await?;
        let symbol: String = contract.query("symbol", (), None, Options::default(), None).await?;
        let decimals: u8 = contract.query("decimals", (), None, Options::default(), None).await?;
        let total_supply: U256 = contract.query("totalSupply", (), None, Options::default(), None).await?;

        let token_info = TokenInfo {
            address: token_address,
            name,
            symbol,
            decimals,
            total_supply,
        };

        let mut cache = self.token_cache.lock().await;
        cache.insert(token_address, token_info.clone());

        Ok(token_info)
    }

    pub async fn get_token_balance(&self, token_address: Address, wallet_address: Address) -> Result<TokenBalance, Box<dyn std::error::Error>> {
        let token_info = self.get_token_info(token_address).await?;
        let contract = Contract::from_json(self.web3.eth(), token_address, self.erc20_abi.to_string().as_bytes())?;

        let balance: U256 = contract.query("balanceOf", (wallet_address,), None, Options::default(), None).await?;

        let formatted_balance = self.format_token_amount(balance, token_info.decimals);

        Ok(TokenBalance {
            token: token_info,
            balance,
            formatted_balance,
        })
    }

    pub async fn transfer_tokens(&self, token_address: Address, to_address: Address, amount: U256) -> Result<H256, Box<dyn std::error::Error>> {
        let from_address = self.wallet_manager.get_active_wallet().await.ok_or("No active wallet")?;

        let contract = Contract::from_json(self.web3.eth(), token_address, self.erc20_abi.to_string().as_bytes())?;

        let tx = contract.call("transfer", (to_address, amount), from_address, Options::default()).await?;
        let gas_estimate = self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(token_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await?;

        let signed_tx = self.wallet_manager.sign_transaction(from_address, &TransactionRequest {
            to: Some(token_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: Some(gas_estimate),
            gas_price: None,
            nonce: None,
        }).await?;

        self.wallet_manager.send_transaction(&signed_tx).await
    }

    pub async fn approve_spender(&self, token_address: Address, spender_address: Address, amount: U256) -> Result<H256, Box<dyn std::error::Error>> {
        let from_address = self.wallet_manager.get_active_wallet().await.ok_or("No active wallet")?;

        let contract = Contract::from_json(self.web3.eth(), token_address, self.erc20_abi.to_string().as_bytes())?;

        let tx = contract.call("approve", (spender_address, amount), from_address, Options::default()).await?;
        let gas_estimate = self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(token_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await?;

        let signed_tx = self.wallet_manager.sign_transaction(from_address, &TransactionRequest {
            to: Some(token_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: Some(gas_estimate),
            gas_price: None,
            nonce: None,
        }).await?;

        self.wallet_manager.send_transaction(&signed_tx).await
    }

    pub async fn get_allowance(&self, token_address: Address, owner_address: Address, spender_address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let contract = Contract::from_json(self.web3.eth(), token_address, self.erc20_abi.to_string().as_bytes())?;

        let allowance: U256 = contract.query("allowance", (owner_address, spender_address), None, Options::default(), None).await?;
        Ok(allowance)
    }

    pub async fn batch_transfer(&self, token_address: Address, transfers: Vec<(Address, U256)>) -> Result<Vec<Result<H256, Box<dyn std::error::Error>>>, Box<dyn std::error::Error>> {
        let mut results = Vec::new();

        for (to_address, amount) in transfers {
            let result = self.transfer_tokens(token_address, to_address, amount).await;
            results.push(result);
        }

        Ok(results)
    }

    pub async fn get_token_transfers(&self, token_address: Address, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<TokenTransfer>, Box<dyn std::error::Error>> {
        let transfer_event_signature = self.web3.eth().web3().sha3("Transfer(address,address,uint256)".as_bytes())?;

        let logs = self.web3.eth().logs(web3::types::FilterBuilder::default()
            .address(vec![token_address])
            .topics(Some(vec![transfer_event_signature]), None, None, None)
            .from_block(web3::types::BlockNumber::Number(from_block))
            .to_block(web3::types::BlockNumber::Number(to_block))
            .build()).await?;

        let mut transfers = Vec::new();

        for log in logs.iter().take(limit) {
            if log.topics.len() >= 3 {
                let from = Address::from_slice(&log.topics[1][12..]);
                let to = Address::from_slice(&log.topics[2][12..]);
                let value = U256::from_big_endian(&log.data.0);

                let block = self.web3.eth().block(web3::types::BlockNumber::Number(log.block_number.unwrap())).await?
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

    pub async fn get_wallet_token_balances(&self, wallet_address: Address, token_addresses: Vec<Address>) -> Result<Vec<TokenBalance>, Box<dyn std::error::Error>> {
        let mut balances = Vec::new();

        for token_address in token_addresses {
            match self.get_token_balance(token_address, wallet_address).await {
                Ok(balance) => balances.push(balance),
                Err(_) => continue,
            }
        }

        Ok(balances)
    }

    pub async def get_token_holders(&self, token_address: Address, from_block: U256, to_block: U256) -> Result<HashMap<Address, U256>, Box<dyn std::error::Error>> {
        let transfers = self.get_token_transfers(token_address, from_block, to_block, 1000).await?;

        let mut balances = HashMap::new();

        for transfer in transfers {
            *balances.entry(transfer.from).or_insert(U256::zero()) -= transfer.value;
            *balances.entry(transfer.to).or_insert(U256::zero()) += transfer.value;
        }

        Ok(balances.into_iter().filter(|(_, balance)| *balance > U256::zero()).collect())
    }

    pub async fn get_token_approval_events(&self, token_address: Address, from_block: U256, to_block: U256, limit: usize) -> Result<Vec<ApprovalEvent>, Box<dyn std::error::Error>> {
        let approval_event_signature = self.web3.eth().web3().sha3("Approval(address,address,uint256)".as_bytes())?;

        let logs = self.web3.eth().logs(web3::types::FilterBuilder::default()
            .address(vec![token_address])
            .topics(Some(vec![approval_event_signature]), None, None, None)
            .from_block(web3::types::BlockNumber::Number(from_block))
            .to_block(web3::types::BlockNumber::Number(to_block))
            .build()).await?;

        let mut approvals = Vec::new();

        for log in logs.iter().take(limit) {
            if log.topics.len() >= 3 {
                let owner = Address::from_slice(&log.topics[1][12..]);
                let spender = Address::from_slice(&log.topics[2][12..]);
                let value = U256::from_big_endian(&log.data.0);

                let approval = ApprovalEvent {
                    token_address,
                    owner,
                    spender,
                    value,
                    transaction_hash: log.transaction_hash.unwrap(),
                    block_number: log.block_number.unwrap(),
                };

                approvals.push(approval);
            }
        }

        Ok(approvals)
    }

    pub async fn estimate_transfer_gas(&self, token_address: Address, to_address: Address, amount: U256) -> Result<U256, Box<dyn std::error::Error>> {
        let from_address = self.wallet_manager.get_active_wallet().await.ok_or("No active wallet")?;

        let contract = Contract::from_json(self.web3.eth(), token_address, self.erc20_abi.to_string().as_bytes())?;
        let tx = contract.call("transfer", (to_address, amount), from_address, Options::default()).await?;

        self.wallet_manager.estimate_gas(&TransactionRequest {
            to: Some(token_address),
            value: U256::zero(),
            data: tx.data().unwrap().0.clone(),
            gas_limit: None,
            gas_price: None,
            nonce: None,
        }).await
    }

    pub async fn format_token_amount(&self, amount: U256, decimals: u8) -> String {
        if decimals == 0 {
            return amount.to_string();
        }

        let divisor = U256::from(10).pow(U256::from(decimals));
        let integer_part = amount / divisor;
        let fractional_part = amount % divisor;

        if fractional_part == U256::zero() {
            integer_part.to_string()
        } else {
            format!("{}.{:0>width$}", integer_part, fractional_part.to_string(), width = decimals as usize)
                .trim_end_matches('0')
                .trim_end_matches('.')
                .to_string()
        }
    }

    pub async fn parse_token_amount(&self, amount_str: &str, decimals: u8) -> Result<U256, Box<dyn std::error::Error>> {
        let parts: Vec<&str> = amount_str.split('.').collect();

        let integer_part = U256::from_dec_str(parts[0])?;

        let fractional_part = if parts.len() > 1 {
            let mut fractional = parts[1].to_string();
            fractional.truncate(decimals as usize);
            while fractional.len() < decimals as usize {
                fractional.push('0');
            }
            U256::from_dec_str(&fractional)?
        } else {
            U256::zero()
        };

        let divisor = U256::from(10).pow(U256::from(decimals));
        Ok(integer_part * divisor + fractional_part)
    }

    pub async fn get_token_price_usd(&self, token_address: Address) -> Result<f64, Box<dyn std::error::Error>> {
        // This would typically integrate with a price oracle like Chainlink
        // For demonstration, returning a mock price
        let mock_prices: HashMap<Address, f64> = [
            (Address::from_slice(&hex::decode("A0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8")?), 1.0), // USDC
            (Address::from_slice(&hex::decode("6B175474E89094C44Da98b954EedeAC495271d0F")?), 1.0), // DAI
            (Address::from_slice(&hex::decode("514910771AF9Ca656af840dff83E8264EcF986CA")?), 3000.0), // LINK
        ].into_iter().collect();

        mock_prices.get(&token_address).cloned().ok_or("Price not available".into())
    }

    pub async fn calculate_token_value_usd(&self, token_address: Address, amount: U256) -> Result<f64, Box<dyn std::error::Error>> {
        let token_info = self.get_token_info(token_address).await?;
        let price_usd = self.get_token_price_usd(token_address).await?;

        let amount_float = amount.as_u128() as f64 / 10f64.powi(token_info.decimals as i32);
        Ok(amount_float * price_usd)
    }

    pub async fn get_popular_tokens(&self) -> Vec<TokenInfo> {
        let popular_addresses = vec![
            Address::from_slice(&hex::decode("A0b86a33E6441e88C5F2712C3E9b74F5b8b6b8b8").unwrap()), // USDC
            Address::from_slice(&hex::decode("6B175474E89094C44Da98b954EedeAC495271d0F").unwrap()), // DAI
            Address::from_slice(&hex::decode("514910771AF9Ca656af840dff83E8264EcF986CA").unwrap()), // LINK
            Address::from_slice(&hex::decode("1f9840a85d5aF5bf1D1762F925BDADdC4201F984").unwrap()), // UNI
        ];

        let mut tokens = Vec::new();
        for address in popular_addresses {
            if let Ok(token_info) = self.get_token_info(address).await {
                tokens.push(token_info);
            }
        }

        tokens
    }

    pub async fn is_erc20_token(&self, token_address: Address) -> bool {
        match self.get_token_info(token_address).await {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    pub async fn get_token_total_supply(&self, token_address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let token_info = self.get_token_info(token_address).await?;
        Ok(token_info.total_supply)
    }

    pub async fn get_token_circulating_supply(&self, token_address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        // This is a simplified calculation - in reality, you'd need to account for locked tokens, etc.
        self.get_token_total_supply(token_address).await
    }

    pub async fn monitor_token_transfers(&self, token_address: Address, callback: Box<dyn Fn(TokenTransfer) + Send + Sync>) -> Result<(), Box<dyn std::error::Error>> {
        let transfer_event_signature = self.web3.eth().web3().sha3("Transfer(address,address,uint256)".as_bytes())?;

        let filter = web3::types::FilterBuilder::default()
            .address(vec![token_address])
            .topics(Some(vec![transfer_event_signature]), None, None, None)
            .build();

        let mut stream = self.web3.eth_subscribe().subscribe_logs(filter).await?;

        while let Some(log) = stream.next().await {
            if log.topics.len() >= 3 {
                let from = Address::from_slice(&log.topics[1][12..]);
                let to = Address::from_slice(&log.topics[2][12..]);
                let value = U256::from_big_endian(&log.data.0);

                let block = self.web3.eth().block(web3::types::BlockNumber::Number(log.block_number.unwrap())).await?
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

                callback(transfer);
            }
        }

        Ok(())
    }
}