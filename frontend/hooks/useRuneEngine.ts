/**
 * Hook for Rune Engine canister
 * Complete etching flow with state management and monitoring
 */

import { useState, useCallback } from 'react';
import { getRuneEngineActor, getBitcoinIntegrationActor } from '@/lib/icp/actors';
import type {
  RuneEtching,
  EtchingProcessView,
  EtchingConfigView,
  HealthStatus,
  MetricsSummary,
  PerformanceMetrics,
  CyclesMetrics,
  Role,
  RoleAssignment,
  FeeEstimates,
  VirtualRuneView,
  PublicVirtualRuneView,
} from '@/types/canisters';

// Estimated transaction sizes for fee calculation (in vbytes)
const COMMIT_TX_SIZE = 154; // P2TR input + commit output
const REVEAL_TX_SIZE = 250; // Commit input + OP_RETURN + change

// Mempool.space API for real Bitcoin data
const MEMPOOL_API_BASE = 'https://mempool.space/api';

export interface EtchingFeeEstimate {
  commitFee: bigint;
  revealFee: bigint;
  totalFee: bigint;
  feeRate: bigint;
  source: 'mempool' | 'canister' | 'default';
}

export interface MempoolFeeEstimates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

// Fetch real fee estimates from mempool.space
async function fetchMempoolFees(): Promise<MempoolFeeEstimates | null> {
  try {
    const response = await fetch(`${MEMPOOL_API_BASE}/v1/fees/recommended`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch current block height from mempool.space
async function fetchBlockHeight(): Promise<number | null> {
  try {
    const response = await fetch(`${MEMPOOL_API_BASE}/blocks/tip/height`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function useRuneEngine() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // ============================================================================
  // CORE ETCHING OPERATIONS
  // ============================================================================

  /**
   * Create a new Rune (complete etching flow)
   */
  const etchRune = useCallback(async (etching: RuneEtching): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.create_rune(etching);

      if ('Ok' in result) {
        return result.Ok; // Returns process ID
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to etch Rune';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a Virtual Rune (stored on ICP, can be settled to Bitcoin later)
   *
   * Virtual runes are free to create and can be traded on QURI DEX.
   * When ready, they can be settled (etched) to Bitcoin by paying fees.
   *
   * @param etching - The rune parameters
   * @returns The virtual rune ID if successful, null otherwise
   */
  const createVirtualRune = useCallback(async (etching: RuneEtching): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();

      // Call create_rune - the backend handles virtual rune storage
      const result = await actor.create_rune(etching);

      if ('Ok' in result) {
        return result.Ok; // Returns virtual rune ID
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create Virtual Rune';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get status of an etching process
   */
  const getEtchingStatus = useCallback(
    async (processId: string): Promise<EtchingProcessView | null> => {
      try {
        setLoading(true);
        setError(null);
        const actor = await getRuneEngineActor();
        const result = await actor.get_etching_status(processId);

        if (result.length > 0 && result[0]) {
          return result[0];
        }
        return null;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to get etching status';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get all etchings created by the current user
   *
   * @returns Array of etching processes owned by caller
   *
   * @example
   * ```tsx
   * const { getMyEtchings } = useRuneEngine();
   * const myEtchings = await getMyEtchings();
   * console.log(`You have ${myEtchings.length} etchings`);
   * ```
   */
  const getMyEtchings = useCallback(async (): Promise<EtchingProcessView[]> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const etchings = await actor.get_my_etchings();
      return etchings;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get my etchings';

      // Handle known canister storage corruption errors gracefully
      // These errors occur when stable memory has corrupted data
      if (errorMsg.includes('index out of bounds') ||
          errorMsg.includes('ic0.trap') ||
          errorMsg.includes('stable-structures')) {
        console.warn('[useRuneEngine] Canister storage error (likely corrupted data):', errorMsg);
        // Don't set error state for these - just return empty array
        return [];
      }

      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get all virtual runes created by the current user
   */
  const getMyVirtualRunes = useCallback(async (): Promise<VirtualRuneView[]> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const runes = await actor.get_my_virtual_runes();
      return runes;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get virtual runes';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get a specific virtual rune by ID
   */
  const getVirtualRune = useCallback(async (runeId: string): Promise<VirtualRuneView | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_virtual_rune(runeId);
      return result.length > 0 ? (result[0] ?? null) : null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get virtual rune';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get ALL virtual runes (PUBLIC - anyone can see)
   * This enables discovery of Virtual Runes before they're settled to Bitcoin
   *
   * @param offset - Starting position for pagination
   * @param limit - Maximum number of runes to return (max 100)
   * @returns List of virtual runes with creator info
   */
  const getAllVirtualRunes = useCallback(async (
    offset: bigint = 0n,
    limit: bigint = 50n
  ): Promise<PublicVirtualRuneView[]> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const runes = await actor.list_all_virtual_runes(offset, limit);
      return runes;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get all virtual runes';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get total count of ALL virtual runes (for pagination)
   */
  const getAllVirtualRunesCount = useCallback(async (): Promise<bigint> => {
    try {
      setError(null);
      const actor = await getRuneEngineActor();
      const count = await actor.get_all_virtual_runes_count();
      return count;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get virtual runes count';
      setError(errorMsg);
      return 0n;
    }
  }, []);

  /**
   * Etch a virtual rune to Bitcoin
   * This initiates the full Bitcoin etching process
   */
  const etchToBitcoin = useCallback(async (runeId: string): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.etch_to_bitcoin(runeId);

      if ('Ok' in result) {
        return result.Ok; // Returns process ID
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to etch to Bitcoin';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get pending confirmation count
   */
  const getPendingConfirmationCount = useCallback(async (): Promise<number> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const count = await actor.pending_confirmation_count();
      return count;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get pending confirmation count';
      setError(errorMsg);
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get confirmation status for a transaction
   */
  const getConfirmationStatus = useCallback(async (txid: string): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_confirmation_status(txid);

      if (result.length > 0) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get confirmation status';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // CONFIGURATION & FEE ESTIMATION
  // ============================================================================

  /**
   * Get fee estimates from canister
   */
  const getCurrentFeeEstimates = useCallback(async (): Promise<any | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_current_fee_estimates();

      if (result.length > 0) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get fee estimates';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Estimate fees for etching a Rune
   * Returns breakdown of commit + reveal transaction fees
   *
   * @param priority - Fee priority: 'slow', 'medium', or 'fast'
   * @returns Fee estimate with breakdown
   *
   * @example
   * ```tsx
   * const { estimateEtchingFee } = useRuneEngine();
   * const estimate = await estimateEtchingFee('medium');
   * console.log(`Total fee: ${estimate.totalFee} sats`);
   * ```
   */
  const estimateEtchingFee = useCallback(
    async (priority: 'slow' | 'medium' | 'fast' = 'medium'): Promise<EtchingFeeEstimate | null> => {
      try {
        setError(null);

        let feeRate: bigint;
        let source: 'mempool' | 'canister' | 'default' = 'default';

        // Priority 1: Try mempool.space API (real Bitcoin network data)
        const mempoolFees = await fetchMempoolFees();
        if (mempoolFees) {
          const feeMap = {
            slow: mempoolFees.hourFee,
            medium: mempoolFees.halfHourFee,
            fast: mempoolFees.fastestFee,
          };
          feeRate = BigInt(Math.max(feeMap[priority], 1)); // Minimum 1 sat/vB
          source = 'mempool';
          console.log(`Using mempool.space fees: ${feeRate} sat/vB (${priority})`);
        } else {
          // Priority 2: Try canister
          try {
            const actor = await getBitcoinIntegrationActor();
            const result = await actor.get_fee_estimates();

            if ('Ok' in result) {
              feeRate = result.Ok[priority];
              source = 'canister';
              console.log(`Using canister fees: ${feeRate} sat/vB`);
            } else {
              throw new Error('Canister error');
            }
          } catch {
            // Priority 3: Default fallback (conservative estimates)
            const DEFAULT_FEE_RATES = {
              slow: 2n,
              medium: 5n,
              fast: 15n,
            };
            feeRate = DEFAULT_FEE_RATES[priority];
            source = 'default';
            console.log(`Using default fees: ${feeRate} sat/vB`);
          }
        }

        // Calculate fees for both transactions
        const commitFee = BigInt(COMMIT_TX_SIZE) * feeRate;
        const revealFee = BigInt(REVEAL_TX_SIZE) * feeRate;
        const totalFee = commitFee + revealFee;

        return {
          commitFee,
          revealFee,
          totalFee,
          feeRate,
          source,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to estimate fees';
        setError(errorMsg);
        return null;
      }
    },
    []
  );

  /**
   * Get current Bitcoin block height from mempool.space
   */
  const getBitcoinBlockHeight = useCallback(async (): Promise<number | null> => {
    try {
      const height = await fetchBlockHeight();
      return height;
    } catch (err) {
      console.error('Failed to fetch block height:', err);
      return null;
    }
  }, []);

  /**
   * Get all fee estimates (slow, medium, fast)
   */
  const getAllFeeEstimates = useCallback(async (): Promise<FeeEstimates | null> => {
    try {
      setError(null);
      const actor = await getBitcoinIntegrationActor();
      const result = await actor.get_fee_estimates();

      if ('Err' in result) {
        setError(result.Err);
        return null;
      }

      return result.Ok;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get fee estimates';
      setError(errorMsg);
      return null;
    }
  }, []);

  /**
   * Update etching configuration (admin only)
   */
  const updateEtchingConfig = useCallback(async (config: EtchingConfigView): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.update_etching_config(config);

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update etching config';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // HEALTH & MONITORING
  // ============================================================================

  /**
   * Check canister health status
   */
  const healthCheck = useCallback(async (): Promise<HealthStatus | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const health = await actor.health_check();
      return health;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Health check failed';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get metrics summary
   */
  const getMetricsSummary = useCallback(async (): Promise<MetricsSummary | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const metrics = await actor.get_metrics_summary();
      return metrics;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get metrics';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get detailed performance metrics
   */
  const getPerformanceMetrics = useCallback(async (): Promise<PerformanceMetrics | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_performance_metrics();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get performance metrics';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get cycles metrics and burn rate
   */
  const getCyclesMetrics = useCallback(async (): Promise<CyclesMetrics | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const metrics = await actor.get_cycles_metrics();
      return metrics;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get cycles metrics';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // RBAC (Role-Based Access Control)
  // ============================================================================

  /**
   * Grant a role to a principal
   */
  const grantRole = useCallback(async (principal: string, role: Role): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.grant_role(principal, role);

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to grant role';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Revoke a role from a principal
   */
  const revokeRole = useCallback(async (principal: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.revoke_role(principal);

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke role';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get role for a principal
   */
  const getRole = useCallback(async (principal: string): Promise<Role | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_user_role(principal);

      if ('Ok' in result) {
        return result.Ok;
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get role';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current user's role
   *
   * @returns Role of the calling principal
   *
   * @example
   * ```tsx
   * const { getMyRole } = useRuneEngine();
   * const role = await getMyRole();
   * if ('Admin' in role) {
   *   // Show admin features
   * }
   * ```
   */
  const getMyRole = useCallback(async (): Promise<Role> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const role = await actor.get_my_role();
      return role;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get my role';
      setError(errorMsg);
      // Default to User role on error
      return { User: null };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List all role assignments
   */
  const listRoleAssignments = useCallback(async (): Promise<RoleAssignment[]> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.list_roles();
      if ('Ok' in result) {
        return result.Ok;
      }
      return [];
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to list role assignments';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get canister owner principal
   *
   * @returns Owner principal or null if not set
   */
  const getOwner = useCallback(async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_owner();
      if (result.length > 0 && result[0]) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get owner';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // LOGGING & DEBUGGING
  // ============================================================================

  /**
   * Get recent error logs for debugging
   *
   * @param limit - Maximum number of logs to return (default: 50)
   * @returns Array of error log entries or null on failure
   */
  const getRecentErrors = useCallback(async (limit = 50n): Promise<any[] | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_recent_errors(limit);

      if ('Ok' in result) {
        return result.Ok;
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get recent errors';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get recent logs (all levels)
   *
   * @param limit - Maximum number of logs to return (default: 100)
   * @returns Array of log entries or null on failure
   */
  const getRecentLogs = useCallback(async (limit = 100n): Promise<any[] | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_recent_logs(limit);

      if ('Ok' in result) {
        return result.Ok;
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get recent logs';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get cycles usage history for monitoring
   *
   * @returns Array of cycles snapshots or null on failure
   */
  const getCyclesHistory = useCallback(async (): Promise<any[] | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = await getRuneEngineActor();
      const result = await actor.get_cycles_history();

      if ('Ok' in result) {
        return result.Ok;
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get cycles history';
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

    // Core operations
    etchRune,
    createVirtualRune,
    getEtchingStatus,
    getMyEtchings,
    getMyVirtualRunes,
    getVirtualRune,
    getAllVirtualRunes,
    getAllVirtualRunesCount,
    etchToBitcoin,
    getPendingConfirmationCount,
    getConfirmationStatus,

    // Configuration & Fees
    getCurrentFeeEstimates,
    updateEtchingConfig,
    estimateEtchingFee,
    getAllFeeEstimates,
    getBitcoinBlockHeight,

    // Health & Monitoring
    healthCheck,
    getMetricsSummary,
    getPerformanceMetrics,
    getCyclesMetrics,

    // RBAC
    grantRole,
    revokeRole,
    getRole,
    getMyRole,
    listRoleAssignments,
    getOwner,

    // Logging & Debugging
    getRecentErrors,
    getRecentLogs,
    getCyclesHistory,
  };
}
