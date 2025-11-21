/**
 * Registry Canister - Candid IDL Factory
 * Global registry for all Runes with search and analytics
 */

export const idlFactory = ({ IDL }: any) => {
  // Core types
  const RuneKey = IDL.Record({
    block: IDL.Nat64,
    tx: IDL.Nat32,
  });

  const MintTerms = IDL.Record({
    amount: IDL.Nat,
    cap: IDL.Nat,
    height_start: IDL.Opt(IDL.Nat64),
    height_end: IDL.Opt(IDL.Nat64),
    offset_start: IDL.Opt(IDL.Nat64),
    offset_end: IDL.Opt(IDL.Nat64),
  });

  const RuneMetadata = IDL.Record({
    key: RuneKey,
    name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    creator: IDL.Principal,
    created_at: IDL.Nat64,
    total_supply: IDL.Nat,
    premine: IDL.Nat,
    terms: IDL.Opt(MintTerms),
  });

  const BondingCurve = IDL.Record({
    initial_price: IDL.Nat64,
    target_market_cap: IDL.Nat64,
    current_supply: IDL.Nat64,
    graduated_to_amm: IDL.Bool,
  });

  const RegistryEntry = IDL.Record({
    metadata: RuneMetadata,
    bonding_curve: IDL.Opt(BondingCurve),
    trading_volume_24h: IDL.Nat64,
    holder_count: IDL.Nat64,
    indexed_at: IDL.Nat64,
  });

  // Pagination types
  const SortOrder = IDL.Variant({
    Asc: IDL.Null,
    Desc: IDL.Null,
  });

  const RuneSortBy = IDL.Variant({
    Block: IDL.Null,
    Name: IDL.Null,
    Volume: IDL.Null,
    Holders: IDL.Null,
    IndexedAt: IDL.Null,
  });

  const Page = IDL.Record({
    offset: IDL.Nat64,
    limit: IDL.Nat64,
    sort_by: IDL.Opt(RuneSortBy),
    sort_order: IDL.Opt(SortOrder),
  });

  const PagedResponse = IDL.Record({
    items: IDL.Vec(RegistryEntry),
    total: IDL.Nat64,
    offset: IDL.Nat64,
    limit: IDL.Nat64,
    has_more: IDL.Bool,
  });

  const RegistryStats = IDL.Record({
    total_runes: IDL.Nat64,
    total_volume_24h: IDL.Nat64,
    status: IDL.Text,
  });

  // Result types
  const ResultRuneKey = IDL.Variant({
    Ok: RuneKey,
    Err: IDL.Text,
  });

  const Result = IDL.Variant({
    Ok: IDL.Null,
    Err: IDL.Text,
  });

  const ResultPagedResponse = IDL.Variant({
    Ok: PagedResponse,
    Err: IDL.Text,
  });

  // Metrics type
  const RegistryMetrics = IDL.Record({
    total_queries: IDL.Nat64,
    list_runes_calls: IDL.Nat64,
    search_calls: IDL.Nat64,
    get_rune_calls: IDL.Nat64,
    avg_query_time_ns: IDL.Nat64,
    slowest_query_time_ns: IDL.Nat64,
    fastest_query_time_ns: IDL.Nat64,
    total_errors: IDL.Nat64,
    rate_limit_hits: IDL.Nat64,
    validation_errors: IDL.Nat64,
    cycles_balance: IDL.Nat64,
    memory_used_bytes: IDL.Nat64,
    total_runes: IDL.Nat64,
    total_volume_24h: IDL.Nat64,
    last_updated: IDL.Nat64,
  });

  // Legacy types for backward compatibility
  const SearchResult = IDL.Record({
    results: IDL.Vec(RegistryEntry),
    total_matches: IDL.Nat64,
    offset: IDL.Nat64,
    limit: IDL.Nat64,
  });

  const PaginatedResult = IDL.Record({
    results: IDL.Vec(RegistryEntry),
    total_count: IDL.Nat64,
    offset: IDL.Nat64,
    limit: IDL.Nat64,
  });

  // Indexed Rune types (from indexer)
  const RuneIdentifier = IDL.Record({
    block: IDL.Nat64,
    tx_index: IDL.Nat32,
  });

  const IndexedMintTerms = IDL.Record({
    amount: IDL.Nat,
    cap: IDL.Nat,
    height_start: IDL.Opt(IDL.Nat64),
    height_end: IDL.Opt(IDL.Nat64),
  });

  const IndexedRune = IDL.Record({
    id: RuneIdentifier,
    name: IDL.Text,
    symbol: IDL.Text,
    decimals: IDL.Nat8,
    total_supply: IDL.Nat,
    premine: IDL.Nat,
    block_height: IDL.Nat64,
    txid: IDL.Text,
    timestamp: IDL.Nat64,
    etcher: IDL.Text,
    terms: IDL.Opt(IndexedMintTerms),
  });

  const IndexedSearchResult = IDL.Record({
    results: IDL.Vec(IndexedRune),
    total_matches: IDL.Nat64,
    offset: IDL.Nat64,
    limit: IDL.Nat64,
  });

  const IndexerStats = IDL.Record({
    total_runes: IDL.Nat64,
    last_indexed_block: IDL.Nat64,
    total_etchings: IDL.Nat64,
    indexing_errors: IDL.Nat64,
  });

  const SyncResponse = IDL.Record({
    synced: IDL.Nat64,
    errors: IDL.Nat64,
    message: IDL.Text,
  });

  const ResultSync = IDL.Variant({
    Ok: SyncResponse,
    Err: IDL.Text,
  });

  return IDL.Service({
    // Write operations
    register_rune: IDL.Func([RuneMetadata], [ResultRuneKey], []),
    update_volume: IDL.Func([RuneKey, IDL.Nat64], [Result], []),
    update_holder_count: IDL.Func([RuneKey, IDL.Nat64], [Result], []),

    // Read operations
    get_rune: IDL.Func([RuneKey], [IDL.Opt(RegistryEntry)], ['query']),
    get_rune_by_name: IDL.Func([IDL.Text], [IDL.Opt(RegistryEntry)], ['query']),
    get_my_runes: IDL.Func([], [IDL.Vec(RegistryEntry)], ['query']),

    // Advanced pagination - returns Result variant
    list_runes: IDL.Func([IDL.Opt(Page)], [ResultPagedResponse], ['query']),

    // Legacy endpoints
    search_runes: IDL.Func(
      [IDL.Text, IDL.Nat64, IDL.Nat64],
      [SearchResult],
      ['query']
    ),
    get_trending: IDL.Func([IDL.Nat64, IDL.Nat64], [PaginatedResult], ['query']),

    // Statistics
    total_runes: IDL.Func([], [IDL.Nat64], ['query']),
    get_stats: IDL.Func([], [RegistryStats], ['query']),

    // Security & Monitoring
    get_canister_metrics: IDL.Func([], [RegistryMetrics], ['query']),
    is_whitelisted: IDL.Func([IDL.Principal], [IDL.Bool], ['query']),
    add_to_whitelist: IDL.Func([IDL.Principal], [Result], []),
    remove_from_whitelist: IDL.Func([IDL.Principal], [Result], []),
    reset_rate_limit: IDL.Func([IDL.Principal], [Result], []),

    // Indexed Runes (from indexer storage)
    search_indexed_runes: IDL.Func(
      [IDL.Text, IDL.Nat64, IDL.Nat64],
      [IndexedSearchResult],
      ['query']
    ),
    list_indexed_runes: IDL.Func(
      [IDL.Nat64, IDL.Nat64],
      [IDL.Vec(IndexedRune)],
      ['query']
    ),
    get_indexed_rune: IDL.Func(
      [RuneIdentifier],
      [IDL.Opt(IndexedRune)],
      ['query']
    ),
    get_indexer_stats: IDL.Func([], [IndexerStats], ['query']),
    get_index_stats: IDL.Func([], [IDL.Tuple(IDL.Nat64, IDL.Nat64, IDL.Nat64)], ['query']),

    // Hiro sync
    sync_runes_from_hiro: IDL.Func(
      [IDL.Nat64, IDL.Nat64],
      [ResultSync],
      []
    ),
    get_hiro_total: IDL.Func([], [IDL.Nat64], []),
  });
};
