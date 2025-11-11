use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_balance, bitcoin_get_current_fee_percentiles, bitcoin_get_utxos,
    bitcoin_send_transaction, BitcoinNetwork as ICPBitcoinNetwork, GetBalanceRequest,
    GetCurrentFeePercentilesRequest, GetUtxosRequest, SendTransactionRequest,
    Utxo,
};
use quri_types::BitcoinNetwork;

use crate::FeeEstimates;

/// Convert our BitcoinNetwork type to ICP's BitcoinNetwork type
fn to_icp_network(network: BitcoinNetwork) -> ICPBitcoinNetwork {
    match network {
        BitcoinNetwork::Mainnet => ICPBitcoinNetwork::Mainnet,
        BitcoinNetwork::Testnet => ICPBitcoinNetwork::Testnet,
        BitcoinNetwork::Regtest => ICPBitcoinNetwork::Regtest,
    }
}

/// Get the balance of a Bitcoin address
pub async fn get_balance(address: String, network: BitcoinNetwork) -> Result<u64, String> {
    let request = GetBalanceRequest {
        address,
        network: to_icp_network(network),
        min_confirmations: Some(6),
    };

    bitcoin_get_balance(request)
        .await
        .map(|(balance,)| balance)
        .map_err(|e| format!("Failed to get balance: {:?}", e))
}

/// Get UTXOs for a Bitcoin address
pub async fn get_utxos(
    address: String,
    network: BitcoinNetwork,
) -> Result<Vec<Utxo>, String> {
    let request = GetUtxosRequest {
        address,
        network: to_icp_network(network),
        filter: None,
    };

    bitcoin_get_utxos(request)
        .await
        .map(|(response,)| response.utxos)
        .map_err(|e| format!("Failed to get UTXOs: {:?}", e))
}

/// Get current fee percentiles from the Bitcoin network
pub async fn get_current_fee_percentiles(network: BitcoinNetwork) -> Result<FeeEstimates, String> {
    let request = GetCurrentFeePercentilesRequest {
        network: to_icp_network(network),
    };

    bitcoin_get_current_fee_percentiles(request)
        .await
        .map(|(percentiles,)| {
            // Map percentiles to slow/medium/fast
            // Typically: 25th percentile = slow, 50th = medium, 75th = fast
            FeeEstimates {
                slow: percentiles.get(25).copied().unwrap_or(1),
                medium: percentiles.get(50).copied().unwrap_or(2),
                fast: percentiles.get(75).copied().unwrap_or(5),
            }
        })
        .map_err(|e| format!("Failed to get fee percentiles: {:?}", e))
}

/// Send a signed Bitcoin transaction to the network
pub async fn send_transaction(transaction: &[u8]) -> Result<String, String> {
    let network = BitcoinNetwork::Mainnet; // TODO: Get from config

    let request = SendTransactionRequest {
        transaction: transaction.to_vec(),
        network: to_icp_network(network),
    };

    bitcoin_send_transaction(request)
        .await
        .map(|_| {
            // Calculate txid from transaction
            use sha2::{Digest, Sha256};
            let hash1 = Sha256::digest(transaction);
            let hash2 = Sha256::digest(&hash1);
            hex::encode(hash2)
        })
        .map_err(|e| format!("Failed to send transaction: {:?}", e))
}
