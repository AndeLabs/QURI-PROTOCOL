use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;
use serde::Serialize;
use std::collections::HashMap;

/// ckBTC Integration Module
///
/// Enables instant Rune minting using ckBTC (Chain-Key Bitcoin) on ICP.
/// Benefits:
/// - 1-2 second finality (vs 10-60 min for on-chain Bitcoin)
/// - Fees < $0.01 (vs $5-20 for Bitcoin)
/// - Native ICP integration (no bridges)
/// - Foundation for DeFi features (staking, liquidity pools)

// ============================================================================
// ckBTC Ledger Canister Interface (ICRC-1 + ICRC-2)
// ============================================================================

/// ckBTC Ledger Canister ID
/// Mainnet: mxzaz-hqaaa-aaaar-qaada-cai
pub const CKBTC_LEDGER_MAINNET: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
pub const CKBTC_LEDGER_TESTNET: &str = "mc6ru-gyaaa-aaaar-qaaaq-cai";

/// ICRC-1 Account
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

/// ICRC-1 Transfer Arguments
#[derive(CandidType, Deserialize)]
pub struct TransferArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub to: Account,
    pub amount: u64,
    pub fee: Option<u64>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

/// ICRC-1 Transfer Result
#[derive(CandidType, Deserialize, Debug)]
pub enum TransferResult {
    Ok(u64), // Block index
    Err(TransferError),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum TransferError {
    BadFee { expected_fee: u64 },
    BadBurn { min_burn_amount: u64 },
    InsufficientFunds { balance: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u64 },
    TemporarilyUnavailable,
    GenericError { error_code: u64, message: String },
}

/// ICRC-2 Approve Arguments
#[derive(CandidType, Deserialize)]
pub struct ApproveArgs {
    pub from_subaccount: Option<[u8; 32]>,
    pub spender: Account,
    pub amount: u64,
    pub expected_allowance: Option<u64>,
    pub expires_at: Option<u64>,
    pub fee: Option<u64>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

/// ICRC-2 Approve Result
#[derive(CandidType, Deserialize, Debug)]
pub enum ApproveResult {
    Ok(u64), // Block index
    Err(ApproveError),
}

#[derive(CandidType, Deserialize, Debug)]
pub enum ApproveError {
    BadFee { expected_fee: u64 },
    InsufficientFunds { balance: u64 },
    AllowanceChanged { current_allowance: u64 },
    Expired { ledger_time: u64 },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: u64 },
    TemporarilyUnavailable,
    GenericError { error_code: u64, message: String },
}

/// ICRC-2 Transfer From Arguments
#[derive(CandidType, Deserialize)]
pub struct TransferFromArgs {
    pub spender_subaccount: Option<[u8; 32]>,
    pub from: Account,
    pub to: Account,
    pub amount: u64,
    pub fee: Option<u64>,
    pub memo: Option<Vec<u8>>,
    pub created_at_time: Option<u64>,
}

/// ICRC-2 Transfer From Result
pub type TransferFromResult = TransferResult;

// ============================================================================
// QURI ckBTC Types
// ============================================================================

/// ckBTC Payment Record
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CkBTCPayment {
    pub rune_id: String,
    pub payer: Principal,
    pub amount: u64,
    pub block_index: u64,
    pub timestamp: u64,
    pub tx_type: PaymentType,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum PaymentType {
    RuneMint,
    StakingDeposit,
    StakingWithdrawal,
    LiquidityAdd,
    LiquidityRemove,
}

/// ckBTC Integration Client
pub struct CkBTCClient {
    ledger_id: Principal,
    treasury_account: Account,
}

impl CkBTCClient {
    /// Create new ckBTC client
    pub fn new(network: &str) -> Self {
        let ledger_str = match network {
            "mainnet" => CKBTC_LEDGER_MAINNET,
            "testnet" => CKBTC_LEDGER_TESTNET,
            _ => CKBTC_LEDGER_MAINNET,
        };

        let ledger_id = Principal::from_text(ledger_str)
            .expect("Invalid ckBTC ledger canister ID");

        // Treasury receives all ckBTC payments
        let treasury_account = Account {
            owner: ic_cdk::id(), // This canister
            subaccount: Some([0u8; 32]), // Treasury subaccount
        };

        Self {
            ledger_id,
            treasury_account,
        }
    }

    /// Check ckBTC balance of an account
    pub async fn balance_of(&self, account: Account) -> Result<u64, String> {
        let result: CallResult<(u64,)> = ic_cdk::call(
            self.ledger_id,
            "icrc1_balance_of",
            (account,),
        )
        .await;

        match result {
            Ok((balance,)) => Ok(balance),
            Err((code, msg)) => Err(format!("Failed to query balance: {:?} - {}", code, msg)),
        }
    }

    /// Transfer ckBTC from user to treasury
    ///
    /// User must have approved this canister via ICRC-2 approve() first.
    pub async fn transfer_from_user(
        &self,
        from: Principal,
        amount: u64,
    ) -> Result<u64, String> {
        let from_account = Account {
            owner: from,
            subaccount: None,
        };

        let args = TransferFromArgs {
            spender_subaccount: None,
            from: from_account,
            to: self.treasury_account.clone(),
            amount,
            fee: None, // Use default fee
            memo: Some(b"QURI_RUNE_MINT".to_vec()),
            created_at_time: Some(ic_cdk::api::time()),
        };

        let result: CallResult<(TransferFromResult,)> = ic_cdk::call(
            self.ledger_id,
            "icrc2_transfer_from",
            (args,),
        )
        .await;

        match result {
            Ok((TransferResult::Ok(block_index),)) => Ok(block_index),
            Ok((TransferResult::Err(err),)) => {
                Err(format!("Transfer failed: {:?}", err))
            }
            Err((code, msg)) => {
                Err(format!("Call failed: {:?} - {}", code, msg))
            }
        }
    }

    /// Transfer ckBTC from treasury to user (for rewards, withdrawals)
    pub async fn transfer_to_user(
        &self,
        to: Principal,
        amount: u64,
        memo: Vec<u8>,
    ) -> Result<u64, String> {
        let to_account = Account {
            owner: to,
            subaccount: None,
        };

        let args = TransferArgs {
            from_subaccount: Some([0u8; 32]), // Treasury subaccount
            to: to_account,
            amount,
            fee: None,
            memo: Some(memo),
            created_at_time: Some(ic_cdk::api::time()),
        };

        let result: CallResult<(TransferResult,)> = ic_cdk::call(
            self.ledger_id,
            "icrc1_transfer",
            (args,),
        )
        .await;

        match result {
            Ok((TransferResult::Ok(block_index),)) => Ok(block_index),
            Ok((TransferResult::Err(err),)) => {
                Err(format!("Transfer failed: {:?}", err))
            }
            Err((code, msg)) => {
                Err(format!("Call failed: {:?} - {}", code, msg))
            }
        }
    }

    /// Get treasury account
    pub fn get_treasury_account(&self) -> Account {
        self.treasury_account.clone()
    }
}

// ============================================================================
// Payment Storage
// ============================================================================

thread_local! {
    static CKBTC_PAYMENTS: std::cell::RefCell<HashMap<String, Vec<CkBTCPayment>>> =
        std::cell::RefCell::new(HashMap::new());
}

/// Record a ckBTC payment
pub fn record_payment(payment: CkBTCPayment) {
    CKBTC_PAYMENTS.with(|payments| {
        let mut map = payments.borrow_mut();
        map.entry(payment.rune_id.clone())
            .or_insert_with(Vec::new)
            .push(payment);
    });
}

/// Get payments for a rune
pub fn get_payments_for_rune(rune_id: &str) -> Vec<CkBTCPayment> {
    CKBTC_PAYMENTS.with(|payments| {
        payments
            .borrow()
            .get(rune_id)
            .cloned()
            .unwrap_or_default()
    })
}

/// Get all payments by a user
pub fn get_payments_by_user(user: Principal) -> Vec<CkBTCPayment> {
    CKBTC_PAYMENTS.with(|payments| {
        payments
            .borrow()
            .values()
            .flatten()
            .filter(|p| p.payer == user)
            .cloned()
            .collect()
    })
}

/// Get total ckBTC received for a rune
pub fn get_total_received(rune_id: &str) -> u64 {
    get_payments_for_rune(rune_id)
        .iter()
        .map(|p| p.amount)
        .sum()
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Convert satoshis to ckBTC (1 ckBTC = 100,000,000 satoshis)
pub fn sats_to_ckbtc(sats: u64) -> u64 {
    sats
}

/// Convert ckBTC to satoshis
pub fn ckbtc_to_sats(ckbtc: u64) -> u64 {
    ckbtc
}

/// Format ckBTC amount for display
pub fn format_ckbtc(amount: u64) -> String {
    let btc = amount as f64 / 100_000_000.0;
    format!("{:.8} ckBTC", btc)
}

/// Validate ckBTC amount (must be > dust limit)
pub fn validate_amount(amount: u64) -> Result<(), String> {
    const MIN_AMOUNT: u64 = 1000; // 0.00001 ckBTC minimum

    if amount < MIN_AMOUNT {
        return Err(format!(
            "Amount too small. Minimum: {} satoshis",
            MIN_AMOUNT
        ));
    }

    Ok(())
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_ckbtc() {
        assert_eq!(format_ckbtc(100_000_000), "1.00000000 ckBTC");
        assert_eq!(format_ckbtc(50_000_000), "0.50000000 ckBTC");
        assert_eq!(format_ckbtc(1_000), "0.00001000 ckBTC");
    }

    #[test]
    fn test_validate_amount() {
        assert!(validate_amount(1000).is_ok());
        assert!(validate_amount(999).is_err());
        assert!(validate_amount(100_000_000).is_ok());
    }

    #[test]
    fn test_payment_storage() {
        let payment = CkBTCPayment {
            rune_id: "840000:5".to_string(),
            payer: Principal::anonymous(),
            amount: 100_000,
            block_index: 12345,
            timestamp: 1234567890,
            tx_type: PaymentType::RuneMint,
        };

        record_payment(payment.clone());

        let payments = get_payments_for_rune("840000:5");
        assert_eq!(payments.len(), 1);
        assert_eq!(payments[0].amount, 100_000);

        let total = get_total_received("840000:5");
        assert_eq!(total, 100_000);
    }

    #[test]
    fn test_get_payments_by_user() {
        let user = Principal::anonymous();

        let payment1 = CkBTCPayment {
            rune_id: "840000:1".to_string(),
            payer: user,
            amount: 50_000,
            block_index: 1,
            timestamp: 1000,
            tx_type: PaymentType::RuneMint,
        };

        let payment2 = CkBTCPayment {
            rune_id: "840000:2".to_string(),
            payer: user,
            amount: 75_000,
            block_index: 2,
            timestamp: 2000,
            tx_type: PaymentType::StakingDeposit,
        };

        record_payment(payment1);
        record_payment(payment2);

        let user_payments = get_payments_by_user(user);
        assert_eq!(user_payments.len(), 2);

        let total: u64 = user_payments.iter().map(|p| p.amount).sum();
        assert_eq!(total, 125_000);
    }
}
