#!/usr/bin/env npx ts-node
/**
 * QURI Protocol - Runes Indexer
 *
 * Off-chain indexer that syncs runes from Hiro API to the registry canister.
 * This avoids ICP HTTP outcall limitations and rate limiting issues.
 *
 * Usage:
 *   npx ts-node scripts/runes-indexer.ts
 *   npx ts-node scripts/runes-indexer.ts --full    # Full sync
 *   npx ts-node scripts/runes-indexer.ts --from=0  # Start from offset
 */

import { Actor, HttpAgent } from '@dfinity/agent';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import fetch from 'node-fetch';

// Registry canister interface
const registryIdl = ({ IDL }: { IDL: any }) => {
  const RuneIdentifier = IDL.Record({
    block: IDL.Nat64,
    tx_index: IDL.Nat32,
  });

  const MintTerms = IDL.Record({
    amount: IDL.Nat,
    cap: IDL.Nat,
    height_start: IDL.Opt(IDL.Nat64),
    height_end: IDL.Opt(IDL.Nat64),
  });

  const IndexedRune = IDL.Record({
    id: RuneIdentifier,
    name: IDL.Text,
    symbol: IDL.Text,
    decimals: IDL.Nat8,
    total_supply: IDL.Nat,
    premine: IDL.Nat,
    block_height: IDL.Nat64,
    txid: IDL.Text,
    timestamp: IDL.Nat64,
    etcher: IDL.Text,
    terms: IDL.Opt(MintTerms),
  });

  const IndexerStats = IDL.Record({
    total_runes: IDL.Nat64,
    last_indexed_block: IDL.Nat64,
    total_etchings: IDL.Nat64,
    indexing_errors: IDL.Nat64,
  });

  return IDL.Service({
    store_indexed_rune: IDL.Func([IndexedRune], [IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })], []),
    get_indexer_stats: IDL.Func([], [IndexerStats], ['query']),
    get_index_stats: IDL.Func([], [IDL.Tuple(IDL.Nat64, IDL.Nat64, IDL.Nat64)], ['query']),
  });
};

// Configuration
const CONFIG = {
  REGISTRY_CANISTER_ID: 'pnqje-qiaaa-aaaah-arodq-cai',
  HIRO_API_URL: 'https://api.hiro.so/runes/v1/etchings',
  BATCH_SIZE: 60, // Hiro API limit
  DELAY_MS: 1000, // Delay between batches to avoid rate limiting
  IC_HOST: 'https://icp0.io',
};

// Types
interface HiroRune {
  id: string;
  name: string;
  spaced_name: string;
  number: number;
  divisibility: number;
  symbol: string;
  turbo: boolean;
  mint_terms?: {
    amount: string;
    cap: string;
    height_start?: number;
    height_end?: number;
  };
  supply: {
    current: string;
    minted: string;
    total_mints: string;
    mint_percentage: string;
    mintable: boolean;
    burned: string;
    premine: string;
    total_burns: string;
  };
  location: {
    block_hash: string;
    block_height: number;
    tx_id: string;
    tx_index: number;
    timestamp: number;
  };
}

interface HiroResponse {
  results: HiroRune[];
  total: number;
}

// Helper functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseRuneId(id: string): { block: bigint; tx_index: number } {
  const [block, tx] = id.split(':');
  return {
    block: BigInt(block),
    tx_index: parseInt(tx, 10),
  };
}

function convertHiroRune(hiro: HiroRune): any {
  const { block, tx_index } = parseRuneId(hiro.id);

  return {
    id: { block, tx_index },
    name: hiro.name,
    symbol: hiro.symbol || '⧫',
    decimals: hiro.divisibility,
    total_supply: BigInt(hiro.supply.current || '0'),
    premine: BigInt(hiro.supply.premine || '0'),
    block_height: BigInt(hiro.location.block_height),
    txid: hiro.location.tx_id,
    timestamp: BigInt(hiro.location.timestamp),
    etcher: '', // Hiro API doesn't expose this
    terms: hiro.mint_terms ? [{
      amount: BigInt(hiro.mint_terms.amount || '0'),
      cap: BigInt(hiro.mint_terms.cap || '0'),
      height_start: hiro.mint_terms.height_start ? [BigInt(hiro.mint_terms.height_start)] : [],
      height_end: hiro.mint_terms.height_end ? [BigInt(hiro.mint_terms.height_end)] : [],
    }] : [],
  };
}

async function fetchRunesBatch(offset: number, limit: number): Promise<HiroResponse> {
  const url = `${CONFIG.HIRO_API_URL}?offset=${offset}&limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      console.log('Rate limited, waiting 30 seconds...');
      await sleep(30000);
      return fetchRunesBatch(offset, limit);
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<HiroResponse>;
}

async function createActor() {
  // Create anonymous identity for now (would need proper auth for production)
  const identity = Ed25519KeyIdentity.generate();

  const agent = new HttpAgent({
    host: CONFIG.IC_HOST,
    identity,
    fetch: fetch as any,
  });

  // Fetch root key for local development (remove for mainnet)
  // await agent.fetchRootKey();

  return Actor.createActor(registryIdl, {
    agent,
    canisterId: CONFIG.REGISTRY_CANISTER_ID,
  });
}

async function getStats(actor: any): Promise<{ total: number; indexed: number }> {
  const stats = await actor.get_indexer_stats();
  const [runes, names, symbols] = await actor.get_index_stats();

  return {
    total: Number(stats.total_runes),
    indexed: Number(runes),
  };
}

async function main() {
  console.log('═══════════════════════════════════════════');
  console.log('  QURI Protocol - Runes Indexer');
  console.log('═══════════════════════════════════════════\n');

  // Parse arguments
  const args = process.argv.slice(2);
  const fullSync = args.includes('--full');
  const fromArg = args.find(a => a.startsWith('--from='));
  const startOffset = fromArg ? parseInt(fromArg.split('=')[1], 10) : 0;

  // Create actor
  console.log('Connecting to registry canister...');
  const actor = await createActor();

  // Get current stats
  const initialStats = await getStats(actor);
  console.log(`Current indexed runes: ${initialStats.indexed}`);

  // Get total from Hiro
  console.log('Fetching total runes from Hiro API...');
  const firstBatch = await fetchRunesBatch(0, 1);
  const totalRunes = firstBatch.total;
  console.log(`Total runes available: ${totalRunes}\n`);

  // Determine starting point
  let offset = fullSync ? startOffset : Math.max(startOffset, initialStats.indexed);

  if (offset >= totalRunes) {
    console.log('✓ Index is up to date!');
    return;
  }

  console.log(`Starting sync from offset ${offset}...`);
  console.log(`Batches to process: ${Math.ceil((totalRunes - offset) / CONFIG.BATCH_SIZE)}\n`);

  let indexed = 0;
  let errors = 0;
  const startTime = Date.now();

  while (offset < totalRunes) {
    try {
      // Fetch batch from Hiro
      const batch = await fetchRunesBatch(offset, CONFIG.BATCH_SIZE);

      // Index each rune
      for (const hiro of batch.results) {
        try {
          const rune = convertHiroRune(hiro);
          const result = await actor.store_indexed_rune(rune);

          if ('Err' in result) {
            console.error(`Error indexing ${hiro.name}: ${result.Err}`);
            errors++;
          } else {
            indexed++;
          }
        } catch (err: any) {
          console.error(`Failed to index ${hiro.name}:`, err.message);
          errors++;
        }
      }

      // Progress
      const progress = ((offset + batch.results.length) / totalRunes * 100).toFixed(1);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`Progress: ${offset + batch.results.length}/${totalRunes} (${progress}%) | Indexed: ${indexed} | Errors: ${errors} | Time: ${elapsed}s`);

      offset += CONFIG.BATCH_SIZE;

      // Delay to avoid rate limiting
      if (offset < totalRunes) {
        await sleep(CONFIG.DELAY_MS);
      }

    } catch (err: any) {
      console.error(`Batch error at offset ${offset}:`, err.message);
      errors++;

      // Exponential backoff on errors
      await sleep(5000);
    }
  }

  // Final stats
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const finalStats = await getStats(actor);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Sync Complete!');
  console.log('═══════════════════════════════════════════');
  console.log(`Total indexed: ${finalStats.indexed}`);
  console.log(`New runes: ${indexed}`);
  console.log(`Errors: ${errors}`);
  console.log(`Duration: ${duration}s`);
  console.log('═══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
