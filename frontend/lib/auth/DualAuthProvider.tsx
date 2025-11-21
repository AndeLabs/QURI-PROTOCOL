'use client';

/**
 * Dual Authentication Provider
 * Unified context for ICP (Internet Identity) and Bitcoin (SIWB) authentication
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';
import type {
  DualAuthContextType,
  ICPAuthState,
  BitcoinAuthState,
  AuthMethod,
  BitcoinWalletType,
  AuthConfig,
} from './types';
import { DEFAULT_AUTH_CONFIG } from './types';
import { getICPAuthProvider } from './ICPAuthProvider';
import { getBitcoinAuthProvider } from './BitcoinAuthProvider';
import {
  savePreferredAuthMethod,
  getPreferredAuthMethod,
} from './utils/authStorage';
import { logger } from '@/lib/logger';

// Default states
const defaultICPState: ICPAuthState = {
  isAuthenticated: false,
  principal: null,
  identity: null,
};

const defaultBitcoinState: BitcoinAuthState = {
  isAuthenticated: false,
  address: null,
  publicKey: null,
  wallet: null,
  network: 'mainnet',
  delegatedIdentity: null,
};

const DualAuthContext = createContext<DualAuthContextType | undefined>(undefined);

interface DualAuthProviderProps {
  children: ReactNode;
  config?: Partial<AuthConfig>;
  siwbCanisterId?: string;
}

export function DualAuthProvider({
  children,
  config,
  siwbCanisterId,
}: DualAuthProviderProps) {
  const mergedConfig = { ...DEFAULT_AUTH_CONFIG, ...config };

  // State
  const [icp, setICP] = useState<ICPAuthState>(defaultICPState);
  const [bitcoin, setBitcoin] = useState<BitcoinAuthState>(defaultBitcoinState);
  const [isLoading, setIsLoading] = useState(true);

  // Get providers
  const icpProvider = getICPAuthProvider(mergedConfig);
  const bitcoinProvider = siwbCanisterId
    ? getBitcoinAuthProvider(siwbCanisterId, mergedConfig)
    : null;

  // Determine auth method
  const authMethod: AuthMethod = (() => {
    if (icp.isAuthenticated && bitcoin.isAuthenticated) return 'dual';
    if (icp.isAuthenticated) return 'icp';
    if (bitcoin.isAuthenticated) return 'bitcoin';
    return 'none';
  })();

  const isConnected = icp.isAuthenticated || bitcoin.isAuthenticated;

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);

        // Check ICP auth
        const icpState = await icpProvider.getState();
        setICP(icpState);

        if (icpState.isAuthenticated) {
          // Make sure agent is initialized with identity
          await icpProvider.getAgent(true);
          logger.info('ICP auth restored', {
            principal: icpState.principal?.toText(),
          });
        }

        // Check Bitcoin auth (if configured)
        if (bitcoinProvider) {
          const btcState = await bitcoinProvider.getState();
          setBitcoin(btcState);

          if (btcState.isAuthenticated) {
            logger.info('Bitcoin auth restored', {
              address: btcState.address,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to initialize auth', error instanceof Error ? error : undefined);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // ICP connect
  const connectICP = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      logger.info('Connecting to Internet Identity...');

      const success = await icpProvider.connect();

      if (success) {
        const state = await icpProvider.getState();
        setICP(state);
        savePreferredAuthMethod('icp');
        logger.info('ICP connected', {
          principal: state.principal?.toText(),
        });
        return true;
      }

      return false;
    } catch (error) {
      logger.error('ICP connection failed', error instanceof Error ? error : undefined);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [icpProvider]);

  // ICP disconnect
  const disconnectICP = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await icpProvider.disconnect();
      setICP(defaultICPState);
      logger.info('ICP disconnected');
    } catch (error) {
      logger.error('ICP disconnect failed', error instanceof Error ? error : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [icpProvider]);

  // Bitcoin connect
  const connectBitcoin = useCallback(
    async (wallet: BitcoinWalletType = 'xverse'): Promise<boolean> => {
      if (!bitcoinProvider) {
        logger.error('Bitcoin auth not configured - missing SIWB canister ID');
        return false;
      }

      try {
        setIsLoading(true);
        logger.info('Connecting Bitcoin wallet...', { wallet });

        const success = await bitcoinProvider.connect(wallet);

        if (success) {
          const state = await bitcoinProvider.getState();
          setBitcoin(state);
          savePreferredAuthMethod('bitcoin');
          logger.info('Bitcoin connected', {
            address: state.address,
          });
          return true;
        }

        return false;
      } catch (error) {
        logger.error('Bitcoin connection failed', error instanceof Error ? error : undefined);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [bitcoinProvider]
  );

  // Bitcoin disconnect
  const disconnectBitcoin = useCallback(async (): Promise<void> => {
    if (!bitcoinProvider) return;

    try {
      setIsLoading(true);
      await bitcoinProvider.disconnect();
      setBitcoin(defaultBitcoinState);
      logger.info('Bitcoin disconnected');
    } catch (error) {
      logger.error('Bitcoin disconnect failed', error instanceof Error ? error : undefined);
    } finally {
      setIsLoading(false);
    }
  }, [bitcoinProvider]);

  // Disconnect all
  const disconnect = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await Promise.all([
      icp.isAuthenticated ? disconnectICP() : Promise.resolve(),
      bitcoin.isAuthenticated ? disconnectBitcoin() : Promise.resolve(),
    ]);
    savePreferredAuthMethod('none');
    setIsLoading(false);
  }, [icp.isAuthenticated, bitcoin.isAuthenticated, disconnectICP, disconnectBitcoin]);

  // Get primary principal (prefers ICP over Bitcoin)
  const getPrimaryPrincipal = useCallback((): Principal | null => {
    if (icp.principal) return icp.principal;
    if (bitcoin.delegatedIdentity) return bitcoin.delegatedIdentity.getPrincipal();
    return null;
  }, [icp.principal, bitcoin.delegatedIdentity]);

  // Get primary identity
  const getPrimaryIdentity = useCallback((): Identity | null => {
    if (icp.identity) return icp.identity;
    if (bitcoin.delegatedIdentity) return bitcoin.delegatedIdentity;
    return null;
  }, [icp.identity, bitcoin.delegatedIdentity]);

  // Get Bitcoin address
  const getBitcoinAddress = useCallback((): string | null => {
    return bitcoin.address;
  }, [bitcoin.address]);

  const value: DualAuthContextType = {
    icp,
    bitcoin,
    isConnected,
    isLoading,
    authMethod,
    connectICP,
    disconnectICP,
    connectBitcoin,
    disconnectBitcoin,
    disconnect,
    getPrimaryPrincipal,
    getPrimaryIdentity,
    getBitcoinAddress,
  };

  return (
    <DualAuthContext.Provider value={value}>{children}</DualAuthContext.Provider>
  );
}

/**
 * Hook to access dual auth context
 */
export function useDualAuth(): DualAuthContextType {
  const context = useContext(DualAuthContext);
  if (context === undefined) {
    throw new Error('useDualAuth must be used within a DualAuthProvider');
  }
  return context;
}

/**
 * Hook for ICP-specific auth operations
 */
export function useICPAuth() {
  const { icp, connectICP, disconnectICP, isLoading } = useDualAuth();
  return {
    ...icp,
    connect: connectICP,
    disconnect: disconnectICP,
    isLoading,
  };
}

/**
 * Hook for Bitcoin-specific auth operations
 */
export function useBitcoinAuth() {
  const { bitcoin, connectBitcoin, disconnectBitcoin, isLoading } = useDualAuth();
  return {
    ...bitcoin,
    connect: connectBitcoin,
    disconnect: disconnectBitcoin,
    isLoading,
  };
}
