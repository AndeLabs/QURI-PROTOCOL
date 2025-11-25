/**
 * Balances Module for Virtual Runes
 *
 * Manages user balances for Virtual Runes on ICP.
 * Each user can hold balances of multiple different runes.
 *
 * Features:
 * - Track rune balances per user
 * - Credit/debit operations
 * - Transfer between users
 * - Lock/unlock for trading
 */

use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

/// User balance for a specific rune
#[derive(CandidType, Deserialize, Clone, Debug, Default)]
pub struct RuneBalance {
    /// Available balance (can be traded/transferred)
    pub available: u64,
    /// Locked balance (in pending trades)
    pub locked: u64,
}

impl RuneBalance {
    pub fn total(&self) -> u64 {
        self.available.saturating_add(self.locked)
    }

    pub fn can_spend(&self, amount: u64) -> bool {
        self.available >= amount
    }
}

/// Key for balance storage: (Principal, RuneId)
type BalanceKey = (Principal, String);

/// Balance change record for audit trail
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BalanceChange {
    pub id: u64,
    pub user: Principal,
    pub rune_id: String,
    pub change_type: BalanceChangeType,
    pub amount: u64,
    pub balance_before: u64,
    pub balance_after: u64,
    pub timestamp: u64,
    pub reference: Option<String>, // trade_id, transfer_id, etc.
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum BalanceChangeType {
    /// Initial mint when pool is created
    Mint,
    /// Credit from buying runes
    Buy,
    /// Debit from selling runes
    Sell,
    /// Transfer received
    TransferIn,
    /// Transfer sent
    TransferOut,
    /// Locked for pending trade
    Lock,
    /// Unlocked from cancelled trade
    Unlock,
    /// Deposited to trading pool
    PoolDeposit,
    /// Withdrawn from trading pool
    PoolWithdraw,
}

// Thread-local storage for balances
thread_local! {
    /// User balances: (Principal, RuneId) -> RuneBalance
    static BALANCES: RefCell<HashMap<BalanceKey, RuneBalance>> = RefCell::new(HashMap::new());

    /// Balance change history for auditing
    static BALANCE_HISTORY: RefCell<Vec<BalanceChange>> = RefCell::new(Vec::new());

    /// Counter for balance changes
    static CHANGE_COUNTER: RefCell<u64> = RefCell::new(0);
}

// ============================================================================
// BALANCE QUERIES
// ============================================================================

/// Get user's balance for a specific rune
pub fn get_balance(user: Principal, rune_id: &str) -> RuneBalance {
    let key = (user, rune_id.to_string());
    BALANCES.with(|b| {
        b.borrow().get(&key).cloned().unwrap_or_default()
    })
}

/// Get all balances for a user
pub fn get_user_balances(user: Principal) -> Vec<(String, RuneBalance)> {
    BALANCES.with(|b| {
        b.borrow()
            .iter()
            .filter(|((owner, _), _)| *owner == user)
            .map(|((_, rune_id), balance)| (rune_id.clone(), balance.clone()))
            .collect()
    })
}

/// Get all holders of a specific rune
pub fn get_rune_holders(rune_id: &str) -> Vec<(Principal, RuneBalance)> {
    BALANCES.with(|b| {
        b.borrow()
            .iter()
            .filter(|((_, rid), balance)| rid == rune_id && balance.total() > 0)
            .map(|((owner, _), balance)| (*owner, balance.clone()))
            .collect()
    })
}

/// Get total circulating supply for a rune (sum of all user balances)
pub fn get_circulating_supply(rune_id: &str) -> u64 {
    BALANCES.with(|b| {
        b.borrow()
            .iter()
            .filter(|((_, rid), _)| rid == rune_id)
            .map(|(_, balance)| balance.total())
            .sum()
    })
}

// ============================================================================
// BALANCE MODIFICATIONS
// ============================================================================

/// Credit runes to a user (e.g., from buying or minting)
pub fn credit_balance(
    user: Principal,
    rune_id: &str,
    amount: u64,
    change_type: BalanceChangeType,
    reference: Option<String>,
) -> Result<RuneBalance, String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    let key = (user, rune_id.to_string());
    let now = ic_cdk::api::time();

    BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(key.clone()).or_default();

        let balance_before = balance.available;
        balance.available = balance.available.saturating_add(amount);
        let balance_after = balance.available;

        // Record change
        record_balance_change(BalanceChange {
            id: next_change_id(),
            user,
            rune_id: rune_id.to_string(),
            change_type,
            amount,
            balance_before,
            balance_after,
            timestamp: now,
            reference,
        });

        Ok(balance.clone())
    })
}

/// Debit runes from a user (e.g., from selling)
pub fn debit_balance(
    user: Principal,
    rune_id: &str,
    amount: u64,
    change_type: BalanceChangeType,
    reference: Option<String>,
) -> Result<RuneBalance, String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    let key = (user, rune_id.to_string());
    let now = ic_cdk::api::time();

    BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(key.clone()).or_default();

        if balance.available < amount {
            return Err(format!(
                "Insufficient balance: have {}, need {}",
                balance.available, amount
            ));
        }

        let balance_before = balance.available;
        balance.available = balance.available.saturating_sub(amount);
        let balance_after = balance.available;

        // Record change
        record_balance_change(BalanceChange {
            id: next_change_id(),
            user,
            rune_id: rune_id.to_string(),
            change_type,
            amount,
            balance_before,
            balance_after,
            timestamp: now,
            reference,
        });

        Ok(balance.clone())
    })
}

/// Lock balance for a pending operation
pub fn lock_balance(
    user: Principal,
    rune_id: &str,
    amount: u64,
    reference: Option<String>,
) -> Result<RuneBalance, String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    let key = (user, rune_id.to_string());
    let now = ic_cdk::api::time();

    BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(key.clone()).or_default();

        if balance.available < amount {
            return Err(format!(
                "Insufficient available balance: have {}, need {}",
                balance.available, amount
            ));
        }

        let balance_before = balance.available;
        balance.available = balance.available.saturating_sub(amount);
        balance.locked = balance.locked.saturating_add(amount);
        let balance_after = balance.available;

        // Record change
        record_balance_change(BalanceChange {
            id: next_change_id(),
            user,
            rune_id: rune_id.to_string(),
            change_type: BalanceChangeType::Lock,
            amount,
            balance_before,
            balance_after,
            timestamp: now,
            reference,
        });

        Ok(balance.clone())
    })
}

/// Unlock balance from a cancelled operation
pub fn unlock_balance(
    user: Principal,
    rune_id: &str,
    amount: u64,
    reference: Option<String>,
) -> Result<RuneBalance, String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    let key = (user, rune_id.to_string());
    let now = ic_cdk::api::time();

    BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(key.clone()).or_default();

        if balance.locked < amount {
            return Err(format!(
                "Insufficient locked balance: have {}, need {}",
                balance.locked, amount
            ));
        }

        let balance_before = balance.available;
        balance.locked = balance.locked.saturating_sub(amount);
        balance.available = balance.available.saturating_add(amount);
        let balance_after = balance.available;

        // Record change
        record_balance_change(BalanceChange {
            id: next_change_id(),
            user,
            rune_id: rune_id.to_string(),
            change_type: BalanceChangeType::Unlock,
            amount,
            balance_before,
            balance_after,
            timestamp: now,
            reference,
        });

        Ok(balance.clone())
    })
}

/// Consume locked balance (after trade completion)
pub fn consume_locked(
    user: Principal,
    rune_id: &str,
    amount: u64,
) -> Result<(), String> {
    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    let key = (user, rune_id.to_string());

    BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(key.clone()).or_default();

        if balance.locked < amount {
            return Err(format!(
                "Insufficient locked balance: have {}, need {}",
                balance.locked, amount
            ));
        }

        balance.locked = balance.locked.saturating_sub(amount);
        Ok(())
    })
}

/// Transfer runes between users
pub fn transfer_runes(
    from: Principal,
    to: Principal,
    rune_id: &str,
    amount: u64,
) -> Result<(), String> {
    if from == to {
        return Err("Cannot transfer to self".to_string());
    }

    if amount == 0 {
        return Err("Amount must be greater than 0".to_string());
    }

    // Debit from sender
    debit_balance(
        from,
        rune_id,
        amount,
        BalanceChangeType::TransferOut,
        Some(format!("to:{}", to)),
    )?;

    // Credit to receiver
    credit_balance(
        to,
        rune_id,
        amount,
        BalanceChangeType::TransferIn,
        Some(format!("from:{}", from)),
    )?;

    Ok(())
}

/// Mint initial balance to pool creator when creating pool
pub fn mint_to_pool_creator(
    creator: Principal,
    rune_id: &str,
    amount: u64,
) -> Result<RuneBalance, String> {
    credit_balance(
        creator,
        rune_id,
        amount,
        BalanceChangeType::Mint,
        Some("pool_creation".to_string()),
    )
}

// ============================================================================
// HISTORY & AUDITING
// ============================================================================

fn next_change_id() -> u64 {
    CHANGE_COUNTER.with(|c| {
        let id = *c.borrow();
        *c.borrow_mut() = id + 1;
        id
    })
}

fn record_balance_change(change: BalanceChange) {
    BALANCE_HISTORY.with(|h| {
        h.borrow_mut().push(change);
        // Keep last 10000 changes
        if h.borrow().len() > 10000 {
            h.borrow_mut().remove(0);
        }
    });
}

/// Get balance change history for a user
pub fn get_user_balance_history(user: Principal, limit: usize) -> Vec<BalanceChange> {
    BALANCE_HISTORY.with(|h| {
        h.borrow()
            .iter()
            .filter(|c| c.user == user)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    })
}

/// Get balance change history for a rune
pub fn get_rune_balance_history(rune_id: &str, limit: usize) -> Vec<BalanceChange> {
    BALANCE_HISTORY.with(|h| {
        h.borrow()
            .iter()
            .filter(|c| c.rune_id == rune_id)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_principal() -> Principal {
        Principal::from_text("aaaaa-aa").unwrap()
    }

    fn test_principal_2() -> Principal {
        Principal::from_text("2vxsx-fae").unwrap()
    }

    #[test]
    fn test_credit_and_debit() {
        let user = test_principal();
        let rune_id = "test_rune";

        // Credit
        let balance = credit_balance(
            user,
            rune_id,
            1000,
            BalanceChangeType::Mint,
            None,
        ).unwrap();
        assert_eq!(balance.available, 1000);
        assert_eq!(balance.locked, 0);

        // Debit
        let balance = debit_balance(
            user,
            rune_id,
            300,
            BalanceChangeType::Sell,
            None,
        ).unwrap();
        assert_eq!(balance.available, 700);

        // Over-debit should fail
        let result = debit_balance(
            user,
            rune_id,
            1000,
            BalanceChangeType::Sell,
            None,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_lock_unlock() {
        let user = test_principal();
        let rune_id = "test_rune_2";

        // Setup
        credit_balance(user, rune_id, 1000, BalanceChangeType::Mint, None).unwrap();

        // Lock
        let balance = lock_balance(user, rune_id, 400, None).unwrap();
        assert_eq!(balance.available, 600);
        assert_eq!(balance.locked, 400);

        // Unlock
        let balance = unlock_balance(user, rune_id, 200, None).unwrap();
        assert_eq!(balance.available, 800);
        assert_eq!(balance.locked, 200);
    }

    #[test]
    fn test_transfer() {
        let from = test_principal();
        let to = test_principal_2();
        let rune_id = "test_rune_3";

        // Setup
        credit_balance(from, rune_id, 1000, BalanceChangeType::Mint, None).unwrap();

        // Transfer
        transfer_runes(from, to, rune_id, 300).unwrap();

        let from_balance = get_balance(from, rune_id);
        let to_balance = get_balance(to, rune_id);

        assert_eq!(from_balance.available, 700);
        assert_eq!(to_balance.available, 300);
    }
}
