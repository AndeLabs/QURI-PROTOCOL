/**
 * Hiro Ordinals API Service
 * Endpoints for Bitcoin Ordinal Inscriptions
 */

import { hiroClient } from '../client';
import type {
  Inscription,
  InscriptionTransfer,
  InscriptionsFilters,
  PaginatedResponse,
  SatoshiInfo,
  InscriptionStats,
  ApiStatus,
} from './types';

export const ordinalsApi = {
  // ============================================
  // Inscriptions
  // ============================================

  /**
   * Get a list of inscriptions with optional filters
   */
  getInscriptions: async (params?: InscriptionsFilters) => {
    const { data } = await hiroClient.get<PaginatedResponse<Inscription>>(
      '/ordinals/v1/inscriptions',
      { params }
    );
    return data;
  },

  /**
   * Get a single inscription by ID
   */
  getInscription: async (id: string) => {
    const { data } = await hiroClient.get<Inscription>(
      `/ordinals/v1/inscriptions/${id}`
    );
    return data;
  },

  /**
   * Get inscription content URL
   */
  getInscriptionContentUrl: (id: string) => {
    return `https://api.hiro.so/ordinals/v1/inscriptions/${id}/content`;
  },

  /**
   * Get inscription transfers history
   */
  getInscriptionTransfers: async (
    id: string,
    params?: { limit?: number; offset?: number }
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<InscriptionTransfer>>(
      `/ordinals/v1/inscriptions/${id}/transfers`,
      { params }
    );
    return data;
  },

  /**
   * Get transfers per block
   */
  getTransfersPerBlock: async (blockHeight: number) => {
    const { data } = await hiroClient.get<PaginatedResponse<InscriptionTransfer>>(
      `/ordinals/v1/inscriptions/transfers`,
      { params: { block: blockHeight } }
    );
    return data;
  },

  // ============================================
  // Satoshis
  // ============================================

  /**
   * Get satoshi ordinal information
   */
  getSatoshi: async (ordinal: number) => {
    const { data } = await hiroClient.get<SatoshiInfo>(
      `/ordinals/v1/sats/${ordinal}`
    );
    return data;
  },

  /**
   * Get inscriptions on a specific satoshi
   */
  getSatoshiInscriptions: async (
    ordinal: number,
    params?: { limit?: number; offset?: number }
  ) => {
    const { data } = await hiroClient.get<PaginatedResponse<Inscription>>(
      `/ordinals/v1/sats/${ordinal}/inscriptions`,
      { params }
    );
    return data;
  },

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get inscription statistics
   */
  getStats: async () => {
    const { data } = await hiroClient.get<InscriptionStats>(
      '/ordinals/v1/stats/inscriptions'
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
    const { data } = await hiroClient.get<ApiStatus>('/ordinals/v1/');
    return data;
  },
};
