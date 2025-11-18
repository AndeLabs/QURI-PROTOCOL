/**
 * QURI Protocol - Bitcoin Confirmation Tracker
 * 
 * Monitors Bitcoin transactions and updates process confirmations in real-time.
 * 
 * Features:
 * - Polling-based confirmation tracking
 * - Exponential backoff for confirmed transactions
 * - Automatic cleanup of stale processes
 * - WebSocket support (future)
 */

import { useQURIStore } from './useQURIStore';
import type { EtchingProcess } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const POLLING_INTERVALS = {
  PENDING: 10_000,      // 10s - waiting for broadcast
  BROADCASTING: 5_000,  // 5s - just broadcast
  CONFIRMING: 30_000,   // 30s - waiting for confirmations
  CONFIRMED: 300_000,   // 5m - confirmed, slow polling
} as const;

const MAX_CONFIRMATIONS = 6;
const STALE_PROCESS_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// TRACKER STATE
// ============================================================================

interface TrackerState {
  timers: Map<string, NodeJS.Timeout>;
  lastChecked: Map<string, number>;
  isTracking: boolean;
}

const trackerState: TrackerState = {
  timers: new Map(),
  lastChecked: new Map(),
  isTracking: false,
};

// ============================================================================
// BITCOIN API CLIENT
// ============================================================================

/**
 * Fetch transaction confirmations from Bitcoin API
 * Uses multiple fallback endpoints for reliability
 */
async function fetchConfirmations(txHash: string): Promise<number> {
  const endpoints = [
    `https://blockstream.info/api/tx/${txHash}`,
    `https://mempool.space/api/tx/${txHash}`,
    `https://blockchain.info/rawtx/${txHash}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      if (!response.ok) continue;

      const data = await response.json();
      
      // Different APIs have different response formats
      if (data.status?.confirmed) {
        // Blockstream/Mempool format
        if (!data.status.block_height) return 0;
        
        // Fetch current block height
        const heightResponse = await fetch('https://blockstream.info/api/blocks/tip/height');
        const currentHeight = await heightResponse.json();
        
        return currentHeight - data.status.block_height + 1;
      } else if (data.block_height) {
        // Blockchain.info format
        const heightResponse = await fetch('https://blockchain.info/q/getblockcount');
        const currentHeight = await heightResponse.json();
        
        return currentHeight - data.block_height + 1;
      }
      
      // Transaction in mempool
      return 0;
    } catch (error) {
      console.warn(`Failed to fetch from ${endpoint}:`, error);
      continue;
    }
  }

  throw new Error(`Failed to fetch confirmations for ${txHash} from all endpoints`);
}

/**
 * Check if transaction exists in mempool or blockchain
 */
async function transactionExists(txHash: string): Promise<boolean> {
  try {
    const response = await fetch(`https://blockstream.info/api/tx/${txHash}`);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// TRACKER CORE
// ============================================================================

/**
 * Update confirmations for a single process
 */
async function updateProcessConfirmations(process: EtchingProcess): Promise<void> {
  const store = useQURIStore.getState();

  try {
    // Skip if no tx_hash yet
    if (!process.tx_hash) {
      return;
    }

    // Check if transaction exists
    const exists = await transactionExists(process.tx_hash);
    if (!exists) {
      // Transaction not found - might still be broadcasting
      if (process.status === 'confirming') {
        store.updateProcess(process.id, {
          status: 'broadcasting',
          error: 'Transaction not found in mempool',
        });
      }
      return;
    }

    // Fetch current confirmations
    const confirmations = await fetchConfirmations(process.tx_hash);
    
    // Update process
    if (confirmations !== process.confirmations) {
      store.updateProcess(process.id, {
        confirmations,
        status: confirmations === 0 ? 'confirming' :
                confirmations >= MAX_CONFIRMATIONS ? 'confirmed' : 'confirming',
      });

      console.log(`📦 Process ${process.id}: ${confirmations}/${MAX_CONFIRMATIONS} confirmations`);
    }

    // Track last check time
    trackerState.lastChecked.set(process.id, Date.now());
  } catch (error) {
    console.error(`Failed to update confirmations for ${process.id}:`, error);
    
    // Don't mark as failed immediately - might be temporary network issue
    const lastCheck = trackerState.lastChecked.get(process.id) || process.created_at;
    const timeSinceLastCheck = Date.now() - lastCheck;
    
    if (timeSinceLastCheck > STALE_PROCESS_TIMEOUT) {
      store.updateProcess(process.id, {
        status: 'failed',
        error: 'Confirmation tracking timeout',
      });
    }
  }
}

/**
 * Schedule next check for a process based on its status
 */
function scheduleNextCheck(process: EtchingProcess): void {
  // Clear existing timer
  const existingTimer = trackerState.timers.get(process.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Don't schedule if confirmed or failed
  if (process.status === 'confirmed' || process.status === 'failed') {
    trackerState.timers.delete(process.id);
    return;
  }

  // Determine polling interval
  let interval: number;
  switch (process.status) {
    case 'pending':
    case 'signing':
      interval = POLLING_INTERVALS.PENDING;
      break;
    case 'broadcasting':
      interval = POLLING_INTERVALS.BROADCASTING;
      break;
    case 'confirming':
      interval = process.confirmations >= MAX_CONFIRMATIONS 
        ? POLLING_INTERVALS.CONFIRMED 
        : POLLING_INTERVALS.CONFIRMING;
      break;
    default:
      interval = POLLING_INTERVALS.PENDING;
  }

  // Schedule next check
  const timer = setTimeout(async () => {
    await updateProcessConfirmations(process);
    
    // Re-schedule if still tracking
    if (trackerState.isTracking) {
      const updatedProcess = useQURIStore.getState().getProcessById(process.id);
      if (updatedProcess) {
        scheduleNextCheck(updatedProcess);
      }
    }
  }, interval);

  trackerState.timers.set(process.id, timer);
}

/**
 * Start tracking confirmations for active processes
 */
export function startConfirmationTracking(): void {
  if (trackerState.isTracking) {
    console.warn('Confirmation tracking already started');
    return;
  }

  trackerState.isTracking = true;
  console.log('🚀 Starting Bitcoin confirmation tracking...');

  // Get all active processes
  const store = useQURIStore.getState();
  const activeProcesses = store.getActiveProcesses();

  // Start tracking each process
  activeProcesses.forEach(process => {
    scheduleNextCheck(process);
  });

  console.log(`📡 Tracking ${activeProcesses.length} active processes`);
}

/**
 * Stop tracking confirmations
 */
export function stopConfirmationTracking(): void {
  if (!trackerState.isTracking) {
    return;
  }

  trackerState.isTracking = false;
  console.log('🛑 Stopping Bitcoin confirmation tracking...');

  // Clear all timers
  trackerState.timers.forEach(timer => clearTimeout(timer));
  trackerState.timers.clear();
  trackerState.lastChecked.clear();
}

/**
 * Track a specific process
 */
export function trackProcess(processId: string): void {
  const store = useQURIStore.getState();
  const process = store.getProcessById(processId);

  if (!process) {
    console.error(`Process ${processId} not found`);
    return;
  }

  if (!trackerState.isTracking) {
    startConfirmationTracking();
  }

  scheduleNextCheck(process);
  console.log(`👀 Now tracking process: ${processId}`);
}

/**
 * Stop tracking a specific process
 */
export function untrackProcess(processId: string): void {
  const timer = trackerState.timers.get(processId);
  if (timer) {
    clearTimeout(timer);
    trackerState.timers.delete(processId);
    trackerState.lastChecked.delete(processId);
    console.log(`👋 Stopped tracking process: ${processId}`);
  }
}

/**
 * Force update confirmations for a process (bypass interval)
 */
export async function forceUpdateConfirmations(processId: string): Promise<void> {
  const store = useQURIStore.getState();
  const process = store.getProcessById(processId);

  if (!process) {
    throw new Error(`Process ${processId} not found`);
  }

  await updateProcessConfirmations(process);
}

/**
 * Get tracking status
 */
export function getTrackingStatus() {
  return {
    isTracking: trackerState.isTracking,
    activeTracking: trackerState.timers.size,
    processes: Array.from(trackerState.timers.keys()),
  };
}

/**
 * Cleanup stale processes
 */
export function cleanupStaleProcesses(): void {
  const store = useQURIStore.getState();
  const now = Date.now();

  Object.values(store.entities.processes).forEach(process => {
    const age = now - process.created_at;
    
    if (age > STALE_PROCESS_TIMEOUT && process.status !== 'confirmed') {
      console.log(`🗑️ Cleaning up stale process: ${process.id}`);
      
      store.updateProcess(process.id, {
        status: 'failed',
        error: 'Process timeout - exceeded 24 hours',
      });
      
      untrackProcess(process.id);
    }
  });
}

// ============================================================================
// REACT HOOK
// ============================================================================

/**
 * Hook to use confirmation tracking in React components
 */
export function useConfirmationTracking() {
  return {
    start: startConfirmationTracking,
    stop: stopConfirmationTracking,
    track: trackProcess,
    untrack: untrackProcess,
    forceUpdate: forceUpdateConfirmations,
    status: getTrackingStatus,
    cleanup: cleanupStaleProcesses,
  };
}

// ============================================================================
// AUTO-START (if processes exist in store)
// ============================================================================

if (typeof window !== 'undefined') {
  // Auto-start tracking on page load if there are active processes
  const store = useQURIStore.getState();
  const activeProcesses = store.getActiveProcesses();
  
  if (activeProcesses.length > 0) {
    console.log(`🔄 Auto-starting confirmation tracking for ${activeProcesses.length} processes`);
    startConfirmationTracking();
  }

  // Cleanup stale processes every hour
  setInterval(cleanupStaleProcesses, 60 * 60 * 1000);
}
