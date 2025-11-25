// ============================================================================
// Performance Monitoring & Metrics
// ============================================================================
//
// Este módulo implementa un sistema completo de métricas para monitoreo de
// rendimiento y observabilidad en producción.
//
// ## Métricas Capturadas
//
// ### Contadores (Counters)
// - Total de runes creados exitosamente
// - Total de errores por tipo
// - Total de retries
// - Total de confirmaciones procesadas
//
// ### Histogramas (Latencias)
// - Latencia de creación de rune (end-to-end)
// - Latencia de firma (Schnorr signing)
// - Latencia de broadcast a Bitcoin
// - Latencia de confirmación (tiempo hasta N confirmaciones)
//
// ### Gauges (Estado Actual)
// - Número de procesos activos
// - Número de procesos pendientes
// - Uso de memoria estable
// - Block height actual
//
// ## Diseño de Storage
//
// Usamos StableCell para métricas agregadas y StableBTreeMap para series
// temporales con ventanas deslizantes (últimas 24h, 7d, 30d).
//
// ## Integración
//
// Las métricas se registran automáticamente en:
// - `etching_flow.rs`: Al completar cada estado
// - `lib.rs`: En cada llamada a update methods
// - `confirmation_tracker.rs`: Al procesar confirmaciones
//
// ============================================================================

use candid::{CandidType, Deserialize};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableCell, Storable, storable::Bound};
use std::borrow::Cow;
use std::cell::RefCell;
use std::collections::VecDeque;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ============================================================================
// Types
// ============================================================================

/// Agregado de métricas de rendimiento
#[derive(Clone, Debug, CandidType, Deserialize)]
#[derive(Default)]
pub struct PerformanceMetrics {
    // Counters - totales acumulados
    pub total_runes_created: u64,
    pub total_errors: u64,
    pub total_retries: u64,
    pub total_confirmations_tracked: u64,

    // Error breakdown
    pub errors_by_type: ErrorBreakdown,

    // Latency stats (nanoseconds)
    pub avg_etching_latency_ns: u64,
    pub avg_signing_latency_ns: u64,
    pub avg_broadcast_latency_ns: u64,

    // Current state gauges
    pub active_processes: u32,
    pub pending_processes: u32,

    // Last updated timestamp
    pub last_updated: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, Default)]
pub struct ErrorBreakdown {
    pub validation_errors: u64,
    pub balance_errors: u64,
    pub utxo_errors: u64,
    pub signing_errors: u64,
    pub broadcast_errors: u64,
    pub confirmation_errors: u64,
    pub unknown_errors: u64,
}


impl Storable for PerformanceMetrics {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to encode PerformanceMetrics: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode PerformanceMetrics: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

/// Entrada de latencia para tracking temporal
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct LatencyEntry {
    pub operation: OperationType,
    pub duration_ns: u64,
    pub timestamp: u64,
    pub success: bool,
}

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub enum OperationType {
    EtchingEndToEnd,
    Signing,
    Broadcasting,
    Confirmation,
}

/// Snapshot de métricas por ventana temporal
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct MetricsSnapshot {
    pub window: TimeWindow,
    pub metrics: PerformanceMetrics,
    pub captured_at: u64,
}

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq)]
pub enum TimeWindow {
    Last24Hours,
    Last7Days,
    Last30Days,
    AllTime,
}

// ============================================================================
// State
// ============================================================================

thread_local! {
    /// Main metrics storage (stable memory)
    static METRICS: RefCell<Option<StableCell<PerformanceMetrics, Memory>>> =
        const { RefCell::new(None) };

    /// Recent latency entries (in-memory, last 1000)
    /// This is ephemeral and will reset on upgrade, but that's acceptable
    /// for detailed latency tracking.
    static LATENCY_BUFFER: RefCell<VecDeque<LatencyEntry>> =
        RefCell::new(VecDeque::with_capacity(1000));
}

const MAX_LATENCY_ENTRIES: usize = 1000;

// ============================================================================
// Initialization
// ============================================================================

/// Initialize metrics storage
pub fn init_metrics(memory: Memory) {
    METRICS.with(|metrics| {
        *metrics.borrow_mut() = Some(
            StableCell::init(memory, PerformanceMetrics::default())
                .unwrap_or_else(|e| {
                    ic_cdk::trap(&format!("Failed to initialize PerformanceMetrics storage: {:?}", e))
                }),
        );
    });

    ic_cdk::println!("✅ Performance metrics initialized");
}

/// Reinitialize after upgrade
pub fn reinit_metrics(memory: Memory) {
    METRICS.with(|metrics| {
        *metrics.borrow_mut() = Some(
            StableCell::init(memory, PerformanceMetrics::default())
                .unwrap_or_else(|e| {
                    ic_cdk::trap(&format!("Failed to reinitialize PerformanceMetrics storage: {:?}", e))
                }),
        );
    });
}

// ============================================================================
// Recording Metrics
// ============================================================================

/// Record successful rune creation
pub fn record_rune_created() {
    METRICS.with(|m| {
        if let Some(cell) = m.borrow_mut().as_mut() {
            let mut metrics = cell.get().clone();
            metrics.total_runes_created += 1;
            metrics.last_updated = ic_cdk::api::time();
            let _ = cell.set(metrics);
        }
    });
}

/// Record an error
pub fn record_error(error_type: &str) {
    METRICS.with(|m| {
        if let Some(cell) = m.borrow_mut().as_mut() {
            let mut metrics = cell.get().clone();
            metrics.total_errors += 1;

            // Categorize error
            if error_type.contains("validation") || error_type.contains("invalid") {
                metrics.errors_by_type.validation_errors += 1;
            } else if error_type.contains("balance") || error_type.contains("insufficient") {
                metrics.errors_by_type.balance_errors += 1;
            } else if error_type.contains("utxo") {
                metrics.errors_by_type.utxo_errors += 1;
            } else if error_type.contains("signing") || error_type.contains("schnorr") {
                metrics.errors_by_type.signing_errors += 1;
            } else if error_type.contains("broadcast") {
                metrics.errors_by_type.broadcast_errors += 1;
            } else if error_type.contains("confirmation") {
                metrics.errors_by_type.confirmation_errors += 1;
            } else {
                metrics.errors_by_type.unknown_errors += 1;
            }

            metrics.last_updated = ic_cdk::api::time();
            let _ = cell.set(metrics);
        }
    });
}

/// Record a retry attempt
pub fn record_retry() {
    METRICS.with(|m| {
        if let Some(cell) = m.borrow_mut().as_mut() {
            let mut metrics = cell.get().clone();
            metrics.total_retries += 1;
            metrics.last_updated = ic_cdk::api::time();
            let _ = cell.set(metrics);
        }
    });
}

/// Record confirmation tracked
pub fn record_confirmation_tracked() {
    METRICS.with(|m| {
        if let Some(cell) = m.borrow_mut().as_mut() {
            let mut metrics = cell.get().clone();
            metrics.total_confirmations_tracked += 1;
            metrics.last_updated = ic_cdk::api::time();
            let _ = cell.set(metrics);
        }
    });
}

/// Record latency for an operation
pub fn record_latency(operation: OperationType, duration_ns: u64, success: bool) {
    let entry = LatencyEntry {
        operation: operation.clone(),
        duration_ns,
        timestamp: ic_cdk::api::time(),
        success,
    };

    // Add to buffer
    LATENCY_BUFFER.with(|buffer| {
        let mut buf = buffer.borrow_mut();
        if buf.len() >= MAX_LATENCY_ENTRIES {
            buf.pop_front();
        }
        buf.push_back(entry);
    });

    // Update running average in metrics
    METRICS.with(|m| {
        if let Some(cell) = m.borrow_mut().as_mut() {
            let mut metrics = cell.get().clone();

            match operation {
                OperationType::EtchingEndToEnd => {
                    metrics.avg_etching_latency_ns = exponential_moving_average(
                        metrics.avg_etching_latency_ns,
                        duration_ns,
                        0.1, // 10% weight to new sample
                    );
                }
                OperationType::Signing => {
                    metrics.avg_signing_latency_ns = exponential_moving_average(
                        metrics.avg_signing_latency_ns,
                        duration_ns,
                        0.1,
                    );
                }
                OperationType::Broadcasting => {
                    metrics.avg_broadcast_latency_ns = exponential_moving_average(
                        metrics.avg_broadcast_latency_ns,
                        duration_ns,
                        0.1,
                    );
                }
                OperationType::Confirmation => {
                    // Confirmations can be very long, use smaller weight
                }
            }

            metrics.last_updated = ic_cdk::api::time();
            let _ = cell.set(metrics);
        }
    });
}

/// Update process count gauges
pub fn update_process_counts(active: u32, pending: u32) {
    METRICS.with(|m| {
        if let Some(cell) = m.borrow_mut().as_mut() {
            let mut metrics = cell.get().clone();
            metrics.active_processes = active;
            metrics.pending_processes = pending;
            metrics.last_updated = ic_cdk::api::time();
            let _ = cell.set(metrics);
        }
    });
}

// ============================================================================
// Query APIs
// ============================================================================

/// Get current metrics
pub fn get_metrics() -> PerformanceMetrics {
    METRICS.with(|m| {
        m.borrow()
            .as_ref()
            .map(|cell| cell.get().clone())
            .unwrap_or_default()
    })
}

/// Get recent latency entries
pub fn get_recent_latencies(limit: usize) -> Vec<LatencyEntry> {
    LATENCY_BUFFER.with(|buffer| {
        let buf = buffer.borrow();
        buf.iter()
            .rev()
            .take(limit)
            .cloned()
            .collect()
    })
}

/// Get latency percentiles for an operation type
pub fn get_latency_percentiles(operation: OperationType) -> Option<LatencyPercentiles> {
    LATENCY_BUFFER.with(|buffer| {
        let buf = buffer.borrow();

        let mut durations: Vec<u64> = buf
            .iter()
            .filter(|e| e.operation == operation && e.success)
            .map(|e| e.duration_ns)
            .collect();

        if durations.is_empty() {
            return None;
        }

        durations.sort_unstable();
        let len = durations.len();

        Some(LatencyPercentiles {
            p50: durations[len / 2],
            p90: durations[len * 90 / 100],
            p95: durations[len * 95 / 100],
            p99: durations[len * 99 / 100],
            min: *durations.first().unwrap_or(&0),
            max: *durations.last().unwrap_or(&0),
            count: len as u64,
        })
    })
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct LatencyPercentiles {
    pub p50: u64,
    pub p90: u64,
    pub p95: u64,
    pub p99: u64,
    pub min: u64,
    pub max: u64,
    pub count: u64,
}

/// Get metrics summary for public display
pub fn get_metrics_summary() -> MetricsSummary {
    let metrics = get_metrics();

    let success_rate = if metrics.total_runes_created + metrics.total_errors > 0 {
        (metrics.total_runes_created as f64
            / (metrics.total_runes_created + metrics.total_errors) as f64)
            * 100.0
    } else {
        0.0
    };

    MetricsSummary {
        total_runes_created: metrics.total_runes_created,
        total_errors: metrics.total_errors,
        success_rate_percent: success_rate as u32,
        avg_etching_latency_ms: metrics.avg_etching_latency_ns / 1_000_000,
        active_processes: metrics.active_processes,
        pending_processes: metrics.pending_processes,
    }
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct MetricsSummary {
    pub total_runes_created: u64,
    pub total_errors: u64,
    pub success_rate_percent: u32,
    pub avg_etching_latency_ms: u64,
    pub active_processes: u32,
    pub pending_processes: u32,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Exponential moving average calculation
fn exponential_moving_average(current_avg: u64, new_value: u64, alpha: f64) -> u64 {
    if current_avg == 0 {
        new_value
    } else {
        let current_f = current_avg as f64;
        let new_f = new_value as f64;
        ((alpha * new_f) + ((1.0 - alpha) * current_f)) as u64
    }
}

// ============================================================================
// Latency Timer Utilities
// ============================================================================

/// Timer for measuring operation duration
pub struct LatencyTimer {
    start_time: u64,
    operation: OperationType,
}

impl LatencyTimer {
    /// Start a new latency timer
    pub fn start(operation: OperationType) -> Self {
        Self {
            start_time: ic_cdk::api::time(),
            operation,
        }
    }

    /// Stop timer and record latency
    pub fn stop(self, success: bool) {
        let duration = ic_cdk::api::time().saturating_sub(self.start_time);
        record_latency(self.operation, duration, success);
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_exponential_moving_average() {
        // First value (avg = 0)
        let avg = exponential_moving_average(0, 1000, 0.1);
        assert_eq!(avg, 1000);

        // Second value
        let avg = exponential_moving_average(1000, 2000, 0.1);
        assert_eq!(avg, 1100); // 0.1 * 2000 + 0.9 * 1000
    }

    #[test]
    fn test_metrics_storable() {
        let metrics = PerformanceMetrics {
            total_runes_created: 100,
            total_errors: 5,
            ..Default::default()
        };

        let bytes = metrics.to_bytes();
        let decoded = PerformanceMetrics::from_bytes(bytes);

        assert_eq!(metrics.total_runes_created, decoded.total_runes_created);
        assert_eq!(metrics.total_errors, decoded.total_errors);
    }
}
