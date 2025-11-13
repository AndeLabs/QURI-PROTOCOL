import { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Define canister IDs (to be configured in production)
const CANISTER_IDS = {
  dex: process.env.REACT_APP_DEX_CANISTER_ID || '',
  bridge: process.env.REACT_APP_BRIDGE_CANISTER_ID || '',
  wrunes_ledger: process.env.REACT_APP_WRUNES_LEDGER_CANISTER_ID || '',
};

// IDL factory types (will be generated from Candid)
type IDLFactory = any;

interface UseActorReturn {
  actor: any;
  loading: boolean;
  error: Error | null;
}

/**
 * Custom hook to create and manage ICP canister actors
 *
 * @param canisterName - Name of the canister ('dex', 'bridge', 'wrunes_ledger')
 * @returns Actor instance, loading state, and error state
 *
 * @example
 * ```tsx
 * const { actor, loading, error } = useActor('dex');
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 *
 * // Use actor to call canister methods
 * const pools = await actor.get_all_pools();
 * ```
 */
export function useActor(canisterName: keyof typeof CANISTER_IDS): UseActorReturn {
  const [actor, setActor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initActor = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get canister ID
        const canisterId = CANISTER_IDS[canisterName];
        if (!canisterId) {
          throw new Error(`Canister ID not configured for: ${canisterName}`);
        }

        // Create agent
        const host = process.env.REACT_APP_IC_HOST || 'https://ic0.app';
        const agent = new HttpAgent({ host });

        // For local development, fetch root key
        if (process.env.NODE_ENV === 'development') {
          await agent.fetchRootKey();
        }

        // TODO: Import actual IDL factory for each canister from generated declarations
        // These should be generated from Candid files using dfx
        // Example:
        // import { idlFactory as dexIdlFactory } from '../declarations/dex';
        // import { idlFactory as bridgeIdlFactory } from '../declarations/bridge';
        // import { idlFactory as wrunesLedgerIdlFactory } from '../declarations/wrunes_ledger';
        //
        // const idlFactories = {
        //   dex: dexIdlFactory,
        //   bridge: bridgeIdlFactory,
        //   wrunes_ledger: wrunesLedgerIdlFactory,
        // };
        // const idlFactory = idlFactories[canisterName];

        // Placeholder - will not work until real IDL factories are imported
        // Uncomment and configure once canisters are deployed:
        // const actorInstance = Actor.createActor(idlFactory, {
        //   agent,
        //   canisterId: Principal.fromText(canisterId),
        // });
        // setActor(actorInstance);

        throw new Error('IDL factories not yet configured. Please deploy canisters and generate declarations.');
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        console.error(`Failed to initialize ${canisterName} actor:`, err);
      } finally {
        setLoading(false);
      }
    };

    initActor();
  }, [canisterName]);

  return { actor, loading, error };
}

/**
 * Get authenticated actor with Internet Identity
 *
 * @param canisterName - Name of the canister
 * @param identity - User's Internet Identity
 * @returns Authenticated actor instance
 */
export async function getAuthenticatedActor(
  canisterName: keyof typeof CANISTER_IDS,
  identity: any
): Promise<any> {
  const canisterId = CANISTER_IDS[canisterName];
  if (!canisterId) {
    throw new Error(`Canister ID not configured for: ${canisterName}`);
  }

  const host = process.env.REACT_APP_IC_HOST || 'https://ic0.app';
  const agent = new HttpAgent({ host, identity });

  if (process.env.NODE_ENV === 'development') {
    await agent.fetchRootKey();
  }

  // TODO: Import IDL factory
  const idlFactory: IDLFactory = ({ IDL }: any) => {
    return IDL.Service({});
  };

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

/**
 * Batch call multiple canister methods
 *
 * @param actor - Actor instance
 * @param calls - Array of method calls [methodName, args]
 * @returns Array of results
 */
export async function batchCall(
  actor: any,
  calls: [string, any[]][]
): Promise<any[]> {
  return Promise.all(
    calls.map(([method, args]) => actor[method](...args))
  );
}

/**
 * Poll canister method until condition is met
 *
 * @param actor - Actor instance
 * @param method - Method name to call
 * @param args - Method arguments
 * @param condition - Condition function to check result
 * @param interval - Polling interval in milliseconds
 * @param maxAttempts - Maximum number of polling attempts
 * @returns Result when condition is met
 */
export async function pollUntil(
  actor: any,
  method: string,
  args: any[],
  condition: (result: any) => boolean,
  interval: number = 1000,
  maxAttempts: number = 30
): Promise<any> {
  for (let i = 0; i < maxAttempts; i++) {
    const result = await actor[method](...args);
    if (condition(result)) {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error('Polling timeout');
}

export default useActor;
