/**
 * Trading Module for Virtual Runes
 *
 * Implements a simple bonding curve AMM for trading Virtual Runes on ICP.
 * Uses the constant product formula (x * y = k) similar to Uniswap V1.
 *
 * Features:
 * - Automatic price discovery via bonding curve
 * - Buy/Sell Virtual Runes with ICP
 * - Liquidity pool management
 * - Fee collection (0.3% per trade)
 * - Real ICP transfers via ICRC-1 Ledger
 * - User rune balance tracking
 */

use candid::{CandidType, Deserialize, Principal};
use std::cell::RefCell;
use std::collections::HashMap;

use crate::state::VirtualRune;
use crate::balances::{
    self, BalanceChangeType, RuneBalance,
    credit_balance, debit_balance, get_balance,
};
use crate::ledger::{
    self, get_user_trading_balance, credit_user_icp, debit_user_icp,
    ICP_TRANSFER_FEE,
};

/// Trading pool for a Virtual Rune
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradingPool {
    /// Virtual Rune ID
    pub rune_id: String,
    /// Rune name for display
    pub rune_name: String,
    /// Symbol
    pub symbol: String,
    /// ICP reserve (in e8s, 1 ICP = 100_000_000 e8s)
    pub icp_reserve: u64,
    /// Rune reserve
    pub rune_reserve: u64,
    /// Total supply of the rune
    pub total_supply: u64,
    /// Constant product (k = icp_reserve * rune_reserve)
    pub k_constant: u128,
    /// Pool creator
    pub creator: Principal,
    /// Creation timestamp
    pub created_at: u64,
    /// Last trade timestamp
    pub last_trade_at: u64,
    /// Total volume in ICP (e8s)
    pub total_volume_icp: u128,
    /// Total number of trades
    pub total_trades: u64,
    /// Fee collected (e8s)
    pub fees_collected: u64,
    /// Is pool active
    pub is_active: bool,
}

/// Trade record
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeRecord {
    pub id: u64,
    pub rune_id: String,
    pub trader: Principal,
    pub trade_type: TradeType,
    pub icp_amount: u64,
    pub rune_amount: u64,
    pub price_per_rune: u64, // ICP e8s per rune
    pub fee: u64,
    pub timestamp: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum TradeType {
    Buy,
    Sell,
}

/// Quote for a potential trade
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TradeQuote {
    pub rune_id: String,
    pub trade_type: TradeType,
    pub input_amount: u64,
    pub output_amount: u64,
    pub price_per_rune: u64,
    pub fee: u64,
    pub price_impact_percent: f64,
    pub minimum_output: u64,
    pub pool_icp_reserve: u64,
    pub pool_rune_reserve: u64,
}

/// Trading configuration
pub const TRADING_FEE_BPS: u64 = 30; // 0.3% fee
pub const MIN_LIQUIDITY_ICP: u64 = 100_000; // 0.001 ICP minimum
pub const PRICE_IMPACT_WARNING_THRESHOLD: f64 = 5.0; // 5% price impact warning

// Thread-local storage for trading data
// Using simple HashMap for now - can migrate to stable structures later
thread_local! {
    static TRADING_POOLS: RefCell<HashMap<String, TradingPool>> = RefCell::new(HashMap::new());
    static TRADE_COUNTER: RefCell<u64> = RefCell::new(0);
    static TRADE_HISTORY: RefCell<Vec<TradeRecord>> = RefCell::new(Vec::new());
}

/// Create a new trading pool for a Virtual Rune
///
/// The creator must provide initial ICP liquidity and specify how many runes to add.
/// This sets the initial price: price = icp_amount / rune_amount
pub fn create_pool(
    rune: &VirtualRune,
    initial_icp: u64,
    initial_runes: u64,
    creator: Principal,
) -> Result<TradingPool, String> {
    // Validate inputs
    if initial_icp < MIN_LIQUIDITY_ICP {
        return Err(format!(
            "Minimum liquidity is {} ICP (in e8s)",
            MIN_LIQUIDITY_ICP
        ));
    }

    if initial_runes == 0 {
        return Err("Must provide initial rune liquidity".to_string());
    }

    if rune.etching.premine < initial_runes as u64 {
        return Err("Not enough premine to create pool".to_string());
    }

    // Check if pool already exists
    if get_pool(&rune.id).is_some() {
        return Err("Pool already exists for this rune".to_string());
    }

    let now = ic_cdk::api::time();
    let k_constant = (initial_icp as u128) * (initial_runes as u128);

    let pool = TradingPool {
        rune_id: rune.id.clone(),
        rune_name: rune.etching.rune_name.clone(),
        symbol: rune.etching.symbol.clone(),
        icp_reserve: initial_icp,
        rune_reserve: initial_runes,
        total_supply: rune.etching.premine,
        k_constant,
        creator,
        created_at: now,
        last_trade_at: now,
        total_volume_icp: 0,
        total_trades: 0,
        fees_collected: 0,
        is_active: true,
    };

    // Store pool
    save_pool(&pool)?;

    Ok(pool)
}

/// Get a quote for buying runes with ICP
pub fn get_buy_quote(rune_id: &str, icp_amount: u64, slippage_bps: u64) -> Result<TradeQuote, String> {
    let pool = get_pool(rune_id).ok_or("Pool not found")?;

    if !pool.is_active {
        return Err("Pool is not active".to_string());
    }

    // Calculate fee
    let fee = (icp_amount * TRADING_FEE_BPS) / 10_000;
    let icp_in_after_fee = icp_amount - fee;

    // Calculate output using constant product formula
    // x * y = k
    // (x + dx) * (y - dy) = k
    // dy = y - k / (x + dx)
    let new_icp_reserve = pool.icp_reserve + icp_in_after_fee;
    let new_rune_reserve = (pool.k_constant / new_icp_reserve as u128) as u64;
    let rune_out = pool.rune_reserve.saturating_sub(new_rune_reserve);

    if rune_out == 0 {
        return Err("Output amount is zero".to_string());
    }

    // Calculate price impact
    let price_before = (pool.icp_reserve as f64) / (pool.rune_reserve as f64);
    let price_after = (new_icp_reserve as f64) / (new_rune_reserve as f64);
    let price_impact = ((price_after - price_before) / price_before * 100.0).abs();

    // Calculate minimum output with slippage
    let min_output = (rune_out * (10_000 - slippage_bps)) / 10_000;

    // Price per rune in e8s
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
        fee,
        price_impact_percent: price_impact,
        minimum_output: min_output,
        pool_icp_reserve: pool.icp_reserve,
        pool_rune_reserve: pool.rune_reserve,
    })
}

/// Get a quote for selling runes for ICP
pub fn get_sell_quote(rune_id: &str, rune_amount: u64, slippage_bps: u64) -> Result<TradeQuote, String> {
    let pool = get_pool(rune_id).ok_or("Pool not found")?;

    if !pool.is_active {
        return Err("Pool is not active".to_string());
    }

    // Calculate output using constant product formula
    let new_rune_reserve = pool.rune_reserve + rune_amount;
    let new_icp_reserve = (pool.k_constant / new_rune_reserve as u128) as u64;
    let icp_out_before_fee = pool.icp_reserve.saturating_sub(new_icp_reserve);

    // Calculate fee
    let fee = (icp_out_before_fee * TRADING_FEE_BPS) / 10_000;
    let icp_out = icp_out_before_fee - fee;

    if icp_out == 0 {
        return Err("Output amount is zero".to_string());
    }

    // Calculate price impact
    let price_before = (pool.icp_reserve as f64) / (pool.rune_reserve as f64);
    let price_after = (new_icp_reserve as f64) / (new_rune_reserve as f64);
    let price_impact = ((price_after - price_before) / price_before * 100.0).abs();

    // Calculate minimum output with slippage
    let min_output = (icp_out * (10_000 - slippage_bps)) / 10_000;

    // Price per rune in e8s
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
        fee,
        price_impact_percent: price_impact,
        minimum_output: min_output,
        pool_icp_reserve: pool.icp_reserve,
        pool_rune_reserve: pool.rune_reserve,
    })
}

/// Execute a buy trade - Buy Virtual Runes with ICP
///
/// Flow:
/// 1. Verify user has sufficient ICP balance
/// 2. Calculate output runes using AMM formula
/// 3. Debit ICP from user's trading balance
/// 4. Credit runes to user's balance
/// 5. Update pool state
pub fn execute_buy(
    rune_id: &str,
    icp_amount: u64,
    min_runes_out: u64,
    trader: Principal,
) -> Result<TradeRecord, String> {
    let mut pool = get_pool(rune_id).ok_or("Pool not found")?;

    if !pool.is_active {
        return Err("Pool is not active".to_string());
    }

    // 1. Verify user has sufficient ICP balance
    let user_icp_balance = get_user_trading_balance(trader);
    if user_icp_balance < icp_amount {
        return Err(format!(
            "Insufficient ICP balance: have {}, need {}. Please deposit ICP first.",
            ledger::format_icp(user_icp_balance),
            ledger::format_icp(icp_amount)
        ));
    }

    // 2. Calculate fee and output
    let fee = (icp_amount * TRADING_FEE_BPS) / 10_000;
    let icp_in_after_fee = icp_amount - fee;

    // Calculate output using constant product formula
    let new_icp_reserve = pool.icp_reserve + icp_in_after_fee;
    let new_rune_reserve = (pool.k_constant / new_icp_reserve as u128) as u64;
    let rune_out = pool.rune_reserve.saturating_sub(new_rune_reserve);

    // Check slippage
    if rune_out < min_runes_out {
        return Err(format!(
            "Slippage exceeded: got {} runes, expected at least {}",
            rune_out, min_runes_out
        ));
    }

    // 3. Debit ICP from user's trading balance
    debit_user_icp(trader, icp_amount)?;

    // 4. Credit runes to user's balance
    let trade_id = next_trade_id();
    credit_balance(
        trader,
        rune_id,
        rune_out,
        BalanceChangeType::Buy,
        Some(format!("trade:{}", trade_id)),
    )?;

    // 5. Update pool state
    pool.icp_reserve = new_icp_reserve + fee; // Fee stays in pool
    pool.rune_reserve = new_rune_reserve;
    pool.k_constant = (pool.icp_reserve as u128) * (pool.rune_reserve as u128);
    pool.total_volume_icp += icp_amount as u128;
    pool.total_trades += 1;
    pool.fees_collected += fee;
    pool.last_trade_at = ic_cdk::api::time();

    // Save updated pool
    save_pool(&pool)?;

    // Create trade record
    let trade = TradeRecord {
        id: trade_id,
        rune_id: rune_id.to_string(),
        trader,
        trade_type: TradeType::Buy,
        icp_amount,
        rune_amount: rune_out,
        price_per_rune: icp_amount / rune_out.max(1),
        fee,
        timestamp: ic_cdk::api::time(),
    };

    // Store trade in history
    store_trade(&trade);

    ic_cdk::println!(
        "BUY executed: trader={}, rune={}, icp_in={}, runes_out={}, fee={}",
        trader, rune_id, icp_amount, rune_out, fee
    );

    Ok(trade)
}

/// Execute a sell trade - Sell Virtual Runes for ICP
///
/// Flow:
/// 1. Verify user has sufficient rune balance
/// 2. Calculate output ICP using AMM formula
/// 3. Debit runes from user's balance
/// 4. Credit ICP to user's trading balance
/// 5. Update pool state
pub fn execute_sell(
    rune_id: &str,
    rune_amount: u64,
    min_icp_out: u64,
    trader: Principal,
) -> Result<TradeRecord, String> {
    let mut pool = get_pool(rune_id).ok_or("Pool not found")?;

    if !pool.is_active {
        return Err("Pool is not active".to_string());
    }

    // 1. Verify user has sufficient rune balance
    let user_rune_balance = get_balance(trader, rune_id);
    if user_rune_balance.available < rune_amount {
        return Err(format!(
            "Insufficient rune balance: have {}, need {}",
            user_rune_balance.available, rune_amount
        ));
    }

    // 2. Calculate output ICP
    let new_rune_reserve = pool.rune_reserve + rune_amount;
    let new_icp_reserve = (pool.k_constant / new_rune_reserve as u128) as u64;
    let icp_out_before_fee = pool.icp_reserve.saturating_sub(new_icp_reserve);

    // Calculate fee
    let fee = (icp_out_before_fee * TRADING_FEE_BPS) / 10_000;
    let icp_out = icp_out_before_fee - fee;

    // Check slippage
    if icp_out < min_icp_out {
        return Err(format!(
            "Slippage exceeded: got {} ICP, expected at least {}",
            ledger::format_icp(icp_out),
            ledger::format_icp(min_icp_out)
        ));
    }

    // 3. Debit runes from user's balance
    let trade_id = next_trade_id();
    debit_balance(
        trader,
        rune_id,
        rune_amount,
        BalanceChangeType::Sell,
        Some(format!("trade:{}", trade_id)),
    )?;

    // 4. Credit ICP to user's trading balance
    credit_user_icp(trader, icp_out);

    // 5. Update pool state
    pool.icp_reserve = new_icp_reserve + fee; // Fee stays in pool
    pool.rune_reserve = new_rune_reserve;
    pool.k_constant = (pool.icp_reserve as u128) * (pool.rune_reserve as u128);
    pool.total_volume_icp += icp_out as u128;
    pool.total_trades += 1;
    pool.fees_collected += fee;
    pool.last_trade_at = ic_cdk::api::time();

    // Save updated pool
    save_pool(&pool)?;

    // Create trade record
    let trade = TradeRecord {
        id: trade_id,
        rune_id: rune_id.to_string(),
        trader,
        trade_type: TradeType::Sell,
        icp_amount: icp_out,
        rune_amount,
        price_per_rune: icp_out / rune_amount.max(1),
        fee,
        timestamp: ic_cdk::api::time(),
    };

    // Store trade in history
    store_trade(&trade);

    ic_cdk::println!(
        "SELL executed: trader={}, rune={}, runes_in={}, icp_out={}, fee={}",
        trader, rune_id, rune_amount, icp_out, fee
    );

    Ok(trade)
}

/// Get current price of a rune in ICP (e8s)
pub fn get_price(rune_id: &str) -> Result<u64, String> {
    let pool = get_pool(rune_id).ok_or("Pool not found")?;

    if pool.rune_reserve == 0 {
        return Err("Pool has no rune liquidity".to_string());
    }

    // Price = ICP reserve / Rune reserve
    Ok(pool.icp_reserve / pool.rune_reserve)
}

/// Get market cap in ICP (e8s)
pub fn get_market_cap(rune_id: &str) -> Result<u128, String> {
    let pool = get_pool(rune_id).ok_or("Pool not found")?;

    let price = get_price(rune_id)?;
    Ok((price as u128) * (pool.total_supply as u128))
}

/// Get a trading pool by rune ID
pub fn get_pool(rune_id: &str) -> Option<TradingPool> {
    TRADING_POOLS.with(|pools| {
        pools.borrow().get(rune_id).cloned()
    })
}

/// Save a trading pool
fn save_pool(pool: &TradingPool) -> Result<(), String> {
    TRADING_POOLS.with(|pools| {
        pools.borrow_mut().insert(pool.rune_id.clone(), pool.clone());
        Ok(())
    })
}

/// List all trading pools
pub fn list_pools(offset: u64, limit: u64) -> Vec<TradingPool> {
    TRADING_POOLS.with(|pools| {
        pools.borrow()
            .values()
            .skip(offset as usize)
            .take(limit as usize)
            .cloned()
            .collect()
    })
}

/// Get total pool count
pub fn get_pool_count() -> u64 {
    TRADING_POOLS.with(|pools| {
        pools.borrow().len() as u64
    })
}

/// Get trade history for a rune
pub fn get_trade_history(rune_id: &str, limit: usize) -> Vec<TradeRecord> {
    TRADE_HISTORY.with(|h| {
        h.borrow()
            .iter()
            .filter(|t| t.rune_id == rune_id)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    })
}

/// Get user's trade history
pub fn get_user_trades(trader: Principal, limit: usize) -> Vec<TradeRecord> {
    TRADE_HISTORY.with(|h| {
        h.borrow()
            .iter()
            .filter(|t| t.trader == trader)
            .rev()
            .take(limit)
            .cloned()
            .collect()
    })
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/// Get next trade ID
fn next_trade_id() -> u64 {
    TRADE_COUNTER.with(|c| {
        let id = *c.borrow();
        *c.borrow_mut() = id + 1;
        id
    })
}

/// Store a trade in history
fn store_trade(trade: &TradeRecord) {
    TRADE_HISTORY.with(|h| {
        h.borrow_mut().push(trade.clone());
        // Keep last 1000 trades
        if h.borrow().len() > 1000 {
            h.borrow_mut().remove(0);
        }
    });
}

// ============================================================================
// BALANCE QUERY HELPERS (Exposed for canister API)
// ============================================================================

/// Get user's rune balance
pub fn get_user_rune_balance(user: Principal, rune_id: &str) -> RuneBalance {
    get_balance(user, rune_id)
}

/// Get all rune balances for a user
pub fn get_user_all_rune_balances(user: Principal) -> Vec<(String, RuneBalance)> {
    balances::get_user_balances(user)
}

/// Get user's ICP trading balance
pub fn get_user_icp_balance(user: Principal) -> u64 {
    get_user_trading_balance(user)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: Tests would require mocking IC environment
    // For now, basic logic tests

    #[test]
    fn test_fee_calculation() {
        let amount = 1_000_000u64; // 0.01 ICP
        let fee = (amount * TRADING_FEE_BPS) / 10_000;
        assert_eq!(fee, 300); // 0.3% = 3000 e8s
    }

    #[test]
    fn test_constant_product() {
        // Initial state: 10 ICP, 1000 runes
        let icp_reserve = 10_000_000_00u64; // 10 ICP in e8s
        let rune_reserve = 1000u64;
        let k = (icp_reserve as u128) * (rune_reserve as u128);

        // Buy with 1 ICP
        let icp_in = 100_000_000u64; // 1 ICP
        let new_icp = icp_reserve + icp_in;
        let new_rune = (k / new_icp as u128) as u64;
        let rune_out = rune_reserve - new_rune;

        assert!(rune_out > 0);
        assert!(rune_out < 100); // Should get less than 10% of pool
    }
}
