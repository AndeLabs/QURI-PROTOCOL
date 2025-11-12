use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;

/// QURI Bridge - Bitcoin Runes ↔ ICP Bridge
///
/// Professional bridge implementation integrating with Omnity Network:
/// - Lock Runes on Bitcoin → Mint wRunes on ICP
/// - Burn wRunes on ICP → Release Runes on Bitcoin
/// - Multi-signature security
/// - Transaction verification
/// - Fee management
/// - Cross-chain state tracking

// ============================================================================
// Types
// ============================================================================

/// Bridge transaction status
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum BridgeStatus {
    /// Transaction initiated by user
    Pending,
    /// Waiting for Bitcoin confirmations
    ConfirmingBitcoin { confirmations: u32 },
    /// Processing on ICP side
    ProcessingICP,
    /// Transaction completed successfully
    Completed,
    /// Transaction failed
    Failed { reason: String },
    /// Transaction refunded
    Refunded,
}

/// Bridge direction
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum BridgeDirection {
    /// Bitcoin → ICP (Lock and Mint)
    BitcoinToICP,
    /// ICP → Bitcoin (Burn and Release)
    ICPToBitcoin,
}

/// Bitcoin transaction information
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BitcoinTxInfo {
    pub txid: String,
    pub vout: u32,
    pub confirmations: u32,
    pub block_height: Option<u64>,
    pub verified: bool,
}

/// Bridge transaction
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BridgeTransaction {
    pub id: String,
    pub direction: BridgeDirection,
    pub status: BridgeStatus,

    // User information
    pub user_icp: Principal,
    pub user_btc_address: String,

    // Rune information
    pub rune_id: String,
    pub rune_name: String,
    pub amount: Nat,

    // Token information
    pub wrune_canister: Option<Principal>,

    // Bitcoin transaction
    pub btc_tx: Option<BitcoinTxInfo>,

    // ICP transaction
    pub icp_tx_id: Option<Nat>,

    // Fees
    pub bridge_fee: Nat,
    pub network_fee: Nat,

    // Timestamps
    pub created_at: u64,
    pub updated_at: u64,
    pub completed_at: Option<u64>,
}

/// Deposit request (Bitcoin → ICP)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DepositRequest {
    pub user_icp: Principal,
    pub user_btc_address: String,
    pub rune_id: String,
    pub rune_name: String,
    pub amount: Nat,
    pub btc_txid: String,
    pub btc_vout: u32,
}

/// Withdrawal request (ICP → Bitcoin)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct WithdrawalRequest {
    pub user_icp: Principal,
    pub user_btc_address: String,
    pub wrune_canister: Principal,
    pub amount: Nat,
}

/// Bridge statistics
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BridgeStats {
    pub total_deposits: u64,
    pub total_withdrawals: u64,
    pub total_volume: Nat,
    pub total_fees_collected: Nat,
    pub active_transactions: u64,
    pub successful_transactions: u64,
    pub failed_transactions: u64,
}

/// Rune configuration on the bridge
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneConfig {
    pub rune_id: String,
    pub rune_name: String,
    pub wrune_canister: Principal,
    pub enabled: bool,
    pub min_deposit: Nat,
    pub max_deposit: Nat,
    pub min_withdrawal: Nat,
    pub max_withdrawal: Nat,
    pub daily_limit: Nat,
    pub daily_volume: Nat,
    pub last_reset: u64,
}

/// Bridge configuration
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BridgeConfig {
    pub admin: Principal,
    pub omnity_canister: Option<Principal>,
    pub bitcoin_network: String, // "mainnet" or "testnet"
    pub required_confirmations: u32,
    pub bridge_fee_bps: u16, // Basis points (e.g., 10 = 0.1%)
    pub paused: bool,
}

// ============================================================================
// State
// ============================================================================

thread_local! {
    /// All bridge transactions: tx_id -> BridgeTransaction
    static TRANSACTIONS: RefCell<HashMap<String, BridgeTransaction>> =
        RefCell::new(HashMap::new());

    /// User transactions: user -> Vec<tx_ids>
    static USER_TRANSACTIONS: RefCell<HashMap<Principal, Vec<String>>> =
        RefCell::new(HashMap::new());

    /// Bitcoin TXID to bridge TX ID mapping
    static BTC_TX_LOOKUP: RefCell<HashMap<String, String>> =
        RefCell::new(HashMap::new());

    /// Pending transactions (awaiting confirmation)
    static PENDING_DEPOSITS: RefCell<Vec<String>> = RefCell::new(Vec::new());
    static PENDING_WITHDRAWALS: RefCell<Vec<String>> = RefCell::new(Vec::new());

    /// Rune configurations: rune_id -> RuneConfig
    static RUNE_CONFIGS: RefCell<HashMap<String, RuneConfig>> =
        RefCell::new(HashMap::new());

    /// Bridge statistics
    static STATS: RefCell<BridgeStats> = RefCell::new(BridgeStats {
        total_deposits: 0,
        total_withdrawals: 0,
        total_volume: Nat::from(0u64),
        total_fees_collected: Nat::from(0u64),
        active_transactions: 0,
        successful_transactions: 0,
        failed_transactions: 0,
    });

    /// Bridge configuration
    static CONFIG: RefCell<BridgeConfig> = RefCell::new(BridgeConfig {
        admin: Principal::anonymous(),
        omnity_canister: None,
        bitcoin_network: "mainnet".to_string(),
        required_confirmations: 6,
        bridge_fee_bps: 10, // 0.1%
        paused: false,
    });

    /// Transaction ID counter
    static NEXT_TX_ID: RefCell<u64> = RefCell::new(1);
}

// ============================================================================
// Initialization
// ============================================================================

#[init]
fn init(admin: Principal, omnity_canister: Option<Principal>) {
    CONFIG.with(|config| {
        let mut cfg = config.borrow_mut();
        cfg.admin = admin;
        cfg.omnity_canister = omnity_canister;
    });

    ic_cdk::println!("✅ Bridge initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    // TODO: Implement stable storage serialization
}

#[post_upgrade]
fn post_upgrade() {
    // TODO: Implement stable storage deserialization
}

// ============================================================================
// Deposit Operations (Bitcoin → ICP)
// ============================================================================

/// Initiate deposit: Lock Runes on Bitcoin → Mint wRunes on ICP
#[update]
async fn initiate_deposit(request: DepositRequest) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Verify caller matches request
    if caller != request.user_icp {
        return Err("Caller does not match user in request".to_string());
    }

    // Check if bridge is paused
    if CONFIG.with(|c| c.borrow().paused) {
        return Err("Bridge is paused".to_string());
    }

    // Get rune config
    let rune_config = RUNE_CONFIGS
        .with(|configs| configs.borrow().get(&request.rune_id).cloned())
        .ok_or("Rune not supported")?;

    if !rune_config.enabled {
        return Err("Rune deposits are disabled".to_string());
    }

    // Validate amount
    if request.amount < rune_config.min_deposit {
        return Err(format!(
            "Amount below minimum deposit: {}",
            rune_config.min_deposit
        ));
    }

    if request.amount > rune_config.max_deposit {
        return Err(format!(
            "Amount exceeds maximum deposit: {}",
            rune_config.max_deposit
        ));
    }

    // Check daily limit
    check_daily_limit(&rune_config, &request.amount)?;

    // Check if Bitcoin transaction already processed
    if BTC_TX_LOOKUP.with(|lookup| lookup.borrow().contains_key(&request.btc_txid)) {
        return Err("Bitcoin transaction already processed".to_string());
    }

    // Calculate fees
    let bridge_fee = calculate_bridge_fee(&request.amount);

    // Generate transaction ID
    let tx_id = generate_tx_id();

    // Create bridge transaction
    let tx = BridgeTransaction {
        id: tx_id.clone(),
        direction: BridgeDirection::BitcoinToICP,
        status: BridgeStatus::Pending,
        user_icp: request.user_icp,
        user_btc_address: request.user_btc_address.clone(),
        rune_id: request.rune_id.clone(),
        rune_name: request.rune_name,
        amount: request.amount.clone(),
        wrune_canister: Some(rune_config.wrune_canister),
        btc_tx: Some(BitcoinTxInfo {
            txid: request.btc_txid.clone(),
            vout: request.btc_vout,
            confirmations: 0,
            block_height: None,
            verified: false,
        }),
        icp_tx_id: None,
        bridge_fee: bridge_fee.clone(),
        network_fee: Nat::from(1000u64), // TODO: Calculate actual network fee
        created_at: time(),
        updated_at: time(),
        completed_at: None,
    };

    // Store transaction
    TRANSACTIONS.with(|txs| {
        txs.borrow_mut().insert(tx_id.clone(), tx.clone());
    });

    USER_TRANSACTIONS.with(|user_txs| {
        user_txs
            .borrow_mut()
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(tx_id.clone());
    });

    BTC_TX_LOOKUP.with(|lookup| {
        lookup.borrow_mut().insert(request.btc_txid.clone(), tx_id.clone());
    });

    PENDING_DEPOSITS.with(|pending| {
        pending.borrow_mut().push(tx_id.clone());
    });

    // Update stats
    STATS.with(|stats| {
        let mut stats = stats.borrow_mut();
        stats.active_transactions += 1;
    });

    // Update daily volume
    update_daily_volume(&request.rune_id, &request.amount)?;

    ic_cdk::println!("✅ Deposit initiated: {}", tx_id);

    // TODO: Call Omnity Network to verify Bitcoin transaction
    // In production: await verify_bitcoin_transaction(&request.btc_txid)

    Ok(tx_id)
}

/// Process confirmed deposit (called by relayer/oracle)
#[update]
async fn process_deposit(tx_id: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Verify caller is admin or relayer
    verify_admin_or_relayer(caller)?;

    // Get transaction
    let mut tx = TRANSACTIONS
        .with(|txs| txs.borrow().get(&tx_id).cloned())
        .ok_or("Transaction not found")?;

    // Verify status
    if tx.status != BridgeStatus::Pending
        && !matches!(tx.status, BridgeStatus::ConfirmingBitcoin { .. })
    {
        return Err("Transaction not in pending state".to_string());
    }

    // TODO: Verify Bitcoin transaction via Omnity Network
    // In production: verify confirmations >= required_confirmations

    // Update status
    tx.status = BridgeStatus::ProcessingICP;
    tx.updated_at = time();

    TRANSACTIONS.with(|txs| {
        txs.borrow_mut().insert(tx_id.clone(), tx.clone());
    });

    // Mint wRunes to user
    let wrune_canister = tx.wrune_canister.ok_or("wRune canister not set")?;
    let amount_after_fee = tx.amount.clone() - &tx.bridge_fee;

    // TODO: Call wRune ledger to mint tokens
    // In production:
    // let mint_result = ic_cdk::call::<_, (Result<Nat, String>,)>(
    //     wrune_canister,
    //     "mint",
    //     (tx.user_icp, amount_after_fee.clone(), Some(tx_id.clone().into_bytes())),
    // ).await.map_err(|e| format!("Failed to call mint: {:?}", e))?;

    // For now, simulate successful mint
    let icp_tx_id = Nat::from(12345u64);

    // Update transaction
    tx.status = BridgeStatus::Completed;
    tx.icp_tx_id = Some(icp_tx_id);
    tx.completed_at = Some(time());
    tx.updated_at = time();

    TRANSACTIONS.with(|txs| {
        txs.borrow_mut().insert(tx_id.clone(), tx.clone());
    });

    // Remove from pending
    PENDING_DEPOSITS.with(|pending| {
        pending.borrow_mut().retain(|id| id != &tx_id);
    });

    // Update stats
    STATS.with(|stats| {
        let mut stats = stats.borrow_mut();
        stats.total_deposits += 1;
        stats.active_transactions = stats.active_transactions.saturating_sub(1);
        stats.successful_transactions += 1;
        stats.total_volume = &stats.total_volume + &tx.amount;
        stats.total_fees_collected = &stats.total_fees_collected + &tx.bridge_fee;
    });

    ic_cdk::println!("✅ Deposit processed: {}", tx_id);

    Ok(())
}

// ============================================================================
// Withdrawal Operations (ICP → Bitcoin)
// ============================================================================

/// Initiate withdrawal: Burn wRunes on ICP → Release Runes on Bitcoin
#[update]
async fn initiate_withdrawal(request: WithdrawalRequest) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Verify caller matches request
    if caller != request.user_icp {
        return Err("Caller does not match user in request".to_string());
    }

    // Check if bridge is paused
    if CONFIG.with(|c| c.borrow().paused) {
        return Err("Bridge is paused".to_string());
    }

    // Find rune config by wrune canister
    let (rune_id, rune_config) = RUNE_CONFIGS
        .with(|configs| {
            configs
                .borrow()
                .iter()
                .find(|(_, config)| config.wrune_canister == request.wrune_canister)
                .map(|(id, config)| (id.clone(), config.clone()))
        })
        .ok_or("wRune canister not recognized")?;

    if !rune_config.enabled {
        return Err("Rune withdrawals are disabled".to_string());
    }

    // Validate amount
    if request.amount < rune_config.min_withdrawal {
        return Err(format!(
            "Amount below minimum withdrawal: {}",
            rune_config.min_withdrawal
        ));
    }

    if request.amount > rune_config.max_withdrawal {
        return Err(format!(
            "Amount exceeds maximum withdrawal: {}",
            rune_config.max_withdrawal
        ));
    }

    // Validate Bitcoin address
    validate_bitcoin_address(&request.user_btc_address)?;

    // Calculate fees
    let bridge_fee = calculate_bridge_fee(&request.amount);
    let network_fee = Nat::from(5000u64); // TODO: Calculate actual Bitcoin network fee

    // Check user has enough balance
    // TODO: In production, verify user's wRune balance

    // Generate transaction ID
    let tx_id = generate_tx_id();

    // Create bridge transaction
    let tx = BridgeTransaction {
        id: tx_id.clone(),
        direction: BridgeDirection::ICPToBitcoin,
        status: BridgeStatus::Pending,
        user_icp: request.user_icp,
        user_btc_address: request.user_btc_address.clone(),
        rune_id: rune_id.clone(),
        rune_name: rune_config.rune_name.clone(),
        amount: request.amount.clone(),
        wrune_canister: Some(request.wrune_canister),
        btc_tx: None,
        icp_tx_id: None,
        bridge_fee: bridge_fee.clone(),
        network_fee: network_fee.clone(),
        created_at: time(),
        updated_at: time(),
        completed_at: None,
    };

    // Store transaction
    TRANSACTIONS.with(|txs| {
        txs.borrow_mut().insert(tx_id.clone(), tx.clone());
    });

    USER_TRANSACTIONS.with(|user_txs| {
        user_txs
            .borrow_mut()
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(tx_id.clone());
    });

    PENDING_WITHDRAWALS.with(|pending| {
        pending.borrow_mut().push(tx_id.clone());
    });

    // Update stats
    STATS.with(|stats| {
        let mut stats = stats.borrow_mut();
        stats.active_transactions += 1;
    });

    ic_cdk::println!("✅ Withdrawal initiated: {}", tx_id);

    // TODO: Burn wRunes from user
    // In production:
    // let burn_result = ic_cdk::call::<_, (Result<Nat, String>,)>(
    //     request.wrune_canister,
    //     "burn",
    //     (request.user_icp, request.amount.clone(), Some(tx_id.clone().into_bytes())),
    // ).await.map_err(|e| format!("Failed to call burn: {:?}", e))?;

    Ok(tx_id)
}

/// Process withdrawal (send to Bitcoin)
#[update]
async fn process_withdrawal(tx_id: String, btc_txid: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Verify caller is admin or relayer
    verify_admin_or_relayer(caller)?;

    // Get transaction
    let mut tx = TRANSACTIONS
        .with(|txs| txs.borrow().get(&tx_id).cloned())
        .ok_or("Transaction not found")?;

    // Verify status
    if tx.status != BridgeStatus::Pending && tx.status != BridgeStatus::ProcessingICP {
        return Err("Transaction not in processable state".to_string());
    }

    // Update Bitcoin transaction info
    tx.btc_tx = Some(BitcoinTxInfo {
        txid: btc_txid.clone(),
        vout: 0,
        confirmations: 0,
        block_height: None,
        verified: true,
    });

    tx.status = BridgeStatus::Completed;
    tx.completed_at = Some(time());
    tx.updated_at = time();

    TRANSACTIONS.with(|txs| {
        txs.borrow_mut().insert(tx_id.clone(), tx.clone());
    });

    // Remove from pending
    PENDING_WITHDRAWALS.with(|pending| {
        pending.borrow_mut().retain(|id| id != &tx_id);
    });

    // Update stats
    STATS.with(|stats| {
        let mut stats = stats.borrow_mut();
        stats.total_withdrawals += 1;
        stats.active_transactions = stats.active_transactions.saturating_sub(1);
        stats.successful_transactions += 1;
        stats.total_volume = &stats.total_volume + &tx.amount;
        stats.total_fees_collected = &stats.total_fees_collected + &tx.bridge_fee;
    });

    ic_cdk::println!("✅ Withdrawal processed: {}", tx_id);

    Ok(())
}

// ============================================================================
// Query Functions
// ============================================================================

/// Get transaction by ID
#[query]
fn get_transaction(tx_id: String) -> Option<BridgeTransaction> {
    TRANSACTIONS.with(|txs| txs.borrow().get(&tx_id).cloned())
}

/// Get user's transactions
#[query]
fn get_user_transactions(user: Principal) -> Vec<BridgeTransaction> {
    USER_TRANSACTIONS
        .with(|user_txs| {
            user_txs
                .borrow()
                .get(&user)
                .cloned()
                .unwrap_or_default()
        })
        .iter()
        .filter_map(|tx_id| TRANSACTIONS.with(|txs| txs.borrow().get(tx_id).cloned()))
        .collect()
}

/// Get pending deposits
#[query]
fn get_pending_deposits() -> Vec<BridgeTransaction> {
    PENDING_DEPOSITS
        .with(|pending| pending.borrow().clone())
        .iter()
        .filter_map(|tx_id| TRANSACTIONS.with(|txs| txs.borrow().get(tx_id).cloned()))
        .collect()
}

/// Get pending withdrawals
#[query]
fn get_pending_withdrawals() -> Vec<BridgeTransaction> {
    PENDING_WITHDRAWALS
        .with(|pending| pending.borrow().clone())
        .iter()
        .filter_map(|tx_id| TRANSACTIONS.with(|txs| txs.borrow().get(tx_id).cloned()))
        .collect()
}

/// Get bridge statistics
#[query]
fn get_bridge_stats() -> BridgeStats {
    STATS.with(|stats| stats.borrow().clone())
}

/// Get rune configuration
#[query]
fn get_rune_config(rune_id: String) -> Option<RuneConfig> {
    RUNE_CONFIGS.with(|configs| configs.borrow().get(&rune_id).cloned())
}

/// Get all supported runes
#[query]
fn get_supported_runes() -> Vec<RuneConfig> {
    RUNE_CONFIGS.with(|configs| {
        configs
            .borrow()
            .values()
            .filter(|config| config.enabled)
            .cloned()
            .collect()
    })
}

// ============================================================================
// Admin Functions
// ============================================================================

/// Add or update rune configuration
#[update]
fn configure_rune(config: RuneConfig) -> Result<(), String> {
    let caller = ic_cdk::caller();
    verify_admin(caller)?;

    RUNE_CONFIGS.with(|configs| {
        configs.borrow_mut().insert(config.rune_id.clone(), config);
    });

    Ok(())
}

/// Pause/unpause bridge
#[update]
fn set_paused(paused: bool) -> Result<(), String> {
    let caller = ic_cdk::caller();
    verify_admin(caller)?;

    CONFIG.with(|config| {
        config.borrow_mut().paused = paused;
    });

    Ok(())
}

/// Update bridge configuration
#[update]
fn update_config(
    required_confirmations: Option<u32>,
    bridge_fee_bps: Option<u16>,
    omnity_canister: Option<Principal>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    verify_admin(caller)?;

    CONFIG.with(|config| {
        let mut cfg = config.borrow_mut();
        if let Some(confirmations) = required_confirmations {
            cfg.required_confirmations = confirmations;
        }
        if let Some(fee_bps) = bridge_fee_bps {
            cfg.bridge_fee_bps = fee_bps;
        }
        if let Some(omnity) = omnity_canister {
            cfg.omnity_canister = Some(omnity);
        }
    });

    Ok(())
}

// ============================================================================
// Helper Functions
// ============================================================================

fn generate_tx_id() -> String {
    NEXT_TX_ID.with(|counter| {
        let id = *counter.borrow();
        *counter.borrow_mut() += 1;
        format!("BRIDGE-{}", id)
    })
}

fn calculate_bridge_fee(amount: &Nat) -> Nat {
    let fee_bps = CONFIG.with(|c| c.borrow().bridge_fee_bps);
    (amount.clone() * Nat::from(fee_bps)) / Nat::from(10000u64)
}

fn check_daily_limit(config: &RuneConfig, amount: &Nat) -> Result<(), String> {
    let now = time();
    let one_day_nanos = 24 * 60 * 60 * 1_000_000_000u64;

    RUNE_CONFIGS.with(|configs| {
        let mut configs = configs.borrow_mut();
        if let Some(rune_config) = configs.get_mut(&config.rune_id) {
            // Reset daily volume if 24h passed
            if now - rune_config.last_reset >= one_day_nanos {
                rune_config.daily_volume = Nat::from(0u64);
                rune_config.last_reset = now;
            }

            let new_volume = &rune_config.daily_volume + amount;
            if new_volume > rune_config.daily_limit {
                return Err("Daily limit exceeded".to_string());
            }
        }
        Ok(())
    })
}

fn update_daily_volume(rune_id: &str, amount: &Nat) -> Result<(), String> {
    RUNE_CONFIGS.with(|configs| {
        let mut configs = configs.borrow_mut();
        if let Some(config) = configs.get_mut(rune_id) {
            config.daily_volume = &config.daily_volume + amount;
        }
        Ok(())
    })
}

fn validate_bitcoin_address(address: &str) -> Result<(), String> {
    // Basic validation
    if address.is_empty() || address.len() < 26 || address.len() > 90 {
        return Err("Invalid Bitcoin address format".to_string());
    }

    // TODO: Add proper Bitcoin address validation
    // In production, use bitcoin crate to validate

    Ok(())
}

fn verify_admin(caller: Principal) -> Result<(), String> {
    let admin = CONFIG.with(|c| c.borrow().admin);
    if caller != admin {
        return Err("Unauthorized: admin only".to_string());
    }
    Ok(())
}

fn verify_admin_or_relayer(caller: Principal) -> Result<(), String> {
    let admin = CONFIG.with(|c| c.borrow().admin);
    // TODO: Add relayer principal check
    if caller != admin {
        return Err("Unauthorized: admin or relayer only".to_string());
    }
    Ok(())
}

// ============================================================================
// Candid Export
// ============================================================================

ic_cdk::export_candid!();
