/**
 * Actor factories for all QURI Protocol canisters
 * Provides typed access to canister methods
 */

import { ActorSubclass, Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { createActor, getAgent } from './agent';

// IDL Factories
import { idlFactory as runeEngineIdl } from './idl/rune-engine.idl';
import { idlFactory as bitcoinIntegrationIdl } from './idl/bitcoin-integration.idl';
import { idlFactory as registryIdl } from './idl/registry.idl';
import { idlFactory as identityManagerIdl } from './idl/identity-manager.idl';
import { idlFactory as icpLedgerIdl } from './idl/icp-ledger.idl';
import { idlFactory as cyclesLedgerIdl } from './idl/cycles-ledger.idl';

// Service Types
import type {
  RuneEngineService,
  BitcoinIntegrationService,
  RegistryService,
  IdentityManagerService,
} from '@/types/canisters';

// Helper to create actor with initialized agent
async function createActorWithAgent<T>(
  canisterId: string,
  idlFactory: any
): Promise<ActorSubclass<T>> {
  const agent = await getAgent();
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

// Canister IDs from environment
const CANISTER_IDS = {
  runeEngine: process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID || '',
  bitcoinIntegration: process.env.NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID || '',
  registry: process.env.NEXT_PUBLIC_REGISTRY_CANISTER_ID || '',
  identityManager: process.env.NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID || '',
} as const;

// Validate canister IDs
function validateCanisterId(id: string, name: string): string {
  if (!id) {
    throw new Error(
      `${name} canister ID not configured. Set NEXT_PUBLIC_${name.toUpperCase()}_CANISTER_ID in environment.`
    );
  }
  return id;
}

// ============================================================================
// ACTOR FACTORIES
// ============================================================================

/**
 * Get Rune Engine canister actor (async - ensures agent is initialized)
 * Handles complete etching flow with state management
 */
export async function getRuneEngineActor(): Promise<ActorSubclass<RuneEngineService>> {
  const canisterId = validateCanisterId(CANISTER_IDS.runeEngine, 'RUNE_ENGINE');
  return createActorWithAgent<RuneEngineService>(canisterId, runeEngineIdl);
}

/**
 * Get Bitcoin Integration canister actor (async - ensures agent is initialized)
 * Handles UTXO management and transaction operations
 */
export async function getBitcoinIntegrationActor(): Promise<ActorSubclass<BitcoinIntegrationService>> {
  const canisterId = validateCanisterId(CANISTER_IDS.bitcoinIntegration, 'BITCOIN_INTEGRATION');
  return createActorWithAgent<BitcoinIntegrationService>(canisterId, bitcoinIntegrationIdl);
}

/**
 * Get Registry canister actor (async - ensures agent is initialized)
 * Global registry for all Runes with search and analytics
 */
export async function getRegistryActor(): Promise<ActorSubclass<RegistryService>> {
  const canisterId = validateCanisterId(CANISTER_IDS.registry, 'REGISTRY');
  return createActorWithAgent<RegistryService>(canisterId, registryIdl);
}

/**
 * Get Identity Manager canister actor (async - ensures agent is initialized)
 * Session management and permissions
 */
export async function getIdentityManagerActor(): Promise<ActorSubclass<IdentityManagerService>> {
  const canisterId = validateCanisterId(CANISTER_IDS.identityManager, 'IDENTITY_MANAGER');
  return createActorWithAgent<IdentityManagerService>(canisterId, identityManagerIdl);
}

// ============================================================================
// MAINNET LEDGER ACTORS
// ============================================================================

// Mainnet canister IDs
const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
const CYCLES_LEDGER_CANISTER_ID = 'um5iw-rqaaa-aaaaq-qaaba-cai';

/**
 * Get ICP Ledger canister actor (async - ensures agent is initialized)
 * Query ICP balances using ICRC-1 interface
 */
export async function getICPLedgerActor(): Promise<ActorSubclass<any>> {
  return createActorWithAgent<any>(ICP_LEDGER_CANISTER_ID, icpLedgerIdl);
}

/**
 * Get Cycles Ledger canister actor (async - ensures agent is initialized)
 * Query Cycles balances using ICRC-1 interface
 */
export async function getCyclesLedgerActor(): Promise<ActorSubclass<any>> {
  return createActorWithAgent<any>(CYCLES_LEDGER_CANISTER_ID, cyclesLedgerIdl);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all configured canister IDs
 */
export function getCanisterIds() {
  return CANISTER_IDS;
}

/**
 * Check if all canisters are configured
 */
export function areCanistersConfigured(): boolean {
  return Object.values(CANISTER_IDS).every((id) => id !== '');
}

/**
 * Get missing canister configurations
 */
export function getMissingCanisters(): string[] {
  return Object.entries(CANISTER_IDS)
    .filter(([_, id]) => !id)
    .map(([name]) => name);
}
