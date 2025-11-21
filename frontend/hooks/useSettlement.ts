'use client';

/**
 * Settlement Hook
 * Manages settlement operations with ICP backend
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRuneEngineActor } from '@/lib/icp/actors';
import { useDualAuth } from '@/lib/auth';
import type {
  SettlementMode,
  SettlementRequest,
  SettlementResult,
  SettlementEstimate,
  FeeEstimates,
  FeeEstimate,
  SettlementStatus,
  SettlementHistoryItem,
} from '@/types/settlement';

// Bitcoin fee API response type
interface MempoolFeeEstimate {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

// Helper functions to format backend enums
function formatSettlementMode(mode: any): SettlementMode {
  if ('Instant' in mode) return 'instant';
  if ('Batched' in mode) return 'batched';
  if ('Scheduled' in mode) return 'scheduled';
  if ('Manual' in mode) return 'manual';
  return 'instant';
}

function formatSettlementStatus(status: any): SettlementStatus {
  if ('Queued' in status) return 'queued';
  if ('Batching' in status) return 'batching';
  if ('Signing' in status) return 'signing';
  if ('Broadcasting' in status) return 'broadcasting';
  if ('Confirming' in status) return 'confirming';
  if ('Confirmed' in status) return 'confirmed';
  if ('Failed' in status) return 'failed';
  return 'queued';
}

// BTC price response
interface BTCPriceResponse {
  USD: number;
}

/**
 * Hook for managing settlements
 */
export function useSettlement() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const queryClient = useQueryClient();

  // Fetch current Bitcoin network fees from mempool.space
  const {
    data: networkFees,
    isLoading: isLoadingFees,
    refetch: refetchFees,
  } = useQuery({
    queryKey: ['bitcoin-fees'],
    queryFn: async (): Promise<MempoolFeeEstimate> => {
      const response = await fetch('https://mempool.space/api/v1/fees/recommended');
      if (!response.ok) {
        throw new Error('Failed to fetch network fees');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Fetch BTC price
  const { data: btcPrice } = useQuery({
    queryKey: ['btc-price'],
    queryFn: async (): Promise<number> => {
      const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
      if (!response.ok) {
        throw new Error('Failed to fetch BTC price');
      }
      const data: BTCPriceResponse = await response.json();
      return data.USD;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000,
  });

  // Calculate fee estimates based on network fees
  const feeEstimates = useCallback((): FeeEstimates | undefined => {
    if (!networkFees || !btcPrice) return undefined;

    // Estimated transaction size for Rune settlement (vBytes)
    const txSize = 250;

    const calculateFee = (feeRate: number, discount: number = 1): FeeEstimate => {
      const totalFee = Math.ceil(txSize * feeRate * discount);
      const usdValue = (totalFee / 100_000_000) * btcPrice;
      return {
        feeRate: Math.ceil(feeRate * discount),
        totalFee,
        usdValue,
        timeEstimate: feeRate >= networkFees.fastestFee
          ? '~10 minutes'
          : feeRate >= networkFees.halfHourFee
          ? '~30 minutes'
          : feeRate >= networkFees.hourFee
          ? '~1 hour'
          : '1-24 hours',
      };
    };

    return {
      instant: calculateFee(networkFees.fastestFee),
      batched: calculateFee(networkFees.halfHourFee, 0.5), // 50% discount for batching
      scheduled: calculateFee(networkFees.economyFee, 0.3), // 70% discount for scheduled
      current: {
        slow: networkFees.economyFee,
        medium: networkFees.halfHourFee,
        fast: networkFees.fastestFee,
      },
    };
  }, [networkFees, btcPrice]);

  // Settlement mutation
  const settlementMutation = useMutation({
    mutationFn: async (request: SettlementRequest): Promise<SettlementResult> => {
      if (!isConnected || !principal) {
        throw new Error('Please connect your wallet first');
      }

      const actor = await getRuneEngineActor();
      if (!actor) {
        throw new Error('Failed to connect to Rune Engine');
      }

      // Call the settle_to_bitcoin method on the canister
      // The actual method signature depends on your backend implementation
      try {
        const result = await actor.settle_to_bitcoin({
          rune_key: {
            block: request.runeKey.block,
            tx: request.runeKey.tx,
          },
          amount: request.amount,
          destination_address: request.destinationAddress,
          mode: request.mode,
          fee_rate: request.customFeeRate ? [request.customFeeRate] : [],
        });

        // Handle Result type from canister
        if ('Ok' in result) {
          const data = result.Ok;
          return {
            success: true,
            txid: data.txid?.[0] || undefined,
            estimatedConfirmationTime: getEstimatedTime(request.mode),
          };
        } else {
          return {
            success: false,
            error: result.Err || 'Settlement failed',
          };
        }
      } catch (err) {
        console.error('Settlement error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['rune-balances'] });
      queryClient.invalidateQueries({ queryKey: ['runes'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-history'] });
    },
  });

  // Get estimated confirmation time based on mode
  const getEstimatedTime = (mode: SettlementMode): string => {
    switch (mode) {
      case 'instant':
        return 'Expected confirmation in ~10 minutes';
      case 'batched':
        return 'Expected confirmation in 1-6 hours';
      case 'scheduled':
        return 'Expected confirmation in 6-24 hours';
      case 'manual':
        return 'Confirmation time depends on fee rate';
    }
  };

  // Settle runes to Bitcoin
  const settle = useCallback(
    async (request: SettlementRequest): Promise<SettlementResult> => {
      return settlementMutation.mutateAsync(request);
    },
    [settlementMutation]
  );

  // Estimate settlement cost
  const estimateSettlement = useCallback(
    (amount: bigint, mode: SettlementMode): SettlementEstimate | null => {
      const estimates = feeEstimates();
      if (!estimates) return null;

      const estimate = mode === 'instant'
        ? estimates.instant
        : mode === 'batched'
        ? estimates.batched
        : estimates.scheduled;

      // Service fee (0.1% of amount, minimum 1000 sats)
      const amountInSats = Number(amount);
      const serviceFee = BigInt(Math.max(Math.ceil(amountInSats * 0.001), 1000));

      return {
        networkFee: BigInt(estimate.totalFee),
        serviceFee,
        totalFee: BigInt(estimate.totalFee) + serviceFee,
        feeRate: estimate.feeRate,
        estimatedTime: estimate.timeEstimate,
        batchSize: mode === 'batched' ? 12 : undefined, // Placeholder
      };
    },
    [feeEstimates]
  );

  return {
    settle,
    estimateSettlement,
    feeEstimates: feeEstimates(),
    isLoadingFees,
    refetchFees,
    isSettling: settlementMutation.isPending,
    settlementError: settlementMutation.error,
    btcPrice,
    networkFees,
  };
}

/**
 * Hook for settlement history
 */
export function useSettlementHistory() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();

  const {
    data: history,
    isLoading,
    error,
    refetch,
  } = useQuery<SettlementHistoryItem[]>({
    queryKey: ['settlement-history', principal?.toString()],
    queryFn: async (): Promise<SettlementHistoryItem[]> => {
      if (!isConnected || !principal) {
        return [];
      }

      const actor = await getRuneEngineActor();
      if (!actor) {
        return [];
      }

      try {
        const records = await actor.get_settlement_history([50n], [0n]);

        return records.map((item: any) => ({
          id: item.id,
          runeKey: {
            block: item.rune_key.block,
            tx: item.rune_key.tx,
          },
          runeName: item.rune_name,
          amount: BigInt(item.amount),
          destinationAddress: item.destination_address,
          mode: formatSettlementMode(item.mode),
          status: formatSettlementStatus(item.status),
          txid: item.txid?.[0],
          createdAt: Number(item.created_at),
          updatedAt: Number(item.updated_at),
          confirmations: item.confirmations?.[0],
        }));
      } catch (err) {
        console.error('Failed to fetch settlement history:', err);
        return [];
      }
    },
    enabled: isConnected && !!principal,
    staleTime: 30 * 1000,
  });

  return {
    history: history || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for tracking a specific settlement
 */
export function useSettlementStatus(settlementId?: string) {
  const { isConnected } = useDualAuth();

  const {
    data: status,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['settlement-status', settlementId],
    queryFn: async () => {
      if (!settlementId) return null;

      const actor = await getRuneEngineActor();
      if (!actor) return null;

      try {
        const result = await actor.get_settlement_status(settlementId);
        if (result && result.length > 0) {
          const record = result[0];
          if (!record) return null;

          return {
            id: record.id,
            status: formatSettlementStatus(record.status),
            txid: record.txid?.[0],
            confirmations: record.confirmations?.[0] || 0,
            updatedAt: Number(record.updated_at),
          };
        }
        return null;
      } catch (err) {
        console.error('Failed to fetch settlement status:', err);
        return null;
      }
    },
    enabled: isConnected && !!settlementId,
    refetchInterval: (query) => {
      // Poll more frequently for pending settlements
      const data = query.state.data;
      if (data?.status === 'confirming' || data?.status === 'broadcasting') {
        return 10 * 1000; // 10 seconds
      }
      return false; // Stop polling
    },
  });

  return {
    status,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for pending settlements count
 */
export function usePendingSettlements() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();

  const { data: count, isLoading } = useQuery({
    queryKey: ['pending-settlements-count', principal?.toString()],
    queryFn: async () => {
      if (!isConnected || !principal) return 0;

      const actor = await getRuneEngineActor();
      if (!actor) return 0;

      try {
        const count = await actor.get_pending_settlement_count();
        return Number(count);
      } catch {
        return 0;
      }
    },
    enabled: isConnected && !!principal,
    staleTime: 30 * 1000,
  });

  return {
    count: count || 0,
    isLoading,
  };
}
