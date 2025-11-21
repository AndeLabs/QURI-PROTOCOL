use candid::{CandidType, Deserialize};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use crate::process_id::ProcessId;
use quri_types::RuneEtching;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ============================================================================
// Virtual Rune (ICP-only, fast and cheap)
// ============================================================================

/// Status of a virtual rune
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum VirtualRuneStatus {
    /// Created on ICP, not yet etched to Bitcoin
    Virtual,
    /// Currently being etched to Bitcoin
    Etching { process_id: String },
    /// Successfully etched on Bitcoin
    Etched { txid: String, block_height: u64 },
    /// Etching failed (can retry)
    EtchingFailed { reason: String },
}

/// A virtual rune stored on ICP
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VirtualRune {
    pub id: String,
    pub caller: candid::Principal,
    pub etching: RuneEtching,
    pub status: VirtualRuneStatus,
    pub created_at: u64,
    pub updated_at: u64,
}

impl VirtualRune {
    pub fn new(id: String, caller: candid::Principal, etching: RuneEtching) -> Self {
        let now = ic_cdk::api::time();
        Self {
            id,
            caller,
            etching,
            status: VirtualRuneStatus::Virtual,
            created_at: now,
            updated_at: now,
        }
    }

    pub fn update_status(&mut self, new_status: VirtualRuneStatus) {
        self.status = new_status;
        self.updated_at = ic_cdk::api::time();
    }

    pub fn is_virtual(&self) -> bool {
        matches!(self.status, VirtualRuneStatus::Virtual)
    }

    pub fn is_etched(&self) -> bool {
        matches!(self.status, VirtualRuneStatus::Etched { .. })
    }
}

// ============================================================================
// Etching Process (Bitcoin etching flow)
// ============================================================================

/// State of an etching process
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum EtchingState {
    /// Initial validation
    Validating,
    /// Checking ckBTC balance
    CheckingBalance,
    /// Selecting UTXOs
    SelectingUtxos,
    /// Building transaction
    BuildingTransaction,
    /// Signing with Schnorr
    Signing,
    /// Broadcasting to Bitcoin network
    Broadcasting,
    /// Waiting for confirmations
    Confirming { confirmations: u32 },
    /// Indexing the new Rune
    Indexing,
    /// Successfully completed
    Completed { txid: String, block_height: u64 },
    /// Failed with error
    Failed { reason: String, at_state: String },
    /// Rolled back due to failure
    RolledBack { reason: String },
}

impl EtchingState {
    /// Check if state is terminal (no more transitions)
    pub fn is_terminal(&self) -> bool {
        matches!(
            self,
            EtchingState::Completed { .. }
                | EtchingState::Failed { .. }
                | EtchingState::RolledBack { .. }
        )
    }

    /// Check if state is successful
    pub fn is_successful(&self) -> bool {
        matches!(self, EtchingState::Completed { .. })
    }

    /// Check if state indicates failure
    pub fn is_failed(&self) -> bool {
        matches!(
            self,
            EtchingState::Failed { .. } | EtchingState::RolledBack { .. }
        )
    }

    /// Get state name for logging
    pub fn name(&self) -> &str {
        match self {
            EtchingState::Validating => "Validating",
            EtchingState::CheckingBalance => "CheckingBalance",
            EtchingState::SelectingUtxos => "SelectingUtxos",
            EtchingState::BuildingTransaction => "BuildingTransaction",
            EtchingState::Signing => "Signing",
            EtchingState::Broadcasting => "Broadcasting",
            EtchingState::Confirming { .. } => "Confirming",
            EtchingState::Indexing => "Indexing",
            EtchingState::Completed { .. } => "Completed",
            EtchingState::Failed { .. } => "Failed",
            EtchingState::RolledBack { .. } => "RolledBack",
        }
    }
}

/// Complete etching process record
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EtchingProcess {
    pub id: ProcessId,
    pub caller: candid::Principal,
    pub rune_name: String,
    pub state: EtchingState,
    pub created_at: u64,
    pub updated_at: u64,
    pub retry_count: u32,
    pub fee_paid: Option<u64>,
    pub txid: Option<String>,
}

impl EtchingProcess {
    pub fn new(id: ProcessId, caller: candid::Principal, rune_name: String) -> Self {
        let now = ic_cdk::api::time();
        Self {
            id,
            caller,
            rune_name,
            state: EtchingState::Validating,
            created_at: now,
            updated_at: now,
            retry_count: 0,
            fee_paid: None,
            txid: None,
        }
    }

    /// Create new process with specific timestamp (for testing)
    #[cfg(test)]
    pub fn new_for_test(
        id: ProcessId,
        caller: candid::Principal,
        rune_name: String,
        timestamp: u64,
    ) -> Self {
        Self {
            id,
            caller,
            rune_name,
            state: EtchingState::Validating,
            created_at: timestamp,
            updated_at: timestamp,
            retry_count: 0,
            fee_paid: None,
            txid: None,
        }
    }

    /// Update state and timestamp
    pub fn update_state(&mut self, new_state: EtchingState) {
        self.state = new_state;
        self.updated_at = ic_cdk::api::time();
    }

    /// Update state with specific timestamp (for testing)
    #[cfg(test)]
    pub fn update_state_for_test(&mut self, new_state: EtchingState, timestamp: u64) {
        self.state = new_state;
        self.updated_at = timestamp;
    }

    /// Increment retry counter
    pub fn increment_retry(&mut self) {
        self.retry_count += 1;
        self.updated_at = ic_cdk::api::time();
    }

    /// Increment retry counter with specific timestamp (for testing)
    #[cfg(test)]
    pub fn increment_retry_for_test(&mut self, timestamp: u64) {
        self.retry_count += 1;
        self.updated_at = timestamp;
    }

    /// Check if process has exceeded retry limit
    pub fn has_exceeded_retries(&self, max_retries: u32) -> bool {
        self.retry_count >= max_retries
    }
}

/// Global state manager - NOW USES ProcessId as bounded key
type ProcessStorage = RefCell<Option<StableBTreeMap<ProcessId, Vec<u8>, Memory>>>;

/// Virtual rune storage - uses string ID as key
type VirtualRuneStorage = RefCell<Option<StableBTreeMap<ProcessId, Vec<u8>, Memory>>>;

thread_local! {
    #[allow(unused_doc_comments)]
    /// Global state manager for etching processes
    static PROCESSES: ProcessStorage = const { RefCell::new(None) };

    /// Storage for virtual runes (ICP-only)
    static VIRTUAL_RUNES: VirtualRuneStorage = const { RefCell::new(None) };
}

/// Initialize state storage
pub fn init_state_storage(memory: Memory) {
    PROCESSES.with(|p| {
        *p.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Reset processes storage (clears all data)
/// WARNING: This will delete all etching processes!
pub fn reset_processes_storage(memory: Memory) {
    PROCESSES.with(|p| {
        // Create a new empty BTreeMap, effectively clearing the old one
        *p.borrow_mut() = Some(StableBTreeMap::new(memory));
    });
}

/// Get process count (safe version that doesn't iterate)
pub fn get_process_count_safe() -> Result<u64, String> {
    PROCESSES.with(|p| {
        if let Some(ref map) = *p.borrow() {
            Ok(map.len())
        } else {
            Err("Process storage not initialized".to_string())
        }
    })
}

/// Store etching process
pub fn store_process(process: &EtchingProcess) -> Result<(), String> {
    let key = process.id.clone();
    let value =
        candid::encode_one(process).map_err(|e| format!("Failed to encode process: {}", e))?;

    PROCESSES.with(|p| {
        if let Some(ref mut map) = *p.borrow_mut() {
            map.insert(key, value);
            Ok(())
        } else {
            Err("Process storage not initialized".to_string())
        }
    })
}

/// Get etching process by ID
pub fn get_process(id: &ProcessId) -> Option<EtchingProcess> {
    PROCESSES.with(|p| {
        if let Some(ref map) = *p.borrow() {
            map.get(id)
                .and_then(|bytes| candid::decode_one(&bytes).ok())
        } else {
            None
        }
    })
}

/// Get etching process by ID string (legacy compatibility)
pub fn get_process_by_string(id_str: &str) -> Option<EtchingProcess> {
    let id = ProcessId::from_string(id_str).ok()?;
    get_process(&id)
}

/// Update process state
pub fn update_process_state(process: EtchingProcess) {
    let key = process.id.clone();

    // Encode with proper error handling
    let value = match candid::encode_one(&process) {
        Ok(v) => v,
        Err(e) => {
            ic_cdk::println!("❌ CRITICAL: Failed to encode process {}: {}", process.id, e);
            // This should never happen in practice, but trap is safer than silent failure
            ic_cdk::trap(&format!("Failed to encode process state: {}", e));
        }
    };

    PROCESSES.with(|p| {
        if let Some(ref mut map) = *p.borrow_mut() {
            map.insert(key, value);
        } else {
            ic_cdk::trap("Process storage not initialized");
        }
    });
}

/// Get all processes for a caller
pub fn get_caller_processes(caller: candid::Principal) -> Vec<EtchingProcess> {
    let mut results = Vec::new();

    PROCESSES.with(|p| {
        if let Some(ref map) = *p.borrow() {
            for (_key, value) in map.iter() {
                if let Ok(process) = candid::decode_one::<EtchingProcess>(&value) {
                    if process.caller == caller {
                        results.push(process);
                    }
                }
            }
        }
    });

    results
}

/// Delete completed/failed processes older than threshold
pub fn cleanup_old_processes(age_threshold_nanos: u64) -> u64 {
    let now = ic_cdk::api::time();
    let mut deleted = 0u64;
    let mut to_delete = Vec::new();

    PROCESSES.with(|p| {
        if let Some(ref map) = *p.borrow() {
            for (key, value) in map.iter() {
                if let Ok(process) = candid::decode_one::<EtchingProcess>(&value) {
                    let age = now.saturating_sub(process.updated_at);
                    if process.state.is_terminal() && age > age_threshold_nanos {
                        to_delete.push(key.clone());
                    }
                }
            }
        }
    });

    PROCESSES.with(|p| {
        if let Some(ref mut map) = *p.borrow_mut() {
            for key in to_delete {
                map.remove(&key);
                deleted += 1;
            }
        }
    });

    deleted
}

// ============================================================================
// Virtual Rune Storage Functions
// ============================================================================

/// Initialize virtual rune storage
pub fn init_virtual_rune_storage(memory: Memory) {
    VIRTUAL_RUNES.with(|v| {
        *v.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Store a virtual rune
pub fn store_virtual_rune(rune: &VirtualRune) -> Result<(), String> {
    let key = ProcessId::from_string(&rune.id)
        .map_err(|e| format!("Invalid rune ID: {}", e))?;
    let value =
        candid::encode_one(rune).map_err(|e| format!("Failed to encode virtual rune: {}", e))?;

    VIRTUAL_RUNES.with(|v| {
        if let Some(ref mut map) = *v.borrow_mut() {
            map.insert(key, value);
            Ok(())
        } else {
            Err("Virtual rune storage not initialized".to_string())
        }
    })
}

/// Get a virtual rune by ID
pub fn get_virtual_rune(id: &str) -> Option<VirtualRune> {
    let key = ProcessId::from_string(id).ok()?;
    VIRTUAL_RUNES.with(|v| {
        if let Some(ref map) = *v.borrow() {
            map.get(&key)
                .and_then(|bytes| candid::decode_one(&bytes).ok())
        } else {
            None
        }
    })
}

/// Update a virtual rune
pub fn update_virtual_rune(rune: &VirtualRune) -> Result<(), String> {
    store_virtual_rune(rune)
}

/// Get all virtual runes for a caller
pub fn get_caller_virtual_runes(caller: candid::Principal) -> Vec<VirtualRune> {
    let mut results = Vec::new();

    VIRTUAL_RUNES.with(|v| {
        if let Some(ref map) = *v.borrow() {
            for (_key, value) in map.iter() {
                if let Ok(rune) = candid::decode_one::<VirtualRune>(&value) {
                    if rune.caller == caller {
                        results.push(rune);
                    }
                }
            }
        }
    });

    results
}

/// Get total count of virtual runes
pub fn get_virtual_rune_count() -> u64 {
    VIRTUAL_RUNES.with(|v| {
        if let Some(ref map) = *v.borrow() {
            map.len()
        } else {
            0
        }
    })
}

/// Check if a rune name already exists
pub fn rune_name_exists(name: &str) -> bool {
    VIRTUAL_RUNES.with(|v| {
        if let Some(ref map) = *v.borrow() {
            for (_key, value) in map.iter() {
                if let Ok(rune) = candid::decode_one::<VirtualRune>(&value) {
                    if rune.etching.rune_name == name {
                        return true;
                    }
                }
            }
        }
        false
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_state_transitions() {
        let state = EtchingState::Validating;
        assert!(!state.is_terminal());
        assert!(!state.is_successful());

        let completed = EtchingState::Completed {
            txid: "abc".to_string(),
            block_height: 100,
        };
        assert!(completed.is_terminal());
        assert!(completed.is_successful());

        let failed = EtchingState::Failed {
            reason: "error".to_string(),
            at_state: "Signing".to_string(),
        };
        assert!(failed.is_terminal());
        assert!(failed.is_failed());
    }

    #[test]
    fn test_process_retry_tracking() {
        let caller = candid::Principal::from_text("aaaaa-aa").unwrap();
        let id = ProcessId::from_seed(12345);
        let mut process = EtchingProcess::new_for_test(
            id,
            caller,
            "TEST".to_string(),
            1_000_000,
        );

        assert_eq!(process.retry_count, 0);
        assert!(!process.has_exceeded_retries(3));

        process.increment_retry_for_test(1_001_000);
        process.increment_retry_for_test(1_002_000);
        process.increment_retry_for_test(1_003_000);

        assert_eq!(process.retry_count, 3);
        assert!(process.has_exceeded_retries(3));
    }
}
