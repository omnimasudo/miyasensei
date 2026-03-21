use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use web3::types::{Address, H256, U256, TransactionParameters, TransactionReceipt};
use web3::Web3;
use web3::transports::Http;
use secp256k1::{Secp256k1, SecretKey, PublicKey};
use rand::Rng;
use sha3::{Digest, Keccak256};
use hex;
use serde::{Serialize, Deserialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WalletConnection {
    pub address: Address,
    pub private_key: Option<String>,
    pub wallet_type: WalletType,
    pub connected: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum WalletType {
    Local,
    Hardware,
    MetaMask,
    WalletConnect,
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

pub struct WalletManager {
    web3: Web3<Http>,
    wallets: Arc<Mutex<HashMap<Address, WalletConnection>>>,
    active_wallet: Arc<Mutex<Option<Address>>>,
    secp: Secp256k1<secp256k1::All>,
}

impl WalletManager {
    pub fn new(web3: Web3<Http>) -> Self {
        Self {
            web3,
            wallets: Arc::new(Mutex::new(HashMap::new())),
            active_wallet: Arc::new(Mutex::new(None)),
            secp: Secp256k1::new(),
        }
    }

    pub async fn create_wallet(&self) -> Result<WalletConnection, Box<dyn std::error::Error>> {
        let mut rng = rand::thread_rng();
        let mut secret_key_bytes = [0u8; 32];
        rng.fill(&mut secret_key_bytes);

        let secret_key = SecretKey::from_slice(&secret_key_bytes)?;
        let public_key = PublicKey::from_secret_key(&self.secp, &secret_key);

        let public_key_bytes = public_key.serialize_uncompressed();
        let hash = Keccak256::digest(&public_key_bytes[1..]);
        let address_bytes = &hash[12..];

        let address = Address::from_slice(address_bytes);
        let private_key_hex = format!("0x{}", hex::encode(secret_key_bytes));

        let wallet = WalletConnection {
            address,
            private_key: Some(private_key_hex),
            wallet_type: WalletType::Local,
            connected: true,
        };

        let mut wallets = self.wallets.lock().await;
        wallets.insert(address, wallet.clone());

        Ok(wallet)
    }

    pub async fn import_wallet(&self, private_key: &str) -> Result<WalletConnection, Box<dyn std::error::Error>> {
        let private_key_bytes = hex::decode(private_key.trim_start_matches("0x"))?;
        let secret_key = SecretKey::from_slice(&private_key_bytes)?;

        let public_key = PublicKey::from_secret_key(&self.secp, &secret_key);
        let public_key_bytes = public_key.serialize_uncompressed();
        let hash = Keccak256::digest(&public_key_bytes[1..]);
        let address_bytes = &hash[12..];

        let address = Address::from_slice(address_bytes);

        let wallet = WalletConnection {
            address,
            private_key: Some(private_key.to_string()),
            wallet_type: WalletType::Local,
            connected: true,
        };

        let mut wallets = self.wallets.lock().await;
        wallets.insert(address, wallet.clone());

        Ok(wallet)
    }

    pub async fn connect_wallet(&self, address: Address, wallet_type: WalletType) -> Result<WalletConnection, Box<dyn std::error::Error>> {
        let wallet = WalletConnection {
            address,
            private_key: None,
            wallet_type,
            connected: true,
        };

        let mut wallets = self.wallets.lock().await;
        wallets.insert(address, wallet.clone());

        *self.active_wallet.lock().await = Some(address);

        Ok(wallet)
    }

    pub async fn disconnect_wallet(&self, address: Address) -> Result<(), Box<dyn std::error::Error>> {
        let mut wallets = self.wallets.lock().await;
        if let Some(wallet) = wallets.get_mut(&address) {
            wallet.connected = false;
        }

        let mut active = self.active_wallet.lock().await;
        if *active == Some(address) {
            *active = None;
        }

        Ok(())
    }

    pub async fn get_wallet(&self, address: Address) -> Option<WalletConnection> {
        let wallets = self.wallets.lock().await;
        wallets.get(&address).cloned()
    }

    pub async fn get_active_wallet(&self) -> Option<Address> {
        *self.active_wallet.lock().await
    }

    pub async fn set_active_wallet(&self, address: Address) -> Result<(), Box<dyn std::error::Error>> {
        let wallets = self.wallets.lock().await;
        if wallets.contains_key(&address) {
            *self.active_wallet.lock().await = Some(address);
            Ok(())
        } else {
            Err("Wallet not found".into())
        }
    }

    pub async fn get_wallet_balance(&self, address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let balance = self.web3.eth().balance(address, None).await?;
        Ok(balance)
    }

    pub async fn get_wallet_nonce(&self, address: Address) -> Result<U256, Box<dyn std::error::Error>> {
        let nonce = self.web3.eth().transaction_count(address, None).await?;
        Ok(nonce)
    }

    pub async fn estimate_gas(&self, tx_request: &TransactionRequest) -> Result<U256, Box<dyn std::error::Error>> {
        let mut tx = TransactionParameters {
            to: tx_request.to,
            value: tx_request.value,
            data: web3::types::Bytes(tx_request.data.clone()),
            ..Default::default()
        };

        let gas_estimate = self.web3.eth().estimate_gas(tx, None).await?;
        Ok(gas_estimate)
    }

    pub async fn get_gas_price(&self) -> Result<U256, Box<dyn std::error::Error>> {
        let gas_price = self.web3.eth().gas_price().await?;
        Ok(gas_price)
    }

    pub async fn sign_transaction(&self, from_address: Address, tx_request: &TransactionRequest) -> Result<SignedTransaction, Box<dyn std::error::Error>> {
        let wallets = self.wallets.lock().await;
        let wallet = wallets.get(&from_address).ok_or("Wallet not found")?;
        let private_key_hex = wallet.private_key.as_ref().ok_or("Private key not available")?;

        let private_key_bytes = hex::decode(private_key_hex.trim_start_matches("0x"))?;
        let secret_key = SecretKey::from_slice(&private_key_bytes)?;

        let nonce = if let Some(n) = tx_request.nonce {
            n
        } else {
            self.get_wallet_nonce(from_address).await?
        };

        let gas_limit = if let Some(gl) = tx_request.gas_limit {
            gl
        } else {
            self.estimate_gas(tx_request).await?
        };

        let gas_price = if let Some(gp) = tx_request.gas_price {
            gp
        } else {
            self.get_gas_price().await?
        };

        let tx = TransactionParameters {
            to: tx_request.to,
            value: tx_request.value,
            data: web3::types::Bytes(tx_request.data.clone()),
            gas: gas_limit,
            gas_price: Some(gas_price),
            nonce: Some(nonce),
            ..Default::default()
        };

        let signed_tx = self.web3.accounts().sign_transaction(tx, &secret_key).await?;
        let raw_transaction = signed_tx.raw_transaction.0;
        let transaction_hash = signed_tx.transaction_hash;

        Ok(SignedTransaction {
            raw_transaction,
            transaction_hash,
        })
    }

    pub async fn send_transaction(&self, signed_tx: &SignedTransaction) -> Result<H256, Box<dyn std::error::Error>> {
        let tx_hash = self.web3.eth().send_raw_transaction(web3::types::Bytes(signed_tx.raw_transaction.clone())).await?;
        Ok(tx_hash)
    }

    pub async fn send_transaction_request(&self, from_address: Address, tx_request: &TransactionRequest) -> Result<H256, Box<dyn std::error::Error>> {
        let signed_tx = self.sign_transaction(from_address, tx_request).await?;
        self.send_transaction(&signed_tx).await
    }

    pub async fn wait_for_transaction(&self, tx_hash: H256, confirmations: usize) -> Result<TransactionReceipt, Box<dyn std::error::Error>> {
        let receipt = self.web3.eth().wait_for_transaction_receipt(tx_hash, Some(std::time::Duration::from_secs(60)), confirmations).await?;
        Ok(receipt)
    }

    pub async fn get_transaction_receipt(&self, tx_hash: H256) -> Result<Option<TransactionReceipt>, Box<dyn std::error::Error>> {
        let receipt = self.web3.eth().transaction_receipt(tx_hash).await?;
        Ok(receipt)
    }

    pub async fn transfer_eth(&self, from_address: Address, to_address: Address, amount: U256) -> Result<H256, Box<dyn std::error::Error>> {
        let tx_request = TransactionRequest {
            to: Some(to_address),
            value: amount,
            data: vec![],
            gas_limit: None,
            gas_price: None,
            nonce: None,
        };

        self.send_transaction_request(from_address, &tx_request).await
    }

    pub async fn batch_transfer(&self, from_address: Address, transfers: Vec<(Address, U256)>) -> Result<Vec<Result<H256, Box<dyn std::error::Error>>>, Box<dyn std::error::Error>> {
        let mut results = Vec::new();

        for (to_address, amount) in transfers {
            let result = self.transfer_eth(from_address, to_address, amount).await;
            results.push(result);
        }

        Ok(results)
    }

    pub async fn get_transaction_history(&self, address: Address, limit: usize) -> Result<Vec<H256>, Box<dyn std::error::Error>> {
        let current_block = self.web3.eth().block_number().await?;
        let from_block = if current_block.as_u64() > limit as u64 {
            web3::types::BlockNumber::Number(current_block - limit)
        } else {
            web3::types::BlockNumber::Earliest
        };

        let logs = self.web3.eth().logs(web3::types::FilterBuilder::default()
            .from_block(from_block)
            .to_block(web3::types::BlockNumber::Latest)
            .build()).await?;

        let mut transactions = Vec::new();
        for log in logs {
            if let Some(tx_hash) = log.transaction_hash {
                transactions.push(tx_hash);
                if transactions.len() >= limit {
                    break;
                }
            }
        }

        Ok(transactions)
    }

    pub async fn validate_address(&self, address: &str) -> bool {
        address.parse::<Address>().is_ok()
    }

    pub async fn get_chain_id(&self) -> Result<U256, Box<dyn std::error::Error>> {
        let chain_id = self.web3.eth().chain_id().await?;
        Ok(chain_id)
    }

    pub async fn is_contract(&self, address: Address) -> Result<bool, Box<dyn std::error::Error>> {
        let code = self.web3.eth().code(address, None).await?;
        Ok(!code.0.is_empty())
    }

    pub async fn get_wallet_info(&self, address: Address) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let balance = self.get_wallet_balance(address).await?;
        let nonce = self.get_wallet_nonce(address).await?;
        let is_contract = self.is_contract(address).await?;

        let info = serde_json::json!({
            "address": format!("{:?}", address),
            "balance": balance.to_string(),
            "nonce": nonce.to_string(),
            "is_contract": is_contract
        });

        Ok(info)
    }

    pub async fn export_wallet(&self, address: Address) -> Result<String, Box<dyn std::error::Error>> {
        let wallets = self.wallets.lock().await;
        let wallet = wallets.get(&address).ok_or("Wallet not found")?;
        let private_key = wallet.private_key.as_ref().ok_or("Private key not available")?;

        Ok(private_key.clone())
    }

    pub async fn list_wallets(&self) -> Vec<WalletConnection> {
        let wallets = self.wallets.lock().await;
        wallets.values().cloned().collect()
    }

    pub async fn clear_wallets(&self) {
        let mut wallets = self.wallets.lock().await;
        wallets.clear();
        *self.active_wallet.lock().await = None;
    }

    pub async fn sign_message(&self, address: Address, message: &str) -> Result<String, Box<dyn std::error::Error>> {
        let wallets = self.wallets.lock().await;
        let wallet = wallets.get(&address).ok_or("Wallet not found")?;
        let private_key_hex = wallet.private_key.as_ref().ok_or("Private key not available")?;

        let private_key_bytes = hex::decode(private_key_hex.trim_start_matches("0x"))?;
        let secret_key = SecretKey::from_slice(&private_key_bytes)?;

        let message_bytes = message.as_bytes();
        let signature = self.web3.accounts().sign(message_bytes, &secret_key).await?;

        Ok(format!("0x{}", hex::encode(signature.to_vec())))
    }

    pub async fn verify_signature(&self, address: Address, message: &str, signature: &str) -> Result<bool, Box<dyn std::error::Error>> {
        let signature_bytes = hex::decode(signature.trim_start_matches("0x"))?;
        let recovery_id = signature_bytes[64] as i32 - 27;

        let sig = secp256k1::ecdsa::Signature::from_compact(&signature_bytes[..64])?;
        let message_hash = Keccak256::digest(format!("\x19Ethereum Signed Message:\n{}{}", message.len(), message).as_bytes());

        let recovered_public_key = self.secp.recover_ecdsa(&secp256k1::Message::from_slice(&message_hash)?, &sig, secp256k1::ecdsa::RecoveryId::from_i32(recovery_id)?)?;
        let recovered_address = Address::from_slice(&Keccak256::digest(&recovered_public_key.serialize_uncompressed()[1..])[12..]);

        Ok(recovered_address == address)
    }

    pub async fn estimate_transaction_fee(&self, tx_request: &TransactionRequest) -> Result<U256, Box<dyn std::error::Error>> {
        let gas_limit = self.estimate_gas(tx_request).await?;
        let gas_price = self.get_gas_price().await?;
        Ok(gas_limit * gas_price)
    }

    pub async fn get_max_priority_fee(&self) -> Result<U256, Box<dyn std::error::Error>> {
        let fee_history = self.web3.eth().fee_history(U256::from(10), web3::types::BlockNumber::Latest, &[0.1, 0.2, 0.3]).await?;
        if let Some(reward) = fee_history.reward.last() {
            if let Some(max_priority_fee) = reward.last() {
                return Ok(*max_priority_fee);
            }
        }
        Ok(U256::from(2000000000u64)) // 2 gwei fallback
    }
}