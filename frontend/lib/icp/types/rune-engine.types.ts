/**
 * Rune Engine Canister - Complete TypeScript Types
 * Auto-generated from rune_engine.did
 *
 * This file contains ALL types and interfaces for the Rune Engine canister
 * with full type safety and documentation.
 */

import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

// ============================================================================
// ENUMS & VARIANTS
// ============================================================================

export type BitcoinNetwork =
  | { Mainnet: null }
  | { Testnet: null }
  | { Regtest: null };

export type Role =
  | { Owner: null }
  | { Admin: null }
  | { Operator: null }
  | { User: null };

export type LogLevel =
  | { Debug: null }
  | { Info: null }
  | { Warn: null }
  | { Error: null };

export type CyclesStatus =
  | { Critical: null }
  | { Warning: null }
  | { Low: null }
  | { Healthy: null };

export type Result<T = null> =
  | { Ok: T }
  | { Err: string };

// ============================================================================
// CORE TYPES
// ============================================================================

export interface MintTerms {
  amount: bigint;
  cap: bigint;
  height_start: [] | [bigint];
  height_end: [] | [bigint];
  offset_start: [] | [bigint];
  offset_end: [] | [bigint];
}

export interface RuneEtching {
  rune_name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  terms: [] | [MintTerms];
}

export interface EtchingProcessView {
  id: string;
  rune_name: string;
  state: string;
  created_at: bigint;
  updated_at: bigint;
  retry_count: number;
  txid: [] | [string];
}

export interface EtchingConfigView {
  network: BitcoinNetwork;
  fee_rate: bigint;
  required_confirmations: number;
  enable_retries: boolean;
}

export interface HealthStatus {
  healthy: boolean;
  etching_config_initialized: boolean;
  bitcoin_integration_configured: boolean;
  registry_configured: boolean;
  canister_id: Principal;
}

// ============================================================================
// RBAC TYPES
// ============================================================================

export interface RoleAssignment {
  target: Principal;
  role: Role;
  granted_at: bigint;
  granted_by: Principal;
}

// ============================================================================
// BITCOIN TYPES
// ============================================================================

export interface BlockHeightInfo {
  height: bigint;
  network: BitcoinNetwork;
  age_seconds: bigint;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

export interface MetricsSummary {
  total_runes_created: bigint;
  total_errors: bigint;
  success_rate_percent: number;
  avg_etching_latency_ms: bigint;
  active_processes: number;
  pending_processes: number;
}

export interface ErrorBreakdown {
  validation_errors: bigint;
  balance_errors: bigint;
  utxo_errors: bigint;
  signing_errors: bigint;
  broadcast_errors: bigint;
  confirmation_errors: bigint;
  unknown_errors: bigint;
}

export interface PerformanceMetrics {
  total_runes_created: bigint;
  total_errors: bigint;
  total_retries: bigint;
  total_confirmations_tracked: bigint;
  errors_by_type: ErrorBreakdown;
  avg_etching_latency_ns: bigint;
  avg_signing_latency_ns: bigint;
  avg_broadcast_latency_ns: bigint;
  active_processes: number;
  pending_processes: number;
  last_updated: bigint;
}

export interface LatencyPercentiles {
  p50: bigint;
  p90: bigint;
  p95: bigint;
  p99: bigint;
  min: bigint;
  max: bigint;
  count: bigint;
}

// ============================================================================
// LOGGING TYPES
// ============================================================================

export interface LogEntry {
  id: bigint;
  level: LogLevel;
  message: string;
  caller: [] | [Principal];
  module: string;
  context: [] | [string];
  timestamp: bigint;
}

export interface LogStats {
  total_errors: bigint;
  total_warns: bigint;
  total_infos: bigint;
  total_debugs: bigint;
  last_error_timestamp: [] | [bigint];
}

// ============================================================================
// CYCLES TYPES
// ============================================================================

export interface CyclesSnapshot {
  balance: bigint;
  status: CyclesStatus;
  timestamp: bigint;
}

export interface CyclesMetrics {
  current_balance: bigint;
  status: CyclesStatus;
  burn_rate_per_second: bigint;
  time_until_depletion_seconds: [] | [bigint];
  last_check: bigint;
  total_snapshots: bigint;
}

// ============================================================================
// ACTOR INTERFACE
// ============================================================================

export interface RuneEngineActor {
  // Main etching API
  create_rune: ActorMethod<[RuneEtching], Result<string>>;

  // Query APIs - Status & History
  get_etching_status: ActorMethod<[string], [] | [EtchingProcessView]>;
  get_my_etchings: ActorMethod<[], EtchingProcessView[]>;
  health_check: ActorMethod<[], HealthStatus>;

  // Bitcoin block height tracking
  get_bitcoin_block_height: ActorMethod<[], [] | [bigint]>;
  get_block_height_info: ActorMethod<[], Result<[] | [BlockHeightInfo]>>;

  // Performance metrics
  get_metrics_summary: ActorMethod<[], MetricsSummary>;
  get_performance_metrics: ActorMethod<[], Result<PerformanceMetrics>>;
  get_latency_percentiles: ActorMethod<[string], Result<[] | [LatencyPercentiles]>>;

  // Logging APIs
  get_recent_logs: ActorMethod<[bigint], Result<LogEntry[]>>;
  get_recent_errors: ActorMethod<[bigint], Result<LogEntry[]>>;
  get_log_stats: ActorMethod<[], LogStats>;
  search_logs: ActorMethod<[string, bigint], Result<LogEntry[]>>;

  // Cycles monitoring
  get_cycles_metrics: ActorMethod<[], CyclesMetrics>;
  get_cycles_history: ActorMethod<[], Result<CyclesSnapshot[]>>;

  // Configuration APIs (admin only)
  configure_canisters: ActorMethod<[Principal, Principal], Result>;
  update_etching_config: ActorMethod<[EtchingConfigView], Result>;

  // RBAC Management
  grant_role: ActorMethod<[Principal, Role], Result>;
  revoke_role: ActorMethod<[Principal], Result>;
  get_my_role: ActorMethod<[], Role>;
  get_user_role: ActorMethod<[Principal], Result<Role>>;
  list_roles: ActorMethod<[], Result<RoleAssignment[]>>;
  get_owner: ActorMethod<[], [] | [Principal]>;

  // Maintenance
  cleanup_old_processes: ActorMethod<[bigint], Result<bigint>>;
}

// ============================================================================
// UTILITY TYPES FOR FRONTEND
// ============================================================================

/** Simplified Rune creation params for forms */
export interface CreateRuneParams {
  name: string;
  symbol: string;
  divisibility: number;
  premine: number;
  mintTerms?: {
    amount: number;
    cap: number;
    heightStart?: number;
    heightEnd?: number;
    offsetStart?: number;
    offsetEnd?: number;
  };
}

/** Processed etching process for UI display */
export interface RuneProcess {
  id: string;
  name: string;
  state: 'pending' | 'validating' | 'signing' | 'broadcasting' | 'confirming' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  retryCount: number;
  txid?: string;
}

/** Network name for display */
export type NetworkName = 'mainnet' | 'testnet' | 'regtest';

/** Role name for display */
export type RoleName = 'owner' | 'admin' | 'operator' | 'user';

/** Log level name for display */
export type LogLevelName = 'debug' | 'info' | 'warn' | 'error';

/** Cycles status for display */
export type CyclesStatusName = 'critical' | 'warning' | 'low' | 'healthy';
