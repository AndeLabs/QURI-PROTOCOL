'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Principal } from '@dfinity/principal';
import { getAgent, login, logout, isAuthenticated, getPrincipal } from './agent';

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
        // Initialize agent
        await getAgent();

        // Check if already authenticated
        const authenticated = await isAuthenticated();
        setIsConnected(authenticated);

        if (authenticated) {
          const userPrincipal = await getPrincipal();
          setPrincipal(userPrincipal);
        }
      } catch (error) {
        console.error('Failed to initialize ICP auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const connect = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await login();

      if (success) {
        const userPrincipal = await getPrincipal();
        setPrincipal(userPrincipal);
        setIsConnected(true);
      }

      return success;
    } catch (error) {
      console.error('Connection failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await logout();
      setPrincipal(null);
      setIsConnected(false);
    } catch (error) {
      console.error('Disconnect failed:', error);
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
