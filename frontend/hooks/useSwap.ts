/**
 * useSwap Hook
 * Real DEX integration for token swaps on ICP
 * Uses KongSwap for fast 8-second swaps
 */

import { useState, useCallback, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { getAgent } from '@/lib/icp/agent';
import { icrc2LedgerIdlFactory } from '@/lib/icp/idl/icpswap.idl';
import {
  kongSwapIdlFactory,
  KONGSWAP_BACKEND_CANISTER_ID,
  KONGSWAP_TOKEN_SYMBOLS
} from '@/lib/icp/idl/kongswap.idl';
import { useDualAuth } from '@/lib/auth';

// Helper to create actor with initialized agent
async function createActorAsync<T>(canisterId: string, idlFactory: any) {
  const agent = await getAgent();
  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId: Principal.fromText(canisterId),
  });
}

// Token configurations with real canister IDs
export interface TokenConfig {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  color: string;
  canisterId: string;
  standard: string;
}

// Real ICP token canister IDs (mainnet)
// Note: XTC removed because wrapping requires wallet-level cycle attachment
// which cannot be done from frontend. Users should use dank.ooo for XTC.
export const TOKENS: Record<string, TokenConfig> = {
  ICP: {
    symbol: 'ICP',
    name: 'Internet Computer',
    icon: '∞',
    decimals: 8,
    color: 'purple',
    canisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
    standard: 'ICRC2',
  },
  ckBTC: {
    symbol: 'ckBTC',
    name: 'Chain Key Bitcoin',
    icon: '₿',
    decimals: 8,
    color: 'orange',
    canisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
    standard: 'ICRC2',
  },
  ckETH: {
    symbol: 'ckETH',
    name: 'Chain Key Ethereum',
    icon: 'Ξ',
    decimals: 18,
    color: 'blue',
    canisterId: 'ss2fx-dyaaa-aaaar-qacoq-cai',
    standard: 'ICRC2',
  },
  ckUSDC: {
    symbol: 'ckUSDC',
    name: 'Chain Key USDC',
    icon: '$',
    decimals: 6,
    color: 'green',
    canisterId: 'xevnm-gaaaa-aaaar-qafnq-cai',
    standard: 'ICRC2',
  },
};

// KongSwap supported pairs (all pairs go through single backend)
// KongSwap routes automatically through best path
const SUPPORTED_PAIRS = [
  ['ICP', 'ckBTC'],
  ['ICP', 'ckUSDC'],
  ['ICP', 'ckETH'],
  ['ckBTC', 'ckUSDC'],
  ['ckBTC', 'ckETH'],
  ['ckETH', 'ckUSDC'],
];

export interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  fee: bigint;
  route: string[];
  minimumReceived: bigint;
  executionPrice: number;
}

export interface SwapResult {
  success: boolean;
  txId?: string;
  amountOut?: bigint;
  error?: string;
}

export function useSwap() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, bigint>>({});
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Clear error
  const clearError = useCallback(() => setError(null), []);

  // Load all token balances
  const loadBalances = useCallback(async () => {
    if (!principal || !isConnected) return;

    try {
      setLoadingBalances(true);
      const newBalances: Record<string, bigint> = {};

      await Promise.all(
        Object.entries(TOKENS).map(async ([symbol, token]) => {
          try {
            const ledger = await createActorAsync(token.canisterId, icrc2LedgerIdlFactory) as any;
            const balance = await ledger.icrc1_balance_of({
              owner: principal,
              subaccount: [],
            });
            newBalances[symbol] = balance;
          } catch (err) {
            console.error(`Failed to load ${symbol} balance:`, err);
            newBalances[symbol] = 0n;
          }
        })
      );

      setBalances(newBalances);
    } catch (err) {
      console.error('Failed to load balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  }, [principal, isConnected]);

  // Load balances on mount and when principal changes
  useEffect(() => {
    if (isConnected && principal) {
      loadBalances();
    }
  }, [isConnected, principal, loadBalances]);

  // Check if pair is supported
  const isPairSupported = (tokenA: string, tokenB: string): boolean => {
    return SUPPORTED_PAIRS.some(
      ([a, b]) => (a === tokenA && b === tokenB) || (a === tokenB && b === tokenA)
    );
  };

  // Get swap quote using KongSwap
  const getQuote = useCallback(
    async (
      fromToken: string,
      toToken: string,
      amountIn: bigint,
      slippage: number = 0.5
    ): Promise<SwapQuote | null> => {
      try {
        setError(null);

        if (!isPairSupported(fromToken, toToken)) {
          setError(`Pair ${fromToken}/${toToken} not supported`);
          return null;
        }

        const fromTokenConfig = TOKENS[fromToken];
        const toTokenConfig = TOKENS[toToken];

        // Get KongSwap token symbols (IC.ICP format)
        const payToken = KONGSWAP_TOKEN_SYMBOLS[fromToken];
        const receiveToken = KONGSWAP_TOKEN_SYMBOLS[toToken];

        if (!payToken || !receiveToken) {
          setError(`Token not supported: ${fromToken} or ${toToken}`);
          return null;
        }

        // Create KongSwap backend actor
        const kongSwap = await createActorAsync(KONGSWAP_BACKEND_CANISTER_ID, kongSwapIdlFactory) as any;

        // Get quote from KongSwap
        console.log(`Getting quote: ${payToken} -> ${receiveToken}, amount: ${amountIn}`);
        const quoteResult = await kongSwap.swap_amounts(payToken, amountIn, receiveToken);

        if ('Err' in quoteResult) {
          setError(`Quote failed: ${quoteResult.Err}`);
          return null;
        }

        const quote = quoteResult.Ok;
        const amountOut = quote.receive_amount;

        // Calculate minimum received with slippage
        const slippageFactor = BigInt(Math.floor((1 - slippage / 100) * 10000));
        const minimumReceived = (amountOut * slippageFactor) / 10000n;

        // Calculate fee from transactions
        let totalFee = 0n;
        for (const tx of quote.txs) {
          totalFee += tx.lp_fee + tx.gas_fee;
        }

        // Calculate execution price
        const executionPrice =
          Number(amountOut) /
          Math.pow(10, toTokenConfig.decimals) /
          (Number(amountIn) / Math.pow(10, fromTokenConfig.decimals));

        return {
          amountIn,
          amountOut,
          priceImpact: quote.slippage, // Already in percentage (e.g., 0.5 = 0.5%)
          fee: totalFee,
          route: quote.txs.map((tx: any) => tx.pool_symbol),
          minimumReceived,
          executionPrice,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to get quote';
        setError(errorMsg);
        console.error('Quote error:', err);
        return null;
      }
    },
    []
  );

  // Helper function to retry operations
  const retryOperation = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 2000
  ): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.log(`Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  };

  // Execute swap using KongSwap
  const executeSwap = useCallback(
    async (
      fromToken: string,
      toToken: string,
      amountIn: bigint,
      minAmountOut: bigint
    ): Promise<SwapResult> => {
      if (!principal || !isConnected) {
        return { success: false, error: 'Wallet not connected' };
      }

      try {
        setLoading(true);
        setError(null);

        const fromTokenConfig = TOKENS[fromToken];

        if (!isPairSupported(fromToken, toToken)) {
          return { success: false, error: `Pair ${fromToken}/${toToken} not supported` };
        }

        // Get KongSwap token symbols
        const payToken = KONGSWAP_TOKEN_SYMBOLS[fromToken];
        const receiveToken = KONGSWAP_TOKEN_SYMBOLS[toToken];

        if (!payToken || !receiveToken) {
          return { success: false, error: `Token not supported` };
        }

        // Step 1: Approve tokens for KongSwap backend
        console.log('Step 1: Approving tokens for KongSwap...');
        const fromLedger = await createActorAsync(fromTokenConfig.canisterId, icrc2LedgerIdlFactory) as any;

        const approveResult = await retryOperation(async () => {
          return await fromLedger.icrc2_approve({
            fee: [],
            memo: [],
            from_subaccount: [],
            created_at_time: [],
            amount: amountIn * 2n, // Double amount to cover fees and retries
            expected_allowance: [],
            expires_at: [],
            spender: {
              owner: Principal.fromText(KONGSWAP_BACKEND_CANISTER_ID),
              subaccount: [],
            },
          });
        }, 3, 1000);

        if ('Err' in approveResult) {
          const errKey = Object.keys(approveResult.Err)[0];
          return { success: false, error: `Approve failed: ${errKey}` };
        }
        console.log('Approve successful, block:', approveResult.Ok.toString());

        // Step 2: Execute swap on KongSwap (single transaction!)
        console.log('Step 2: Executing swap on KongSwap...');
        const kongSwap = await createActorAsync(KONGSWAP_BACKEND_CANISTER_ID, kongSwapIdlFactory) as any;

        // Get fresh quote to determine actual slippage
        const freshQuote = await kongSwap.swap_amounts(payToken, amountIn, receiveToken);
        let maxSlippage = 3.0; // Default fallback

        if ('Ok' in freshQuote) {
          // Use actual slippage from quote + 1% buffer to ensure execution
          const actualSlippage = freshQuote.Ok.slippage;
          maxSlippage = Math.max(actualSlippage + 1.0, 1.0); // At least 1%, actual + 1% buffer
          console.log(`Actual slippage: ${actualSlippage}%, using max: ${maxSlippage}%`);
        }

        console.log('Swap parameters:', {
          pay_token: payToken,
          pay_amount: amountIn.toString(),
          receive_token: receiveToken,
          min_amount_out: minAmountOut.toString(),
          max_slippage: maxSlippage,
        });

        const swapStartTime = Date.now();
        console.log(`Calling KongSwap swap...`);

        try {
          // Don't retry swap - if it fails on decode, tokens may already be swapped
          const swapResult = await kongSwap.swap({
            pay_token: payToken,
            pay_amount: amountIn,
            pay_tx_id: [], // Empty - KongSwap will use approve
            receive_token: receiveToken,
            receive_amount: [minAmountOut], // Minimum expected
            receive_address: [], // Empty - receive to caller
            max_slippage: [maxSlippage],
            referred_by: [],
          });

          console.log(`KongSwap swap returned after ${Date.now() - swapStartTime}ms`);

          if ('Err' in swapResult) {
            console.error('Swap error from KongSwap:', swapResult.Err);
            return { success: false, error: `Swap failed: ${swapResult.Err}` };
          }

          const result = swapResult.Ok;
          console.log('Swap successful!', {
            txId: result.tx_id.toString(),
            status: result.status,
            received: result.receive_amount.toString(),
          });

          // Refresh balances
          await loadBalances();

          return {
            success: true,
            amountOut: result.receive_amount,
            txId: `kong-${result.tx_id.toString()}`,
          };
        } catch (swapErr) {
          // Type mismatch errors mean the swap likely succeeded but decode failed
          const errMsg = swapErr instanceof Error ? swapErr.message : '';
          if (errMsg.includes('type mismatch')) {
            console.warn('Swap likely succeeded but response decode failed. Refreshing balances...');
            await loadBalances();
            return {
              success: true,
              amountOut: minAmountOut, // Use minimum as estimate
              txId: `kong-decode-error-${Date.now()}`,
            };
          }
          throw swapErr; // Re-throw other errors
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Swap failed';
        setError(errorMsg);
        console.error('Swap error:', err);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [principal, isConnected, loadBalances]
  );

  // Get allowance
  const getAllowance = useCallback(
    async (tokenSymbol: string, spenderCanisterId: string): Promise<bigint> => {
      if (!principal) return 0n;

      try {
        const token = TOKENS[tokenSymbol];
        if (!token) return 0n;

        const ledger = await createActorAsync(token.canisterId, icrc2LedgerIdlFactory) as any;
        const result = await ledger.icrc2_allowance({
          account: { owner: principal, subaccount: [] },
          spender: { owner: Principal.fromText(spenderCanisterId), subaccount: [] },
        });

        return result.allowance;
      } catch (err) {
        console.error('Failed to get allowance:', err);
        return 0n;
      }
    },
    [principal]
  );

  // Format balance for display
  const formatBalance = useCallback((balance: bigint, decimals: number): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    if (value === 0) return '0.00';
    if (value < 0.001) return '<0.001';
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.min(decimals, 6),
    });
  }, []);

  // Get supported token list
  const getSupportedTokens = useCallback((): TokenConfig[] => {
    return Object.values(TOKENS);
  }, []);

  // Check if pool exists
  const hasPool = useCallback((tokenA: string, tokenB: string): boolean => {
    return isPairSupported(tokenA, tokenB);
  }, []);

  return {
    // State
    loading,
    error,
    balances,
    loadingBalances,

    // Actions
    clearError,
    loadBalances,
    getQuote,
    executeSwap,
    getAllowance,

    // Helpers
    formatBalance,
    getSupportedTokens,
    hasPool,

    // Constants
    TOKENS,
  };
}
