/**
 * Authentication Types for Dual Auth System
 * Supports both Internet Identity (ICP) and Sign-in with Bitcoin (SIWB)
 */

import { Principal } from '@dfinity/principal';
import { Identity } from '@dfinity/agent';

// Supported Bitcoin wallet types
export type BitcoinWalletType = 'unisat' | 'xverse' | 'leather' | 'okx' | 'phantom';

// Authentication methods
export type AuthMethod = 'icp' | 'bitcoin' | 'dual' | 'none';

// Bitcoin network types
export type BitcoinNetwork = 'mainnet' | 'testnet' | 'signet';

/**
 * Base authentication provider interface
 */
export interface AuthProvider {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  isAuthenticated(): Promise<boolean>;
  getIdentity(): Identity | null;
}

/**
 * ICP-specific authentication state
 */
export interface ICPAuthState {
  isAuthenticated: boolean;
  principal: Principal | null;
  identity: Identity | null;
}

/**
 * Bitcoin-specific authentication state
 */
export interface BitcoinAuthState {
  isAuthenticated: boolean;
  address: string | null;
  publicKey: string | null;
  wallet: BitcoinWalletType | null;
  network: BitcoinNetwork;
  // Delegated identity for ICP canister calls
  delegatedIdentity: Identity | null;
}

/**
 * Unified dual authentication context type
 */
export interface DualAuthContextType {
  // Connection states
  icp: ICPAuthState;
  bitcoin: BitcoinAuthState;

  // Combined state
  isConnected: boolean;
  isLoading: boolean;
  authMethod: AuthMethod;

  // ICP actions
  connectICP: () => Promise<boolean>;
  disconnectICP: () => Promise<void>;

  // Bitcoin actions
  connectBitcoin: (wallet?: BitcoinWalletType) => Promise<boolean>;
  disconnectBitcoin: () => Promise<void>;

  // Unified actions
  disconnect: () => Promise<void>;

  // Utility functions
  getPrimaryPrincipal: () => Principal | null;
  getPrimaryIdentity: () => Identity | null;
  getBitcoinAddress: () => string | null;
}

/**
 * Bitcoin wallet provider interface
 */
export interface BitcoinWalletProvider {
  name: BitcoinWalletType;
  displayName: string;
  icon: string;
  isInstalled: () => boolean;
  connect: () => Promise<{
    address: string;
    publicKey: string;
  }>;
  signMessage: (message: string) => Promise<string>;
  signPsbt: (psbt: string) => Promise<string>;
  disconnect: () => Promise<void>;
}

/**
 * SIWB (Sign-in with Bitcoin) delegation result
 */
export interface SIWBDelegation {
  identity: Identity;
  principal: Principal;
  expiration: bigint;
}

/**
 * Auth storage keys
 */
export const AUTH_STORAGE_KEYS = {
  ICP_DELEGATION: 'quri_icp_delegation',
  BITCOIN_AUTH: 'quri_bitcoin_auth',
  PREFERRED_AUTH_METHOD: 'quri_preferred_auth',
  LAST_WALLET: 'quri_last_wallet',
} as const;

/**
 * Auth event types for event bus
 */
export type AuthEventType =
  | 'icp:connected'
  | 'icp:disconnected'
  | 'bitcoin:connected'
  | 'bitcoin:disconnected'
  | 'auth:error'
  | 'auth:loading';

export interface AuthEvent {
  type: AuthEventType;
  payload?: unknown;
  timestamp: number;
}

/**
 * Auth error types
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export type AuthErrorCode =
  | 'WALLET_NOT_FOUND'
  | 'USER_REJECTED'
  | 'NETWORK_ERROR'
  | 'DELEGATION_EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'POPUP_BLOCKED'
  | 'TIMEOUT'
  | 'UNKNOWN';

/**
 * Wallet detection utilities
 */
export interface WalletDetectionResult {
  wallet: BitcoinWalletType;
  isInstalled: boolean;
  version?: string;
}

/**
 * Configuration for auth providers
 */
export interface AuthConfig {
  icHost: string;
  iiCanisterId?: string;
  siwbCanisterId?: string;
  network: BitcoinNetwork;
  sessionDuration?: bigint;
  autoConnect?: boolean;
}

/**
 * Default auth configuration
 */
export const DEFAULT_AUTH_CONFIG: AuthConfig = {
  icHost: process.env.NEXT_PUBLIC_IC_HOST || 'https://ic0.app',
  network: 'mainnet',
  sessionDuration: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
  autoConnect: true,
};
