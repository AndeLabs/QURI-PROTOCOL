/**
 * QURI Store Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useQURIStore } from '../useQURIStore';
import { runeKeyToString, principalToString } from '../types';
import type { RuneMetadata, EtchingProcess, UTXO } from '../types';
import { Principal } from '@dfinity/principal';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const testPrincipal = Principal.fromText('aaaaa-aa');
const testPrincipal2 = Principal.fromText('2vxsx-fae');

const createRuneMetadata = (block: number, tx: number): RuneMetadata => ({
  key: { block: BigInt(block), tx },
  name: `RUNE${block}`,
  symbol: `R${block}`,
  divisibility: 8,
  creator: testPrincipal,
  created_at: BigInt(Date.now()),
  total_supply: 21000000n,
  premine: 0n,
});

const createProcess = (id: string, runeBlock: number, runeTx: number): EtchingProcess => ({
  id,
  rune_key: { block: BigInt(runeBlock), tx: runeTx },
  status: 'pending',
  created_at: Date.now(),
  updated_at: Date.now(),
  confirmations: 0,
});

const createUtxo = (txid: string, vout: number, amount: bigint): UTXO => ({
  txid,
  vout,
  amount,
  confirmations: 6,
  address: 'bc1qtest',
});

// ============================================================================
// STORE SETUP
// ============================================================================

beforeEach(() => {
  // Reset store before each test
  useQURIStore.getState().reset();
});

// ============================================================================
// RUNE TESTS
// ============================================================================

describe('QURI Store - Runes', () => {
  it('should add a rune', () => {
    const store = useQURIStore.getState();
    const rune = createRuneMetadata(840000, 1);
    
    store.addRune(rune);
    
    const key = runeKeyToString(rune.key);
    const retrieved = store.getRuneByKey(key);
    
    expect(retrieved).toEqual(rune);
    expect(store.getTotalRunes()).toBe(1);
  });

  it('should add multiple runes', () => {
    const store = useQURIStore.getState();
    const runes = [
      createRuneMetadata(840000, 1),
      createRuneMetadata(840000, 2),
      createRuneMetadata(840001, 1),
    ];
    
    store.addRunes(runes);
    
    expect(store.getTotalRunes()).toBe(3);
  });

  it('should update a rune', () => {
    const store = useQURIStore.getState();
    const rune = createRuneMetadata(840000, 1);
    
    store.addRune(rune);
    
    const key = runeKeyToString(rune.key);
    store.updateRune(key, { symbol: 'UPDATED' });
    
    const updated = store.getRuneByKey(key);
    expect(updated?.symbol).toBe('UPDATED');
  });

  it('should remove a rune', () => {
    const store = useQURIStore.getState();
    const rune = createRuneMetadata(840000, 1);
    
    store.addRune(rune);
    expect(store.getTotalRunes()).toBe(1);
    
    const key = runeKeyToString(rune.key);
    store.removeRune(key);
    
    expect(store.getTotalRunes()).toBe(0);
    expect(store.getRuneByKey(key)).toBeUndefined();
  });

  it('should index runes by creator', () => {
    const store = useQURIStore.getState();
    const rune1 = createRuneMetadata(840000, 1);
    const rune2 = { ...createRuneMetadata(840000, 2), creator: testPrincipal2 };
    const rune3 = createRuneMetadata(840001, 1);
    
    store.addRunes([rune1, rune2, rune3]);
    
    const creatorRunes = store.getRunesByCreator(testPrincipal);
    expect(creatorRunes).toHaveLength(2);
    expect(creatorRunes.map(r => r.name)).toContain('RUNE840000');
    expect(creatorRunes.map(r => r.name)).toContain('RUNE840001');
  });

  it('should calculate total supply', () => {
    const store = useQURIStore.getState();
    const runes = [
      createRuneMetadata(840000, 1),
      createRuneMetadata(840000, 2),
      createRuneMetadata(840001, 1),
    ];
    
    store.addRunes(runes);
    
    const totalSupply = store.getTotalSupply();
    expect(totalSupply).toBe(21000000n * 3n);
  });
});

// ============================================================================
// PROCESS TESTS
// ============================================================================

describe('QURI Store - Processes', () => {
  it('should add a process', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    
    const retrieved = store.getProcessById('proc1');
    expect(retrieved).toEqual(process);
  });

  it('should update a process', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    store.updateProcess('proc1', { status: 'confirming', tx_hash: '0xabc' });
    
    const updated = store.getProcessById('proc1');
    expect(updated?.status).toBe('confirming');
    expect(updated?.tx_hash).toBe('0xabc');
  });

  it('should set process status', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    store.setProcessStatus('proc1', 'confirmed');
    
    const updated = store.getProcessById('proc1');
    expect(updated?.status).toBe('confirmed');
  });

  it('should increment confirmations', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    
    store.incrementConfirmations('proc1');
    expect(store.getProcessById('proc1')?.confirmations).toBe(1);
    
    store.incrementConfirmations('proc1');
    expect(store.getProcessById('proc1')?.confirmations).toBe(2);
  });

  it('should auto-confirm at 6 confirmations', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    store.updateProcess('proc1', { status: 'confirming' });
    
    // Increment to 6
    for (let i = 0; i < 6; i++) {
      store.incrementConfirmations('proc1');
    }
    
    const updated = store.getProcessById('proc1');
    expect(updated?.confirmations).toBe(6);
    expect(updated?.status).toBe('confirmed');
  });

  it('should index processes by rune', () => {
    const store = useQURIStore.getState();
    const processes = [
      createProcess('proc1', 840000, 1),
      createProcess('proc2', 840000, 1),
      createProcess('proc3', 840000, 2),
    ];
    
    processes.forEach(p => store.addProcess(p));
    
    const runeKey = runeKeyToString({ block: 840000n, tx: 1 });
    const runeProcesses = store.getProcessesByRune(runeKey);
    
    expect(runeProcesses).toHaveLength(2);
    expect(runeProcesses.map(p => p.id)).toContain('proc1');
    expect(runeProcesses.map(p => p.id)).toContain('proc2');
  });

  it('should get active processes', () => {
    const store = useQURIStore.getState();
    const processes = [
      { ...createProcess('proc1', 840000, 1), status: 'pending' as const },
      { ...createProcess('proc2', 840000, 2), status: 'confirming' as const },
      { ...createProcess('proc3', 840000, 3), status: 'confirmed' as const },
      { ...createProcess('proc4', 840000, 4), status: 'failed' as const },
    ];
    
    processes.forEach(p => store.addProcess(p));
    
    const active = store.getActiveProcesses();
    expect(active).toHaveLength(2);
    expect(active.map(p => p.id)).toContain('proc1');
    expect(active.map(p => p.id)).toContain('proc2');
  });

  it('should get confirmed processes', () => {
    const store = useQURIStore.getState();
    const processes = [
      { ...createProcess('proc1', 840000, 1), status: 'pending' as const },
      { ...createProcess('proc2', 840000, 2), status: 'confirmed' as const },
      { ...createProcess('proc3', 840000, 3), status: 'confirmed' as const },
    ];
    
    processes.forEach(p => store.addProcess(p));
    
    const confirmed = store.getConfirmedProcesses();
    expect(confirmed).toHaveLength(2);
  });

  it('should get failed processes', () => {
    const store = useQURIStore.getState();
    const processes = [
      { ...createProcess('proc1', 840000, 1), status: 'pending' as const },
      { ...createProcess('proc2', 840000, 2), status: 'failed' as const },
    ];
    
    processes.forEach(p => store.addProcess(p));
    
    const failed = store.getFailedProcesses();
    expect(failed).toHaveLength(1);
    expect(failed[0].id).toBe('proc2');
  });

  it('should remove a process', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    expect(store.getProcessById('proc1')).toBeDefined();
    
    store.removeProcess('proc1');
    expect(store.getProcessById('proc1')).toBeUndefined();
  });
});

// ============================================================================
// UTXO TESTS
// ============================================================================

describe('QURI Store - UTXOs', () => {
  it('should add a UTXO', () => {
    const store = useQURIStore.getState();
    const utxo = createUtxo('txid1', 0, 100000n);
    
    store.addUtxo(utxo);
    
    const retrieved = store.getUtxoById('txid1:0');
    expect(retrieved).toEqual(utxo);
  });

  it('should add multiple UTXOs', () => {
    const store = useQURIStore.getState();
    const utxos = [
      createUtxo('txid1', 0, 100000n),
      createUtxo('txid1', 1, 50000n),
      createUtxo('txid2', 0, 25000n),
    ];
    
    store.addUtxos(utxos);
    
    expect(store.getUtxoById('txid1:0')).toBeDefined();
    expect(store.getUtxoById('txid1:1')).toBeDefined();
    expect(store.getUtxoById('txid2:0')).toBeDefined();
  });

  it('should update UTXO confirmations', () => {
    const store = useQURIStore.getState();
    const utxo = createUtxo('txid1', 0, 100000n);
    
    store.addUtxo(utxo);
    store.updateUtxoConfirmations('txid1:0', 10);
    
    const updated = store.getUtxoById('txid1:0');
    expect(updated?.confirmations).toBe(10);
  });

  it('should index UTXOs by address', () => {
    const store = useQURIStore.getState();
    const utxos = [
      { ...createUtxo('txid1', 0, 100000n), address: 'bc1qaddr1' },
      { ...createUtxo('txid1', 1, 50000n), address: 'bc1qaddr1' },
      { ...createUtxo('txid2', 0, 25000n), address: 'bc1qaddr2' },
    ];
    
    store.addUtxos(utxos);
    
    const balance1 = store.getUtxoBalance('bc1qaddr1');
    expect(balance1).toBe(150000n);
    
    const balance2 = store.getUtxoBalance('bc1qaddr2');
    expect(balance2).toBe(25000n);
  });

  it('should remove a UTXO', () => {
    const store = useQURIStore.getState();
    const utxo = createUtxo('txid1', 0, 100000n);
    
    store.addUtxo(utxo);
    expect(store.getUtxoById('txid1:0')).toBeDefined();
    
    store.removeUtxo('txid1:0');
    expect(store.getUtxoById('txid1:0')).toBeUndefined();
  });
});

// ============================================================================
// UI STATE TESTS
// ============================================================================

describe('QURI Store - UI State', () => {
  it('should set selected rune', () => {
    const store = useQURIStore.getState();
    const rune = createRuneMetadata(840000, 1);
    
    store.addRune(rune);
    
    const key = runeKeyToString(rune.key);
    store.setSelectedRune(key);
    
    const updatedStore = useQURIStore.getState();
    expect(updatedStore.ui.selectedRuneKey).toBe(key);
    expect(updatedStore.getSelectedRune()).toEqual(rune);
  });

  it('should set selected process', () => {
    const store = useQURIStore.getState();
    const process = createProcess('proc1', 840000, 1);
    
    store.addProcess(process);
    store.setSelectedProcess('proc1');
    
    const updatedStore = useQURIStore.getState();
    expect(updatedStore.ui.selectedProcessId).toBe('proc1');
    expect(updatedStore.getSelectedProcess()).toEqual(process);
  });

  it('should set search filter', () => {
    const store = useQURIStore.getState();
    
    store.setSearch('bitcoin');
    
    const updatedStore = useQURIStore.getState();
    expect(updatedStore.ui.filters.search).toBe('bitcoin');
    expect(updatedStore.ui.pagination.page).toBe(0); // Reset to first page
  });

  it('should filter runes by search', () => {
    const store = useQURIStore.getState();
    const runes = [
      { ...createRuneMetadata(840000, 1), name: 'BITCOIN', symbol: 'BTC' },
      { ...createRuneMetadata(840000, 2), name: 'ETHEREUM', symbol: 'ETH' },
      { ...createRuneMetadata(840001, 1), name: 'DOGECOIN', symbol: 'DOGE' },
    ];
    
    store.addRunes(runes);
    store.setSearch('bit');
    
    const filtered = store.getFilteredRunes();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('BITCOIN');
  });

  it('should filter by creator', () => {
    const store = useQURIStore.getState();
    const runes = [
      { ...createRuneMetadata(840000, 1), creator: testPrincipal },
      { ...createRuneMetadata(840000, 2), creator: testPrincipal2 },
      { ...createRuneMetadata(840001, 1), creator: testPrincipal },
    ];
    
    store.addRunes(runes);
    store.setCreatorFilter(principalToString(testPrincipal));
    
    const filtered = store.getFilteredRunes();
    expect(filtered).toHaveLength(2);
  });

  it('should filter by process status', () => {
    const store = useQURIStore.getState();
    const rune1 = createRuneMetadata(840000, 1);
    const rune2 = createRuneMetadata(840000, 2);
    
    store.addRunes([rune1, rune2]);
    store.addProcess({ ...createProcess('proc1', 840000, 1), status: 'confirmed' });
    store.addProcess({ ...createProcess('proc2', 840000, 2), status: 'pending' });
    
    store.setStatusFilter(['confirmed']);
    
    const filtered = store.getFilteredRunes();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('RUNE840000');
  });

  it('should paginate runes', () => {
    const store = useQURIStore.getState();
    const runes = Array.from({ length: 50 }, (_, i) => 
      createRuneMetadata(840000 + i, 1)
    );
    
    store.addRunes(runes);
    
    const page0 = store.getPaginatedRunes();
    expect(page0).toHaveLength(20); // Default page size
    
    store.setPage(1);
    const page1 = store.getPaginatedRunes();
    expect(page1).toHaveLength(20);
    expect(page1[0].name).not.toBe(page0[0].name);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('QURI Store - Integration', () => {
  it('should handle full rune lifecycle', () => {
    const store = useQURIStore.getState();
    
    // 1. Add rune
    const rune = createRuneMetadata(840000, 1);
    store.addRune(rune);
    expect(store.getTotalRunes()).toBe(1);
    
    // 2. Start process
    const process = createProcess('proc1', 840000, 1);
    store.addProcess(process);
    expect(store.getActiveProcesses()).toHaveLength(1);
    
    // 3. Update process status
    store.updateProcess('proc1', { 
      status: 'broadcasting', 
      tx_hash: '0xabc' 
    });
    
    // 4. Increment confirmations
    for (let i = 0; i < 6; i++) {
      store.incrementConfirmations('proc1');
    }
    
    // 5. Check final state
    const finalProcess = store.getProcessById('proc1');
    expect(finalProcess?.status).toBe('confirmed');
    expect(finalProcess?.confirmations).toBe(6);
    expect(store.getActiveProcesses()).toHaveLength(0);
    expect(store.getConfirmedProcesses()).toHaveLength(1);
  });

  it('should maintain referential integrity', () => {
    const store = useQURIStore.getState();
    
    // Add rune and process
    const rune = createRuneMetadata(840000, 1);
    const process = createProcess('proc1', 840000, 1);
    
    store.addRune(rune);
    store.addProcess(process);
    
    // Remove rune - processes should remain
    const runeKey = runeKeyToString(rune.key);
    store.removeRune(runeKey);
    
    expect(store.getProcessById('proc1')).toBeDefined();
    
    // But index should be cleaned
    const processes = store.getProcessesByRune(runeKey);
    expect(processes).toHaveLength(1); // Process still exists
  });

  it('should reset store', () => {
    const store = useQURIStore.getState();
    
    // Add data
    store.addRune(createRuneMetadata(840000, 1));
    store.addProcess(createProcess('proc1', 840000, 1));
    store.addUtxo(createUtxo('txid1', 0, 100000n));
    
    expect(store.getTotalRunes()).toBe(1);
    
    // Reset
    store.reset();
    
    // Verify all cleared
    expect(store.getTotalRunes()).toBe(0);
    expect(store.getProcessById('proc1')).toBeUndefined();
    expect(store.getUtxoById('txid1:0')).toBeUndefined();
  });
});
