use crate::Result;
use quri_types::RuneEtching;
use sha2::{Digest, Sha256};

/// Build a Bitcoin transaction for Rune etching
pub fn build_etching_transaction(
    etching: &RuneEtching,
    runestone: &[u8],
    utxos: &[ic_cdk::api::management_canister::bitcoin::Utxo],
) -> Result<Vec<u8>> {
    let _ = (etching, utxos); // Silence unused warnings for now
    // In production, this would:
    // 1. Create transaction inputs from UTXOs
    // 2. Create OP_RETURN output with runestone
    // 3. Create change output
    // 4. Calculate proper fees
    // 5. Serialize transaction

    // Placeholder implementation
    let tx = create_placeholder_tx(runestone);
    Ok(tx)
}

/// Calculate transaction virtual size (vsize)
pub fn calculate_vsize(tx: &[u8]) -> u64 {
    // Simplified vsize calculation
    // In production, properly calculate witness discount
    tx.len() as u64
}

/// Create transaction ID (TXID) from raw transaction
pub fn calculate_txid(tx: &[u8]) -> String {
    let hash1 = Sha256::digest(tx);
    let hash2 = Sha256::digest(&hash1);
    hex::encode(hash2)
}

fn create_placeholder_tx(_runestone: &[u8]) -> Vec<u8> {
    // This is a placeholder
    // In production, use the bitcoin crate to build proper transactions
    let mut tx = Vec::new();

    // Version (4 bytes)
    tx.extend_from_slice(&1u32.to_le_bytes());

    // Marker and flag for witness (2 bytes)
    tx.push(0x00);
    tx.push(0x01);

    // Input count
    tx.push(0x01);

    // ... rest of transaction structure

    tx
}

/// Estimate transaction fee
pub fn estimate_fee(num_inputs: usize, num_outputs: usize, fee_rate: u64) -> u64 {
    // Rough estimate:
    // Base size: 10 bytes
    // Each input: ~68 bytes (P2TR)
    // Each output: ~43 bytes
    let estimated_vsize = 10 + (num_inputs * 68) + (num_outputs * 43);
    (estimated_vsize as u64) * fee_rate
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_estimate_fee() {
        let fee = estimate_fee(1, 2, 10);
        assert!(fee > 0);
    }

    #[test]
    fn test_calculate_txid() {
        let tx = vec![1, 2, 3, 4];
        let txid = calculate_txid(&tx);
        assert_eq!(txid.len(), 64); // SHA256 hash hex encoded
    }
}
