// ============================================================================
// Cycles Monitoring & Management
// ============================================================================
//
// Sistema de monitoreo y gestión de cycles para prevenir que el canister
// se quede sin cycles y se detenga.
//
// ## Características
//
// ### Monitoreo Continuo
// - Timer periódico cada 1 hora
// - Chequeo de balance actual
// - Tracking de burn rate (cycles/segundo)
// - Alertas cuando se acerca a umbrales críticos
//
// ### Umbrales de Alerta
// - **CRITICAL**: < 1T cycles (~24h de operación)
// - **WARNING**: < 5T cycles (~5 días)
// - **LOW**: < 10T cycles (~10 días)
// - **HEALTHY**: > 10T cycles
//
// ### Métricas Históricas
// - Balance tracking con timestamps
// - Burn rate calculation
// - Tiempo estimado hasta agotamiento
//
// ### Integración con Logging
// - Logs automáticos en cada check
// - Alertas cuando se cruzan umbrales
// - Estadísticas de consumo
//
// ## Prevención de Downtime
//
// El monitoreo proactivo permite:
// 1. Detectar consumo anormal temprano
// 2. Alertar a los administradores
// 3. Planificar top-ups antes de emergencias
// 4. Tracking de costos operacionales
//
// ============================================================================

use candid::{CandidType, Deserialize};
use ic_cdk_timers::TimerId;
use std::cell::RefCell;
use std::time::Duration;

// ============================================================================
// Types
// ============================================================================

/// Cycles balance status
#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum CyclesStatus {
    Critical,  // < 1T
    Warning,   // < 5T
    Low,       // < 10T
    Healthy,   // >= 10T
}

impl std::fmt::Display for CyclesStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            CyclesStatus::Critical => write!(f, "CRITICAL"),
            CyclesStatus::Warning => write!(f, "WARNING"),
            CyclesStatus::Low => write!(f, "LOW"),
            CyclesStatus::Healthy => write!(f, "HEALTHY"),
        }
    }
}

/// Cycles balance snapshot
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct CyclesSnapshot {
    pub balance: u128,
    pub status: CyclesStatus,
    pub timestamp: u64,
}

/// Cycles statistics and metrics
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct CyclesMetrics {
    /// Current balance
    pub current_balance: u128,

    /// Current status
    pub status: CyclesStatus,

    /// Burn rate (cycles per second)
    /// Calculated from recent snapshots
    pub burn_rate_per_second: u128,

    /// Estimated time until depletion (seconds)
    /// None if burn rate is 0 or balance increasing
    pub time_until_depletion_seconds: Option<u64>,

    /// Last check timestamp
    pub last_check: u64,

    /// Number of snapshots taken
    pub total_snapshots: u64,
}

// ============================================================================
// State
// ============================================================================

thread_local! {
    /// Recent balance snapshots (last 24)
    /// Stored in memory (ephemeral), resets on upgrade
    static BALANCE_HISTORY: RefCell<Vec<CyclesSnapshot>> = RefCell::new(Vec::new());

    /// Monitor timer
    static MONITOR_TIMER: RefCell<Option<TimerId>> = const { RefCell::new(None) };

    /// Total snapshots taken (counter)
    static SNAPSHOT_COUNT: RefCell<u64> = const { RefCell::new(0) };
}

// Configuration
const CHECK_INTERVAL_SECONDS: u64 = 3600; // 1 hour
const MAX_HISTORY_SIZE: usize = 24; // Last 24 snapshots (24 hours if checking hourly)

// Thresholds (in cycles)
const THRESHOLD_CRITICAL: u128 = 1_000_000_000_000; // 1T
const THRESHOLD_WARNING: u128 = 5_000_000_000_000; // 5T
const THRESHOLD_LOW: u128 = 10_000_000_000_000; // 10T

// ============================================================================
// Initialization
// ============================================================================

/// Initialize cycles monitoring
pub fn init_cycles_monitor() {
    start_monitor_timer();

    // Take initial snapshot
    take_snapshot();

    ic_cdk::println!(
        "✅ Cycles monitor initialized (check interval: {}s)",
        CHECK_INTERVAL_SECONDS
    );
}

/// Start monitoring timer
fn start_monitor_timer() {
    MONITOR_TIMER.with(|timer| {
        let timer_id = ic_cdk_timers::set_timer_interval(
            Duration::from_secs(CHECK_INTERVAL_SECONDS),
            || {
                take_snapshot();
                check_and_alert();
            },
        );

        *timer.borrow_mut() = Some(timer_id);
    });
}

/// Stop monitoring timer
pub fn stop_cycles_monitor() {
    MONITOR_TIMER.with(|timer| {
        if let Some(timer_id) = timer.borrow_mut().take() {
            ic_cdk_timers::clear_timer(timer_id);
            ic_cdk::println!("Cycles monitor timer stopped");
        }
    });
}

// ============================================================================
// Monitoring Functions
// ============================================================================

/// Take a balance snapshot
fn take_snapshot() {
    let balance = ic_cdk::api::canister_balance128();
    let status = get_status_for_balance(balance);
    let timestamp = ic_cdk::api::time();

    let snapshot = CyclesSnapshot {
        balance,
        status: status.clone(),
        timestamp,
    };

    BALANCE_HISTORY.with(|history| {
        let mut h = history.borrow_mut();

        // Add new snapshot
        h.push(snapshot.clone());

        // Maintain max size (circular buffer)
        if h.len() > MAX_HISTORY_SIZE {
            h.remove(0);
        }
    });

    SNAPSHOT_COUNT.with(|count| {
        *count.borrow_mut() += 1;
    });

    ic_cdk::println!(
        "📊 Cycles snapshot: {} ({}) at {}",
        format_cycles(balance),
        status,
        timestamp
    );
}

/// Check balance and alert if necessary
fn check_and_alert() {
    let balance = ic_cdk::api::canister_balance128();
    let status = get_status_for_balance(balance);

    match status {
        CyclesStatus::Critical => {
            let msg = format!(
                "CRITICAL: Cycles balance is critically low: {}. Immediate top-up required!",
                format_cycles(balance)
            );
            crate::logging::log_error("cycles_monitor", msg.clone(), None);
            ic_cdk::println!("🚨 {}", msg);
        }
        CyclesStatus::Warning => {
            let msg = format!(
                "WARNING: Cycles balance is low: {}. Top-up recommended soon.",
                format_cycles(balance)
            );
            crate::logging::log_warn("cycles_monitor", msg.clone(), None);
            ic_cdk::println!("⚠️  {}", msg);
        }
        CyclesStatus::Low => {
            let msg = format!(
                "Low cycles balance: {}. Monitor and plan for top-up.",
                format_cycles(balance)
            );
            crate::logging::log_info("cycles_monitor", msg.clone(), None);
            ic_cdk::println!("ℹ️  {}", msg);
        }
        CyclesStatus::Healthy => {
            // No alert needed, balance is healthy
        }
    }
}

/// Determine status based on balance
fn get_status_for_balance(balance: u128) -> CyclesStatus {
    if balance < THRESHOLD_CRITICAL {
        CyclesStatus::Critical
    } else if balance < THRESHOLD_WARNING {
        CyclesStatus::Warning
    } else if balance < THRESHOLD_LOW {
        CyclesStatus::Low
    } else {
        CyclesStatus::Healthy
    }
}

// ============================================================================
// Metrics Calculation
// ============================================================================

/// Get current cycles metrics
pub fn get_cycles_metrics() -> CyclesMetrics {
    let balance = ic_cdk::api::canister_balance128();
    let status = get_status_for_balance(balance);

    // Calculate burn rate from history
    let (burn_rate, time_until_depletion) = calculate_burn_rate_and_eta();

    let snapshot_count = SNAPSHOT_COUNT.with(|count| *count.borrow());

    CyclesMetrics {
        current_balance: balance,
        status,
        burn_rate_per_second: burn_rate,
        time_until_depletion_seconds: time_until_depletion,
        last_check: ic_cdk::api::time(),
        total_snapshots: snapshot_count,
    }
}

/// Calculate burn rate from recent snapshots
fn calculate_burn_rate_and_eta() -> (u128, Option<u64>) {
    BALANCE_HISTORY.with(|history| {
        let h = history.borrow();

        if h.len() < 2 {
            return (0, None);
        }

        // Compare first and last snapshot
        let first = &h[0];
        let last = &h[h.len() - 1];

        // Calculate time difference in seconds
        let time_diff_ns = last.timestamp.saturating_sub(first.timestamp);
        let time_diff_seconds = time_diff_ns / 1_000_000_000;

        if time_diff_seconds == 0 {
            return (0, None);
        }

        // Calculate cycles burned
        if last.balance >= first.balance {
            // Balance increased or stayed same (got a top-up)
            return (0, None);
        }

        let cycles_burned = first.balance - last.balance;

        // Calculate burn rate (cycles per second)
        let burn_rate = cycles_burned / time_diff_seconds as u128;

        // Calculate ETA (time until depletion)
        let eta = if burn_rate > 0 {
            Some((last.balance / burn_rate) as u64)
        } else {
            None
        };

        (burn_rate, eta)
    })
}

/// Get balance history
pub fn get_balance_history() -> Vec<CyclesSnapshot> {
    BALANCE_HISTORY.with(|history| history.borrow().clone())
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Format cycles as human-readable string
fn format_cycles(cycles: u128) -> String {
    if cycles >= 1_000_000_000_000 {
        format!("{:.2}T", cycles as f64 / 1_000_000_000_000.0)
    } else if cycles >= 1_000_000_000 {
        format!("{:.2}B", cycles as f64 / 1_000_000_000.0)
    } else if cycles >= 1_000_000 {
        format!("{:.2}M", cycles as f64 / 1_000_000.0)
    } else if cycles >= 1_000 {
        format!("{:.2}K", cycles as f64 / 1_000.0)
    } else {
        format!("{}", cycles)
    }
}

/// Format duration in human-readable format
pub fn format_duration_seconds(seconds: u64) -> String {
    let days = seconds / 86400;
    let hours = (seconds % 86400) / 3600;
    let mins = (seconds % 3600) / 60;

    if days > 0 {
        format!("{}d {}h", days, hours)
    } else if hours > 0 {
        format!("{}h {}m", hours, mins)
    } else if mins > 0 {
        format!("{}m", mins)
    } else {
        format!("{}s", seconds)
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cycles_status_ordering() {
        assert!(CyclesStatus::Critical < CyclesStatus::Warning);
        assert!(CyclesStatus::Warning < CyclesStatus::Low);
        assert!(CyclesStatus::Low < CyclesStatus::Healthy);
    }

    #[test]
    fn test_get_status_for_balance() {
        assert_eq!(
            get_status_for_balance(500_000_000_000),
            CyclesStatus::Critical
        );
        assert_eq!(
            get_status_for_balance(3_000_000_000_000),
            CyclesStatus::Warning
        );
        assert_eq!(get_status_for_balance(7_000_000_000_000), CyclesStatus::Low);
        assert_eq!(
            get_status_for_balance(15_000_000_000_000),
            CyclesStatus::Healthy
        );
    }

    #[test]
    fn test_format_cycles() {
        assert_eq!(format_cycles(1_500_000_000_000), "1.50T");
        assert_eq!(format_cycles(500_000_000), "500.00M");
        assert_eq!(format_cycles(1_500_000_000), "1.50B");
        assert_eq!(format_cycles(1_500_000), "1.50M");
        assert_eq!(format_cycles(1_500), "1.50K");
    }

    #[test]
    fn test_format_duration() {
        assert_eq!(format_duration_seconds(90000), "1d 1h");
        assert_eq!(format_duration_seconds(7200), "2h 0m");
        assert_eq!(format_duration_seconds(120), "2m");
        assert_eq!(format_duration_seconds(45), "45s");
    }
}
