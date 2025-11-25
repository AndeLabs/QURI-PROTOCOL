use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::DefaultMemoryImpl;
use std::cell::RefCell;

use quri_types::RuneEtching;

mod balances;
mod block_tracker;
mod config;
mod confirmation_tracker;
mod cycles_monitor;
mod dead_man_switch;
mod encrypted_metadata;
mod errors;
mod escrow;
mod etching_flow;
mod fee_manager;
mod idempotency;
mod ledger;
mod logging;
mod metrics;
mod process_id;
mod rbac;
mod settlement;
mod state;
mod trading;
mod trading_v2;
mod validators;

#[cfg(test)]
mod etching_flow_tests;

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

    // Initialize escrow storage (MemoryId 12)
    let escrow_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12)));
    escrow::init_escrow_storage(escrow_memory);

    // Initialize trading V2 storage (MemoryId 13-18)
    let trading_pools_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(13)));
    let trading_lp_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(14)));
    let trading_events_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(15)));
    let trading_user_balances_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(16)));
    let trading_icp_balances_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(17)));
    let trading_rune_to_pool_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(18)));
    trading_v2::init_trading_storage(
        trading_pools_memory,
        trading_lp_memory,
        trading_events_memory,
        trading_user_balances_memory,
        trading_icp_balances_memory,
        trading_rune_to_pool_memory,
    );

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

    // Reinitialize settlement history (MemoryId 11)
    let settlement_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11)));
    settlement::reinit_settlement_history(settlement_memory);

    // Reinitialize escrow storage (MemoryId 12)
    let escrow_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12)));
    escrow::reinit_escrow_storage(escrow_memory);

    // Reinitialize trading V2 storage (MemoryId 13-18)
    let trading_pools_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(13)));
    let trading_lp_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(14)));
    let trading_events_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(15)));
    let trading_user_balances_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(16)));
    let trading_icp_balances_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(17)));
    let trading_rune_to_pool_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(18)));
    trading_v2::reinit_trading_storage(
        trading_pools_memory,
        trading_lp_memory,
        trading_events_memory,
        trading_user_balances_memory,
        trading_icp_balances_memory,
        trading_rune_to_pool_memory,
    );

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

    // Credit the premine to the creator immediately
    // This allows the creator to transfer/sell runes so others can create pools
    let premine = etching.premine;
    if premine > 0 {
        if let Err(e) = trading_v2::credit_user_runes(caller, &rune_id, premine) {
            ic_cdk::println!("⚠️  Failed to credit premine to creator: {}", e);
            // Don't fail the rune creation, just log the error
        } else {
            ic_cdk::println!("💰 Credited {} premine to creator {}", premine, caller);
        }
    }

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

/// List ALL virtual runes (PUBLIC - anyone can see)
/// This enables discovery of Virtual Runes before they're settled to Bitcoin
///
/// @param offset - Starting position for pagination
/// @param limit - Maximum number of runes to return (max 100)
/// @returns List of virtual runes with creator info
#[query]
fn list_all_virtual_runes(offset: u64, limit: u64) -> Vec<PublicVirtualRuneView> {
    // Cap limit to prevent abuse
    let capped_limit = limit.min(100);

    state::get_all_virtual_runes(offset, capped_limit)
        .into_iter()
        .map(|r| PublicVirtualRuneView {
            id: r.id,
            rune_name: r.etching.rune_name,
            symbol: r.etching.symbol.clone(),
            divisibility: r.etching.divisibility,
            premine: r.etching.premine,
            terms: r.etching.terms.clone(),
            status: format!("{:?}", r.status),
            creator: r.caller,
            created_at: r.created_at,
            updated_at: r.updated_at,
        })
        .collect()
}

/// Get total count of ALL virtual runes (for pagination)
#[query]
fn get_all_virtual_runes_count() -> u64 {
    state::get_all_virtual_runes_count()
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
// Virtual Rune Trading APIs
// ============================================================================

/// Create a trading pool for a Virtual Rune
///
/// The creator must provide initial ICP liquidity and specify how many runes to add.
/// This sets the initial price: price = icp_amount / rune_amount
///
/// @param rune_id - The Virtual Rune ID
/// @param initial_icp - Initial ICP liquidity (in e8s, 1 ICP = 100_000_000 e8s)
/// @param initial_runes - Initial rune liquidity
#[update]
fn create_trading_pool(rune_id: String, initial_icp: u64, initial_runes: u64) -> Result<TradingPoolView, String> {
    let caller = ic_cdk::caller();

    // Get the virtual rune
    let rune = state::get_virtual_rune(&rune_id)
        .ok_or("Virtual Rune not found")?;

    // Verify caller is the creator
    if rune.caller != caller {
        return Err("Only the rune creator can create a trading pool".to_string());
    }

    // First, credit the premine to the creator (mint the runes)
    let premine = rune.etching.premine;
    balances::credit_balance(
        caller,
        &rune_id,
        premine,
        balances::BalanceChangeType::Mint,
        Some("Premine allocation".to_string()),
    )?;

    // Debit the runes that will go into the pool
    balances::debit_balance(
        caller,
        &rune_id,
        initial_runes,
        balances::BalanceChangeType::PoolDeposit,
        Some("Initial pool liquidity".to_string()),
    )?;

    // Create the pool
    let pool = trading::create_pool(&rune, initial_icp, initial_runes, caller)?;

    Ok(TradingPoolView::from(pool))
}

/// Get a quote for buying Virtual Runes with ICP
///
/// @param rune_id - The Virtual Rune ID
/// @param icp_amount - Amount of ICP to spend (in e8s)
/// @param slippage_bps - Slippage tolerance in basis points (100 = 1%)
#[query]
fn get_buy_quote(rune_id: String, icp_amount: u64, slippage_bps: u64) -> Result<TradeQuoteView, String> {
    let quote = trading::get_buy_quote(&rune_id, icp_amount, slippage_bps)?;
    Ok(TradeQuoteView::from(quote))
}

/// Get a quote for selling Virtual Runes for ICP
///
/// @param rune_id - The Virtual Rune ID
/// @param rune_amount - Amount of runes to sell
/// @param slippage_bps - Slippage tolerance in basis points (100 = 1%)
#[query]
fn get_sell_quote(rune_id: String, rune_amount: u64, slippage_bps: u64) -> Result<TradeQuoteView, String> {
    let quote = trading::get_sell_quote(&rune_id, rune_amount, slippage_bps)?;
    Ok(TradeQuoteView::from(quote))
}

/// Execute a buy trade - buy Virtual Runes with ICP
///
/// @param rune_id - The Virtual Rune ID
/// @param icp_amount - Amount of ICP to spend (in e8s)
/// @param min_runes_out - Minimum runes expected (slippage protection)
#[update]
fn buy_virtual_rune(rune_id: String, icp_amount: u64, min_runes_out: u64) -> Result<TradeRecordView, String> {
    let caller = ic_cdk::caller();

    // TODO: In production, integrate with ICP ledger to transfer tokens
    // For now, we just update the pool state

    let trade = trading::execute_buy(&rune_id, icp_amount, min_runes_out, caller)?;
    Ok(TradeRecordView::from(trade))
}

/// Execute a sell trade - sell Virtual Runes for ICP
///
/// @param rune_id - The Virtual Rune ID
/// @param rune_amount - Amount of runes to sell
/// @param min_icp_out - Minimum ICP expected (slippage protection)
#[update]
fn sell_virtual_rune(rune_id: String, rune_amount: u64, min_icp_out: u64) -> Result<TradeRecordView, String> {
    let caller = ic_cdk::caller();

    // TODO: In production, integrate with ICP ledger to transfer tokens
    // For now, we just update the pool state

    let trade = trading::execute_sell(&rune_id, rune_amount, min_icp_out, caller)?;
    Ok(TradeRecordView::from(trade))
}

/// Get the current price of a Virtual Rune in ICP
///
/// @param rune_id - The Virtual Rune ID
/// @returns Price in ICP e8s per rune
#[query]
fn get_rune_price(rune_id: String) -> Result<u64, String> {
    trading::get_price(&rune_id)
}

/// Get the market cap of a Virtual Rune
///
/// @param rune_id - The Virtual Rune ID
/// @returns Market cap in ICP e8s
#[query]
fn get_rune_market_cap(rune_id: String) -> Result<u128, String> {
    trading::get_market_cap(&rune_id)
}

/// Get a trading pool by rune ID
#[query]
fn get_trading_pool(rune_id: String) -> Option<TradingPoolView> {
    trading::get_pool(&rune_id).map(TradingPoolView::from)
}

/// List all trading pools
///
/// @param offset - Pagination offset
/// @param limit - Maximum results (max 50)
#[query]
fn list_trading_pools(offset: u64, limit: u64) -> Vec<TradingPoolView> {
    let capped_limit = limit.min(50);
    trading::list_pools(offset, capped_limit)
        .into_iter()
        .map(TradingPoolView::from)
        .collect()
}

/// Get total number of trading pools
#[query]
fn get_trading_pool_count() -> u64 {
    trading::get_pool_count()
}

/// Get trade history for a specific rune
///
/// @param rune_id - The Virtual Rune ID
/// @param limit - Maximum trades to return
#[query]
fn get_rune_trade_history(rune_id: String, limit: u64) -> Vec<TradeRecordView> {
    trading::get_trade_history(&rune_id, limit as usize)
        .into_iter()
        .map(TradeRecordView::from)
        .collect()
}

/// Get the caller's trade history
///
/// @param limit - Maximum trades to return
#[query]
fn get_my_trade_history(limit: u64) -> Vec<TradeRecordView> {
    let caller = ic_cdk::caller();
    trading::get_user_trades(caller, limit as usize)
        .into_iter()
        .map(TradeRecordView::from)
        .collect()
}

// ============================================================================
// ICP Balance & Deposit APIs
// ============================================================================

/// Get the caller's ICP trading balance (available for trading)
///
/// This is the ICP balance credited to the user for trading.
/// Users must deposit ICP before they can buy runes.
#[query]
fn get_my_icp_balance() -> u64 {
    let caller = ic_cdk::caller();
    trading::get_user_icp_balance(caller)
}

/// Get the caller's rune balance for a specific rune
///
/// @param rune_id - The Virtual Rune ID
#[query]
fn get_my_rune_balance(rune_id: String) -> RuneBalanceView {
    let caller = ic_cdk::caller();
    let balance = trading::get_user_rune_balance(caller, &rune_id);
    RuneBalanceView {
        available: balance.available,
        locked: balance.locked,
        total: balance.total(),
    }
}

/// Get all rune balances for the caller
#[query]
fn get_my_all_rune_balances() -> Vec<(String, RuneBalanceView)> {
    let caller = ic_cdk::caller();
    trading::get_user_all_rune_balances(caller)
        .into_iter()
        .map(|(rune_id, balance)| {
            (rune_id, RuneBalanceView {
                available: balance.available,
                locked: balance.locked,
                total: balance.total(),
            })
        })
        .collect()
}

// ============================================================================
// Admin Balance Query Functions (for debugging)
// ============================================================================

/// Get ICP balance for any user (admin query for debugging)
#[query]
fn get_user_icp_balance_admin(user: Principal) -> u64 {
    trading::get_user_icp_balance(user)
}

/// Get rune balance for any user (admin query for debugging)
#[query]
fn get_user_rune_balance_admin(user: Principal, rune_id: String) -> RuneBalanceView {
    let balance = trading::get_user_rune_balance(user, &rune_id);
    RuneBalanceView {
        available: balance.available,
        locked: balance.locked,
        total: balance.total(),
    }
}

/// Get all rune balances for any user (admin query for debugging)
#[query]
fn get_user_all_rune_balances_admin(user: Principal) -> Vec<(String, RuneBalanceView)> {
    trading::get_user_all_rune_balances(user)
        .into_iter()
        .map(|(rune_id, balance)| {
            (rune_id, RuneBalanceView {
                available: balance.available,
                locked: balance.locked,
                total: balance.total(),
            })
        })
        .collect()
}

/// Get the deposit address for ICP
///
/// Returns the account identifier where users should send ICP to deposit.
/// After sending ICP to this address, call `verify_deposit` to credit the balance.
#[query]
fn get_deposit_address() -> String {
    let caller = ic_cdk::caller();
    let account = ledger::get_user_deposit_account(caller);
    account.to_string()
}

/// Verify and credit a deposit
///
/// After sending ICP to the deposit address, call this function to:
/// 1. Verify the deposit in the user's subaccount
/// 2. Transfer it to the canister's main account
/// 3. Credit the trading balance
///
/// @returns The amount credited (after transfer fee)
#[update]
async fn verify_deposit() -> Result<u64, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot deposit".to_string());
    }

    ledger::verify_and_credit_deposit(caller).await
}

/// Withdraw ICP from trading balance to user's wallet
///
/// @param amount - Amount to withdraw (in e8s)
/// @returns Block index of the transfer
#[update]
async fn withdraw_icp(amount: u64) -> Result<u64, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot withdraw".to_string());
    }

    ledger::withdraw_icp(caller, amount).await
}

/// Get the canister's ICP balance
///
/// Admin-only endpoint to check total ICP held by the canister.
#[query]
async fn get_canister_icp_balance() -> Result<u64, String> {
    require_admin!()?;
    ledger::get_canister_balance().await
}

/// Get balance history for the caller
///
/// @param limit - Maximum records to return
#[query]
fn get_my_balance_history(limit: u64) -> Vec<BalanceChangeView> {
    let caller = ic_cdk::caller();
    balances::get_user_balance_history(caller, limit as usize)
        .into_iter()
        .map(BalanceChangeView::from)
        .collect()
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

/// Public view of a virtual rune (includes creator info for public listing)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct PublicVirtualRuneView {
    pub id: String,
    pub rune_name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub premine: u64,
    pub terms: Option<quri_types::MintTerms>,
    pub status: String,
    pub creator: Principal,
    pub created_at: u64,
    pub updated_at: u64,
}

// ============================================================================
// Trading View Types
// ============================================================================

/// View of a trading pool for Candid interface
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradingPoolView {
    pub rune_id: String,
    pub rune_name: String,
    pub symbol: String,
    pub icp_reserve: u64,
    pub rune_reserve: u64,
    pub total_supply: u64,
    pub price_per_rune: u64,
    pub market_cap: u128,
    pub creator: Principal,
    pub created_at: u64,
    pub last_trade_at: u64,
    pub total_volume_icp: u128,
    pub total_trades: u64,
    pub fees_collected: u64,
    pub is_active: bool,
}

impl From<trading::TradingPool> for TradingPoolView {
    fn from(pool: trading::TradingPool) -> Self {
        let price_per_rune = if pool.rune_reserve > 0 {
            pool.icp_reserve / pool.rune_reserve
        } else {
            0
        };
        let market_cap = (price_per_rune as u128) * (pool.total_supply as u128);

        TradingPoolView {
            rune_id: pool.rune_id,
            rune_name: pool.rune_name,
            symbol: pool.symbol,
            icp_reserve: pool.icp_reserve,
            rune_reserve: pool.rune_reserve,
            total_supply: pool.total_supply,
            price_per_rune,
            market_cap,
            creator: pool.creator,
            created_at: pool.created_at,
            last_trade_at: pool.last_trade_at,
            total_volume_icp: pool.total_volume_icp,
            total_trades: pool.total_trades,
            fees_collected: pool.fees_collected,
            is_active: pool.is_active,
        }
    }
}

/// View of a trade quote for Candid interface
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeQuoteView {
    pub rune_id: String,
    pub trade_type: String,
    pub input_amount: u64,
    pub output_amount: u64,
    pub price_per_rune: u64,
    pub fee: u64,
    pub price_impact_percent: f64,
    pub minimum_output: u64,
    pub pool_icp_reserve: u64,
    pub pool_rune_reserve: u64,
}

impl From<trading::TradeQuote> for TradeQuoteView {
    fn from(quote: trading::TradeQuote) -> Self {
        TradeQuoteView {
            rune_id: quote.rune_id,
            trade_type: match quote.trade_type {
                trading::TradeType::Buy => "Buy".to_string(),
                trading::TradeType::Sell => "Sell".to_string(),
            },
            input_amount: quote.input_amount,
            output_amount: quote.output_amount,
            price_per_rune: quote.price_per_rune,
            fee: quote.fee,
            price_impact_percent: quote.price_impact_percent,
            minimum_output: quote.minimum_output,
            pool_icp_reserve: quote.pool_icp_reserve,
            pool_rune_reserve: quote.pool_rune_reserve,
        }
    }
}

/// View of a trade record for Candid interface
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeRecordView {
    pub id: u64,
    pub rune_id: String,
    pub trader: Principal,
    pub trade_type: String,
    pub icp_amount: u64,
    pub rune_amount: u64,
    pub price_per_rune: u64,
    pub fee: u64,
    pub timestamp: u64,
}

impl From<trading::TradeRecord> for TradeRecordView {
    fn from(trade: trading::TradeRecord) -> Self {
        TradeRecordView {
            id: trade.id,
            rune_id: trade.rune_id,
            trader: trade.trader,
            trade_type: match trade.trade_type {
                trading::TradeType::Buy => "Buy".to_string(),
                trading::TradeType::Sell => "Sell".to_string(),
            },
            icp_amount: trade.icp_amount,
            rune_amount: trade.rune_amount,
            price_per_rune: trade.price_per_rune,
            fee: trade.fee,
            timestamp: trade.timestamp,
        }
    }
}

/// View of user's rune balance
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RuneBalanceView {
    pub available: u64,
    pub locked: u64,
    pub total: u64,
}

/// View of a balance change record
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BalanceChangeView {
    pub id: u64,
    pub rune_id: String,
    pub change_type: String,
    pub amount: u64,
    pub balance_before: u64,
    pub balance_after: u64,
    pub timestamp: u64,
    pub reference: Option<String>,
}

impl From<balances::BalanceChange> for BalanceChangeView {
    fn from(change: balances::BalanceChange) -> Self {
        BalanceChangeView {
            id: change.id,
            rune_id: change.rune_id,
            change_type: match change.change_type {
                balances::BalanceChangeType::Mint => "Mint".to_string(),
                balances::BalanceChangeType::Buy => "Buy".to_string(),
                balances::BalanceChangeType::Sell => "Sell".to_string(),
                balances::BalanceChangeType::TransferIn => "TransferIn".to_string(),
                balances::BalanceChangeType::TransferOut => "TransferOut".to_string(),
                balances::BalanceChangeType::Lock => "Lock".to_string(),
                balances::BalanceChangeType::Unlock => "Unlock".to_string(),
                balances::BalanceChangeType::PoolDeposit => "PoolDeposit".to_string(),
                balances::BalanceChangeType::PoolWithdraw => "PoolWithdraw".to_string(),
            },
            amount: change.amount,
            balance_before: change.balance_before,
            balance_after: change.balance_after,
            timestamp: change.timestamp,
            reference: change.reference,
        }
    }
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

// ============================================================================
// Escrow Management APIs
// ============================================================================

/// Get escrow entry for a specific process
#[query]
fn get_escrow_status(process_id: String) -> Option<escrow::EscrowEntry> {
    escrow::get_escrow_by_string(&process_id)
}

/// Get all escrow entries for the caller
#[query]
fn get_my_escrows() -> Vec<escrow::EscrowEntry> {
    let caller = ic_cdk::caller();
    escrow::get_user_escrows(caller)
}

/// Get escrow statistics (Admin only)
#[query]
fn get_escrow_stats() -> Result<escrow::EscrowStats, String> {
    require_admin!()?;
    Ok(escrow::get_escrow_stats())
}

/// Cleanup old escrow entries (Admin only)
#[update]
fn cleanup_old_escrows(age_days: u64) -> Result<u64, String> {
    require_admin!()?;

    let age_nanos = age_days * 24 * 60 * 60 * 1_000_000_000;
    let count = escrow::cleanup_old_escrows(age_nanos);

    ic_cdk::println!(
        "Cleaned up {} old escrow entries by {}",
        count,
        ic_cdk::caller()
    );

    Ok(count)
}

/// Manual refund for failed escrow (Admin only)
/// Use this when automatic refund fails and manual intervention is needed
#[update]
async fn admin_manual_refund(process_id: String) -> Result<u64, String> {
    require_admin!()?;

    // Get escrow entry
    let mut escrow_entry = escrow::get_escrow_by_string(&process_id)
        .ok_or_else(|| format!("Escrow entry not found for process: {}", process_id))?;

    // Check if refund is possible
    if !escrow_entry.can_refund() {
        return Err(format!(
            "Cannot refund escrow in status: {:?}",
            escrow_entry.status
        ));
    }

    // Get bitcoin-integration canister ID
    let btc_canister_id = crate::get_bitcoin_integration_id()?;

    // Perform refund
    let memo = format!("Manual refund for process: {}", process_id);
    let (transfer_result,): (Result<u64, String>,) = ic_cdk::call(
        btc_canister_id,
        "transfer_ckbtc",
        (escrow_entry.payer, escrow_entry.amount, Some(memo.into_bytes())),
    )
    .await
    .map_err(|(code, msg)| {
        format!("ckBTC transfer call failed: {:?} - {}", code, msg)
    })?;

    match transfer_result {
        Ok(block_index) => {
            // Mark escrow as refunded
            escrow_entry.mark_refunded(block_index);
            escrow::update_escrow(&escrow_entry)?;

            ic_cdk::println!(
                "Manual refund successful for process {}: {} sats refunded to {} (block: {})",
                process_id,
                escrow_entry.amount,
                escrow_entry.payer,
                block_index
            );

            Ok(block_index)
        }
        Err(e) => {
            // Mark refund as failed
            escrow_entry.mark_refund_failed(e.clone());
            escrow::update_escrow(&escrow_entry)?;
            Err(format!("Manual refund failed: {}", e))
        }
    }
}

// ============================================================================
// Trading V2 APIs - Persistent Storage with Bonding Curve & Graduation
// ============================================================================

/// Create a trading pool V2 with bonding curve
///
/// Creates a pool that starts with bonding curve pricing and graduates to AMM
/// after reaching the market cap threshold (~$69k equivalent in ICP).
///
/// DECENTRALIZED: Anyone can create a pool if they have the runes and ICP.
/// The premine is credited to the rune creator when the rune is created,
/// so they can sell/transfer runes to allow others to create pools.
///
/// @param rune_id - The Virtual Rune ID
/// @param initial_icp - Initial ICP liquidity (in e8s)
/// @param initial_runes - Initial rune liquidity (caller must own these)
#[update]
fn create_trading_pool_v2(
    rune_id: String,
    initial_icp: u64,
    initial_runes: u64,
) -> Result<TradingPoolV2View, String> {
    let caller = ic_cdk::caller();

    // Validate caller is not anonymous
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create pools".to_string());
    }

    // Get the virtual rune
    let rune = state::get_virtual_rune(&rune_id)
        .ok_or("Virtual Rune not found")?;

    // Check if pool already exists
    if trading_v2::get_pool_by_rune_id(&rune_id).is_some() {
        return Err("A trading pool already exists for this rune".to_string());
    }

    // Validate minimum liquidity
    if initial_icp < 100_000 {
        return Err("Minimum initial ICP is 0.001 (100,000 e8s)".to_string());
    }
    if initial_runes < 1 {
        return Err("Minimum initial runes is 1".to_string());
    }

    // Debit the runes from the caller (they must own these runes)
    // This will fail if the caller doesn't have enough runes
    trading_v2::debit_user_runes(caller, &rune_id, initial_runes)?;

    // Create the pool
    let pool = trading_v2::create_pool(
        &rune_id,
        &rune.etching.rune_name,
        &rune.etching.symbol,
        rune.etching.divisibility,
        rune.etching.premine, // Total supply for market cap calculation
        initial_icp,
        initial_runes,
        caller, // Pool creator (not necessarily the rune creator)
    )?;

    ic_cdk::println!(
        "✅ Trading pool created for {} by {} with {} ICP and {} runes",
        rune.etching.rune_name,
        caller,
        initial_icp,
        initial_runes
    );

    Ok(TradingPoolV2View::from(pool))
}

/// Get buy quote V2 with price impact and fees breakdown
#[query]
fn get_buy_quote_v2(
    rune_id: String,
    icp_amount: u64,
    slippage_bps: u64,
) -> Result<TradeQuoteV2View, String> {
    let quote = trading_v2::calculate_buy_quote(&rune_id, icp_amount, slippage_bps)?;
    Ok(TradeQuoteV2View::from(quote))
}

/// Get sell quote V2 with price impact and fees breakdown
#[query]
fn get_sell_quote_v2(
    rune_id: String,
    rune_amount: u64,
    slippage_bps: u64,
) -> Result<TradeQuoteV2View, String> {
    let quote = trading_v2::calculate_sell_quote(&rune_id, rune_amount, slippage_bps)?;
    Ok(TradeQuoteV2View::from(quote))
}

/// Execute buy trade V2
///
/// Buys virtual runes with ICP from the pool.
/// Supports bonding curve pricing until graduation.
#[update]
fn buy_virtual_rune_v2(
    rune_id: String,
    icp_amount: u64,
    min_runes_out: u64,
) -> Result<TradeEventView, String> {
    let caller = ic_cdk::caller();
    let event = trading_v2::execute_buy(&rune_id, icp_amount, min_runes_out, caller)?;
    Ok(TradeEventView::from(event))
}

/// Execute sell trade V2
///
/// Sells virtual runes for ICP from the pool.
#[update]
fn sell_virtual_rune_v2(
    rune_id: String,
    rune_amount: u64,
    min_icp_out: u64,
) -> Result<TradeEventView, String> {
    let caller = ic_cdk::caller();
    let event = trading_v2::execute_sell(&rune_id, rune_amount, min_icp_out, caller)?;
    Ok(TradeEventView::from(event))
}

/// Get trading pool V2 by rune ID
#[query]
fn get_trading_pool_v2(rune_id: String) -> Option<TradingPoolV2View> {
    trading_v2::get_pool_by_rune_id(&rune_id).map(TradingPoolV2View::from)
}

/// List all trading pools V2
#[query]
fn list_trading_pools_v2(offset: u64, limit: u64) -> Vec<TradingPoolV2View> {
    let capped_limit = limit.min(50);
    trading_v2::list_pools(offset, capped_limit)
        .into_iter()
        .map(TradingPoolV2View::from)
        .collect()
}

/// Get total pool count V2
#[query]
fn get_trading_pool_count_v2() -> u64 {
    trading_v2::get_pool_count()
}

/// Get current rune price V2
#[query]
fn get_rune_price_v2(rune_id: String) -> Result<u64, String> {
    let pool = trading_v2::get_pool_by_rune_id(&rune_id)
        .ok_or("Pool not found")?;
    Ok(trading_v2::get_pool_price(&pool))
}

/// Get rune market cap V2
#[query]
fn get_rune_market_cap_v2(rune_id: String) -> Result<u128, String> {
    let pool = trading_v2::get_pool_by_rune_id(&rune_id)
        .ok_or("Pool not found")?;
    Ok(trading_v2::get_pool_market_cap(&pool))
}

/// Get trade history for a rune V2
#[query]
fn get_rune_trade_history_v2(rune_id: String, limit: u64) -> Vec<TradeEventView> {
    trading_v2::get_trade_events(&rune_id, limit)
        .into_iter()
        .map(TradeEventView::from)
        .collect()
}

/// Get caller's trade history V2
#[query]
fn get_my_trade_history_v2(limit: u64) -> Vec<TradeEventView> {
    let caller = ic_cdk::caller();
    trading_v2::get_user_trade_events(caller, limit)
        .into_iter()
        .map(TradeEventView::from)
        .collect()
}

/// Get total trade event count
#[query]
fn get_trade_event_count() -> u64 {
    trading_v2::get_event_count()
}

// ============================================================================
// V2 Balance APIs
// ============================================================================

/// Get caller's ICP balance V2
#[query]
fn get_my_icp_balance_v2() -> ICPBalanceView {
    let caller = ic_cdk::caller();
    ICPBalanceView::from(trading_v2::get_user_icp_balance(caller))
}

/// Get caller's rune balance V2
#[query]
fn get_my_rune_balance_v2(rune_id: String) -> UserBalanceView {
    let caller = ic_cdk::caller();
    UserBalanceView::from(trading_v2::get_user_rune_balance(caller, &rune_id))
}

/// Credit ICP to caller's trading balance (for testing/admin)
/// In production, this should be called after verifying ICP deposit
#[update]
fn credit_icp_balance(amount: u64) -> Result<u64, String> {
    let caller = ic_cdk::caller();
    trading_v2::credit_user_icp(caller, amount)
}

// ============================================================================
// V2 Liquidity APIs
// ============================================================================

/// Add liquidity to a graduated AMM pool
///
/// Can only add liquidity to pools that have graduated from bonding curve.
#[update]
fn add_liquidity_v2(
    rune_id: String,
    icp_amount: u64,
    max_runes: u64,
) -> Result<AddLiquidityResultView, String> {
    let caller = ic_cdk::caller();
    let (icp_used, runes_used, lp_tokens) = trading_v2::add_liquidity(
        &rune_id,
        icp_amount,
        max_runes,
        caller,
    )?;
    Ok(AddLiquidityResultView {
        icp_deposited: icp_used,
        runes_deposited: runes_used,
        lp_tokens_minted: lp_tokens,
    })
}

/// Remove liquidity from a pool
#[update]
fn remove_liquidity_v2(
    rune_id: String,
    lp_amount: u64,
    min_icp: u64,
    min_runes: u64,
) -> Result<RemoveLiquidityResultView, String> {
    let caller = ic_cdk::caller();
    let (icp_out, runes_out) = trading_v2::remove_liquidity(
        &rune_id,
        lp_amount,
        min_icp,
        min_runes,
        caller,
    )?;
    Ok(RemoveLiquidityResultView {
        icp_withdrawn: icp_out,
        runes_withdrawn: runes_out,
        lp_tokens_burned: lp_amount,
    })
}

/// Get caller's LP position for a pool
#[query]
fn get_my_lp_position(rune_id: String) -> Option<LPPositionView> {
    let caller = ic_cdk::caller();
    let pool_id = trading_v2::PoolId::from_rune_id(&rune_id);
    trading_v2::get_lp_position(&pool_id, caller).map(LPPositionView::from)
}

/// Get all LP positions for caller
#[query]
fn get_my_lp_positions() -> Vec<(String, LPPositionView)> {
    let caller = ic_cdk::caller();
    trading_v2::get_user_lp_positions(caller)
        .into_iter()
        .map(|(pool_id, pos)| (pool_id.to_hex(), LPPositionView::from(pos)))
        .collect()
}

// ============================================================================
// Trading V2 View Types
// ============================================================================

/// View of a trading pool V2 for Candid interface
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradingPoolV2View {
    pub pool_id: String,
    pub rune_id: String,
    pub rune_name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub icp_reserve: u64,
    pub rune_reserve: u64,
    pub virtual_icp_reserve: u64,
    pub virtual_rune_reserve: u64,
    pub pool_type: String,
    pub graduation_status: String,
    pub total_supply: u64,
    pub k_constant: u128,
    pub total_lp_supply: u64,
    pub fees_collected_icp: u64,
    pub protocol_fees_pending: u64,
    pub total_volume_icp: u128,
    pub total_trades: u64,
    pub unique_traders: u64,
    pub price_per_rune: u64,
    pub market_cap: u128,
    pub creator: Principal,
    pub created_at: u64,
    pub last_trade_at: u64,
    pub is_active: bool,
}

impl From<trading_v2::TradingPool> for TradingPoolV2View {
    fn from(pool: trading_v2::TradingPool) -> Self {
        let price_per_rune = trading_v2::get_pool_price(&pool);
        let market_cap = trading_v2::get_pool_market_cap(&pool);

        let pool_type = match pool.pool_type {
            trading_v2::PoolType::Bonding => "Bonding".to_string(),
            trading_v2::PoolType::AMM => "AMM".to_string(),
        };

        let graduation_status = match &pool.graduation_status {
            trading_v2::GraduationStatus::Bonding => "Bonding".to_string(),
            trading_v2::GraduationStatus::Graduated { graduated_at, final_market_cap, .. } => {
                format!("Graduated at {} with market cap {}", graduated_at, final_market_cap)
            }
        };

        TradingPoolV2View {
            pool_id: pool.id.to_hex(),
            rune_id: pool.rune_id,
            rune_name: pool.rune_name,
            symbol: pool.symbol,
            divisibility: pool.divisibility,
            icp_reserve: pool.icp_reserve,
            rune_reserve: pool.rune_reserve,
            virtual_icp_reserve: pool.virtual_icp_reserve,
            virtual_rune_reserve: pool.virtual_rune_reserve,
            pool_type,
            graduation_status,
            total_supply: pool.total_supply,
            k_constant: pool.k_constant,
            total_lp_supply: pool.total_lp_supply,
            fees_collected_icp: pool.fees_collected_icp,
            protocol_fees_pending: pool.protocol_fees_pending,
            total_volume_icp: pool.total_volume_icp,
            total_trades: pool.total_trades,
            unique_traders: pool.unique_traders,
            price_per_rune,
            market_cap,
            creator: pool.creator,
            created_at: pool.created_at,
            last_trade_at: pool.last_trade_at,
            is_active: pool.is_active,
        }
    }
}

/// View of a trade quote V2
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeQuoteV2View {
    pub rune_id: String,
    pub trade_type: String,
    pub input_amount: u64,
    pub output_amount: u64,
    pub price_per_rune: u64,
    pub fee: u64,
    pub protocol_fee: u64,
    pub lp_fee: u64,
    pub price_impact_bps: u16,
    pub minimum_output: u64,
    pub pool_icp_reserve: u64,
    pub pool_rune_reserve: u64,
    pub effective_price: f64,
}

impl From<trading_v2::TradeQuote> for TradeQuoteV2View {
    fn from(quote: trading_v2::TradeQuote) -> Self {
        TradeQuoteV2View {
            rune_id: quote.rune_id,
            trade_type: match quote.trade_type {
                trading_v2::TradeType::Buy => "Buy".to_string(),
                trading_v2::TradeType::Sell => "Sell".to_string(),
            },
            input_amount: quote.input_amount,
            output_amount: quote.output_amount,
            price_per_rune: quote.price_per_rune,
            fee: quote.fee,
            protocol_fee: quote.protocol_fee,
            lp_fee: quote.lp_fee,
            price_impact_bps: quote.price_impact_bps,
            minimum_output: quote.minimum_output,
            pool_icp_reserve: quote.pool_icp_reserve,
            pool_rune_reserve: quote.pool_rune_reserve,
            effective_price: quote.effective_price,
        }
    }
}

/// View of a trade event
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeEventView {
    pub id: u64,
    pub pool_id: String,
    pub rune_id: String,
    pub trader: Principal,
    pub trade_type: String,
    pub icp_amount: u64,
    pub rune_amount: u64,
    pub price_per_rune: u64,
    pub fee: u64,
    pub price_impact_bps: u16,
    pub pool_icp_reserve_after: u64,
    pub pool_rune_reserve_after: u64,
    pub timestamp: u64,
}

impl From<trading_v2::TradeEvent> for TradeEventView {
    fn from(event: trading_v2::TradeEvent) -> Self {
        TradeEventView {
            id: event.id,
            pool_id: event.pool_id.to_hex(),
            rune_id: event.rune_id,
            trader: event.trader,
            trade_type: match event.trade_type {
                trading_v2::TradeType::Buy => "Buy".to_string(),
                trading_v2::TradeType::Sell => "Sell".to_string(),
            },
            icp_amount: event.icp_amount,
            rune_amount: event.rune_amount,
            price_per_rune: event.price_per_rune,
            fee: event.fee,
            price_impact_bps: event.price_impact_bps,
            pool_icp_reserve_after: event.pool_icp_reserve_after,
            pool_rune_reserve_after: event.pool_rune_reserve_after,
            timestamp: event.timestamp,
        }
    }
}

/// View of user's ICP balance
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ICPBalanceView {
    pub available: u64,
    pub locked: u64,
    pub total: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
}

impl From<trading_v2::ICPBalance> for ICPBalanceView {
    fn from(balance: trading_v2::ICPBalance) -> Self {
        ICPBalanceView {
            available: balance.available,
            locked: balance.locked,
            total: balance.total(),
            total_deposited: balance.total_deposited,
            total_withdrawn: balance.total_withdrawn,
        }
    }
}

/// View of user's rune balance
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UserBalanceView {
    pub available: u64,
    pub locked: u64,
    pub total: u64,
    pub total_bought: u64,
    pub total_sold: u64,
}

impl From<trading_v2::UserBalance> for UserBalanceView {
    fn from(balance: trading_v2::UserBalance) -> Self {
        UserBalanceView {
            available: balance.available,
            locked: balance.locked,
            total: balance.total(),
            total_bought: balance.total_bought,
            total_sold: balance.total_sold,
        }
    }
}

/// View of LP position
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct LPPositionView {
    pub lp_balance: u64,
    pub icp_deposited: u64,
    pub runes_deposited: u64,
    pub rewards_earned: u64,
    pub last_reward_claim: u64,
    pub created_at: u64,
    pub updated_at: u64,
}

impl From<trading_v2::LPPosition> for LPPositionView {
    fn from(position: trading_v2::LPPosition) -> Self {
        LPPositionView {
            lp_balance: position.lp_balance,
            icp_deposited: position.icp_deposited,
            runes_deposited: position.runes_deposited,
            rewards_earned: position.rewards_earned,
            last_reward_claim: position.last_reward_claim,
            created_at: position.created_at,
            updated_at: position.updated_at,
        }
    }
}

/// Result of adding liquidity
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AddLiquidityResultView {
    pub icp_deposited: u64,
    pub runes_deposited: u64,
    pub lp_tokens_minted: u64,
}

/// Result of removing liquidity
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RemoveLiquidityResultView {
    pub icp_withdrawn: u64,
    pub runes_withdrawn: u64,
    pub lp_tokens_burned: u64,
}

ic_cdk::export_candid!();
