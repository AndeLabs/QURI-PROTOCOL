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
      const result = await actor.get_role(principal);

      if (result.length > 0) {
        return result[0];
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
   * List all role assignments
   */
  const listRoleAssignments = useCallback(async (): Promise<RoleAssignment[]> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getRuneEngineActor();
      const assignments = await actor.list_role_assignments();
      return assignments;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to list role assignments';
      setError(errorMsg);
      return [];
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
    listRoleAssignments,
  };
}
