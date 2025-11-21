/**
 * useCyclesConversion Hook
 * Convert between ICP and Cycles
 */

import { useState, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { getAgent } from '@/lib/icp/agent';
import { cmcIdlFactory, cyclesLedgerIdlFactory, CMC_CANISTER_ID, CYCLES_LEDGER_CANISTER_ID } from '@/lib/icp/idl/cmc.idl';
import { idlFactory as icpLedgerIdlFactory } from '@/lib/icp/idl/icp-ledger.idl';
import { xtcIdlFactory, XTC_CANISTER_ID, XTC_DECIMALS } from '@/lib/icp/idl/xtc.idl';
import { useDualAuth } from '@/lib/auth';

// Helper to create actor with initialized agent
async function createActorAsync<T>(canisterId: string, idlFactory: any) {
  const agent = await getAgent();
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

const ICP_LEDGER_CANISTER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

export interface ConversionRate {
  icpPerTCycles: number;
  cyclesPerIcp: bigint;
  timestamp: number;
}

export interface ConversionResult {
  success: boolean;
  amount?: bigint;
  txId?: string;
  error?: string;
}

export function useCyclesConversion() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Get current conversion rate
  const getConversionRate = useCallback(async (): Promise<ConversionRate | null> => {
    try {
      const cmc = await createActorAsync(CMC_CANISTER_ID, cmcIdlFactory) as any;
      const response = await cmc.get_icp_xdr_conversion_rate();

      // XDR to ICP rate: xdr_permyriad_per_icp means 10000 XDR = X ICP
      // 1 Trillion Cycles = 1 XDR
      const xdrPerIcp = Number(response.data.xdr_permyriad_per_icp) / 10000;
      const cyclesPerIcp = BigInt(Math.floor(xdrPerIcp * 1_000_000_000_000)); // 1T cycles per XDR
      const icpPerTCycles = 1 / xdrPerIcp;

      return {
        icpPerTCycles,
        cyclesPerIcp,
        timestamp: Number(response.data.timestamp_seconds),
      };
    } catch (err) {
      console.error('Failed to get conversion rate:', err);
      setError('Failed to get conversion rate');
      return null;
    }
  }, []);

  // Get Cycles balance
  const getCyclesBalance = useCallback(async (): Promise<bigint> => {
    if (!principal) return 0n;

    try {
      const cyclesLedger = await createActorAsync(CYCLES_LEDGER_CANISTER_ID, cyclesLedgerIdlFactory) as any;
      const balance = await cyclesLedger.icrc1_balance_of({
        owner: principal,
        subaccount: [],
      });
      return balance;
    } catch (err) {
      console.error('Failed to get cycles balance:', err);
      return 0n;
    }
  }, [principal]);

  // Get ICP balance
  const getIcpBalance = useCallback(async (): Promise<bigint> => {
    if (!principal) return 0n;

    try {
      const icpLedger = await createActorAsync(ICP_LEDGER_CANISTER_ID, icpLedgerIdlFactory) as any;
      const balance = await icpLedger.icrc1_balance_of({
        owner: principal,
        subaccount: [],
      });
      return balance;
    } catch (err) {
      console.error('Failed to get ICP balance:', err);
      return 0n;
    }
  }, [principal]);

  // Get XTC balance (DIP20 standard uses balanceOf)
  const getXtcBalance = useCallback(async (): Promise<bigint> => {
    if (!principal) return 0n;

    try {
      const xtc = await createActorAsync(XTC_CANISTER_ID, xtcIdlFactory) as any;
      const balance = await xtc.balanceOf(principal);
      return balance;
    } catch (err) {
      console.error('Failed to get XTC balance:', err);
      return 0n;
    }
  }, [principal]);

  // Wrap Cycles to XTC
  // This withdraws cycles from Cycles Ledger to XTC canister
  const wrapCyclesToXtc = useCallback(
    async (cyclesAmount: bigint): Promise<ConversionResult> => {
      if (!principal || !isConnected) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        setLoading(true);
        setError(null);

        const cyclesLedger = await createActorAsync(CYCLES_LEDGER_CANISTER_ID, cyclesLedgerIdlFactory) as any;

        // Withdraw cycles from Cycles Ledger to XTC canister
        // The XTC canister will credit the sender with XTC tokens
        console.log('Withdrawing cycles to XTC canister...');

        const withdrawResult = await cyclesLedger.withdraw({
          to: Principal.fromText(XTC_CANISTER_ID),
          from_subaccount: [],
          created_at_time: [],
          amount: cyclesAmount,
        });

        if ('Err' in withdrawResult) {
          const errKey = typeof withdrawResult.Err === 'object'
            ? Object.keys(withdrawResult.Err)[0]
            : withdrawResult.Err;
          return { success: false, error: `Withdraw failed: ${errKey}` };
        }

        console.log('Cycles withdrawn to XTC, block:', withdrawResult.Ok.toString());

        // The XTC canister automatically mints XTC when it receives cycles
        // 1 TC (Trillion cycles) = 1 XTC

        return {
          success: true,
          amount: cyclesAmount, // XTC amount equals cycles (both use 12 decimals)
          txId: `wrap-${withdrawResult.Ok.toString()}`,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Wrap failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [principal, isConnected]
  );

  // Unwrap XTC back to Cycles (burn XTC)
  const unwrapXtcToCycles = useCallback(
    async (xtcAmount: bigint): Promise<ConversionResult> => {
      if (!principal || !isConnected) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        setLoading(true);
        setError(null);

        const xtc = await createActorAsync(XTC_CANISTER_ID, xtcIdlFactory) as any;

        // Burn XTC to get cycles back
        // The cycles are sent to a canister we control
        // For now, we'll send them back to the cycles ledger
        console.log('Burning XTC to recover cycles...');

        const burnResult = await xtc.burn({
          amount: xtcAmount,
          canister_id: Principal.fromText(CYCLES_LEDGER_CANISTER_ID),
        });

        if ('Err' in burnResult) {
          return { success: false, error: `Burn failed: ${burnResult.Err}` };
        }

        console.log('XTC burned, cycles returned:', burnResult.Ok.toString());

        return {
          success: true,
          amount: burnResult.Ok,
          txId: `unwrap-${Date.now()}`,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unwrap failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [principal, isConnected]
  );

  // Convert ICP to Cycles
  // This sends ICP to CMC and mints cycles to the user's cycles ledger account
  const convertIcpToCycles = useCallback(
    async (icpAmount: bigint): Promise<ConversionResult> => {
      if (!principal || !isConnected) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        setLoading(true);
        setError(null);

        const icpLedger = await createActorAsync(ICP_LEDGER_CANISTER_ID, icpLedgerIdlFactory) as any;
        const cmc = await createActorAsync(CMC_CANISTER_ID, cmcIdlFactory) as any;

        // Step 1: Transfer ICP to CMC
        console.log('Step 1: Transferring ICP to CMC...');

        // CMC account for minting cycles
        const cmcPrincipal = Principal.fromText(CMC_CANISTER_ID);

        const transferResult = await icpLedger.icrc1_transfer({
          to: {
            owner: cmcPrincipal,
            subaccount: [], // Default subaccount for cycles minting
          },
          fee: [],
          memo: [],
          from_subaccount: [],
          created_at_time: [],
          amount: icpAmount,
        });

        if ('Err' in transferResult) {
          const errKey = Object.keys(transferResult.Err)[0];
          return { success: false, error: `ICP transfer failed: ${errKey}` };
        }

        const blockIndex = transferResult.Ok;
        console.log('ICP transferred, block index:', blockIndex.toString());

        // Step 2: Notify CMC to mint cycles
        console.log('Step 2: Notifying CMC to mint cycles...');

        const mintResult = await cmc.notify_mint_cycles({
          block_index: blockIndex,
          to_subaccount: [],
          deposit_memo: [],
        });

        if ('Err' in mintResult) {
          const errKey = Object.keys(mintResult.Err)[0];
          return { success: false, error: `Cycles minting failed: ${errKey}` };
        }

        const mintedCycles = mintResult.Ok.minted;
        console.log('Cycles minted:', mintedCycles.toString());

        return {
          success: true,
          amount: mintedCycles,
          txId: `mint-${blockIndex.toString()}`,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Conversion failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [principal, isConnected]
  );

  // Estimate cycles output from ICP input
  const estimateCyclesFromIcp = useCallback(
    async (icpAmount: bigint): Promise<bigint> => {
      const rate = await getConversionRate();
      if (!rate) return 0n;

      // Calculate: icpAmount * cyclesPerIcp / 1e8 (ICP has 8 decimals)
      const cycles = (icpAmount * rate.cyclesPerIcp) / 100_000_000n;
      return cycles;
    },
    [getConversionRate]
  );

  // Estimate ICP needed for target cycles
  const estimateIcpForCycles = useCallback(
    async (cyclesAmount: bigint): Promise<bigint> => {
      const rate = await getConversionRate();
      if (!rate) return 0n;

      // Calculate: cyclesAmount * 1e8 / cyclesPerIcp
      const icp = (cyclesAmount * 100_000_000n) / rate.cyclesPerIcp;
      return icp;
    },
    [getConversionRate]
  );

  // Format cycles for display (in TC - Trillion Cycles)
  const formatCycles = useCallback((cycles: bigint): string => {
    const tc = Number(cycles) / 1_000_000_000_000;
    if (tc < 0.001) return '<0.001';
    return tc.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }, []);

  // Format ICP for display
  const formatIcp = useCallback((icp: bigint): string => {
    const value = Number(icp) / 100_000_000;
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }, []);

  return {
    // State
    loading,
    error,

    // Actions
    clearError,
    getConversionRate,
    getCyclesBalance,
    getIcpBalance,
    getXtcBalance,
    convertIcpToCycles,
    wrapCyclesToXtc,
    unwrapXtcToCycles,

    // Estimates
    estimateCyclesFromIcp,
    estimateIcpForCycles,

    // Formatters
    formatCycles,
    formatIcp,

    // Constants
    CMC_CANISTER_ID,
    CYCLES_LEDGER_CANISTER_ID,
    XTC_CANISTER_ID,
    XTC_DECIMALS,
  };
}
