import { Principal } from '@dfinity/principal';

export type OrderType =
  | { Limit: null }
  | { Market: null }
  | { StopLimit: { stop_price: bigint } };

export type OrderSide = { Buy: null } | { Sell: null };

export type TimeInForce =
  | { GTC: null }
  | { IOC: null }
  | { FOK: null }
  | { GTT: { expiry: bigint } };

export type OrderStatus =
  | { Open: null }
  | { PartiallyFilled: null }
  | { Filled: null }
  | { Cancelled: null }
  | { Expired: null }
  | { Rejected: { reason: string } };

export interface Order {
  id: string;
  user: Principal;
  pool_id: string;
  side: OrderSide;
  order_type: OrderType;
  price: bigint;
  amount: bigint;
  filled_amount: bigint;
  status: OrderStatus;
  time_in_force: TimeInForce;
  created_at: bigint;
  updated_at: bigint;
}

export interface Trade {
  id: string;
  pool_id: string;
  maker_order_id: string;
  taker_order_id: string;
  maker: Principal;
  taker: Principal;
  price: bigint;
  amount: bigint;
  side: OrderSide;
  timestamp: bigint;
}

export interface PlaceOrderResult {
  order_id: string;
  status: OrderStatus;
  filled_amount: bigint;
  remaining_amount: bigint;
  trades: Trade[];
}

export interface CancelOrderResult {
  order_id: string;
  cancelled_amount: bigint;
}

export interface OrderbookDepth {
  bids: [bigint, bigint][]; // [price, amount]
  asks: [bigint, bigint][]; // [price, amount]
  spread: bigint;
  mid_price: bigint | null;
}

export interface OrderbookStats {
  pool_id: string;
  total_orders: bigint;
  active_orders: bigint;
  total_trades: bigint;
  volume_24h: bigint;
  high_24h: bigint | null;
  low_24h: bigint | null;
  last_price: bigint | null;
}
