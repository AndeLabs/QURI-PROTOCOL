/**
 * Hook for Rune Engine canister
 * Complete etching flow with state management and monitoring
 */

import { useState, useCallback } from 'react';
import { getRuneEngineActor } from '@/lib/icp/actors';
import type {
  RuneEtching,
  EtchingProcessView,
  EtchingConfigView,
  HealthStatus,
  MetricsSummary,
  PerformanceMetrics,
  CyclesMetrics,
  BlockHeightInfo,
  Role,
  RoleAssignment,
  Result,
} from '@/types/canisters';

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
      const actor = getRuneEngineActor();
      const result = await actor.etch_rune(etching);

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
   * Get status of an etching process
   */
  const getEtchingStatus = useCallback(
    async (processId: string): Promise<EtchingProcessView | null> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRuneEngineActor();
        const result = await actor.get_etching_status(processId);

        if (result.length > 0) {
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
      const actor = getRuneEngineActor();
      const etchings = await actor.get_my_etchings();
      return etchings;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get my etchings';
      setError(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * List all etching processes with pagination
   */
  const listProcesses = useCallback(
    async (offset: bigint, limit: bigint): Promise<EtchingProcessView[]> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getRuneEngineActor();
        const processes = await actor.list_processes(offset, limit);
        return processes;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to list processes';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Retry a failed etching process
   */
  const retryFailedEtching = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRuneEngineActor();
      const result = await actor.retry_failed_etching(id);

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to retry etching';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get current etching configuration
   */
  const getEtchingConfig = useCallback(async (): Promise<EtchingConfigView | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRuneEngineActor();
      const config = await actor.get_etching_config();
      return config;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get config';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update fee rate for etching transactions
   */
  const updateFeeRate = useCallback(async (feeRate: bigint): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRuneEngineActor();
      const result = await actor.update_fee_rate(feeRate);

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update fee rate';
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
      const metrics = await actor.get_performance_metrics();
      return metrics;
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
      const actor = getRuneEngineActor();
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

  /**
   * Get current Bitcoin block height
   */
  const getCurrentBlockHeight = useCallback(async (): Promise<BlockHeightInfo | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRuneEngineActor();
      const result = await actor.get_current_block_height();

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

  // ============================================================================
  // RBAC (Role-Based Access Control)
  // ============================================================================

  /**
   * Assign a role to a principal
   */
  const assignRole = useCallback(async (principal: string, role: Role): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRuneEngineActor();
      const result = await actor.assign_role(principal, role);

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to assign role';
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
      const result = await actor.get_owner();
      if (result.length > 0) {
        return result[0].toText();
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
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
      const actor = getRuneEngineActor();
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
    getEtchingStatus,
    getMyEtchings, // ✅ NEW - Get current user's etchings
    listProcesses,
    retryFailedEtching,

    // Configuration
    getEtchingConfig,
    updateFeeRate,

    // Health & Monitoring
    healthCheck,
    getMetricsSummary,
    getPerformanceMetrics,
    getCyclesMetrics,
    getCurrentBlockHeight,

    // RBAC
    assignRole,
    revokeRole,
    getRole,
    getMyRole, // ✅ NEW - Get current user's role
    listRoleAssignments,
    getOwner, // ✅ NEW - Get canister owner

    // Logging & Debugging
    getRecentErrors, // ✅ NEW - Get error logs
    getRecentLogs, // ✅ NEW - Get all logs
    getCyclesHistory, // ✅ NEW - Get cycles usage history
  };
}
