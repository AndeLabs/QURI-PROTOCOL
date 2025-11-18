/**
 * Centralized exports for all canister types
 * Import from here for better organization and tree-shaking
 */

// Rune Engine types
export type {
  RuneEngineActor,
  BitcoinNetwork as RuneEngineBitcoinNetwork,
  Role,
  LogLevel,
  CyclesStatus,
  MintTerms as RuneEngineMintTerms,
  RuneEtching,
  EtchingProcessView,
  EtchingConfigView,
  HealthStatus,
  RoleAssignment,
  BlockHeightInfo,
  MetricsSummary,
  ErrorBreakdown,
  PerformanceMetrics,
  LatencyPercentiles,
  LogEntry,
  LogStats,
  CyclesSnapshot,
  CyclesMetrics,
  CreateRuneParams,
  RuneProcess,
  NetworkName,
  RoleName,
  LogLevelName,
  CyclesStatusName,
} from './rune-engine.types';

// Bitcoin Integration types
export type {
  BitcoinIntegrationActor,
  BitcoinNetwork,
  BitcoinAddress,
  FeeEstimates,
  Outpoint,
  Utxo,
  UtxoSelection,
  MintTerms as BitcoinMintTerms,
  RuneEtching as BitcoinRuneEtching,
  FeePriority,
  FeeEstimateWithUSD,
  BitcoinTransactionInfo,
  FormattedUtxo,
} from './bitcoin-integration.types';

// Registry types
export type {
  RegistryActor,
  RuneId,
  RuneMetadata,
  RuneListItem,
  SearchFilters,
  PaginationParams,
  SearchResult,
  SortBy,
  SortOrder,
  MintTerms as RegistryMintTerms,
  RuneDisplayData,
  RuneDetailData,
  RuneSearchState,
} from './registry.types';

// Identity Manager types
export type {
  IdentityManagerActor,
  PermissionType,
  SessionPermissions,
  UserSession,
  UserStats,
  SessionState,
  CreateSessionParams,
  UserProfile,
  PermissionDisplay,
} from './identity-manager.types';

// Common result type
export type Result<T = null> =
  | { Ok: T }
  | { Err: string };
