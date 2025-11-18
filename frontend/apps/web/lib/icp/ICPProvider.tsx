'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { getAgent, login, logout, isAuthenticated, getPrincipal } from './agent';
import { logger } from '@/lib/logger';

interface ICPContextType {
  isConnected: boolean;
  principal: Principal | null;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  isLoading: boolean;
}

const ICPContext = createContext<ICPContextType | undefined>(undefined);

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
      
      // The login function now handles auto-retry with multiple strategies
      const success = await login();

      if (success) {
        const userPrincipal = await getPrincipal();
        setPrincipal(userPrincipal);
        setIsConnected(true);
        logger.info('✅ User connected successfully', {
          principal: userPrincipal?.toText(),
        });
      } else {
        logger.warn('❌ User connection cancelled or all login strategies failed');
        // Connection failed, but don't show error to user if they cancelled
      }

      return success;
    } catch (error) {
      logger.error('💥 Connection error', error instanceof Error ? error : undefined);
      return false;
    } finally {
      setIsLoading(false);
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

export function useICP() {
  const context = useContext(ICPContext);
  if (context === undefined) {
    throw new Error('useICP must be used within an ICPProvider');
  }
  return context;
}
