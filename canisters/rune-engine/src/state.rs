use candid::{CandidType, Deserialize};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

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
    pub id: String,
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
    pub fn new(id: String, caller: candid::Principal, rune_name: String) -> Self {
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
        id: String,
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

/// Global state manager
type ProcessStorage = RefCell<Option<StableBTreeMap<Vec<u8>, Vec<u8>, Memory>>>;

thread_local! {
    #[allow(unused_doc_comments)]
    /// Global state manager
    static PROCESSES: ProcessStorage = const { RefCell::new(None) };
}

/// Initialize state storage
pub fn init_state_storage(memory: Memory) {
    PROCESSES.with(|p| {
        *p.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Store etching process
pub fn store_process(process: &EtchingProcess) -> Result<(), String> {
    let key = process.id.as_bytes().to_vec();
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
pub fn get_process(id: &str) -> Option<EtchingProcess> {
    let key = id.as_bytes().to_vec();

    PROCESSES.with(|p| {
        if let Some(ref map) = *p.borrow() {
            map.get(&key)
                .and_then(|bytes| candid::decode_one(&bytes).ok())
        } else {
            None
        }
    })
}

/// Update process state
pub fn update_process_state(process: EtchingProcess) {
    let key = process.id.as_bytes().to_vec();
    let value = candid::encode_one(&process).expect("Failed to encode process");

    PROCESSES.with(|p| {
        if let Some(ref mut map) = *p.borrow_mut() {
            map.insert(key, value);
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
        let mut process = EtchingProcess::new_for_test(
            "test-1".to_string(),
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
