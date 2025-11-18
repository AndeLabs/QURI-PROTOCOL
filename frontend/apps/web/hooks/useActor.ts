/**
 * Unified hook for accessing any canister actor
 * Use specific hooks (useRuneEngine, useBitcoinIntegration, etc.) for better type safety
 */

import { useMemo } from 'react';
import {
  getRuneEngineActor,
  getBitcoinIntegrationActor,
  getRegistryActor,
  getIdentityManagerActor,
} from '@/lib/icp/actors';
import type {
  RuneEngineService,
  BitcoinIntegrationService,
  RegistryService,
  IdentityManagerService,
} from '@/types/canisters';
import type { ActorSubclass } from '@dfinity/agent';

export type CanisterName = 'rune-engine' | 'bitcoin-integration' | 'registry' | 'identity-manager';

type ActorType<T extends CanisterName> = T extends 'rune-engine'
  ? RuneEngineService
  : T extends 'bitcoin-integration'
  ? BitcoinIntegrationService
  : T extends 'registry'
  ? RegistryService
  : T extends 'identity-manager'
  ? IdentityManagerService
  : never;

/**
 * Get actor for any canister by name
 *
 * @deprecated Use specific hooks instead (useRuneEngine, useBitcoinIntegration, etc.)
 * for better TypeScript support and easier error handling
 *
 * @example
 * ```tsx
 * // ❌ Avoid this
 * const actor = useActor('rune-engine');
 *
 * // ✅ Use this instead
 * const { etchRune, loading, error } = useRuneEngine();
 * ```
 */
export function useActor<T extends CanisterName>(
  canisterName: T
): ActorSubclass<ActorType<T>> {
  return useMemo(() => {
    switch (canisterName) {
      case 'rune-engine':
        return getRuneEngineActor() as ActorSubclass<ActorType<T>>;
      case 'bitcoin-integration':
        return getBitcoinIntegrationActor() as ActorSubclass<ActorType<T>>;
      case 'registry':
        return getRegistryActor() as ActorSubclass<ActorType<T>>;
      case 'identity-manager':
        return getIdentityManagerActor() as ActorSubclass<ActorType<T>>;
      default:
        throw new Error(`Unknown canister: ${canisterName}`);
    }
  }, [canisterName]);
}

/**
 * Get all actors at once
 * Useful for components that need access to multiple canisters
 */
export function useAllActors() {
  return useMemo(
    () => ({
      runeEngine: getRuneEngineActor(),
      bitcoinIntegration: getBitcoinIntegrationActor(),
      registry: getRegistryActor(),
      identityManager: getIdentityManagerActor(),
    }),
    []
  );
}
