/**
 * Trading V2 Module - Stable Memory Implementation
 *
 * Robust, scalable, and modular AMM trading system for Virtual Runes.
 * All data persists across canister upgrades using StableBTreeMap.
 *
 * Features:
 * - Bonding curve AMM (constant product x * y = k)
 * - Enhanced bonding curve with graduation (pump.fun style)
 * - LP Token support for liquidity providers
 * - Persistent storage across upgrades
 * - Event sourcing for complete audit trail
 * - Real ICP integration via ICRC-1
 *
 * Architecture:
 * - TradingPool: Core AMM state
 * - LiquidityPosition: LP token tracking
 * - TradeEvent: Event sourcing
 * - GraduationManager: Bonding curve graduation
 */

use candid::{CandidType, Decode, Deserialize, Encode, Principal};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{storable::Bound, DefaultMemoryImpl, StableBTreeMap, Storable};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ============================================================================
// CONSTANTS
// ============================================================================

/// Trading fee in basis points (30 = 0.3%)
pub const TRADING_FEE_BPS: u64 = 30;

/// Protocol fee in basis points (10 = 0.1%) - goes to treasury
pub const PROTOCOL_FEE_BPS: u64 = 10;

/// LP fee in basis points (20 = 0.2%) - stays in pool for LPs
pub const LP_FEE_BPS: u64 = 20;

/// Minimum liquidity to create pool (0.001 ICP in e8s)
pub const MIN_LIQUIDITY_ICP: u64 = 100_000;

/// Graduation threshold in ICP e8s (equivalent to ~$69k market cap)
pub const GRADUATION_THRESHOLD_ICP: u64 = 85_00_000_000; // 85 ICP

/// Virtual reserves for initial bonding curve
pub const VIRTUAL_ICP_RESERVE: u64 = 30_00_000_000; // 30 ICP virtual
pub const VIRTUAL_RUNE_RESERVE: u64 = 800_000_000; // 800M virtual tokens

/// Price impact warning threshold (5%)
pub const PRICE_IMPACT_WARNING_BPS: u64 = 500;

/// Maximum rune ID length
const MAX_RUNE_ID_LENGTH: usize = 64;

// ============================================================================
// POOL ID - Bounded Key Type
// ============================================================================

/// Pool ID - bounded type for StableBTreeMap keys
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PoolId(pub [u8; 32]);

impl PoolId {
    /// Create from rune ID string (hash to fixed size)
    pub fn from_rune_id(rune_id: &str) -> Self {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(rune_id.as_bytes());
        let result = hasher.finalize();
        let mut bytes = [0u8; 32];
        bytes.copy_from_slice(&result);
        Self(bytes)
    }

    /// Create from raw bytes
    pub fn from_bytes_raw(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    /// Get as bytes
    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    /// Convert to hex string
    pub fn to_hex(&self) -> String {
        hex::encode(&self.0)
    }
}

impl Storable for PoolId {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&bytes);
        Self(arr)
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 32,
        is_fixed_size: true,
    };
}

// ============================================================================
// TRADING POOL - Core AMM State
// ============================================================================

/// Pool type - determines pricing model
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum PoolType {
    /// Initial bonding curve (exponential pricing)
    Bonding,
    /// Graduated to AMM (constant product)
    AMM,
}

/// Graduation status
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum GraduationStatus {
    /// Still on bonding curve
    Bonding,
    /// Graduated to AMM
    Graduated {
        graduated_at: u64,
        final_market_cap: u128,
        liquidity_burned: u64,
    },
}

/// Trading pool state - stored in stable memory
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradingPool {
    /// Unique pool identifier (derived from rune_id)
    pub id: PoolId,
    /// Original rune ID string
    pub rune_id: String,
    /// Rune name for display
    pub rune_name: String,
    /// Rune symbol
    pub symbol: String,
    /// Divisibility (decimals)
    pub divisibility: u8,

    // === Reserves ===
    /// Real ICP reserve (e8s)
    pub icp_reserve: u64,
    /// Real rune reserve
    pub rune_reserve: u64,
    /// Virtual ICP reserve (for bonding curve)
    pub virtual_icp_reserve: u64,
    /// Virtual rune reserve (for bonding curve)
    pub virtual_rune_reserve: u64,

    // === Pool State ===
    /// Pool type (Bonding or AMM)
    pub pool_type: PoolType,
    /// Graduation status
    pub graduation_status: GraduationStatus,
    /// Total supply of the rune
    pub total_supply: u64,
    /// Constant product k (for AMM mode)
    pub k_constant: u128,

    // === LP Tokens ===
    /// Total LP tokens minted
    pub total_lp_supply: u64,

    // === Fees ===
    /// Total fees collected in ICP (e8s)
    pub fees_collected_icp: u64,
    /// Total fees collected in runes
    pub fees_collected_runes: u64,
    /// Protocol fees pending withdrawal
    pub protocol_fees_pending: u64,

    // === Statistics ===
    /// Total volume in ICP (e8s)
    pub total_volume_icp: u128,
    /// Total number of trades
    pub total_trades: u64,
    /// Unique traders count
    pub unique_traders: u64,

    // === Metadata ===
    /// Pool creator
    pub creator: Principal,
    /// Creation timestamp
    pub created_at: u64,
    /// Last trade timestamp
    pub last_trade_at: u64,
    /// Is pool active
    pub is_active: bool,
}

impl Default for TradingPool {
    fn default() -> Self {
        Self {
            id: PoolId([0u8; 32]),
            rune_id: String::new(),
            rune_name: String::new(),
            symbol: String::new(),
            divisibility: 0,
            icp_reserve: 0,
            rune_reserve: 0,
            virtual_icp_reserve: VIRTUAL_ICP_RESERVE,
            virtual_rune_reserve: VIRTUAL_RUNE_RESERVE,
            pool_type: PoolType::Bonding,
            graduation_status: GraduationStatus::Bonding,
            total_supply: 0,
            k_constant: 0,
            total_lp_supply: 0,
            fees_collected_icp: 0,
            fees_collected_runes: 0,
            protocol_fees_pending: 0,
            total_volume_icp: 0,
            total_trades: 0,
            unique_traders: 0,
            creator: Principal::anonymous(),
            created_at: 0,
            last_trade_at: 0,
            is_active: true,
        }
    }
}

impl Storable for TradingPool {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode TradingPool"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, Self).expect("Failed to decode TradingPool")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// LP POSITION - Liquidity Provider Tracking
// ============================================================================

/// Key for LP position: (PoolId, Principal)
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct LPPositionKey {
    pub pool_id: PoolId,
    pub owner: Principal,
}

impl Storable for LPPositionKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut bytes = Vec::with_capacity(32 + 29);
        bytes.extend_from_slice(&self.pool_id.0);
        let principal_bytes = self.owner.as_slice();
        bytes.push(principal_bytes.len() as u8);
        bytes.extend_from_slice(principal_bytes);
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let pool_id = {
            let mut arr = [0u8; 32];
            arr.copy_from_slice(&bytes[0..32]);
            PoolId(arr)
        };
        let len = bytes[32] as usize;
        let owner = Principal::from_slice(&bytes[33..33 + len]);
        Self { pool_id, owner }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 32 + 1 + 29, // pool_id + len byte + max principal size
        is_fixed_size: false,
    };
}

/// Liquidity provider position
#[derive(CandidType, Deserialize, Clone, Debug, Default)]
pub struct LPPosition {
    /// LP token balance
    pub lp_balance: u64,
    /// ICP deposited (original)
    pub icp_deposited: u64,
    /// Runes deposited (original)
    pub runes_deposited: u64,
    /// Rewards earned (ICP e8s)
    pub rewards_earned: u64,
    /// Last reward claim timestamp
    pub last_reward_claim: u64,
    /// First deposit timestamp
    pub created_at: u64,
    /// Last update timestamp
    pub updated_at: u64,
}

impl Storable for LPPosition {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode LPPosition"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, Self).expect("Failed to decode LPPosition")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// TRADE EVENT - Event Sourcing
// ============================================================================

/// Event ID - sequential counter
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct EventId(pub u64);

impl Storable for EventId {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut arr = [0u8; 8];
        arr.copy_from_slice(&bytes);
        Self(u64::from_le_bytes(arr))
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };
}

/// Trade type
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum TradeType {
    Buy,
    Sell,
}

/// Trade event for event sourcing
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeEvent {
    /// Event ID
    pub id: u64,
    /// Pool ID
    pub pool_id: PoolId,
    /// Rune ID (for easy querying)
    pub rune_id: String,
    /// Trader principal
    pub trader: Principal,
    /// Trade type
    pub trade_type: TradeType,
    /// ICP amount (e8s)
    pub icp_amount: u64,
    /// Rune amount
    pub rune_amount: u64,
    /// Price per rune (e8s)
    pub price_per_rune: u64,
    /// Fee paid (e8s)
    pub fee: u64,
    /// Price impact (basis points)
    pub price_impact_bps: u16,
    /// Pool ICP reserve after trade
    pub pool_icp_reserve_after: u64,
    /// Pool rune reserve after trade
    pub pool_rune_reserve_after: u64,
    /// Timestamp
    pub timestamp: u64,
}

impl Storable for TradeEvent {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode TradeEvent"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, Self).expect("Failed to decode TradeEvent")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// USER BALANCE - Stable Storage
// ============================================================================

/// Key for user balance: (Principal, rune_id_hash)
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct BalanceKey {
    pub user: Principal,
    pub rune_id_hash: [u8; 32],
}

impl BalanceKey {
    pub fn new(user: Principal, rune_id: &str) -> Self {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(rune_id.as_bytes());
        let result = hasher.finalize();
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&result);
        Self {
            user,
            rune_id_hash: hash,
        }
    }
}

impl Storable for BalanceKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let principal_bytes = self.user.as_slice();
        let mut bytes = Vec::with_capacity(1 + principal_bytes.len() + 32);
        bytes.push(principal_bytes.len() as u8);
        bytes.extend_from_slice(principal_bytes);
        bytes.extend_from_slice(&self.rune_id_hash);
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let len = bytes[0] as usize;
        let user = Principal::from_slice(&bytes[1..1 + len]);
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&bytes[1 + len..1 + len + 32]);
        Self {
            user,
            rune_id_hash: hash,
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 1 + 29 + 32, // len byte + max principal + hash
        is_fixed_size: false,
    };
}

/// User balance for a rune
#[derive(CandidType, Deserialize, Clone, Debug, Default)]
pub struct UserBalance {
    /// Available balance
    pub available: u64,
    /// Locked balance (in pending operations)
    pub locked: u64,
    /// Total lifetime bought
    pub total_bought: u64,
    /// Total lifetime sold
    pub total_sold: u64,
    /// Last update timestamp
    pub updated_at: u64,
}

impl UserBalance {
    pub fn total(&self) -> u64 {
        self.available.saturating_add(self.locked)
    }
}

impl Storable for UserBalance {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode UserBalance"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, Self).expect("Failed to decode UserBalance")
    }

    const BOUND: Bound = Bound::Unbounded;
}

/// User ICP trading balance
#[derive(CandidType, Deserialize, Clone, Debug, Default)]
pub struct ICPBalance {
    /// Available for trading
    pub available: u64,
    /// Locked in pending trades
    pub locked: u64,
    /// Total deposited lifetime
    pub total_deposited: u64,
    /// Total withdrawn lifetime
    pub total_withdrawn: u64,
    /// Last update timestamp
    pub updated_at: u64,
}

impl ICPBalance {
    pub fn total(&self) -> u64 {
        self.available.saturating_add(self.locked)
    }
}

impl Storable for ICPBalance {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(Encode!(self).expect("Failed to encode ICPBalance"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Decode!(&bytes, Self).expect("Failed to decode ICPBalance")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// STORAGE - Thread Local with Stable Memory
// ============================================================================

thread_local! {
    /// Trading pools storage
    static POOLS: RefCell<Option<StableBTreeMap<PoolId, TradingPool, Memory>>> = const { RefCell::new(None) };

    /// LP positions storage
    static LP_POSITIONS: RefCell<Option<StableBTreeMap<LPPositionKey, LPPosition, Memory>>> = const { RefCell::new(None) };

    /// Trade events storage (for event sourcing)
    static TRADE_EVENTS: RefCell<Option<StableBTreeMap<EventId, TradeEvent, Memory>>> = const { RefCell::new(None) };

    /// User rune balances
    static USER_BALANCES: RefCell<Option<StableBTreeMap<BalanceKey, UserBalance, Memory>>> = const { RefCell::new(None) };

    /// User ICP balances
    static ICP_BALANCES: RefCell<Option<StableBTreeMap<Principal, ICPBalance, Memory>>> = const { RefCell::new(None) };

    /// Event counter for unique IDs
    static EVENT_COUNTER: RefCell<u64> = const { RefCell::new(0) };

    /// Rune ID to Pool ID mapping (for reverse lookup)
    static RUNE_TO_POOL: RefCell<Option<StableBTreeMap<[u8; 32], PoolId, Memory>>> = const { RefCell::new(None) };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/// Initialize trading storage with memory regions
pub fn init_trading_storage(
    pools_memory: Memory,
    lp_positions_memory: Memory,
    events_memory: Memory,
    user_balances_memory: Memory,
    icp_balances_memory: Memory,
    rune_to_pool_memory: Memory,
) {
    POOLS.with(|p| {
        *p.borrow_mut() = Some(StableBTreeMap::init(pools_memory));
    });
    LP_POSITIONS.with(|l| {
        *l.borrow_mut() = Some(StableBTreeMap::init(lp_positions_memory));
    });
    TRADE_EVENTS.with(|e| {
        *e.borrow_mut() = Some(StableBTreeMap::init(events_memory));
    });
    USER_BALANCES.with(|b| {
        *b.borrow_mut() = Some(StableBTreeMap::init(user_balances_memory));
    });
    ICP_BALANCES.with(|b| {
        *b.borrow_mut() = Some(StableBTreeMap::init(icp_balances_memory));
    });
    RUNE_TO_POOL.with(|r| {
        *r.borrow_mut() = Some(StableBTreeMap::init(rune_to_pool_memory));
    });
}

/// Reinitialize storage after upgrade
pub fn reinit_trading_storage(
    pools_memory: Memory,
    lp_positions_memory: Memory,
    events_memory: Memory,
    user_balances_memory: Memory,
    icp_balances_memory: Memory,
    rune_to_pool_memory: Memory,
) {
    // Same as init - StableBTreeMap::init restores existing data
    init_trading_storage(
        pools_memory,
        lp_positions_memory,
        events_memory,
        user_balances_memory,
        icp_balances_memory,
        rune_to_pool_memory,
    );
}

// ============================================================================
// POOL OPERATIONS
// ============================================================================

/// Get next event ID
fn next_event_id() -> u64 {
    EVENT_COUNTER.with(|c| {
        let id = *c.borrow();
        *c.borrow_mut() = id + 1;
        id
    })
}

/// Create a new trading pool with bonding curve
pub fn create_pool(
    rune_id: &str,
    rune_name: &str,
    symbol: &str,
    divisibility: u8,
    total_supply: u64,
    initial_icp: u64,
    initial_runes: u64,
    creator: Principal,
) -> Result<TradingPool, String> {
    // Validate inputs
    if rune_id.is_empty() || rune_id.len() > MAX_RUNE_ID_LENGTH {
        return Err("Invalid rune ID length".to_string());
    }
    if initial_icp < MIN_LIQUIDITY_ICP {
        return Err(format!("Minimum ICP liquidity is {} e8s", MIN_LIQUIDITY_ICP));
    }
    if initial_runes == 0 {
        return Err("Initial runes must be > 0".to_string());
    }

    let pool_id = PoolId::from_rune_id(rune_id);

    // Check if pool already exists
    if get_pool(&pool_id).is_some() {
        return Err("Pool already exists for this rune".to_string());
    }

    let now = ic_cdk::api::time();

    // Calculate initial k constant
    let effective_icp = VIRTUAL_ICP_RESERVE + initial_icp;
    let effective_runes = VIRTUAL_RUNE_RESERVE + initial_runes;
    let k_constant = (effective_icp as u128) * (effective_runes as u128);

    // Calculate initial LP tokens (sqrt of product)
    let initial_lp = ((initial_icp as u128) * (initial_runes as u128))
        .integer_sqrt() as u64;

    let pool = TradingPool {
        id: pool_id.clone(),
        rune_id: rune_id.to_string(),
        rune_name: rune_name.to_string(),
        symbol: symbol.to_string(),
        divisibility,
        icp_reserve: initial_icp,
        rune_reserve: initial_runes,
        virtual_icp_reserve: VIRTUAL_ICP_RESERVE,
        virtual_rune_reserve: VIRTUAL_RUNE_RESERVE,
        pool_type: PoolType::Bonding,
        graduation_status: GraduationStatus::Bonding,
        total_supply,
        k_constant,
        total_lp_supply: initial_lp,
        fees_collected_icp: 0,
        fees_collected_runes: 0,
        protocol_fees_pending: 0,
        total_volume_icp: 0,
        total_trades: 0,
        unique_traders: 0,
        creator,
        created_at: now,
        last_trade_at: now,
        is_active: true,
    };

    // Store pool
    save_pool(&pool)?;

    // Create LP position for creator
    let lp_key = LPPositionKey {
        pool_id: pool_id.clone(),
        owner: creator,
    };
    let lp_position = LPPosition {
        lp_balance: initial_lp,
        icp_deposited: initial_icp,
        runes_deposited: initial_runes,
        rewards_earned: 0,
        last_reward_claim: now,
        created_at: now,
        updated_at: now,
    };
    save_lp_position(&lp_key, &lp_position)?;

    // Store rune to pool mapping
    store_rune_to_pool_mapping(rune_id, &pool_id)?;

    Ok(pool)
}

/// Get a pool by ID
pub fn get_pool(pool_id: &PoolId) -> Option<TradingPool> {
    POOLS.with(|p| {
        if let Some(ref map) = *p.borrow() {
            map.get(pool_id)
        } else {
            None
        }
    })
}

/// Get pool by rune ID string
pub fn get_pool_by_rune_id(rune_id: &str) -> Option<TradingPool> {
    let pool_id = PoolId::from_rune_id(rune_id);
    get_pool(&pool_id)
}

/// Save pool to storage
pub fn save_pool(pool: &TradingPool) -> Result<(), String> {
    POOLS.with(|p| {
        if let Some(ref mut map) = *p.borrow_mut() {
            map.insert(pool.id.clone(), pool.clone());
            Ok(())
        } else {
            Err("Pool storage not initialized".to_string())
        }
    })
}

/// Store rune ID to pool ID mapping
fn store_rune_to_pool_mapping(rune_id: &str, pool_id: &PoolId) -> Result<(), String> {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(rune_id.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);

    RUNE_TO_POOL.with(|r| {
        if let Some(ref mut map) = *r.borrow_mut() {
            map.insert(key, pool_id.clone());
            Ok(())
        } else {
            Err("Rune to pool mapping not initialized".to_string())
        }
    })
}

/// List all pools with pagination
pub fn list_pools(offset: u64, limit: u64) -> Vec<TradingPool> {
    POOLS.with(|p| {
        if let Some(ref map) = *p.borrow() {
            map.iter()
                .skip(offset as usize)
                .take(limit as usize)
                .map(|(_, pool)| pool)
                .collect()
        } else {
            vec![]
        }
    })
}

/// Get total pool count
pub fn get_pool_count() -> u64 {
    POOLS.with(|p| {
        if let Some(ref map) = *p.borrow() {
            map.len()
        } else {
            0
        }
    })
}

// ============================================================================
// LP POSITION OPERATIONS
// ============================================================================

/// Save LP position
fn save_lp_position(key: &LPPositionKey, position: &LPPosition) -> Result<(), String> {
    LP_POSITIONS.with(|l| {
        if let Some(ref mut map) = *l.borrow_mut() {
            map.insert(key.clone(), position.clone());
            Ok(())
        } else {
            Err("LP positions storage not initialized".to_string())
        }
    })
}

/// Get LP position
pub fn get_lp_position(pool_id: &PoolId, owner: Principal) -> Option<LPPosition> {
    let key = LPPositionKey {
        pool_id: pool_id.clone(),
        owner,
    };
    LP_POSITIONS.with(|l| {
        if let Some(ref map) = *l.borrow() {
            map.get(&key)
        } else {
            None
        }
    })
}

/// Get all LP positions for a user
pub fn get_user_lp_positions(owner: Principal) -> Vec<(PoolId, LPPosition)> {
    LP_POSITIONS.with(|l| {
        if let Some(ref map) = *l.borrow() {
            map.iter()
                .filter(|(key, _)| key.owner == owner)
                .map(|(key, pos)| (key.pool_id.clone(), pos))
                .collect()
        } else {
            vec![]
        }
    })
}

// ============================================================================
// TRADING OPERATIONS
// ============================================================================

/// Trade quote result
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeQuote {
    pub rune_id: String,
    pub trade_type: TradeType,
    pub input_amount: u64,
    pub output_amount: u64,
    pub price_per_rune: u64,
    pub fee: u64,
    pub protocol_fee: u64,
    pub lp_fee: u64,
    pub price_impact_bps: u16,
    pub minimum_output: u64,
    pub pool_icp_reserve: u64,
    pub pool_rune_reserve: u64,
    pub effective_price: f64,
}

/// Calculate buy quote
pub fn calculate_buy_quote(
    rune_id: &str,
    icp_amount: u64,
    slippage_bps: u64,
) -> Result<TradeQuote, String> {
    let pool = get_pool_by_rune_id(rune_id).ok_or("Pool not found")?;

    if !pool.is_active {
        return Err("Pool is not active".to_string());
    }

    // Calculate fees
    let total_fee = (icp_amount * TRADING_FEE_BPS) / 10_000;
    let protocol_fee = (icp_amount * PROTOCOL_FEE_BPS) / 10_000;
    let lp_fee = total_fee.saturating_sub(protocol_fee);
    let icp_after_fee = icp_amount.saturating_sub(total_fee);

    // Calculate effective reserves (real + virtual for bonding curve)
    let (effective_icp, effective_runes) = match pool.pool_type {
        PoolType::Bonding => (
            pool.icp_reserve + pool.virtual_icp_reserve,
            pool.rune_reserve + pool.virtual_rune_reserve,
        ),
        PoolType::AMM => (pool.icp_reserve, pool.rune_reserve),
    };

    // Constant product formula: (x + dx) * (y - dy) = k
    // dy = y - k / (x + dx)
    let new_icp = effective_icp + icp_after_fee;
    let k = (effective_icp as u128) * (effective_runes as u128);
    let new_runes = (k / new_icp as u128) as u64;
    let rune_out = effective_runes.saturating_sub(new_runes);

    if rune_out == 0 {
        return Err("Output amount is zero".to_string());
    }

    // Calculate price impact
    let price_before = (effective_icp as f64) / (effective_runes as f64);
    let price_after = (new_icp as f64) / (new_runes as f64);
    let price_impact = ((price_after - price_before) / price_before * 10_000.0).abs() as u16;

    // Calculate minimum output with slippage
    let min_output = (rune_out * (10_000 - slippage_bps)) / 10_000;

    // Price per rune
    let price_per_rune = if rune_out > 0 {
        icp_amount / rune_out
    } else {
        0
    };

    Ok(TradeQuote {
        rune_id: rune_id.to_string(),
        trade_type: TradeType::Buy,
        input_amount: icp_amount,
        output_amount: rune_out,
        price_per_rune,
        fee: total_fee,
        protocol_fee,
        lp_fee,
        price_impact_bps: price_impact,
        minimum_output: min_output,
        pool_icp_reserve: pool.icp_reserve,
        pool_rune_reserve: pool.rune_reserve,
        effective_price: price_after,
    })
}

/// Calculate sell quote
pub fn calculate_sell_quote(
    rune_id: &str,
    rune_amount: u64,
    slippage_bps: u64,
) -> Result<TradeQuote, String> {
    let pool = get_pool_by_rune_id(rune_id).ok_or("Pool not found")?;

    if !pool.is_active {
        return Err("Pool is not active".to_string());
    }

    // Calculate effective reserves
    let (effective_icp, effective_runes) = match pool.pool_type {
        PoolType::Bonding => (
            pool.icp_reserve + pool.virtual_icp_reserve,
            pool.rune_reserve + pool.virtual_rune_reserve,
        ),
        PoolType::AMM => (pool.icp_reserve, pool.rune_reserve),
    };

    // Constant product formula
    let new_runes = effective_runes + rune_amount;
    let k = (effective_icp as u128) * (effective_runes as u128);
    let new_icp = (k / new_runes as u128) as u64;
    let icp_out_before_fee = effective_icp.saturating_sub(new_icp);

    // Calculate fees
    let total_fee = (icp_out_before_fee * TRADING_FEE_BPS) / 10_000;
    let protocol_fee = (icp_out_before_fee * PROTOCOL_FEE_BPS) / 10_000;
    let lp_fee = total_fee.saturating_sub(protocol_fee);
    let icp_out = icp_out_before_fee.saturating_sub(total_fee);

    if icp_out == 0 {
        return Err("Output amount is zero".to_string());
    }

    // Calculate price impact
    let price_before = (effective_icp as f64) / (effective_runes as f64);
    let price_after = (new_icp as f64) / (new_runes as f64);
    let price_impact = ((price_after - price_before) / price_before * 10_000.0).abs() as u16;

    // Calculate minimum output with slippage
    let min_output = (icp_out * (10_000 - slippage_bps)) / 10_000;

    // Price per rune
    let price_per_rune = if rune_amount > 0 {
        icp_out / rune_amount
    } else {
        0
    };

    Ok(TradeQuote {
        rune_id: rune_id.to_string(),
        trade_type: TradeType::Sell,
        input_amount: rune_amount,
        output_amount: icp_out,
        price_per_rune,
        fee: total_fee,
        protocol_fee,
        lp_fee,
        price_impact_bps: price_impact,
        minimum_output: min_output,
        pool_icp_reserve: pool.icp_reserve,
        pool_rune_reserve: pool.rune_reserve,
        effective_price: price_after,
    })
}

/// Execute a buy trade
pub fn execute_buy(
    rune_id: &str,
    icp_amount: u64,
    min_runes_out: u64,
    trader: Principal,
) -> Result<TradeEvent, String> {
    // Get quote first
    let quote = calculate_buy_quote(rune_id, icp_amount, 0)?;

    // Check slippage
    if quote.output_amount < min_runes_out {
        return Err(format!(
            "Slippage exceeded: got {} runes, expected at least {}",
            quote.output_amount, min_runes_out
        ));
    }

    // Verify user has enough ICP
    let user_icp = get_user_icp_balance(trader);
    if user_icp.available < icp_amount {
        return Err(format!(
            "Insufficient ICP balance: have {}, need {}",
            user_icp.available, icp_amount
        ));
    }

    // Debit ICP from user
    debit_user_icp(trader, icp_amount)?;

    // Credit runes to user
    credit_user_runes(trader, rune_id, quote.output_amount)?;

    // Update pool state
    let mut pool = get_pool_by_rune_id(rune_id).ok_or("Pool not found")?;
    let now = ic_cdk::api::time();

    pool.icp_reserve = pool.icp_reserve.saturating_add(icp_amount - quote.fee);
    pool.rune_reserve = pool.rune_reserve.saturating_sub(quote.output_amount);
    pool.fees_collected_icp = pool.fees_collected_icp.saturating_add(quote.lp_fee);
    pool.protocol_fees_pending = pool.protocol_fees_pending.saturating_add(quote.protocol_fee);
    pool.total_volume_icp = pool.total_volume_icp.saturating_add(icp_amount as u128);
    pool.total_trades += 1;
    pool.last_trade_at = now;

    // Update k constant
    let (effective_icp, effective_runes) = match pool.pool_type {
        PoolType::Bonding => (
            pool.icp_reserve + pool.virtual_icp_reserve,
            pool.rune_reserve + pool.virtual_rune_reserve,
        ),
        PoolType::AMM => (pool.icp_reserve, pool.rune_reserve),
    };
    pool.k_constant = (effective_icp as u128) * (effective_runes as u128);

    // Check for graduation
    check_and_graduate_pool(&mut pool)?;

    save_pool(&pool)?;

    // Create and store event
    let event = TradeEvent {
        id: next_event_id(),
        pool_id: pool.id.clone(),
        rune_id: rune_id.to_string(),
        trader,
        trade_type: TradeType::Buy,
        icp_amount,
        rune_amount: quote.output_amount,
        price_per_rune: quote.price_per_rune,
        fee: quote.fee,
        price_impact_bps: quote.price_impact_bps,
        pool_icp_reserve_after: pool.icp_reserve,
        pool_rune_reserve_after: pool.rune_reserve,
        timestamp: now,
    };

    store_trade_event(&event)?;

    Ok(event)
}

/// Execute a sell trade
pub fn execute_sell(
    rune_id: &str,
    rune_amount: u64,
    min_icp_out: u64,
    trader: Principal,
) -> Result<TradeEvent, String> {
    // Get quote first
    let quote = calculate_sell_quote(rune_id, rune_amount, 0)?;

    // Check slippage
    if quote.output_amount < min_icp_out {
        return Err(format!(
            "Slippage exceeded: got {} ICP, expected at least {}",
            quote.output_amount, min_icp_out
        ));
    }

    // Verify user has enough runes
    let user_balance = get_user_rune_balance(trader, rune_id);
    if user_balance.available < rune_amount {
        return Err(format!(
            "Insufficient rune balance: have {}, need {}",
            user_balance.available, rune_amount
        ));
    }

    // Debit runes from user
    debit_user_runes(trader, rune_id, rune_amount)?;

    // Credit ICP to user
    credit_user_icp(trader, quote.output_amount)?;

    // Update pool state
    let mut pool = get_pool_by_rune_id(rune_id).ok_or("Pool not found")?;
    let now = ic_cdk::api::time();

    pool.rune_reserve = pool.rune_reserve.saturating_add(rune_amount);
    pool.icp_reserve = pool.icp_reserve.saturating_sub(quote.output_amount + quote.fee);
    pool.fees_collected_icp = pool.fees_collected_icp.saturating_add(quote.lp_fee);
    pool.protocol_fees_pending = pool.protocol_fees_pending.saturating_add(quote.protocol_fee);
    pool.total_volume_icp = pool.total_volume_icp.saturating_add(quote.output_amount as u128);
    pool.total_trades += 1;
    pool.last_trade_at = now;

    // Update k constant
    let (effective_icp, effective_runes) = match pool.pool_type {
        PoolType::Bonding => (
            pool.icp_reserve + pool.virtual_icp_reserve,
            pool.rune_reserve + pool.virtual_rune_reserve,
        ),
        PoolType::AMM => (pool.icp_reserve, pool.rune_reserve),
    };
    pool.k_constant = (effective_icp as u128) * (effective_runes as u128);

    save_pool(&pool)?;

    // Create and store event
    let event = TradeEvent {
        id: next_event_id(),
        pool_id: pool.id.clone(),
        rune_id: rune_id.to_string(),
        trader,
        trade_type: TradeType::Sell,
        icp_amount: quote.output_amount,
        rune_amount,
        price_per_rune: quote.price_per_rune,
        fee: quote.fee,
        price_impact_bps: quote.price_impact_bps,
        pool_icp_reserve_after: pool.icp_reserve,
        pool_rune_reserve_after: pool.rune_reserve,
        timestamp: now,
    };

    store_trade_event(&event)?;

    Ok(event)
}

/// Check if pool should graduate from bonding curve to AMM
fn check_and_graduate_pool(pool: &mut TradingPool) -> Result<(), String> {
    if pool.pool_type != PoolType::Bonding {
        return Ok(()); // Already graduated
    }

    if pool.icp_reserve < GRADUATION_THRESHOLD_ICP {
        return Ok(()); // Not ready yet
    }

    // Graduate to AMM
    let now = ic_cdk::api::time();
    let market_cap = get_pool_market_cap(pool);

    pool.pool_type = PoolType::AMM;
    pool.virtual_icp_reserve = 0;
    pool.virtual_rune_reserve = 0;
    pool.graduation_status = GraduationStatus::Graduated {
        graduated_at: now,
        final_market_cap: market_cap,
        liquidity_burned: 0, // LP tokens are not burned, just locked
    };

    // Recalculate k constant without virtual reserves
    pool.k_constant = (pool.icp_reserve as u128) * (pool.rune_reserve as u128);

    ic_cdk::println!(
        "Pool {} graduated to AMM at market cap {}",
        pool.rune_id,
        market_cap
    );

    Ok(())
}

/// Get pool market cap
pub fn get_pool_market_cap(pool: &TradingPool) -> u128 {
    let price = get_pool_price(pool);
    (price as u128) * (pool.total_supply as u128)
}

/// Get current price of a rune
pub fn get_pool_price(pool: &TradingPool) -> u64 {
    let (effective_icp, effective_runes) = match pool.pool_type {
        PoolType::Bonding => (
            pool.icp_reserve + pool.virtual_icp_reserve,
            pool.rune_reserve + pool.virtual_rune_reserve,
        ),
        PoolType::AMM => (pool.icp_reserve, pool.rune_reserve),
    };

    if effective_runes == 0 {
        return 0;
    }

    effective_icp / effective_runes
}

// ============================================================================
// USER BALANCE OPERATIONS
// ============================================================================

/// Get user's ICP balance
pub fn get_user_icp_balance(user: Principal) -> ICPBalance {
    ICP_BALANCES.with(|b| {
        if let Some(ref map) = *b.borrow() {
            map.get(&user).unwrap_or_default()
        } else {
            ICPBalance::default()
        }
    })
}

/// Credit ICP to user
pub fn credit_user_icp(user: Principal, amount: u64) -> Result<u64, String> {
    ICP_BALANCES.with(|b| {
        if let Some(ref mut map) = *b.borrow_mut() {
            let mut balance = map.get(&user).unwrap_or_default();
            balance.available = balance.available.saturating_add(amount);
            balance.updated_at = ic_cdk::api::time();
            map.insert(user, balance.clone());
            Ok(balance.available)
        } else {
            Err("ICP balance storage not initialized".to_string())
        }
    })
}

/// Debit ICP from user
pub fn debit_user_icp(user: Principal, amount: u64) -> Result<u64, String> {
    ICP_BALANCES.with(|b| {
        if let Some(ref mut map) = *b.borrow_mut() {
            let mut balance = map.get(&user).unwrap_or_default();
            if balance.available < amount {
                return Err(format!(
                    "Insufficient ICP: have {}, need {}",
                    balance.available, amount
                ));
            }
            balance.available = balance.available.saturating_sub(amount);
            balance.updated_at = ic_cdk::api::time();
            map.insert(user, balance.clone());
            Ok(balance.available)
        } else {
            Err("ICP balance storage not initialized".to_string())
        }
    })
}

/// Get user's rune balance
pub fn get_user_rune_balance(user: Principal, rune_id: &str) -> UserBalance {
    let key = BalanceKey::new(user, rune_id);
    USER_BALANCES.with(|b| {
        if let Some(ref map) = *b.borrow() {
            map.get(&key).unwrap_or_default()
        } else {
            UserBalance::default()
        }
    })
}

/// Credit runes to user
pub fn credit_user_runes(user: Principal, rune_id: &str, amount: u64) -> Result<u64, String> {
    let key = BalanceKey::new(user, rune_id);
    USER_BALANCES.with(|b| {
        if let Some(ref mut map) = *b.borrow_mut() {
            let mut balance = map.get(&key).unwrap_or_default();
            balance.available = balance.available.saturating_add(amount);
            balance.total_bought = balance.total_bought.saturating_add(amount);
            balance.updated_at = ic_cdk::api::time();
            map.insert(key, balance.clone());
            Ok(balance.available)
        } else {
            Err("User balance storage not initialized".to_string())
        }
    })
}

/// Debit runes from user
pub fn debit_user_runes(user: Principal, rune_id: &str, amount: u64) -> Result<u64, String> {
    let key = BalanceKey::new(user, rune_id);
    USER_BALANCES.with(|b| {
        if let Some(ref mut map) = *b.borrow_mut() {
            let mut balance = map.get(&key).unwrap_or_default();
            if balance.available < amount {
                return Err(format!(
                    "Insufficient runes: have {}, need {}",
                    balance.available, amount
                ));
            }
            balance.available = balance.available.saturating_sub(amount);
            balance.total_sold = balance.total_sold.saturating_add(amount);
            balance.updated_at = ic_cdk::api::time();
            map.insert(key, balance.clone());
            Ok(balance.available)
        } else {
            Err("User balance storage not initialized".to_string())
        }
    })
}

/// Get all rune balances for a user
/// Note: This is expensive as it requires iterating all balances.
/// In production, consider maintaining a separate user -> rune_ids index.
pub fn get_user_all_rune_balances(_user: Principal) -> Vec<(String, UserBalance)> {
    // TODO: Implement with a separate index mapping user -> list of rune_ids
    // For now, we return an empty list as we don't store rune_id in the balance
    USER_BALANCES.with(|_b| {
        // We can't efficiently filter by principal without a secondary index
        // since BalanceKey includes both user AND rune_id_hash
        vec![]
    })
}

// ============================================================================
// EVENT STORAGE
// ============================================================================

/// Store a trade event
fn store_trade_event(event: &TradeEvent) -> Result<(), String> {
    TRADE_EVENTS.with(|e| {
        if let Some(ref mut map) = *e.borrow_mut() {
            map.insert(EventId(event.id), event.clone());
            Ok(())
        } else {
            Err("Trade events storage not initialized".to_string())
        }
    })
}

/// Get trade events for a rune (most recent first)
pub fn get_trade_events(rune_id: &str, limit: u64) -> Vec<TradeEvent> {
    TRADE_EVENTS.with(|e| {
        if let Some(ref map) = *e.borrow() {
            map.iter()
                .filter(|(_, event)| event.rune_id == rune_id)
                .map(|(_, event)| event)
                .rev()
                .take(limit as usize)
                .collect()
        } else {
            vec![]
        }
    })
}

/// Get trade events for a user
pub fn get_user_trade_events(user: Principal, limit: u64) -> Vec<TradeEvent> {
    TRADE_EVENTS.with(|e| {
        if let Some(ref map) = *e.borrow() {
            map.iter()
                .filter(|(_, event)| event.trader == user)
                .map(|(_, event)| event)
                .rev()
                .take(limit as usize)
                .collect()
        } else {
            vec![]
        }
    })
}

/// Get total event count
pub fn get_event_count() -> u64 {
    TRADE_EVENTS.with(|e| {
        if let Some(ref map) = *e.borrow() {
            map.len()
        } else {
            0
        }
    })
}

// ============================================================================
// LIQUIDITY OPERATIONS
// ============================================================================

/// Add liquidity to a pool (AMM mode only)
pub fn add_liquidity(
    rune_id: &str,
    icp_amount: u64,
    max_runes: u64,
    provider: Principal,
) -> Result<(u64, u64, u64), String> {
    let mut pool = get_pool_by_rune_id(rune_id).ok_or("Pool not found")?;

    if pool.pool_type != PoolType::AMM {
        return Err("Can only add liquidity to graduated AMM pools".to_string());
    }

    // Calculate required runes to maintain ratio
    let runes_needed = if pool.total_lp_supply == 0 {
        max_runes
    } else {
        (icp_amount as u128 * pool.rune_reserve as u128 / pool.icp_reserve as u128) as u64
    };

    if runes_needed > max_runes {
        return Err(format!(
            "Need {} runes but max is {}",
            runes_needed, max_runes
        ));
    }

    // Verify and debit user balances
    debit_user_icp(provider, icp_amount)?;
    debit_user_runes(provider, rune_id, runes_needed)?;

    // Calculate LP tokens to mint
    let lp_tokens = if pool.total_lp_supply == 0 {
        ((icp_amount as u128 * runes_needed as u128).integer_sqrt()) as u64
    } else {
        (icp_amount as u128 * pool.total_lp_supply as u128 / pool.icp_reserve as u128) as u64
    };

    // Update pool
    let now = ic_cdk::api::time();
    pool.icp_reserve = pool.icp_reserve.saturating_add(icp_amount);
    pool.rune_reserve = pool.rune_reserve.saturating_add(runes_needed);
    pool.total_lp_supply = pool.total_lp_supply.saturating_add(lp_tokens);
    pool.k_constant = (pool.icp_reserve as u128) * (pool.rune_reserve as u128);
    save_pool(&pool)?;

    // Update LP position
    let lp_key = LPPositionKey {
        pool_id: pool.id.clone(),
        owner: provider,
    };
    let mut position = get_lp_position(&pool.id, provider).unwrap_or_default();
    position.lp_balance = position.lp_balance.saturating_add(lp_tokens);
    position.icp_deposited = position.icp_deposited.saturating_add(icp_amount);
    position.runes_deposited = position.runes_deposited.saturating_add(runes_needed);
    if position.created_at == 0 {
        position.created_at = now;
    }
    position.updated_at = now;
    save_lp_position(&lp_key, &position)?;

    Ok((icp_amount, runes_needed, lp_tokens))
}

/// Remove liquidity from a pool
pub fn remove_liquidity(
    rune_id: &str,
    lp_amount: u64,
    min_icp: u64,
    min_runes: u64,
    provider: Principal,
) -> Result<(u64, u64), String> {
    let mut pool = get_pool_by_rune_id(rune_id).ok_or("Pool not found")?;

    // Verify LP position
    let position = get_lp_position(&pool.id, provider).ok_or("No LP position found")?;
    if position.lp_balance < lp_amount {
        return Err(format!(
            "Insufficient LP balance: have {}, need {}",
            position.lp_balance, lp_amount
        ));
    }

    // Calculate share
    let share_bps = (lp_amount as u128 * 10_000 / pool.total_lp_supply as u128) as u64;
    let icp_out = (pool.icp_reserve as u128 * share_bps as u128 / 10_000) as u64;
    let runes_out = (pool.rune_reserve as u128 * share_bps as u128 / 10_000) as u64;

    // Check minimums
    if icp_out < min_icp {
        return Err(format!("ICP output {} below minimum {}", icp_out, min_icp));
    }
    if runes_out < min_runes {
        return Err(format!(
            "Runes output {} below minimum {}",
            runes_out, min_runes
        ));
    }

    // Update pool
    let now = ic_cdk::api::time();
    pool.icp_reserve = pool.icp_reserve.saturating_sub(icp_out);
    pool.rune_reserve = pool.rune_reserve.saturating_sub(runes_out);
    pool.total_lp_supply = pool.total_lp_supply.saturating_sub(lp_amount);
    pool.k_constant = (pool.icp_reserve as u128) * (pool.rune_reserve as u128);
    save_pool(&pool)?;

    // Update LP position
    let lp_key = LPPositionKey {
        pool_id: pool.id.clone(),
        owner: provider,
    };
    let mut updated_position = position.clone();
    updated_position.lp_balance = updated_position.lp_balance.saturating_sub(lp_amount);
    updated_position.updated_at = now;

    if updated_position.lp_balance == 0 {
        // Remove position entirely
        LP_POSITIONS.with(|l| {
            if let Some(ref mut map) = *l.borrow_mut() {
                map.remove(&lp_key);
            }
        });
    } else {
        save_lp_position(&lp_key, &updated_position)?;
    }

    // Credit user
    credit_user_icp(provider, icp_out)?;
    credit_user_runes(provider, rune_id, runes_out)?;

    Ok((icp_out, runes_out))
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/// Helper trait for integer square root
trait IntegerSqrt {
    fn integer_sqrt(self) -> Self;
}

impl IntegerSqrt for u128 {
    fn integer_sqrt(self) -> Self {
        if self == 0 {
            return 0;
        }
        let mut x = self;
        let mut y = (x + 1) / 2;
        while y < x {
            x = y;
            y = (x + self / x) / 2;
        }
        x
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pool_id_creation() {
        let rune_id = "test_rune_123";
        let pool_id = PoolId::from_rune_id(rune_id);
        assert_eq!(pool_id.0.len(), 32);

        // Same input produces same output
        let pool_id2 = PoolId::from_rune_id(rune_id);
        assert_eq!(pool_id, pool_id2);

        // Different input produces different output
        let pool_id3 = PoolId::from_rune_id("other_rune");
        assert_ne!(pool_id, pool_id3);
    }

    #[test]
    fn test_fee_calculation() {
        let amount = 1_00_000_000u64; // 1 ICP
        let total_fee = (amount * TRADING_FEE_BPS) / 10_000;
        assert_eq!(total_fee, 300_000); // 0.3%

        let protocol_fee = (amount * PROTOCOL_FEE_BPS) / 10_000;
        assert_eq!(protocol_fee, 100_000); // 0.1%

        let lp_fee = total_fee - protocol_fee;
        assert_eq!(lp_fee, 200_000); // 0.2%
    }

    #[test]
    fn test_integer_sqrt() {
        assert_eq!(0u128.integer_sqrt(), 0);
        assert_eq!(1u128.integer_sqrt(), 1);
        assert_eq!(4u128.integer_sqrt(), 2);
        assert_eq!(100u128.integer_sqrt(), 10);
        assert_eq!(1000000u128.integer_sqrt(), 1000);
    }
}
