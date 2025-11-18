/**
 * QURI Protocol - Bitcoin Coin Selection
 * 
 * Implements multiple coin selection algorithms:
 * 1. Branch and Bound (optimal)
 * 2. Single Random Draw (fallback)
 * 3. Largest First (simple)
 * 
 * Based on Bitcoin Core's coin selection logic:
 * https://github.com/bitcoin/bitcoin/blob/master/src/wallet/coinselection.cpp
 */

import type { UTXO } from '../store/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CoinSelectionResult {
  selectedUtxos: UTXO[];
  totalInput: bigint;
  change: bigint;
  fee: bigint;
  algorithm: 'branch-and-bound' | 'single-random-draw' | 'largest-first';
  wastMetric: bigint;  // Waste metric (lower is better)
}

export interface CoinSelectionOptions {
  targetAmount: bigint;
  feeRate: bigint;  // satoshis per vbyte
  minChange: bigint;  // Minimum change output (dust threshold)
  maxInputs?: number;  // Maximum number of inputs
  preferConfirmed?: boolean;  // Prefer confirmed UTXOs
  costOfChange: bigint;  // Cost to create and spend change output
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_OPTIONS: Partial<CoinSelectionOptions> = {
  feeRate: 10n,  // 10 sat/vbyte
  minChange: 546n,  // Bitcoin dust limit
  maxInputs: 100,
  preferConfirmed: true,
  costOfChange: 68n * 10n,  // ~68 vbytes for P2WPKH change
};

// Input weights (vbytes)
const INPUT_WEIGHT_P2WPKH = 68n;  // Native SegWit
const INPUT_WEIGHT_P2SH_P2WPKH = 91n;  // Nested SegWit
const INPUT_WEIGHT_P2PKH = 148n;  // Legacy

// Output weights (vbytes)
const OUTPUT_WEIGHT_P2WPKH = 31n;
const OUTPUT_WEIGHT_P2SH = 32n;
const OUTPUT_WEIGHT_P2PKH = 34n;

// Branch and Bound parameters
const BRANCH_AND_BOUND_MAX_TRIES = 100000;
const BRANCH_AND_BOUND_COST_OF_CHANGE = 68n;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate effective value of UTXO
 * Effective value = actual value - cost to spend
 */
function getEffectiveValue(utxo: UTXO, feeRate: bigint): bigint {
  const inputWeight = getInputWeight(utxo.address);
  const cost = inputWeight * feeRate;
  return utxo.amount - cost;
}

/**
 * Get input weight based on address type
 */
function getInputWeight(address: string): bigint {
  if (address.startsWith('bc1') || address.startsWith('tb1')) {
    return INPUT_WEIGHT_P2WPKH;  // Native SegWit
  } else if (address.startsWith('3') || address.startsWith('2')) {
    return INPUT_WEIGHT_P2SH_P2WPKH;  // Nested SegWit
  } else {
    return INPUT_WEIGHT_P2PKH;  // Legacy
  }
}

/**
 * Calculate transaction fee
 */
function calculateFee(utxos: UTXO[], feeRate: bigint, hasChange: boolean): bigint {
  // Base transaction weight
  let totalWeight = 10n;  // Version + locktime

  // Inputs
  utxos.forEach(utxo => {
    totalWeight += getInputWeight(utxo.address);
  });

  // Outputs (always at least 1 for the payment)
  totalWeight += OUTPUT_WEIGHT_P2WPKH;
  if (hasChange) {
    totalWeight += OUTPUT_WEIGHT_P2WPKH;
  }

  return totalWeight * feeRate;
}

/**
 * Calculate waste metric
 * Lower is better - measures cost and change overhead
 */
function calculateWaste(
  utxos: UTXO[],
  targetAmount: bigint,
  feeRate: bigint,
  costOfChange: bigint
): bigint {
  const totalInput = utxos.reduce((sum, utxo) => sum + utxo.amount, 0n);
  const fee = calculateFee(utxos, feeRate, false);
  const change = totalInput - targetAmount - fee;

  if (change < 0n) {
    return BigInt(Number.MAX_SAFE_INTEGER);  // Invalid selection
  }

  // Waste = excess + (cost of change if we create it)
  const excess = change > 0n ? change : 0n;
  const changeWaste = excess > 0n ? costOfChange : 0n;

  return excess + changeWaste;
}

// ============================================================================
// BRANCH AND BOUND ALGORITHM
// ============================================================================

/**
 * Branch and Bound coin selection
 * Finds exact match or minimal waste solution
 * 
 * Time complexity: O(2^n) worst case, but with pruning
 * Space complexity: O(n)
 */
function branchAndBound(
  utxos: UTXO[],
  options: CoinSelectionOptions
): CoinSelectionResult | null {
  const { targetAmount, feeRate, costOfChange } = options;

  // Sort by descending effective value
  const sortedUtxos = [...utxos].sort((a, b) => {
    const effA = getEffectiveValue(a, feeRate);
    const effB = getEffectiveValue(b, feeRate);
    return effA > effB ? -1 : 1;
  });

  // Precompute effective values
  const effectiveValues = sortedUtxos.map(utxo => 
    getEffectiveValue(utxo, feeRate)
  );

  // Target with fee included
  const actualTarget = targetAmount + calculateFee([], feeRate, false);

  let bestSelection: number[] | null = null;
  let bestWaste = BigInt(Number.MAX_SAFE_INTEGER);
  let tries = 0;

  /**
   * Recursive branch and bound search
   */
  function search(
    index: number,
    currentSelection: number[],
    currentValue: bigint,
    currentWaste: bigint
  ): void {
    tries++;

    // Exceeded max tries
    if (tries > BRANCH_AND_BOUND_MAX_TRIES) {
      return;
    }

    // Found exact match - best possible solution
    if (currentValue === actualTarget) {
      bestSelection = [...currentSelection];
      bestWaste = 0n;
      return;
    }

    // Exceeded target - check if this is best solution
    if (currentValue > actualTarget) {
      if (currentWaste < bestWaste) {
        bestSelection = [...currentSelection];
        bestWaste = currentWaste;
      }
      return;  // Can't improve by adding more
    }

    // Reached end of UTXOs
    if (index >= sortedUtxos.length) {
      return;
    }

    // Pruning: Check if adding all remaining UTXOs would meet target
    let remainingValue = 0n;
    for (let i = index; i < sortedUtxos.length; i++) {
      remainingValue += effectiveValues[i];
    }
    if (currentValue + remainingValue < actualTarget) {
      return;  // Can't reach target
    }

    // Branch 1: Include current UTXO
    const utxo = sortedUtxos[index];
    const newSelection = [...currentSelection, index];
    const newValue = currentValue + effectiveValues[index];
    const newWaste = calculateWaste(
      newSelection.map(i => sortedUtxos[i]),
      targetAmount,
      feeRate,
      costOfChange
    );

    search(index + 1, newSelection, newValue, newWaste);

    // Early exit if found exact match
    if (bestWaste === 0n) {
      return;
    }

    // Branch 2: Exclude current UTXO
    search(index + 1, currentSelection, currentValue, currentWaste);
  }

  // Start search
  search(0, [], 0n, BigInt(Number.MAX_SAFE_INTEGER));

  if (!bestSelection) {
    return null;
  }

  // Build result
  const selectedUtxos = bestSelection.map(i => sortedUtxos[i]);
  const totalInput = selectedUtxos.reduce((sum, utxo) => sum + utxo.amount, 0n);
  const fee = calculateFee(selectedUtxos, feeRate, true);
  const change = totalInput - targetAmount - fee;

  return {
    selectedUtxos,
    totalInput,
    change: change > 0n ? change : 0n,
    fee,
    algorithm: 'branch-and-bound',
    wastMetric: bestWaste,
  };
}

// ============================================================================
// SINGLE RANDOM DRAW ALGORITHM
// ============================================================================

/**
 * Single Random Draw coin selection
 * Randomly selects UTXOs until target is met
 * 
 * Used as fallback when Branch and Bound fails
 */
function singleRandomDraw(
  utxos: UTXO[],
  options: CoinSelectionOptions
): CoinSelectionResult | null {
  const { targetAmount, feeRate, costOfChange } = options;

  // Shuffle UTXOs
  const shuffled = [...utxos].sort(() => Math.random() - 0.5);

  const selectedUtxos: UTXO[] = [];
  let totalInput = 0n;

  for (const utxo of shuffled) {
    selectedUtxos.push(utxo);
    totalInput += utxo.amount;

    const fee = calculateFee(selectedUtxos, feeRate, true);
    const change = totalInput - targetAmount - fee;

    // Check if we have enough
    if (change >= 0n) {
      const waste = calculateWaste(selectedUtxos, targetAmount, feeRate, costOfChange);

      return {
        selectedUtxos,
        totalInput,
        change,
        fee,
        algorithm: 'single-random-draw',
        wastMetric: waste,
      };
    }
  }

  return null;  // Insufficient funds
}

// ============================================================================
// LARGEST FIRST ALGORITHM
// ============================================================================

/**
 * Largest First coin selection
 * Selects largest UTXOs first
 * 
 * Simple and fast, but not optimal
 */
function largestFirst(
  utxos: UTXO[],
  options: CoinSelectionOptions
): CoinSelectionResult | null {
  const { targetAmount, feeRate, costOfChange } = options;

  // Sort by descending amount
  const sorted = [...utxos].sort((a, b) => 
    a.amount > b.amount ? -1 : 1
  );

  const selectedUtxos: UTXO[] = [];
  let totalInput = 0n;

  for (const utxo of sorted) {
    selectedUtxos.push(utxo);
    totalInput += utxo.amount;

    const fee = calculateFee(selectedUtxos, feeRate, true);
    const change = totalInput - targetAmount - fee;

    if (change >= 0n) {
      const waste = calculateWaste(selectedUtxos, targetAmount, feeRate, costOfChange);

      return {
        selectedUtxos,
        totalInput,
        change,
        fee,
        algorithm: 'largest-first',
        wastMetric: waste,
      };
    }
  }

  return null;
}

// ============================================================================
// MAIN COIN SELECTION
// ============================================================================

/**
 * Select coins for a transaction
 * Tries multiple algorithms and returns best result
 */
export function selectCoins(
  utxos: UTXO[],
  options: Partial<CoinSelectionOptions>
): CoinSelectionResult {
  const opts: CoinSelectionOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  } as CoinSelectionOptions;

  // Filter UTXOs
  let availableUtxos = utxos.filter(utxo => {
    // Skip if amount is negative or zero
    if (utxo.amount <= 0n) return false;

    // Skip if effective value is negative (too expensive to spend)
    if (getEffectiveValue(utxo, opts.feeRate) <= 0n) return false;

    // Optionally prefer confirmed
    if (opts.preferConfirmed && utxo.confirmations < 1) return false;

    return true;
  });

  // Sort by confirmations if preferred
  if (opts.preferConfirmed) {
    availableUtxos.sort((a, b) => b.confirmations - a.confirmations);
  }

  // Limit number of inputs
  if (opts.maxInputs && availableUtxos.length > opts.maxInputs) {
    availableUtxos = availableUtxos.slice(0, opts.maxInputs);
  }

  // Check if we have enough funds
  const totalAvailable = availableUtxos.reduce((sum, utxo) => sum + utxo.amount, 0n);
  const estimatedFee = calculateFee(availableUtxos, opts.feeRate, true);
  
  if (totalAvailable < opts.targetAmount + estimatedFee) {
    throw new Error(
      `Insufficient funds: need ${opts.targetAmount + estimatedFee}, have ${totalAvailable}`
    );
  }

  // Try algorithms in order of preference
  const results: CoinSelectionResult[] = [];

  // 1. Branch and Bound (optimal)
  const bnbResult = branchAndBound(availableUtxos, opts);
  if (bnbResult) results.push(bnbResult);

  // 2. Single Random Draw (good fallback)
  const srdResult = singleRandomDraw(availableUtxos, opts);
  if (srdResult) results.push(srdResult);

  // 3. Largest First (always works if funds available)
  const lfResult = largestFirst(availableUtxos, opts);
  if (lfResult) results.push(lfResult);

  if (results.length === 0) {
    throw new Error('No valid coin selection found');
  }

  // Return result with lowest waste metric
  results.sort((a, b) => a.wastMetric > b.wastMetric ? 1 : -1);
  
  const best = results[0];
  
  console.log(`💰 Coin selection: ${best.algorithm}`);
  console.log(`   Selected: ${best.selectedUtxos.length} UTXOs`);
  console.log(`   Total input: ${best.totalInput} sats`);
  console.log(`   Fee: ${best.fee} sats`);
  console.log(`   Change: ${best.change} sats`);
  console.log(`   Waste: ${best.wastMetric} sats`);

  return best;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Estimate transaction fee without selecting coins
 */
export function estimateFee(
  numInputs: number,
  numOutputs: number,
  feeRate: bigint
): bigint {
  const inputWeight = INPUT_WEIGHT_P2WPKH * BigInt(numInputs);
  const outputWeight = OUTPUT_WEIGHT_P2WPKH * BigInt(numOutputs);
  const baseWeight = 10n;
  
  const totalWeight = baseWeight + inputWeight + outputWeight;
  return totalWeight * feeRate;
}

/**
 * Check if amount is dust
 */
export function isDust(amount: bigint, feeRate: bigint): boolean {
  const costToSpend = INPUT_WEIGHT_P2WPKH * feeRate;
  return amount < costToSpend;
}

/**
 * Get total balance from UTXOs
 */
export function getTotalBalance(utxos: UTXO[]): bigint {
  return utxos.reduce((sum, utxo) => sum + utxo.amount, 0n);
}

/**
 * Get confirmed balance
 */
export function getConfirmedBalance(utxos: UTXO[], minConfirmations = 1): bigint {
  return utxos
    .filter(utxo => utxo.confirmations >= minConfirmations)
    .reduce((sum, utxo) => sum + utxo.amount, 0n);
}

/**
 * Get unconfirmed balance
 */
export function getUnconfirmedBalance(utxos: UTXO[]): bigint {
  return utxos
    .filter(utxo => utxo.confirmations === 0)
    .reduce((sum, utxo) => sum + utxo.amount, 0n);
}
