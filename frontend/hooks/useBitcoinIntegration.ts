/**
 * Hook for Bitcoin Integration canister
 * Handles UTXO management, fee estimation, and transaction operations
 */

import { useState, useCallback } from 'react';
import { getBitcoinIntegrationActor } from '@/lib/icp/actors';
import type {
  BitcoinAddress,
  FeeEstimates,
  UtxoSelection,
  RuneEtching,
  Result,
} from '@/types/canisters';

export function useBitcoinIntegration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Get P2TR (Taproot) Bitcoin address for the canister
   */
  const getP2TRAddress = useCallback(async (): Promise<BitcoinAddress | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getBitcoinIntegrationActor();
      const result = await actor.get_p2tr_address();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get P2TR address';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current Bitcoin fee estimates (slow, medium, fast)
   */
  const getFeeEstimates = useCallback(async (): Promise<FeeEstimates | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getBitcoinIntegrationActor();
      const result = await actor.get_fee_estimates();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get fee estimates';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Select UTXOs for a transaction
   * @param amount - Amount needed in satoshis
   * @param feeRate - Fee rate in sat/vB
   */
  const selectUtxos = useCallback(
    async (amount: bigint, feeRate: bigint): Promise<UtxoSelection | null> => {
      try {
        setLoading(true);
        setError(null);
        const actor = await getBitcoinIntegrationActor();
        const result = await actor.select_utxos(amount, feeRate);

        if ('Ok' in result) {
          return result.Ok;
        } else {
          setError(result.Err);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to select UTXOs';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Build and sign an etching transaction
   */
  const buildAndSignEtchingTx = useCallback(
    async (etching: RuneEtching, utxos: UtxoSelection): Promise<Uint8Array | null> => {
      try {
        setLoading(true);
        setError(null);
        const actor = await getBitcoinIntegrationActor();
        const result = await actor.build_and_sign_etching_tx(etching, utxos);

        if ('Ok' in result) {
          return result.Ok;
        } else {
          setError(result.Err);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to build transaction';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Broadcast a signed transaction to Bitcoin network
   */
  const broadcastTransaction = useCallback(async (txBytes: Uint8Array): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getBitcoinIntegrationActor();
      const result = await actor.broadcast_transaction(txBytes);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to broadcast transaction';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current Bitcoin block height
   */
  const getBlockHeight = useCallback(async (): Promise<bigint | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getBitcoinIntegrationActor();
      const result = await actor.get_block_height();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get block height';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get ckBTC balance for a principal
   */
  const getCkBTCBalance = useCallback(async (principal: string): Promise<bigint | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getBitcoinIntegrationActor();
      const result = await actor.get_ckbtc_balance(principal);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get ckBTC balance';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    loading,
    error,
    clearError,

    // Methods
    getP2TRAddress,
    getFeeEstimates,
    selectUtxos,
    buildAndSignEtchingTx,
    broadcastTransaction,
    getBlockHeight,
    getCkBTCBalance,
  };
}
