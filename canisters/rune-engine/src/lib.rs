use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use quri_types::{RuneConfig, RuneEtching, RuneId, RuneMetadata};

mod errors;
mod etching_flow;
mod state;
mod validators;

use errors::{EtchingError, EtchingResult};
use etching_flow::{EtchingConfig, EtchingOrchestrator};
use state::EtchingProcess;

type Memory = VirtualMemory<DefaultMemoryImpl>;
type RuneStorage = StableBTreeMap<RuneId, RuneMetadata, Memory>;

/// Canister configuration
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct CanisterConfig {
    pub bitcoin_integration_id: Principal,
    pub registry_id: Principal,
}

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static RUNES: RefCell<RuneStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static ETCHING_CONFIG: RefCell<Option<EtchingConfig>> = RefCell::new(None);

    static CANISTER_CONFIG: RefCell<Option<CanisterConfig>> = RefCell::new(None);
}

#[init]
fn init() {
    ic_cdk::println!("Rune Engine canister initialized");

    // Initialize state storage
    let state_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));
    state::init_state_storage(state_memory);

    // Set default config
    ETCHING_CONFIG.with(|c| {
        *c.borrow_mut() = Some(EtchingConfig::default());
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Upgrade completed");

    // Reinitialize state storage
    let state_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));
    state::init_state_storage(state_memory);
}

// ============================================================================
// Etching APIs
// ============================================================================

/// Create a new Rune (main entry point)
#[update]
async fn create_rune(etching: RuneEtching) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Validate caller
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create runes".to_string());
    }

    // Get config
    let config = ETCHING_CONFIG
        .with(|c| c.borrow().clone())
        .ok_or("Etching config not initialized")?;

    // Execute etching flow
    let orchestrator = EtchingOrchestrator::new(config);
    match orchestrator.execute_etching(caller, etching).await {
        Ok(process) => Ok(process.id),
        Err(e) => Err(e.user_message()),
    }
}

/// Get etching process status
#[query]
fn get_etching_status(process_id: String) -> Option<EtchingProcessView> {
    state::get_process(&process_id).map(|p| EtchingProcessView {
        id: p.id,
        rune_name: p.rune_name,
        state: format!("{:?}", p.state),
        created_at: p.created_at,
        updated_at: p.updated_at,
        retry_count: p.retry_count,
        txid: p.txid,
    })
}

/// Get all etching processes for caller
#[query]
fn get_my_etchings() -> Vec<EtchingProcessView> {
    let caller = ic_cdk::caller();
    state::get_caller_processes(caller)
        .into_iter()
        .map(|p| EtchingProcessView {
            id: p.id,
            rune_name: p.rune_name,
            state: format!("{:?}", p.state),
            created_at: p.created_at,
            updated_at: p.updated_at,
            retry_count: p.retry_count,
            txid: p.txid,
        })
        .collect()
}

/// Update etching configuration (admin only)
#[update]
fn update_etching_config(config: EtchingConfigView) -> Result<(), String> {
    // TODO: Add proper admin authorization
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Unauthorized".to_string());
    }

    let etching_config = EtchingConfig {
        network: config.network,
        fee_rate: config.fee_rate,
        required_confirmations: config.required_confirmations,
        enable_retries: config.enable_retries,
    };

    ETCHING_CONFIG.with(|c| {
        *c.borrow_mut() = Some(etching_config);
    });

    Ok(())
}

/// Configure canister IDs (admin only, usually called after deployment)
#[update]
fn configure_canisters(
    bitcoin_integration_id: Principal,
    registry_id: Principal,
) -> Result<(), String> {
    // TODO: Add proper admin authorization
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Unauthorized".to_string());
    }

    let config = CanisterConfig {
        bitcoin_integration_id,
        registry_id,
    };

    CANISTER_CONFIG.with(|c| {
        *c.borrow_mut() = Some(config);
    });

    ic_cdk::println!(
        "Configured canisters: BTC={}, Registry={}",
        bitcoin_integration_id,
        registry_id
    );

    Ok(())
}

// ============================================================================
// Helper functions (internal)
// ============================================================================

pub(crate) fn get_bitcoin_integration_id() -> Result<Principal, String> {
    CANISTER_CONFIG.with(|c| {
        c.borrow()
            .as_ref()
            .map(|config| config.bitcoin_integration_id)
            .ok_or("Canister configuration not set".to_string())
    })
}

pub(crate) fn get_registry_id() -> Result<Principal, String> {
    CANISTER_CONFIG.with(|c| {
        c.borrow()
            .as_ref()
            .map(|config| config.registry_id)
            .ok_or("Canister configuration not set".to_string())
    })
}

// ============================================================================
// Maintenance APIs
// ============================================================================

/// Cleanup old completed/failed processes
#[update]
fn cleanup_old_processes(age_days: u64) -> u64 {
    let age_nanos = age_days * 24 * 60 * 60 * 1_000_000_000;
    state::cleanup_old_processes(age_nanos)
}

// ============================================================================
// View Types (for Candid interface)
// ============================================================================

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EtchingProcessView {
    pub id: String,
    pub rune_name: String,
    pub state: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub retry_count: u32,
    pub txid: Option<String>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EtchingConfigView {
    pub network: quri_types::BitcoinNetwork,
    pub fee_rate: u64,
    pub required_confirmations: u32,
    pub enable_retries: bool,
}

ic_cdk::export_candid!();
