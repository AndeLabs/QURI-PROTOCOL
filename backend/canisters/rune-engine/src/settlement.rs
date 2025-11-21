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

/// Initialize settlement history storage
pub fn init_settlement_history(memory: Memory) {
    SETTLEMENT_HISTORY.with(|h| {
        *h.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Generate unique settlement ID
fn generate_settlement_id(principal: Principal) -> String {
    let counter = SETTLEMENT_COUNTER.with(|c| {
        let mut c = c.borrow_mut();
        *c += 1;
        *c
    });

    let timestamp = ic_cdk::api::time();
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
    let now = ic_cdk::api::time();

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
                record.updated_at = ic_cdk::api::time();

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
