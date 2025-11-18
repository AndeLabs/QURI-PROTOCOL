// ============================================================================
// Structured Logging System
// ============================================================================
//
// Sistema completo de logging estructurado para debugging y observabilidad
// en producción.
//
// ## Características
//
// ### Niveles de Severidad
// - **ERROR**: Errores críticos que afectan operaciones
// - **WARN**: Advertencias que no bloquean pero requieren atención
// - **INFO**: Eventos importantes del sistema
// - **DEBUG**: Información detallada para debugging
//
// ### Storage
// - Últimos 500 errores en memoria estable (circular buffer)
// - Persiste a través de upgrades
// - Incluye contexto completo: caller, timestamp, stack trace
//
// ### Integración
// - Macros convenientes: log_error!(), log_warn!(), log_info!(), log_debug!()
// - Automático en todos los puntos de error del sistema
// - Query endpoints para inspección
//
// ============================================================================

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable, storable::Bound};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ============================================================================
// Types
// ============================================================================

/// Log level severity
#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

impl std::fmt::Display for LogLevel {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LogLevel::Debug => write!(f, "DEBUG"),
            LogLevel::Info => write!(f, "INFO"),
            LogLevel::Warn => write!(f, "WARN"),
            LogLevel::Error => write!(f, "ERROR"),
        }
    }
}

/// Structured log entry
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct LogEntry {
    /// Unique log ID (timestamp + sequence)
    pub id: u64,

    /// Log level
    pub level: LogLevel,

    /// Log message
    pub message: String,

    /// Caller principal (if available)
    pub caller: Option<Principal>,

    /// Module/function where log originated
    pub module: String,

    /// Additional context (key-value pairs as JSON string)
    pub context: Option<String>,

    /// Timestamp (nanoseconds)
    pub timestamp: u64,
}

impl Storable for LogEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap_or_else(|e| {
            // Fallback: if encoding fails, trap with minimal info
            ic_cdk::trap(&format!("CRITICAL: Failed to encode LogEntry: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode LogEntry: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

/// Log statistics
#[derive(Clone, Debug, CandidType, Deserialize, Default)]
pub struct LogStats {
    pub total_errors: u64,
    pub total_warns: u64,
    pub total_infos: u64,
    pub total_debugs: u64,
    pub last_error_timestamp: Option<u64>,
}

// ============================================================================
// State
// ============================================================================

thread_local! {
    /// Log storage (circular buffer via BTreeMap)
    /// Key: log ID (timestamp + sequence)
    /// Value: LogEntry
    static LOG_STORAGE: RefCell<Option<StableBTreeMap<u64, LogEntry, Memory>>> =
        const { RefCell::new(None) };

    /// Log sequence counter (for generating unique IDs)
    static LOG_SEQUENCE: RefCell<u64> = const { RefCell::new(0) };

    /// Log statistics (ephemeral, resets on upgrade)
    static LOG_STATS: RefCell<LogStats> = RefCell::new(LogStats::default());
}

// Configuration
const MAX_LOG_ENTRIES: u64 = 500;

// ============================================================================
// Initialization
// ============================================================================

/// Initialize logging system
pub fn init_logging(memory: Memory) {
    LOG_STORAGE.with(|logs| {
        *logs.borrow_mut() = Some(StableBTreeMap::init(memory));
    });

    ic_cdk::println!("✅ Logging system initialized (max {} entries)", MAX_LOG_ENTRIES);
}

/// Reinitialize after upgrade
pub fn reinit_logging(memory: Memory) {
    LOG_STORAGE.with(|logs| {
        *logs.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

// ============================================================================
// Logging Functions
// ============================================================================

/// Log an entry
pub fn log(level: LogLevel, module: &str, message: String, context: Option<String>) {
    let caller = if ic_cdk::caller() != Principal::anonymous() {
        Some(ic_cdk::caller())
    } else {
        None
    };

    // Generate unique ID
    let id = LOG_SEQUENCE.with(|seq| {
        let mut s = seq.borrow_mut();
        *s += 1;
        ic_cdk::api::time() + *s
    });

    let entry = LogEntry {
        id,
        level: level.clone(),
        message: message.clone(),
        caller,
        module: module.to_string(),
        context,
        timestamp: ic_cdk::api::time(),
    };

    // Print to IC logs
    let caller_str = caller.map(|c| c.to_string()).unwrap_or_else(|| "system".to_string());
    ic_cdk::println!(
        "[{}] [{}] [{}] {}",
        level,
        module,
        caller_str,
        message
    );

    // Update stats
    LOG_STATS.with(|stats| {
        let mut s = stats.borrow_mut();
        match level {
            LogLevel::Error => {
                s.total_errors += 1;
                s.last_error_timestamp = Some(entry.timestamp);
            }
            LogLevel::Warn => s.total_warns += 1,
            LogLevel::Info => s.total_infos += 1,
            LogLevel::Debug => s.total_debugs += 1,
        }
    });

    // Store in stable memory
    LOG_STORAGE.with(|logs| {
        if let Some(storage) = logs.borrow_mut().as_mut() {
            // Insert new entry
            storage.insert(id, entry);

            // Enforce max size (circular buffer)
            if storage.len() > MAX_LOG_ENTRIES {
                // Remove oldest entry
                if let Some((oldest_id, _)) = storage.iter().next() {
                    storage.remove(&oldest_id);
                }
            }
        }
    });
}

/// Log error
pub fn log_error(module: &str, message: String, context: Option<String>) {
    log(LogLevel::Error, module, message, context);
}

/// Log warning
pub fn log_warn(module: &str, message: String, context: Option<String>) {
    log(LogLevel::Warn, module, message, context);
}

/// Log info
pub fn log_info(module: &str, message: String, context: Option<String>) {
    log(LogLevel::Info, module, message, context);
}

/// Log debug
pub fn log_debug(module: &str, message: String, context: Option<String>) {
    log(LogLevel::Debug, module, message, context);
}

// ============================================================================
// Query Functions
// ============================================================================

/// Get recent logs (limit to last N)
pub fn get_recent_logs(limit: u64, min_level: Option<LogLevel>) -> Vec<LogEntry> {
    LOG_STORAGE.with(|logs| {
        if let Some(storage) = logs.borrow().as_ref() {
            let mut entries: Vec<LogEntry> = storage
                .iter()
                .map(|(_, entry)| entry)
                .filter(|entry| {
                    if let Some(ref level) = min_level {
                        &entry.level >= level
                    } else {
                        true
                    }
                })
                .collect();

            // Sort by timestamp (newest first)
            entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

            // Limit results
            entries.into_iter().take(limit as usize).collect()
        } else {
            Vec::new()
        }
    })
}

/// Get errors only
pub fn get_recent_errors(limit: u64) -> Vec<LogEntry> {
    get_recent_logs(limit, Some(LogLevel::Error))
}

/// Get log statistics
pub fn get_log_stats() -> LogStats {
    LOG_STATS.with(|stats| stats.borrow().clone())
}

/// Get total log count
pub fn get_log_count() -> u64 {
    LOG_STORAGE.with(|logs| {
        if let Some(storage) = logs.borrow().as_ref() {
            storage.len()
        } else {
            0
        }
    })
}

/// Search logs by keyword
pub fn search_logs(keyword: &str, limit: u64) -> Vec<LogEntry> {
    let keyword_lower = keyword.to_lowercase();

    LOG_STORAGE.with(|logs| {
        if let Some(storage) = logs.borrow().as_ref() {
            let mut entries: Vec<LogEntry> = storage
                .iter()
                .map(|(_, entry)| entry)
                .filter(|entry| {
                    entry.message.to_lowercase().contains(&keyword_lower)
                        || entry.module.to_lowercase().contains(&keyword_lower)
                })
                .collect();

            // Sort by timestamp (newest first)
            entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

            // Limit results
            entries.into_iter().take(limit as usize).collect()
        } else {
            Vec::new()
        }
    })
}

// ============================================================================
// Macros
// ============================================================================

/// Log error with current module
#[macro_export]
macro_rules! log_error {
    ($msg:expr) => {
        $crate::logging::log_error(module_path!(), $msg.to_string(), None)
    };
    ($msg:expr, $ctx:expr) => {
        $crate::logging::log_error(module_path!(), $msg.to_string(), Some($ctx.to_string()))
    };
}

/// Log warning with current module
#[macro_export]
macro_rules! log_warn {
    ($msg:expr) => {
        $crate::logging::log_warn(module_path!(), $msg.to_string(), None)
    };
    ($msg:expr, $ctx:expr) => {
        $crate::logging::log_warn(module_path!(), $msg.to_string(), Some($ctx.to_string()))
    };
}

/// Log info with current module
#[macro_export]
macro_rules! log_info {
    ($msg:expr) => {
        $crate::logging::log_info(module_path!(), $msg.to_string(), None)
    };
    ($msg:expr, $ctx:expr) => {
        $crate::logging::log_info(module_path!(), $msg.to_string(), Some($ctx.to_string()))
    };
}

/// Log debug with current module
#[macro_export]
macro_rules! log_debug {
    ($msg:expr) => {
        $crate::logging::log_debug(module_path!(), $msg.to_string(), None)
    };
    ($msg:expr, $ctx:expr) => {
        $crate::logging::log_debug(module_path!(), $msg.to_string(), Some($ctx.to_string()))
    };
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_log_level_ordering() {
        assert!(LogLevel::Debug < LogLevel::Info);
        assert!(LogLevel::Info < LogLevel::Warn);
        assert!(LogLevel::Warn < LogLevel::Error);
    }

    #[test]
    fn test_log_entry_storable() {
        let entry = LogEntry {
            id: 12345,
            level: LogLevel::Error,
            message: "Test error".to_string(),
            caller: None,
            module: "test_module".to_string(),
            context: Some("{\"key\": \"value\"}".to_string()),
            timestamp: 1234567890,
        };

        let bytes = entry.to_bytes();
        let decoded = LogEntry::from_bytes(bytes);

        assert_eq!(entry.id, decoded.id);
        assert_eq!(entry.level, decoded.level);
        assert_eq!(entry.message, decoded.message);
    }
}
