use ic_cdk::api::management_canister::bitcoin::{
    bitcoin_get_balance, bitcoin_get_current_fee_percentiles, bitcoin_get_utxos,
    bitcoin_send_transaction, BitcoinNetwork as ICPBitcoinNetwork, GetBalanceRequest,
    GetCurrentFeePercentilesRequest, GetUtxosRequest, SendTransactionRequest, Utxo,
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
/// TODO: Expose this as a public API endpoint if needed for balance queries
#[allow(dead_code)]
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
pub async fn get_utxos(address: String, network: BitcoinNetwork) -> Result<Vec<Utxo>, String> {
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
///
/// After successful broadcast, the transaction is automatically tracked
/// for confirmations (if required_confirmations > 0).
pub async fn broadcast_transaction(
    transaction: &[u8],
    network: BitcoinNetwork,
) -> Result<String, String> {
    let request = SendTransactionRequest {
        transaction: transaction.to_vec(),
        network: to_icp_network(network),
    };

    bitcoin_send_transaction(request)
        .await
        .map(|_| {
            // Calculate txid from transaction bytes
            calculate_txid(transaction)
        })
        .map_err(|e| format!("Failed to broadcast transaction: {:?}", e))
}

/// Broadcast transaction and start confirmation tracking
///
/// This is a convenience function that broadcasts a transaction and
/// automatically starts tracking it for confirmations.
pub async fn broadcast_and_track(
    transaction: &[u8],
    network: BitcoinNetwork,
    required_confirmations: u32,
) -> Result<String, String> {
    // Broadcast transaction
    let txid = broadcast_transaction(transaction, network).await?;

    // Get current block height
    let current_height = get_block_height(network).await?;

    // Start tracking confirmations
    if required_confirmations > 0 {
        crate::confirmation_tracker::track_transaction(
            txid.clone(),
            network,
            current_height,
            required_confirmations,
        );

        ic_cdk::println!(
            "📡 Broadcast tx {} and started tracking (needs {} confirmations)",
            txid,
            required_confirmations
        );
    }

    Ok(txid)
}

/// Calculate transaction ID from raw transaction bytes
pub fn calculate_txid(tx_bytes: &[u8]) -> String {
    use sha2::{Digest, Sha256};

    // Bitcoin uses double SHA256 for txid
    let hash1 = Sha256::digest(tx_bytes);
    let hash2 = Sha256::digest(hash1);

    // Reverse bytes (Bitcoin convention)
    let mut txid_bytes = hash2.to_vec();
    txid_bytes.reverse();

    hex::encode(txid_bytes)
}

/// Wait for transaction confirmations
/// Note: This is a simplified version that checks once
/// In production, use a heartbeat timer to poll periodically
/// TODO: Integrate with confirmation_tracker for production use
#[allow(dead_code)]
pub async fn wait_for_confirmations(
    txid: String,
    required_confirmations: u32,
    network: BitcoinNetwork,
) -> Result<u32, String> {
    // Check current confirmations
    let confs = get_transaction_confirmations(&txid, network).await?;

    if confs >= required_confirmations {
        Ok(confs)
    } else {
        Err(format!(
            "Transaction has {} confirmations, need {}",
            confs, required_confirmations
        ))
    }
}

/// Get number of confirmations for a transaction
///
/// This function uses the confirmation tracker to get real-time confirmations.
/// The transaction must have been previously tracked via broadcast_and_track()
/// or track_transaction().
///
/// Returns 0 if the transaction is not tracked or has not been confirmed yet.
pub async fn get_transaction_confirmations(
    txid: &str,
    network: BitcoinNetwork,
) -> Result<u32, String> {
    // Use the confirmation tracker
    crate::confirmation_tracker::get_transaction_confirmations(txid, network).await
}

/// Get current Bitcoin block height
pub async fn get_block_height(network: BitcoinNetwork) -> Result<u64, String> {
    // Use get_utxos with dummy address to extract tip_height from response
    let dummy_address = match network {
        BitcoinNetwork::Mainnet => "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        BitcoinNetwork::Testnet => "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx",
        BitcoinNetwork::Regtest => "bcrt1qw508d6qejxtdg4y5r3zarvary0c5xw7kygt080",
    };

    let request = GetUtxosRequest {
        address: dummy_address.to_string(),
        network: to_icp_network(network),
        filter: None,
    };

    bitcoin_get_utxos(request)
        .await
        .map(|(response,)| response.tip_height as u64)
        .map_err(|e| format!("Failed to get block height: {:?}", e))
}

/// Estimate time until N confirmations (in seconds)
/// TODO: Expose as helper function for UI/frontend estimates
#[allow(dead_code)]
pub fn estimate_confirmation_time(confirmations: u32) -> u64 {
    // Bitcoin average: 10 min per block
    (confirmations as u64) * 600
}
