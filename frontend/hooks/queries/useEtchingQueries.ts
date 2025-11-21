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
  myEtchings: () => [...etchingKeys.all, 'my'] as const,
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
        updateProcess(processId, status);
      }
      return status;
    },
    enabled: !!processId,
    refetchInterval: (query) => {
      if (!processId || !query.state.data) return false;
      return shouldPoll(processId) ? 5000 : false;
    },
    refetchIntervalInBackground: true,
  });
}

/**
 * Query: Get my etchings
 */
export function useMyEtchingsQuery() {
  const { getMyEtchings } = useRuneEngine();
  const { addProcesses } = useEtchingStore();

  return useQuery({
    queryKey: etchingKeys.myEtchings(),
    queryFn: async () => {
      const processes = await getMyEtchings();
      if (processes && processes.length > 0) {
        addProcesses(processes);
      }
      return processes || [];
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Query: Get health status
 */
export function useHealthQuery() {
  const { healthCheck } = useRuneEngine();

  return useQuery({
    queryKey: etchingKeys.health(),
    queryFn: healthCheck,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Query: Get metrics summary
 */
export function useMetricsSummaryQuery() {
  const { getMetricsSummary } = useRuneEngine();

  return useQuery({
    queryKey: etchingKeys.metrics(),
    queryFn: getMetricsSummary,
    staleTime: 1 * 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Mutation: Etch a new Rune
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

      await queryClient.cancelQueries({ queryKey: etchingKeys.myEtchings() });
      const previousProcesses = queryClient.getQueryData(etchingKeys.myEtchings());

      const tempId = `temp-${Date.now()}`;
      const optimisticProcess: EtchingProcessView = {
        id: tempId,
        rune_name: etching.rune_name,
        state: 'Pending',
        created_at: BigInt(Date.now() * 1_000_000),
        updated_at: BigInt(Date.now() * 1_000_000),
        retry_count: 0,
        txid: [],
      };

      queryClient.setQueryData(
        etchingKeys.myEtchings(),
        (old: EtchingProcessView[] | undefined) => {
          if (!old) return [optimisticProcess];
          return [optimisticProcess, ...old];
        }
      );

      addProcess(optimisticProcess);

      return { toastId, previousProcesses, tempId };
    },
    onSuccess: ({ processId, runeName }, _etching, context) => {
      queryClient.setQueryData(
        etchingKeys.myEtchings(),
        (old: EtchingProcessView[] | undefined) => {
          if (!old) return [];
          return old.map((p) =>
            p.id === context?.tempId ? { ...p, id: processId } : p
          );
        }
      );

      setActiveProcessId(processId);

      queryClient.invalidateQueries({ queryKey: etchingKeys.detail(processId) });
      queryClient.invalidateQueries({ queryKey: etchingKeys.metrics() });

      toast.success(`Etching started for ${runeName}!`, {
        id: context?.toastId,
        description: `Process ID: ${processId.slice(0, 8)}...`,
        duration: 5000,
      });
    },
    onError: (error: Error, etching, context) => {
      if (context?.previousProcesses) {
        queryClient.setQueryData(etchingKeys.myEtchings(), context.previousProcesses);
      }

      toast.error(`Failed to etch ${etching.rune_name}`, {
        id: context?.toastId,
        description: error.message,
      });
    },
  });
}

/**
 * Hook: Monitor active processes
 */
export function useActiveProcessesMonitor() {
  const queryClient = useQueryClient();
  const { getActiveProcesses } = useEtchingStore();
  const activeProcesses = getActiveProcesses();

  const getProcessQueryState = (processId: string) => {
    return queryClient.getQueryState(etchingKeys.detail(processId));
  };

  const getProcessData = (processId: string) => {
    return queryClient.getQueryData<EtchingProcessView | null>(etchingKeys.detail(processId));
  };

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
    getProcessStatus: getProcessData,
    refetchProcess: (processId: string) =>
      queryClient.refetchQueries({ queryKey: etchingKeys.detail(processId) }),
  };
}
