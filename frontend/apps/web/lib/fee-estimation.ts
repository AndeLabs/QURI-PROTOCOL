/**
 * Fee estimation utilities for Bitcoin transactions
 * Professional fee calculation with proper estimation
 */

export interface FeeEstimate {
  slow: bigint;
  medium: bigint;
  fast: bigint;
}

// Default fee rates in sats/vbyte for different priority levels
const DEFAULT_FEE_RATES = {
  slow: 1, // ~60+ minutes
  medium: 3, // ~30 minutes
  fast: 5, // ~10 minutes
};

// Average transaction size for Rune etching (in vbytes)
const AVERAGE_RUNE_TX_SIZE = 250; // P2TR input + OP_RETURN + change output

/**
 * Estimate fees based on default rates
 * In production, this should call a Bitcoin fee API
 */
export function estimateEtchingFee(priority: 'slow' | 'medium' | 'fast' = 'medium'): bigint {
  const feeRate = DEFAULT_FEE_RATES[priority];
  const estimatedFee = feeRate * AVERAGE_RUNE_TX_SIZE;

  return BigInt(estimatedFee);
}

/**
 * Get all fee estimates
 */
export function getAllFeeEstimates(): FeeEstimate {
  return {
    slow: estimateEtchingFee('slow'),
    medium: estimateEtchingFee('medium'),
    fast: estimateEtchingFee('fast'),
  };
}

/**
 * Format fee in BTC (for display)
 */
export function formatFeeInBTC(satoshis: bigint): string {
  const btc = Number(satoshis) / 100_000_000;
  return btc.toFixed(8);
}

/**
 * Calculate total cost (fee + any other costs)
 */
export function calculateTotalCost(fee: bigint, additionalCosts: bigint = BigInt(0)): bigint {
  return fee + additionalCosts;
}

/**
 * In production, integrate with real Bitcoin fee estimation API
 * Examples:
 * - mempool.space API
 * - Blockstream API
 * - Bitcoin Core RPC
 *
 * Example implementation:
 *
 * export async function fetchNetworkFees(): Promise<FeeEstimate> {
 *   const response = await fetch('https://mempool.space/api/v1/fees/recommended');
 *   const data = await response.json();
 *
 *   return {
 *     slow: BigInt(data.hourFee * AVERAGE_RUNE_TX_SIZE),
 *     medium: BigInt(data.halfHourFee * AVERAGE_RUNE_TX_SIZE),
 *     fast: BigInt(data.fastestFee * AVERAGE_RUNE_TX_SIZE),
 *   };
 * }
 */
