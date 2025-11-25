/**
 * useTrading Hook
 * Trading operations for Virtual Runes using bonding curve AMM
 *
 * Features:
 * - Create trading pools
 * - Get buy/sell quotes
 * - Execute trades
 * - View trade history
 * - Deposit/Withdraw ICP
 * - View rune balances
 */

import { useState, useCallback } from 'react';
import { getRuneEngineActor } from '@/lib/icp/actors';
import type {
  TradingPoolV2View,
  TradeQuoteV2View,
  TradeEventView,
  UserBalanceV2View,
  BalanceChangeView,
  RuneBalanceView as RuneBalanceViewV1,
} from '@/types/canisters';

// ICP has 8 decimals (1 ICP = 100,000,000 e8s)
const ICP_DECIMALS = 8;
const E8S_PER_ICP = 100_000_000n;

// Re-export V2 types as the default types for backwards compatibility
export type TradingPoolView = TradingPoolV2View;
export type TradeQuoteView = TradeQuoteV2View;
export type TradeRecordView = TradeEventView;
export type RuneBalanceView = UserBalanceV2View;

export interface TradeResult {
  success: boolean;
  trade?: TradeEventView;
  error?: string;
}

export function useTrading() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ============================================================================
  // POOL MANAGEMENT
  // ============================================================================

  /**
   * Create a trading pool for a Virtual Rune
   * Only the rune creator can create a pool
   *
   * @param runeId - The Virtual Rune ID
   * @param initialIcp - Initial ICP liquidity (in ICP, not e8s)
   * @param initialRunes - Initial rune liquidity
   */
  const createPool = useCallback(async (
    runeId: string,
    initialIcp: number,
    initialRunes: number
  ): Promise<TradingPoolView | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();

      // Convert ICP to e8s
      const icpE8s = BigInt(Math.floor(initialIcp * Number(E8S_PER_ICP)));

      const result = await actor.create_trading_pool_v2(runeId, icpE8s, BigInt(initialRunes));

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create pool';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a trading pool by rune ID
   */
  const getPool = useCallback(async (runeId: string): Promise<TradingPoolView | null> => {
    try {
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_trading_pool_v2(runeId);
      return result.length > 0 ? (result[0] ?? null) : null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get pool';
      setError(errorMsg);
      return null;
    }
  }, []);

  /**
   * List all trading pools
   */
  const listPools = useCallback(async (
    offset: bigint = 0n,
    limit: bigint = 50n
  ): Promise<TradingPoolView[]> => {
    try {
      setError(null);
      const actor = await getRuneEngineActor();
      const pools = await actor.list_trading_pools_v2(offset, limit);
      return pools;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to list pools';
      setError(errorMsg);
      return [];
    }
  }, []);

  /**
   * Get total pool count
   */
  const getPoolCount = useCallback(async (): Promise<bigint> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_trading_pool_count_v2();
    } catch {
      return 0n;
    }
  }, []);

  // ============================================================================
  // QUOTES
  // ============================================================================

  /**
   * Get a quote for buying runes with ICP
   *
   * @param runeId - The Virtual Rune ID
   * @param icpAmount - Amount of ICP to spend (in ICP, not e8s)
   * @param slippagePercent - Slippage tolerance in percent (e.g., 0.5 for 0.5%)
   */
  const getBuyQuote = useCallback(async (
    runeId: string,
    icpAmount: number,
    slippagePercent: number = 0.5
  ): Promise<TradeQuoteView | null> => {
    try {
      setError(null);
      const actor = await getRuneEngineActor();

      // Convert ICP to e8s
      const icpE8s = BigInt(Math.floor(icpAmount * Number(E8S_PER_ICP)));
      // Convert percent to basis points (0.5% = 50 bps)
      const slippageBps = BigInt(Math.floor(slippagePercent * 100));

      const result = await actor.get_buy_quote_v2(runeId, icpE8s, slippageBps);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get buy quote';
      setError(errorMsg);
      return null;
    }
  }, []);

  /**
   * Get a quote for selling runes for ICP
   *
   * @param runeId - The Virtual Rune ID
   * @param runeAmount - Amount of runes to sell
   * @param slippagePercent - Slippage tolerance in percent (e.g., 0.5 for 0.5%)
   */
  const getSellQuote = useCallback(async (
    runeId: string,
    runeAmount: number,
    slippagePercent: number = 0.5
  ): Promise<TradeQuoteView | null> => {
    try {
      setError(null);
      const actor = await getRuneEngineActor();

      // Convert percent to basis points
      const slippageBps = BigInt(Math.floor(slippagePercent * 100));

      const result = await actor.get_sell_quote_v2(runeId, BigInt(runeAmount), slippageBps);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get sell quote';
      setError(errorMsg);
      return null;
    }
  }, []);

  // ============================================================================
  // TRADING
  // ============================================================================

  /**
   * Execute a buy trade - buy Virtual Runes with ICP
   *
   * @param runeId - The Virtual Rune ID
   * @param icpAmount - Amount of ICP to spend (in ICP, not e8s)
   * @param minRunesOut - Minimum runes expected (slippage protection)
   */
  const buyRune = useCallback(async (
    runeId: string,
    icpAmount: number,
    minRunesOut: bigint
  ): Promise<TradeResult> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();

      // Convert ICP to e8s
      const icpE8s = BigInt(Math.floor(icpAmount * Number(E8S_PER_ICP)));

      const result = await actor.buy_virtual_rune_v2(runeId, icpE8s, minRunesOut);

      if ('Ok' in result) {
        return { success: true, trade: result.Ok };
      } else {
        setError(result.Err);
        return { success: false, error: result.Err };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute buy';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Execute a sell trade - sell Virtual Runes for ICP
   *
   * @param runeId - The Virtual Rune ID
   * @param runeAmount - Amount of runes to sell
   * @param minIcpOut - Minimum ICP expected (in e8s, slippage protection)
   */
  const sellRune = useCallback(async (
    runeId: string,
    runeAmount: number,
    minIcpOut: bigint
  ): Promise<TradeResult> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();

      const result = await actor.sell_virtual_rune_v2(runeId, BigInt(runeAmount), minIcpOut);

      if ('Ok' in result) {
        return { success: true, trade: result.Ok };
      } else {
        setError(result.Err);
        return { success: false, error: result.Err };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to execute sell';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // PRICE & MARKET DATA
  // ============================================================================

  /**
   * Get current price of a rune in ICP
   * @returns Price in ICP (not e8s)
   */
  const getPrice = useCallback(async (runeId: string): Promise<number | null> => {
    try {
      const actor = await getRuneEngineActor();
      const result = await actor.get_rune_price(runeId);

      if ('Ok' in result) {
        // Convert from e8s to ICP
        return Number(result.Ok) / Number(E8S_PER_ICP);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Get market cap in ICP
   * @returns Market cap in ICP (not e8s)
   */
  const getMarketCap = useCallback(async (runeId: string): Promise<number | null> => {
    try {
      const actor = await getRuneEngineActor();
      const result = await actor.get_rune_market_cap(runeId);

      if ('Ok' in result) {
        // Convert from e8s to ICP
        return Number(result.Ok) / Number(E8S_PER_ICP);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // ============================================================================
  // TRADE HISTORY
  // ============================================================================

  /**
   * Get trade history for a specific rune
   */
  const getRuneTradeHistory = useCallback(async (
    runeId: string,
    limit: number = 50
  ): Promise<TradeRecordView[]> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_rune_trade_history_v2(runeId, BigInt(limit));
    } catch {
      return [];
    }
  }, []);

  /**
   * Get the caller's trade history
   */
  const getMyTradeHistory = useCallback(async (limit: number = 50): Promise<TradeRecordView[]> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_my_trade_history_v2(BigInt(limit));
    } catch {
      return [];
    }
  }, []);

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Format ICP amount from e8s to human-readable string
   */
  const formatIcp = useCallback((e8s: bigint): string => {
    const icp = Number(e8s) / Number(E8S_PER_ICP);
    if (icp >= 1000000) {
      return `${(icp / 1000000).toFixed(2)}M ICP`;
    }
    if (icp >= 1000) {
      return `${(icp / 1000).toFixed(2)}K ICP`;
    }
    return `${icp.toFixed(4)} ICP`;
  }, []);

  /**
   * Parse ICP amount from human input to e8s
   */
  const parseIcpToE8s = useCallback((icp: number): bigint => {
    return BigInt(Math.floor(icp * Number(E8S_PER_ICP)));
  }, []);

  // ============================================================================
  // ICP BALANCE & DEPOSITS
  // ============================================================================

  /**
   * Get user's ICP trading balance
   */
  const getMyIcpBalance = useCallback(async (): Promise<bigint> => {
    try {
      const actor = await getRuneEngineActor();
      const balance = await actor.get_my_icp_balance_v2();
      return balance.available;
    } catch {
      return 0n;
    }
  }, []);

  /**
   * Get user's rune balance for a specific rune
   */
  const getMyRuneBalance = useCallback(async (runeId: string): Promise<RuneBalanceView | null> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_my_rune_balance_v2(runeId);
    } catch {
      return null;
    }
  }, []);

  /**
   * Get all rune balances for the user
   * Note: Uses V1 endpoint which returns V1 balance type
   */
  const getMyAllRuneBalances = useCallback(async (): Promise<Array<[string, RuneBalanceViewV1]>> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_my_all_rune_balances();
    } catch {
      return [];
    }
  }, []);

  /**
   * Get the deposit address for ICP
   * Users should send ICP to this address, then call verifyDeposit
   */
  const getDepositAddress = useCallback(async (): Promise<string | null> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_deposit_address();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get deposit address';
      setError(errorMsg);
      return null;
    }
  }, []);

  /**
   * Verify and credit a deposit
   * Call this after sending ICP to the deposit address
   */
  const verifyDeposit = useCallback(async (): Promise<{ success: boolean; amount?: bigint; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.verify_deposit();

      if ('Ok' in result) {
        return { success: true, amount: result.Ok };
      } else {
        setError(result.Err);
        return { success: false, error: result.Err };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify deposit';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Withdraw ICP from trading balance to user's wallet
   * @param amount - Amount to withdraw in ICP (not e8s)
   */
  const withdrawIcp = useCallback(async (amount: number): Promise<{ success: boolean; blockIndex?: bigint; error?: string }> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();

      // Convert ICP to e8s
      const amountE8s = BigInt(Math.floor(amount * Number(E8S_PER_ICP)));

      const result = await actor.withdraw_icp(amountE8s);

      if ('Ok' in result) {
        return { success: true, blockIndex: result.Ok };
      } else {
        setError(result.Err);
        return { success: false, error: result.Err };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to withdraw';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get balance change history for the user
   */
  const getMyBalanceHistory = useCallback(async (limit: number = 50): Promise<BalanceChangeView[]> => {
    try {
      const actor = await getRuneEngineActor();
      return await actor.get_my_balance_history(BigInt(limit));
    } catch {
      return [];
    }
  }, []);

  return {
    // State
    loading,
    error,
    clearError,

    // Pool management
    createPool,
    getPool,
    listPools,
    getPoolCount,

    // Quotes
    getBuyQuote,
    getSellQuote,

    // Trading
    buyRune,
    sellRune,

    // Price & Market data
    getPrice,
    getMarketCap,

    // Trade history
    getRuneTradeHistory,
    getMyTradeHistory,

    // ICP Balance & Deposits
    getMyIcpBalance,
    getMyRuneBalance,
    getMyAllRuneBalances,
    getDepositAddress,
    verifyDeposit,
    withdrawIcp,
    getMyBalanceHistory,

    // Utilities
    formatIcp,
    parseIcpToE8s,
    E8S_PER_ICP,
    ICP_DECIMALS,
  };
}

export default useTrading;
