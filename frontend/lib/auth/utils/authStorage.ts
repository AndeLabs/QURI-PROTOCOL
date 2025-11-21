/**
 * Authentication Storage Utilities
 * Handles persistent storage for auth state
 */

import type { AuthMethod, BitcoinWalletType } from '../types';
import { AUTH_STORAGE_KEYS } from '../types';

/**
 * Stored Bitcoin auth data
 */
interface StoredBitcoinAuth {
  address: string;
  publicKey: string;
  wallet: BitcoinWalletType;
  timestamp: number;
}

/**
 * Check if we're in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Save Bitcoin auth data to storage
 */
export function saveBitcoinAuth(data: StoredBitcoinAuth): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.BITCOIN_AUTH, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save Bitcoin auth:', error);
  }
}

/**
 * Get Bitcoin auth data from storage
 */
export function getBitcoinAuth(): StoredBitcoinAuth | null {
  if (!isBrowser()) return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEYS.BITCOIN_AUTH);
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredBitcoinAuth;

    // Check if data is still valid (24 hour expiry for stored data)
    const dayInMs = 24 * 60 * 60 * 1000;
    if (Date.now() - data.timestamp > dayInMs) {
      clearBitcoinAuth();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to get Bitcoin auth:', error);
    return null;
  }
}

/**
 * Clear Bitcoin auth data from storage
 */
export function clearBitcoinAuth(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.BITCOIN_AUTH);
  } catch (error) {
    console.error('Failed to clear Bitcoin auth:', error);
  }
}

/**
 * Save preferred auth method
 */
export function savePreferredAuthMethod(method: AuthMethod): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.PREFERRED_AUTH_METHOD, method);
  } catch (error) {
    console.error('Failed to save preferred auth method:', error);
  }
}

/**
 * Get preferred auth method
 */
export function getPreferredAuthMethod(): AuthMethod {
  if (!isBrowser()) return 'none';

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEYS.PREFERRED_AUTH_METHOD);
    if (stored && ['icp', 'bitcoin', 'dual', 'none'].includes(stored)) {
      return stored as AuthMethod;
    }
    return 'none';
  } catch {
    return 'none';
  }
}

/**
 * Save last used wallet
 */
export function saveLastWallet(wallet: BitcoinWalletType): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.LAST_WALLET, wallet);
  } catch (error) {
    console.error('Failed to save last wallet:', error);
  }
}

/**
 * Get last used wallet
 */
export function getLastWallet(): BitcoinWalletType | null {
  if (!isBrowser()) return null;

  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEYS.LAST_WALLET);
    if (stored) {
      return stored as BitcoinWalletType;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear all auth storage
 */
export function clearAllAuthStorage(): void {
  if (!isBrowser()) return;

  try {
    Object.values(AUTH_STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear auth storage:', error);
  }
}

/**
 * Check if user has any stored auth
 */
export function hasStoredAuth(): boolean {
  if (!isBrowser()) return false;

  const preferredMethod = getPreferredAuthMethod();
  const bitcoinAuth = getBitcoinAuth();

  return preferredMethod !== 'none' || bitcoinAuth !== null;
}
