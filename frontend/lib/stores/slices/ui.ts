/**
 * UI Slice
 * Manages UI state like modals, sidebar, theme
 */

import { StateCreator } from 'zustand';

export interface UISlice {
  // State
  sidebarOpen: boolean;
  walletModalOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // Actions
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const createUISlice: StateCreator<
  UISlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  UISlice
> = (set) => ({
  // Initial state
  sidebarOpen: true,
  walletModalOpen: false,
  theme: 'light',

  // Actions
  toggleSidebar: () =>
    set(
      (state) => ({ sidebarOpen: !state.sidebarOpen }),
      undefined,
      'ui/toggleSidebar'
    ),

  setSidebarOpen: (open) =>
    set(
      { sidebarOpen: open },
      undefined,
      'ui/setSidebarOpen'
    ),

  openWalletModal: () =>
    set(
      { walletModalOpen: true },
      undefined,
      'ui/openWalletModal'
    ),

  closeWalletModal: () =>
    set(
      { walletModalOpen: false },
      undefined,
      'ui/closeWalletModal'
    ),

  setTheme: (theme) =>
    set(
      { theme },
      undefined,
      'ui/setTheme'
    ),
});
