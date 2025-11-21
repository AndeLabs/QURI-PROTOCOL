/**
 * Hiro BRC-20 API Service
 * Endpoints for BRC-20 Tokens
 */

import { hiroClient } from '../client';
import type {
  BRC20Token,
  BRC20TokenDetails,
  BRC20Holder,
  BRC20Balance,
  BRC20Activity,
  BRC20Filters,
  PaginatedResponse,
  PaginationParams,
} from './types';

export const brc20Api = {
  // ============================================
  // Tokens
  // ============================================

  /**
   * Get a list of BRC-20 tokens
   */
  getTokens: async (params?: BRC20Filters) => {
    const { data } = await hiroClient.get<PaginatedResponse<BRC20Token>>(
      '/ordinals/v1/brc-20/tokens',
      { params }
    );
    return data;
  },

  /**
   * Get details for a specific BRC-20 token
   */
  getToken: async (ticker: string) => {
    const { data } = await hiroClient.get<{ token: BRC20TokenDetails }>(
      `/ordinals/v1/brc-20/tokens/${encodeURIComponent(ticker)}`
    );
    return data.token;
  },

  // ============================================
  // Holders
  // ============================================

  /**
   * Get holders of a BRC-20 token
   */
  getTokenHolders: async (
    ticker: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<BRC20Holder>>(
      `/ordinals/v1/brc-20/tokens/${encodeURIComponent(ticker)}/holders`,
      { params }
    );
    return data;
  },

  // ============================================
  // Balances
  // ============================================

  /**
   * Get all BRC-20 balances for an address
   */
  getAddressBalances: async (
    address: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<BRC20Balance>>(
      `/ordinals/v1/brc-20/balances/${address}`,
      { params }
    );
    return data;
  },

  // ============================================
  // Activity
  // ============================================

  /**
   * Get BRC-20 activity with filters
   */
  getActivity: async (params?: PaginationParams & {
    ticker?: string;
    block_height?: number;
    address?: string;
    operation?: 'deploy' | 'mint' | 'transfer' | 'transfer_send';
  }) => {
    const { data } = await hiroClient.get<PaginatedResponse<BRC20Activity>>(
      '/ordinals/v1/brc-20/activity',
      { params }
    );
    return data;
  },

  /**
   * Get activity for a specific token
   */
  getTokenActivity: async (
    ticker: string,
    params?: PaginationParams
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<BRC20Activity>>(
      `/ordinals/v1/brc-20/tokens/${encodeURIComponent(ticker)}/activity`,
      { params }
    );
    return data;
  },
};
