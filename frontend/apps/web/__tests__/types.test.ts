/**
 * Type validation tests
 * These tests verify TypeScript type definitions are correct
 */

import type {
  RuneEtching,
  MintTerms,
  EtchingProcessView,
  BitcoinNetwork,
  Result,
} from '@/types/canisters';

describe('Type Definitions', () => {
  it('should have valid RuneEtching type', () => {
    const etching: RuneEtching = {
      rune_name: 'BITCOIN•RUNE',
      symbol: 'BTC',
      divisibility: 8,
      premine: BigInt(1000000),
      terms: [],
    };

    expect(etching.rune_name).toBe('BITCOIN•RUNE');
    expect(etching.divisibility).toBe(8);
    expect(typeof etching.premine).toBe('bigint');
  });

  it('should have valid MintTerms type', () => {
    const terms: MintTerms = {
      amount: BigInt(100),
      cap: BigInt(10000),
      height_start: [],
      height_end: [],
      offset_start: [],
      offset_end: [],
    };

    expect(typeof terms.amount).toBe('bigint');
    expect(Array.isArray(terms.height_start)).toBe(true);
  });

  it('should have valid Result type', () => {
    const successResult: Result<string, string> = { Ok: 'process-id-123' };
    const errorResult: Result<string, string> = { Err: 'Insufficient balance' };

    expect('Ok' in successResult).toBe(true);
    expect('Err' in errorResult).toBe(true);
  });

  it('should have valid BitcoinNetwork type', () => {
    const mainnet: BitcoinNetwork = { Mainnet: null };
    const testnet: BitcoinNetwork = { Testnet: null };
    const regtest: BitcoinNetwork = { Regtest: null };

    expect('Mainnet' in mainnet).toBe(true);
    expect('Testnet' in testnet).toBe(true);
    expect('Regtest' in regtest).toBe(true);
  });

  it('should have valid EtchingProcessView type', () => {
    const process: EtchingProcessView = {
      id: 'process-123',
      rune_name: 'BITCOIN•RUNE',
      state: 'Completed',
      created_at: BigInt(Date.now()),
      updated_at: BigInt(Date.now()),
      retry_count: 0,
      txid: ['abc123...'],
    };

    expect(process.id).toBe('process-123');
    expect(typeof process.created_at).toBe('bigint');
    expect(Array.isArray(process.txid)).toBe(true);
  });
});
