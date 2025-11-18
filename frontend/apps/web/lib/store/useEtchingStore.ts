/**
 * Zustand Store for Etching Processes
 * Manages active etching processes and their states
 */

import { create } from 'zustand';
import type { EtchingProcessView } from '@/types/canisters';

interface EtchingState {
  // Active processes
  processes: Map<string, EtchingProcessView>;

  // UI state
  activeProcessId: string | null;
  showOnlyActive: boolean;

  // Actions - Process management
  addProcess: (process: EtchingProcessView) => void;
  addProcesses: (processes: EtchingProcessView[]) => void;
  updateProcess: (id: string, process: EtchingProcessView) => void;
  getProcess: (id: string) => EtchingProcessView | undefined;
  removeProcess: (id: string) => void;
  clearProcesses: () => void;

  // Actions - UI
  setActiveProcessId: (id: string | null) => void;
  setShowOnlyActive: (show: boolean) => void;

  // Computed
  shouldPoll: (id: string) => boolean;
  getActiveProcesses: () => EtchingProcessView[];
  getCompletedProcesses: () => EtchingProcessView[];
  getFailedProcesses: () => EtchingProcessView[];
  getTotalProcesses: () => number;
}

/**
 * Process states that should be polled
 */
const ACTIVE_STATES = [
  'Pending',
  'SelectingUtxos',
  'BuildingTransaction',
  'SigningTransaction',
  'Broadcasting',
  'AwaitingConfirmation',
];

/**
 * Final process states
 */
const FINAL_STATES = ['Completed', 'Failed', 'Cancelled'];

export const useEtchingStore = create<EtchingState>((set, get) => ({
  // Initial state
  processes: new Map(),
  activeProcessId: null,
  showOnlyActive: true,

  // Process management
  addProcess: (process) =>
    set((state) => {
      const newProcesses = new Map(state.processes);
      newProcesses.set(process.id, process);
      return { processes: newProcesses };
    }),

  addProcesses: (newProcesses) =>
    set((state) => {
      const processMap = new Map(state.processes);
      newProcesses.forEach((process) => {
        processMap.set(process.id, process);
      });
      return { processes: processMap };
    }),

  updateProcess: (id, process) =>
    set((state) => {
      const newProcesses = new Map(state.processes);
      newProcesses.set(id, process);
      return { processes: newProcesses };
    }),

  getProcess: (id) => get().processes.get(id),

  removeProcess: (id) =>
    set((state) => {
      const newProcesses = new Map(state.processes);
      newProcesses.delete(id);
      return { processes: newProcesses };
    }),

  clearProcesses: () => set({ processes: new Map() }),

  // UI
  setActiveProcessId: (id) => set({ activeProcessId: id }),

  setShowOnlyActive: (show) => set({ showOnlyActive: show }),

  // Computed
  shouldPoll: (id) => {
    const process = get().processes.get(id);
    if (!process) return false;

    // Poll if not in final state
    return !FINAL_STATES.includes(process.state);
  },

  getActiveProcesses: () => {
    const { processes } = get();
    return Array.from(processes.values()).filter((process) =>
      ACTIVE_STATES.includes(process.state)
    );
  },

  getCompletedProcesses: () => {
    const { processes } = get();
    return Array.from(processes.values()).filter(
      (process) => process.state === 'Completed'
    );
  },

  getFailedProcesses: () => {
    const { processes } = get();
    return Array.from(processes.values()).filter(
      (process) => process.state === 'Failed'
    );
  },

  getTotalProcesses: () => get().processes.size,
}));
