use ic_cdk::api::management_canister::bitcoin::{
    GetUtxosResponse, Outpoint, Utxo as ICPUtxo,
};
use quri_types::{BitcoinNetwork, RuneEtching};

use crate::bitcoin_api;

/// UTXO with additional metadata for selection
#[derive(Clone, Debug)]
pub struct UtxoWithMetadata {
    pub utxo: ICPUtxo,
    pub value_per_vbyte: f64, // value/size ratio for efficiency
}

/// Result of UTXO selection
pub struct UtxoSelection {
    pub selected: Vec<ICPUtxo>,
    pub total_value: u64,
    pub estimated_fee: u64,
    pub change: u64,
}

/// Get UTXOs for canister's Bitcoin address
pub async fn get_canister_utxos(network: BitcoinNetwork) -> Result<Vec<ICPUtxo>, String> {
    let address = get_canister_address(network).await?;
    bitcoin_api::get_utxos(address, network).await
}

/// Select UTXOs for etching transaction using greedy algorithm
///
/// Strategy: Largest-first to minimize number of inputs (reduces fees)
pub async fn select_utxos_for_etching(
    network: BitcoinNetwork,
    amount_needed: u64,
    fee_rate: u64,
) -> Result<UtxoSelection, String> {
    let mut utxos = get_canister_utxos(network).await?;

    if utxos.is_empty() {
        return Err("No UTXOs available".to_string());
    }

    // Sort by value descending (greedy: take largest first)
    utxos.sort_by(|a, b| b.value.cmp(&a.value));

    let mut selected = Vec::new();
    let mut total_value = 0u64;

    // Estimate: 1 input ≈ 68 vbytes (for P2TR), base tx ≈ 10 vbytes
    // We'll refine this as we select
    let base_size = 10u64; // version + locktime + output count
    let runestone_output_size = 50u64; // OP_RETURN output (variable)
    let change_output_size = 43u64; // P2TR output

    for utxo in utxos {
        selected.push(utxo.clone());
        total_value += utxo.value;

        // Calculate current fee with selected inputs
        let input_size = 68 * selected.len() as u64; // P2TR input with witness
        let estimated_vsize = base_size + input_size + runestone_output_size + change_output_size;
        let estimated_fee = estimated_vsize * fee_rate;

        // Check if we have enough to cover amount + fee
        if total_value >= amount_needed + estimated_fee {
            let change = total_value - amount_needed - estimated_fee;

            return Ok(UtxoSelection {
                selected,
                total_value,
                estimated_fee,
                change,
            });
        }
    }

    Err(format!(
        "Insufficient funds: have {}, need at least {}",
        total_value,
        amount_needed + (base_size + 68 + runestone_output_size + change_output_size) * fee_rate
    ))
}

/// Get UTXOs for a specific amount with Branch & Bound optimization
///
/// More advanced: tries to avoid change output when possible
pub async fn select_utxos_optimal(
    network: BitcoinNetwork,
    target: u64,
    fee_rate: u64,
    cost_of_change: u64, // Cost to create and spend a change output
) -> Result<UtxoSelection, String> {
    let mut utxos = get_canister_utxos(network).await?;

    if utxos.is_empty() {
        return Err("No UTXOs available".to_string());
    }

    // Sort by value descending
    utxos.sort_by(|a, b| b.value.cmp(&a.value));

    // Try to find exact match (no change) within tolerance
    let tolerance = cost_of_change;

    // Branch & Bound (simplified): try subsets
    if let Some(selection) = find_exact_match(&utxos, target, fee_rate, tolerance) {
        return Ok(selection);
    }

    // Fall back to greedy if no exact match
    select_utxos_for_etching(network, target, fee_rate).await
}

/// Try to find UTXO combination that minimizes/eliminates change
fn find_exact_match(
    utxos: &[ICPUtxo],
    target: u64,
    fee_rate: u64,
    tolerance: u64,
) -> Option<UtxoSelection> {
    // Simplified Branch & Bound: try combinations up to 3 inputs
    // (full BnB is complex, this is MVP)

    for i in 0..utxos.len() {
        let single = vec![utxos[i].clone()];
        let value = utxos[i].value;
        let fee = estimate_fee(&single, fee_rate);

        if value >= target + fee && value <= target + fee + tolerance {
            return Some(UtxoSelection {
                selected: single,
                total_value: value,
                estimated_fee: fee,
                change: value - target - fee,
            });
        }
    }

    // Try pairs
    for i in 0..utxos.len() {
        for j in (i + 1)..utxos.len() {
            let pair = vec![utxos[i].clone(), utxos[j].clone()];
            let value = utxos[i].value + utxos[j].value;
            let fee = estimate_fee(&pair, fee_rate);

            if value >= target + fee && value <= target + fee + tolerance {
                return Some(UtxoSelection {
                    selected: pair,
                    total_value: value,
                    estimated_fee: fee,
                    change: value - target - fee,
                });
            }
        }
    }

    None
}

/// Estimate fee for selected UTXOs
fn estimate_fee(utxos: &[ICPUtxo], fee_rate: u64) -> u64 {
    let base_size = 10u64;
    let input_size = 68 * utxos.len() as u64;
    let runestone_output = 50u64;
    let change_output = 43u64;

    let vsize = base_size + input_size + runestone_output + change_output;
    vsize * fee_rate
}

/// Get canister's Bitcoin address for receiving funds
async fn get_canister_address(network: BitcoinNetwork) -> Result<String, String> {
    use crate::schnorr;

    // Derivation path: canister ID
    let canister_id = ic_cdk::api::id();
    let derivation_path = vec![canister_id.as_slice().to_vec()];

    // Get Schnorr public key
    let pubkey = schnorr::get_schnorr_public_key(derivation_path).await?;

    // Derive P2TR address
    use bitcoin_utils::address::derive_p2tr_address;
    let address = derive_p2tr_address(&pubkey, network)
        .map_err(|e| format!("Failed to derive address: {}", e))?;

    Ok(address)
}

/// Get minimum UTXO value (dust limit)
pub fn get_dust_limit() -> u64 {
    // P2TR dust limit: 330 sats
    330
}

/// Filter out dust UTXOs
pub fn filter_dust(utxos: Vec<ICPUtxo>) -> Vec<ICPUtxo> {
    let dust_limit = get_dust_limit();
    utxos
        .into_iter()
        .filter(|utxo| utxo.value >= dust_limit)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dust_filter() {
        let utxos = vec![
            create_mock_utxo(100),  // dust
            create_mock_utxo(500),  // ok
            create_mock_utxo(1000), // ok
        ];

        let filtered = filter_dust(utxos);
        assert_eq!(filtered.len(), 2);
        assert_eq!(filtered[0].value, 500);
    }

    #[test]
    fn test_estimate_fee() {
        let utxos = vec![create_mock_utxo(10000), create_mock_utxo(20000)];
        let fee = estimate_fee(&utxos, 2); // 2 sats/vbyte

        // base(10) + 2inputs(136) + runestone(50) + change(43) = 239 vbytes
        // 239 * 2 = 478 sats
        assert_eq!(fee, 478);
    }

    fn create_mock_utxo(value: u64) -> ICPUtxo {
        ICPUtxo {
            outpoint: Outpoint {
                txid: vec![0u8; 32],
                vout: 0,
            },
            value,
            height: 0,
        }
    }
}
