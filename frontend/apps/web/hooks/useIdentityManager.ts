/**
 * Hook for Identity Manager canister
 * Session management and permissions inspired by Odin.fun
 */

import { useState, useCallback } from 'react';
import { getIdentityManagerActor } from '@/lib/icp/actors';
import type {
  SessionPermissions,
  UserSession,
  UserStats,
  PermissionType,
  Result,
} from '@/types/canisters';

export function useIdentityManager() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  /**
   * Create a new session with specific permissions
   * @param permissions - Session permissions (create_rune, transfer, max_amount)
   * @param durationNs - Session duration in nanoseconds
   */
  const createSession = useCallback(
    async (permissions: SessionPermissions, durationNs: bigint): Promise<UserSession | null> => {
      try {
        setLoading(true);
        setError(null);
        const actor = getIdentityManagerActor();
        const result = await actor.create_session(permissions, durationNs);

        if ('Ok' in result) {
          return result.Ok;
        } else {
          setError(result.Err);
          return null;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create session';
        setError(errorMsg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get current session for caller
   */
  const getSession = useCallback(async (): Promise<UserSession | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getIdentityManagerActor();
      const result = await actor.get_session();

      if (result.length > 0) {
        return result[0];
      }
      return null;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get session';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Validate a session for a principal
   */
  const validateSession = useCallback(async (principal: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getIdentityManagerActor();
      const isValid = await actor.validate_session(principal);
      return isValid;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to validate session';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Revoke current session
   */
  const revokeSession = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getIdentityManagerActor();
      const result = await actor.revoke_session();

      if ('Ok' in result) {
        return true;
      } else {
        setError(result.Err);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke session';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if caller has a specific permission
   */
  const checkPermission = useCallback(async (permission: PermissionType): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getIdentityManagerActor();
      const hasPermission = await actor.check_permission(permission);
      return hasPermission;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check permission';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check if caller can create Runes
   */
  const canCreateRune = useCallback(async (): Promise<boolean> => {
    return checkPermission({ CreateRune: null });
  }, [checkPermission]);

  /**
   * Check if caller can transfer Runes
   */
  const canTransfer = useCallback(async (): Promise<boolean> => {
    return checkPermission({ Transfer: null });
  }, [checkPermission]);

  /**
   * Get user statistics
   */
  const getUserStats = useCallback(async (principal: string): Promise<UserStats | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getIdentityManagerActor();
      const stats = await actor.get_user_stats(principal);
      return stats;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get user stats';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create default session (1 hour, all permissions)
   */
  const createDefaultSession = useCallback(async (): Promise<UserSession | null> => {
    const ONE_HOUR_NS = BigInt(60 * 60 * 1_000_000_000); // 1 hour in nanoseconds
    const defaultPermissions: SessionPermissions = {
      can_create_rune: true,
      can_transfer: true,
      max_amount: BigInt(1_000_000), // 0.01 BTC
    };

    return createSession(defaultPermissions, ONE_HOUR_NS);
  }, [createSession]);

  return {
    // State
    loading,
    error,
    clearError,

    // Session management
    createSession,
    createDefaultSession,
    getSession,
    validateSession,
    revokeSession,

    // Permissions
    checkPermission,
    canCreateRune,
    canTransfer,

    // User stats
    getUserStats,
  };
}
