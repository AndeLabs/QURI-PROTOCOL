/**
 * React Query hooks for Etching Processes
 * Includes automatic polling for active processes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRuneEngine } from '../useRuneEngine';
import { useEtchingStore } from '@/lib/store/useEtchingStore';
import type { RuneEtching, EtchingProcessView } from '@/types/canisters';
import { toast } from 'sonner';

// Query keys
export const etchingKeys = {
  all: ['etchings'] as const,
  lists: () => [...etchingKeys.all, 'list'] as const,
  list: (offset: bigint, limit: bigint) => [...etchingKeys.lists(), { offset, limit }] as const,
  details: () => [...etchingKeys.all, 'detail'] as const,
  detail: (id: string) => [...etchingKeys.details(), id] as const,
  config: () => [...etchingKeys.all, 'config'] as const,
  metrics: () => [...etchingKeys.all, 'metrics'] as const,
  health: () => [...etchingKeys.all, 'health'] as const,
};

/**
 * Query: Get etching process status with auto-polling
 */
export function useEtchingStatusQuery(processId: string | null) {
  const { getEtchingStatus } = useRuneEngine();
  const { updateProcess, shouldPoll } = useEtchingStore();

  return useQuery({
    queryKey: etchingKeys.detail(processId || ''),
    queryFn: async () => {
      if (!processId) return null;

      const status = await getEtchingStatus(processId);
      if (status) {
        updateProcess(processId, status); // Update Zustand cache
      }
      return status;
    },
    enabled: !!processId,
    // Auto-poll every 5 seconds if process is active
    refetchInterval: (query) => {
      if (!processId || !query.state.data) return false;
      return shouldPoll(processId) ? 5000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Query: List all etching processes
 */
export function useEtchingProcessesQuery(offset: bigint = 0n, limit: bigint = 20n) {
  const { listProcesses } = useRuneEngine();
  const { addProcesses } = useEtchingStore();

  return useQuery({
    queryKey: etchingKeys.list(offset, limit),
    queryFn: async () => {
      const processes = await listProcesses(offset, limit);
      if (processes.length > 0) {
        addProcesses(processes);
      }
      return processes;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Query: Get etching configuration
 */
export function useEtchingConfigQuery() {
  const { getEtchingConfig } = useRuneEngine();

  return useQuery({
    queryKey: etchingKeys.config(),
    queryFn: getEtchingConfig,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Query: Get health status
 * Only polls when component is visible (refetchIntervalInBackground: false)
 */
export function useHealthQuery() {
  const { healthCheck } = useRuneEngine();

  return useQuery({
    queryKey: etchingKeys.health(),
    queryFn: healthCheck,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchIntervalInBackground: false, // Stop polling when tab is not visible
  });
}

/**
 * Query: Get metrics summary
 * Only polls when component is visible to save resources
 */
export function useMetricsSummaryQuery() {
  const { getMetricsSummary } = useRuneEngine();

  return useQuery({
    queryKey: etchingKeys.metrics(),
    queryFn: getMetricsSummary,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every 60 seconds (reduced from 30)
    refetchIntervalInBackground: false, // Stop polling when tab is not visible
  });
}

/**
 * Mutation: Etch a new Rune
 * With Optimistic Updates for instant UX feedback
 */
export function useEtchRuneMutation() {
  const { etchRune } = useRuneEngine();
  const queryClient = useQueryClient();
  const { addProcess, setActiveProcessId } = useEtchingStore();

  return useMutation({
    mutationFn: async (etching: RuneEtching) => {
      const processId = await etchRune(etching);
      if (!processId) {
        throw new Error('Failed to start etching process');
      }
      return { processId, runeName: etching.rune_name };
    },
    onMutate: async (etching) => {
      const toastId = `etch-${Date.now()}`;
      toast.loading(`Creating Rune: ${etching.rune_name}...`, { id: toastId });

      // Cancel outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: etchingKeys.lists() });

      // Snapshot previous data for rollback
      const previousProcesses = queryClient.getQueryData(etchingKeys.lists());

      // Optimistically add a pending process to the list
      const tempId = `temp-${Date.now()}`;
      const optimisticProcess: EtchingProcessView = {
        id: tempId,
        rune_name: etching.rune_name,
        state: 'Pending',
        created_at: BigInt(Date.now() * 1_000_000),
        updated_at: BigInt(Date.now() * 1_000_000),
        retry_count: 0,
        txid: [],
        error_message: [],
      };

      // Update the cache optimistically
      queryClient.setQueryData(
        etchingKeys.list(0n, 20n),
        (old: EtchingProcessView[] | undefined) => {
          if (!old) return [optimisticProcess];
          return [optimisticProcess, ...old];
        }
      );

      // Add to Zustand store immediately
      addProcess(optimisticProcess);

      return { toastId, previousProcesses, tempId };
    },
    onSuccess: ({ processId, runeName }, etching, context) => {
      // Replace temp process with real one
      queryClient.setQueryData(
        etchingKeys.list(0n, 20n),
        (old: EtchingProcessView[] | undefined) => {
          if (!old) return [];
          return old.map((p) =>
            p.id === context.tempId ? { ...p, id: processId } : p
          );
        }
      );

      // Set as active process for monitoring
      setActiveProcessId(processId);

      // Start polling this process
      queryClient.invalidateQueries({ queryKey: etchingKeys.detail(processId) });
      queryClient.invalidateQueries({ queryKey: etchingKeys.metrics() });

      toast.success(`Etching started for ${runeName}!`, {
        id: context?.toastId,
        description: `Process ID: ${processId.slice(0, 8)}...`,
        duration: 5000,
      });
    },
    onError: (error: Error, etching, context) => {
      // Rollback optimistic update
      if (context?.previousProcesses) {
        queryClient.setQueryData(etchingKeys.list(0n, 20n), context.previousProcesses);
      }

      toast.error(`Failed to etch ${etching.rune_name}`, {
        id: context?.toastId,
        description: error.message,
      });
    },
  });
}

/**
 * Mutation: Retry failed etching
 */
export function useRetryEtchingMutation() {
  const { retryFailedEtching } = useRuneEngine();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (processId: string) => {
      const success = await retryFailedEtching(processId);
      if (!success) {
        throw new Error('Failed to retry etching');
      }
      return processId;
    },
    onMutate: (processId) => {
      toast.loading('Retrying etching process...', { id: `retry-${processId}` });
    },
    onSuccess: (processId) => {
      queryClient.invalidateQueries({ queryKey: etchingKeys.detail(processId) });
      queryClient.invalidateQueries({ queryKey: etchingKeys.lists() });

      toast.success('Etching retry started!', {
        id: `retry-${processId}`,
        description: 'The process will attempt to complete again.',
      });
    },
    onError: (error: Error, processId) => {
      toast.error('Retry failed', {
        id: `retry-${processId}`,
        description: error.message,
      });
    },
  });
}

/**
 * Mutation: Update fee rate
 */
export function useUpdateFeeRateMutation() {
  const { updateFeeRate } = useRuneEngine();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feeRate: bigint) => {
      const success = await updateFeeRate(feeRate);
      if (!success) {
        throw new Error('Failed to update fee rate');
      }
      return feeRate;
    },
    onMutate: () => {
      toast.loading('Updating fee rate...', { id: 'update-fee' });
    },
    onSuccess: (feeRate) => {
      queryClient.invalidateQueries({ queryKey: etchingKeys.config() });

      toast.success('Fee rate updated!', {
        id: 'update-fee',
        description: `New rate: ${feeRate} sat/vB`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update fee rate', {
        id: 'update-fee',
        description: error.message,
      });
    },
  });
}

/**
 * Hook: Monitor active processes with real-time updates
 * FIXED: No longer violates Rules of Hooks - uses QueryClient instead
 */
export function useActiveProcessesMonitor() {
  const queryClient = useQueryClient();
  const { getActiveProcesses } = useEtchingStore();
  const activeProcesses = getActiveProcesses();

  // Get query states from QueryClient instead of calling hooks in a loop
  const getProcessQueryState = (processId: string) => {
    return queryClient.getQueryState(etchingKeys.detail(processId));
  };

  const getProcessData = (processId: string) => {
    return queryClient.getQueryData<EtchingProcessView | null>(etchingKeys.detail(processId));
  };

  // Compute loading and error states from query cache
  const queryStates = activeProcesses.map((process) => ({
    processId: process.id,
    state: getProcessQueryState(process.id),
    data: getProcessData(process.id),
  }));

  return {
    activeProcesses,
    queryStates,
    totalActive: activeProcesses.length,
    isAnyLoading: queryStates.some((qs) => qs.state?.status === 'pending'),
    hasErrors: queryStates.some((qs) => qs.state?.status === 'error'),
    // Utility functions
    getProcessStatus: getProcessData,
    refetchProcess: (processId: string) =>
      queryClient.refetchQueries({ queryKey: etchingKeys.detail(processId) }),
  };
}
