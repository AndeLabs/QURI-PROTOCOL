/**
 * Octopus Runes Indexer Integration - Frontend
 * Type-safe interface for querying the Octopus Network Runes Indexer
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './octopus-indexer.did';
import { logger } from '@/lib/logger';

// Canister IDs
export const OCTOPUS_INDEXER_MAINNET = 'kzrva-ziaaa-aaaar-qamyq-cai';
export const OCTOPUS_INDEXER_TESTNET = 'f2dwm-caaaa-aaaao-qjxlq-cai';

// Types matching the Rust implementation
export type RuneId = string; // Format: "block:tx_index"

export interface BlockInfo {
  height: bigint;
  hash: string;
}

export interface Terms {
  amount: bigint;
  cap: bigint;
  height_start: bigint | null;
  height_end: bigint | null;
  offset_start: bigint | null;
  offset_end: bigint | null;
}

export interface OctopusRuneEntry {
  confirmations: number;
  rune_id: RuneId;
  mints: bigint;
  terms: Terms | null;
  etching: string;
  turbo: boolean;
  premine: bigint;
  divisibility: number;
  spaced_rune: string;
  sequence: number;
  timestamp: bigint;
  block: bigint;
  burned: bigint;
  symbol: string | null;
}

export interface RuneBalance {
  rune_id: RuneId;
  amount: bigint;
}

export interface OutPoint {
  txid: string;
  vout: number;
}

/**
 * Octopus Indexer Client
 */
export class OctopusIndexerClient {
  private actor: any;
  private network: 'mainnet' | 'testnet';

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network = network;
    const canisterId =
      network === 'mainnet' ? OCTOPUS_INDEXER_MAINNET : OCTOPUS_INDEXER_TESTNET;

    const agent = new HttpAgent({
      host: process.env.NEXT_PUBLIC_IC_HOST || 'https://ic0.app',
    });

    // Only needed in development
    if (process.env.NODE_ENV === 'development') {
      agent.fetchRootKey().catch((err) => {
        logger.warn('Unable to fetch root key:', err);
      });
    }

    this.actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: Principal.fromText(canisterId),
    });
  }

  /**
   * Get the latest Bitcoin block indexed
   * Returns tuple: [block_height: number, block_hash: string]
   */
  async getLatestBlock(): Promise<BlockInfo> {
    try {
      logger.info('Fetching latest block from Octopus Indexer');
      // The actual API returns a tuple [nat32, text], not a record
      const result = await this.actor.get_latest_block();
      
      // Convert tuple to BlockInfo format for backwards compatibility
      const blockInfo: BlockInfo = {
        height: BigInt(result[0]),
        hash: result[1],
      };
      
      logger.info('Latest block fetched', { height: blockInfo.height.toString() });
      return blockInfo;
    } catch (error) {
      logger.error('Failed to fetch latest block', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get Rune ID from etching transaction
   */
  async getEtching(txid: string): Promise<RuneId | null> {
    try {
      logger.info('Fetching etching', { txid });
      const result = await this.actor.get_etching(txid);
      logger.info('Etching fetched', { rune_id: result });
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error('Failed to fetch etching', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get Rune by spaced name (e.g., "QUANTUM•LEAP")
   */
  async getRune(spacedName: string): Promise<OctopusRuneEntry | null> {
    try {
      logger.info('Fetching rune by name', { name: spacedName });
      const result = await this.actor.get_rune(spacedName);
      logger.info('Rune fetched by name', { found: result.length > 0 });
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error('Failed to fetch rune by name', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get Rune by Rune ID
   */
  async getRuneById(runeId: RuneId): Promise<OctopusRuneEntry | null> {
    try {
      logger.info('Fetching rune by ID', { rune_id: runeId });
      const result = await this.actor.get_rune_by_id(runeId);
      logger.info('Rune fetched by ID', { found: result.length > 0 });
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error('Failed to fetch rune by ID', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get Rune balances for multiple outputs (UTXOs)
   */
  async getRuneBalancesForOutputs(outputs: OutPoint[]): Promise<RuneBalance[][]> {
    try {
      logger.info('Fetching rune balances', { count: outputs.length });
      const result = await this.actor.get_rune_balances_for_outputs(outputs);
      logger.info('Rune balances fetched');
      return result;
    } catch (error) {
      logger.error(
        'Failed to fetch rune balances',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }
}

/**
 * Verification utilities
 */
export const MIN_CONFIRMATIONS = 6;

export function isConfirmed(runeEntry: OctopusRuneEntry): boolean {
  return runeEntry.confirmations >= MIN_CONFIRMATIONS;
}

export function getConfirmationStatus(
  confirmations: number
): 'pending' | 'confirming' | 'confirmed' {
  if (confirmations === 0) return 'pending';
  if (confirmations < MIN_CONFIRMATIONS) return 'confirming';
  return 'confirmed';
}

export function estimateConfirmationTime(currentConfirmations: number): number | null {
  if (currentConfirmations >= MIN_CONFIRMATIONS) return null;

  const remaining = MIN_CONFIRMATIONS - currentConfirmations;
  const avgBlockTime = 600; // 10 minutes in seconds

  return remaining * avgBlockTime;
}

export function formatConfirmationTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Format utilities for displaying Rune data
 */
export function formatSupply(amount: bigint, divisibility: number): string {
  const amountStr = amount.toString();
  if (divisibility === 0) return amountStr;

  const paddedStr = amountStr.padStart(divisibility + 1, '0');
  const integerPart = paddedStr.slice(0, -divisibility) || '0';
  const decimalPart = paddedStr.slice(-divisibility);

  return `${integerPart}.${decimalPart}`;
}

export function formatRuneId(runeId: RuneId): { block: number; index: number } {
  const [block, index] = runeId.split(':').map(Number);
  return { block, index };
}

/**
 * Compare QURI Rune data with Octopus Indexer data
 */
export interface RuneDataComparison {
  matches: boolean;
  differences: string[];
}

export function compareRuneData(
  quri: {
    name: string;
    symbol?: string;
    divisibility: number;
    premine: bigint;
  },
  octopus: OctopusRuneEntry
): RuneDataComparison {
  const differences: string[] = [];

  if (quri.name !== octopus.spaced_rune) {
    differences.push(`Name mismatch: ${quri.name} vs ${octopus.spaced_rune}`);
  }

  if (quri.symbol && quri.symbol !== octopus.symbol) {
    differences.push(`Symbol mismatch: ${quri.symbol} vs ${octopus.symbol}`);
  }

  if (quri.divisibility !== octopus.divisibility) {
    differences.push(
      `Divisibility mismatch: ${quri.divisibility} vs ${octopus.divisibility}`
    );
  }

  if (quri.premine !== octopus.premine) {
    differences.push(`Premine mismatch: ${quri.premine} vs ${octopus.premine}`);
  }

  return {
    matches: differences.length === 0,
    differences,
  };
}

/**
 * React hook for using Octopus Indexer
 */
export function useOctopusIndexer(network: 'mainnet' | 'testnet' = 'mainnet') {
  const client = new OctopusIndexerClient(network);

  return {
    getLatestBlock: () => client.getLatestBlock(),
    getEtching: (txid: string) => client.getEtching(txid),
    getRune: (name: string) => client.getRune(name),
    getRuneById: (id: RuneId) => client.getRuneById(id),
    getRuneBalances: (outputs: OutPoint[]) => client.getRuneBalancesForOutputs(outputs),
  };
}

/**
 * Cache for reducing repeated calls
 */
class RuneCache {
  private cache: Map<RuneId, { entry: OctopusRuneEntry; timestamp: number }>;
  private cacheDuration: number;

  constructor(cacheDurationMs: number = 60000) {
    // Default 1 minute
    this.cache = new Map();
    this.cacheDuration = cacheDurationMs;
  }

  get(runeId: RuneId): OctopusRuneEntry | null {
    const cached = this.cache.get(runeId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.cacheDuration) {
      this.cache.delete(runeId);
      return null;
    }

    return cached.entry;
  }

  set(runeId: RuneId, entry: OctopusRuneEntry): void {
    this.cache.set(runeId, {
      entry,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  clearExpired(): void {
    const now = Date.now();
    for (const [runeId, { timestamp }] of this.cache.entries()) {
      if (now - timestamp > this.cacheDuration) {
        this.cache.delete(runeId);
      }
    }
  }
}

export const globalRuneCache = new RuneCache();

/**
 * Cached client for better performance
 */
export class CachedOctopusIndexerClient extends OctopusIndexerClient {
  private cache: RuneCache;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet', cacheDurationMs: number = 60000) {
    super(network);
    this.cache = new RuneCache(cacheDurationMs);
  }

  async getRuneById(runeId: RuneId): Promise<OctopusRuneEntry | null> {
    // Check cache first
    const cached = this.cache.get(runeId);
    if (cached) {
      logger.info('Rune fetched from cache', { rune_id: runeId });
      return cached;
    }

    // Fetch from indexer
    const entry = await super.getRuneById(runeId);
    if (entry) {
      this.cache.set(runeId, entry);
    }

    return entry;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
