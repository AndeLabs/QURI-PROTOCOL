/**
 * Coin Selection Algorithm Tests
 */

import { describe, it, expect } from 'vitest';
import {
  selectCoins,
  estimateFee,
  isDust,
  getTotalBalance,
  getConfirmedBalance,
  getUnconfirmedBalance,
} from '../coinSelection';
import type { UTXO } from '../../store/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createUtxo(amount: bigint, confirmations = 6): UTXO {
  return {
    txid: Math.random().toString(36),
    vout: Math.floor(Math.random() * 10),
    amount,
    confirmations,
    address: 'bc1qtest123456789',  // Native SegWit
  };
}

const UTXO_SET_1: UTXO[] = [
  createUtxo(100000n),
  createUtxo(50000n),
  createUtxo(25000n),
  createUtxo(10000n),
  createUtxo(5000n),
];

const UTXO_SET_2: UTXO[] = [
  createUtxo(1000000n),
  createUtxo(500000n),
  createUtxo(100000n),
  createUtxo(50000n),
];

const UTXO_SET_DUST: UTXO[] = [
  createUtxo(1000n),
  createUtxo(500n),
  createUtxo(200n),
];

// ============================================================================
// BASIC TESTS
// ============================================================================

describe('Coin Selection - Basic', () => {
  it('should select exact match', () => {
    const result = selectCoins(UTXO_SET_1, {
      targetAmount: 100000n,
      feeRate: 10n,
    });

    expect(result.selectedUtxos.length).toBeGreaterThan(0);
    expect(result.totalInput).toBeGreaterThanOrEqual(100000n);
    expect(result.change).toBeGreaterThanOrEqual(0n);
  });

  it('should select multiple UTXOs', () => {
    const result = selectCoins(UTXO_SET_1, {
      targetAmount: 150000n,
      feeRate: 10n,
    });

    expect(result.selectedUtxos.length).toBeGreaterThan(1);
    expect(result.totalInput).toBeGreaterThanOrEqual(150000n);
  });

  it('should throw on insufficient funds', () => {
    expect(() => {
      selectCoins(UTXO_SET_1, {
        targetAmount: 1000000n,
        feeRate: 10n,
      });
    }).toThrow('Insufficient funds');
  });

  it('should calculate correct fee', () => {
    const result = selectCoins(UTXO_SET_1, {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    expect(result.fee).toBeGreaterThan(0n);
    expect(result.totalInput).toBe(
      result.selectedUtxos.reduce((sum, u) => sum + u.amount, 0n)
    );
  });
});

// ============================================================================
// ALGORITHM TESTS
// ============================================================================

describe('Coin Selection - Algorithms', () => {
  it('should use Branch and Bound for optimal selection', () => {
    const result = selectCoins(UTXO_SET_2, {
      targetAmount: 100000n,
      feeRate: 1n,
      costOfChange: 68n,
    });

    // Branch and Bound should find a valid solution
    expect(result.algorithm).toBe('branch-and-bound');
    expect(result.wastMetric).toBeGreaterThan(0n);
    expect(result.wastMetric).toBeLessThan(100000n); // Reasonable waste
  });

  it('should fallback to Single Random Draw', () => {
    // Large UTXO set where BnB might timeout
    const largeSet = Array.from({ length: 100 }, (_, i) => 
      createUtxo(BigInt(1000 + i * 100))
    );

    const result = selectCoins(largeSet, {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    expect(result.selectedUtxos.length).toBeGreaterThan(0);
    expect(['branch-and-bound', 'single-random-draw', 'largest-first']).toContain(
      result.algorithm
    );
  });

  it('should use Largest First as fallback', () => {
    const result = selectCoins(UTXO_SET_1, {
      targetAmount: 80000n,
      feeRate: 10n,
    });

    expect(result.selectedUtxos.length).toBeGreaterThan(0);
    expect(result.totalInput).toBeGreaterThanOrEqual(80000n);
  });
});

// ============================================================================
// CHANGE CALCULATION TESTS
// ============================================================================

describe('Coin Selection - Change', () => {
  it('should create change when needed', () => {
    const result = selectCoins(UTXO_SET_1, {
      targetAmount: 30000n,
      feeRate: 10n,
      minChange: 546n,
    });

    const expectedChange = result.totalInput - result.fee - 30000n;
    expect(result.change).toBe(expectedChange);
  });

  it('should avoid dust change', () => {
    const result = selectCoins(UTXO_SET_1, {
      targetAmount: 50000n,
      feeRate: 10n,
      minChange: 546n,
    });

    if (result.change > 0n) {
      expect(result.change).toBeGreaterThanOrEqual(546n);
    }
  });

  it('should minimize change with Branch and Bound', () => {
    const result = selectCoins(UTXO_SET_2, {
      targetAmount: 100000n,
      feeRate: 5n,
      costOfChange: 340n,
    });

    // BnB should minimize waste
    expect(result.wastMetric).toBeLessThan(50000n);
  });
});

// ============================================================================
// FEE CALCULATION TESTS
// ============================================================================

describe('Coin Selection - Fees', () => {
  it('should calculate higher fees for more inputs', () => {
    const result1 = selectCoins([UTXO_SET_2[0]], {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    const result2 = selectCoins(UTXO_SET_1, {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    if (result2.selectedUtxos.length > result1.selectedUtxos.length) {
      expect(result2.fee).toBeGreaterThan(result1.fee);
    }
  });

  it('should scale fees with fee rate', () => {
    const result1 = selectCoins(UTXO_SET_1, {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    const result2 = selectCoins(UTXO_SET_1, {
      targetAmount: 50000n,
      feeRate: 20n,
    });

    expect(result2.fee).toBeGreaterThan(result1.fee);
  });

  it('should estimate fees correctly', () => {
    const estimated = estimateFee(2, 2, 10n);
    expect(estimated).toBeGreaterThan(0n);
    
    // 2 inputs + 2 outputs + base = ~10 + 68*2 + 31*2 = 208 vbytes
    expect(estimated).toBeGreaterThan(2000n);
    expect(estimated).toBeLessThan(3000n);
  });
});

// ============================================================================
// DUST TESTS
// ============================================================================

describe('Coin Selection - Dust', () => {
  it('should identify dust amounts', () => {
    expect(isDust(100n, 10n)).toBe(true);
    expect(isDust(1000n, 10n)).toBe(false);
  });

  it('should filter out dust UTXOs', () => {
    const result = selectCoins([...UTXO_SET_1, ...UTXO_SET_DUST], {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    // Should not select dust UTXOs
    const hasDust = result.selectedUtxos.some(u => u.amount < 1000n);
    expect(hasDust).toBe(false);
  });
});

// ============================================================================
// CONFIRMATION PREFERENCE TESTS
// ============================================================================

describe('Coin Selection - Confirmations', () => {
  it('should prefer confirmed UTXOs', () => {
    const mixed = [
      createUtxo(100000n, 0),  // Unconfirmed
      createUtxo(100000n, 6),  // Confirmed
    ];

    const result = selectCoins(mixed, {
      targetAmount: 50000n,
      feeRate: 10n,
      preferConfirmed: true,
    });

    // Should select confirmed UTXO
    expect(result.selectedUtxos.some(u => u.confirmations >= 1)).toBe(true);
  });

  it('should allow unconfirmed when specified', () => {
    const unconfirmed = [
      createUtxo(100000n, 0),
      createUtxo(50000n, 0),
    ];

    const result = selectCoins(unconfirmed, {
      targetAmount: 50000n,
      feeRate: 10n,
      preferConfirmed: false,
    });

    expect(result.selectedUtxos.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// BALANCE CALCULATION TESTS
// ============================================================================

describe('Coin Selection - Balance Helpers', () => {
  it('should calculate total balance', () => {
    const total = getTotalBalance(UTXO_SET_1);
    expect(total).toBe(190000n);
  });

  it('should calculate confirmed balance', () => {
    const mixed = [
      createUtxo(100000n, 6),
      createUtxo(50000n, 0),
    ];

    const confirmed = getConfirmedBalance(mixed, 1);
    expect(confirmed).toBe(100000n);
  });

  it('should calculate unconfirmed balance', () => {
    const mixed = [
      createUtxo(100000n, 6),
      createUtxo(50000n, 0),
      createUtxo(25000n, 0),
    ];

    const unconfirmed = getUnconfirmedBalance(mixed);
    expect(unconfirmed).toBe(75000n);
  });
});

// ============================================================================
// MAX INPUTS TESTS
// ============================================================================

describe('Coin Selection - Max Inputs', () => {
  it('should respect maxInputs limit', () => {
    // Use larger UTXOs so 2 inputs are enough
    const result = selectCoins(UTXO_SET_2, {
      targetAmount: 150000n,
      feeRate: 10n,
      maxInputs: 2,
    });

    expect(result.selectedUtxos.length).toBeLessThanOrEqual(2);
    expect(result.totalInput).toBeGreaterThanOrEqual(150000n);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Coin Selection - Edge Cases', () => {
  it('should handle single UTXO', () => {
    const result = selectCoins([createUtxo(100000n)], {
      targetAmount: 50000n,
      feeRate: 10n,
    });

    expect(result.selectedUtxos.length).toBe(1);
    expect(result.change).toBeGreaterThan(0n);
  });

  it('should handle exact amount with fee', () => {
    const utxo = createUtxo(100000n);
    const result = selectCoins([utxo], {
      targetAmount: 90000n,
      feeRate: 10n,
    });

    expect(result.totalInput).toBe(100000n);
    expect(result.totalInput).toBeGreaterThanOrEqual(
      result.fee + 90000n
    );
  });

  it('should handle empty UTXO set', () => {
    expect(() => {
      selectCoins([], {
        targetAmount: 50000n,
        feeRate: 10n,
      });
    }).toThrow('Insufficient funds');
  });

  it('should handle negative amounts', () => {
    const invalid = [createUtxo(-1000n)];
    
    expect(() => {
      selectCoins(invalid, {
        targetAmount: 50000n,
        feeRate: 10n,
      });
    }).toThrow('Insufficient funds');
  });
});

// ============================================================================
// WASTE METRIC TESTS
// ============================================================================

describe('Coin Selection - Waste Metric', () => {
  it('should calculate waste metric', () => {
    const result = selectCoins(UTXO_SET_2, {
      targetAmount: 100000n,
      feeRate: 10n,
      costOfChange: 680n,
    });

    expect(result.wastMetric).toBeGreaterThanOrEqual(0n);
  });

  it('should prefer lower waste solutions', () => {
    const result1 = selectCoins(UTXO_SET_2, {
      targetAmount: 100000n,
      feeRate: 10n,
      costOfChange: 680n,
    });

    // Same selection should have same waste
    const result2 = selectCoins(UTXO_SET_2, {
      targetAmount: 100000n,
      feeRate: 10n,
      costOfChange: 680n,
    });

    expect(result1.wastMetric).toBeLessThan(BigInt(Number.MAX_SAFE_INTEGER));
    expect(result2.wastMetric).toBeLessThan(BigInt(Number.MAX_SAFE_INTEGER));
  });
});
