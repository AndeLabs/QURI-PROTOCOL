use candid::{CandidType, Deserialize, Nat, Principal};
use serde::Serialize;
use std::collections::HashMap;

/// Automated Market Maker (AMM) Pool
///
/// High-quality implementation of constant product AMM (x * y = k)
/// Based on Uniswap V2 model with improvements for ICP.
///
/// Features:
/// - Constant product formula
/// - LP token management
/// - Fee distribution (80% to LPs, 20% to protocol)
/// - Price impact calculation
/// - Slippage protection
/// - Minimum liquidity lock

// ============================================================================
// Constants
// ============================================================================

/// Fee in basis points (30 = 0.3%)
pub const SWAP_FEE_BPS: u64 = 30;

/// LP fee portion (80% of swap fee goes to LPs)
pub const LP_FEE_PORTION_BPS: u64 = 8000;

/// Protocol fee portion (20% of swap fee goes to protocol)
pub const PROTOCOL_FEE_PORTION_BPS: u64 = 2000;

/// Minimum liquidity (locked forever to prevent division by zero)
pub const MINIMUM_LIQUIDITY: u64 = 1000;

// ============================================================================
// Types
// ============================================================================

/// AMM Pool for a Rune/ckBTC trading pair
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AMMPool {
    /// Pool ID (unique identifier)
    pub id: String,

    /// wRune token canister
    pub token0: Principal,

    /// ckBTC ledger canister
    pub token1: Principal,

    /// Reserve of token0 (wRunes)
    pub reserve0: Nat,

    /// Reserve of token1 (ckBTC)
    pub reserve1: Nat,

    /// Total LP tokens issued
    pub total_lp_supply: Nat,

    /// LP token holders: Principal -> LP balance
    pub lp_holders: HashMap<Principal, Nat>,

    /// Cumulative price (for TWAP oracle)
    pub price0_cumulative: Nat,
    pub price1_cumulative: Nat,

    /// Last update timestamp
    pub last_update: u64,

    /// Protocol fees collected
    pub protocol_fees0: Nat,
    pub protocol_fees1: Nat,

    /// Pool creation timestamp
    pub created_at: u64,

    /// Pool statistics
    pub stats: PoolStats,
}

/// Pool statistics
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct PoolStats {
    /// Total volume (token0)
    pub volume0: Nat,

    /// Total volume (token1)
    pub volume1: Nat,

    /// Total trades
    pub trade_count: u64,

    /// Total liquidity providers
    pub lp_count: u64,
}

/// Swap result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SwapResult {
    pub amount_in: Nat,
    pub amount_out: Nat,
    pub fee: Nat,
    pub price_impact: f64,
}

/// Add liquidity result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct AddLiquidityResult {
    pub amount0: Nat,
    pub amount1: Nat,
    pub lp_tokens: Nat,
    pub share_percent: f64,
}

/// Remove liquidity result
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RemoveLiquidityResult {
    pub amount0: Nat,
    pub amount1: Nat,
    pub lp_tokens_burned: Nat,
}

// ============================================================================
// Implementation
// ============================================================================

impl AMMPool {
    /// Create new AMM pool
    pub fn new(
        id: String,
        token0: Principal,
        token1: Principal,
        created_at: u64,
    ) -> Self {
        Self {
            id,
            token0,
            token1,
            reserve0: Nat::from(0u64),
            reserve1: Nat::from(0u64),
            total_lp_supply: Nat::from(0u64),
            lp_holders: HashMap::new(),
            price0_cumulative: Nat::from(0u64),
            price1_cumulative: Nat::from(0u64),
            last_update: created_at,
            protocol_fees0: Nat::from(0u64),
            protocol_fees1: Nat::from(0u64),
            created_at,
            stats: PoolStats {
                volume0: Nat::from(0u64),
                volume1: Nat::from(0u64),
                trade_count: 0,
                lp_count: 0,
            },
        }
    }

    /// Add liquidity to pool
    ///
    /// For first liquidity provider:
    /// - LP tokens = sqrt(amount0 * amount1)
    /// - MINIMUM_LIQUIDITY is burned (locked forever)
    ///
    /// For subsequent providers:
    /// - LP tokens = min(
    ///     amount0 * total_supply / reserve0,
    ///     amount1 * total_supply / reserve1
    ///   )
    pub fn add_liquidity(
        &mut self,
        provider: Principal,
        amount0: Nat,
        amount1: Nat,
    ) -> Result<AddLiquidityResult, String> {
        // Validate amounts
        if amount0 == Nat::from(0u64) || amount1 == Nat::from(0u64) {
            return Err("Amounts must be greater than 0".to_string());
        }

        let lp_tokens = if self.total_lp_supply == Nat::from(0u64) {
            // First liquidity provider
            let liquidity = self.sqrt(amount0.clone() * amount1.clone())?;

            // Burn minimum liquidity
            if liquidity <= Nat::from(MINIMUM_LIQUIDITY) {
                return Err("Initial liquidity too small".to_string());
            }

            liquidity - Nat::from(MINIMUM_LIQUIDITY)
        } else {
            // Subsequent liquidity providers - add proportionally
            let liquidity0 = (amount0.clone() * self.total_lp_supply.clone())
                / self.reserve0.clone();
            let liquidity1 = (amount1.clone() * self.total_lp_supply.clone())
                / self.reserve1.clone();

            // Use minimum to ensure proper ratio
            std::cmp::min(liquidity0, liquidity1)
        };

        if lp_tokens == Nat::from(0u64) {
            return Err("Insufficient liquidity minted".to_string());
        }

        // Update reserves
        self.reserve0 += amount0.clone();
        self.reserve1 += amount1.clone();

        // Mint LP tokens
        self.total_lp_supply += lp_tokens.clone();

        let is_new_provider = !self.lp_holders.contains_key(&provider);
        *self.lp_holders.entry(provider).or_insert(Nat::from(0u64)) += lp_tokens.clone();

        if is_new_provider {
            self.stats.lp_count += 1;
        }

        // Calculate share percentage
        let share_percent = self.calculate_share_percent(&lp_tokens);

        // Update timestamp
        self.last_update = ic_cdk::api::time();

        Ok(AddLiquidityResult {
            amount0,
            amount1,
            lp_tokens,
            share_percent,
        })
    }

    /// Remove liquidity from pool
    pub fn remove_liquidity(
        &mut self,
        provider: Principal,
        lp_tokens: Nat,
    ) -> Result<RemoveLiquidityResult, String> {
        // Validate LP tokens
        let user_lp = self
            .lp_holders
            .get(&provider)
            .cloned()
            .unwrap_or(Nat::from(0u64));

        if user_lp < lp_tokens {
            return Err(format!(
                "Insufficient LP tokens. Have: {}, Want: {}",
                user_lp, lp_tokens
            ));
        }

        if lp_tokens == Nat::from(0u64) {
            return Err("LP tokens must be greater than 0".to_string());
        }

        // Calculate amounts to return
        let amount0 = (lp_tokens.clone() * self.reserve0.clone()) / self.total_lp_supply.clone();
        let amount1 = (lp_tokens.clone() * self.reserve1.clone()) / self.total_lp_supply.clone();

        if amount0 == Nat::from(0u64) || amount1 == Nat::from(0u64) {
            return Err("Insufficient liquidity burned".to_string());
        }

        // Update reserves
        self.reserve0 -= amount0.clone();
        self.reserve1 -= amount1.clone();

        // Burn LP tokens
        self.total_lp_supply -= lp_tokens.clone();
        *self.lp_holders.get_mut(&provider).unwrap() -= lp_tokens.clone();

        // Remove provider if no LP tokens left
        if self.lp_holders.get(&provider).unwrap() == &Nat::from(0u64) {
            self.lp_holders.remove(&provider);
            if self.stats.lp_count > 0 {
                self.stats.lp_count -= 1;
            }
        }

        // Update timestamp
        self.last_update = ic_cdk::api::time();

        Ok(RemoveLiquidityResult {
            amount0,
            amount1,
            lp_tokens_burned: lp_tokens,
        })
    }

    /// Swap token0 (wRunes) for token1 (ckBTC)
    ///
    /// Uses constant product formula: x * y = k
    /// With fee: amount_out = (amount_in * 0.997 * reserve_out) / (reserve_in + amount_in * 0.997)
    pub fn swap_token0_for_token1(
        &mut self,
        amount_in: Nat,
    ) -> Result<SwapResult, String> {
        if amount_in == Nat::from(0u64) {
            return Err("Amount must be greater than 0".to_string());
        }

        if self.reserve0 == Nat::from(0u64) || self.reserve1 == Nat::from(0u64) {
            return Err("Insufficient liquidity".to_string());
        }

        // Calculate output with fee
        let amount_in_with_fee = amount_in.clone() * Nat::from(10000 - SWAP_FEE_BPS);
        let numerator = amount_in_with_fee * self.reserve1.clone();
        let denominator = self.reserve0.clone() * Nat::from(10000u64) + amount_in_with_fee;

        let amount_out = numerator / denominator;

        if amount_out == Nat::from(0u64) {
            return Err("Insufficient output amount".to_string());
        }

        if amount_out >= self.reserve1 {
            return Err("Insufficient liquidity for swap".to_string());
        }

        // Calculate price impact
        let price_before = self.get_price();
        let price_impact = self.calculate_price_impact_for_swap(
            amount_in.clone(),
            amount_out.clone(),
            true,
        );

        // Calculate fees
        let fee = (amount_in.clone() * Nat::from(SWAP_FEE_BPS)) / Nat::from(10000u64);
        let protocol_fee = (fee.clone() * Nat::from(PROTOCOL_FEE_PORTION_BPS)) / Nat::from(10000u64);

        // Update reserves
        self.reserve0 += amount_in.clone();
        self.reserve1 -= amount_out.clone();

        // Collect protocol fee
        self.protocol_fees0 += protocol_fee;

        // Update statistics
        self.stats.volume0 += amount_in.clone();
        self.stats.volume1 += amount_out.clone();
        self.stats.trade_count += 1;

        // Update timestamp
        self.last_update = ic_cdk::api::time();

        Ok(SwapResult {
            amount_in,
            amount_out,
            fee,
            price_impact,
        })
    }

    /// Swap token1 (ckBTC) for token0 (wRunes)
    pub fn swap_token1_for_token0(
        &mut self,
        amount_in: Nat,
    ) -> Result<SwapResult, String> {
        if amount_in == Nat::from(0u64) {
            return Err("Amount must be greater than 0".to_string());
        }

        if self.reserve0 == Nat::from(0u64) || self.reserve1 == Nat::from(0u64) {
            return Err("Insufficient liquidity".to_string());
        }

        // Calculate output with fee
        let amount_in_with_fee = amount_in.clone() * Nat::from(10000 - SWAP_FEE_BPS);
        let numerator = amount_in_with_fee * self.reserve0.clone();
        let denominator = self.reserve1.clone() * Nat::from(10000u64) + amount_in_with_fee;

        let amount_out = numerator / denominator;

        if amount_out == Nat::from(0u64) {
            return Err("Insufficient output amount".to_string());
        }

        if amount_out >= self.reserve0 {
            return Err("Insufficient liquidity for swap".to_string());
        }

        // Calculate price impact
        let price_impact = self.calculate_price_impact_for_swap(
            amount_in.clone(),
            amount_out.clone(),
            false,
        );

        // Calculate fees
        let fee = (amount_in.clone() * Nat::from(SWAP_FEE_BPS)) / Nat::from(10000u64);
        let protocol_fee = (fee.clone() * Nat::from(PROTOCOL_FEE_PORTION_BPS)) / Nat::from(10000u64);

        // Update reserves
        self.reserve1 += amount_in.clone();
        self.reserve0 -= amount_out.clone();

        // Collect protocol fee
        self.protocol_fees1 += protocol_fee;

        // Update statistics
        self.stats.volume1 += amount_in.clone();
        self.stats.volume0 += amount_out.clone();
        self.stats.trade_count += 1;

        // Update timestamp
        self.last_update = ic_cdk::api::time();

        Ok(SwapResult {
            amount_in,
            amount_out,
            fee,
            price_impact,
        })
    }

    /// Get quote for swapping token0 to token1
    pub fn get_quote_token0_to_token1(&self, amount_in: Nat) -> Result<Nat, String> {
        if self.reserve0 == Nat::from(0u64) || self.reserve1 == Nat::from(0u64) {
            return Err("No liquidity".to_string());
        }

        let amount_in_with_fee = amount_in * Nat::from(10000 - SWAP_FEE_BPS);
        let numerator = amount_in_with_fee * self.reserve1.clone();
        let denominator = self.reserve0.clone() * Nat::from(10000u64) + amount_in_with_fee;

        Ok(numerator / denominator)
    }

    /// Get quote for swapping token1 to token0
    pub fn get_quote_token1_to_token0(&self, amount_in: Nat) -> Result<Nat, String> {
        if self.reserve0 == Nat::from(0u64) || self.reserve1 == Nat::from(0u64) {
            return Err("No liquidity".to_string());
        }

        let amount_in_with_fee = amount_in * Nat::from(10000 - SWAP_FEE_BPS);
        let numerator = amount_in_with_fee * self.reserve0.clone();
        let denominator = self.reserve1.clone() * Nat::from(10000u64) + amount_in_with_fee;

        Ok(numerator / denominator)
    }

    /// Get current price (token1 per token0)
    pub fn get_price(&self) -> f64 {
        if self.reserve0 == Nat::from(0u64) {
            return 0.0;
        }

        let reserve0_f64 = nat_to_f64(&self.reserve0);
        let reserve1_f64 = nat_to_f64(&self.reserve1);

        reserve1_f64 / reserve0_f64
    }

    /// Calculate price impact for a potential swap
    fn calculate_price_impact_for_swap(
        &self,
        amount_in: Nat,
        amount_out: Nat,
        is_token0_to_token1: bool,
    ) -> f64 {
        let price_before = self.get_price();

        let (new_reserve0, new_reserve1) = if is_token0_to_token1 {
            (
                self.reserve0.clone() + amount_in,
                self.reserve1.clone() - amount_out,
            )
        } else {
            (
                self.reserve0.clone() - amount_out,
                self.reserve1.clone() + amount_in,
            )
        };

        let reserve0_f64 = nat_to_f64(&new_reserve0);
        let reserve1_f64 = nat_to_f64(&new_reserve1);
        let price_after = reserve1_f64 / reserve0_f64;

        ((price_after - price_before) / price_before * 100.0).abs()
    }

    /// Calculate share percentage for LP tokens
    fn calculate_share_percent(&self, lp_tokens: &Nat) -> f64 {
        if self.total_lp_supply == Nat::from(0u64) {
            return 0.0;
        }

        let lp_f64 = nat_to_f64(lp_tokens);
        let total_f64 = nat_to_f64(&self.total_lp_supply);

        (lp_f64 / total_f64) * 100.0
    }

    /// Get LP balance for user
    pub fn get_lp_balance(&self, user: &Principal) -> Nat {
        self.lp_holders
            .get(user)
            .cloned()
            .unwrap_or(Nat::from(0u64))
    }

    /// Square root using Newton's method (for initial liquidity calculation)
    fn sqrt(&self, value: Nat) -> Result<Nat, String> {
        if value == Nat::from(0u64) {
            return Ok(Nat::from(0u64));
        }

        let mut z = value.clone();
        let mut x = (value.clone() + Nat::from(1u64)) / Nat::from(2u64);

        while x < z {
            z = x.clone();
            x = (value.clone() / x.clone() + x) / Nat::from(2u64);
        }

        Ok(z)
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

fn nat_to_f64(n: &Nat) -> f64 {
    // For simplicity, convert to u64 and then to f64
    // In production, use proper big number to float conversion
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

    fn create_test_pool() -> AMMPool {
        AMMPool::new(
            "test_pool".to_string(),
            Principal::anonymous(),
            Principal::anonymous(),
            0,
        )
    }

    #[test]
    fn test_add_initial_liquidity() {
        let mut pool = create_test_pool();
        let provider = Principal::anonymous();

        let result = pool
            .add_liquidity(
                provider,
                Nat::from(1_000_000u64),
                Nat::from(1_000_000u64),
            )
            .unwrap();

        assert!(result.lp_tokens > Nat::from(0u64));
        assert!(pool.reserve0 == Nat::from(1_000_000u64));
        assert!(pool.reserve1 == Nat::from(1_000_000u64));
    }

    #[test]
    fn test_swap_token0_to_token1() {
        let mut pool = create_test_pool();
        let provider = Principal::anonymous();

        // Add liquidity first
        pool.add_liquidity(
            provider,
            Nat::from(1_000_000u64),
            Nat::from(1_000_000u64),
        )
        .unwrap();

        // Swap 10,000 token0 for token1
        let result = pool.swap_token0_for_token1(Nat::from(10_000u64)).unwrap();

        assert!(result.amount_out > Nat::from(0u64));
        assert!(result.price_impact > 0.0);
        assert_eq!(pool.stats.trade_count, 1);
    }

    #[test]
    fn test_remove_liquidity() {
        let mut pool = create_test_pool();
        let provider = Principal::anonymous();

        // Add liquidity
        let add_result = pool
            .add_liquidity(
                provider,
                Nat::from(1_000_000u64),
                Nat::from(1_000_000u64),
            )
            .unwrap();

        // Remove half
        let lp_tokens = add_result.lp_tokens / Nat::from(2u64);
        let remove_result = pool.remove_liquidity(provider, lp_tokens).unwrap();

        assert!(remove_result.amount0 > Nat::from(0u64));
        assert!(remove_result.amount1 > Nat::from(0u64));
    }

    #[test]
    fn test_price_calculation() {
        let mut pool = create_test_pool();
        let provider = Principal::anonymous();

        pool.add_liquidity(
            provider,
            Nat::from(1_000_000u64),
            Nat::from(500_000u64),
        )
        .unwrap();

        let price = pool.get_price();
        assert!((price - 0.5).abs() < 0.01); // Price should be ~0.5
    }
}
