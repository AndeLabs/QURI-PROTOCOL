use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::call;

// ckBTC Ledger Canister IDs
const CKBTC_LEDGER_MAINNET: &str = "mxzaz-hqaaa-aaaar-qaada-cai";
const CKBTC_MINTER_MAINNET: &str = "mqygn-kiaaa-aaaar-qaadq-cai";

// ICRC-1 Standard Types
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<[u8; 32]>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferArgs {
    pub from_subaccount: Option<[u8; 32]>,
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
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

pub type TransferResult = Result<Nat, TransferError>;

#[derive(CandidType, Deserialize)]
pub struct RetrieveBtcArgs {
    pub address: String,
    pub amount: u64,
}

#[derive(CandidType, Deserialize)]
pub struct RetrieveBtcOk {
    pub block_index: u64,
}

#[derive(CandidType, Deserialize, Debug)]
pub enum RetrieveBtcError {
    MalformedAddress(String),
    AlreadyProcessing,
    AmountTooLow(u64),
    InsufficientFunds {
        balance: u64,
    },
    TemporarilyUnavailable(String),
    GenericError {
        error_code: u64,
        error_message: String,
    },
}

/// Get ckBTC balance for a principal
pub async fn get_balance(principal: Principal) -> Result<u64, String> {
    let ledger = Principal::from_text(CKBTC_LEDGER_MAINNET)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;

    let account = Account {
        owner: principal,
        subaccount: None,
    };

    let (balance,): (Nat,) = call(ledger, "icrc1_balance_of", (account,))
        .await
        .map_err(|(code, msg)| format!("Failed to get balance: {} - {}", code as u32, msg))?;

    // Convert Nat to u64 (ckBTC uses 8 decimals, like BTC satoshis)
    let balance_u64: u64 = balance
        .0
        .try_into()
        .map_err(|_| "Balance overflow".to_string())?;

    Ok(balance_u64)
}

/// Transfer ckBTC from caller to recipient
pub async fn transfer(to: Principal, amount: u64, memo: Option<Vec<u8>>) -> Result<u64, String> {
    let ledger = Principal::from_text(CKBTC_LEDGER_MAINNET)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;

    let args = TransferArgs {
        from_subaccount: None,
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount: Nat::from(amount),
        fee: None, // Let ledger calculate fee
        memo,
        created_at_time: None,
    };

    let (result,): (TransferResult,) = call(ledger, "icrc1_transfer", (args,))
        .await
        .map_err(|(code, msg)| format!("Transfer call failed: {} - {}", code as u32, msg))?;

    match result {
        Ok(block_index) => {
            let block_u64: u64 = block_index
                .0
                .try_into()
                .map_err(|_| "Block index overflow".to_string())?;
            Ok(block_u64)
        }
        Err(e) => Err(format!("Transfer failed: {:?}", e)),
    }
}

/// Charge etching fee from user to canister
pub async fn charge_etching_fee(from: Principal, amount: u64) -> Result<u64, String> {
    let canister_id = ic_cdk::api::id();

    // User must have approved canister to spend their ckBTC
    // This uses ICRC-2 approve/transferFrom pattern
    transfer_from(
        from,
        canister_id,
        amount,
        Some(b"Rune etching fee".to_vec()),
    )
    .await
}

/// Transfer ckBTC from one account to another (requires approval)
async fn transfer_from(
    from: Principal,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let ledger = Principal::from_text(CKBTC_LEDGER_MAINNET)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;

    #[derive(CandidType)]
    struct TransferFromArgs {
        from: Account,
        to: Account,
        amount: Nat,
        fee: Option<Nat>,
        memo: Option<Vec<u8>>,
        created_at_time: Option<u64>,
    }

    let args = TransferFromArgs {
        from: Account {
            owner: from,
            subaccount: None,
        },
        to: Account {
            owner: to,
            subaccount: None,
        },
        amount: Nat::from(amount),
        fee: None,
        memo,
        created_at_time: None,
    };

    let (result,): (TransferResult,) = call(ledger, "icrc2_transfer_from", (args,))
        .await
        .map_err(|(code, msg)| format!("TransferFrom call failed: {} - {}", code as u32, msg))?;

    match result {
        Ok(block_index) => {
            let block_u64: u64 = block_index
                .0
                .try_into()
                .map_err(|_| "Block index overflow".to_string())?;
            Ok(block_u64)
        }
        Err(e) => Err(format!("TransferFrom failed: {:?}", e)),
    }
}

/// Request ckBTC withdrawal to Bitcoin address
pub async fn withdraw_to_bitcoin(address: String, amount: u64) -> Result<String, String> {
    let minter = Principal::from_text(CKBTC_MINTER_MAINNET)
        .map_err(|e| format!("Invalid minter principal: {}", e))?;

    let args = RetrieveBtcArgs { address, amount };

    let (result,): (Result<RetrieveBtcOk, RetrieveBtcError>,) =
        call(minter, "retrieve_btc", (args,))
            .await
            .map_err(|(code, msg)| format!("Withdraw call failed: {} - {}", code as u32, msg))?;

    match result {
        Ok(ok) => Ok(format!(
            "Withdrawal initiated, block index: {}",
            ok.block_index
        )),
        Err(e) => Err(format!("Withdrawal failed: {:?}", e)),
    }
}

/// Get BTC deposit address for a principal
pub async fn get_btc_address(principal: Principal) -> Result<String, String> {
    let minter = Principal::from_text(CKBTC_MINTER_MAINNET)
        .map_err(|e| format!("Invalid minter principal: {}", e))?;

    #[derive(CandidType)]
    struct GetBtcAddressArgs {
        owner: Option<Principal>,
        subaccount: Option<[u8; 32]>,
    }

    let args = GetBtcAddressArgs {
        owner: Some(principal),
        subaccount: None,
    };

    let (address,): (String,) = call(minter, "get_btc_address", (args,))
        .await
        .map_err(|(code, msg)| format!("Get BTC address failed: {} - {}", code as u32, msg))?;

    Ok(address)
}

/// Update ckBTC balance from BTC deposits (call minter to check for new deposits)
pub async fn update_balance(principal: Principal) -> Result<Vec<u64>, String> {
    let minter = Principal::from_text(CKBTC_MINTER_MAINNET)
        .map_err(|e| format!("Invalid minter principal: {}", e))?;

    #[derive(CandidType)]
    struct UpdateBalanceArgs {
        owner: Option<Principal>,
        subaccount: Option<[u8; 32]>,
    }

    #[derive(CandidType, Deserialize)]
    enum UtxoStatus {
        ValueTooSmall,
        Tainted,
        Checked,
        Minted {
            block_index: u64,
            minted_amount: u64,
            utxo: (),
        },
    }

    let args = UpdateBalanceArgs {
        owner: Some(principal),
        subaccount: None,
    };

    let (utxos,): (Vec<UtxoStatus>,) = call(minter, "update_balance", (args,))
        .await
        .map_err(|(code, msg)| format!("Update balance failed: {} - {}", code as u32, msg))?;

    let minted_blocks: Vec<u64> = utxos
        .iter()
        .filter_map(|status| {
            if let UtxoStatus::Minted { block_index, .. } = status {
                Some(*block_index)
            } else {
                None
            }
        })
        .collect();

    Ok(minted_blocks)
}

/// Get ckBTC transfer fee
pub async fn get_transfer_fee() -> Result<u64, String> {
    let ledger = Principal::from_text(CKBTC_LEDGER_MAINNET)
        .map_err(|e| format!("Invalid ledger principal: {}", e))?;

    let (fee,): (Nat,) = call(ledger, "icrc1_fee", ())
        .await
        .map_err(|(code, msg)| format!("Get fee failed: {} - {}", code as u32, msg))?;

    let fee_u64: u64 = fee.0.try_into().map_err(|_| "Fee overflow".to_string())?;

    Ok(fee_u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_principal_parsing() {
        let ledger = Principal::from_text(CKBTC_LEDGER_MAINNET);
        assert!(ledger.is_ok());

        let minter = Principal::from_text(CKBTC_MINTER_MAINNET);
        assert!(minter.is_ok());
    }
}
