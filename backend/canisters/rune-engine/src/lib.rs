use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use quri_types::{RuneEtching, RuneKey, RuneMetadata};

mod block_tracker;
mod config;
mod confirmation_tracker;
mod cycles_monitor;
mod dead_man_switch;
mod encrypted_metadata;
mod errors;
mod etching_flow;
mod fee_manager;
mod idempotency;
mod logging;
mod metrics;
mod process_id;
mod rbac;
mod settlement;
mod state;
mod validators;

use etching_flow::EtchingOrchestrator;
use rbac::Role;

type Memory = VirtualMemory<DefaultMemoryImpl>;
// NOTA: RuneStorage ya no se usa - RuneMetadata.key contiene el RuneKey
// Los runes se almacenan en el registry canister, no aquí

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // MEMORIA 0: Ya no se usa - reservada para futuras extensiones
    // Los runes se almacenan en el registry canister con RuneKey
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

    // Initialize block tracker (MemoryId 6)
    let block_tracker_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6)));
    block_tracker::init_block_tracker(block_tracker_memory);

    // Initialize metrics (MemoryId 7)
    let metrics_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(7)));
    metrics::init_metrics(metrics_memory);

    // Initialize logging (MemoryId 8)
    let logging_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(8)));
    logging::init_logging(logging_memory);

    // Initialize confirmation tracker storage (MemoryId 9)
    let confirmation_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(9)));
    confirmation_tracker::init_confirmation_storage(confirmation_memory);

    // Initialize virtual rune storage (MemoryId 10)
    let virtual_rune_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)));
    state::init_virtual_rune_storage(virtual_rune_memory);

    // Initialize settlement history (MemoryId 11)
    let settlement_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11)));
    settlement::init_settlement_history(settlement_memory);

    // Schedule timer initialization after init completes
    // Timers cannot be set during init/post_upgrade, so we use a one-shot timer
    ic_cdk_timers::set_timer(std::time::Duration::from_secs(1), || {
        confirmation_tracker::init_confirmation_tracker();
        fee_manager::init_fee_manager();
        cycles_monitor::init_cycles_monitor();

        // Initialize Dead Man's Switch timer - check every hour
        ic_cdk_timers::set_timer_interval(
            std::time::Duration::from_secs(3600), // 1 hour
            || {
                ic_cdk::spawn(async {
                    let triggered = dead_man_switch::process_expired_switches().await;
                    if !triggered.is_empty() {
                        ic_cdk::println!("Triggered {} Dead Man's Switches", triggered.len());
                    }
                });
            }
        );
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
    
    // Stop timers before upgrade
    confirmation_tracker::stop_confirmation_tracker();
    fee_manager::stop_fee_manager();
    block_tracker::stop_block_tracker();
    cycles_monitor::stop_cycles_monitor();
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

    // Reinitialize block tracker (MemoryId 6)
    let block_tracker_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(6)));
    block_tracker::reinit_block_tracker(block_tracker_memory);

    // Reinitialize metrics (MemoryId 7)
    let metrics_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(7)));
    metrics::reinit_metrics(metrics_memory);

    // Reinitialize logging (MemoryId 8)
    let logging_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(8)));
    logging::reinit_logging(logging_memory);

    // Reinitialize confirmation tracker storage (MemoryId 9)
    let confirmation_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(9)));
    confirmation_tracker::init_confirmation_storage(confirmation_memory);

    // Reinitialize virtual rune storage (MemoryId 10)
    let virtual_rune_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)));
    state::init_virtual_rune_storage(virtual_rune_memory);

    // Schedule timer initialization after post_upgrade completes
    // Timers cannot be set during init/post_upgrade, so we use a one-shot timer
    ic_cdk_timers::set_timer(std::time::Duration::from_secs(1), || {
        confirmation_tracker::init_confirmation_tracker();
        fee_manager::init_fee_manager();
        cycles_monitor::init_cycles_monitor();
    });
}

// ============================================================================
// Etching APIs
// ============================================================================

/// Create a new Virtual Rune (ICP-only, fast and cheap)
///
/// This creates a rune on ICP without touching Bitcoin.
/// Call `etch_to_bitcoin` later to etch it on the Bitcoin network.
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

    // Validate etching parameters
    validators::EtchingValidator::validate_etching(&etching)
        .map_err(|e| e.user_message())?;

    // Check if rune name already exists
    if state::rune_name_exists(&etching.rune_name) {
        return Err(format!("Rune name '{}' already exists", etching.rune_name));
    }

    // Generate unique ID for the virtual rune
    let rune_id = crate::process_id::ProcessId::new()
        .await
        .map_err(|e| format!("Failed to generate rune ID: {}", e))?
        .to_string();

    // Create virtual rune
    let virtual_rune = state::VirtualRune::new(
        rune_id.clone(),
        caller,
        etching.clone(),
    );

    // Store virtual rune
    state::store_virtual_rune(&virtual_rune)?;

    // Record successful request
    if let Err(e) = idempotency::record_request_success(request_id, caller, rune_id.clone()) {
        ic_cdk::println!("⚠️  Failed to record idempotency: {}", e);
    }

    // Record metrics
    metrics::record_rune_created();

    ic_cdk::println!(
        "✅ Virtual rune '{}' created with ID: {}",
        etching.rune_name,
        rune_id
    );

    Ok(rune_id)
}

/// Etch a virtual rune to the Bitcoin network
///
/// This initiates the Bitcoin etching process for an existing virtual rune.
/// Requires ckBTC for transaction fees.
#[update]
async fn etch_to_bitcoin(rune_id: String) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Validate caller
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot etch runes".to_string());
    }

    // Get the virtual rune
    let mut virtual_rune = state::get_virtual_rune(&rune_id)
        .ok_or_else(|| format!("Virtual rune not found: {}", rune_id))?;

    // Verify ownership
    if virtual_rune.caller != caller {
        return Err("You don't own this rune".to_string());
    }

    // Check if already etched or in progress
    match &virtual_rune.status {
        state::VirtualRuneStatus::Virtual => {
            // Good, can proceed
        }
        state::VirtualRuneStatus::Etching { process_id } => {
            return Err(format!("Already etching with process ID: {}", process_id));
        }
        state::VirtualRuneStatus::Etched { txid, .. } => {
            return Err(format!("Already etched with txid: {}", txid));
        }
        state::VirtualRuneStatus::EtchingFailed { reason } => {
            ic_cdk::println!("Previous etching failed: {}. Retrying...", reason);
        }
    }

    // Get config from stable storage
    let etching_config = config::get_etching_config();

    // Start latency timer
    let timer = metrics::LatencyTimer::start(metrics::OperationType::EtchingEndToEnd);

    // Execute etching flow
    let orchestrator = EtchingOrchestrator::new(etching_config);
    match orchestrator.execute_etching(caller, virtual_rune.etching.clone()).await {
        Ok(process) => {
            let process_id = process.id.to_string();

            // Update virtual rune status
            if let Some(txid) = &process.txid {
                virtual_rune.update_status(state::VirtualRuneStatus::Etched {
                    txid: txid.clone(),
                    block_height: 0, // TODO: Get actual block height
                });
            } else {
                virtual_rune.update_status(state::VirtualRuneStatus::Etching {
                    process_id: process_id.clone(),
                });
            }
            state::update_virtual_rune(&virtual_rune)?;

            timer.stop(true);

            ic_cdk::println!(
                "✅ Bitcoin etching started for '{}' with process ID: {}",
                virtual_rune.etching.rune_name,
                process_id
            );

            Ok(process_id)
        }
        Err(e) => {
            let error_msg = e.user_message();

            // Update virtual rune status
            virtual_rune.update_status(state::VirtualRuneStatus::EtchingFailed {
                reason: error_msg.clone(),
            });
            state::update_virtual_rune(&virtual_rune)?;

            // Record metrics
            metrics::record_error(&error_msg);
            timer.stop(false);

            // Log error
            logging::log_error("etch_to_bitcoin", format!("Etching failed: {}", error_msg), None);

            Err(error_msg)
        }
    }
}

/// Get etching process status
#[query]
fn get_etching_status(process_id: String) -> Option<EtchingProcessView> {
    state::get_process_by_string(&process_id).map(|p| EtchingProcessView {
        id: p.id.to_string(),
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
            id: p.id.to_string(),
            rune_name: p.rune_name,
            state: format!("{:?}", p.state),
            created_at: p.created_at,
            updated_at: p.updated_at,
            retry_count: p.retry_count,
            txid: p.txid,
        })
        .collect()
}

/// Get all virtual runes for caller
#[query]
fn get_my_virtual_runes() -> Vec<VirtualRuneView> {
    let caller = ic_cdk::caller();
    state::get_caller_virtual_runes(caller)
        .into_iter()
        .map(|r| VirtualRuneView {
            id: r.id,
            rune_name: r.etching.rune_name,
            symbol: r.etching.symbol.clone(),
            divisibility: r.etching.divisibility,
            premine: r.etching.premine,
            status: format!("{:?}", r.status),
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect()
}

/// Get a specific virtual rune by ID
#[query]
fn get_virtual_rune(rune_id: String) -> Option<VirtualRuneView> {
    state::get_virtual_rune(&rune_id).map(|r| VirtualRuneView {
        id: r.id,
        rune_name: r.etching.rune_name,
        symbol: r.etching.symbol.clone(),
        divisibility: r.etching.divisibility,
        premine: r.etching.premine,
        status: format!("{:?}", r.status),
        created_at: r.created_at,
        updated_at: r.updated_at,
    })
}

/// Get total count of virtual runes created
#[query]
fn get_virtual_rune_count() -> u64 {
    state::get_virtual_rune_count()
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

/// Auto-configure canisters for development/testing (PUBLIC, but only works once)
/// 
/// This function allows ANYONE to configure the canisters, but ONLY if they haven't
/// been configured yet. This is useful for Playground deployments where the owner
/// is the Playground system canister.
/// 
/// **Security**: Once configured, this function becomes a no-op. Only the first
/// caller can configure. After that, only Admin can reconfigure via `configure_canisters`.
#[update]
fn auto_configure_canisters(
    bitcoin_integration_id: Principal,
    registry_id: Principal,
) -> Result<(), String> {
    // Check if already configured
    if let Some(canister_config) = config::get_canister_config() {
        if canister_config.bitcoin_integration_id != Principal::anonymous() {
            return Err("Canisters already configured. Use configure_canisters (admin only) to reconfigure.".to_string());
        }
    }

    // Allow first-time configuration by anyone
    let canister_config = config::CanisterConfig {
        bitcoin_integration_id,
        registry_id,
    };

    config::set_canister_config(canister_config)?;

    ic_cdk::println!(
        "[AUTO-CONFIG] Canisters configured: BTC={}, Registry={} by {} (first-time setup)",
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

/// Get current Bitcoin block height (cached)
#[query]
fn get_bitcoin_block_height() -> Option<u64> {
    block_tracker::get_cached_block_height_info().map(|info| info.height)
}

/// Get detailed block height info (for debugging - Admin only)
#[query]
fn get_block_height_info() -> Result<Option<BlockHeightInfo>, String> {
    require_admin!()?;

    let info = block_tracker::get_cached_block_height_info().map(|cached| {
        let age_seconds = (ic_cdk::api::time() - cached.fetched_at) / 1_000_000_000;
        BlockHeightInfo {
            height: cached.height,
            network: cached.network,
            age_seconds,
        }
    });

    Ok(info)
}

#[derive(CandidType, Deserialize)]
pub struct BlockHeightInfo {
    pub height: u64,
    pub network: quri_types::BitcoinNetwork,
    pub age_seconds: u64,
}

/// Get performance metrics summary (public)
#[query]
fn get_metrics_summary() -> metrics::MetricsSummary {
    metrics::get_metrics_summary()
}

/// Get detailed performance metrics (Admin only)
#[query]
fn get_performance_metrics() -> Result<metrics::PerformanceMetrics, String> {
    require_admin!()?;
    Ok(metrics::get_metrics())
}

/// Get latency percentiles for an operation (Admin only)
#[query]
fn get_latency_percentiles(operation: String) -> Result<Option<metrics::LatencyPercentiles>, String> {
    require_admin!()?;

    let op_type = match operation.as_str() {
        "etching" => metrics::OperationType::EtchingEndToEnd,
        "signing" => metrics::OperationType::Signing,
        "broadcasting" => metrics::OperationType::Broadcasting,
        "confirmation" => metrics::OperationType::Confirmation,
        _ => return Err("Invalid operation type. Use: etching, signing, broadcasting, confirmation".to_string()),
    };

    Ok(metrics::get_latency_percentiles(op_type))
}

/// Get recent logs (Admin only)
#[query]
fn get_recent_logs(limit: u64) -> Result<Vec<logging::LogEntry>, String> {
    require_admin!()?;
    Ok(logging::get_recent_logs(limit, None))
}

/// Get recent errors only (Admin only)
#[query]
fn get_recent_errors(limit: u64) -> Result<Vec<logging::LogEntry>, String> {
    require_admin!()?;
    Ok(logging::get_recent_errors(limit))
}

/// Get log statistics
#[query]
fn get_log_stats() -> logging::LogStats {
    logging::get_log_stats()
}

/// Search logs by keyword (Admin only)
#[query]
fn search_logs(keyword: String, limit: u64) -> Result<Vec<logging::LogEntry>, String> {
    require_admin!()?;
    Ok(logging::search_logs(&keyword, limit))
}

/// Get cycles metrics
#[query]
fn get_cycles_metrics() -> cycles_monitor::CyclesMetrics {
    cycles_monitor::get_cycles_metrics()
}

/// Get cycles balance history (Admin only)
#[query]
fn get_cycles_history() -> Result<Vec<cycles_monitor::CyclesSnapshot>, String> {
    require_admin!()?;
    Ok(cycles_monitor::get_balance_history())
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
pub struct VirtualRuneView {
    pub id: String,
    pub rune_name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub premine: u64,
    pub status: String,
    pub created_at: u64,
    pub updated_at: u64,
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
// ADMIN: Storage Management
// ============================================================================

/// Reset the processes storage (Admin only)
/// WARNING: This will delete ALL etching process data!
/// Use this only to fix corrupted storage.
#[update]
fn admin_reset_processes_storage() -> Result<String, String> {
    require_admin!()?;

    // Get the memory for processes (MemoryId 1)
    let state_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));

    // Reset the storage
    state::reset_processes_storage(state_memory);

    ic_cdk::println!(
        "Processes storage reset by admin: {}",
        ic_cdk::caller()
    );

    Ok("Processes storage has been reset. All etching process data was cleared.".to_string())
}

/// Get process count without iterating (safe for corrupted storage)
#[query]
fn get_process_count() -> Result<u64, String> {
    state::get_process_count_safe()
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

// ============================================================================
// Dead Man's Switch Endpoints
// ============================================================================

/// Create a new Dead Man's Switch
#[update]
fn create_dead_man_switch(
    params: quri_types::CreateDeadManSwitchParams
) -> Result<u64, String> {
    dead_man_switch::create_switch(params)
        .map_err(|e| e.to_string())
}

/// Check in to reset the Dead Man's Switch timer
#[update]
fn dms_checkin(switch_id: u64) -> Result<(), String> {
    dead_man_switch::checkin(switch_id)
        .map_err(|e| e.to_string())
}

/// Cancel a Dead Man's Switch
#[update]
fn cancel_dead_man_switch(switch_id: u64) -> Result<(), String> {
    dead_man_switch::cancel_switch(switch_id)
        .map_err(|e| e.to_string())
}

/// Get information about a specific switch
#[query]
fn get_dead_man_switch(switch_id: u64) -> Option<quri_types::DeadManSwitchInfo> {
    dead_man_switch::get_switch_info(switch_id)
}

/// Get all switches for the caller
#[query]
fn get_my_dead_man_switches() -> Vec<quri_types::DeadManSwitchInfo> {
    dead_man_switch::get_my_switches()
}

/// Get Dead Man's Switch statistics
#[query]
fn get_dead_man_switch_stats() -> quri_types::DeadManSwitchStats {
    dead_man_switch::get_stats()
}

/// Manually trigger processing of expired switches (admin only)
#[update]
async fn process_dead_man_switches() -> Result<Vec<u64>, String> {
    // Check admin permissions
    let caller = ic_cdk::caller();
    if !rbac::is_admin(caller) {
        return Err("Unauthorized: admin permission required".to_string());
    }

    Ok(dead_man_switch::process_expired_switches().await)
}

/// Check if there are any expired switches
#[query]
fn has_expired_dead_man_switches() -> bool {
    dead_man_switch::has_expired_switches()
}

// ============================================================================
// Encrypted Metadata (vetKeys) Endpoints
// ============================================================================

/// Store encrypted metadata for a Rune
#[update]
fn store_encrypted_metadata(
    params: quri_types::StoreEncryptedMetadataParams
) -> Result<(), String> {
    encrypted_metadata::store_metadata(params)
        .map_err(|e| e.to_string())
}

/// Get encrypted metadata for a Rune
#[query]
fn get_encrypted_metadata(rune_id: String) -> Option<quri_types::EncryptedRuneMetadata> {
    encrypted_metadata::get_metadata(&rune_id)
}

/// Check if caller can decrypt metadata
#[query]
fn can_decrypt_metadata(rune_id: String) -> Result<bool, String> {
    encrypted_metadata::can_decrypt(&rune_id)
        .map_err(|e| e.to_string())
}

/// Get vetKD public key for encryption
#[update]
async fn get_vetkd_public_key() -> Result<Vec<u8>, String> {
    encrypted_metadata::get_public_key().await
        .map_err(|e| e.to_string())
}

/// Get encrypted decryption key (for authorized callers)
#[update]
async fn get_encrypted_decryption_key(
    rune_id: String,
    encryption_public_key: Vec<u8>
) -> Result<Vec<u8>, String> {
    encrypted_metadata::get_encrypted_decryption_key(rune_id, encryption_public_key).await
        .map_err(|e| e.to_string())
}

/// Get all encrypted metadata owned by caller
#[query]
fn get_my_encrypted_metadata() -> Vec<quri_types::EncryptedRuneMetadata> {
    encrypted_metadata::get_my_metadata()
}

/// Delete encrypted metadata (owner only)
#[update]
fn delete_encrypted_metadata(rune_id: String) -> Result<(), String> {
    encrypted_metadata::delete_metadata(&rune_id)
        .map_err(|e| e.to_string())
}

/// Check if encrypted metadata exists for a Rune
#[query]
fn has_encrypted_metadata(rune_id: String) -> bool {
    encrypted_metadata::has_metadata(&rune_id)
}

/// Get metadata reveal status
#[query]
fn get_metadata_reveal_status(rune_id: String) -> Option<(bool, Option<u64>)> {
    encrypted_metadata::get_reveal_status(&rune_id)
}

// ============================================================================
// Settlement History Methods
// ============================================================================

/// Get settlement history for the caller
#[query]
fn get_settlement_history(
    limit: Option<u64>,
    offset: Option<u64>,
) -> Vec<settlement::SettlementRecord> {
    let caller = ic_cdk::caller();
    settlement::get_user_settlement_history(caller, limit, offset)
}

/// Get settlement by ID
#[query]
fn get_settlement_status(id: String) -> Option<settlement::SettlementRecord> {
    settlement::get_settlement_by_id(id)
}

/// Get pending settlement count for caller
#[query]
fn get_pending_settlement_count() -> u64 {
    let caller = ic_cdk::caller();
    let history = settlement::get_user_settlement_history(caller, None, None);

    history
        .iter()
        .filter(|s| matches!(
            s.status,
            settlement::SettlementStatus::Queued
                | settlement::SettlementStatus::Batching
                | settlement::SettlementStatus::Signing
                | settlement::SettlementStatus::Broadcasting
                | settlement::SettlementStatus::Confirming
        ))
        .count() as u64
}

ic_cdk::export_candid!();
