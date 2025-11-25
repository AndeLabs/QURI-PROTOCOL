/**
 * ICP Ledger Integration Module
 *
 * Handles ICRC-1 compliant transfers with the ICP Ledger canister.
 * Supports deposits, withdrawals, and balance queries.
 *
 * Best Practices:
 * - Always verify transfers with block index
 * - Handle all error cases explicitly
 * - Use subaccounts for user deposits
 * - Implement retry logic for critical operations
 */

use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::call::CallResult;
use ic_ledger_types::{
    AccountIdentifier, Memo, Subaccount, Tokens, DEFAULT_SUBACCOUNT,
    MAINNET_LEDGER_CANISTER_ID,
};

/// ICP Ledger canister ID (mainnet)
pub const ICP_LEDGER_CANISTER_ID: &str = "ryjl3-tyaaa-aaaaa-aaaba-cai";

/// Default transfer fee for ICP (10,000 e8s = 0.0001 ICP)
pub const ICP_TRANSFER_FEE: u64 = 10_000;

/// Minimum deposit amount (must be greater than fee)
pub const MIN_DEPOSIT_AMOUNT: u64 = 100_000; // 0.001 ICP

// ============================================================================
// ICRC-1 Types (Standard Interface)
// ============================================================================

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferArg {
    pub from_subaccount: Option<Vec<u8>>,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    TemporarilyUnavailable,
    Duplicate { duplicate_of: Nat },
    GenericError { error_code: Nat, message: String },
}

pub type TransferResult = Result<Nat, TransferError>;

// ============================================================================
// LEDGER OPERATIONS
// ============================================================================

/// Get the ICP Ledger canister principal
pub fn get_ledger_principal() -> Principal {
    Principal::from_text(ICP_LEDGER_CANISTER_ID).expect("Invalid ledger canister ID")
}

/// Generate a unique subaccount for a user based on their principal
/// This allows tracking deposits per user
pub fn principal_to_subaccount(principal: &Principal) -> Subaccount {
    let mut subaccount = [0u8; 32];
    let principal_bytes = principal.as_slice();
    let len = principal_bytes.len().min(32);
    subaccount[..len].copy_from_slice(&principal_bytes[..len]);
    Subaccount(subaccount)
}

/// Get the canister's account identifier for receiving ICP
pub fn get_canister_account() -> AccountIdentifier {
    let canister_id = ic_cdk::api::id();
    AccountIdentifier::new(&canister_id, &DEFAULT_SUBACCOUNT)
}

/// Get the deposit account for a specific user
/// Users should send ICP to this account
pub fn get_user_deposit_account(user: Principal) -> AccountIdentifier {
    let canister_id = ic_cdk::api::id();
    let subaccount = principal_to_subaccount(&user);
    AccountIdentifier::new(&canister_id, &subaccount)
}

/// Query ICP balance of an account
pub async fn get_icp_balance(account: AccountIdentifier) -> Result<u64, String> {
    let ledger = get_ledger_principal();

    let result: CallResult<(Tokens,)> = ic_cdk::call(
        ledger,
        "account_balance",
        (ic_ledger_types::AccountBalanceArgs { account },),
    )
    .await;

    match result {
        Ok((tokens,)) => Ok(tokens.e8s()),
        Err((code, msg)) => Err(format!("Failed to query balance: {:?} - {}", code, msg)),
    }
}

/// Query ICRC-1 balance of an account
pub async fn get_icrc1_balance(owner: Principal, subaccount: Option<Vec<u8>>) -> Result<u64, String> {
    let ledger = get_ledger_principal();

    let account = Account { owner, subaccount };

    let result: CallResult<(Nat,)> = ic_cdk::call(ledger, "icrc1_balance_of", (account,)).await;

    match result {
        Ok((balance,)) => {
            // Convert Nat to u64
            let balance_u64: u64 = balance
                .0
                .try_into()
                .map_err(|_| "Balance too large for u64".to_string())?;
            Ok(balance_u64)
        }
        Err((code, msg)) => Err(format!("Failed to query ICRC-1 balance: {:?} - {}", code, msg)),
    }
}

/// Transfer ICP from canister to a user using ICRC-1
pub async fn transfer_icp_to_user(
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    if amount <= ICP_TRANSFER_FEE {
        return Err(format!(
            "Amount {} must be greater than fee {}",
            amount, ICP_TRANSFER_FEE
        ));
    }

    let ledger = get_ledger_principal();
    let transfer_amount = amount.saturating_sub(ICP_TRANSFER_FEE);

    let transfer_args = TransferArg {
        from_subaccount: None, // From canister's default subaccount
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount: Nat::from(transfer_amount),
        fee: Some(Nat::from(ICP_TRANSFER_FEE)),
        memo,
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: CallResult<(TransferResult,)> =
        ic_cdk::call(ledger, "icrc1_transfer", (transfer_args,)).await;

    match result {
        Ok((Ok(block_index),)) => {
            let block: u64 = block_index
                .0
                .try_into()
                .map_err(|_| "Block index too large".to_string())?;
            Ok(block)
        }
        Ok((Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

/// Transfer ICP from a user's subaccount to the canister's main account
/// Used when processing a buy order
pub async fn transfer_from_user_subaccount(
    user: Principal,
    amount: u64,
) -> Result<u64, String> {
    if amount <= ICP_TRANSFER_FEE {
        return Err(format!(
            "Amount {} must be greater than fee {}",
            amount, ICP_TRANSFER_FEE
        ));
    }

    let ledger = get_ledger_principal();
    let canister_id = ic_cdk::api::id();
    let user_subaccount = principal_to_subaccount(&user);

    let transfer_args = TransferArg {
        from_subaccount: Some(user_subaccount.0.to_vec()),
        to: Account {
            owner: canister_id,
            subaccount: None, // To main canister account
        },
        amount: Nat::from(amount.saturating_sub(ICP_TRANSFER_FEE)),
        fee: Some(Nat::from(ICP_TRANSFER_FEE)),
        memo: Some(b"trade".to_vec()),
        created_at_time: Some(ic_cdk::api::time()),
    };

    let result: CallResult<(TransferResult,)> =
        ic_cdk::call(ledger, "icrc1_transfer", (transfer_args,)).await;

    match result {
        Ok((Ok(block_index),)) => {
            let block: u64 = block_index
                .0
                .try_into()
                .map_err(|_| "Block index too large".to_string())?;
            Ok(block)
        }
        Ok((Err(e),)) => Err(format!("Transfer failed: {:?}", e)),
        Err((code, msg)) => Err(format!("Call failed: {:?} - {}", code, msg)),
    }
}

/// Get the user's deposit balance in their subaccount
pub async fn get_user_deposit_balance(user: Principal) -> Result<u64, String> {
    let canister_id = ic_cdk::api::id();
    let subaccount = principal_to_subaccount(&user);
    get_icrc1_balance(canister_id, Some(subaccount.0.to_vec())).await
}

/// Get the canister's total ICP balance
pub async fn get_canister_balance() -> Result<u64, String> {
    let canister_id = ic_cdk::api::id();
    get_icrc1_balance(canister_id, None).await
}

// ============================================================================
// DEPOSIT/WITHDRAWAL TRACKING
// ============================================================================

use std::cell::RefCell;
use std::collections::HashMap;

/// Track user deposits (for verification)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct DepositRecord {
    pub user: Principal,
    pub amount: u64,
    pub block_index: Option<u64>,
    pub timestamp: u64,
    pub status: DepositStatus,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum DepositStatus {
    Pending,
    Confirmed,
    Failed(String),
}

thread_local! {
    /// Pending deposits awaiting confirmation
    static PENDING_DEPOSITS: RefCell<HashMap<Principal, Vec<DepositRecord>>> = RefCell::new(HashMap::new());

    /// User ICP balances (credited after deposit verification)
    static USER_ICP_BALANCES: RefCell<HashMap<Principal, u64>> = RefCell::new(HashMap::new());
}

/// Get user's credited ICP balance (for trading)
pub fn get_user_trading_balance(user: Principal) -> u64 {
    USER_ICP_BALANCES.with(|b| *b.borrow().get(&user).unwrap_or(&0))
}

/// Credit ICP to user's trading balance
pub fn credit_user_icp(user: Principal, amount: u64) -> u64 {
    USER_ICP_BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(user).or_insert(0);
        *balance = balance.saturating_add(amount);
        *balance
    })
}

/// Debit ICP from user's trading balance
pub fn debit_user_icp(user: Principal, amount: u64) -> Result<u64, String> {
    USER_ICP_BALANCES.with(|b| {
        let mut balances = b.borrow_mut();
        let balance = balances.entry(user).or_insert(0);
        if *balance < amount {
            return Err(format!(
                "Insufficient ICP balance: have {}, need {}",
                *balance, amount
            ));
        }
        *balance = balance.saturating_sub(amount);
        Ok(*balance)
    })
}

/// Verify and credit a user's deposit
/// Call this after user claims to have deposited ICP
pub async fn verify_and_credit_deposit(user: Principal) -> Result<u64, String> {
    // Get user's deposit balance in their subaccount
    let deposit_balance = get_user_deposit_balance(user).await?;

    if deposit_balance < MIN_DEPOSIT_AMOUNT {
        return Err(format!(
            "Deposit amount {} is below minimum {}",
            deposit_balance, MIN_DEPOSIT_AMOUNT
        ));
    }

    // Transfer from user's subaccount to canister main account
    let block_index = transfer_from_user_subaccount(user, deposit_balance).await?;

    // Credit the user's trading balance (minus fee)
    let credited_amount = deposit_balance.saturating_sub(ICP_TRANSFER_FEE);
    let new_balance = credit_user_icp(user, credited_amount);

    ic_cdk::println!(
        "Deposit verified: user={}, amount={}, block={}, new_balance={}",
        user,
        credited_amount,
        block_index,
        new_balance
    );

    Ok(credited_amount)
}

/// Withdraw ICP from trading balance to user's wallet
pub async fn withdraw_icp(user: Principal, amount: u64) -> Result<u64, String> {
    // Check and debit trading balance first
    debit_user_icp(user, amount)?;

    // Transfer ICP to user
    match transfer_icp_to_user(user, amount, Some(b"withdraw".to_vec())).await {
        Ok(block_index) => {
            ic_cdk::println!(
                "Withdrawal successful: user={}, amount={}, block={}",
                user,
                amount,
                block_index
            );
            Ok(block_index)
        }
        Err(e) => {
            // Refund on failure
            credit_user_icp(user, amount);
            Err(format!("Withdrawal failed: {}", e))
        }
    }
}

// ============================================================================
// HELPERS
// ============================================================================

/// Format e8s to ICP string for display
pub fn format_icp(e8s: u64) -> String {
    let icp = e8s as f64 / 100_000_000.0;
    format!("{:.4} ICP", icp)
}

/// Convert ICP to e8s
pub fn icp_to_e8s(icp: f64) -> u64 {
    (icp * 100_000_000.0) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subaccount_generation() {
        let principal = Principal::from_text("aaaaa-aa").unwrap();
        let subaccount = principal_to_subaccount(&principal);
        assert_eq!(subaccount.0.len(), 32);
    }

    #[test]
    fn test_format_icp() {
        assert_eq!(format_icp(100_000_000), "1.0000 ICP");
        assert_eq!(format_icp(50_000_000), "0.5000 ICP");
        assert_eq!(format_icp(10_000), "0.0001 ICP");
    }

    #[test]
    fn test_icp_to_e8s() {
        assert_eq!(icp_to_e8s(1.0), 100_000_000);
        assert_eq!(icp_to_e8s(0.5), 50_000_000);
        assert_eq!(icp_to_e8s(0.0001), 10_000);
    }

    #[test]
    fn test_trading_balance() {
        let user = Principal::from_text("aaaaa-aa").unwrap();

        // Credit
        let balance = credit_user_icp(user, 1_000_000);
        assert_eq!(balance, 1_000_000);

        // Get
        assert_eq!(get_user_trading_balance(user), 1_000_000);

        // Debit
        let balance = debit_user_icp(user, 300_000).unwrap();
        assert_eq!(balance, 700_000);

        // Over-debit fails
        assert!(debit_user_icp(user, 1_000_000).is_err());
    }
}
