use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use quri_types::{RuneEtching, RuneId, RuneMetadata};

mod config;
mod confirmation_tracker;
mod errors;
mod etching_flow;
mod fee_manager;
mod idempotency;
mod rbac;
mod state;
mod validators;

use etching_flow::EtchingOrchestrator;
use rbac::Role;

type Memory = VirtualMemory<DefaultMemoryImpl>;
type RuneStorage = StableBTreeMap<RuneId, RuneMetadata, Memory>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static RUNES: RefCell<RuneStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );
}

#[init]
fn init() {
    let caller = ic_cdk::caller();
    ic_cdk::println!("Rune Engine canister initialized by: {}", caller);

    // Initialize RBAC system - caller becomes owner (MemoryId 2)
    let rbac_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)));
    rbac::init_rbac(rbac_memory, caller);

    // Initialize state storage (MemoryId 1)
    let state_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));
    state::init_state_storage(state_memory);

    // Initialize idempotency storage (MemoryId 3)
    let idempotency_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3)));
    idempotency::init_idempotency_storage(idempotency_memory);

    // Initialize config storage (MemoryId 4, 5)
    let etching_config_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4)));
    let canister_config_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5)));
    config::init_config_storage(etching_config_memory, canister_config_memory);

    // Initialize Bitcoin confirmation tracker
    confirmation_tracker::init_confirmation_tracker();

    // Initialize dynamic fee manager
    fee_manager::init_fee_manager();
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
    
    // Stop timers before upgrade
    confirmation_tracker::stop_confirmation_tracker();
    fee_manager::stop_fee_manager();
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Upgrade completed");

    // Reinitialize RBAC storage (MemoryId 2)
    let rbac_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)));
    rbac::reinit_rbac_storage(rbac_memory);

    // Reinitialize state storage (MemoryId 1)
    let state_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));
    state::init_state_storage(state_memory);

    // Reinitialize idempotency storage (MemoryId 3)
    let idempotency_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3)));
    idempotency::reinit_idempotency_storage(idempotency_memory);

    // Reinitialize config storage (MemoryId 4, 5)
    let etching_config_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4)));
    let canister_config_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(5)));
    config::reinit_config_storage(etching_config_memory, canister_config_memory);

    // Restart timers
    confirmation_tracker::init_confirmation_tracker();
    fee_manager::init_fee_manager();
}

// ============================================================================
// Etching APIs
// ============================================================================

/// Create a new Rune (main entry point)
///
/// This function is idempotent - calling it multiple times with the same parameters
/// will return the same result without creating duplicate runes.
#[update]
async fn create_rune(etching: RuneEtching) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Validate caller
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create runes".to_string());
    }

    // Generate idempotency key
    let request_id = idempotency::generate_request_id(&caller, &etching);

    // Check if this request was already processed
    if let Some(existing) = idempotency::get_existing_request(&request_id) {
        ic_cdk::println!(
            "🔁 Idempotent request detected for {}: returning cached result",
            etching.rune_name
        );

        if existing.is_success {
            return Ok(existing.result);
        } else {
            return Err(existing.result);
        }
    }

    // Get config from stable storage
    let etching_config = config::get_etching_config();

    // Execute etching flow
    let orchestrator = EtchingOrchestrator::new(etching_config);
    match orchestrator.execute_etching(caller, etching).await {
        Ok(process) => {
            let process_id = process.id.clone();

            // Record successful request
            if let Err(e) = idempotency::record_request_success(request_id, caller, process_id.clone()) {
                ic_cdk::println!("⚠️  Failed to record idempotency: {}", e);
                // Don't fail the operation, just log it
            }

            Ok(process_id)
        }
        Err(e) => {
            let error_msg = e.user_message();

            // Record failed request
            if let Err(record_err) = idempotency::record_request_failure(request_id, caller, error_msg.clone()) {
                ic_cdk::println!("⚠️  Failed to record idempotency: {}", record_err);
            }

            Err(error_msg)
        }
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
fn update_etching_config(cfg: EtchingConfigView) -> Result<(), String> {
    // Require Admin role or higher
    require_admin!()?;

    let etching_config = config::EtchingConfig {
        network: cfg.network,
        fee_rate: cfg.fee_rate,
        required_confirmations: cfg.required_confirmations,
        enable_retries: cfg.enable_retries,
    };

    config::set_etching_config(etching_config)?;

    ic_cdk::println!("Etching config updated by: {}", ic_cdk::caller());

    Ok(())
}

/// Configure canister IDs (admin only, usually called after deployment)
#[update]
fn configure_canisters(
    bitcoin_integration_id: Principal,
    registry_id: Principal,
) -> Result<(), String> {
    // Require Admin role or higher
    require_admin!()?;

    let canister_config = config::CanisterConfig {
        bitcoin_integration_id,
        registry_id,
    };

    config::set_canister_config(canister_config)?;

    ic_cdk::println!(
        "Configured canisters: BTC={}, Registry={} by {}",
        bitcoin_integration_id,
        registry_id,
        ic_cdk::caller()
    );

    Ok(())
}

// ============================================================================
// Health Check & Status APIs
// ============================================================================

/// Check canister health and configuration status
#[query]
fn health_check() -> HealthStatus {
    let configs_ok = config::configs_healthy();
    let canister_config = config::get_canister_config();

    let (bitcoin_integration_configured, registry_configured) = match canister_config {
        Some(cfg) => (
            cfg.bitcoin_integration_id != Principal::anonymous(),
            cfg.registry_id != Principal::anonymous(),
        ),
        None => (false, false),
    };

    HealthStatus {
        healthy: configs_ok && bitcoin_integration_configured && registry_configured,
        etching_config_initialized: configs_ok,
        bitcoin_integration_configured,
        registry_configured,
        canister_id: ic_cdk::id(),
    }
}

// ============================================================================
// Helper functions (internal)
// ============================================================================

pub(crate) fn get_bitcoin_integration_id() -> Result<Principal, String> {
    config::get_bitcoin_integration_id()
}

pub(crate) fn get_registry_id() -> Result<Principal, String> {
    config::get_registry_id()
}

// ============================================================================
// RBAC Management APIs
// ============================================================================

/// Grant a role to a principal (Owner/Admin only)
#[update]
fn grant_role(target: Principal, role: Role) -> Result<(), String> {
    let caller = ic_cdk::caller();
    rbac::grant_role(caller, target, role)
}

/// Revoke a role from a principal (Admin only)
#[update]
fn revoke_role(target: Principal) -> Result<(), String> {
    let caller = ic_cdk::caller();
    rbac::revoke_role(caller, target)
}

/// Get caller's role
#[query]
fn get_my_role() -> Role {
    rbac::get_role(ic_cdk::caller())
}

/// Get a specific principal's role (Admin only)
#[query]
fn get_user_role(principal: Principal) -> Result<Role, String> {
    require_admin!()?;
    Ok(rbac::get_role(principal))
}

/// List all roles (Admin only)
#[query]
fn list_roles() -> Result<Vec<RoleAssignment>, String> {
    let caller = ic_cdk::caller();
    rbac::list_all_roles(caller).map(|roles| {
        roles
            .into_iter()
            .map(|(principal, entry)| RoleAssignment {
                principal,
                role: entry.role,
                granted_at: entry.granted_at,
                granted_by: entry.granted_by,
            })
            .collect()
    })
}

/// Get the canister owner
#[query]
fn get_owner() -> Option<Principal> {
    rbac::get_owner()
}

// ============================================================================
// Bitcoin Confirmation Tracking APIs
// ============================================================================

/// Get all pending transactions being tracked for confirmations (Admin only)
#[query]
fn get_pending_confirmations() -> Result<Vec<confirmation_tracker::PendingTransaction>, String> {
    require_admin!()?;
    Ok(confirmation_tracker::get_pending_transactions())
}

/// Get confirmation tracking status for a specific transaction
#[query]
fn get_confirmation_status(txid: String) -> Option<confirmation_tracker::PendingTransaction> {
    // Users can check their own transactions
    confirmation_tracker::get_transaction_tracking(&txid)
}

/// Get count of pending confirmation checks (useful for monitoring)
#[query]
fn pending_confirmation_count() -> usize {
    confirmation_tracker::pending_transaction_count()
}

// ============================================================================
// Dynamic Fee Management APIs
// ============================================================================

/// Get current fee estimates from Bitcoin network
///
/// Returns cached fee estimates (updated every 10 minutes) or None if not yet fetched.
/// Useful for users to see current network conditions before creating a Rune.
#[query]
fn get_current_fee_estimates() -> Option<fee_manager::FeeEstimatesView> {
    fee_manager::get_cached_fee_estimates()
}

/// Get recommended fee rate for a specific priority
///
/// This is an update call because it may trigger a background fee update.
/// Returns fee rate in sat/vbyte.
#[update]
async fn get_recommended_fee(priority: fee_manager::FeePriority) -> u64 {
    fee_manager::get_recommended_fee_rate(priority).await
}

// ============================================================================
// Maintenance APIs
// ============================================================================

/// Cleanup old completed/failed processes (Admin only)
#[update]
fn cleanup_old_processes(age_days: u64) -> Result<u64, String> {
    // Require Admin role or higher
    require_admin!()?;

    let age_nanos = age_days * 24 * 60 * 60 * 1_000_000_000;
    let count = state::cleanup_old_processes(age_nanos);
    
    ic_cdk::println!(
        "Cleaned up {} old processes by {}",
        count,
        ic_cdk::caller()
    );
    
    Ok(count)
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

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct HealthStatus {
    pub healthy: bool,
    pub etching_config_initialized: bool,
    pub bitcoin_integration_configured: bool,
    pub registry_configured: bool,
    pub canister_id: Principal,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RoleAssignment {
    pub principal: Principal,
    pub role: Role,
    pub granted_at: u64,
    pub granted_by: Principal,
}

// ============================================================================
// Idempotency Management APIs
// ============================================================================

/// Get idempotency request count (Admin only)
#[query]
fn get_idempotency_request_count() -> Result<u64, String> {
    require_admin!()?;
    Ok(idempotency::get_request_count())
}

/// Cleanup expired idempotency requests (Admin only)
/// Returns number of requests removed
#[update]
fn cleanup_expired_idempotency() -> Result<u64, String> {
    require_admin!()?;
    Ok(idempotency::cleanup_expired_requests())
}

// ============================================================================
// HTTP Transform Function (for HTTPS Outcalls)
// ============================================================================

/// Transform function for HTTPS outcalls
/// Strips unnecessary headers and processes response before consensus
#[query]
fn transform_http_response(
    args: ic_cdk::api::management_canister::http_request::TransformArgs,
) -> ic_cdk::api::management_canister::http_request::HttpResponse {
    ic_cdk::api::management_canister::http_request::HttpResponse {
        status: args.response.status,
        headers: vec![], // Strip all headers to reduce data size and cost
        body: args.response.body,
    }
}

ic_cdk::export_candid!();
