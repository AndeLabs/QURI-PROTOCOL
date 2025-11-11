use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use quri_types::{SessionPermissions, UserSession};

// Type aliases
type Memory = VirtualMemory<DefaultMemoryImpl>;
type SessionStorage = StableBTreeMap<Principal, UserSession, Memory>;
type RateLimitStorage = StableBTreeMap<Principal, RateLimitData, Memory>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static SESSIONS: RefCell<SessionStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static RATE_LIMITS: RefCell<RateLimitStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct RateLimitData {
    requests: u32,
    window_start: u64,
}

const MAX_REQUESTS_PER_HOUR: u32 = 100;
const RATE_LIMIT_WINDOW: u64 = 3600_000_000_000; // 1 hour in nanoseconds

#[init]
fn init() {
    ic_cdk::println!("Identity Manager canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing identity manager upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Identity manager upgrade completed");
}

/// Create a new session for a user
/// Inspired by Odin.fun's session keys feature
#[update]
fn create_session(permissions: SessionPermissions, duration_seconds: u64) -> Result<UserSession, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create sessions".to_string());
    }

    // Check rate limit
    check_rate_limit(caller)?;

    // Generate session key (in production, use proper key generation)
    let session_key = generate_session_key(caller);

    let current_time = ic_cdk::api::time();
    let expires_at = quri_utils::time::calculate_expiry(current_time, duration_seconds);

    let session = UserSession {
        principal: caller,
        session_key,
        expires_at,
        permissions,
    };

    SESSIONS.with(|sessions| {
        sessions.borrow_mut().insert(caller, session.clone());
    });

    Ok(session)
}

/// Get current session for caller
#[query]
fn get_session() -> Option<UserSession> {
    let caller = ic_cdk::caller();

    SESSIONS.with(|sessions| {
        sessions.borrow().get(&caller)
    })
}

/// Validate a session
#[query]
fn validate_session(principal: Principal) -> bool {
    SESSIONS.with(|sessions| {
        if let Some(session) = sessions.borrow().get(&principal) {
            let current_time = ic_cdk::api::time();
            !quri_utils::time::is_expired(session.expires_at, current_time)
        } else {
            false
        }
    })
}

/// Revoke a session
#[update]
fn revoke_session() -> Result<(), String> {
    let caller = ic_cdk::caller();

    SESSIONS.with(|sessions| {
        sessions.borrow_mut().remove(&caller);
    });

    Ok(())
}

/// Check if caller has permission for an action
#[query]
fn check_permission(action: PermissionType) -> bool {
    let caller = ic_cdk::caller();

    SESSIONS.with(|sessions| {
        if let Some(session) = sessions.borrow().get(&caller) {
            // Check if session is expired
            let current_time = ic_cdk::api::time();
            if quri_utils::time::is_expired(session.expires_at, current_time) {
                return false;
            }

            // Check specific permission
            match action {
                PermissionType::CreateRune => session.permissions.can_create_rune,
                PermissionType::Transfer => session.permissions.can_transfer,
            }
        } else {
            false
        }
    })
}

/// Get user statistics
#[query]
fn get_user_stats(principal: Principal) -> UserStats {
    // In production, this would aggregate data from multiple canisters
    UserStats {
        runes_created: 0,
        total_volume: 0,
        joined_at: 0,
    }
}

// Helper functions

fn check_rate_limit(principal: Principal) -> Result<(), String> {
    let current_time = ic_cdk::api::time();

    RATE_LIMITS.with(|limits| {
        let mut limits_mut = limits.borrow_mut();

        if let Some(mut data) = limits_mut.get(&principal) {
            // Check if we need to reset the window
            if current_time - data.window_start > RATE_LIMIT_WINDOW {
                data.requests = 1;
                data.window_start = current_time;
                limits_mut.insert(principal, data);
                Ok(())
            } else if data.requests >= MAX_REQUESTS_PER_HOUR {
                Err(format!(
                    "Rate limit exceeded. Try again in {} seconds",
                    (RATE_LIMIT_WINDOW - (current_time - data.window_start)) / 1_000_000_000
                ))
            } else {
                data.requests += 1;
                limits_mut.insert(principal, data);
                Ok(())
            }
        } else {
            // First request
            limits_mut.insert(
                principal,
                RateLimitData {
                    requests: 1,
                    window_start: current_time,
                },
            );
            Ok(())
        }
    })
}

fn generate_session_key(principal: Principal) -> Vec<u8> {
    use sha2::{Digest, Sha256};

    let mut hasher = Sha256::new();
    hasher.update(principal.as_slice());
    hasher.update(&ic_cdk::api::time().to_le_bytes());
    hasher.finalize().to_vec()
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum PermissionType {
    CreateRune,
    Transfer,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UserStats {
    pub runes_created: u64,
    pub total_volume: u64,
    pub joined_at: u64,
}

ic_cdk::export_candid!();
