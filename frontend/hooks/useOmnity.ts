/**
 * useOmnity Hook
 *
 * Provides access to Omnity Runes Indexer for real-time rune data.
 * Uses inter-canister calls which are more reliable than HTTP outcalls.
 *
 * Use cases:
 * - Get real-time rune data by ID or name
 * - Query rune balances for UTXOs
 * - Get latest indexed block
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { Actor, HttpAgent } from '@dfinity/agent';
import {
  idlFactory,
  OMNITY_RUNES_CANISTER_ID,
  type OmnityRuneEntry,
  type OmnityRuneBalance,
  type OmnityGetEtchingResult,
} from '@/lib/icp/idl/omnity-runes.idl';

// Singleton actor instance
let omnityActor: any = null;

async function getOmnityActor() {
  if (omnityActor) return omnityActor;

  const agent = new HttpAgent({
    host: 'https://icp0.io',
  });

  omnityActor = Actor.createActor(idlFactory, {
    agent,
    canisterId: OMNITY_RUNES_CANISTER_ID,
  });

  return omnityActor;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Get rune by ID (e.g., "840000:846")
 */
export function useOmnityRune(runeId: string | undefined) {
  return useQuery({
    queryKey: ['omnity', 'rune', runeId],
    queryFn: async (): Promise<OmnityRuneEntry | null> => {
      if (!runeId) return null;

      const actor = await getOmnityActor();
      const result = await actor.get_rune_by_id(runeId);

      return result.length > 0 ? result[0] : null;
    },
    enabled: !!runeId,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
  });
}

/**
 * Get rune by spaced name (e.g., "HOPE•YOU•GET•RICH")
 */
export function useOmnityRuneByName(spacedName: string | undefined) {
  return useQuery({
    queryKey: ['omnity', 'rune', 'name', spacedName],
    queryFn: async (): Promise<OmnityRuneEntry | null> => {
      if (!spacedName) return null;

      const actor = await getOmnityActor();
      const result = await actor.get_rune(spacedName);

      return result.length > 0 ? result[0] : null;
    },
    enabled: !!spacedName,
    staleTime: 60000,
    gcTime: 300000,
  });
}

/**
 * Get multiple runes by IDs (batched)
 */
export function useOmnityRunes(runeIds: string[]) {
  return useQueries({
    queries: runeIds.map((id) => ({
      queryKey: ['omnity', 'rune', id],
      queryFn: async (): Promise<OmnityRuneEntry | null> => {
        const actor = await getOmnityActor();
        const result = await actor.get_rune_by_id(id);
        return result.length > 0 ? result[0] : null;
      },
      staleTime: 60000,
      gcTime: 300000,
    })),
  });
}

/**
 * Get rune_id from etching transaction
 */
export function useOmnityEtching(txid: string | undefined) {
  return useQuery({
    queryKey: ['omnity', 'etching', txid],
    queryFn: async (): Promise<OmnityGetEtchingResult | null> => {
      if (!txid) return null;

      const actor = await getOmnityActor();
      const result = await actor.get_etching(txid);

      return result.length > 0 ? result[0] : null;
    },
    enabled: !!txid,
    staleTime: 300000, // 5 minutes (etchings don't change)
    gcTime: 600000,
  });
}

/**
 * Get latest indexed block
 */
export function useOmnityLatestBlock() {
  return useQuery({
    queryKey: ['omnity', 'latest-block'],
    queryFn: async (): Promise<{ height: number; hash: string }> => {
      const actor = await getOmnityActor();
      const [height, hash] = await actor.get_latest_block();

      return { height, hash };
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Get rune balances for UTXOs
 * @param outpoints Array of "txid:vout" strings
 */
export function useOmnityBalances(outpoints: string[]) {
  return useQuery({
    queryKey: ['omnity', 'balances', outpoints],
    queryFn: async (): Promise<Map<string, OmnityRuneBalance[]>> => {
      if (outpoints.length === 0) return new Map();

      const actor = await getOmnityActor();
      const result = await actor.get_rune_balances_for_outputs(outpoints);

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      // Convert to Map for easier access
      const balanceMap = new Map<string, OmnityRuneBalance[]>();
      for (const [outpoint, balances] of result.Ok) {
        balanceMap.set(outpoint, balances);
      }

      return balanceMap;
    },
    enabled: outpoints.length > 0,
    staleTime: 30000,
    gcTime: 120000,
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format rune amount with divisibility
 */
export function formatOmnityAmount(amount: bigint, divisibility: number): string {
  if (divisibility === 0) {
    return amount.toLocaleString();
  }

  const divisor = BigInt(10 ** divisibility);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  if (fraction === 0n) {
    return whole.toLocaleString();
  }

  const fractionStr = fraction.toString().padStart(divisibility, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');

  return `${whole.toLocaleString()}.${trimmedFraction}`;
}

/**
 * Get symbol from optional field
 */
export function getOmnitySymbol(symbol: [] | [string]): string {
  return symbol.length > 0 && symbol[0] ? symbol[0] : '⧫';
}

/**
 * Convert Omnity rune to our RegistryEntry format
 */
export function omnityToRegistryFormat(rune: OmnityRuneEntry) {
  const [block, tx] = rune.rune_id.split(':');
  const terms = rune.terms.length > 0 ? rune.terms[0] : null;

  return {
    metadata: {
      key: {
        block: BigInt(block),
        tx: parseInt(tx, 10),
      },
      name: rune.spaced_rune.replace(/•/g, ''),
      symbol: getOmnitySymbol(rune.symbol),
      divisibility: rune.divisibility,
      total_supply: rune.supply,
      premine: rune.premine,
      terms: terms ? [{
        amount: terms.amount.length > 0 && terms.amount[0] ? terms.amount[0] : 0n,
        cap: terms.cap.length > 0 && terms.cap[0] ? terms.cap[0] : 0n,
        height_start: terms.height[0] && terms.height[0].length > 0 && terms.height[0][0] ? [terms.height[0][0]] : [],
        height_end: terms.height[1] && terms.height[1].length > 0 && terms.height[1][0] ? [terms.height[1][0]] : [],
        offset_start: terms.offset[0] && terms.offset[0].length > 0 && terms.offset[0][0] ? [terms.offset[0][0]] : [],
        offset_end: terms.offset[1] && terms.offset[1].length > 0 && terms.offset[1][0] ? [terms.offset[1][0]] : [],
      }] as [any] : [],
      creator: 'unknown',
      created_at: rune.timestamp,
    },
    bonding_curve: [],
    trading_volume_24h: 0n,
    holder_count: 0n,
    indexed_at: BigInt(Date.now() * 1000000),
  };
}

export default useOmnityRune;
