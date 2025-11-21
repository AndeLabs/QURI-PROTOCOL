/**
 * Query Key Factory
 * Centralized query key management for TanStack Query
 * Ensures consistent and type-safe query key generation
 */

import type {
  InscriptionsFilters,
  RunesFilters,
  BRC20Filters,
  PaginationParams,
} from '@/lib/api/hiro/types';

export const queryKeys = {
  // ============================================
  // Ordinals / Inscriptions
  // ============================================
  ordinals: {
    all: ['ordinals'] as const,

    // Lists
    lists: () => [...queryKeys.ordinals.all, 'list'] as const,
    list: (filters?: InscriptionsFilters) =>
      [...queryKeys.ordinals.lists(), filters ?? {}] as const,

    // Details
    details: () => [...queryKeys.ordinals.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.ordinals.details(), id] as const,

    // Transfers
    transfers: (id: string) =>
      [...queryKeys.ordinals.all, 'transfers', id] as const,

    // Content
    content: (id: string) =>
      [...queryKeys.ordinals.all, 'content', id] as const,

    // Stats
    stats: () => [...queryKeys.ordinals.all, 'stats'] as const,

    // Satoshi
    satoshi: (ordinal: number) =>
      [...queryKeys.ordinals.all, 'satoshi', ordinal] as const,
  },

  // ============================================
  // Runes
  // ============================================
  runes: {
    all: ['runes'] as const,

    // Lists
    lists: () => [...queryKeys.runes.all, 'list'] as const,
    list: (filters?: RunesFilters) =>
      [...queryKeys.runes.lists(), filters ?? {}] as const,

    // Details
    details: () => [...queryKeys.runes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.runes.details(), id] as const,

    // Holders
    holders: (id: string) => [...queryKeys.runes.all, 'holders', id] as const,

    // Activities
    activities: () => [...queryKeys.runes.all, 'activities'] as const,
    runeActivities: (id: string) =>
      [...queryKeys.runes.activities(), 'rune', id] as const,
    addressActivities: (address: string) =>
      [...queryKeys.runes.activities(), 'address', address] as const,

    // Balances
    balances: (address: string) =>
      [...queryKeys.runes.all, 'balances', address] as const,
  },

  // ============================================
  // BRC-20
  // ============================================
  brc20: {
    all: ['brc20'] as const,

    // Tokens
    tokens: () => [...queryKeys.brc20.all, 'tokens'] as const,
    tokenList: (filters?: BRC20Filters) =>
      [...queryKeys.brc20.tokens(), filters ?? {}] as const,
    token: (ticker: string) =>
      [...queryKeys.brc20.tokens(), ticker] as const,

    // Holders
    holders: (ticker: string) =>
      [...queryKeys.brc20.all, 'holders', ticker] as const,

    // Balances
    balances: (address: string) =>
      [...queryKeys.brc20.all, 'balances', address] as const,

    // Activity
    activities: () => [...queryKeys.brc20.all, 'activities'] as const,
    tokenActivity: (ticker: string) =>
      [...queryKeys.brc20.activities(), ticker] as const,
  },

  // ============================================
  // Portfolio (combined address data)
  // ============================================
  portfolio: {
    all: ['portfolio'] as const,
    address: (address: string) =>
      [...queryKeys.portfolio.all, address] as const,
    runeBalances: (address: string) =>
      [...queryKeys.portfolio.address(address), 'runes'] as const,
    brc20Balances: (address: string) =>
      [...queryKeys.portfolio.address(address), 'brc20'] as const,
    inscriptions: (address: string) =>
      [...queryKeys.portfolio.address(address), 'inscriptions'] as const,
  },
};

// Type helpers for query key inference
export type QueryKeys = typeof queryKeys;
