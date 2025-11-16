// ============================================================================
// Idempotency Module
// ============================================================================
//
// Prevents duplicate Rune creations by tracking request IDs.
//
// Key Features:
// - Request ID generation based on caller + config hash
// - Persistent storage in stable memory
// - TTL for cleanup of old requests (7 days)
// - Thread-safe concurrent access
//
// ============================================================================

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{
    memory_manager::VirtualMemory, DefaultMemoryImpl, StableBTreeMap, storable::Bound, Storable,
};
use std::cell::RefCell;
use std::borrow::Cow;
use sha2::{Sha256, Digest};

use quri_types::RuneEtching;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// Request tracking expires after 7 days
const REQUEST_TTL_NANOS: u64 = 7 * 24 * 60 * 60 * 1_000_000_000;

/// Idempotency request record
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct IdempotencyRequest {
    pub request_id: String,
    pub caller: Principal,
    pub result: String, // Process ID or error
    pub created_at: u64,
    pub is_success: bool,
}

// Implement Storable for IdempotencyRequest
impl Storable for IdempotencyRequest {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode IdempotencyRequest"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode IdempotencyRequest")
    }

    const BOUND: Bound = Bound::Unbounded;
}

thread_local! {
    /// Idempotency storage (memory ID 3)
    static IDEMPOTENCY_STORE: RefCell<Option<StableBTreeMap<String, IdempotencyRequest, Memory>>> =
        const { RefCell::new(None) };
}

/// Initialize idempotency storage
pub fn init_idempotency_storage(memory: Memory) {
    IDEMPOTENCY_STORE.with(|store| {
        *store.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Reinitialize after upgrade
pub fn reinit_idempotency_storage(memory: Memory) {
    IDEMPOTENCY_STORE.with(|store| {
        *store.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

/// Generate deterministic request ID from caller and etching config
pub fn generate_request_id(caller: &Principal, etching: &RuneEtching) -> String {
    let mut hasher = Sha256::new();

    // Hash caller
    hasher.update(caller.as_slice());

    // Hash rune details
    hasher.update(etching.rune_name.as_bytes());
    hasher.update(etching.symbol.as_bytes());
    hasher.update(&etching.divisibility.to_le_bytes());

    // Hash premine
    hasher.update(b"premine:");
    hasher.update(&etching.premine.to_le_bytes());

    // Hash minting terms if present
    if let Some(ref terms) = etching.terms {
        hasher.update(b"terms:");
        hasher.update(&terms.amount.to_le_bytes());
        hasher.update(&terms.cap.to_le_bytes());

        if let Some(height_start) = terms.height_start {
            hasher.update(&height_start.to_le_bytes());
        }
        if let Some(height_end) = terms.height_end {
            hasher.update(&height_end.to_le_bytes());
        }
        if let Some(offset_start) = terms.offset_start {
            hasher.update(&offset_start.to_le_bytes());
        }
        if let Some(offset_end) = terms.offset_end {
            hasher.update(&offset_end.to_le_bytes());
        }
    }

    // Convert to hex string
    hex::encode(hasher.finalize())
}

/// Check if request already processed
pub fn get_existing_request(request_id: &str) -> Option<IdempotencyRequest> {
    IDEMPOTENCY_STORE.with(|store| {
        let store_ref = store.borrow();
        if let Some(ref s) = *store_ref {
            s.get(&request_id.to_string())
        } else {
            None
        }
    })
}

/// Record successful request
pub fn record_request_success(
    request_id: String,
    caller: Principal,
    process_id: String,
) -> Result<(), String> {
    let record = IdempotencyRequest {
        request_id: request_id.clone(),
        caller,
        result: process_id,
        created_at: ic_cdk::api::time(),
        is_success: true,
    };

    IDEMPOTENCY_STORE.with(|store| {
        let mut store_ref = store.borrow_mut();
        if let Some(ref mut s) = *store_ref {
            s.insert(request_id, record);
            Ok(())
        } else {
            Err("Idempotency storage not initialized".to_string())
        }
    })
}

/// Record failed request
pub fn record_request_failure(
    request_id: String,
    caller: Principal,
    error: String,
) -> Result<(), String> {
    let record = IdempotencyRequest {
        request_id: request_id.clone(),
        caller,
        result: error,
        created_at: ic_cdk::api::time(),
        is_success: false,
    };

    IDEMPOTENCY_STORE.with(|store| {
        let mut store_ref = store.borrow_mut();
        if let Some(ref mut s) = *store_ref {
            s.insert(request_id, record);
            Ok(())
        } else {
            Err("Idempotency storage not initialized".to_string())
        }
    })
}

/// Cleanup expired requests (older than TTL)
pub fn cleanup_expired_requests() -> u64 {
    let current_time = ic_cdk::api::time();
    let cutoff_time = current_time.saturating_sub(REQUEST_TTL_NANOS);

    IDEMPOTENCY_STORE.with(|store| {
        let mut store_ref = store.borrow_mut();
        if let Some(ref mut s) = *store_ref {
            let mut to_remove = Vec::new();

            // Find expired entries
            for (request_id, record) in s.iter() {
                if record.created_at < cutoff_time {
                    to_remove.push(request_id);
                }
            }

            // Remove them
            let count = to_remove.len() as u64;
            for request_id in to_remove {
                s.remove(&request_id);
            }

            if count > 0 {
                ic_cdk::println!("🧹 Cleaned up {} expired idempotency records", count);
            }

            count
        } else {
            0
        }
    })
}

/// Get total count of tracked requests
pub fn get_request_count() -> u64 {
    IDEMPOTENCY_STORE.with(|store| {
        let store_ref = store.borrow();
        if let Some(ref s) = *store_ref {
            s.len()
        } else {
            0
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_request_id_deterministic() {
        let principal = Principal::from_text("aaaaa-aa").unwrap();
        let etching = RuneEtching {
            rune_name: "TESTCOIN".to_string(),
            symbol: "TEST".to_string(),
            divisibility: 8,
            premine: 21_000_000,
            terms: None,
        };

        let id1 = generate_request_id(&principal, &etching);
        let id2 = generate_request_id(&principal, &etching);

        assert_eq!(id1, id2, "Request IDs should be deterministic");
    }

    #[test]
    fn test_generate_request_id_different_for_different_runes() {
        let principal = Principal::from_text("aaaaa-aa").unwrap();

        let etching1 = RuneEtching {
            rune_name: "TESTCOIN1".to_string(),
            symbol: "TEST1".to_string(),
            divisibility: 8,
            premine: 21_000_000,
            terms: None,
        };

        let etching2 = RuneEtching {
            rune_name: "TESTCOIN2".to_string(),
            symbol: "TEST2".to_string(),
            divisibility: 8,
            premine: 21_000_000,
            terms: None,
        };

        let id1 = generate_request_id(&principal, &etching1);
        let id2 = generate_request_id(&principal, &etching2);

        assert_ne!(id1, id2, "Different runes should have different request IDs");
    }

    #[test]
    fn test_generate_request_id_with_terms() {
        let principal = Principal::from_text("aaaaa-aa").unwrap();

        let etching_no_terms = RuneEtching {
            rune_name: "TESTCOIN".to_string(),
            symbol: "TEST".to_string(),
            divisibility: 8,
            premine: 0,
            terms: None,
        };

        let etching_with_terms = RuneEtching {
            rune_name: "TESTCOIN".to_string(),
            symbol: "TEST".to_string(),
            divisibility: 8,
            premine: 0,
            terms: Some(quri_types::MintTerms {
                amount: 1000,
                cap: 21_000,
                height_start: Some(840_000),
                height_end: Some(850_000),
                offset_start: None,
                offset_end: None,
            }),
        };

        let id1 = generate_request_id(&principal, &etching_no_terms);
        let id2 = generate_request_id(&principal, &etching_with_terms);

        assert_ne!(id1, id2, "Runes with/without terms should have different IDs");
    }
}
