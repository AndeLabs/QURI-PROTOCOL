/**
 * Hiro Runes API Service
 * Endpoints for Bitcoin Runes
 */

import { hiroClient } from '../client';
import type {
  RuneEtching,
  RuneHolder,
  RuneActivity,
  RuneBalance,
  RunesFilters,
  PaginatedResponse,
  PaginationParams,
  ApiStatus,
} from './types';

export const runesApi = {
  // ============================================
  // Etchings
  // ============================================

  /**
   * Get a list of rune etchings
   */
  getEtchings: async (params?: RunesFilters) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneEtching>>(
      '/runes/v1/etchings',
      { params }
    );
    return data;
  },

  /**
   * Get a single rune etching by ID or name
   */
  getEtching: async (idOrName: string) => {
    const { data } = await hiroClient.get<RuneEtching>(
      `/runes/v1/etchings/${encodeURIComponent(idOrName)}`
    );
    return data;
  },

  // ============================================
  // Holders
  // ============================================

  /**
   * Get holders of a specific rune
   */
  getHolders: async (
    runeId: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneHolder>>(
      `/runes/v1/etchings/${encodeURIComponent(runeId)}/holders`,
      { params }
    );
    return data;
  },

  // ============================================
  // Balances
  // ============================================

  /**
   * Get all rune balances for an address
   */
  getAddressBalances: async (
    address: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneBalance>>(
      `/runes/v1/addresses/${address}/balances`,
      { params }
    );
    return data;
  },

  /**
   * Get specific rune balance for an address
   */
  getAddressRuneBalance: async (address: string, runeId: string) => {
    const { data } = await hiroClient.get<RuneBalance>(
      `/runes/v1/addresses/${address}/balances/${encodeURIComponent(runeId)}`
    );
    return data;
  },

  // ============================================
  // Activities
  // ============================================

  /**
   * Get all rune activities
   */
  getActivities: async (params?: PaginationParams & {
    address?: string;
    block?: number;
    rune?: string;
    operation?: 'etching' | 'mint' | 'burn' | 'send' | 'receive';
  }) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneActivity>>(
      '/runes/v1/activities',
      { params }
    );
    return data;
  },

  /**
   * Get activities for a specific rune
   */
  getRuneActivities: async (
    runeId: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneActivity>>(
      `/runes/v1/etchings/${encodeURIComponent(runeId)}/activity`,
      { params }
    );
    return data;
  },

  /**
   * Get activities for an address
   */
  getAddressActivities: async (
    address: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneActivity>>(
      `/runes/v1/addresses/${address}/activity`,
      { params }
    );
    return data;
  },

  /**
   * Get activities for a block
   */
  getBlockActivities: async (
    blockHeight: number,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneActivity>>(
      `/runes/v1/blocks/${blockHeight}/activity`,
      { params }
    );
    return data;
  },

  /**
   * Get activities for a transaction
   */
  getTransactionActivities: async (txId: string) => {
    const { data } = await hiroClient.get<PaginatedResponse<RuneActivity>>(
      `/runes/v1/transactions/${txId}/activity`
    );
    return data;
  },

  // ============================================
  // Status
  // ============================================

  /**
   * Get API status
   */
  getStatus: async () => {
    const { data } = await hiroClient.get<ApiStatus>('/runes/v1/');
    return data;
  },
};
