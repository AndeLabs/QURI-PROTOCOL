/**
 * Bitcoin Wallet Detection Utilities
 * Detects installed Bitcoin wallets in the browser
 */

import type { BitcoinWalletType, WalletDetectionResult } from '../types';

// Wallet detection configurations
const WALLET_CONFIGS: Record<
  BitcoinWalletType,
  {
    displayName: string;
    icon: string;
    windowKey: string;
    altKeys?: string[];
  }
> = {
  unisat: {
    displayName: 'UniSat',
    icon: '/wallets/unisat.svg',
    windowKey: 'unisat',
  },
  xverse: {
    displayName: 'Xverse',
    icon: '/wallets/xverse.svg',
    windowKey: 'XverseProviders',
    altKeys: ['BitcoinProvider'],
  },
  leather: {
    displayName: 'Leather',
    icon: '/wallets/leather.svg',
    windowKey: 'LeatherProvider',
    altKeys: ['HiroWalletProvider'],
  },
  okx: {
    displayName: 'OKX Wallet',
    icon: '/wallets/okx.svg',
    windowKey: 'okxwallet',
  },
  phantom: {
    displayName: 'Phantom',
    icon: '/wallets/phantom.svg',
    windowKey: 'phantom',
  },
};

/**
 * Check if a specific wallet is installed
 */
export function isWalletInstalled(wallet: BitcoinWalletType): boolean {
  if (typeof window === 'undefined') return false;

  const config = WALLET_CONFIGS[wallet];
  if (!config) return false;

  // Check main window key
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (win[config.windowKey]) return true;

  // Check alternative keys
  if (config.altKeys) {
    for (const altKey of config.altKeys) {
      if (win[altKey]) return true;
    }
  }

  // Special check for Phantom Bitcoin
  if (wallet === 'phantom' && win.phantom?.bitcoin) return true;

  return false;
}

/**
 * Detect all installed Bitcoin wallets
 */
export function detectInstalledWallets(): WalletDetectionResult[] {
  const results: WalletDetectionResult[] = [];

  for (const wallet of Object.keys(WALLET_CONFIGS) as BitcoinWalletType[]) {
    results.push({
      wallet,
      isInstalled: isWalletInstalled(wallet),
    });
  }

  return results;
}

/**
 * Get installed wallets only
 */
export function getInstalledWallets(): BitcoinWalletType[] {
  return detectInstalledWallets()
    .filter((r) => r.isInstalled)
    .map((r) => r.wallet);
}

/**
 * Get wallet display information
 */
export function getWalletInfo(wallet: BitcoinWalletType) {
  return WALLET_CONFIGS[wallet];
}

/**
 * Get all wallet configurations
 */
export function getAllWalletConfigs() {
  return WALLET_CONFIGS;
}

/**
 * Check if any Bitcoin wallet is installed
 */
export function hasAnyWallet(): boolean {
  return getInstalledWallets().length > 0;
}

/**
 * Get recommended wallet based on availability
 */
export function getRecommendedWallet(): BitcoinWalletType | null {
  const installed = getInstalledWallets();

  // Priority order
  const priority: BitcoinWalletType[] = ['xverse', 'leather', 'unisat', 'okx', 'phantom'];

  for (const wallet of priority) {
    if (installed.includes(wallet)) {
      return wallet;
    }
  }

  return null;
}
