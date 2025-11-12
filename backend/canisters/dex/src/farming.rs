use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::time;
use serde::Serialize;
use std::collections::HashMap;

/// Liquidity Mining & Farming System
///
/// Professional implementation of liquidity incentives to attract and retain
/// liquidity providers. Based on proven models from:
/// - Uniswap V2 SUSHI rewards
/// - Curve Finance gauge system
/// - Synthetix staking rewards
///
/// Features:
/// - LP token staking
/// - QURI token rewards
/// - Multiple reward tokens support
/// - Boost multipliers
/// - Time-weighted rewards
/// - Emergency withdrawal
/// - Reward scheduling

// ============================================================================
// Constants
// ============================================================================

/// Precision for reward calculations (1e18)
pub const REWARD_PRECISION: u128 = 1_000_000_000_000_000_000;

/// Minimum stake duration for full rewards (7 days in nanoseconds)
pub const MIN_STAKE_DURATION: u64 = 7 * 24 * 60 * 60 * 1_000_000_000;

/// Maximum boost multiplier (2x)
pub const MAX_BOOST_MULTIPLIER: u128 = 2 * REWARD_PRECISION;

// ============================================================================
// Types
// ============================================================================

/// Liquidity farm for a pool
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct LiquidityFarm {
    /// Pool ID
    pub pool_id: String,

    /// Total LP tokens staked
    pub total_staked: Nat,

    /// Reward rate (QURI tokens per second)
    pub reward_rate: Nat,

    /// Last update timestamp
    pub last_update: u64,

    /// Accumulated reward per LP token (scaled by REWARD_PRECISION)
    pub reward_per_token_stored: Nat,

    /// Farm start time
    pub start_time: u64,

    /// Farm end time (0 = no end)
    pub end_time: u64,

    /// Total rewards distributed
    pub total_rewards_distributed: Nat,

    /// Active stakers count
    pub stakers_count: u64,

    /// Farm configuration
    pub config: FarmConfig,
}

/// Farm configuration
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct FarmConfig {
    /// Enable boost multipliers
    pub enable_boost: bool,

    /// Boost parameters
    pub boost_config: BoostConfig,

    /// Minimum stake amount
    pub min_stake_amount: Nat,

    /// Emergency withdrawal enabled
    pub emergency_withdrawal_enabled: bool,

    /// Reward token canister
    pub reward_token: Principal,
}

/// Boost configuration
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BoostConfig {
    /// Time-based boost: stake longer = higher multiplier
    pub time_based_boost: bool,

    /// Max boost from time (e.g., 1.5x after 30 days)
    pub max_time_boost: f64,

    /// Days to reach max time boost
    pub days_to_max_boost: u64,

    /// Amount-based boost: stake more = higher multiplier
    pub amount_based_boost: bool,

    /// Threshold amounts for boost tiers
    pub boost_tiers: Vec<BoostTier>,
}

/// Boost tier
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BoostTier {
    pub min_amount: Nat,
    pub multiplier: f64, // 1.0 = no boost, 1.5 = 50% boost
}

/// User stake in a farm
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserStake {
    /// Amount of LP tokens staked
    pub amount: Nat,

    /// Reward debt (for reward calculation)
    pub reward_debt: Nat,

    /// Pending rewards (accumulated but not claimed)
    pub pending_rewards: Nat,

    /// Stake timestamp
    pub staked_at: u64,

    /// Last claim timestamp
    pub last_claim: u64,

    /// Total rewards claimed
    pub total_claimed: Nat,

    /// Current boost multiplier
    pub boost_multiplier: f64,
}

/// Staking result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct StakeResult {
    pub amount: Nat,
    pub pool_id: String,
    pub boost_multiplier: f64,
    pub estimated_daily_rewards: Nat,
}

/// Harvest result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct HarvestResult {
    pub rewards: Nat,
    pub rewards_usd: f64,
    pub pool_id: String,
}

/// Farm statistics
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct FarmStats {
    pub pool_id: String,
    pub total_staked: Nat,
    pub total_staked_usd: f64,
    pub apy: f64,
    pub daily_rewards: Nat,
    pub stakers_count: u64,
}

// ============================================================================
// Implementation
// ============================================================================

impl LiquidityFarm {
    /// Create new farm
    pub fn new(
        pool_id: String,
        reward_rate: Nat,
        reward_token: Principal,
        start_time: u64,
    ) -> Self {
        Self {
            pool_id,
            total_staked: Nat::from(0u64),
            reward_rate,
            last_update: start_time,
            reward_per_token_stored: Nat::from(0u64),
            start_time,
            end_time: 0,
            total_rewards_distributed: Nat::from(0u64),
            stakers_count: 0,
            config: FarmConfig {
                enable_boost: true,
                boost_config: BoostConfig::default(),
                min_stake_amount: Nat::from(1000u64),
                emergency_withdrawal_enabled: false,
                reward_token,
            },
        }
    }

    /// Stake LP tokens
    pub fn stake(
        &mut self,
        user: Principal,
        amount: Nat,
        user_stakes: &mut HashMap<(Principal, String), UserStake>,
    ) -> Result<StakeResult, String> {
        // Validate amount
        if amount < self.config.min_stake_amount {
            return Err(format!(
                "Amount below minimum stake: {}",
                self.config.min_stake_amount
            ));
        }

        // Update rewards before modifying state
        self.update_rewards();

        let now = time();
        let stake_key = (user, self.pool_id.clone());

        // Get or create user stake
        let user_stake = user_stakes.entry(stake_key.clone()).or_insert(UserStake {
            amount: Nat::from(0u64),
            reward_debt: Nat::from(0u64),
            pending_rewards: Nat::from(0u64),
            staked_at: now,
            last_claim: now,
            total_claimed: Nat::from(0u64),
            boost_multiplier: 1.0,
        });

        // Harvest pending rewards first
        if user_stake.amount > Nat::from(0u64) {
            let pending = self.calculate_pending_rewards(user_stake);
            user_stake.pending_rewards += pending;
        }

        // Add stake
        let is_new_staker = user_stake.amount == Nat::from(0u64);
        user_stake.amount += amount.clone();

        // Update stake time if new staker
        if is_new_staker {
            user_stake.staked_at = now;
            self.stakers_count += 1;
        }

        // Calculate boost multiplier
        user_stake.boost_multiplier = self.calculate_boost_multiplier(user_stake, now);

        // Update reward debt
        user_stake.reward_debt = self.calculate_reward_debt(&user_stake.amount, user_stake.boost_multiplier);

        // Update farm stats
        self.total_staked += amount.clone();

        // Calculate estimated daily rewards
        let estimated_daily_rewards = self.estimate_daily_rewards(&user_stake.amount, user_stake.boost_multiplier);

        Ok(StakeResult {
            amount,
            pool_id: self.pool_id.clone(),
            boost_multiplier: user_stake.boost_multiplier,
            estimated_daily_rewards,
        })
    }

    /// Unstake LP tokens
    pub fn unstake(
        &mut self,
        user: Principal,
        amount: Nat,
        user_stakes: &mut HashMap<(Principal, String), UserStake>,
    ) -> Result<(Nat, Nat), String> {
        // Update rewards
        self.update_rewards();

        let stake_key = (user, self.pool_id.clone());
        let user_stake = user_stakes
            .get_mut(&stake_key)
            .ok_or("No stake found")?;

        if user_stake.amount < amount {
            return Err(format!(
                "Insufficient staked amount. Have: {}, Want: {}",
                user_stake.amount, amount
            ));
        }

        // Calculate pending rewards
        let pending = self.calculate_pending_rewards(user_stake);
        user_stake.pending_rewards += pending;

        // Unstake
        user_stake.amount -= amount.clone();
        self.total_staked -= amount.clone();

        // Update reward debt
        user_stake.reward_debt = self.calculate_reward_debt(&user_stake.amount, user_stake.boost_multiplier);

        // Remove stake if fully unstaked
        if user_stake.amount == Nat::from(0u64) {
            if self.stakers_count > 0 {
                self.stakers_count -= 1;
            }
        }

        Ok((amount, user_stake.pending_rewards.clone()))
    }

    /// Harvest rewards
    pub fn harvest(
        &mut self,
        user: Principal,
        user_stakes: &mut HashMap<(Principal, String), UserStake>,
    ) -> Result<HarvestResult, String> {
        // Update rewards
        self.update_rewards();

        let stake_key = (user, self.pool_id.clone());
        let user_stake = user_stakes
            .get_mut(&stake_key)
            .ok_or("No stake found")?;

        // Calculate pending rewards
        let pending = self.calculate_pending_rewards(user_stake);
        let total_rewards = user_stake.pending_rewards.clone() + pending;

        if total_rewards == Nat::from(0u64) {
            return Err("No rewards to harvest".to_string());
        }

        // Reset pending rewards
        user_stake.pending_rewards = Nat::from(0u64);
        user_stake.last_claim = time();

        // Update reward debt
        user_stake.reward_debt = self.calculate_reward_debt(&user_stake.amount, user_stake.boost_multiplier);

        // Track total claimed
        user_stake.total_claimed += total_rewards.clone();
        self.total_rewards_distributed += total_rewards.clone();

        // TODO: Transfer QURI tokens to user
        // In production, integrate with QURI token ledger

        Ok(HarvestResult {
            rewards: total_rewards,
            rewards_usd: 0.0, // TODO: Calculate USD value
            pool_id: self.pool_id.clone(),
        })
    }

    /// Update reward calculations
    fn update_rewards(&mut self) {
        let now = time();

        // Check if farm has ended
        if self.end_time > 0 && now > self.end_time {
            return;
        }

        let time_elapsed = (now - self.last_update) / 1_000_000_000; // nanoseconds to seconds

        if self.total_staked > Nat::from(0u64) && time_elapsed > 0 {
            // Calculate rewards accumulated
            let rewards = self.reward_rate.clone() * Nat::from(time_elapsed);

            // Update reward per token
            let reward_per_token_increment =
                (rewards * Nat::from(REWARD_PRECISION)) / self.total_staked.clone();

            self.reward_per_token_stored += reward_per_token_increment;
        }

        self.last_update = now;
    }

    /// Calculate pending rewards for a user
    fn calculate_pending_rewards(&self, user_stake: &UserStake) -> Nat {
        if user_stake.amount == Nat::from(0u64) {
            return Nat::from(0u64);
        }

        // Apply boost multiplier
        let boosted_amount = apply_boost(&user_stake.amount, user_stake.boost_multiplier);

        // Reward = (boosted_amount * reward_per_token) - reward_debt
        let earned = (boosted_amount * self.reward_per_token_stored.clone())
            / Nat::from(REWARD_PRECISION);

        if earned > user_stake.reward_debt {
            earned - user_stake.reward_debt.clone()
        } else {
            Nat::from(0u64)
        }
    }

    /// Calculate reward debt for staking amount
    fn calculate_reward_debt(&self, amount: &Nat, boost_multiplier: f64) -> Nat {
        let boosted_amount = apply_boost(amount, boost_multiplier);
        (boosted_amount * self.reward_per_token_stored.clone()) / Nat::from(REWARD_PRECISION)
    }

    /// Calculate boost multiplier
    fn calculate_boost_multiplier(&self, user_stake: &UserStake, current_time: u64) -> f64 {
        if !self.config.enable_boost {
            return 1.0;
        }

        let mut multiplier = 1.0;

        // Time-based boost
        if self.config.boost_config.time_based_boost {
            let time_staked = (current_time - user_stake.staked_at) / 1_000_000_000; // seconds
            let days_staked = time_staked / 86400;

            if days_staked > 0 {
                let progress = days_staked as f64 / self.config.boost_config.days_to_max_boost as f64;
                let time_boost = 1.0 + (self.config.boost_config.max_time_boost - 1.0) * progress.min(1.0);
                multiplier *= time_boost;
            }
        }

        // Amount-based boost
        if self.config.boost_config.amount_based_boost {
            for tier in &self.config.boost_config.boost_tiers {
                if user_stake.amount >= tier.min_amount {
                    multiplier *= tier.multiplier;
                    break;
                }
            }
        }

        // Cap at maximum boost
        multiplier.min(MAX_BOOST_MULTIPLIER as f64 / REWARD_PRECISION as f64)
    }

    /// Estimate daily rewards
    fn estimate_daily_rewards(&self, amount: &Nat, boost_multiplier: f64) -> Nat {
        if self.total_staked == Nat::from(0u64) {
            return Nat::from(0u64);
        }

        let boosted_amount = apply_boost(amount, boost_multiplier);
        let user_share = boosted_amount.clone() * Nat::from(REWARD_PRECISION)
            / self.total_staked.clone();

        // Daily rewards = reward_rate * 86400 * user_share
        (self.reward_rate.clone() * Nat::from(86400u64) * user_share)
            / Nat::from(REWARD_PRECISION)
    }

    /// Get farm statistics
    pub fn get_stats(&self, lp_token_price_usd: f64, quri_price_usd: f64) -> FarmStats {
        let total_staked_usd = nat_to_f64(&self.total_staked) * lp_token_price_usd;
        let daily_rewards = self.reward_rate.clone() * Nat::from(86400u64);
        let daily_rewards_usd = nat_to_f64(&daily_rewards) * quri_price_usd;

        // APY = (daily_rewards_usd * 365 / total_staked_usd) * 100
        let apy = if total_staked_usd > 0.0 {
            (daily_rewards_usd * 365.0 / total_staked_usd) * 100.0
        } else {
            0.0
        };

        FarmStats {
            pool_id: self.pool_id.clone(),
            total_staked: self.total_staked.clone(),
            total_staked_usd,
            apy,
            daily_rewards,
            stakers_count: self.stakers_count,
        }
    }

    /// Emergency withdraw (no rewards)
    pub fn emergency_withdraw(
        &mut self,
        user: Principal,
        user_stakes: &mut HashMap<(Principal, String), UserStake>,
    ) -> Result<Nat, String> {
        if !self.config.emergency_withdrawal_enabled {
            return Err("Emergency withdrawal not enabled".to_string());
        }

        let stake_key = (user, self.pool_id.clone());
        let user_stake = user_stakes.remove(&stake_key).ok_or("No stake found")?;

        let amount = user_stake.amount.clone();
        self.total_staked -= amount.clone();

        if self.stakers_count > 0 {
            self.stakers_count -= 1;
        }

        Ok(amount)
    }
}

impl Default for BoostConfig {
    fn default() -> Self {
        Self {
            time_based_boost: true,
            max_time_boost: 1.5,
            days_to_max_boost: 30,
            amount_based_boost: true,
            boost_tiers: vec![
                BoostTier {
                    min_amount: Nat::from(10_000u64),
                    multiplier: 1.2,
                },
                BoostTier {
                    min_amount: Nat::from(100_000u64),
                    multiplier: 1.5,
                },
            ],
        }
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

fn apply_boost(amount: &Nat, multiplier: f64) -> Nat {
    let amount_f64 = nat_to_f64(amount);
    let boosted = amount_f64 * multiplier;
    Nat::from(boosted as u64)
}

fn nat_to_f64(n: &Nat) -> f64 {
    n.0.to_u64_digits()
        .first()
        .copied()
        .unwrap_or(0) as f64
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_farm() -> LiquidityFarm {
        LiquidityFarm::new(
            "test_pool".to_string(),
            Nat::from(100u64), // 100 QURI per second
            Principal::anonymous(),
            0,
        )
    }

    #[test]
    fn test_create_farm() {
        let farm = create_test_farm();
        assert_eq!(farm.pool_id, "test_pool");
        assert_eq!(farm.total_staked, Nat::from(0u64));
        assert_eq!(farm.stakers_count, 0);
    }

    #[test]
    fn test_stake() {
        let mut farm = create_test_farm();
        let mut user_stakes = HashMap::new();
        let user = Principal::anonymous();

        let result = farm
            .stake(user, Nat::from(10_000u64), &mut user_stakes)
            .unwrap();

        assert_eq!(result.amount, Nat::from(10_000u64));
        assert_eq!(farm.total_staked, Nat::from(10_000u64));
        assert_eq!(farm.stakers_count, 1);
    }

    #[test]
    fn test_boost_multiplier() {
        let farm = create_test_farm();
        let user_stake = UserStake {
            amount: Nat::from(100_000u64), // Qualifies for tier 2
            reward_debt: Nat::from(0u64),
            pending_rewards: Nat::from(0u64),
            staked_at: 0,
            last_claim: 0,
            total_claimed: Nat::from(0u64),
            boost_multiplier: 1.0,
        };

        let multiplier = farm.calculate_boost_multiplier(&user_stake, 0);
        assert!(multiplier > 1.0); // Should have boost
    }

    #[test]
    fn test_estimate_daily_rewards() {
        let mut farm = create_test_farm();
        let mut user_stakes = HashMap::new();
        let user = Principal::anonymous();

        // Stake 10,000 LP tokens
        farm.stake(user, Nat::from(10_000u64), &mut user_stakes).unwrap();

        // With 100 QURI/sec reward rate:
        // Daily rewards = 100 * 86400 = 8,640,000 QURI per day
        // User gets 100% (only staker)
        let daily = farm.estimate_daily_rewards(&Nat::from(10_000u64), 1.0);
        assert_eq!(daily, Nat::from(8_640_000u64));
    }
}
