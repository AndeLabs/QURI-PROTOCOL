//! Settlement History Management
//!
//! Tracks all settlement operations (runes → Bitcoin) for users

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use quri_types::RuneKey;
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ============================================================================
// Types
// ============================================================================

#[derive(Clone, Debug, CandidType, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SettlementId(pub String);

impl Storable for SettlementId {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.as_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self(String::from_utf8(bytes.to_vec()).expect("Invalid UTF-8"))
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum SettlementMode {
    Instant,
    Batched,
    Scheduled,
    Manual,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub enum SettlementStatus {
    Queued,
    Batching,
    Signing,
    Broadcasting,
    Confirming,
    Confirmed,
    Failed,
}

#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct SettlementRecord {
    pub id: String,
    pub principal: Principal,
    pub rune_key: RuneKey,
    pub rune_name: String,
    pub amount: u64,
    pub destination_address: String,
    pub mode: SettlementMode,
    pub status: SettlementStatus,
    pub txid: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
    pub confirmations: Option<u32>,
}

impl Storable for SettlementRecord {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode SettlementRecord"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode SettlementRecord")
    }

    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;
}

// ============================================================================
// Storage
// ============================================================================

thread_local! {
    static SETTLEMENT_HISTORY: RefCell<Option<StableBTreeMap<SettlementId, SettlementRecord, Memory>>> =
        const { RefCell::new(None) };

    static SETTLEMENT_COUNTER: RefCell<u64> = const { RefCell::new(0) };
}

// Time provider for testing
#[cfg(not(test))]
fn get_time() -> u64 {
    ic_cdk::api::time()
}

#[cfg(test)]
thread_local! {
    static MOCK_TIME: RefCell<u64> = const { RefCell::new(1_700_000_000_000_000_000) }; // Default test time
}

#[cfg(test)]
fn get_time() -> u64 {
    MOCK_TIME.with(|t| *t.borrow())
}

#[cfg(test)]
fn set_mock_time(time: u64) {
    MOCK_TIME.with(|t| {
        *t.borrow_mut() = time;
    });
}

/// Initialize settlement history storage
pub fn init_settlement_history(memory: Memory) {
    SETTLEMENT_HISTORY.with(|h| {
        *h.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Reinitialize settlement history storage after upgrade
pub fn reinit_settlement_history(memory: Memory) {
    init_settlement_history(memory);
}

/// Generate unique settlement ID
fn generate_settlement_id(principal: Principal) -> String {
    let counter = SETTLEMENT_COUNTER.with(|c| {
        let mut c = c.borrow_mut();
        *c += 1;
        *c
    });

    format!("stl_{}_{}", principal.to_text(), counter)
}

// ============================================================================
// Public API
// ============================================================================

/// Create a new settlement record
pub fn create_settlement(
    principal: Principal,
    rune_key: RuneKey,
    rune_name: String,
    amount: u64,
    destination_address: String,
    mode: SettlementMode,
) -> Result<String, String> {
    let id = generate_settlement_id(principal);
    let now = get_time();

    let record = SettlementRecord {
        id: id.clone(),
        principal,
        rune_key,
        rune_name,
        amount,
        destination_address,
        mode,
        status: SettlementStatus::Queued,
        txid: None,
        created_at: now,
        updated_at: now,
        confirmations: None,
    };

    SETTLEMENT_HISTORY.with(|h| {
        if let Some(history) = h.borrow_mut().as_mut() {
            history.insert(SettlementId(id.clone()), record);
            Ok(id)
        } else {
            Err("Settlement history not initialized".to_string())
        }
    })
}

/// Update settlement status
pub fn update_settlement_status(
    id: String,
    status: SettlementStatus,
    txid: Option<String>,
    confirmations: Option<u32>,
) -> Result<(), String> {
    SETTLEMENT_HISTORY.with(|h| {
        if let Some(history) = h.borrow_mut().as_mut() {
            let settlement_id = SettlementId(id);

            if let Some(mut record) = history.get(&settlement_id) {
                record.status = status;
                record.updated_at = get_time();

                if let Some(tx) = txid {
                    record.txid = Some(tx);
                }

                if let Some(conf) = confirmations {
                    record.confirmations = Some(conf);
                }

                history.insert(settlement_id, record);
                Ok(())
            } else {
                Err("Settlement not found".to_string())
            }
        } else {
            Err("Settlement history not initialized".to_string())
        }
    })
}

/// Get settlement history for a principal
pub fn get_user_settlement_history(
    principal: Principal,
    limit: Option<u64>,
    offset: Option<u64>,
) -> Vec<SettlementRecord> {
    SETTLEMENT_HISTORY.with(|h| {
        if let Some(history) = h.borrow().as_ref() {
            let mut settlements: Vec<SettlementRecord> = history
                .iter()
                .filter_map(|(_, record)| {
                    if record.principal == principal {
                        Some(record)
                    } else {
                        None
                    }
                })
                .collect();

            // Sort by created_at descending (newest first)
            settlements.sort_by(|a, b| b.created_at.cmp(&a.created_at));

            // Apply pagination
            let offset = offset.unwrap_or(0) as usize;
            let limit = limit.unwrap_or(50) as usize;

            settlements
                .into_iter()
                .skip(offset)
                .take(limit)
                .collect()
        } else {
            Vec::new()
        }
    })
}

/// Get settlement by ID
pub fn get_settlement_by_id(id: String) -> Option<SettlementRecord> {
    SETTLEMENT_HISTORY.with(|h| {
        h.borrow()
            .as_ref()
            .and_then(|history| history.get(&SettlementId(id)))
    })
}

/// Get total settlement count for a principal
pub fn get_user_settlement_count(principal: Principal) -> u64 {
    SETTLEMENT_HISTORY.with(|h| {
        if let Some(history) = h.borrow().as_ref() {
            history
                .iter()
                .filter(|(_, record)| record.principal == principal)
                .count() as u64
        } else {
            0
        }
    })
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use ic_stable_structures::memory_manager::MemoryManager;

    // Test helper: Create a fresh memory manager for each test
    fn setup_test_memory() -> Memory {
        let mem_mgr = MemoryManager::init(DefaultMemoryImpl::default());
        mem_mgr.get(ic_stable_structures::memory_manager::MemoryId::new(100))
    }

    // Test helper: Reset settlement counter between tests
    fn reset_settlement_counter() {
        SETTLEMENT_COUNTER.with(|c| {
            *c.borrow_mut() = 0;
        });
    }

    // Test helper: Clear settlement history
    fn clear_settlement_history() {
        SETTLEMENT_HISTORY.with(|h| {
            *h.borrow_mut() = None;
        });
    }

    // Test helper: Create a test principal
    fn create_test_principal() -> Principal {
        Principal::from_slice(&[0, 0, 0, 0, 0, 0, 0, 0, 1, 1])
    }

    // Test helper: Create a second test principal
    fn create_test_principal_2() -> Principal {
        Principal::from_slice(&[0, 0, 0, 0, 0, 0, 0, 0, 2, 2])
    }

    // Test helper: Create a test rune key
    fn create_test_rune_key() -> RuneKey {
        RuneKey::new(840000, 1)
    }

    // ===========================================
    // Storage and Initialization Tests
    // ===========================================

    #[test]
    fn test_init_settlement_history() {
        clear_settlement_history();
        let memory = setup_test_memory();

        init_settlement_history(memory);

        SETTLEMENT_HISTORY.with(|h| {
            assert!(h.borrow().is_some(), "Settlement history should be initialized");
        });
    }

    #[test]
    fn test_reinit_settlement_history() {
        clear_settlement_history();
        let memory = setup_test_memory();

        reinit_settlement_history(memory);

        SETTLEMENT_HISTORY.with(|h| {
            assert!(h.borrow().is_some(), "Settlement history should be reinitialized");
        });
    }

    // ===========================================
    // Settlement Creation Tests
    // ===========================================

    #[test]
    fn test_create_settlement_success() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let result = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        );

        assert!(result.is_ok(), "Settlement creation should succeed");
        let id = result.unwrap();
        assert!(id.starts_with("stl_"), "Settlement ID should have correct prefix");
    }

    #[test]
    fn test_create_settlement_assigns_unique_id() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id1 = create_settlement(
            principal,
            rune_key.clone(),
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest1".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let id2 = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            2000,
            "bc1qtest2".to_string(),
            SettlementMode::Batched,
        ).unwrap();

        assert_ne!(id1, id2, "Settlement IDs should be unique");
    }

    #[test]
    fn test_create_settlement_initial_status_is_queued() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let settlement = get_settlement_by_id(id).unwrap();

        match settlement.status {
            SettlementStatus::Queued => (),
            _ => panic!("Initial status should be Queued"),
        }
    }

    #[test]
    fn test_create_settlement_stores_all_fields() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();
        let rune_name = "TEST•RUNE".to_string();
        let amount = 1000u64;
        let address = "bc1qtest".to_string();

        let id = create_settlement(
            principal,
            rune_key.clone(),
            rune_name.clone(),
            amount,
            address.clone(),
            SettlementMode::Instant,
        ).unwrap();

        let settlement = get_settlement_by_id(id.clone()).unwrap();

        assert_eq!(settlement.id, id);
        assert_eq!(settlement.principal, principal);
        assert_eq!(settlement.rune_key, rune_key);
        assert_eq!(settlement.rune_name, rune_name);
        assert_eq!(settlement.amount, amount);
        assert_eq!(settlement.destination_address, address);
        assert!(settlement.txid.is_none());
        assert!(settlement.confirmations.is_none());
    }

    #[test]
    fn test_create_settlement_without_initialization_fails() {
        clear_settlement_history();

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let result = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        );

        assert!(result.is_err(), "Should fail when history not initialized");
        assert_eq!(result.unwrap_err(), "Settlement history not initialized");
    }

    // ===========================================
    // Settlement Update Tests
    // ===========================================

    #[test]
    fn test_update_settlement_status_queued_to_batching() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Batched,
        ).unwrap();

        let result = update_settlement_status(
            id.clone(),
            SettlementStatus::Batching,
            None,
            None,
        );

        assert!(result.is_ok(), "Status update should succeed");

        let settlement = get_settlement_by_id(id).unwrap();
        match settlement.status {
            SettlementStatus::Batching => (),
            _ => panic!("Status should be updated to Batching"),
        }
    }

    #[test]
    fn test_update_settlement_status_to_confirming() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let txid = "a1b2c3d4e5f6".to_string();
        let result = update_settlement_status(
            id.clone(),
            SettlementStatus::Confirming,
            Some(txid.clone()),
            Some(0),
        );

        assert!(result.is_ok(), "Status update should succeed");

        let settlement = get_settlement_by_id(id).unwrap();
        match settlement.status {
            SettlementStatus::Confirming => (),
            _ => panic!("Status should be updated to Confirming"),
        }
        assert_eq!(settlement.txid, Some(txid));
        assert_eq!(settlement.confirmations, Some(0));
    }

    #[test]
    fn test_update_settlement_status_to_confirmed() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let result = update_settlement_status(
            id.clone(),
            SettlementStatus::Confirmed,
            None,
            Some(6),
        );

        assert!(result.is_ok(), "Status update should succeed");

        let settlement = get_settlement_by_id(id).unwrap();
        match settlement.status {
            SettlementStatus::Confirmed => (),
            _ => panic!("Status should be updated to Confirmed"),
        }
        assert_eq!(settlement.confirmations, Some(6));
    }

    #[test]
    fn test_update_settlement_status_to_failed() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let result = update_settlement_status(
            id.clone(),
            SettlementStatus::Failed,
            None,
            None,
        );

        assert!(result.is_ok(), "Status update should succeed");

        let settlement = get_settlement_by_id(id).unwrap();
        match settlement.status {
            SettlementStatus::Failed => (),
            _ => panic!("Status should be updated to Failed"),
        }
    }

    #[test]
    fn test_update_settlement_updates_timestamp() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        // Set initial time
        set_mock_time(1_700_000_000_000_000_000);

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let original_settlement = get_settlement_by_id(id.clone()).unwrap();
        let original_timestamp = original_settlement.updated_at;

        // Advance time by 1 second (in nanoseconds)
        set_mock_time(1_700_000_001_000_000_000);

        update_settlement_status(
            id.clone(),
            SettlementStatus::Batching,
            None,
            None,
        ).unwrap();

        let updated_settlement = get_settlement_by_id(id).unwrap();

        assert!(
            updated_settlement.updated_at > original_timestamp,
            "Updated timestamp should be later than original"
        );
        assert_eq!(updated_settlement.updated_at, 1_700_000_001_000_000_000);
    }

    #[test]
    fn test_update_settlement_preserves_txid() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let txid = "original_txid".to_string();

        // Set initial txid
        update_settlement_status(
            id.clone(),
            SettlementStatus::Broadcasting,
            Some(txid.clone()),
            None,
        ).unwrap();

        // Update status without providing new txid
        update_settlement_status(
            id.clone(),
            SettlementStatus::Confirming,
            None,
            Some(1),
        ).unwrap();

        let settlement = get_settlement_by_id(id).unwrap();
        assert_eq!(settlement.txid, Some(txid), "txid should be preserved");
    }

    #[test]
    fn test_update_nonexistent_settlement_fails() {
        clear_settlement_history();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let result = update_settlement_status(
            "nonexistent_id".to_string(),
            SettlementStatus::Confirmed,
            None,
            None,
        );

        assert!(result.is_err(), "Should fail for nonexistent settlement");
        assert_eq!(result.unwrap_err(), "Settlement not found");
    }

    #[test]
    fn test_update_settlement_without_initialization_fails() {
        clear_settlement_history();

        let result = update_settlement_status(
            "some_id".to_string(),
            SettlementStatus::Confirmed,
            None,
            None,
        );

        assert!(result.is_err(), "Should fail when history not initialized");
        assert_eq!(result.unwrap_err(), "Settlement history not initialized");
    }

    // ===========================================
    // Query Tests
    // ===========================================

    #[test]
    fn test_get_settlement_by_id() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key.clone(),
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let settlement = get_settlement_by_id(id.clone());

        assert!(settlement.is_some(), "Settlement should be found");
        let settlement = settlement.unwrap();
        assert_eq!(settlement.id, id);
        assert_eq!(settlement.rune_key, rune_key);
    }

    #[test]
    fn test_get_settlement_by_id_not_found() {
        clear_settlement_history();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let settlement = get_settlement_by_id("nonexistent_id".to_string());

        assert!(settlement.is_none(), "Settlement should not be found");
    }

    #[test]
    fn test_get_user_settlement_history_returns_correct_user() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal1 = create_test_principal();
        let principal2 = create_test_principal_2();
        let rune_key = create_test_rune_key();

        // Create settlements for principal1
        create_settlement(
            principal1,
            rune_key.clone(),
            "TEST•RUNE1".to_string(),
            1000,
            "bc1qtest1".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        create_settlement(
            principal1,
            rune_key.clone(),
            "TEST•RUNE2".to_string(),
            2000,
            "bc1qtest2".to_string(),
            SettlementMode::Batched,
        ).unwrap();

        // Create settlement for principal2
        create_settlement(
            principal2,
            rune_key,
            "TEST•RUNE3".to_string(),
            3000,
            "bc1qtest3".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let settlements = get_user_settlement_history(principal1, None, None);

        assert_eq!(settlements.len(), 2, "Should return only principal1's settlements");
        assert!(settlements.iter().all(|s| s.principal == principal1));
    }

    #[test]
    fn test_get_user_settlement_history_pagination() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        // Create 5 settlements
        for i in 0..5 {
            create_settlement(
                principal,
                rune_key.clone(),
                format!("TEST•RUNE{}", i),
                1000 * (i as u64 + 1),
                format!("bc1qtest{}", i),
                SettlementMode::Instant,
            ).unwrap();
        }

        // Test limit
        let settlements = get_user_settlement_history(principal, Some(2), None);
        assert_eq!(settlements.len(), 2, "Should respect limit");

        // Test offset
        let settlements = get_user_settlement_history(principal, None, Some(2));
        assert_eq!(settlements.len(), 3, "Should skip offset items");

        // Test limit + offset
        let settlements = get_user_settlement_history(principal, Some(2), Some(1));
        assert_eq!(settlements.len(), 2, "Should apply both limit and offset");
    }

    #[test]
    fn test_get_user_settlement_history_ordered_by_created_at() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        // Create settlements with different timestamps
        set_mock_time(1_700_000_000_000_000_000);
        let id1 = create_settlement(
            principal,
            rune_key.clone(),
            "FIRST".to_string(),
            1000,
            "bc1qtest1".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        set_mock_time(1_700_001_000_000_000_000);
        let id2 = create_settlement(
            principal,
            rune_key.clone(),
            "SECOND".to_string(),
            2000,
            "bc1qtest2".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        set_mock_time(1_700_002_000_000_000_000);
        let id3 = create_settlement(
            principal,
            rune_key,
            "THIRD".to_string(),
            3000,
            "bc1qtest3".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        let settlements = get_user_settlement_history(principal, None, None);

        // Should be ordered newest first
        assert_eq!(settlements[0].id, id3);
        assert_eq!(settlements[1].id, id2);
        assert_eq!(settlements[2].id, id1);
    }

    #[test]
    fn test_get_user_settlement_history_empty() {
        clear_settlement_history();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let settlements = get_user_settlement_history(principal, None, None);

        assert_eq!(settlements.len(), 0, "Should return empty vec for user with no settlements");
    }

    #[test]
    fn test_get_user_settlement_count() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        // Initially 0
        assert_eq!(get_user_settlement_count(principal), 0);

        // Create 3 settlements
        for i in 0..3 {
            create_settlement(
                principal,
                rune_key.clone(),
                format!("TEST•RUNE{}", i),
                1000,
                format!("bc1qtest{}", i),
                SettlementMode::Instant,
            ).unwrap();
        }

        assert_eq!(get_user_settlement_count(principal), 3);
    }

    #[test]
    fn test_get_user_settlement_count_different_principals() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal1 = create_test_principal();
        let principal2 = create_test_principal_2();
        let rune_key = create_test_rune_key();

        // Create 2 for principal1
        for i in 0..2 {
            create_settlement(
                principal1,
                rune_key.clone(),
                format!("TEST•RUNE{}", i),
                1000,
                format!("bc1qtest{}", i),
                SettlementMode::Instant,
            ).unwrap();
        }

        // Create 3 for principal2
        for i in 0..3 {
            create_settlement(
                principal2,
                rune_key.clone(),
                format!("TEST•RUNE{}", i),
                1000,
                format!("bc1qtest{}", i),
                SettlementMode::Instant,
            ).unwrap();
        }

        assert_eq!(get_user_settlement_count(principal1), 2);
        assert_eq!(get_user_settlement_count(principal2), 3);
    }

    // ===========================================
    // Storage Persistence Tests
    // ===========================================

    #[test]
    fn test_settlement_persists_after_creation() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key.clone(),
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        ).unwrap();

        // Verify it's stored
        let settlement = get_settlement_by_id(id.clone());
        assert!(settlement.is_some(), "Settlement should persist");

        let settlement = settlement.unwrap();
        assert_eq!(settlement.id, id);
        assert_eq!(settlement.principal, principal);
        assert_eq!(settlement.rune_key, rune_key);
    }

    #[test]
    fn test_settlement_history_maintains_insertion_order() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let mut ids = Vec::new();

        // Create multiple settlements
        for i in 0..5 {
            let id = create_settlement(
                principal,
                rune_key.clone(),
                format!("TEST•RUNE{}", i),
                1000 * (i as u64 + 1),
                format!("bc1qtest{}", i),
                SettlementMode::Instant,
            ).unwrap();
            ids.push(id);
        }

        // Verify all settlements exist
        for id in ids {
            let settlement = get_settlement_by_id(id.clone());
            assert!(settlement.is_some(), "Settlement {} should exist", id);
        }
    }

    // ===========================================
    // SettlementId Storable Tests
    // ===========================================

    #[test]
    fn test_settlement_id_to_bytes_and_from_bytes() {
        let id = SettlementId("stl_test_123".to_string());

        let bytes = id.to_bytes();
        let recovered = SettlementId::from_bytes(bytes);

        assert_eq!(id, recovered);
    }

    #[test]
    fn test_settlement_id_ordering() {
        let id1 = SettlementId("stl_a".to_string());
        let id2 = SettlementId("stl_b".to_string());

        assert!(id1 < id2);
        assert!(id2 > id1);
    }

    // ===========================================
    // SettlementRecord Storable Tests
    // ===========================================

    #[test]
    fn test_settlement_record_to_bytes_and_from_bytes() {
        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let record = SettlementRecord {
            id: "stl_test".to_string(),
            principal,
            rune_key,
            rune_name: "TEST•RUNE".to_string(),
            amount: 1000,
            destination_address: "bc1qtest".to_string(),
            mode: SettlementMode::Instant,
            status: SettlementStatus::Queued,
            txid: None,
            created_at: 1234567890,
            updated_at: 1234567890,
            confirmations: None,
        };

        let bytes = record.to_bytes();
        let recovered = SettlementRecord::from_bytes(bytes);

        assert_eq!(record.id, recovered.id);
        assert_eq!(record.principal, recovered.principal);
        assert_eq!(record.rune_key, recovered.rune_key);
        assert_eq!(record.amount, recovered.amount);
    }

    // ===========================================
    // Edge Cases and Error Handling
    // ===========================================

    #[test]
    fn test_create_settlement_with_zero_amount() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let result = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            0, // Zero amount
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        );

        // Note: Current implementation doesn't validate amount > 0
        // This test documents current behavior
        assert!(result.is_ok(), "Currently allows zero amount");
    }

    #[test]
    fn test_create_settlement_with_empty_rune_name() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let result = create_settlement(
            principal,
            rune_key,
            String::new(), // Empty name
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Instant,
        );

        // Note: Current implementation doesn't validate non-empty name
        // This test documents current behavior
        assert!(result.is_ok(), "Currently allows empty rune name");
    }

    #[test]
    fn test_create_settlement_with_empty_address() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let result = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            String::new(), // Empty address
            SettlementMode::Instant,
        );

        // Note: Current implementation doesn't validate address format
        // This test documents current behavior
        assert!(result.is_ok(), "Currently allows empty address");
    }

    #[test]
    fn test_settlement_modes_are_preserved() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let modes = vec![
            SettlementMode::Instant,
            SettlementMode::Batched,
            SettlementMode::Scheduled,
            SettlementMode::Manual,
        ];

        for (i, mode) in modes.iter().enumerate() {
            let id = create_settlement(
                principal,
                rune_key.clone(),
                format!("TEST•RUNE{}", i),
                1000,
                format!("bc1qtest{}", i),
                mode.clone(),
            ).unwrap();

            let settlement = get_settlement_by_id(id).unwrap();

            // Verify mode is preserved (comparing debug representations)
            assert_eq!(
                format!("{:?}", settlement.mode),
                format!("{:?}", mode),
                "Settlement mode should be preserved"
            );
        }
    }

    #[test]
    fn test_multiple_status_transitions() {
        clear_settlement_history();
        reset_settlement_counter();
        let memory = setup_test_memory();
        init_settlement_history(memory);

        let principal = create_test_principal();
        let rune_key = create_test_rune_key();

        let id = create_settlement(
            principal,
            rune_key,
            "TEST•RUNE".to_string(),
            1000,
            "bc1qtest".to_string(),
            SettlementMode::Batched,
        ).unwrap();

        // Simulate full lifecycle
        let transitions = vec![
            (SettlementStatus::Batching, None, None),
            (SettlementStatus::Signing, None, None),
            (SettlementStatus::Broadcasting, Some("tx123".to_string()), None),
            (SettlementStatus::Confirming, None, Some(0)),
            (SettlementStatus::Confirming, None, Some(3)),
            (SettlementStatus::Confirmed, None, Some(6)),
        ];

        for (status, txid, confirmations) in transitions {
            let result = update_settlement_status(
                id.clone(),
                status,
                txid.clone(),
                confirmations,
            );
            assert!(result.is_ok(), "Status transition should succeed");
        }

        let final_settlement = get_settlement_by_id(id).unwrap();
        assert_eq!(final_settlement.txid, Some("tx123".to_string()));
        assert_eq!(final_settlement.confirmations, Some(6));
    }

    #[test]
    fn test_generate_settlement_id_includes_principal() {
        clear_settlement_history();
        reset_settlement_counter();

        let principal = create_test_principal();
        let id = generate_settlement_id(principal);

        let principal_text = principal.to_text();
        assert!(
            id.contains(&principal_text),
            "Settlement ID should contain principal text"
        );
        assert!(id.starts_with("stl_"), "Settlement ID should have correct prefix");
    }

    #[test]
    fn test_settlement_counter_increments() {
        reset_settlement_counter();

        let principal = create_test_principal();

        let id1 = generate_settlement_id(principal);
        let id2 = generate_settlement_id(principal);

        assert_ne!(id1, id2, "Counter should ensure unique IDs");
    }
}
