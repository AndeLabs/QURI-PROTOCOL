// Generated types from Candid interfaces

export type BitcoinNetwork = { Mainnet: null } | { Testnet: null } | { Regtest: null };

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

export type Result<T, E> = { Ok: T } | { Err: E };

// Rune Engine Canister Interface
export interface RuneEngineService {
  create_rune: (etching: RuneEtching) => Promise<Result<string, string>>;
  get_etching_status: (process_id: string) => Promise<[] | [EtchingProcessView]>;
  get_my_etchings: () => Promise<Array<EtchingProcessView>>;
  configure_canisters: (
    bitcoin_integration_id: string,
    registry_id: string
  ) => Promise<Result<null, string>>;
  update_etching_config: (config: EtchingConfigView) => Promise<Result<null, string>>;
  cleanup_old_processes: (age_days: bigint) => Promise<bigint>;
}

// Bitcoin Integration Canister Interface
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

export interface BitcoinIntegrationService {
  get_p2tr_address: () => Promise<Result<BitcoinAddress, string>>;
  get_fee_estimates: () => Promise<Result<FeeEstimates, string>>;
  select_utxos: (amount_needed: bigint, fee_rate: bigint) => Promise<Result<UtxoSelection, string>>;
  build_and_sign_etching_tx: (
    etching: RuneEtching,
    utxo_selection: UtxoSelection
  ) => Promise<Result<Uint8Array, string>>;
  broadcast_transaction: (tx_bytes: Uint8Array) => Promise<Result<string, string>>;
  get_block_height: () => Promise<Result<bigint, string>>;
  get_ckbtc_balance: (principal: string) => Promise<Result<bigint, string>>;
}
