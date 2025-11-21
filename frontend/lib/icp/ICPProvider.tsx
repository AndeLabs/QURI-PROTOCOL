'use client';

/**
 * @deprecated This provider is deprecated. Use DualAuthProvider from '@/lib/auth' instead.
 * This file is kept for backward compatibility.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { getAgent, login, logout, isAuthenticated, getPrincipal } from './agent';
import { logger } from '@/lib/logger';
import { useICPAuth } from '@/lib/auth';

interface ICPContextType {
  isConnected: boolean;
  principal: Principal | null;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  isLoading: boolean;
}

const ICPContext = createContext<ICPContextType | undefined>(undefined);

/**
 * @deprecated Use useDualAuth or useICPAuth from '@/lib/auth' instead
 */
export function useICP(): ICPContextType {
  // Try to use new auth system first
  try {
    const auth = useICPAuth();
    return {
      isConnected: auth.isAuthenticated,
      principal: auth.principal,
      connect: auth.connect,
      disconnect: auth.disconnect,
      isLoading: auth.isLoading,
    };
  } catch {
    // Fall back to old context if not in new provider
    const context = useContext(ICPContext);
    if (context === undefined) {
      throw new Error('useICP must be used within an ICPProvider or DualAuthProvider');
    }
    return context;
  }
}

export function ICPProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if already authenticated
        const authenticated = await isAuthenticated();
        
        // Force recreate agent to use correct identity (authenticated or anonymous)
        await getAgent(true);

        setIsConnected(authenticated);

        if (authenticated) {
          const userPrincipal = await getPrincipal();
          setPrincipal(userPrincipal);
          logger.info('ICP authentication restored', {
            principal: userPrincipal?.toText(),
          });
        }
      } catch (error) {
        logger.error('Failed to initialize ICP auth', error instanceof Error ? error : undefined);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const connect = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      logger.info('🔐 Starting Internet Identity login...');

      const success = await login();

      if (success) {
        const userPrincipal = await getPrincipal();
        setPrincipal(userPrincipal);
        setIsConnected(true);
        logger.info('✅ User connected successfully', {
          principal: userPrincipal?.toText(),
        });
        return true;
      } else {
        logger.warn('❌ Login cancelled or failed');
        // Reset loading state immediately when cancelled/failed
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      logger.error('💥 Connection error', error instanceof Error ? error : undefined);
      setIsLoading(false);
      return false;
    } finally {
      // Only set loading to false if we actually succeeded
      // (otherwise it's already set to false in the error handlers above)
      if (isConnected) {
        setIsLoading(false);
      }
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await logout();
      logger.info('User disconnected');
      setPrincipal(null);
      setIsConnected(false);
    } catch (error) {
      logger.error('Disconnect failed', error instanceof Error ? error : undefined);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ICPContext.Provider value={{ isConnected, principal, connect, disconnect, isLoading }}>
      {children}
    </ICPContext.Provider>
  );
}

// Note: useICP is now defined above for backward compatibility
