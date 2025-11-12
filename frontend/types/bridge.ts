import { Principal } from '@dfinity/principal';

export type BridgeStatus =
  | { Pending: null }
  | { ConfirmingBitcoin: { confirmations: number } }
  | { ProcessingICP: null }
  | { Completed: null }
  | { Failed: { reason: string } }
  | { Refunded: null };

export type BridgeDirection = { BitcoinToICP: null } | { ICPToBitcoin: null };

export interface BitcoinTxInfo {
  txid: string;
  vout: number;
  confirmations: number;
  block_height: bigint | null;
  verified: boolean;
}

export interface BridgeTransaction {
  id: string;
  direction: BridgeDirection;
  status: BridgeStatus;
  user_icp: Principal;
  user_btc_address: string;
  rune_id: string;
  rune_name: string;
  amount: bigint;
  wrune_canister: Principal | null;
  btc_tx: BitcoinTxInfo | null;
  icp_tx_id: bigint | null;
  bridge_fee: bigint;
  network_fee: bigint;
  created_at: bigint;
  updated_at: bigint;
  completed_at: bigint | null;
}

export interface DepositRequest {
  user_icp: Principal;
  user_btc_address: string;
  rune_id: string;
  rune_name: string;
  amount: bigint;
  btc_txid: string;
  btc_vout: number;
}

export interface WithdrawalRequest {
  user_icp: Principal;
  user_btc_address: string;
  wrune_canister: Principal;
  amount: bigint;
}

export interface BridgeStats {
  total_deposits: bigint;
  total_withdrawals: bigint;
  total_volume: bigint;
  total_fees_collected: bigint;
  active_transactions: bigint;
  successful_transactions: bigint;
  failed_transactions: bigint;
}

export interface RuneConfig {
  rune_id: string;
  rune_name: string;
  wrune_canister: Principal;
  enabled: boolean;
  min_deposit: bigint;
  max_deposit: bigint;
  min_withdrawal: bigint;
  max_withdrawal: bigint;
  daily_limit: bigint;
  daily_volume: bigint;
  last_reset: bigint;
}
