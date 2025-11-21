/**
 * ICP Agent utilities
 *
 * This module provides access to the HTTP agent for making canister calls.
 * It uses the ICPAuthProvider to ensure authentication state is shared
 * across the application.
 */

import { HttpAgent, Actor, ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getICPAuthProvider } from '@/lib/auth';

const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'https://ic0.app';

/**
 * Get the HTTP agent for making canister calls
 * Uses the ICPAuthProvider's agent to ensure authentication state is shared
 */
export async function getAgent(forceRecreate = false): Promise<HttpAgent> {
  // Use the ICPAuthProvider's agent - this ensures we share auth state
  const provider = getICPAuthProvider({
    icHost: IC_HOST,
  });

  return provider.getAgent(forceRecreate);
}

/**
 * @deprecated Use useDualAuth().connectICP() instead
 */
export async function login(): Promise<boolean> {
  const provider = getICPAuthProvider({ icHost: IC_HOST });
  return provider.connect();
}

/**
 * @deprecated Use useDualAuth().disconnectICP() instead
 */
export async function logout(): Promise<void> {
  const provider = getICPAuthProvider({ icHost: IC_HOST });
  return provider.disconnect();
}

/**
 * @deprecated Use useDualAuth().icp.isAuthenticated instead
 */
export async function isAuthenticated(): Promise<boolean> {
  const provider = getICPAuthProvider({ icHost: IC_HOST });
  return provider.isAuthenticated();
}

/**
 * @deprecated Use useDualAuth().getPrimaryPrincipal() instead
 */
export async function getPrincipal(): Promise<Principal | null> {
  const provider = getICPAuthProvider({ icHost: IC_HOST });
  return provider.getPrincipal();
}

/**
 * @deprecated Use async getAgent() and Actor.createActor() instead
 */
export function createActor<T>(
  canisterId: string,
  idlFactory: any
): ActorSubclass<T> {
  throw new Error('Use async getAgent() and Actor.createActor() instead. See actors.ts for examples.');
}
