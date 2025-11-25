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

export interface VirtualRuneView {
  id: string;
  rune_name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  status: string;
  created_at: bigint;
  updated_at: bigint;
}

/** Public view of a virtual rune (includes creator info for public listing) */
export interface PublicVirtualRuneView {
  id: string;
  rune_name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  terms: [] | [MintTerms];
  status: string;
  creator: string;
  created_at: bigint;
  updated_at: bigint;
}

// ============================================================================
// TRADING TYPES
// ============================================================================

export interface TradingPoolView {
  rune_id: string;
  rune_name: string;
  symbol: string;
  icp_reserve: bigint;
  rune_reserve: bigint;
  total_supply: bigint;
  price_per_rune: bigint;
  market_cap: bigint;
  creator: string;
  created_at: bigint;
  last_trade_at: bigint;
  total_volume_icp: bigint;
  total_trades: bigint;
  fees_collected: bigint;
  is_active: boolean;
}

export interface TradeQuoteView {
  rune_id: string;
  trade_type: string;
  input_amount: bigint;
  output_amount: bigint;
  price_per_rune: bigint;
  fee: bigint;
  price_impact_percent: number;
  minimum_output: bigint;
  pool_icp_reserve: bigint;
  pool_rune_reserve: bigint;
}

export interface TradeRecordView {
  id: bigint;
  rune_id: string;
  trader: string;
  trade_type: string;
  icp_amount: bigint;
  rune_amount: bigint;
  price_per_rune: bigint;
  fee: bigint;
  timestamp: bigint;
}

/** User's rune balance */
export interface RuneBalanceView {
  available: bigint;
  locked: bigint;
  total: bigint;
}

/** Balance change record for audit trail */
export interface BalanceChangeView {
  id: bigint;
  rune_id: string;
  change_type: string;
  amount: bigint;
  balance_before: bigint;
  balance_after: bigint;
  timestamp: bigint;
  reference: [] | [string];
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
  principal: string;
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

export interface SearchResult<T> {
  results: T[];
  total_matches: bigint;
  offset: bigint;
  limit: bigint;
}

export interface PaginatedResult {
  results: RegistryEntry[];
  total_count: bigint;
  offset: bigint;
  limit: bigint;
}

// Fee estimation types
export interface FeeEstimatesView {
  slow: bigint;
  medium: bigint;
  fast: bigint;
  updated_at: bigint;
}

export type FeePriority = { Slow: null } | { Medium: null } | { Fast: null };

// Confirmation tracking
export interface PendingTransaction {
  txid: string;
  process_id: string;
  current_confirmations: number;
  required_confirmations: number;
  last_check: bigint;
  registered_at: bigint;
}

// Log types
export interface LogEntry {
  timestamp: bigint;
  level: string;
  function_name: string;
  message: string;
  data: [] | [string];
}

export interface LogStats {
  total_logs: bigint;
  errors: bigint;
  warnings: bigint;
  infos: bigint;
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
  create_rune: (etching: RuneEtching) => Promise<Result<string>>;
  etch_to_bitcoin: (rune_id: string) => Promise<Result<string>>;
  get_etching_status: (process_id: string) => Promise<[] | [EtchingProcessView]>;
  get_my_etchings: () => Promise<EtchingProcessView[]>;

  // Virtual rune operations
  get_my_virtual_runes: () => Promise<VirtualRuneView[]>;
  get_virtual_rune: (rune_id: string) => Promise<[] | [VirtualRuneView]>;
  get_virtual_rune_count: () => Promise<bigint>;

  // Public virtual rune listing (anyone can see)
  list_all_virtual_runes: (offset: bigint, limit: bigint) => Promise<PublicVirtualRuneView[]>;
  get_all_virtual_runes_count: () => Promise<bigint>;

  // Trading operations
  create_trading_pool: (rune_id: string, initial_icp: bigint, initial_runes: bigint) => Promise<Result<TradingPoolView>>;
  get_buy_quote: (rune_id: string, icp_amount: bigint, slippage_bps: bigint) => Promise<Result<TradeQuoteView>>;
  get_sell_quote: (rune_id: string, rune_amount: bigint, slippage_bps: bigint) => Promise<Result<TradeQuoteView>>;
  buy_virtual_rune: (rune_id: string, icp_amount: bigint, min_runes_out: bigint) => Promise<Result<TradeRecordView>>;
  sell_virtual_rune: (rune_id: string, rune_amount: bigint, min_icp_out: bigint) => Promise<Result<TradeRecordView>>;
  get_rune_price: (rune_id: string) => Promise<Result<bigint>>;
  get_rune_market_cap: (rune_id: string) => Promise<Result<bigint>>;
  get_trading_pool: (rune_id: string) => Promise<[] | [TradingPoolView]>;
  list_trading_pools: (offset: bigint, limit: bigint) => Promise<TradingPoolView[]>;
  get_trading_pool_count: () => Promise<bigint>;
  get_rune_trade_history: (rune_id: string, limit: bigint) => Promise<TradeRecordView[]>;
  get_my_trade_history: (limit: bigint) => Promise<TradeRecordView[]>;

  // ICP Balance & Deposits
  get_my_icp_balance: () => Promise<bigint>;
  get_my_rune_balance: (rune_id: string) => Promise<RuneBalanceView>;
  get_my_all_rune_balances: () => Promise<Array<[string, RuneBalanceView]>>;
  get_deposit_address: () => Promise<string>;
  verify_deposit: () => Promise<Result<bigint>>;
  withdraw_icp: (amount: bigint) => Promise<Result<bigint>>;
  get_my_balance_history: (limit: bigint) => Promise<BalanceChangeView[]>;

  // Configuration
  update_etching_config: (config: EtchingConfigView) => Promise<Result<null>>;
  configure_canisters: (
    bitcoin_integration_id: string,
    registry_id: string
  ) => Promise<Result<null>>;
  auto_configure_canisters: (
    bitcoin_integration_id: string,
    registry_id: string
  ) => Promise<Result<null>>;

  // Health & Monitoring
  health_check: () => Promise<HealthStatus>;
  get_metrics_summary: () => Promise<MetricsSummary>;
  get_performance_metrics: () => Promise<Result<PerformanceMetrics>>;
  get_cycles_metrics: () => Promise<CyclesMetrics>;
  get_cycles_history: () => Promise<Result<Array<{ balance: bigint; timestamp: bigint }>>>;

  // Bitcoin integration
  get_bitcoin_block_height: () => Promise<[] | [bigint]>;
  get_block_height_info: () => Promise<Result<[] | [BlockHeightInfo]>>;

  // Fee estimation
  get_current_fee_estimates: () => Promise<[] | [FeeEstimatesView]>;
  get_recommended_fee: (priority: FeePriority) => Promise<bigint>;

  // Confirmation tracking
  get_pending_confirmations: () => Promise<Result<PendingTransaction[]>>;
  get_confirmation_status: (txid: string) => Promise<[] | [PendingTransaction]>;
  pending_confirmation_count: () => Promise<number>;

  // RBAC
  grant_role: (target: string, role: Role) => Promise<Result<null>>;
  revoke_role: (target: string) => Promise<Result<null>>;
  get_my_role: () => Promise<Role>;
  get_user_role: (principal: string) => Promise<Result<Role>>;
  list_roles: () => Promise<Result<RoleAssignment[]>>;
  get_owner: () => Promise<[] | [string]>;

  // Logging
  get_recent_logs: (limit: bigint) => Promise<Result<LogEntry[]>>;
  get_recent_errors: (limit: bigint) => Promise<Result<LogEntry[]>>;
  get_log_stats: () => Promise<LogStats>;
  search_logs: (keyword: string, limit: bigint) => Promise<Result<LogEntry[]>>;

  // Maintenance
  cleanup_old_processes: (age_days: bigint) => Promise<Result<bigint>>;
  cleanup_expired_idempotency: () => Promise<Result<bigint>>;
  get_idempotency_request_count: () => Promise<Result<bigint>>;

  // Settlement operations
  settle_to_bitcoin: (request: {
    rune_key: { block: bigint; tx: number };
    amount: bigint;
    destination_address: string;
    mode: string;
    fee_rate: [] | [number];
  }) => Promise<Result<{ txid: [] | [string] }>>;

  get_settlement_history: (
    limit: [] | [bigint],
    offset: [] | [bigint]
  ) => Promise<Array<{
    id: string;
    principal: { toText: () => string };
    rune_key: { block: bigint; tx: number };
    rune_name: string;
    amount: bigint;
    destination_address: string;
    mode: { Instant: null } | { Batched: null } | { Scheduled: null } | { Manual: null };
    status: { Queued: null } | { Batching: null } | { Signing: null } | { Broadcasting: null } | { Confirming: null } | { Confirmed: null } | { Failed: null };
    txid: [] | [string];
    created_at: bigint;
    updated_at: bigint;
    confirmations: [] | [number];
  }>>;

  get_settlement_status: (settlement_id: string) => Promise<[] | [{
    id: string;
    principal: { toText: () => string };
    rune_key: { block: bigint; tx: number };
    rune_name: string;
    amount: bigint;
    destination_address: string;
    mode: { Instant: null } | { Batched: null } | { Scheduled: null } | { Manual: null };
    status: { Queued: null } | { Batching: null } | { Signing: null } | { Broadcasting: null } | { Confirming: null } | { Confirmed: null } | { Failed: null };
    txid: [] | [string];
    created_at: bigint;
    updated_at: bigint;
    confirmations: [] | [number];
  }]>;

  get_pending_settlement_count: () => Promise<bigint>;

  // Dead Man's Switch operations
  create_dead_man_switch: (params: {
    beneficiary: string;
    rune_id: string;
    amount: bigint;
    timeout_days: bigint;
    message: [] | [string];
  }) => Promise<Result<bigint>>;
  dms_checkin: (switch_id: bigint) => Promise<Result<null>>;
  cancel_dead_man_switch: (switch_id: bigint) => Promise<Result<null>>;
  get_dead_man_switch: (switch_id: bigint) => Promise<[] | [{
    switch: {
      id: bigint;
      owner: { toText: () => string };
      beneficiary: string;
      rune_id: string;
      amount: bigint;
      last_checkin: bigint;
      timeout_ns: bigint;
      triggered: boolean;
      created_at: bigint;
      message: [] | [string];
    };
    status: { Active: null } | { Expired: null } | { Triggered: null } | { Cancelled: null };
    time_remaining_ns: bigint;
    elapsed_percentage: number;
  }]>;
  get_my_dead_man_switches: () => Promise<Array<{
    switch: {
      id: bigint;
      owner: { toText: () => string };
      beneficiary: string;
      rune_id: string;
      amount: bigint;
      last_checkin: bigint;
      timeout_ns: bigint;
      triggered: boolean;
      created_at: bigint;
      message: [] | [string];
    };
    status: { Active: null } | { Expired: null } | { Triggered: null } | { Cancelled: null };
    time_remaining_ns: bigint;
    elapsed_percentage: number;
  }>>;
  get_dead_man_switch_stats: () => Promise<{
    total_switches: bigint;
    active_switches: bigint;
    triggered_switches: bigint;
    total_value_protected: bigint;
  }>;
  process_dead_man_switches: () => Promise<Result<string>>;
  has_expired_dead_man_switches: () => Promise<boolean>;

  // Encrypted Metadata (vetKeys) operations
  store_encrypted_metadata: (params: {
    rune_id: string;
    encrypted_data: number[];
    nonce: number[];
    reveal_time: [] | [bigint];
  }) => Promise<Result<null>>;
  get_encrypted_metadata: (rune_id: string) => Promise<[] | [{
    rune_id: string;
    encrypted_data: Uint8Array;
    nonce: Uint8Array;
    reveal_time: [] | [bigint];
    owner: { toText: () => string };
    created_at: bigint;
  }]>;
  get_my_encrypted_metadata: () => Promise<Array<{
    rune_id: string;
    encrypted_data: Uint8Array;
    nonce: Uint8Array;
    reveal_time: [] | [bigint];
    owner: { toText: () => string };
    created_at: bigint;
  }>>;
  delete_encrypted_metadata: (rune_id: string) => Promise<Result<null>>;
  can_decrypt_metadata: (rune_id: string) => Promise<Result<boolean>>;
  has_encrypted_metadata: (rune_id: string) => Promise<boolean>;
  get_metadata_reveal_status: (rune_id: string) => Promise<[] | [[boolean, [] | [bigint]]]>;
  get_vetkd_public_key: () => Promise<Result<number[]>>;
  get_encrypted_decryption_key: (rune_id: string, public_key: number[]) => Promise<Result<number[]>>;
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

// Indexer types
export interface RuneIdentifier {
  block: bigint;
  tx_index: number;
}

export interface IndexedRune {
  id: RuneIdentifier;
  name: string;
  symbol: string;
  decimals: number;
  premine: bigint;
  total_supply: bigint;
  txid: string;
  etcher: string;
  timestamp: bigint;
  block_height: bigint;
  terms: [] | [{ amount: bigint; cap: bigint; height_start: [] | [bigint]; height_end: [] | [bigint] }];
}

export interface IndexerStats {
  total_runes: bigint;
  total_etchings: bigint;
  last_indexed_block: bigint;
  indexing_errors: bigint;
}

export interface SyncResponse {
  fetched: number;
  stored: number;
  errors: number;
  total_available: bigint;
}

export interface IndexedSearchResult {
  results: IndexedRune[];
  total_matches: bigint;
  offset: bigint;
  limit: bigint;
}

export interface RegistryService {
  // Core registry functions
  register_rune: (metadata: RuneMetadata) => Promise<Result<RuneKey>>;
  get_rune: (key: RuneKey) => Promise<[] | [RegistryEntry]>;
  get_rune_by_name: (name: string) => Promise<[] | [RegistryEntry]>;
  get_my_runes: () => Promise<RegistryEntry[]>;
  list_runes: (page: [] | [Page]) => Promise<Result<PagedResponse<RegistryEntry>>>;
  search_runes: (query: string, offset: bigint, limit: bigint) => Promise<SearchResult<RegistryEntry>>;
  get_trending: (offset: bigint, limit: bigint) => Promise<PaginatedResult>;

  // Analytics updates
  update_volume: (key: RuneKey, volume_delta: bigint) => Promise<Result<null>>;
  update_holder_count: (key: RuneKey, new_count: bigint) => Promise<Result<null>>;

  // Statistics
  total_runes: () => Promise<bigint>;
  get_stats: () => Promise<RegistryStats>;

  // Metrics and rate limiting
  get_canister_metrics: () => Promise<RegistryMetrics>;
  add_to_whitelist: (principal: string) => Promise<Result<null>>;
  remove_from_whitelist: (principal: string) => Promise<Result<null>>;
  is_whitelisted: (principal: string) => Promise<boolean>;
  reset_rate_limit: (principal: string) => Promise<Result<null>>;

  // Indexer functions
  list_indexed_runes: (offset: bigint, limit: bigint) => Promise<IndexedRune[]>;
  get_indexed_rune: (id: RuneIdentifier) => Promise<[] | [IndexedRune]>;
  get_indexer_stats: () => Promise<IndexerStats>;
  search_indexed_runes: (query: string, offset: bigint, limit: bigint) => Promise<IndexedSearchResult>;

  // Hiro API sync
  sync_runes_from_hiro: (offset: number, limit: number) => Promise<Result<SyncResponse>>;
  batch_sync_runes: (start_offset: number, total_to_fetch: number) => Promise<Result<SyncResponse>>;
  get_hiro_total: () => Promise<Result<bigint>>;
}

// Registry metrics type
export interface RegistryMetrics {
  query_count: bigint;
  total_query_duration_ns: bigint;
  avg_query_duration_ns: bigint;
  error_count: bigint;
  errors_by_type: { [key: string]: bigint };
  total_runes: bigint;
  total_volume: bigint;
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
