use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, query, update};

mod bitcoin_api;
mod ckbtc;
mod schnorr;
mod transaction;
mod utxo;

use bitcoin_utils::address::derive_p2tr_address;
use quri_types::{BitcoinAddress, BitcoinNetwork, RuneEtching};

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Config {
    pub network: BitcoinNetwork,
    pub ckbtc_ledger_id: Principal,
}

thread_local! {
    static CONFIG: RefCell<Option<Config>> = RefCell::new(None);
}

use std::cell::RefCell;

#[init]
fn init(network: BitcoinNetwork, ckbtc_ledger_id: Principal) {
    CONFIG.with(|config| {
        *config.borrow_mut() = Some(Config {
            network,
            ckbtc_ledger_id,
        });
    });
    ic_cdk::println!("Bitcoin Integration canister initialized");
}

/// Get the canister's Bitcoin P2TR address for receiving payments
#[update]
async fn get_p2tr_address() -> Result<BitcoinAddress, String> {
    let derivation_path = vec![ic_cdk::api::id().as_slice().to_vec()];

    // Get Schnorr public key from ICP
    let public_key = schnorr::get_schnorr_public_key(derivation_path.clone())
        .await
        .map_err(|e| format!("Failed to get Schnorr public key: {:?}", e))?;

    // Derive P2TR address
    let network = get_network()?;
    let address = derive_p2tr_address(&public_key, network)
        .map_err(|e| format!("Failed to derive P2TR address: {}", e))?;

    Ok(BitcoinAddress {
        address,
        derivation_path,
    })
}

/// Get current Bitcoin network fee estimates
#[update]
async fn get_fee_estimates() -> Result<FeeEstimates, String> {
    let network = get_network()?;
    bitcoin_api::get_current_fee_percentiles(network)
        .await
        .map_err(|e| format!("Failed to get fee estimates: {:?}", e))
}

/// Etch a new Rune on Bitcoin L1
#[update]
async fn etch_rune(etching: RuneEtching) -> Result<String, String> {
    // Validate the etching parameters
    validate_etching(&etching)?;

    // Build the runestone (OP_RETURN output)
    let runestone = runes_utils::build_runestone(&etching)
        .map_err(|e| format!("Failed to build runestone: {}", e))?;

    // Get UTXOs for fee payment
    let utxos = utxo::get_utxos_for_etching(&etching)
        .await
        .map_err(|e| format!("Failed to get UTXOs: {}", e))?;

    // Build transaction
    let tx = bitcoin_utils::transaction::build_etching_transaction(
        &etching,
        &runestone,
        &utxos,
    )
    .map_err(|e| format!("Failed to build transaction: {}", e))?;

    // Sign transaction with threshold Schnorr
    let signed_tx = schnorr::sign_transaction(tx)
        .await
        .map_err(|e| format!("Failed to sign transaction: {:?}", e))?;

    // Broadcast to Bitcoin network
    let txid = bitcoin_api::send_transaction(&signed_tx)
        .await
        .map_err(|e| format!("Failed to broadcast transaction: {:?}", e))?;

    Ok(txid)
}

/// Get balance of ckBTC for a specific principal
#[query]
async fn get_ckbtc_balance(principal: Principal) -> Result<u64, String> {
    ckbtc::get_balance(principal)
        .await
        .map_err(|e| format!("Failed to get ckBTC balance: {}", e))
}

// Helper functions

fn get_network() -> Result<BitcoinNetwork, String> {
    CONFIG.with(|config| {
        config
            .borrow()
            .as_ref()
            .map(|c| c.network.clone())
            .ok_or_else(|| "Canister not initialized".to_string())
    })
}

fn validate_etching(etching: &RuneEtching) -> Result<(), String> {
    if etching.rune_name.is_empty() {
        return Err("Rune name cannot be empty".to_string());
    }

    if etching.divisibility > 38 {
        return Err("Divisibility must be between 0 and 38".to_string());
    }

    Ok(())
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FeeEstimates {
    pub slow: u64,      // sat/vbyte
    pub medium: u64,    // sat/vbyte
    pub fast: u64,      // sat/vbyte
}

ic_cdk::export_candid!();
