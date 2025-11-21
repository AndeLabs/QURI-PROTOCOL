/**
 * Settings Slice
 * Manages user preferences and settings
 */

import { StateCreator } from 'zustand';

export interface SettingsSlice {
  // State
  slippageTolerance: number; // Percentage (0.5 = 0.5%)
  transactionDeadline: number; // Minutes
  expertMode: boolean;
  currency: 'USD' | 'BTC' | 'ICP';
  locale: string;

  // Actions
  setSlippage: (slippage: number) => void;
  setDeadline: (minutes: number) => void;
  toggleExpertMode: () => void;
  setCurrency: (currency: 'USD' | 'BTC' | 'ICP') => void;
  setLocale: (locale: string) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  slippageTolerance: 0.5,
  transactionDeadline: 20,
  expertMode: false,
  currency: 'USD' as const,
  locale: 'en-US',
};

export const createSettingsSlice: StateCreator<
  SettingsSlice,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  SettingsSlice
> = (set) => ({
  // Initial state
  ...defaultSettings,

  // Actions
  setSlippage: (slippage) =>
    set(
      { slippageTolerance: slippage },
      undefined,
      'settings/setSlippage'
    ),

  setDeadline: (minutes) =>
    set(
      { transactionDeadline: minutes },
      undefined,
      'settings/setDeadline'
    ),

  toggleExpertMode: () =>
    set(
      (state) => ({ expertMode: !state.expertMode }),
      undefined,
      'settings/toggleExpertMode'
    ),

  setCurrency: (currency) =>
    set(
      { currency },
      undefined,
      'settings/setCurrency'
    ),

  setLocale: (locale) =>
    set(
      { locale },
      undefined,
      'settings/setLocale'
    ),

  resetSettings: () =>
    set(
      defaultSettings,
      undefined,
      'settings/reset'
    ),
});
