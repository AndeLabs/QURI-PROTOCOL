import { Principal } from '@dfinity/principal';

export interface PoolInfo {
  id: string;
  token0: Principal;
  token1: Principal;
  reserve0: bigint;
  reserve1: bigint;
  total_lp_supply: bigint;
  price: number;
  tvl_usd: number;
  volume_24h_usd: number;
  apy: number;
}

export interface UserPosition {
  pool_id: string;
  lp_tokens: bigint;
  share_percent: number;
  value_usd: number;
}

export type SwapRoute =
  | { Direct: { pool_id: string } }
  | { MultiHop: { pools: string[] } };

export interface SwapQuote {
  amount_in: bigint;
  amount_out: bigint;
  price_impact: number;
  fee: bigint;
  minimum_received: bigint;
  route: SwapRoute;
}

export interface SwapResult {
  amount_in: bigint;
  amount_out: bigint;
  fee: bigint;
  price_impact: number;
}

export interface AddLiquidityResult {
  lp_tokens_minted: bigint;
  amount0_added: bigint;
  amount1_added: bigint;
  share_percent: number;
}

export interface RemoveLiquidityResult {
  amount0_returned: bigint;
  amount1_returned: bigint;
  lp_tokens_burned: bigint;
}

export interface GlobalStats {
  total_pools: bigint;
  total_tvl_usd: number;
  total_volume_24h_usd: number;
  total_trades: bigint;
  total_users: bigint;
}
