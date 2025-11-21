/**
 * Settlement Types for QURI Protocol
 * Production-ready types for Bitcoin settlement system
 */

import type { BitcoinAddressType, BitcoinNetwork } from '@/lib/utils/bitcoin';

// ============================================================================
// RUNE STATES
// ============================================================================

export type RuneState = 'draft' | 'virtual' | 'pending' | 'native';

export interface RuneStateInfo {
  state: RuneState;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
}

export const RUNE_STATES: Record<RuneState, RuneStateInfo> = {
  draft: {
    state: 'draft',
    label: 'Draft',
    description: 'Metadata only - not yet created',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: '🔵',
  },
  virtual: {
    state: 'virtual',
    label: 'Virtual',
    description: 'Active on QURI - Tradeable',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: '🟡',
  },
  pending: {
    state: 'pending',
    label: 'Pending',
    description: 'Settlement in progress',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    icon: '🟠',
  },
  native: {
    state: 'native',
    label: 'Native',
    description: 'Bitcoin native - Verified on-chain',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: '🟢',
  },
};

// ============================================================================
// SETTLEMENT MODES
// ============================================================================

export type SettlementMode = 'instant' | 'batched' | 'scheduled' | 'manual';

export interface SettlementModeInfo {
  mode: SettlementMode;
  label: string;
  description: string;
  feeRange: string;
  timeEstimate: string;
  recommended?: boolean;
}

export const SETTLEMENT_MODES: Record<SettlementMode, SettlementModeInfo> = {
  instant: {
    mode: 'instant',
    label: 'Instant',
    description: 'Next block confirmation',
    feeRange: '$1.50 - $2.00',
    timeEstimate: '~10 minutes',
  },
  batched: {
    mode: 'batched',
    label: 'Batched',
    description: 'Grouped with other settlements',
    feeRange: '$0.15 - $0.50',
    timeEstimate: '1-6 hours',
    recommended: true,
  },
  scheduled: {
    mode: 'scheduled',
    label: 'Scheduled',
    description: 'Low-fee window',
    feeRange: '$0.05 - $0.15',
    timeEstimate: '6-24 hours',
  },
  manual: {
    mode: 'manual',
    label: 'Manual',
    description: 'Choose your own fee',
    feeRange: 'Custom',
    timeEstimate: 'Varies',
  },
};

// ============================================================================
// SAVED ADDRESSES
// ============================================================================

export interface SavedAddress {
  id: string;
  address: string;
  label: string;
  type: BitcoinAddressType;
  network: BitcoinNetwork;
  isPrimary: boolean;
  createdAt: number;
  lastUsedAt: number;
  useCount: number;
}

// ============================================================================
// SETTLEMENT REQUEST
// ============================================================================

export interface SettlementRequest {
  runeKey: {
    block: bigint;
    tx: number;
  };
  runeName: string;
  amount: bigint;
  destinationAddress: string;
  mode: SettlementMode;
  customFeeRate?: number; // sat/vB for manual mode
}

export interface SettlementEstimate {
  networkFee: bigint;
  serviceFee: bigint;
  totalFee: bigint;
  feeRate: number;
  estimatedTime: string;
  batchSize?: number;
}

export interface SettlementResult {
  success: boolean;
  txid?: string;
  error?: string;
  estimatedConfirmationTime?: string;
}

// ============================================================================
// SETTLEMENT STATUS
// ============================================================================

export type SettlementStatus =
  | 'queued'
  | 'batching'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'failed';

export interface SettlementStatusInfo {
  status: SettlementStatus;
  label: string;
  description: string;
}

export const SETTLEMENT_STATUSES: Record<SettlementStatus, SettlementStatusInfo> = {
  queued: {
    status: 'queued',
    label: 'Queued',
    description: 'Waiting for batch',
  },
  batching: {
    status: 'batching',
    label: 'Batching',
    description: 'Grouping with other settlements',
  },
  signing: {
    status: 'signing',
    label: 'Signing',
    description: 'Creating signatures',
  },
  broadcasting: {
    status: 'broadcasting',
    label: 'Broadcasting',
    description: 'Sending to Bitcoin network',
  },
  confirming: {
    status: 'confirming',
    label: 'Confirming',
    description: 'Waiting for confirmations',
  },
  confirmed: {
    status: 'confirmed',
    label: 'Confirmed',
    description: 'Settlement complete',
  },
  failed: {
    status: 'failed',
    label: 'Failed',
    description: 'Settlement failed',
  },
};

// ============================================================================
// FEE ESTIMATES
// ============================================================================

export interface FeeEstimate {
  feeRate: number; // sat/vB
  totalFee: number; // sats
  usdValue: number;
  timeEstimate: string;
}

export interface FeeEstimates {
  instant: FeeEstimate;
  batched: FeeEstimate;
  scheduled: FeeEstimate;
  current: {
    slow: number;
    medium: number;
    fast: number;
  };
}

// ============================================================================
// SETTLEMENT HISTORY
// ============================================================================

export interface SettlementHistoryItem {
  id: string;
  runeKey: {
    block: bigint;
    tx: number;
  };
  runeName: string;
  amount: bigint;
  destinationAddress: string;
  mode: SettlementMode;
  status: SettlementStatus;
  txid?: string;
  createdAt: number;
  updatedAt: number;
  confirmations?: number;
}
