/**
 * Rune Engine Canister - Candid IDL Factory
 * COMPLETE implementation with all methods
 */

export const idlFactory = ({ IDL }: any) => {
  // Types
  const BitcoinNetwork = IDL.Variant({
    Mainnet: IDL.Null,
    Testnet: IDL.Null,
    Regtest: IDL.Null,
  });

  const MintTerms = IDL.Record({
    amount: IDL.Nat64,
    cap: IDL.Nat64,
    height_start: IDL.Opt(IDL.Nat64),
    height_end: IDL.Opt(IDL.Nat64),
    offset_start: IDL.Opt(IDL.Nat64),
    offset_end: IDL.Opt(IDL.Nat64),
  });

  const RuneEtching = IDL.Record({
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    premine: IDL.Nat64,
    terms: IDL.Opt(MintTerms),
  });

  const EtchingProcessView = IDL.Record({
    id: IDL.Text,
    rune_name: IDL.Text,
    state: IDL.Text,
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
    retry_count: IDL.Nat32,
    txid: IDL.Opt(IDL.Text),
  });

  const VirtualRuneView = IDL.Record({
    id: IDL.Text,
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    premine: IDL.Nat64,
    status: IDL.Text,
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
  });

  const EtchingConfigView = IDL.Record({
    network: BitcoinNetwork,
    fee_rate: IDL.Nat64,
    required_confirmations: IDL.Nat32,
    enable_retries: IDL.Bool,
  });

  const HealthStatus = IDL.Record({
    healthy: IDL.Bool,
    etching_config_initialized: IDL.Bool,
    bitcoin_integration_configured: IDL.Bool,
    registry_configured: IDL.Bool,
    canister_id: IDL.Principal,
  });

  const Role = IDL.Variant({
    Owner: IDL.Null,
    Admin: IDL.Null,
    Operator: IDL.Null,
    User: IDL.Null,
  });

  const RoleAssignment = IDL.Record({
    target: IDL.Principal,
    role: Role,
    granted_at: IDL.Nat64,
    granted_by: IDL.Principal,
  });

  const BlockHeightInfo = IDL.Record({
    height: IDL.Nat64,
    network: BitcoinNetwork,
    age_seconds: IDL.Nat64,
  });

  const MetricsSummary = IDL.Record({
    total_runes_created: IDL.Nat64,
    total_errors: IDL.Nat64,
    success_rate_percent: IDL.Nat32,
    avg_etching_latency_ms: IDL.Nat64,
    active_processes: IDL.Nat32,
    pending_processes: IDL.Nat32,
  });

  const ErrorBreakdown = IDL.Record({
    validation_errors: IDL.Nat64,
    balance_errors: IDL.Nat64,
    utxo_errors: IDL.Nat64,
    signing_errors: IDL.Nat64,
    broadcast_errors: IDL.Nat64,
    confirmation_errors: IDL.Nat64,
    unknown_errors: IDL.Nat64,
  });

  const PerformanceMetrics = IDL.Record({
    total_runes_created: IDL.Nat64,
    total_errors: IDL.Nat64,
    total_retries: IDL.Nat64,
    total_confirmations_tracked: IDL.Nat64,
    errors_by_type: ErrorBreakdown,
    avg_etching_latency_ns: IDL.Nat64,
    avg_signing_latency_ns: IDL.Nat64,
    avg_broadcast_latency_ns: IDL.Nat64,
    active_processes: IDL.Nat32,
    pending_processes: IDL.Nat32,
    last_updated: IDL.Nat64,
  });

  const LatencyPercentiles = IDL.Record({
    p50: IDL.Nat64,
    p90: IDL.Nat64,
    p95: IDL.Nat64,
    p99: IDL.Nat64,
    min: IDL.Nat64,
    max: IDL.Nat64,
    count: IDL.Nat64,
  });

  const LogLevel = IDL.Variant({
    Debug: IDL.Null,
    Info: IDL.Null,
    Warn: IDL.Null,
    Error: IDL.Null,
  });

  const LogEntry = IDL.Record({
    id: IDL.Nat64,
    level: LogLevel,
    message: IDL.Text,
    caller: IDL.Opt(IDL.Principal),
    module: IDL.Text,
    context: IDL.Opt(IDL.Text),
    timestamp: IDL.Nat64,
  });

  const LogStats = IDL.Record({
    total_errors: IDL.Nat64,
    total_warns: IDL.Nat64,
    total_infos: IDL.Nat64,
    total_debugs: IDL.Nat64,
    last_error_timestamp: IDL.Opt(IDL.Nat64),
  });

  const CyclesStatus = IDL.Variant({
    Critical: IDL.Null,
    Warning: IDL.Null,
    Low: IDL.Null,
    Healthy: IDL.Null,
  });

  const CyclesSnapshot = IDL.Record({
    balance: IDL.Nat,
    status: CyclesStatus,
    timestamp: IDL.Nat64,
  });

  const CyclesMetrics = IDL.Record({
    current_balance: IDL.Nat,
    status: CyclesStatus,
    burn_rate_per_second: IDL.Nat,
    time_until_depletion_seconds: IDL.Opt(IDL.Nat64),
    last_check: IDL.Nat64,
    total_snapshots: IDL.Nat64,
  });

  const Result = IDL.Variant({ Ok: IDL.Text, Err: IDL.Text });
  const Result_1 = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
  const ResultData = (T: any) => IDL.Variant({ Ok: T, Err: IDL.Text });

  // Dead Man's Switch Types
  const SwitchStatus = IDL.Variant({
    Active: IDL.Null,
    Expired: IDL.Null,
    Triggered: IDL.Null,
    Cancelled: IDL.Null,
  });

  const DeadManSwitch = IDL.Record({
    id: IDL.Nat64,
    owner: IDL.Principal,
    beneficiary: IDL.Text,
    rune_id: IDL.Text,
    amount: IDL.Nat,
    last_checkin: IDL.Nat64,
    timeout_ns: IDL.Nat64,
    triggered: IDL.Bool,
    created_at: IDL.Nat64,
    message: IDL.Opt(IDL.Text),
  });

  const DeadManSwitchInfo = IDL.Record({
    switch: DeadManSwitch,
    status: SwitchStatus,
    time_remaining_ns: IDL.Nat64,
    elapsed_percentage: IDL.Float64,
  });

  const DeadManSwitchStats = IDL.Record({
    total_switches: IDL.Nat64,
    active_switches: IDL.Nat64,
    triggered_switches: IDL.Nat64,
    total_value_protected: IDL.Nat,
  });

  const CreateDeadManSwitchParams = IDL.Record({
    beneficiary: IDL.Text,
    rune_id: IDL.Text,
    amount: IDL.Nat,
    timeout_days: IDL.Nat64,
    message: IDL.Opt(IDL.Text),
  });

  // Encrypted Metadata (vetKeys) Types
  const EncryptedRuneMetadata = IDL.Record({
    rune_id: IDL.Text,
    encrypted_data: IDL.Vec(IDL.Nat8),
    nonce: IDL.Vec(IDL.Nat8),
    reveal_time: IDL.Opt(IDL.Nat64),
    owner: IDL.Principal,
    created_at: IDL.Nat64,
  });

  const StoreEncryptedMetadataParams = IDL.Record({
    rune_id: IDL.Text,
    encrypted_data: IDL.Vec(IDL.Nat8),
    nonce: IDL.Vec(IDL.Nat8),
    reveal_time: IDL.Opt(IDL.Nat64),
  });

  // Settlement Types
  const RuneKey = IDL.Record({
    block: IDL.Nat64,
    tx: IDL.Nat32,
  });

  const SettlementMode = IDL.Variant({
    Instant: IDL.Null,
    Batched: IDL.Null,
    Scheduled: IDL.Null,
    Manual: IDL.Null,
  });

  const SettlementStatus = IDL.Variant({
    Queued: IDL.Null,
    Batching: IDL.Null,
    Signing: IDL.Null,
    Broadcasting: IDL.Null,
    Confirming: IDL.Null,
    Confirmed: IDL.Null,
    Failed: IDL.Null,
  });

  const SettlementRecord = IDL.Record({
    id: IDL.Text,
    principal: IDL.Principal,
    rune_key: RuneKey,
    rune_name: IDL.Text,
    amount: IDL.Nat64,
    destination_address: IDL.Text,
    mode: SettlementMode,
    status: SettlementStatus,
    txid: IDL.Opt(IDL.Text),
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
    confirmations: IDL.Opt(IDL.Nat32),
  });

  return IDL.Service({
    // Main etching API
    create_rune: IDL.Func([RuneEtching], [Result], []),

    // Query APIs
    get_etching_status: IDL.Func([IDL.Text], [IDL.Opt(EtchingProcessView)], ['query']),
    get_my_etchings: IDL.Func([], [IDL.Vec(EtchingProcessView)], ['query']),
    health_check: IDL.Func([], [HealthStatus], ['query']),

    // Virtual Runes APIs
    get_my_virtual_runes: IDL.Func([], [IDL.Vec(VirtualRuneView)], ['query']),
    get_virtual_rune: IDL.Func([IDL.Text], [IDL.Opt(VirtualRuneView)], ['query']),
    get_virtual_rune_count: IDL.Func([], [IDL.Nat64], ['query']),
    etch_to_bitcoin: IDL.Func([IDL.Text], [Result], []),

    // Bitcoin block height tracking
    get_bitcoin_block_height: IDL.Func([], [IDL.Opt(IDL.Nat64)], ['query']),
    get_block_height_info: IDL.Func([], [ResultData(IDL.Opt(BlockHeightInfo))], ['query']),

    // Performance metrics
    get_metrics_summary: IDL.Func([], [MetricsSummary], ['query']),
    get_performance_metrics: IDL.Func([], [ResultData(PerformanceMetrics)], ['query']),
    get_latency_percentiles: IDL.Func([IDL.Text], [ResultData(IDL.Opt(LatencyPercentiles))], ['query']),

    // Logging APIs
    get_recent_logs: IDL.Func([IDL.Nat64], [ResultData(IDL.Vec(LogEntry))], ['query']),
    get_recent_errors: IDL.Func([IDL.Nat64], [ResultData(IDL.Vec(LogEntry))], ['query']),
    get_log_stats: IDL.Func([], [LogStats], ['query']),
    search_logs: IDL.Func([IDL.Text, IDL.Nat64], [ResultData(IDL.Vec(LogEntry))], ['query']),

    // Cycles monitoring
    get_cycles_metrics: IDL.Func([], [CyclesMetrics], ['query']),
    get_cycles_history: IDL.Func([], [ResultData(IDL.Vec(CyclesSnapshot))], ['query']),

    // Configuration APIs
    configure_canisters: IDL.Func([IDL.Principal, IDL.Principal], [Result_1], []),
    update_etching_config: IDL.Func([EtchingConfigView], [Result_1], []),

    // RBAC Management
    grant_role: IDL.Func([IDL.Principal, Role], [Result_1], []),
    revoke_role: IDL.Func([IDL.Principal], [Result_1], []),
    get_my_role: IDL.Func([], [Role], ['query']),
    get_user_role: IDL.Func([IDL.Principal], [ResultData(Role)], ['query']),
    list_roles: IDL.Func([], [ResultData(IDL.Vec(RoleAssignment))], ['query']),
    get_owner: IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),

    // Maintenance
    cleanup_old_processes: IDL.Func([IDL.Nat64], [ResultData(IDL.Nat64)], []),

    // Dead Man's Switch APIs
    create_dead_man_switch: IDL.Func([CreateDeadManSwitchParams], [ResultData(IDL.Nat64)], []),
    dms_checkin: IDL.Func([IDL.Nat64], [Result_1], []),
    cancel_dead_man_switch: IDL.Func([IDL.Nat64], [Result_1], []),
    get_dead_man_switch: IDL.Func([IDL.Nat64], [IDL.Opt(DeadManSwitchInfo)], ['query']),
    get_my_dead_man_switches: IDL.Func([], [IDL.Vec(DeadManSwitchInfo)], ['query']),
    get_dead_man_switch_stats: IDL.Func([], [DeadManSwitchStats], ['query']),
    process_dead_man_switches: IDL.Func([], [Result], []),
    has_expired_dead_man_switches: IDL.Func([], [IDL.Bool], ['query']),

    // Encrypted Metadata (vetKeys) APIs
    store_encrypted_metadata: IDL.Func([StoreEncryptedMetadataParams], [Result_1], []),
    get_encrypted_metadata: IDL.Func([IDL.Text], [IDL.Opt(EncryptedRuneMetadata)], ['query']),
    get_my_encrypted_metadata: IDL.Func([], [IDL.Vec(EncryptedRuneMetadata)], ['query']),
    delete_encrypted_metadata: IDL.Func([IDL.Text], [Result_1], []),
    can_decrypt_metadata: IDL.Func([IDL.Text], [ResultData(IDL.Bool)], ['query']),
    has_encrypted_metadata: IDL.Func([IDL.Text], [IDL.Bool], ['query']),
    get_metadata_reveal_status: IDL.Func([IDL.Text], [IDL.Opt(IDL.Tuple(IDL.Bool, IDL.Opt(IDL.Nat64)))], ['query']),
    get_vetkd_public_key: IDL.Func([], [ResultData(IDL.Vec(IDL.Nat8))], []),
    get_encrypted_decryption_key: IDL.Func([IDL.Text, IDL.Vec(IDL.Nat8)], [ResultData(IDL.Vec(IDL.Nat8))], []),

    // Settlement APIs
    get_settlement_history: IDL.Func([IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)], [IDL.Vec(SettlementRecord)], ['query']),
    get_settlement_status: IDL.Func([IDL.Text], [IDL.Opt(SettlementRecord)], ['query']),
    get_pending_settlement_count: IDL.Func([], [IDL.Nat64], ['query']),
  });
};
