/**
 * Dead Man's Switch Hook
 * Manages DMS operations with the rune-engine canister
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRuneEngineActor } from '@/lib/icp/actors';
import { useDualAuth } from '@/lib/auth';
import { toast } from 'sonner';

// Types matching backend
export interface DeadManSwitch {
  id: bigint;
  owner: { toText: () => string };
  beneficiary: string;
  rune_id: string;
  amount: bigint;
  last_checkin: bigint;
  timeout_ns: bigint;
  triggered: boolean;
  created_at: bigint;
  message: string | null;
}

export interface DeadManSwitchInfo {
  switch: DeadManSwitch;
  status: SwitchStatus;
  time_remaining_ns: bigint;
  elapsed_percentage: number;
}

export type SwitchStatus =
  | { Active: null }
  | { Expired: null }
  | { Triggered: null }
  | { Cancelled: null };

export interface DeadManSwitchStats {
  total_switches: bigint;
  active_switches: bigint;
  triggered_switches: bigint;
  total_value_protected: bigint;
}

export interface CreateDeadManSwitchParams {
  beneficiary: string;
  rune_id: string;
  amount: bigint;
  timeout_days: bigint;
  message: string | null;
}

// Helper to get status string
export function getSwitchStatusString(status: SwitchStatus): string {
  if ('Active' in status) return 'Active';
  if ('Expired' in status) return 'Expired';
  if ('Triggered' in status) return 'Triggered';
  if ('Cancelled' in status) return 'Cancelled';
  return 'Unknown';
}

// Helper to format time remaining
export function formatTimeRemaining(ns: bigint): string {
  const seconds = Number(ns) / 1_000_000_000;
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Less than 1m';
  }
}

// Helper to convert Candid optional to TypeScript null
function fromCandidOpt<T>(opt: [] | [T]): T | null {
  return opt.length > 0 ? (opt[0] as T) : null;
}

// Helper to convert TypeScript null to Candid optional
function toCandidOpt<T>(value: T | null): [] | [T] {
  return value !== null ? [value] : [];
}

// Transform Candid DMS response to TypeScript type
function transformDMSInfo(raw: any): DeadManSwitchInfo {
  return {
    switch: {
      id: raw.switch.id,
      owner: raw.switch.owner,
      beneficiary: raw.switch.beneficiary,
      rune_id: raw.switch.rune_id,
      amount: raw.switch.amount,
      last_checkin: raw.switch.last_checkin,
      timeout_ns: raw.switch.timeout_ns,
      triggered: raw.switch.triggered,
      created_at: raw.switch.created_at,
      message: fromCandidOpt(raw.switch.message),
    },
    status: raw.status,
    time_remaining_ns: raw.time_remaining_ns,
    elapsed_percentage: raw.elapsed_percentage,
  };
}

export function useDeadManSwitch() {
  const { isConnected } = useDualAuth();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Query: Get user's switches
  const {
    data: mySwitches,
    isLoading: isLoadingSwitches,
    error: switchesError,
    refetch: refetchSwitches,
  } = useQuery({
    queryKey: ['deadManSwitches', 'my'],
    queryFn: async () => {
      const actor = await getRuneEngineActor();
      const result = await actor.get_my_dead_man_switches();
      return (result as any[]).map(transformDMSInfo);
    },
    enabled: isConnected,
    refetchInterval: 60000, // Refresh every minute
  });

  // Query: Get DMS stats
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['deadManSwitches', 'stats'],
    queryFn: async () => {
      const actor = await getRuneEngineActor();
      const result = await actor.get_dead_man_switch_stats();
      return result as DeadManSwitchStats;
    },
    enabled: isConnected,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Mutation: Create switch
  const createMutation = useMutation({
    mutationFn: async (params: CreateDeadManSwitchParams) => {
      const actor = await getRuneEngineActor();
      // Convert to Candid format
      const candidParams = {
        beneficiary: params.beneficiary,
        rune_id: params.rune_id,
        amount: params.amount,
        timeout_days: params.timeout_days,
        message: toCandidOpt(params.message),
      };
      const result = await actor.create_dead_man_switch(candidParams);
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      return result.Ok as bigint;
    },
    onSuccess: (id) => {
      toast.success('Dead Man\'s Switch created', {
        description: `Switch ID: ${id}`,
      });
      queryClient.invalidateQueries({ queryKey: ['deadManSwitches'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to create switch', {
        description: error.message,
      });
    },
  });

  // Mutation: Check in
  const checkinMutation = useMutation({
    mutationFn: async (switchId: bigint) => {
      const actor = await getRuneEngineActor();
      const result = await actor.dms_checkin(switchId);
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      return result.Ok;
    },
    onSuccess: () => {
      toast.success('Check-in successful', {
        description: 'Timer has been reset',
      });
      queryClient.invalidateQueries({ queryKey: ['deadManSwitches'] });
    },
    onError: (error: Error) => {
      toast.error('Check-in failed', {
        description: error.message,
      });
    },
  });

  // Mutation: Cancel switch
  const cancelMutation = useMutation({
    mutationFn: async (switchId: bigint) => {
      const actor = await getRuneEngineActor();
      const result = await actor.cancel_dead_man_switch(switchId);
      if ('Err' in result) {
        throw new Error(result.Err);
      }
      return result.Ok;
    },
    onSuccess: () => {
      toast.success('Switch cancelled');
      queryClient.invalidateQueries({ queryKey: ['deadManSwitches'] });
    },
    onError: (error: Error) => {
      toast.error('Failed to cancel switch', {
        description: error.message,
      });
    },
  });

  // Actions
  const createSwitch = useCallback(
    async (params: CreateDeadManSwitchParams) => {
      return createMutation.mutateAsync(params);
    },
    [createMutation]
  );

  const checkin = useCallback(
    async (switchId: bigint) => {
      return checkinMutation.mutateAsync(switchId);
    },
    [checkinMutation]
  );

  const cancelSwitch = useCallback(
    async (switchId: bigint) => {
      return cancelMutation.mutateAsync(switchId);
    },
    [cancelMutation]
  );

  // Get single switch info
  const getSwitch = useCallback(
    async (switchId: bigint): Promise<DeadManSwitchInfo | null> => {
      const actor = await getRuneEngineActor();
      const result = await actor.get_dead_man_switch(switchId);
      if (result.length === 0 || !result[0]) return null;
      return transformDMSInfo(result[0]);
    },
    []
  );

  return {
    // Data
    mySwitches: mySwitches || [],
    stats,

    // Loading states
    isLoading: isLoadingSwitches || isLoadingStats,
    isReady: isConnected,
    isCreating: createMutation.isPending,
    isCheckingIn: checkinMutation.isPending,
    isCancelling: cancelMutation.isPending,

    // Errors
    error: switchesError,

    // Actions
    createSwitch,
    checkin,
    cancelSwitch,
    getSwitch,
    refetch: refetchSwitches,
  };
}

export default useDeadManSwitch;
