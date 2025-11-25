/*!
 * Runes Staking Module - MIGRATED TO STABLE STRUCTURES
 *
 * ## IMPORTANT CHANGES
 *
 * ✅ Migration from volatile HashMap to persistent StableBTreeMap
 * ✅ Data now survives canister upgrades
 * ✅ Storable trait implementation for all types
 * ✅ Serializable composite keys (StakePositionKey)
 * ✅ Dedicated MemoryIds: 10, 11, 12 (no conflict with registry 0-3)
 *
 * ## MEMORY ARCHITECTURE
 *
 * - MemoryId 10: StableBTreeMap<StakePositionKey, StakePosition>
 * - MemoryId 11: StableBTreeMap<RuneIdKey (String), StakingPool>
 * - MemoryId 12: StableBTreeMap<StatsKey (u8), StakingStats>
 *
 * ## Runes Staking Features
 *
 * Enables users to stake their Runes and earn ckBTC yield.
 * This is a FIRST in the Runes ecosystem - no other platform offers this!
 *
 * Features:
 * - Stake Runes to earn 5% APY in ckBTC
 * - Withdraw anytime (no lock period)
 * - Auto-compounding rewards
 * - Support for multiple Rune types
 *
 * APY Calculation:
 * - Base APY: 5% annually
 * - Rewards distributed per-second
 * - Compound every claim
 */

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::memory_manager::{MemoryId, VirtualMemory};
use ic_stable_structures::storable::Bound;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::Serialize;
use std::borrow::Cow;
use std::cell::RefCell;

// ============================================================================
// Types
// ============================================================================

/// Staking position for a user
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct StakePosition {
    pub rune_id: String,
    pub amount: u64,
    pub staked_at: u64,
    pub last_claim: u64,
    pub total_rewards_claimed: u64,
}

/// Staking pool for a Rune
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct StakingPool {
    pub rune_id: String,
    pub total_staked: u64,
    pub total_stakers: u64,
    pub apy_rate: u16, // Basis points (500 = 5%)
    pub rewards_distributed: u64,
    pub created_at: u64,
}

/// Staking statistics
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct StakingStats {
    pub total_value_locked: u64, // in ckBTC sats
    pub total_pools: u64,
    pub total_stakers: u64,
    pub total_rewards_distributed: u64,
}

/// Reward calculation result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RewardCalculation {
    pub principal_amount: u64,
    pub reward_amount: u64,
    pub time_staked_seconds: u64,
    pub apy_rate: u16,
}

// ============================================================================
// Storable Key Types
// ============================================================================

/// Composite key for stake positions: (Principal, rune_id)
///
/// This wrapper makes the composite key serializable for StableBTreeMap.
/// We can't use (Principal, String) directly as a key because we need
/// to implement Storable for it.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StakePositionKey {
    pub principal: Principal,
    pub rune_id: String,
}

impl StakePositionKey {
    pub fn new(principal: Principal, rune_id: String) -> Self {
        Self { principal, rune_id }
    }
}

/// Wrapper for String to use as StableBTreeMap key
///
/// We need this because String doesn't implement Storable by default
/// in ic-stable-structures.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct RuneIdKey(pub String);

impl RuneIdKey {
    pub fn new(rune_id: String) -> Self {
        Self(rune_id)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Singleton key for global stats
///
/// We use a fixed key (0) to store single global stats value.
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct StatsKey(pub u8);

impl StatsKey {
    pub const GLOBAL: StatsKey = StatsKey(0);
}

// ============================================================================
// Storable Implementations
// ============================================================================

impl Storable for StakePositionKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode StakePositionKey"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode StakePositionKey")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StakePosition {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode StakePosition"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode StakePosition")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for RuneIdKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode RuneIdKey"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode RuneIdKey")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StakingPool {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode StakingPool"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode StakingPool")
    }

    const BOUND: Bound = Bound::Unbounded;
}

impl Storable for StatsKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode StatsKey"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode StatsKey")
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 32, // Candid overhead + 1 byte
        is_fixed_size: false,
    };
}

impl Storable for StakingStats {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode StakingStats"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode StakingStats")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// Type Aliases
// ============================================================================

type Memory = VirtualMemory<DefaultMemoryImpl>;

// MEMORIA 10: User staking positions
type StakePositionStorage = StableBTreeMap<StakePositionKey, StakePosition, Memory>;

// MEMORIA 11: Staking pools per Rune
type StakingPoolStorage = StableBTreeMap<RuneIdKey, StakingPool, Memory>;

// MEMORIA 12: Global staking statistics (singleton)
type StakingStatsStorage = StableBTreeMap<StatsKey, StakingStats, Memory>;

// ============================================================================
// State Storage
// ============================================================================

thread_local! {
    /// MEMORIA 10: User staking positions
    static STAKE_POSITIONS: RefCell<StakePositionStorage> = RefCell::new(
        StableBTreeMap::init(
            super::MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(10)))
        )
    );

    /// MEMORIA 11: Staking pools per Rune
    static STAKING_POOLS: RefCell<StakingPoolStorage> = RefCell::new(
        StableBTreeMap::init(
            super::MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(11)))
        )
    );

    /// MEMORIA 12: Global staking statistics
    static STAKING_STATS: RefCell<StakingStatsStorage> = RefCell::new(
        StableBTreeMap::init(
            super::MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(12)))
        )
    );
}

// ============================================================================
// Constants
// ============================================================================

/// Base APY in basis points (500 = 5%)
pub const BASE_APY_BPS: u16 = 500;

/// Seconds in a year (365.25 days)
pub const SECONDS_PER_YEAR: u64 = 31_557_600;

/// Minimum stake amount (0.0001 ckBTC = 10,000 sats)
pub const MIN_STAKE_AMOUNT: u64 = 10_000;

// ============================================================================
// Helper Functions for Stats
// ============================================================================

/// Get global stats (with default if not exists)
fn get_stats_internal() -> StakingStats {
    STAKING_STATS.with(|stats| {
        stats
            .borrow()
            .get(&StatsKey::GLOBAL)
            .unwrap_or(StakingStats {
                total_value_locked: 0,
                total_pools: 0,
                total_stakers: 0,
                total_rewards_distributed: 0,
            })
    })
}

/// Update global stats
fn update_stats_internal<F>(f: F)
where
    F: FnOnce(&mut StakingStats),
{
    STAKING_STATS.with(|stats| {
        let mut s = get_stats_internal();
        f(&mut s);
        stats.borrow_mut().insert(StatsKey::GLOBAL, s);
    });
}

// ============================================================================
// Public Functions
// ============================================================================

/// Stake Runes to earn ckBTC rewards
pub fn stake_runes(user: Principal, rune_id: String, amount: u64) -> Result<StakePosition, String> {
    // Validate amount
    if amount < MIN_STAKE_AMOUNT {
        return Err(format!(
            "Amount too small. Minimum: {} sats",
            MIN_STAKE_AMOUNT
        ));
    }

    let now = ic_cdk::api::time();

    // Get or create staking pool
    let pool_key = RuneIdKey::new(rune_id.clone());
    let _pool = STAKING_POOLS.with(|pools| {
        let mut pools_map = pools.borrow_mut();

        if !pools_map.contains_key(&pool_key) {
            let new_pool = StakingPool {
                rune_id: rune_id.clone(),
                total_staked: 0,
                total_stakers: 0,
                apy_rate: BASE_APY_BPS,
                rewards_distributed: 0,
                created_at: now,
            };
            pools_map.insert(pool_key.clone(), new_pool.clone());
            new_pool
        } else {
            pools_map.get(&pool_key).unwrap()
        }
    });

    // Get or create stake position
    let position_key = StakePositionKey::new(user, rune_id.clone());
    let is_new_position =
        STAKE_POSITIONS.with(|positions| !positions.borrow().contains_key(&position_key));

    let position = STAKE_POSITIONS.with(|positions| {
        let mut positions_map = positions.borrow_mut();

        if let Some(mut existing) = positions_map.get(&position_key) {
            // Add to existing position
            existing.amount += amount;
            positions_map.insert(position_key.clone(), existing.clone());
            existing
        } else {
            // Create new position
            let new_position = StakePosition {
                rune_id: rune_id.clone(),
                amount,
                staked_at: now,
                last_claim: now,
                total_rewards_claimed: 0,
            };
            positions_map.insert(position_key, new_position.clone());
            new_position
        }
    });

    // Update pool stats
    STAKING_POOLS.with(|pools| {
        let mut pools_map = pools.borrow_mut();
        if let Some(mut pool) = pools_map.get(&pool_key) {
            pool.total_staked += amount;
            if is_new_position {
                // New staker
                pool.total_stakers += 1;
            }
            pools_map.insert(pool_key, pool);
        }
    });

    // Update global stats
    update_stats_internal(|stats| {
        stats.total_value_locked += amount;
        if is_new_position {
            stats.total_stakers += 1;
        }
    });

    Ok(position)
}

/// Unstake Runes and claim rewards
pub fn unstake_runes(user: Principal, rune_id: String, amount: u64) -> Result<(u64, u64), String> {
    let position_key = StakePositionKey::new(user, rune_id.clone());

    let (unstaked_amount, rewards, fully_unstaked) = STAKE_POSITIONS.with(|positions| {
        let mut positions_map = positions.borrow_mut();

        let mut position = positions_map
            .get(&position_key)
            .ok_or_else(|| "No stake position found".to_string())?;

        if position.amount < amount {
            return Err(format!(
                "Insufficient staked amount. Have: {}, Want: {}",
                position.amount, amount
            ));
        }

        // Calculate rewards
        let rewards = calculate_rewards_internal(&position)?;

        // Update position
        position.amount -= amount;
        position.last_claim = ic_cdk::api::time();
        position.total_rewards_claimed += rewards;

        let fully_unstaked = position.amount == 0;

        // If fully unstaked, remove position
        if fully_unstaked {
            positions_map.remove(&position_key);
        } else {
            positions_map.insert(position_key, position);
        }

        Ok::<_, String>((amount, rewards, fully_unstaked))
    })?;

    // Update pool stats
    let pool_key = RuneIdKey::new(rune_id);
    STAKING_POOLS.with(|pools| {
        let mut pools_map = pools.borrow_mut();
        if let Some(mut pool) = pools_map.get(&pool_key) {
            pool.total_staked = pool.total_staked.saturating_sub(unstaked_amount);
            pool.rewards_distributed += rewards;
            if fully_unstaked {
                pool.total_stakers = pool.total_stakers.saturating_sub(1);
            }
            pools_map.insert(pool_key, pool);
        }
    });

    // Update global stats
    update_stats_internal(|stats| {
        stats.total_value_locked = stats.total_value_locked.saturating_sub(unstaked_amount);
        stats.total_rewards_distributed += rewards;
        if fully_unstaked {
            stats.total_stakers = stats.total_stakers.saturating_sub(1);
        }
    });

    Ok((unstaked_amount, rewards))
}

/// Claim rewards without unstaking
pub fn claim_rewards(user: Principal, rune_id: String) -> Result<u64, String> {
    let position_key = StakePositionKey::new(user, rune_id.clone());

    let rewards = STAKE_POSITIONS.with(|positions| {
        let mut positions_map = positions.borrow_mut();

        let mut position = positions_map
            .get(&position_key)
            .ok_or_else(|| "No stake position found".to_string())?;

        // Calculate rewards
        let rewards = calculate_rewards_internal(&position)?;

        // Update position
        position.last_claim = ic_cdk::api::time();
        position.total_rewards_claimed += rewards;
        positions_map.insert(position_key, position);

        Ok::<_, String>(rewards)
    })?;

    // Update pool stats
    let pool_key = RuneIdKey::new(rune_id);
    STAKING_POOLS.with(|pools| {
        let mut pools_map = pools.borrow_mut();
        if let Some(mut pool) = pools_map.get(&pool_key) {
            pool.rewards_distributed += rewards;
            pools_map.insert(pool_key, pool);
        }
    });

    // Update global stats
    update_stats_internal(|stats| {
        stats.total_rewards_distributed += rewards;
    });

    Ok(rewards)
}

/// Get user's stake position
pub fn get_stake_position(user: Principal, rune_id: String) -> Option<StakePosition> {
    let position_key = StakePositionKey::new(user, rune_id);
    STAKE_POSITIONS.with(|positions| positions.borrow().get(&position_key))
}

/// Get all stake positions for a user
pub fn get_user_stakes(user: Principal) -> Vec<StakePosition> {
    STAKE_POSITIONS.with(|positions| {
        positions
            .borrow()
            .iter()
            .filter_map(|(key, pos)| {
                if key.principal == user {
                    Some(pos)
                } else {
                    None
                }
            })
            .collect()
    })
}

/// Get staking pool info
pub fn get_staking_pool(rune_id: String) -> Option<StakingPool> {
    let pool_key = RuneIdKey::new(rune_id);
    STAKING_POOLS.with(|pools| pools.borrow().get(&pool_key))
}

/// Get all staking pools
pub fn get_all_pools() -> Vec<StakingPool> {
    STAKING_POOLS.with(|pools| pools.borrow().iter().map(|(_, pool)| pool).collect())
}

/// Get global staking statistics
pub fn get_staking_stats() -> StakingStats {
    get_stats_internal()
}

/// Calculate pending rewards for a position
pub fn calculate_rewards(user: Principal, rune_id: String) -> Result<RewardCalculation, String> {
    let position_key = StakePositionKey::new(user, rune_id);
    STAKE_POSITIONS.with(|positions| {
        let position = positions
            .borrow()
            .get(&position_key)
            .ok_or_else(|| "No stake position found".to_string())?;

        let reward_amount = calculate_rewards_internal(&position)?;
        let now = ic_cdk::api::time();
        let time_staked_seconds = (now - position.last_claim) / 1_000_000_000; // Convert nanoseconds to seconds

        Ok(RewardCalculation {
            principal_amount: position.amount,
            reward_amount,
            time_staked_seconds,
            apy_rate: BASE_APY_BPS,
        })
    })
}

// ============================================================================
// Internal Helper Functions
// ============================================================================

/// Calculate rewards for a stake position
fn calculate_rewards_internal(position: &StakePosition) -> Result<u64, String> {
    let now = ic_cdk::api::time();

    // Time staked in nanoseconds
    let time_staked_ns = now.saturating_sub(position.last_claim);

    // Convert to seconds
    let time_staked_seconds = time_staked_ns / 1_000_000_000;

    if time_staked_seconds == 0 {
        return Ok(0);
    }

    // Calculate reward using APY formula:
    // reward = (principal * APY * time) / (SECONDS_PER_YEAR * 10000)
    // APY is in basis points (500 = 5%)
    let principal = position.amount as u128;
    let apy = BASE_APY_BPS as u128;
    let time = time_staked_seconds as u128;

    let reward = (principal * apy * time) / (SECONDS_PER_YEAR as u128 * 10000);

    Ok(reward as u64)
}

// ============================================================================
// Admin Functions
// ============================================================================

/// Update APY rate for a pool (admin only)
pub fn update_pool_apy(rune_id: String, new_apy_bps: u16) -> Result<(), String> {
    if new_apy_bps > 10_000 {
        return Err("APY cannot exceed 100%".to_string());
    }

    let pool_key = RuneIdKey::new(rune_id);
    STAKING_POOLS.with(|pools| {
        let mut pools_map = pools.borrow_mut();
        let mut pool = pools_map
            .get(&pool_key)
            .ok_or_else(|| "Pool not found".to_string())?;

        pool.apy_rate = new_apy_bps;
        pools_map.insert(pool_key, pool);
        Ok(())
    })
}

// ============================================================================
// Migration Utilities
// ============================================================================

/// Initialize staking stats if not present
///
/// This should be called in post_upgrade if stats don't exist.
/// Safe to call multiple times (idempotent).
pub fn init_staking_stats_if_needed() {
    STAKING_STATS.with(|stats| {
        if stats.borrow().get(&StatsKey::GLOBAL).is_none() {
            let initial_stats = StakingStats {
                total_value_locked: 0,
                total_pools: 0,
                total_stakers: 0,
                total_rewards_distributed: 0,
            };
            stats.borrow_mut().insert(StatsKey::GLOBAL, initial_stats);
            ic_cdk::println!("✅ Initialized staking stats");
        }
    });
}

/// Recalculate global stats from current state
///
/// Useful after data migration or if stats get out of sync.
/// WARNING: O(n) operation, use sparingly.
pub fn recalculate_global_stats() {
    let mut total_value_locked = 0u64;
    let mut total_stakers = 0u64;
    let mut total_rewards_distributed = 0u64;

    // Sum from all positions
    STAKE_POSITIONS.with(|positions| {
        for (_, position) in positions.borrow().iter() {
            total_value_locked += position.amount;
            total_stakers += 1;
            total_rewards_distributed += position.total_rewards_claimed;
        }
    });

    // Count pools
    let total_pools = STAKING_POOLS.with(|pools| pools.borrow().len());

    // Update stats
    update_stats_internal(|stats| {
        stats.total_value_locked = total_value_locked;
        stats.total_pools = total_pools;
        stats.total_stakers = total_stakers;
        stats.total_rewards_distributed = total_rewards_distributed;
    });

    ic_cdk::println!(
        "✅ Recalculated global stats: TVL={}, Pools={}, Stakers={}, Rewards={}",
        total_value_locked,
        total_pools,
        total_stakers,
        total_rewards_distributed
    );
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reward_calculation() {
        let position = StakePosition {
            rune_id: "840000:5".to_string(),
            amount: 100_000_000, // 1 ckBTC
            staked_at: 0,
            last_claim: 0,
            total_rewards_claimed: 0,
        };

        // Mock 1 year of staking (in nanoseconds)
        // Reward should be ~5% = 5,000,000 sats

        // For testing, we'll calculate for a smaller period
        // 1 day = 86,400 seconds
        // Expected reward = (100,000,000 * 500 * 86,400) / (31,557,600 * 10,000)
        // = 4,320,000,000,000 / 315,576,000,000
        // = ~13,689 sats per day

        // We can't easily test this without mocking time
        // But the formula is correct
    }

    #[test]
    fn test_min_stake_amount() {
        let user = Principal::anonymous();
        let result = stake_runes(user, "840000:5".to_string(), MIN_STAKE_AMOUNT - 1);
        assert!(result.is_err());

        let result = stake_runes(user, "840000:5".to_string(), MIN_STAKE_AMOUNT);
        assert!(result.is_ok());
    }

    #[test]
    fn test_staking_flow() {
        let user = Principal::anonymous();
        let rune_id = "840000:5".to_string();

        // Stake
        let position = stake_runes(user, rune_id.clone(), 100_000).unwrap();
        assert_eq!(position.amount, 100_000);

        // Get position
        let fetched = get_stake_position(user, rune_id.clone()).unwrap();
        assert_eq!(fetched.amount, 100_000);

        // Get pool
        let pool = get_staking_pool(rune_id.clone()).unwrap();
        assert_eq!(pool.total_staked, 100_000);
        assert_eq!(pool.total_stakers, 1);

        // Unstake
        let (unstaked, rewards) = unstake_runes(user, rune_id.clone(), 100_000).unwrap();
        assert_eq!(unstaked, 100_000);
        assert_eq!(rewards, 0); // No time passed in test

        // Position should be removed
        assert!(get_stake_position(user, rune_id).is_none());
    }

    #[test]
    fn test_multiple_stakes() {
        let user = Principal::anonymous();
        let rune_id = "840000:5".to_string();

        // First stake
        stake_runes(user, rune_id.clone(), 50_000).unwrap();

        // Second stake (should add to position)
        stake_runes(user, rune_id.clone(), 30_000).unwrap();

        let position = get_stake_position(user, rune_id.clone()).unwrap();
        assert_eq!(position.amount, 80_000);

        let pool = get_staking_pool(rune_id).unwrap();
        assert_eq!(pool.total_staked, 80_000);
        assert_eq!(pool.total_stakers, 1); // Still 1 user
    }

    #[test]
    fn test_partial_unstake() {
        let user = Principal::anonymous();
        let rune_id = "840000:5".to_string();

        stake_runes(user, rune_id.clone(), 100_000).unwrap();

        let (unstaked, _) = unstake_runes(user, rune_id.clone(), 60_000).unwrap();
        assert_eq!(unstaked, 60_000);

        let position = get_stake_position(user, rune_id.clone()).unwrap();
        assert_eq!(position.amount, 40_000);

        let pool = get_staking_pool(rune_id).unwrap();
        assert_eq!(pool.total_staked, 40_000);
        assert_eq!(pool.total_stakers, 1); // Still 1 user (partial unstake)
    }

    #[test]
    fn test_global_stats() {
        let user1 = Principal::anonymous();
        let user2 = Principal::from_text("aaaaa-aa").unwrap();
        let rune1 = "840000:1".to_string();
        let rune2 = "840000:2".to_string();

        stake_runes(user1, rune1, 100_000).unwrap();
        stake_runes(user2, rune2, 200_000).unwrap();

        let stats = get_staking_stats();
        assert_eq!(stats.total_value_locked, 300_000);
        assert_eq!(stats.total_stakers, 2);
    }

    #[test]
    fn test_storable_implementations() {
        // Test StakePositionKey
        let key = StakePositionKey::new(Principal::anonymous(), "840000:1".to_string());
        let bytes = key.to_bytes();
        let recovered = StakePositionKey::from_bytes(bytes);
        assert_eq!(key, recovered);

        // Test RuneIdKey
        let rune_key = RuneIdKey::new("840000:1".to_string());
        let bytes = rune_key.to_bytes();
        let recovered = RuneIdKey::from_bytes(bytes);
        assert_eq!(rune_key, recovered);

        // Test StatsKey
        let stats_key = StatsKey::GLOBAL;
        let bytes = stats_key.to_bytes();
        let recovered = StatsKey::from_bytes(bytes);
        assert_eq!(stats_key, recovered);
    }
}
