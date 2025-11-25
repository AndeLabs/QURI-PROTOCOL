use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use crate::process_id::ProcessId;

type Memory = VirtualMemory<DefaultMemoryImpl>;

/// Status of an escrow entry
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum EscrowStatus {
    /// Fee is held in escrow
    Held,
    /// Fee has been consumed (etching completed successfully)
    Consumed,
    /// Fee has been refunded to user
    Refunded { txid: u64, refunded_at: u64 },
    /// Refund failed (manual intervention needed)
    RefundFailed { reason: String, failed_at: u64 },
}

/// Escrow entry tracking fees collected for an etching process
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EscrowEntry {
    /// Process ID this escrow is for
    pub process_id: ProcessId,
    /// User who paid the fee
    pub payer: Principal,
    /// Amount held in escrow (in satoshis)
    pub amount: u64,
    /// Status of the escrow
    pub status: EscrowStatus,
    /// When the escrow was created
    pub created_at: u64,
    /// When the escrow was last updated
    pub updated_at: u64,
    /// Rune name for reference
    pub rune_name: String,
}

impl EscrowEntry {
    /// Create a new escrow entry
    pub fn new(process_id: ProcessId, payer: Principal, amount: u64, rune_name: String) -> Self {
        let now = ic_cdk::api::time();
        Self {
            process_id,
            payer,
            amount,
            status: EscrowStatus::Held,
            created_at: now,
            updated_at: now,
            rune_name,
        }
    }

    /// Mark escrow as consumed (successful etching)
    pub fn mark_consumed(&mut self) {
        self.status = EscrowStatus::Consumed;
        self.updated_at = ic_cdk::api::time();
    }

    /// Mark escrow as refunded
    pub fn mark_refunded(&mut self, txid: u64) {
        let now = ic_cdk::api::time();
        self.status = EscrowStatus::Refunded {
            txid,
            refunded_at: now,
        };
        self.updated_at = now;
    }

    /// Mark escrow refund as failed
    pub fn mark_refund_failed(&mut self, reason: String) {
        let now = ic_cdk::api::time();
        self.status = EscrowStatus::RefundFailed {
            reason,
            failed_at: now,
        };
        self.updated_at = now;
    }

    /// Check if escrow is in a terminal state
    pub fn is_terminal(&self) -> bool {
        !matches!(self.status, EscrowStatus::Held)
    }

    /// Check if refund is possible
    pub fn can_refund(&self) -> bool {
        matches!(self.status, EscrowStatus::Held)
    }
}

// Storage for escrow entries
type EscrowStorage = RefCell<Option<StableBTreeMap<ProcessId, Vec<u8>, Memory>>>;

thread_local! {
    static ESCROW_ENTRIES: EscrowStorage = const { RefCell::new(None) };
}

/// Initialize escrow storage
pub fn init_escrow_storage(memory: Memory) {
    ESCROW_ENTRIES.with(|e| {
        *e.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Reinitialize escrow storage after upgrade
pub fn reinit_escrow_storage(memory: Memory) {
    init_escrow_storage(memory);
}

/// Store an escrow entry
pub fn store_escrow(entry: &EscrowEntry) -> Result<(), String> {
    let key = entry.process_id.clone();
    let value = candid::encode_one(entry)
        .map_err(|e| format!("Failed to encode escrow entry: {}", e))?;

    ESCROW_ENTRIES.with(|e| {
        if let Some(ref mut map) = *e.borrow_mut() {
            map.insert(key, value);
            Ok(())
        } else {
            Err("Escrow storage not initialized".to_string())
        }
    })
}

/// Get an escrow entry by process ID
pub fn get_escrow(process_id: &ProcessId) -> Option<EscrowEntry> {
    ESCROW_ENTRIES.with(|e| {
        if let Some(ref map) = *e.borrow() {
            map.get(process_id)
                .and_then(|bytes| candid::decode_one(&bytes).ok())
        } else {
            None
        }
    })
}

/// Get escrow by process ID string (for convenience)
pub fn get_escrow_by_string(process_id_str: &str) -> Option<EscrowEntry> {
    let process_id = ProcessId::from_string(process_id_str).ok()?;
    get_escrow(&process_id)
}

/// Update an escrow entry
pub fn update_escrow(entry: &EscrowEntry) -> Result<(), String> {
    store_escrow(entry)
}

/// Get all escrow entries for a user
pub fn get_user_escrows(user: Principal) -> Vec<EscrowEntry> {
    let mut results = Vec::new();

    ESCROW_ENTRIES.with(|e| {
        if let Some(ref map) = *e.borrow() {
            for (_key, value) in map.iter() {
                if let Ok(entry) = candid::decode_one::<EscrowEntry>(&value) {
                    if entry.payer == user {
                        results.push(entry);
                    }
                }
            }
        }
    });

    results
}

/// Get count of escrow entries in each status
pub fn get_escrow_stats() -> EscrowStats {
    let mut stats = EscrowStats {
        total_held: 0,
        total_consumed: 0,
        total_refunded: 0,
        total_refund_failed: 0,
        amount_held: 0,
        amount_consumed: 0,
        amount_refunded: 0,
    };

    ESCROW_ENTRIES.with(|e| {
        if let Some(ref map) = *e.borrow() {
            for (_key, value) in map.iter() {
                if let Ok(entry) = candid::decode_one::<EscrowEntry>(&value) {
                    match entry.status {
                        EscrowStatus::Held => {
                            stats.total_held += 1;
                            stats.amount_held += entry.amount;
                        }
                        EscrowStatus::Consumed => {
                            stats.total_consumed += 1;
                            stats.amount_consumed += entry.amount;
                        }
                        EscrowStatus::Refunded { .. } => {
                            stats.total_refunded += 1;
                            stats.amount_refunded += entry.amount;
                        }
                        EscrowStatus::RefundFailed { .. } => {
                            stats.total_refund_failed += 1;
                        }
                    }
                }
            }
        }
    });

    stats
}

/// Delete old escrow entries (cleanup for terminal states)
pub fn cleanup_old_escrows(age_threshold_nanos: u64) -> u64 {
    let now = ic_cdk::api::time();
    let mut deleted = 0u64;
    let mut to_delete = Vec::new();

    ESCROW_ENTRIES.with(|e| {
        if let Some(ref map) = *e.borrow() {
            for (key, value) in map.iter() {
                if let Ok(entry) = candid::decode_one::<EscrowEntry>(&value) {
                    let age = now.saturating_sub(entry.updated_at);
                    if entry.is_terminal() && age > age_threshold_nanos {
                        to_delete.push(key.clone());
                    }
                }
            }
        }
    });

    ESCROW_ENTRIES.with(|e| {
        if let Some(ref mut map) = *e.borrow_mut() {
            for key in to_delete {
                map.remove(&key);
                deleted += 1;
            }
        }
    });

    deleted
}

/// Statistics about escrow entries
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct EscrowStats {
    pub total_held: u64,
    pub total_consumed: u64,
    pub total_refunded: u64,
    pub total_refund_failed: u64,
    pub amount_held: u64,
    pub amount_consumed: u64,
    pub amount_refunded: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_escrow_lifecycle() {
        let process_id = ProcessId::from_seed(12345);
        let payer = Principal::from_text("aaaaa-aa").unwrap();
        let mut entry = EscrowEntry::new(
            process_id,
            payer,
            20_000,
            "TEST_RUNE".to_string(),
        );

        assert!(matches!(entry.status, EscrowStatus::Held));
        assert!(entry.can_refund());
        assert!(!entry.is_terminal());

        // Mark as refunded
        entry.mark_refunded(42);
        assert!(matches!(entry.status, EscrowStatus::Refunded { .. }));
        assert!(!entry.can_refund());
        assert!(entry.is_terminal());
    }

    #[test]
    fn test_escrow_consumed() {
        let process_id = ProcessId::from_seed(12345);
        let payer = Principal::from_text("aaaaa-aa").unwrap();
        let mut entry = EscrowEntry::new(
            process_id,
            payer,
            20_000,
            "TEST_RUNE".to_string(),
        );

        entry.mark_consumed();
        assert!(matches!(entry.status, EscrowStatus::Consumed));
        assert!(!entry.can_refund());
        assert!(entry.is_terminal());
    }

    #[test]
    fn test_escrow_refund_failed() {
        let process_id = ProcessId::from_seed(12345);
        let payer = Principal::from_text("aaaaa-aa").unwrap();
        let mut entry = EscrowEntry::new(
            process_id,
            payer,
            20_000,
            "TEST_RUNE".to_string(),
        );

        entry.mark_refund_failed("Network error".to_string());
        assert!(matches!(entry.status, EscrowStatus::RefundFailed { .. }));
        assert!(!entry.can_refund());
        assert!(entry.is_terminal());
    }
}
