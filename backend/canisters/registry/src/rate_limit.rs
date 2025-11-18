/*!
 * Rate Limiting Module for Registry Canister
 *
 * Prevents DoS attacks by limiting the number of requests per principal
 */

use candid::Principal;
use std::cell::RefCell;
use std::collections::HashMap;

const REQUESTS_PER_MINUTE: u64 = 60;
const WINDOW_DURATION_NS: u64 = 60_000_000_000; // 1 minute in nanoseconds

#[derive(Clone, Debug)]
pub struct RateLimitState {
    pub last_request: u64,
    pub request_count: u64,
    pub window_start: u64,
}

thread_local! {
    static RATE_LIMITS: RefCell<HashMap<Principal, RateLimitState>> =
        RefCell::new(HashMap::new());

    static WHITELIST: RefCell<Vec<Principal>> = RefCell::new(Vec::new());
}

/// Check if principal is whitelisted (bypasses rate limiting)
pub fn is_whitelisted(principal: Principal) -> bool {
    WHITELIST.with(|list| list.borrow().contains(&principal))
}

/// Add principal to whitelist
pub fn add_to_whitelist(principal: Principal) {
    WHITELIST.with(|list| {
        let mut list = list.borrow_mut();
        if !list.contains(&principal) {
            list.push(principal);
        }
    });
}

/// Remove principal from whitelist
pub fn remove_from_whitelist(principal: Principal) {
    WHITELIST.with(|list| {
        list.borrow_mut().retain(|p| p != &principal);
    });
}

/// Check rate limit for a principal
///
/// Returns Ok(()) if request is allowed, Err(String) if rate limit exceeded
pub fn check_rate_limit(caller: Principal) -> Result<(), String> {
    // Skip rate limiting for whitelisted principals
    if is_whitelisted(caller) {
        return Ok(());
    }

    let now = ic_cdk::api::time();

    RATE_LIMITS.with(|limits| {
        let mut limits = limits.borrow_mut();
        let state = limits.entry(caller).or_insert(RateLimitState {
            last_request: now,
            request_count: 0,
            window_start: now,
        });

        // Reset window if expired
        if now - state.window_start > WINDOW_DURATION_NS {
            state.window_start = now;
            state.request_count = 0;
        }

        // Check limit
        if state.request_count >= REQUESTS_PER_MINUTE {
            let remaining_seconds = (state.window_start + WINDOW_DURATION_NS - now) / 1_000_000_000;
            return Err(format!(
                "Rate limit exceeded ({} requests/minute). Try again in {} seconds",
                REQUESTS_PER_MINUTE, remaining_seconds
            ));
        }

        // Increment counter
        state.request_count += 1;
        state.last_request = now;
        Ok(())
    })
}

/// Get current rate limit stats for a principal
pub fn get_rate_limit_stats(caller: Principal) -> Option<RateLimitState> {
    RATE_LIMITS.with(|limits| limits.borrow().get(&caller).cloned())
}

/// Reset rate limit for a principal (admin function)
pub fn reset_rate_limit(principal: Principal) {
    RATE_LIMITS.with(|limits| {
        limits.borrow_mut().remove(&principal);
    });
}

/// Clear all rate limit data (admin function)
pub fn clear_all_rate_limits() {
    RATE_LIMITS.with(|limits| {
        limits.borrow_mut().clear();
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiting() {
        let principal = Principal::from_text("aaaaa-aa").unwrap();

        // First 60 requests should succeed
        for i in 0..REQUESTS_PER_MINUTE {
            let result = check_rate_limit(principal);
            assert!(result.is_ok(), "Request {} should succeed", i);
        }

        // 61st request should fail
        let result = check_rate_limit(principal);
        assert!(result.is_err(), "Request 61 should fail");
    }

    #[test]
    fn test_whitelist() {
        let principal = Principal::from_text("aaaaa-aa").unwrap();

        // Add to whitelist
        add_to_whitelist(principal);
        assert!(is_whitelisted(principal));

        // Should bypass rate limiting
        for _ in 0..100 {
            let result = check_rate_limit(principal);
            assert!(result.is_ok());
        }

        // Remove from whitelist
        remove_from_whitelist(principal);
        assert!(!is_whitelisted(principal));
    }
}
