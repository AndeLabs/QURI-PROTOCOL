/**
 * Wallet Slice
 * Manages wallet connection state and addresses
 */

import { StateCreator } from 'zustand';
import { Principal } from '@dfinity/principal';

export interface WalletSlice {
  // State
  principal: Principal | null;
  btcAddress: string | null;
  isConnected: boolean;
  connectionType: 'internet-identity' | 'plug' | null;

  // Actions
  setWallet: (principal: Principal, connectionType: 'internet-identity' | 'plug') => void;
  setBtcAddress: (address: string) => void;
  disconnect: () => void;

  // Selectors
  getPrincipalText: () => string | null;
}

export const createWalletSlice: StateCreator<
  WalletSlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  WalletSlice
> = (set, get) => ({
  // Initial state
  principal: null,
  btcAddress: null,
  isConnected: false,
  connectionType: null,

  // Actions
  setWallet: (principal, connectionType) =>
    set(
      {
        principal,
        isConnected: true,
        connectionType,
      },
      undefined,
      'wallet/connect'
    ),

  setBtcAddress: (address) =>
    set(
      { btcAddress: address },
      undefined,
      'wallet/setBtcAddress'
    ),

  disconnect: () =>
    set(
      {
        principal: null,
        btcAddress: null,
        isConnected: false,
        connectionType: null,
      },
      undefined,
      'wallet/disconnect'
    ),

  // Selectors
  getPrincipalText: () => {
    const { principal } = get();
    return principal?.toText() ?? null;
  },
});
