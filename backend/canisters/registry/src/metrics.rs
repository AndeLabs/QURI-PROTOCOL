/*!
 * Metrics Collection Module for Registry Canister
 *
 * Tracks query performance, error rates, and resource usage
 */

use candid::{CandidType, Deserialize};
use serde::Serialize;
use std::cell::RefCell;

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, Default)]
pub struct RegistryMetrics {
    // Query metrics
    pub total_queries: u64,
    pub list_runes_calls: u64,
    pub search_calls: u64,
    pub get_rune_calls: u64,

    // Performance metrics
    pub avg_query_time_ns: u64,
    pub slowest_query_time_ns: u64,
    pub fastest_query_time_ns: u64,

    // Error metrics
    pub total_errors: u64,
    pub rate_limit_hits: u64,
    pub validation_errors: u64,

    // Resource metrics
    pub cycles_balance: u64,
    pub memory_used_bytes: u64,

    // Data metrics
    pub total_runes: u64,
    pub total_volume_24h: u64,

    // Timestamp
    pub last_updated: u64,
}

thread_local! {
    static METRICS: RefCell<RegistryMetrics> = RefCell::new(RegistryMetrics::default());
}

/// Record a query call
pub fn record_query(method: &str, duration_ns: u64) {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_queries += 1;

        match method {
            "list_runes" => metrics.list_runes_calls += 1,
            "search_runes" => metrics.search_calls += 1,
            "get_rune" | "get_rune_by_name" => metrics.get_rune_calls += 1,
            _ => {}
        }

        // Update performance metrics
        if metrics.total_queries == 1 {
            metrics.avg_query_time_ns = duration_ns;
            metrics.slowest_query_time_ns = duration_ns;
            metrics.fastest_query_time_ns = duration_ns;
        } else {
            // Rolling average
            metrics.avg_query_time_ns =
                (metrics.avg_query_time_ns * (metrics.total_queries - 1) + duration_ns)
                    / metrics.total_queries;

            if duration_ns > metrics.slowest_query_time_ns {
                metrics.slowest_query_time_ns = duration_ns;
            }

            if duration_ns < metrics.fastest_query_time_ns {
                metrics.fastest_query_time_ns = duration_ns;
            }
        }

        metrics.last_updated = ic_cdk::api::time();
    });
}

/// Record an error
pub fn record_error(error_type: &str) {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_errors += 1;

        match error_type {
            "rate_limit" => metrics.rate_limit_hits += 1,
            "validation" => metrics.validation_errors += 1,
            _ => {}
        }

        metrics.last_updated = ic_cdk::api::time();
    });
}

/// Update data metrics
pub fn update_data_metrics(total_runes: u64, total_volume: u64) {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.total_runes = total_runes;
        metrics.total_volume_24h = total_volume;
        metrics.last_updated = ic_cdk::api::time();
    });
}

/// Update resource metrics
pub fn update_resource_metrics() {
    METRICS.with(|m| {
        let mut metrics = m.borrow_mut();
        metrics.cycles_balance = ic_cdk::api::canister_balance();
        metrics.last_updated = ic_cdk::api::time();
    });
}

/// Get current metrics
pub fn get_metrics() -> RegistryMetrics {
    update_resource_metrics();
    METRICS.with(|m| m.borrow().clone())
}

/// Reset all metrics (admin function)
pub fn reset_metrics() {
    METRICS.with(|m| {
        *m.borrow_mut() = RegistryMetrics::default();
    });
}

/// Helper macro to measure query execution time
#[macro_export]
macro_rules! measure_query {
    ($method:expr, $body:expr) => {{
        let start = ic_cdk::api::time();
        let result = $body;
        let duration = ic_cdk::api::time() - start;
        $crate::metrics::record_query($method, duration);
        result
    }};
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_record_query() {
        reset_metrics();

        record_query("list_runes", 1_000_000);
        let metrics = get_metrics();

        assert_eq!(metrics.total_queries, 1);
        assert_eq!(metrics.list_runes_calls, 1);
        assert_eq!(metrics.avg_query_time_ns, 1_000_000);
    }

    #[test]
    fn test_record_multiple_queries() {
        reset_metrics();

        record_query("list_runes", 1_000_000);
        record_query("list_runes", 2_000_000);
        record_query("search_runes", 500_000);

        let metrics = get_metrics();

        assert_eq!(metrics.total_queries, 3);
        assert_eq!(metrics.list_runes_calls, 2);
        assert_eq!(metrics.search_calls, 1);
        assert_eq!(metrics.slowest_query_time_ns, 2_000_000);
        assert_eq!(metrics.fastest_query_time_ns, 500_000);
    }

    #[test]
    fn test_record_error() {
        reset_metrics();

        record_error("rate_limit");
        record_error("validation");
        record_error("validation");

        let metrics = get_metrics();

        assert_eq!(metrics.total_errors, 3);
        assert_eq!(metrics.rate_limit_hits, 1);
        assert_eq!(metrics.validation_errors, 2);
    }
}
