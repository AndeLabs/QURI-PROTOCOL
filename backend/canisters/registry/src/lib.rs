use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::Serialize;
use std::cell::RefCell;
use std::collections::HashMap;

mod ckbtc_integration;
mod octopus_integration;
mod staking;

use ckbtc_integration::{
    Account, CkBTCClient, CkBTCPayment, PaymentType, format_ckbtc,
    get_payments_by_user, get_payments_for_rune, record_payment, validate_amount,
};
use octopus_integration::{OctopusIndexerClient, OctopusRuneEntry};
use staking::{
    StakePosition, StakingPool, StakingStats, RewardCalculation,
    stake_runes, unstake_runes, claim_rewards, get_stake_position,
    get_user_stakes, get_staking_pool, get_all_pools, get_staking_stats,
    calculate_rewards,
};

// ============================================================================
// Types
// ============================================================================

/// Rune etching data
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneEtching {
    pub rune_name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub premine: u64,
    pub cap: Option<u64>,
    pub amount_per_mint: Option<u64>,
    pub start_height: Option<u64>,
    pub end_height: Option<u64>,
    pub start_offset: Option<u64>,
    pub end_offset: Option<u64>,
    pub turbo: bool,
}

/// Rune metadata (IPFS)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneMetadata {
    pub name: String,
    pub description: Option<String>,
    pub image: String, // IPFS CID or URL
    pub external_url: Option<String>,
    pub attributes: Option<Vec<RuneAttribute>>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneAttribute {
    pub trait_type: String,
    pub value: AttributeValue,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum AttributeValue {
    String(String),
    Number(u64),
}

/// Created Rune record
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CreatedRune {
    pub id: String,
    pub creator: Principal,
    pub etching_data: RuneEtching,
    pub metadata: Option<RuneMetadata>,
    pub etching_txid: Option<String>,
    pub created_at: u64,
    pub payment_method: PaymentMethod,
    pub payment_amount: u64,
    pub payment_block_index: Option<u64>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum PaymentMethod {
    Bitcoin,
    CkBTC,
    ICP,
}

// ============================================================================
// State
// ============================================================================

thread_local! {
    /// All created Runes
    static RUNES: RefCell<HashMap<String, CreatedRune>> = RefCell::new(HashMap::new());

    /// User's created Runes
    static USER_RUNES: RefCell<HashMap<Principal, Vec<String>>> = RefCell::new(HashMap::new());

    /// User favorites
    static FAVORITES: RefCell<HashMap<Principal, Vec<String>>> = RefCell::new(HashMap::new());

    /// Canister configuration
    static CONFIG: RefCell<CanisterConfig> = RefCell::new(CanisterConfig::default());
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CanisterConfig {
    pub network: String, // "mainnet" or "testnet"
    pub ckbtc_enabled: bool,
    pub min_mint_fee_sats: u64,
    pub admin: Principal,
}

impl Default for CanisterConfig {
    fn default() -> Self {
        Self {
            network: "mainnet".to_string(),
            ckbtc_enabled: true,
            min_mint_fee_sats: 100_000, // 0.001 ckBTC
            admin: Principal::anonymous(),
        }
    }
}

// ============================================================================
// Canister Lifecycle
// ============================================================================

#[init]
fn init() {
    let caller = ic_cdk::caller();
    CONFIG.with(|config| {
        let mut cfg = config.borrow_mut();
        cfg.admin = caller;
    });
}

#[pre_upgrade]
fn pre_upgrade() {
    // Serialize state before upgrade
    // TODO: Implement stable storage serialization
}

#[post_upgrade]
fn post_upgrade() {
    // Restore state after upgrade
    // TODO: Implement stable storage deserialization
}

// ============================================================================
// Query Methods
// ============================================================================

/// Get Rune by ID
#[query]
fn get_rune(rune_id: String) -> Option<CreatedRune> {
    RUNES.with(|runes| runes.borrow().get(&rune_id).cloned())
}

/// Get all Runes created by a user
#[query]
fn get_user_runes(user: Principal) -> Vec<CreatedRune> {
    USER_RUNES.with(|user_runes| {
        let rune_ids = user_runes.borrow().get(&user).cloned().unwrap_or_default();

        RUNES.with(|runes| {
            let runes_map = runes.borrow();
            rune_ids
                .iter()
                .filter_map(|id| runes_map.get(id).cloned())
                .collect()
        })
    })
}

/// Get all Runes (paginated)
#[query]
fn get_all_runes(offset: usize, limit: usize) -> Vec<CreatedRune> {
    RUNES.with(|runes| {
        let runes_map = runes.borrow();
        let mut all_runes: Vec<_> = runes_map.values().cloned().collect();

        // Sort by creation time (newest first)
        all_runes.sort_by(|a, b| b.created_at.cmp(&a.created_at));

        all_runes
            .into_iter()
            .skip(offset)
            .take(limit)
            .collect()
    })
}

/// Get total Runes count
#[query]
fn get_runes_count() -> usize {
    RUNES.with(|runes| runes.borrow().len())
}

/// Get user's favorites
#[query]
fn get_favorites(user: Principal) -> Vec<String> {
    FAVORITES.with(|favs| favs.borrow().get(&user).cloned().unwrap_or_default())
}

/// Get ckBTC payments for a Rune
#[query]
fn get_rune_payments(rune_id: String) -> Vec<CkBTCPayment> {
    get_payments_for_rune(&rune_id)
}

/// Get all ckBTC payments by a user
#[query]
fn get_user_payments(user: Principal) -> Vec<CkBTCPayment> {
    get_payments_by_user(user)
}

/// Get canister configuration
#[query]
fn get_config() -> CanisterConfig {
    CONFIG.with(|config| config.borrow().clone())
}

// ============================================================================
// Update Methods - Rune Creation
// ============================================================================

/// Create Rune with ckBTC payment (INSTANT - 1-2 seconds!)
///
/// User must approve this canister to spend ckBTC first via:
/// ```
/// ckbtc_ledger.icrc2_approve({
///   spender: { owner: QURI_CANISTER_ID, subaccount: [] },
///   amount: fee_amount
/// })
/// ```
#[update]
async fn mint_rune_with_ckbtc(
    etching_data: RuneEtching,
    metadata: Option<RuneMetadata>,
    ckbtc_amount: u64,
) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let config = CONFIG.with(|c| c.borrow().clone());

    // 1. Validate ckBTC is enabled
    if !config.ckbtc_enabled {
        return Err("ckBTC payments are currently disabled".to_string());
    }

    // 2. Validate amount
    validate_amount(ckbtc_amount)?;

    if ckbtc_amount < config.min_mint_fee_sats {
        return Err(format!(
            "Insufficient payment. Minimum: {} ({})",
            config.min_mint_fee_sats,
            format_ckbtc(config.min_mint_fee_sats)
        ));
    }

    // 3. Validate etching data
    validate_etching_data(&etching_data)?;

    // 4. Transfer ckBTC from user to treasury
    let ckbtc_client = CkBTCClient::new(&config.network);

    let block_index = ckbtc_client
        .transfer_from_user(caller, ckbtc_amount)
        .await
        .map_err(|e| format!("ckBTC transfer failed: {}", e))?;

    // 5. Generate Rune ID (simplified - in production, would wait for Bitcoin tx)
    let rune_id = generate_rune_id(&etching_data.rune_name);

    // 6. Create Rune record
    let created_rune = CreatedRune {
        id: rune_id.clone(),
        creator: caller,
        etching_data: etching_data.clone(),
        metadata,
        etching_txid: None, // Will be updated when Bitcoin tx confirms
        created_at: ic_cdk::api::time(),
        payment_method: PaymentMethod::CkBTC,
        payment_amount: ckbtc_amount,
        payment_block_index: Some(block_index),
    };

    // 7. Store Rune
    RUNES.with(|runes| {
        runes.borrow_mut().insert(rune_id.clone(), created_rune);
    });

    USER_RUNES.with(|user_runes| {
        user_runes
            .borrow_mut()
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(rune_id.clone());
    });

    // 8. Record payment
    let payment = CkBTCPayment {
        rune_id: rune_id.clone(),
        payer: caller,
        amount: ckbtc_amount,
        block_index,
        timestamp: ic_cdk::api::time(),
        tx_type: PaymentType::RuneMint,
    };
    record_payment(payment);

    // 9. Log success
    ic_cdk::println!(
        "✅ Rune minted with ckBTC: {} | User: {} | Amount: {} | Block: {}",
        rune_id,
        caller,
        format_ckbtc(ckbtc_amount),
        block_index
    );

    Ok(rune_id)
}

/// Create Rune with traditional Bitcoin payment
#[update]
async fn mint_rune_with_bitcoin(
    etching_data: RuneEtching,
    metadata: Option<RuneMetadata>,
    bitcoin_txid: String,
) -> Result<String, String> {
    let caller = ic_cdk::caller();

    // Validate etching data
    validate_etching_data(&etching_data)?;

    // TODO: Verify Bitcoin transaction via threshold ECDSA
    // For now, trust the user (in production, verify on-chain)

    let rune_id = generate_rune_id(&etching_data.rune_name);

    let created_rune = CreatedRune {
        id: rune_id.clone(),
        creator: caller,
        etching_data,
        metadata,
        etching_txid: Some(bitcoin_txid),
        created_at: ic_cdk::api::time(),
        payment_method: PaymentMethod::Bitcoin,
        payment_amount: 0, // Unknown without parsing tx
        payment_block_index: None,
    };

    RUNES.with(|runes| {
        runes.borrow_mut().insert(rune_id.clone(), created_rune);
    });

    USER_RUNES.with(|user_runes| {
        user_runes
            .borrow_mut()
            .entry(caller)
            .or_insert_with(Vec::new)
            .push(rune_id.clone());
    });

    Ok(rune_id)
}

// ============================================================================
// Update Methods - Favorites
// ============================================================================

/// Add Rune to favorites
#[update]
fn add_favorite(rune_id: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    // Verify Rune exists
    let exists = RUNES.with(|runes| runes.borrow().contains_key(&rune_id));
    if !exists {
        return Err("Rune not found".to_string());
    }

    FAVORITES.with(|favs| {
        let mut favorites = favs.borrow_mut();
        let user_favs = favorites.entry(caller).or_insert_with(Vec::new);

        if user_favs.contains(&rune_id) {
            return Err("Already in favorites".to_string());
        }

        user_favs.push(rune_id);
        Ok(())
    })
}

/// Remove Rune from favorites
#[update]
fn remove_favorite(rune_id: String) -> Result<(), String> {
    let caller = ic_cdk::caller();

    FAVORITES.with(|favs| {
        let mut favorites = favs.borrow_mut();
        let user_favs = favorites.entry(caller).or_insert_with(Vec::new);

        if let Some(pos) = user_favs.iter().position(|id| id == &rune_id) {
            user_favs.remove(pos);
            Ok(())
        } else {
            Err("Not in favorites".to_string())
        }
    })
}

// ============================================================================
// Update Methods - Verification
// ============================================================================

/// Verify Rune on-chain via Octopus Indexer
#[update]
async fn verify_rune_on_chain(rune_id: String) -> Result<OctopusRuneEntry, String> {
    let config = CONFIG.with(|c| c.borrow().clone());
    let client = OctopusIndexerClient::new(&config.network);

    client
        .get_rune_by_id(&rune_id)
        .await?
        .ok_or_else(|| "Rune not found in indexer".to_string())
}

// ============================================================================
// Update Methods - Staking
// ============================================================================

/// Stake Runes to earn ckBTC rewards
#[update]
fn stake(rune_id: String, amount: u64) -> Result<StakePosition, String> {
    let caller = ic_cdk::caller();

    // TODO: Verify user owns the Runes being staked
    // For now, we trust the user has the Runes

    stake_runes(caller, rune_id, amount)
}

/// Unstake Runes and claim rewards
#[update]
async fn unstake(rune_id: String, amount: u64) -> Result<(u64, u64), String> {
    let caller = ic_cdk::caller();

    // Unstake and get reward amount
    let (unstaked_amount, reward_amount) = unstake_runes(caller, rune_id.clone(), amount)?;

    // Transfer ckBTC rewards to user
    if reward_amount > 0 {
        let config = CONFIG.with(|c| c.borrow().clone());
        let ckbtc_client = CkBTCClient::new(&config.network);

        ckbtc_client
            .transfer_to_user(caller, reward_amount, b"QURI_STAKING_REWARD".to_vec())
            .await
            .map_err(|e| format!("Failed to transfer rewards: {}", e))?;
    }

    Ok((unstaked_amount, reward_amount))
}

/// Claim staking rewards without unstaking
#[update]
async fn claim_staking_rewards(rune_id: String) -> Result<u64, String> {
    let caller = ic_cdk::caller();

    // Calculate and claim rewards
    let reward_amount = claim_rewards(caller, rune_id)?;

    // Transfer ckBTC rewards to user
    if reward_amount > 0 {
        let config = CONFIG.with(|c| c.borrow().clone());
        let ckbtc_client = CkBTCClient::new(&config.network);

        ckbtc_client
            .transfer_to_user(caller, reward_amount, b"QURI_STAKING_REWARD".to_vec())
            .await
            .map_err(|e| format!("Failed to transfer rewards: {}", e))?;
    }

    Ok(reward_amount)
}

/// Get user's stake position for a Rune
#[query]
fn get_stake(rune_id: String) -> Option<StakePosition> {
    let caller = ic_cdk::caller();
    get_stake_position(caller, rune_id)
}

/// Get all user's stake positions
#[query]
fn get_user_all_stakes() -> Vec<StakePosition> {
    let caller = ic_cdk::caller();
    get_user_stakes(caller)
}

/// Get staking pool information
#[query]
fn get_pool(rune_id: String) -> Option<StakingPool> {
    get_staking_pool(rune_id)
}

/// Get all staking pools
#[query]
fn get_all_staking_pools() -> Vec<StakingPool> {
    get_all_pools()
}

/// Get global staking statistics
#[query]
fn get_global_staking_stats() -> StakingStats {
    get_staking_stats()
}

/// Calculate pending rewards
#[query]
fn calculate_pending_rewards(rune_id: String) -> Result<RewardCalculation, String> {
    let caller = ic_cdk::caller();
    calculate_rewards(caller, rune_id)
}

// ============================================================================
// Update Methods - Admin
// ============================================================================

/// Update canister configuration (admin only)
#[update]
fn update_config(new_config: CanisterConfig) -> Result<(), String> {
    let caller = ic_cdk::caller();

    CONFIG.with(|config| {
        let cfg = config.borrow();
        if cfg.admin != caller {
            return Err("Unauthorized: admin only".to_string());
        }

        drop(cfg);
        *config.borrow_mut() = new_config;
        Ok(())
    })
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Validate etching data
fn validate_etching_data(data: &RuneEtching) -> Result<(), String> {
    // Name validation
    if data.rune_name.is_empty() || data.rune_name.len() > 26 {
        return Err("Rune name must be 1-26 characters".to_string());
    }

    // Symbol validation
    if data.symbol.is_empty() || data.symbol.len() > 4 {
        return Err("Symbol must be 1-4 characters".to_string());
    }

    // Divisibility validation
    if data.divisibility > 18 {
        return Err("Divisibility must be 0-18".to_string());
    }

    // Cap validation
    if let Some(cap) = data.cap {
        if cap == 0 {
            return Err("Cap must be > 0 if specified".to_string());
        }
    }

    // Amount validation
    if let Some(amount) = data.amount_per_mint {
        if amount == 0 {
            return Err("Amount per mint must be > 0 if specified".to_string());
        }
    }

    Ok(())
}

/// Generate Rune ID (simplified)
///
/// In production, this would be based on Bitcoin block height and transaction index.
/// Format: "block:tx_index" (e.g., "840000:5")
fn generate_rune_id(name: &str) -> String {
    let timestamp = ic_cdk::api::time();
    let hash = timestamp % 1_000_000;
    format!("{}:{}", hash, name.len())
}

// ============================================================================
// Candid Export
// ============================================================================

ic_cdk::export_candid!();
