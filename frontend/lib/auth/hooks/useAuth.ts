/**
 * Main authentication hook
 * Provides unified access to both ICP and Bitcoin auth
 */

import { useMemo } from 'react';
import { useDualAuth } from '../DualAuthProvider';

/**
 * Unified auth hook that provides the most commonly needed auth data
 */
export function useAuth() {
  const auth = useDualAuth();

  return useMemo(
    () => ({
      // Connection state
      isConnected: auth.isConnected,
      isLoading: auth.isLoading,
      authMethod: auth.authMethod,

      // Primary identifiers
      principal: auth.getPrimaryPrincipal(),
      identity: auth.getPrimaryIdentity(),
      bitcoinAddress: auth.getBitcoinAddress(),

      // Detailed state
      icp: auth.icp,
      bitcoin: auth.bitcoin,

      // Actions
      connectICP: auth.connectICP,
      connectBitcoin: auth.connectBitcoin,
      disconnect: auth.disconnect,
    }),
    [auth]
  );
}

/**
 * Hook to check if user has a specific auth method
 */
export function useHasAuth(method: 'icp' | 'bitcoin' | 'any') {
  const { icp, bitcoin } = useDualAuth();

  return useMemo(() => {
    switch (method) {
      case 'icp':
        return icp.isAuthenticated;
      case 'bitcoin':
        return bitcoin.isAuthenticated;
      case 'any':
        return icp.isAuthenticated || bitcoin.isAuthenticated;
    }
  }, [method, icp.isAuthenticated, bitcoin.isAuthenticated]);
}

/**
 * Hook to get principal text for display
 */
export function usePrincipalText(): string | null {
  const { getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  return principal ? principal.toText() : null;
}

/**
 * Hook to get shortened address/principal for display
 */
export function useShortenedIdentifier(): string | null {
  const { bitcoin, getPrimaryPrincipal } = useDualAuth();

  return useMemo(() => {
    // Prefer Bitcoin address if connected
    if (bitcoin.address) {
      const addr = bitcoin.address;
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }

    // Fall back to principal
    const principal = getPrimaryPrincipal();
    if (principal) {
      const text = principal.toText();
      return `${text.slice(0, 8)}...${text.slice(-5)}`;
    }

    return null;
  }, [bitcoin.address, getPrimaryPrincipal]);
}
