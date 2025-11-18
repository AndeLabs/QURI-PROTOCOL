/**
 * Complete TypeScript types for all QURI Protocol canisters
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export type BitcoinNetwork = { Mainnet: null } | { Testnet: null } | { Regtest: null };
export type Result<T, E = string> = { Ok: T } | { Err: E };

// ============================================================================
// SHARED RUNE TYPES
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

// ============================================================================
// RUNE ENGINE TYPES
// ============================================================================

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
  canister_id: string;
}

export type Role = { Owner: null } | { Admin: null } | { Operator: null } | { User: null };

export interface RoleAssignment {
  target: string;
  role: Role;
  granted_at: bigint;
  granted_by: string;
}

export interface BlockHeightInfo {
  height: bigint;
  network: BitcoinNetwork;
  age_seconds: bigint;
}

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
}

export interface CyclesMetrics {
  balance: bigint;
  burn_rate_per_day: bigint;
  days_remaining: bigint;
}

// ============================================================================
// BITCOIN INTEGRATION TYPES
// ============================================================================

export interface BitcoinAddress {
  address: string;
  derivation_path: Array<Uint8Array>;
}

export interface FeeEstimates {
  slow: bigint;
  medium: bigint;
  fast: bigint;
}

export interface Outpoint {
  txid: Uint8Array;
  vout: number;
}

export interface Utxo {
  outpoint: Outpoint;
  value: bigint;
  height: number;
}

export interface UtxoSelection {
  selected: Array<Utxo>;
  total_value: bigint;
  estimated_fee: bigint;
  change: bigint;
}

// ============================================================================
// REGISTRY TYPES
// ============================================================================

export interface RuneKey {
  block: bigint;
  tx: number;
}

export interface RuneId {
  block: bigint;
  tx: bigint;
  name: string;
  timestamp: bigint;
}

export interface RuneMetadata {
  key: RuneKey;
  name: string;
  symbol: string;
  divisibility: number;
  creator: string;
  created_at: bigint;
  total_supply: bigint;
  premine: bigint;
  terms: [] | [MintTerms];
}

export interface BondingCurve {
  initial_price: bigint;
  target_market_cap: bigint;
  current_supply: bigint;
  graduated_to_amm: boolean;
}

export interface RegistryEntry {
  metadata: RuneMetadata;
  bonding_curve: [] | [BondingCurve];
  trading_volume_24h: bigint;
  holder_count: bigint;
  indexed_at: bigint;
}

export interface RegistryStats {
  total_runes: bigint;
  total_volume_24h: bigint;
  status: string;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export type SortOrder = { Asc: null } | { Desc: null };

export type RuneSortBy =
  | { Block: null }
  | { Name: null }
  | { Volume: null }
  | { Holders: null }
  | { IndexedAt: null };

export interface Page {
  offset: bigint;
  limit: bigint;
  sort_by: [] | [RuneSortBy];
  sort_order: [] | [SortOrder];
}

export interface PagedResponse<T> {
  items: T[];
  total: bigint;
  offset: bigint;
  limit: bigint;
  has_more: boolean;
}

// ============================================================================
// IDENTITY MANAGER TYPES
// ============================================================================

export type PermissionType = { CreateRune: null } | { Transfer: null };

export interface SessionPermissions {
  can_transfer: boolean;
  can_create_rune: boolean;
  max_amount: bigint;
}

export interface UserSession {
  permissions: SessionPermissions;
  principal: string;
  session_key: Uint8Array;
  expires_at: bigint;
}

export interface UserStats {
  runes_created: bigint;
  joined_at: bigint;
  total_volume: bigint;
}

// ============================================================================
// CANISTER SERVICE INTERFACES
// ============================================================================

export interface RuneEngineService {
  // Core etching operations
  etch_rune: (etching: RuneEtching) => Promise<Result<string>>;
  get_etching_status: (process_id: string) => Promise<[] | [EtchingProcessView]>;
  list_processes: (offset: bigint, limit: bigint) => Promise<EtchingProcessView[]>;
  retry_failed_etching: (id: string) => Promise<Result<null>>;

  // Configuration
  get_etching_config: () => Promise<EtchingConfigView>;
  update_fee_rate: (fee_rate: bigint) => Promise<Result<null>>;
  configure_canisters: (
    bitcoin_integration_id: string,
    registry_id: string
  ) => Promise<Result<null>>;

  // Health & Monitoring
  health_check: () => Promise<HealthStatus>;
  get_metrics_summary: () => Promise<MetricsSummary>;
  get_performance_metrics: () => Promise<PerformanceMetrics>;
  get_cycles_metrics: () => Promise<CyclesMetrics>;

  // Bitcoin integration
  get_current_block_height: () => Promise<Result<BlockHeightInfo>>;

  // RBAC
  assign_role: (principal: string, role: Role) => Promise<Result<null>>;
  revoke_role: (principal: string) => Promise<Result<null>>;
  get_role: (principal: string) => Promise<[] | [Role]>;
  list_role_assignments: () => Promise<RoleAssignment[]>;
}

export interface BitcoinIntegrationService {
  // Address management
  get_p2tr_address: () => Promise<Result<BitcoinAddress>>;

  // Fee estimation
  get_fee_estimates: () => Promise<Result<FeeEstimates>>;

  // UTXO management
  select_utxos: (amount_needed: bigint, fee_rate: bigint) => Promise<Result<UtxoSelection>>;

  // Transaction operations
  build_and_sign_etching_tx: (
    etching: RuneEtching,
    utxo_selection: UtxoSelection
  ) => Promise<Result<Uint8Array>>;
  broadcast_transaction: (tx_bytes: Uint8Array) => Promise<Result<string>>;

  // Blockchain queries
  get_block_height: () => Promise<Result<bigint>>;

  // ckBTC operations
  get_ckbtc_balance: (principal: string) => Promise<Result<bigint>>;
}

// ============================================================================
// QURI BACKEND TYPES
// ============================================================================

export interface CreatedRune {
  id: string;
  creator: string;
  etching_data: RuneEtching;
  metadata: [] | [QuriRuneMetadata];
  etching_txid: [] | [string];
  created_at: bigint;
  payment_method: PaymentMethod;
  payment_amount: bigint;
  payment_block_index: [] | [bigint];
}

export interface QuriRuneMetadata {
  name: string;
  description: [] | [string];
  image: string;
  external_url: [] | [string];
  attributes: [] | [RuneAttribute[]];
}

export interface RuneAttribute {
  trait_type: string;
  value: AttributeValue;
}

export type AttributeValue = { String: string } | { Number: bigint };
export type PaymentMethod = { Bitcoin: null } | { CkBTC: null } | { ICP: null };

export interface CkBTCPayment {
  rune_id: string;
  payer: string;
  amount: bigint;
  block_index: bigint;
  timestamp: bigint;
  tx_type: PaymentType;
}

export type PaymentType = { RuneMint: null } | { StakingReward: null } | { Transfer: null };

export interface StakePosition {
  rune_id: string;
  staker: string;
  amount: bigint;
  staked_at: bigint;
  last_reward_claim: bigint;
  total_rewards_claimed: bigint;
}

export interface StakingPool {
  rune_id: string;
  total_staked: bigint;
  reward_rate: bigint;
  total_rewards_distributed: bigint;
  active_stakers: bigint;
}

export interface StakingStats {
  total_value_locked: bigint;
  total_rewards_distributed: bigint;
  total_stakers: bigint;
  total_pools: bigint;
}

export interface RewardCalculation {
  pending_rewards: bigint;
  time_staked: bigint;
  current_apy: number;
}

export interface OctopusRuneEntry {
  id: string;
  name: string;
  symbol: [] | [string];
  divisibility: number;
  total_supply: bigint;
  premine: bigint;
  block_height: bigint;
  txid: string;
}

export interface CanisterConfig {
  network: string;
  ckbtc_enabled: boolean;
  min_mint_fee_sats: bigint;
  admin: string;
}

export interface QuriBackendService {
  // Query methods
  get_rune: (rune_id: string) => Promise<[] | [CreatedRune]>;
  get_user_runes: (user: string) => Promise<CreatedRune[]>;
  get_all_runes: (offset: bigint, limit: bigint) => Promise<CreatedRune[]>;
  get_runes_count: () => Promise<bigint>;
  get_favorites: (user: string) => Promise<string[]>;
  get_rune_payments: (rune_id: string) => Promise<CkBTCPayment[]>;
  get_user_payments: (user: string) => Promise<CkBTCPayment[]>;
  get_config: () => Promise<CanisterConfig>;

  // Staking queries
  get_stake: (rune_id: string) => Promise<[] | [StakePosition]>;
  get_user_all_stakes: () => Promise<StakePosition[]>;
  get_pool: (rune_id: string) => Promise<[] | [StakingPool]>;
  get_all_staking_pools: () => Promise<StakingPool[]>;
  get_global_staking_stats: () => Promise<StakingStats>;
  calculate_pending_rewards: (rune_id: string) => Promise<Result<RewardCalculation>>;

  // Update methods - Rune creation
  mint_rune_with_ckbtc: (
    etching_data: RuneEtching,
    metadata: [] | [QuriRuneMetadata],
    ckbtc_amount: bigint
  ) => Promise<Result<string>>;
  mint_rune_with_bitcoin: (
    etching_data: RuneEtching,
    metadata: [] | [QuriRuneMetadata],
    bitcoin_txid: string
  ) => Promise<Result<string>>;

  // Update methods - Favorites
  add_favorite: (rune_id: string) => Promise<Result<null>>;
  remove_favorite: (rune_id: string) => Promise<Result<null>>;

  // Update methods - Verification
  verify_rune_on_chain: (rune_id: string) => Promise<Result<OctopusRuneEntry>>;

  // Update methods - Staking
  stake: (rune_id: string, amount: bigint) => Promise<Result<StakePosition>>;
  unstake: (rune_id: string, amount: bigint) => Promise<Result<[bigint, bigint]>>;
  claim_staking_rewards: (rune_id: string) => Promise<Result<bigint>>;

  // Update methods - Admin
  update_config: (new_config: CanisterConfig) => Promise<Result<null>>;
}

export interface RegistryService {
  // Core registry functions
  register_rune: (metadata: RuneMetadata) => Promise<Result<null>>;
  get_rune: (rune_id: RuneId) => Promise<[] | [RegistryEntry]>;
  list_runes: (offset: bigint, limit: bigint) => Promise<RegistryEntry[]>;
  search_runes: (query: string) => Promise<RegistryEntry[]>;
  get_trending: (limit: bigint) => Promise<RegistryEntry[]>;

  // Analytics updates
  update_volume: (rune_id: RuneId, volume: bigint) => Promise<Result<null>>;
  update_holder_count: (rune_id: RuneId, count: bigint) => Promise<Result<null>>;

  // Statistics
  total_runes: () => Promise<bigint>;
  get_stats: () => Promise<RegistryStats>;
}

export interface IdentityManagerService {
  // Session management
  create_session: (
    permissions: SessionPermissions,
    duration_ns: bigint
  ) => Promise<Result<UserSession>>;
  get_session: () => Promise<[] | [UserSession]>;
  validate_session: (principal: string) => Promise<boolean>;
  revoke_session: () => Promise<Result<null>>;

  // Permissions
  check_permission: (permission: PermissionType) => Promise<boolean>;

  // User statistics
  get_user_stats: (principal: string) => Promise<UserStats>;
}
