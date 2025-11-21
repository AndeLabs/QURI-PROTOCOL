/**
 * Authentication Module
 * Unified exports for dual auth system (ICP + Bitcoin)
 */

// Types
export * from './types';

// Providers
export { ICPAuthProvider, getICPAuthProvider, resetICPAuthProvider } from './ICPAuthProvider';
export {
  BitcoinAuthProvider,
  getBitcoinAuthProvider,
  resetBitcoinAuthProvider,
} from './BitcoinAuthProvider';

// Context and hooks
export { DualAuthProvider, useDualAuth, useICPAuth, useBitcoinAuth } from './DualAuthProvider';
export { useAuth, useHasAuth, usePrincipalText, useShortenedIdentifier } from './hooks/useAuth';

// Utilities
export {
  isWalletInstalled,
  detectInstalledWallets,
  getInstalledWallets,
  getWalletInfo,
  getAllWalletConfigs,
  hasAnyWallet,
  getRecommendedWallet,
} from './utils/walletDetection';

export {
  saveBitcoinAuth,
  getBitcoinAuth,
  clearBitcoinAuth,
  savePreferredAuthMethod,
  getPreferredAuthMethod,
  saveLastWallet,
  getLastWallet,
  clearAllAuthStorage,
  hasStoredAuth,
} from './utils/authStorage';
