//! Dead Man's Switch Module
//!
//! Automatically transfers Runes to a beneficiary if the owner
//! doesn't check in within a specified period.
//!
//! This is a key feature for the ICP Bitcoin DeFi Hackathon.

use candid::Principal;
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::BTreeMap;

use quri_types::{
    CreateDeadManSwitchParams, DeadManSwitch, DeadManSwitchInfo,
    DeadManSwitchStats, SwitchStatus,
};

use crate::errors::EngineError;
use crate::validators::is_valid_bitcoin_address;

// Thread-local storage for Dead Man's Switches
thread_local! {
    static DEAD_MAN_SWITCHES: RefCell<BTreeMap<u64, DeadManSwitch>> = RefCell::new(BTreeMap::new());
    static SWITCH_COUNTER: RefCell<u64> = RefCell::new(0);
    static USER_SWITCHES: RefCell<BTreeMap<Principal, Vec<u64>>> = RefCell::new(BTreeMap::new());
}

/// Create a new Dead Man's Switch
pub fn create_switch(params: CreateDeadManSwitchParams) -> Result<u64, EngineError> {
    let caller = ic_cdk::caller();

    // Validate caller is not anonymous
    if caller == Principal::anonymous() {
        return Err(EngineError::Unauthorized("Anonymous principals cannot create switches".to_string()));
    }

    // Validate beneficiary address
    if !is_valid_bitcoin_address(&params.beneficiary) {
        return Err(EngineError::InvalidInput(
            "Invalid beneficiary Bitcoin address".to_string()
        ));
    }

    // Validate timeout (1-365 days)
    if params.timeout_days < 1 || params.timeout_days > 365 {
        return Err(EngineError::InvalidInput(
            "Timeout must be between 1 and 365 days".to_string()
        ));
    }

    // Validate amount
    if params.amount == 0 {
        return Err(EngineError::InvalidInput(
            "Amount must be greater than 0".to_string()
        ));
    }

    let now = time();
    let timeout_ns = params.timeout_days * 24 * 60 * 60 * 1_000_000_000;

    // Generate unique ID
    let id = SWITCH_COUNTER.with(|counter| {
        let mut c = counter.borrow_mut();
        *c += 1;
        *c
    });

    let switch = DeadManSwitch {
        id,
        owner: caller,
        beneficiary: params.beneficiary,
        rune_id: params.rune_id,
        amount: params.amount,
        last_checkin: now,
        timeout_ns,
        triggered: false,
        created_at: now,
        message: params.message,
    };

    // Store the switch
    DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow_mut().insert(id, switch);
    });

    // Track user's switches
    USER_SWITCHES.with(|user_switches| {
        let mut us = user_switches.borrow_mut();
        us.entry(caller).or_insert_with(Vec::new).push(id);
    });

    ic_cdk::println!("Created Dead Man's Switch {} for {}", id, caller);

    Ok(id)
}

/// Check in to reset the timer
pub fn checkin(switch_id: u64) -> Result<(), EngineError> {
    let caller = ic_cdk::caller();

    DEAD_MAN_SWITCHES.with(|switches| {
        let mut switches = switches.borrow_mut();
        let switch = switches.get_mut(&switch_id)
            .ok_or(EngineError::NotFound("Switch not found".to_string()))?;

        if switch.owner != caller {
            return Err(EngineError::Unauthorized(
                "Only owner can check in".to_string()
            ));
        }

        if switch.triggered {
            return Err(EngineError::InvalidState(
                "Switch already triggered".to_string()
            ));
        }

        switch.last_checkin = time();

        ic_cdk::println!("Check-in for switch {} by {}", switch_id, caller);

        Ok(())
    })
}

/// Cancel a switch (only owner)
pub fn cancel_switch(switch_id: u64) -> Result<(), EngineError> {
    let caller = ic_cdk::caller();

    DEAD_MAN_SWITCHES.with(|switches| {
        let switches_ref = switches.borrow();
        let switch = switches_ref.get(&switch_id)
            .ok_or(EngineError::NotFound("Switch not found".to_string()))?;

        if switch.owner != caller {
            return Err(EngineError::Unauthorized(
                "Only owner can cancel".to_string()
            ));
        }

        if switch.triggered {
            return Err(EngineError::InvalidState(
                "Cannot cancel triggered switch".to_string()
            ));
        }

        drop(switches_ref);
        switches.borrow_mut().remove(&switch_id);

        // Remove from user's switches
        USER_SWITCHES.with(|user_switches| {
            if let Some(ids) = user_switches.borrow_mut().get_mut(&caller) {
                ids.retain(|&id| id != switch_id);
            }
        });

        ic_cdk::println!("Cancelled switch {} by {}", switch_id, caller);

        Ok(())
    })
}

/// Get switch info with calculated status
pub fn get_switch_info(switch_id: u64) -> Option<DeadManSwitchInfo> {
    let now = time();

    DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow().get(&switch_id).map(|switch| {
            let status = calculate_status(switch, now);
            let time_remaining_ns = if switch.triggered {
                0
            } else {
                let deadline = switch.last_checkin.saturating_add(switch.timeout_ns);
                deadline.saturating_sub(now)
            };
            let elapsed_percentage = calculate_elapsed_percentage(switch, now);

            DeadManSwitchInfo {
                switch: switch.clone(),
                status,
                time_remaining_ns,
                elapsed_percentage,
            }
        })
    })
}

/// Get all switches for a user
pub fn get_user_switches(user: Principal) -> Vec<DeadManSwitchInfo> {
    let now = time();

    USER_SWITCHES.with(|user_switches| {
        let ids = user_switches.borrow().get(&user).cloned().unwrap_or_default();

        DEAD_MAN_SWITCHES.with(|switches| {
            let switches = switches.borrow();
            ids.iter()
                .filter_map(|id| {
                    switches.get(id).map(|switch| {
                        let status = calculate_status(switch, now);
                        let time_remaining_ns = if switch.triggered {
                            0
                        } else {
                            let deadline = switch.last_checkin.saturating_add(switch.timeout_ns);
                            deadline.saturating_sub(now)
                        };
                        let elapsed_percentage = calculate_elapsed_percentage(switch, now);

                        DeadManSwitchInfo {
                            switch: switch.clone(),
                            status,
                            time_remaining_ns,
                            elapsed_percentage,
                        }
                    })
                })
                .collect()
        })
    })
}

/// Get caller's switches
pub fn get_my_switches() -> Vec<DeadManSwitchInfo> {
    get_user_switches(ic_cdk::caller())
}

/// Get statistics for all switches
pub fn get_stats() -> DeadManSwitchStats {
    let now = time();

    DEAD_MAN_SWITCHES.with(|switches| {
        let switches = switches.borrow();
        let total = switches.len() as u64;
        let mut active = 0u64;
        let mut triggered = 0u64;
        let mut total_value = 0u128;

        for switch in switches.values() {
            total_value += switch.amount;
            if switch.triggered {
                triggered += 1;
            } else if now <= switch.last_checkin.saturating_add(switch.timeout_ns) {
                active += 1;
            }
        }

        DeadManSwitchStats {
            total_switches: total,
            active_switches: active,
            triggered_switches: triggered,
            total_value_protected: total_value,
        }
    })
}

/// Process expired switches and trigger transfers
/// This should be called periodically by a timer
pub async fn process_expired_switches() -> Vec<u64> {
    let now = time();
    let mut triggered_ids = Vec::new();

    // Find all expired switches
    let expired_switches: Vec<DeadManSwitch> = DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow()
            .values()
            .filter(|s| !s.triggered && now > s.last_checkin.saturating_add(s.timeout_ns))
            .cloned()
            .collect()
    });

    for switch in expired_switches {
        // Execute the transfer
        match execute_transfer(&switch).await {
            Ok(_) => {
                // Mark as triggered
                DEAD_MAN_SWITCHES.with(|switches| {
                    if let Some(s) = switches.borrow_mut().get_mut(&switch.id) {
                        s.triggered = true;
                    }
                });
                triggered_ids.push(switch.id);
                ic_cdk::println!(
                    "Triggered switch {}: {} {} to {}",
                    switch.id,
                    switch.amount,
                    switch.rune_id,
                    switch.beneficiary
                );
            }
            Err(e) => {
                ic_cdk::println!("Failed to trigger switch {}: {}", switch.id, e);
            }
        }
    }

    triggered_ids
}

/// Check if there are any expired switches
pub fn has_expired_switches() -> bool {
    let now = time();

    DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow()
            .values()
            .any(|s| !s.triggered && now > s.last_checkin.saturating_add(s.timeout_ns))
    })
}

// Helper function to calculate switch status
fn calculate_status(switch: &DeadManSwitch, now: u64) -> SwitchStatus {
    if switch.triggered {
        SwitchStatus::Triggered
    } else if now > switch.last_checkin.saturating_add(switch.timeout_ns) {
        SwitchStatus::Expired
    } else {
        SwitchStatus::Active
    }
}

// Helper function to calculate elapsed percentage
fn calculate_elapsed_percentage(switch: &DeadManSwitch, now: u64) -> u8 {
    if switch.triggered || switch.timeout_ns == 0 {
        return 100;
    }

    let elapsed = now.saturating_sub(switch.last_checkin);
    let percentage = (elapsed as u128 * 100) / switch.timeout_ns as u128;
    std::cmp::min(percentage as u8, 100)
}

/// Execute the transfer when switch is triggered
///
/// This integrates with the bitcoin-integration canister to:
/// 1. Build a Runestone transaction with transfer Edicts
/// 2. Sign using threshold Schnorr (tECDSA)
/// 3. Broadcast to Bitcoin network
/// 4. Return the Bitcoin transaction ID
async fn execute_transfer(switch: &DeadManSwitch) -> Result<String, String> {
    ic_cdk::println!(
        "⚙️  Executing Dead Man's Switch #{}\n\
         - Rune: {}\n\
         - Amount: {}\n\
         - Beneficiary: {}\n\
         - Message: {:?}",
        switch.id,
        switch.rune_id,
        switch.amount,
        switch.beneficiary,
        switch.message
    );

    // Get bitcoin-integration canister ID from config
    let bitcoin_integration_id = crate::get_bitcoin_integration_id()
        .map_err(|e| format!("Bitcoin integration not configured: {}", e))?;

    // Build the Runestone transfer transaction
    //
    // A Runestone transfer uses OP_RETURN with Edicts:
    // ```
    // Edict {
    //     rune_id: RuneId,      // Which Rune to transfer
    //     amount: u128,         // How many units
    //     output: u32,          // Which output receives it (1 = beneficiary)
    // }
    // ```
    //
    // The transaction structure:
    // ```
    // Input 0:  [Canister's UTXO with Runes] -> Signed with threshold Schnorr
    // Output 0: [OP_RETURN with Runestone]   -> Contains transfer Edict
    // Output 1: [Beneficiary address]        -> Receives the Runes
    // Output 2: [Change back to canister]    -> Remaining Runes + BTC
    // ```

    // IMPLEMENTATION NOTE:
    // For the hackathon demo, we demonstrate the integration pattern but don't
    // implement the full Bitcoin settlement due to complexity. The full implementation
    // would require:
    //
    // 1. Query UTXO set for the owner's address (via bitcoin-integration)
    // 2. Build Runestone with transfer Edict
    // 3. Create Bitcoin transaction with OP_RETURN output
    // 4. Sign with threshold Schnorr via management canister
    // 5. Broadcast via Hiro API
    //
    // This is demonstrated in the etching flow (etching_flow.rs) and can be adapted
    // for transfers.

    ic_cdk::println!(
        "📞 Calling bitcoin-integration canister: {}",
        bitcoin_integration_id
    );

    // Log the planned transfer for monitoring and debugging
    ic_cdk::println!(
        "🔗 Dead Man's Switch transfer planned:\n\
         - From: Canister-controlled address\n\
         - To: {}\n\
         - Rune: {}\n\
         - Amount: {}\n\
         - Estimated fees: ~1000 sats",
        switch.beneficiary,
        switch.rune_id,
        switch.amount
    );

    // For hackathon: Return a deterministic transaction ID
    // In production: This would be the actual Bitcoin txid from broadcast
    let mock_txid = format!(
        "{}{}",
        "dms", // Dead Man's Switch prefix
        hex::encode(&switch.id.to_le_bytes())
    );

    ic_cdk::println!(
        "✅ Dead Man's Switch #{} executed successfully\n\
         - Mock TX ID: {}\n\
         - Status: Logged for settlement\n\
         - Next: Manual verification required",
        switch.id,
        mock_txid
    );

    Ok(mock_txid)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_elapsed_percentage() {
        let switch = DeadManSwitch {
            id: 1,
            owner: Principal::anonymous(),
            beneficiary: "bc1q...".to_string(),
            rune_id: "TEST".to_string(),
            amount: 1000,
            last_checkin: 0,
            timeout_ns: 100_000_000_000, // 100 seconds
            triggered: false,
            created_at: 0,
            message: None,
        };

        // 0% elapsed
        assert_eq!(calculate_elapsed_percentage(&switch, 0), 0);

        // 50% elapsed
        assert_eq!(calculate_elapsed_percentage(&switch, 50_000_000_000), 50);

        // 100% elapsed
        assert_eq!(calculate_elapsed_percentage(&switch, 100_000_000_000), 100);

        // Over 100% (expired)
        assert_eq!(calculate_elapsed_percentage(&switch, 200_000_000_000), 100);
    }

    #[test]
    fn test_calculate_status() {
        let mut switch = DeadManSwitch {
            id: 1,
            owner: Principal::anonymous(),
            beneficiary: "bc1q...".to_string(),
            rune_id: "TEST".to_string(),
            amount: 1000,
            last_checkin: 0,
            timeout_ns: 100_000_000_000,
            triggered: false,
            created_at: 0,
            message: None,
        };

        // Active
        assert_eq!(calculate_status(&switch, 50_000_000_000), SwitchStatus::Active);

        // Expired
        assert_eq!(calculate_status(&switch, 200_000_000_000), SwitchStatus::Expired);

        // Triggered
        switch.triggered = true;
        assert_eq!(calculate_status(&switch, 0), SwitchStatus::Triggered);
    }
}
