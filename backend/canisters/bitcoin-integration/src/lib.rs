use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::DefaultMemoryImpl;
use std::cell::RefCell;
use std::str::FromStr;

mod bitcoin_api;
mod ckbtc;
mod config;
mod confirmation_tracker;
mod schnorr;
mod transaction;
mod utxo;

use bitcoin_utils::address::derive_p2tr_address;
use quri_types::{BitcoinAddress, BitcoinNetwork, FeeEstimates, RuneEtching, UtxoSelection};

type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Config {
    pub network: BitcoinNetwork,
    pub ckbtc_ledger_id: Principal,
}

thread_local! {
    static CONFIG: RefCell<Option<Config>> = const { RefCell::new(None) };

    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
}

#[init]
fn init(network: BitcoinNetwork, ckbtc_ledger_id: Principal) {
    CONFIG.with(|config| {
        *config.borrow_mut() = Some(Config {
            network,
            ckbtc_ledger_id,
        });
    });

    // Initialize confirmation tracker storage (MemoryId 0)
    let confirmation_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)));
    confirmation_tracker::init_confirmation_storage(confirmation_memory);

    ic_cdk::println!("Bitcoin Integration canister initialized");
    config::log_config();

    // Schedule timer initialization after init completes
    // Timers cannot be set during init, so we use a one-shot timer
    ic_cdk_timers::set_timer(std::time::Duration::from_secs(1), || {
        confirmation_tracker::init_confirmation_tracker();
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");

    // Stop timers before upgrade
    confirmation_tracker::stop_confirmation_tracker();
}

#[post_upgrade]
fn post_upgrade() {
    // Reinitialize confirmation tracker storage (MemoryId 0)
    let confirmation_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)));
    confirmation_tracker::reinit_confirmation_storage(confirmation_memory);

    // Config needs to be re-initialized after upgrade
    // Call configure() after upgrade to set the config
    ic_cdk::println!("Bitcoin Integration canister upgraded - call configure() to set network");

    // Schedule timer initialization after upgrade completes
    ic_cdk_timers::set_timer(std::time::Duration::from_secs(1), || {
        confirmation_tracker::init_confirmation_tracker();
    });
}

/// Admin function to configure/reconfigure the canister
/// Can be called after upgrade to reinitialize config
#[update]
fn configure(network: BitcoinNetwork, ckbtc_ledger_id: Principal) -> Result<String, String> {
    CONFIG.with(|config| {
        *config.borrow_mut() = Some(Config {
            network,
            ckbtc_ledger_id,
        });
    });
    ic_cdk::println!("Bitcoin Integration canister configured");
    config::log_config();
    Ok(format!("Configured for {:?} with ckBTC ledger {}", network, ckbtc_ledger_id))
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

/// Select UTXOs for a specific amount
#[update]
async fn select_utxos(amount_needed: u64, fee_rate: u64) -> Result<UtxoSelection, String> {
    let network = get_network()?;
    utxo::select_utxos_for_etching(network, amount_needed, fee_rate)
        .await
        .map_err(|e| format!("Failed to select UTXOs: {}", e))
}

/// Build and sign a complete etching transaction
#[update]
async fn build_and_sign_etching_tx(
    etching: RuneEtching,
    utxo_selection: UtxoSelection,
) -> Result<Vec<u8>, String> {
    // Validate etching parameters
    validate_etching(&etching)?;

    let network = get_network()?;

    // Get canister's P2TR address for change
    let address_info = get_p2tr_address().await?;
    let change_address = bitcoin::Address::from_str(&address_info.address)
        .map_err(|e| format!("Invalid address: {}", e))?
        .require_network(convert_network(network))
        .map_err(|e| format!("Address network mismatch: {}", e))?;

    // Build transaction using the selected UTXO
    if utxo_selection.selected.is_empty() {
        return Err("No UTXOs selected".to_string());
    }

    let utxo = &utxo_selection.selected[0];

    // Construct script_pubkey from the change address (P2TR)
    let script_pubkey = change_address.script_pubkey();

    let prev_output = transaction::PreviousOutput {
        outpoint: bitcoin::OutPoint {
            txid: bitcoin::Txid::from_str(&hex::encode(&utxo.outpoint.txid))
                .map_err(|e| format!("Invalid txid: {}", e))?,
            vout: utxo.outpoint.vout,
        },
        amount: utxo.value,
        script_pubkey,
    };

    let fee_rate = 2; // sats/vbyte
    let tx_data =
        transaction::build_etching_transaction(&etching, prev_output, &change_address, fee_rate)?;

    // Sign transaction with threshold Schnorr
    let derivation_path = address_info.derivation_path;
    let signature = schnorr::sign_message(tx_data.sighash, derivation_path)
        .await
        .map_err(|e| format!("Failed to sign transaction: {}", e))?;

    // Finalize transaction with signature
    let signed_tx =
        transaction::finalize_transaction(tx_data.unsigned_tx, tx_data.input_index, &signature)?;

    // Serialize transaction to bytes
    use bitcoin::consensus::Encodable;
    let mut tx_bytes = Vec::new();
    signed_tx
        .consensus_encode(&mut tx_bytes)
        .map_err(|e| format!("Failed to encode transaction: {}", e))?;

    Ok(tx_bytes)
}

/// Broadcast a signed Bitcoin transaction
#[update]
async fn broadcast_transaction(tx_bytes: Vec<u8>) -> Result<String, String> {
    let network = get_network()?;
    bitcoin_api::broadcast_transaction(&tx_bytes, network)
        .await
        .map_err(|e| format!("Failed to broadcast transaction: {}", e))
}

/// Broadcast a signed Bitcoin transaction and start confirmation tracking
///
/// This function broadcasts the transaction and automatically starts tracking
/// it for confirmations. Use this instead of broadcast_transaction() when you
/// need to wait for confirmations.
#[update]
async fn broadcast_and_track(
    tx_bytes: Vec<u8>,
    required_confirmations: u32,
) -> Result<String, String> {
    let network = get_network()?;
    bitcoin_api::broadcast_and_track(&tx_bytes, network, required_confirmations)
        .await
        .map_err(|e| format!("Failed to broadcast transaction: {}", e))
}

/// Get current Bitcoin block height
#[update]
async fn get_block_height() -> Result<u64, String> {
    let network = get_network()?;
    bitcoin_api::get_block_height(network)
        .await
        .map_err(|e| format!("Failed to get block height: {}", e))
}

/// Get balance of ckBTC for a specific principal
/// MUST be update (not query) because it makes inter-canister calls
#[update]
async fn get_ckbtc_balance(principal: Principal) -> Result<u64, String> {
    ckbtc::get_balance(principal)
        .await
        .map_err(|e| format!("Failed to get ckBTC balance: {}", e))
}

/// Transfer ckBTC to a recipient
/// Used for refunds and other transfers
#[update]
async fn transfer_ckbtc(
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    ckbtc::transfer(to, amount, memo)
        .await
        .map_err(|e| format!("Failed to transfer ckBTC: {}", e))
}

// ============================================================================
// Confirmation Tracking APIs
// ============================================================================

/// Get confirmations for a specific transaction
///
/// Returns the number of confirmations for a transaction that is being tracked.
/// The transaction must have been broadcasted using broadcast_and_track() or
/// manually added to tracking.
#[update]
async fn get_confirmations(txid: String) -> Result<u32, String> {
    let network = get_network()?;
    bitcoin_api::get_transaction_confirmations(&txid, network)
        .await
        .map_err(|e| format!("Failed to get confirmations: {}", e))
}

/// Get all tracked transactions (for debugging/monitoring)
#[query]
fn get_all_tracked_transactions() -> Vec<confirmation_tracker::ConfirmationEntry> {
    confirmation_tracker::get_all_tracked_transactions()
}

/// Get pending confirmations (transactions that haven't reached required confirmations)
#[query]
fn get_pending_confirmations() -> Vec<confirmation_tracker::ConfirmationEntry> {
    confirmation_tracker::get_pending_confirmations()
}

/// Get confirmed transactions (transactions that have reached required confirmations)
#[query]
fn get_confirmed_transactions() -> Vec<confirmation_tracker::ConfirmationEntry> {
    confirmation_tracker::get_confirmed_transactions()
}

/// Get tracked transaction count
#[query]
fn get_tracked_transaction_count() -> usize {
    confirmation_tracker::get_tracked_transaction_count()
}

/// Get tracking info for a specific transaction
#[query]
fn get_confirmation_entry(txid: String) -> Option<confirmation_tracker::ConfirmationEntry> {
    confirmation_tracker::get_confirmation_entry(&txid)
}

/// Manually untrack a transaction (admin function)
#[update]
fn untrack_transaction(txid: String) -> Result<(), String> {
    confirmation_tracker::untrack_transaction(&txid);
    Ok(())
}

// Helper functions

fn get_network() -> Result<BitcoinNetwork, String> {
    CONFIG.with(|config| {
        config
            .borrow()
            .as_ref()
            .map(|c| c.network)
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

fn convert_network(network: BitcoinNetwork) -> bitcoin::Network {
    match network {
        BitcoinNetwork::Mainnet => bitcoin::Network::Bitcoin,
        BitcoinNetwork::Testnet => bitcoin::Network::Testnet,
        BitcoinNetwork::Regtest => bitcoin::Network::Regtest,
    }
}

ic_cdk::export_candid!();
