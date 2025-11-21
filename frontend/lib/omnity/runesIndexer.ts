/**
 * Omnity Runes Indexer Service
 * Client for querying on-chain Bitcoin Runes data
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '@/lib/icp/idl/runes-indexer.idl';
import type {
  RuneEntry,
  GetEtchingResult,
  RuneBalance,
  RuneBalancesResult,
  FormattedRuneEntry,
  FormattedRuneBalance,
} from './types';
import { logger } from '@/lib/logger';

// Canister IDs
const MAINNET_CANISTER_ID = 'kzrva-ziaaa-aaaar-qamyq-cai';
const TESTNET_CANISTER_ID = 'f2dwm-caaaa-aaaao-qjxlq-cai';

// Determine which canister to use based on environment
const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'https://ic0.app';
const IS_MAINNET = IC_HOST.includes('ic0.app') || IC_HOST.includes('icp0.io');
const CANISTER_ID = IS_MAINNET ? MAINNET_CANISTER_ID : TESTNET_CANISTER_ID;

// Service interface
interface RunesIndexerService {
  get_latest_block: () => Promise<[number, string]>;
  get_etching: (txid: string) => Promise<[GetEtchingResult] | []>;
  get_rune: (spacedName: string) => Promise<[RuneEntry] | []>;
  get_rune_by_id: (runeId: string) => Promise<[RuneEntry] | []>;
  get_rune_balances_for_outputs: (outpoints: string[]) => Promise<RuneBalancesResult>;
}

// Singleton actor instance
let actor: RunesIndexerService | null = null;

/**
 * Get or create the Runes Indexer actor
 */
function getActor(): RunesIndexerService {
  if (actor) return actor;

  const agent = HttpAgent.createSync({
    host: IS_MAINNET ? 'https://ic0.app' : IC_HOST,
  });

  // Don't fetch root key for mainnet
  if (!IS_MAINNET && IC_HOST.includes('localhost')) {
    agent.fetchRootKey().catch((err) => {
      logger.warn('Failed to fetch root key for runes indexer', { error: err });
    });
  }

  actor = Actor.createActor<RunesIndexerService>(idlFactory, {
    agent,
    canisterId: CANISTER_ID,
  });

  return actor;
}

/**
 * Get the latest indexed block
 */
export async function getLatestBlock(): Promise<{ height: number; hash: string }> {
  try {
    const indexer = getActor();
    const [height, hash] = await indexer.get_latest_block();
    return { height, hash };
  } catch (error) {
    logger.error('Failed to get latest block from indexer', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get etching info for a transaction
 */
export async function getEtching(txid: string): Promise<GetEtchingResult | null> {
  try {
    const indexer = getActor();
    const result = await indexer.get_etching(txid);
    return result.length > 0 ? result[0] ?? null : null;
  } catch (error) {
    logger.error('Failed to get etching', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get rune by spaced name (e.g., "HOPE•YOU•GET•RICH")
 */
export async function getRune(spacedName: string): Promise<RuneEntry | null> {
  try {
    const indexer = getActor();
    const result = await indexer.get_rune(spacedName);
    return result.length > 0 ? result[0] ?? null : null;
  } catch (error) {
    logger.error('Failed to get rune', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get rune by ID (e.g., "840000:846")
 */
export async function getRuneById(runeId: string): Promise<RuneEntry | null> {
  try {
    const indexer = getActor();
    const result = await indexer.get_rune_by_id(runeId);
    return result.length > 0 ? result[0] ?? null : null;
  } catch (error) {
    logger.error('Failed to get rune by ID', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get rune balances for UTXOs
 * @param outpoints Array of "txid:vout" strings
 */
export async function getRuneBalancesForOutputs(
  outpoints: string[]
): Promise<RuneBalance[][]> {
  try {
    const indexer = getActor();
    const result = await indexer.get_rune_balances_for_outputs(outpoints);

    if ('Ok' in result) {
      return result.Ok;
    } else {
      throw new Error('MaxOutpointsExceeded');
    }
  } catch (error) {
    logger.error('Failed to get rune balances', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Format a rune entry for display
 */
export function formatRuneEntry(entry: RuneEntry): FormattedRuneEntry {
  const [block, txIndex] = entry.rune_id.split(':').map(Number);

  return {
    id: entry.rune_id,
    name: entry.spaced_rune,
    symbol: entry.symbol || '¤',
    block,
    txIndex,
    confirmations: entry.confirmations,
    divisibility: entry.divisibility,
    premine: formatAmount(entry.premine, entry.divisibility),
    mints: entry.mints.toString(),
    burned: formatAmount(entry.burned, entry.divisibility),
    turbo: entry.turbo,
    timestamp: new Date(Number(entry.timestamp) * 1000),
    etching: entry.etching,
    terms: entry.terms
      ? {
          amount: entry.terms.amount
            ? formatAmount(entry.terms.amount, entry.divisibility)
            : null,
          cap: entry.terms.cap ? entry.terms.cap.toString() : null,
          heightStart: entry.terms.height[0] ? Number(entry.terms.height[0]) : null,
          heightEnd: entry.terms.height[1] ? Number(entry.terms.height[1]) : null,
          offsetStart: entry.terms.offset[0] ? Number(entry.terms.offset[0]) : null,
          offsetEnd: entry.terms.offset[1] ? Number(entry.terms.offset[1]) : null,
        }
      : null,
  };
}

/**
 * Format a rune balance for display
 */
export function formatRuneBalance(balance: RuneBalance): FormattedRuneBalance {
  return {
    runeId: balance.rune_id,
    amount: formatAmount(balance.amount, balance.divisibility),
    symbol: balance.symbol || '¤',
    divisibility: balance.divisibility,
    confirmations: balance.confirmations,
  };
}

/**
 * Format amount with divisibility
 */
function formatAmount(amount: bigint, divisibility: number): string {
  const value = Number(amount) / Math.pow(10, divisibility);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: divisibility,
  });
}

/**
 * Parse rune ID to block and tx index
 */
export function parseRuneId(runeId: string): { block: number; txIndex: number } {
  const [block, txIndex] = runeId.split(':').map(Number);
  return { block, txIndex };
}

/**
 * Get the canister ID being used
 */
export function getRunesIndexerCanisterId(): string {
  return CANISTER_ID;
}

/**
 * Check if using mainnet indexer
 */
export function isMainnetIndexer(): boolean {
  return IS_MAINNET;
}
