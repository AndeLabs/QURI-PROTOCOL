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

  const PublicVirtualRuneView = IDL.Record({
    id: IDL.Text,
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    premine: IDL.Nat64,
    terms: IDL.Opt(MintTerms),
    status: IDL.Text,
    creator: IDL.Principal,
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
  });

  // Trading types (V1 - deprecated)
  const TradingPoolView = IDL.Record({
    rune_id: IDL.Text,
    rune_name: IDL.Text,
    symbol: IDL.Text,
    icp_reserve: IDL.Nat64,
    rune_reserve: IDL.Nat64,
    total_supply: IDL.Nat64,
    price_per_rune: IDL.Nat64,
    market_cap: IDL.Nat,
    creator: IDL.Principal,
    created_at: IDL.Nat64,
    last_trade_at: IDL.Nat64,
    total_volume_icp: IDL.Nat,
    total_trades: IDL.Nat64,
    fees_collected: IDL.Nat64,
    is_active: IDL.Bool,
  });

  const TradeQuoteView = IDL.Record({
    rune_id: IDL.Text,
    trade_type: IDL.Text,
    input_amount: IDL.Nat64,
    output_amount: IDL.Nat64,
    price_per_rune: IDL.Nat64,
    fee: IDL.Nat64,
    price_impact_percent: IDL.Float64,
    minimum_output: IDL.Nat64,
    pool_icp_reserve: IDL.Nat64,
    pool_rune_reserve: IDL.Nat64,
  });

  const TradeRecordView = IDL.Record({
    id: IDL.Nat64,
    rune_id: IDL.Text,
    trader: IDL.Principal,
    trade_type: IDL.Text,
    icp_amount: IDL.Nat64,
    rune_amount: IDL.Nat64,
    price_per_rune: IDL.Nat64,
    fee: IDL.Nat64,
    timestamp: IDL.Nat64,
  });

  const RuneBalanceView = IDL.Record({
    available: IDL.Nat64,
    locked: IDL.Nat64,
    total: IDL.Nat64,
  });

  // Trading V2 types
  const TradingPoolV2View = IDL.Record({
    pool_id: IDL.Text,
    rune_id: IDL.Text,
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    icp_reserve: IDL.Nat64,
    rune_reserve: IDL.Nat64,
    virtual_icp_reserve: IDL.Nat64,
    virtual_rune_reserve: IDL.Nat64,
    pool_type: IDL.Text,
    graduation_status: IDL.Text,
    total_supply: IDL.Nat64,
    k_constant: IDL.Nat,
    total_lp_supply: IDL.Nat64,
    fees_collected_icp: IDL.Nat64,
    protocol_fees_pending: IDL.Nat64,
    total_volume_icp: IDL.Nat,
    total_trades: IDL.Nat64,
    unique_traders: IDL.Nat64,
    price_per_rune: IDL.Nat64,
    market_cap: IDL.Nat,
    creator: IDL.Principal,
    created_at: IDL.Nat64,
    last_trade_at: IDL.Nat64,
    is_active: IDL.Bool,
  });

  const TradeQuoteV2View = IDL.Record({
    rune_id: IDL.Text,
    trade_type: IDL.Text,
    input_amount: IDL.Nat64,
    output_amount: IDL.Nat64,
    price_per_rune: IDL.Nat64,
    fee: IDL.Nat64,
    protocol_fee: IDL.Nat64,
    lp_fee: IDL.Nat64,
    price_impact_bps: IDL.Nat16,
    minimum_output: IDL.Nat64,
    pool_icp_reserve: IDL.Nat64,
    pool_rune_reserve: IDL.Nat64,
    effective_price: IDL.Float64,
  });

  const TradeEventView = IDL.Record({
    id: IDL.Nat64,
    pool_id: IDL.Text,
    rune_id: IDL.Text,
    trader: IDL.Principal,
    trade_type: IDL.Text,
    icp_amount: IDL.Nat64,
    rune_amount: IDL.Nat64,
    price_per_rune: IDL.Nat64,
    fee: IDL.Nat64,
    price_impact_bps: IDL.Nat16,
    pool_icp_reserve_after: IDL.Nat64,
    pool_rune_reserve_after: IDL.Nat64,
    timestamp: IDL.Nat64,
  });

  const ICPBalanceView = IDL.Record({
    available: IDL.Nat64,
    locked: IDL.Nat64,
    total: IDL.Nat64,
    total_deposited: IDL.Nat64,
    total_withdrawn: IDL.Nat64,
  });

  const UserBalanceView = IDL.Record({
    available: IDL.Nat64,
    locked: IDL.Nat64,
    total: IDL.Nat64,
    total_bought: IDL.Nat64,
    total_sold: IDL.Nat64,
  });

  const BalanceChangeView = IDL.Record({
    id: IDL.Nat64,
    rune_id: IDL.Text,
    change_type: IDL.Text,
    amount: IDL.Nat64,
    balance_before: IDL.Nat64,
    balance_after: IDL.Nat64,
    timestamp: IDL.Nat64,
    reference: IDL.Opt(IDL.Text),
  });

  const Result_TradingPool = IDL.Variant({ Ok: TradingPoolView, Err: IDL.Text });
  const Result_TradeQuote = IDL.Variant({ Ok: TradeQuoteView, Err: IDL.Text });
  const Result_TradeRecord = IDL.Variant({ Ok: TradeRecordView, Err: IDL.Text });
  const Result_Price = IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text });
  const Result_MarketCap = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });
  const Result_Balance = IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text });

  // V2 Result types
  const Result_TradingPoolV2 = IDL.Variant({ Ok: TradingPoolV2View, Err: IDL.Text });
  const Result_TradeQuoteV2 = IDL.Variant({ Ok: TradeQuoteV2View, Err: IDL.Text });
  const Result_TradeEvent = IDL.Variant({ Ok: TradeEventView, Err: IDL.Text });

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
    list_all_virtual_runes: IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Vec(PublicVirtualRuneView)], ['query']),
    get_all_virtual_runes_count: IDL.Func([], [IDL.Nat64], ['query']),
    etch_to_bitcoin: IDL.Func([IDL.Text], [Result], []),

    // Trading APIs (V1 - deprecated)
    create_trading_pool: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradingPool], []),
    get_buy_quote: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeQuote], ['query']),
    get_sell_quote: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeQuote], ['query']),
    buy_virtual_rune: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeRecord], []),
    sell_virtual_rune: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeRecord], []),
    get_rune_price: IDL.Func([IDL.Text], [Result_Price], ['query']),
    get_rune_market_cap: IDL.Func([IDL.Text], [Result_MarketCap], ['query']),
    get_trading_pool: IDL.Func([IDL.Text], [IDL.Opt(TradingPoolView)], ['query']),
    list_trading_pools: IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Vec(TradingPoolView)], ['query']),
    get_trading_pool_count: IDL.Func([], [IDL.Nat64], ['query']),
    get_rune_trade_history: IDL.Func([IDL.Text, IDL.Nat64], [IDL.Vec(TradeRecordView)], ['query']),
    get_my_trade_history: IDL.Func([IDL.Nat64], [IDL.Vec(TradeRecordView)], ['query']),

    // Trading APIs V2 (bonding curve AMM with stable storage)
    create_trading_pool_v2: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradingPoolV2], []),
    get_buy_quote_v2: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeQuoteV2], ['query']),
    get_sell_quote_v2: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeQuoteV2], ['query']),
    buy_virtual_rune_v2: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeEvent], []),
    sell_virtual_rune_v2: IDL.Func([IDL.Text, IDL.Nat64, IDL.Nat64], [Result_TradeEvent], []),
    get_trading_pool_v2: IDL.Func([IDL.Text], [IDL.Opt(TradingPoolV2View)], ['query']),
    list_trading_pools_v2: IDL.Func([IDL.Nat64, IDL.Nat64], [IDL.Vec(TradingPoolV2View)], ['query']),
    get_trading_pool_count_v2: IDL.Func([], [IDL.Nat64], ['query']),
    get_rune_trade_history_v2: IDL.Func([IDL.Text, IDL.Nat64], [IDL.Vec(TradeEventView)], ['query']),
    get_my_trade_history_v2: IDL.Func([IDL.Nat64], [IDL.Vec(TradeEventView)], ['query']),

    // ICP Balance & Deposit APIs V2
    get_my_icp_balance_v2: IDL.Func([], [ICPBalanceView], ['query']),
    get_my_rune_balance_v2: IDL.Func([IDL.Text], [UserBalanceView], ['query']),

    // ICP Balance & Deposit APIs (V1 - deprecated)
    get_my_icp_balance: IDL.Func([], [IDL.Nat64], ['query']),
    get_my_rune_balance: IDL.Func([IDL.Text], [RuneBalanceView], ['query']),
    get_my_all_rune_balances: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, RuneBalanceView))], ['query']),
    get_deposit_address: IDL.Func([], [IDL.Text], ['query']),
    verify_deposit: IDL.Func([], [Result_Balance], []),
    withdraw_icp: IDL.Func([IDL.Nat64], [Result_Balance], []),
    get_my_balance_history: IDL.Func([IDL.Nat64], [IDL.Vec(BalanceChangeView)], ['query']),

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
