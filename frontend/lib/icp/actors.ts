/**
 * Actor factories for all QURI Protocol canisters
 * Provides typed access to canister methods
 */

import { ActorSubclass } from '@dfinity/agent';
import { createActor } from './agent';

// IDL Factories
import { idlFactory as runeEngineIdl } from './idl/rune-engine.idl';
import { idlFactory as bitcoinIntegrationIdl } from './idl/bitcoin-integration.idl';
import { idlFactory as registryIdl } from './idl/registry.idl';
import { idlFactory as identityManagerIdl } from './idl/identity-manager.idl';

// Service Types
import type {
  RuneEngineService,
  BitcoinIntegrationService,
  RegistryService,
  IdentityManagerService,
} from '@/types/canisters';

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
 * Get Rune Engine canister actor
 * Handles complete etching flow with state management
 */
export function getRuneEngineActor(): ActorSubclass<RuneEngineService> {
  const canisterId = validateCanisterId(CANISTER_IDS.runeEngine, 'RUNE_ENGINE');
  return createActor<RuneEngineService>(canisterId, runeEngineIdl);
}

/**
 * Get Bitcoin Integration canister actor
 * Handles UTXO management and transaction operations
 */
export function getBitcoinIntegrationActor(): ActorSubclass<BitcoinIntegrationService> {
  const canisterId = validateCanisterId(CANISTER_IDS.bitcoinIntegration, 'BITCOIN_INTEGRATION');
  return createActor<BitcoinIntegrationService>(canisterId, bitcoinIntegrationIdl);
}

/**
 * Get Registry canister actor
 * Global registry for all Runes with search and analytics
 */
export function getRegistryActor(): ActorSubclass<RegistryService> {
  const canisterId = validateCanisterId(CANISTER_IDS.registry, 'REGISTRY');
  return createActor<RegistryService>(canisterId, registryIdl);
}

/**
 * Get Identity Manager canister actor
 * Session management and permissions
 */
export function getIdentityManagerActor(): ActorSubclass<IdentityManagerService> {
  const canisterId = validateCanisterId(CANISTER_IDS.identityManager, 'IDENTITY_MANAGER');
  return createActor<IdentityManagerService>(canisterId, identityManagerIdl);
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
