/**
 * Global Store
 * Combined Zustand store with all slices
 * Uses auto-generating selectors and useShallow for optimization
 */

import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import { createWalletSlice, WalletSlice } from './slices/wallet';
import { createUISlice, UISlice } from './slices/ui';
import { createSettingsSlice, SettingsSlice } from './slices/settings';
import { createSelectors } from './createSelectors';

// Combined store type
export type AppStore = WalletSlice & UISlice & SettingsSlice;

// Create the store with all slices combined
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get, api) => ({
        ...(createWalletSlice as any)(set, get, api),
        ...(createUISlice as any)(set, get, api),
        ...(createSettingsSlice as any)(set, get, api),
      }),
      {
        name: 'quri-app-store',
        storage: createJSONStorage(() => localStorage),
        // Only persist certain fields
        partialize: (state) => ({
          // UI preferences
          sidebarOpen: state.sidebarOpen,
          theme: state.theme,
          // Settings
          slippageTolerance: state.slippageTolerance,
          transactionDeadline: state.transactionDeadline,
          expertMode: state.expertMode,
          currency: state.currency,
          locale: state.locale,
          // Don't persist wallet state (needs re-auth)
        }),
      }
    ),
    {
      name: 'QURI Store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Create store with auto-generated selectors
export const useAppStoreWithSelectors = createSelectors(useAppStore);

// Optimized selector hooks using useShallow to prevent unnecessary re-renders
export const useWallet = () =>
  useAppStore(
    useShallow((state) => ({
      principal: state.principal,
      btcAddress: state.btcAddress,
      isConnected: state.isConnected,
      connectionType: state.connectionType,
      setWallet: state.setWallet,
      setBtcAddress: state.setBtcAddress,
      disconnect: state.disconnect,
      getPrincipalText: state.getPrincipalText,
    }))
  );

export const useUI = () =>
  useAppStore(
    useShallow((state) => ({
      sidebarOpen: state.sidebarOpen,
      walletModalOpen: state.walletModalOpen,
      theme: state.theme,
      toggleSidebar: state.toggleSidebar,
      setSidebarOpen: state.setSidebarOpen,
      openWalletModal: state.openWalletModal,
      closeWalletModal: state.closeWalletModal,
      setTheme: state.setTheme,
    }))
  );

export const useSettings = () =>
  useAppStore(
    useShallow((state) => ({
      slippageTolerance: state.slippageTolerance,
      transactionDeadline: state.transactionDeadline,
      expertMode: state.expertMode,
      currency: state.currency,
      locale: state.locale,
      setSlippage: state.setSlippage,
      setDeadline: state.setDeadline,
      toggleExpertMode: state.toggleExpertMode,
      setCurrency: state.setCurrency,
      setLocale: state.setLocale,
      resetSettings: state.resetSettings,
    }))
  );

// Individual state selectors (for fine-grained subscriptions)
export const useIsConnected = () => useAppStore((state) => state.isConnected);
export const usePrincipal = () => useAppStore((state) => state.principal);
export const useBtcAddress = () => useAppStore((state) => state.btcAddress);
export const useTheme = () => useAppStore((state) => state.theme);
export const useSidebarOpen = () => useAppStore((state) => state.sidebarOpen);
export const useWalletModalOpen = () => useAppStore((state) => state.walletModalOpen);

// Action-only selectors (stable references)
export const useWalletActions = () =>
  useAppStore(
    useShallow((state) => ({
      setWallet: state.setWallet,
      setBtcAddress: state.setBtcAddress,
      disconnect: state.disconnect,
    }))
  );

export const useUIActions = () =>
  useAppStore(
    useShallow((state) => ({
      toggleSidebar: state.toggleSidebar,
      setSidebarOpen: state.setSidebarOpen,
      openWalletModal: state.openWalletModal,
      closeWalletModal: state.closeWalletModal,
      setTheme: state.setTheme,
    }))
  );

export const useSettingsActions = () =>
  useAppStore(
    useShallow((state) => ({
      setSlippage: state.setSlippage,
      setDeadline: state.setDeadline,
      toggleExpertMode: state.toggleExpertMode,
      setCurrency: state.setCurrency,
      setLocale: state.setLocale,
      resetSettings: state.resetSettings,
    }))
  );

// Re-export slice types
export type { WalletSlice } from './slices/wallet';
export type { UISlice } from './slices/ui';
export type { SettingsSlice } from './slices/settings';

// Re-export createSelectors for custom stores
export { createSelectors } from './createSelectors';
