import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useActor } from '../../../hooks/useActor';
import {
  Order,
  OrderType,
  OrderSide,
  TimeInForce,
  OrderbookDepth,
  Trade,
} from '../../../types/orderbook';

interface OrderbookTradingProps {
  poolId: string;
}

export const OrderbookTrading: React.FC<OrderbookTradingProps> = ({ poolId }) => {
  const { actor, loading: actorLoading } = useActor('dex');

  // State
  const [depth, setDepth] = useState<OrderbookDepth | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);

  // Order form state
  const [side, setSide] = useState<OrderSide>({ Buy: null });
  const [orderType, setOrderType] = useState<OrderType>({ Limit: null });
  const [price, setPrice] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [timeInForce, setTimeInForce] = useState<TimeInForce>({ GTC: null });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load orderbook depth
  useEffect(() => {
    if (!actor) return;

    const loadDepth = async () => {
      try {
        const result = await actor.get_orderbook_depth(poolId, 20);
        if ('Ok' in result) {
          setDepth(result.Ok);
        }
      } catch (err) {
        console.error('Load depth error:', err);
      }
    };

    loadDepth();
    const interval = setInterval(loadDepth, 2000); // Update every 2s

    return () => clearInterval(interval);
  }, [actor, poolId]);

  // Load user orders
  useEffect(() => {
    if (!actor) return;

    const loadUserOrders = async () => {
      try {
        // TODO: Get user principal
        const userPrincipal = Principal.anonymous();
        const result = await actor.get_user_orders(poolId, userPrincipal);
        if ('Ok' in result) {
          setUserOrders(result.Ok);
        }
      } catch (err) {
        console.error('Load user orders error:', err);
      }
    };

    loadUserOrders();
  }, [actor, poolId]);

  // Load recent trades
  useEffect(() => {
    if (!actor) return;

    const loadTrades = async () => {
      try {
        const result = await actor.get_recent_trades(poolId, 50);
        if ('Ok' in result) {
          setRecentTrades(result.Ok);
        }
      } catch (err) {
        console.error('Load trades error:', err);
      }
    };

    loadTrades();
    const interval = setInterval(loadTrades, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, [actor, poolId]);

  // Place order
  const handlePlaceOrder = async () => {
    if (!actor) return;

    try {
      setLoading(true);
      setError(null);

      const priceNat = BigInt(Math.floor(parseFloat(price) * 1e8));
      const amountNat = BigInt(Math.floor(parseFloat(amount) * 1e8));

      const result = await actor.place_order(
        poolId,
        side,
        orderType,
        priceNat,
        amountNat,
        timeInForce
      );

      if ('Ok' in result) {
        alert(`Order placed! ID: ${result.Ok.order_id}`);
        setPrice('');
        setAmount('');
      } else {
        setError(result.Err);
      }
    } catch (err) {
      setError(`Failed to place order: ${err}`);
      console.error('Place order error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    if (!actor) return;

    try {
      const result = await actor.cancel_order(poolId, orderId);
      if ('Ok' in result) {
        alert('Order cancelled successfully');
        // Reload user orders
      } else {
        alert(`Failed to cancel: ${result.Err}`);
      }
    } catch (err) {
      console.error('Cancel order error:', err);
    }
  };

  return (
    <div className="orderbook-trading">
      <h2>Orderbook Trading</h2>

      <div className="trading-layout">
        {/* Orderbook Depth */}
        <div className="orderbook-panel">
          <h3>Order Book</h3>
          {depth && (
            <>
              {/* Asks (Sell Orders) */}
              <div className="asks">
                <table>
                  <thead>
                    <tr>
                      <th>Price</th>
                      <th>Amount</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {depth.asks.slice(0, 10).reverse().map(([price, amount], idx) => (
                      <tr key={idx} className="ask-row">
                        <td className="price-sell">
                          {(Number(price) / 1e8).toFixed(6)}
                        </td>
                        <td>{(Number(amount) / 1e8).toFixed(4)}</td>
                        <td>
                          {((Number(price) * Number(amount)) / 1e16).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Spread */}
              <div className="spread">
                <div className="mid-price">
                  {depth.mid_price && (
                    <span>Mid: {(Number(depth.mid_price) / 1e8).toFixed(6)}</span>
                  )}
                </div>
                <div className="spread-value">
                  Spread: {(Number(depth.spread) / 1e8).toFixed(6)}
                </div>
              </div>

              {/* Bids (Buy Orders) */}
              <div className="bids">
                <table>
                  <tbody>
                    {depth.bids.slice(0, 10).map(([price, amount], idx) => (
                      <tr key={idx} className="bid-row">
                        <td className="price-buy">
                          {(Number(price) / 1e8).toFixed(6)}
                        </td>
                        <td>{(Number(amount) / 1e8).toFixed(4)}</td>
                        <td>
                          {((Number(price) * Number(amount)) / 1e16).toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Order Form */}
        <div className="order-form-panel">
          <h3>Place Order</h3>

          <div className="order-side-selector">
            <button
              className={side && 'Buy' in side ? 'active buy' : 'buy'}
              onClick={() => setSide({ Buy: null })}
            >
              Buy
            </button>
            <button
              className={side && 'Sell' in side ? 'active sell' : 'sell'}
              onClick={() => setSide({ Sell: null })}
            >
              Sell
            </button>
          </div>

          <div className="form-group">
            <label>Order Type:</label>
            <select
              value={orderType && 'Limit' in orderType ? 'Limit' : 'Market'}
              onChange={(e) =>
                setOrderType(
                  e.target.value === 'Limit' ? { Limit: null } : { Market: null }
                )
              }
            >
              <option value="Limit">Limit</option>
              <option value="Market">Market</option>
            </select>
          </div>

          {orderType && 'Limit' in orderType && (
            <div className="form-group">
              <label>Price:</label>
              <input
                type="number"
                placeholder="0.0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label>Amount:</label>
            <input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button
            className={side && 'Buy' in side ? 'order-button buy' : 'order-button sell'}
            onClick={handlePlaceOrder}
            disabled={loading || !amount || (orderType && 'Limit' in orderType && !price)}
          >
            {loading ? 'Placing...' : side && 'Buy' in side ? 'Buy' : 'Sell'}
          </button>
        </div>

        {/* Recent Trades */}
        <div className="trades-panel">
          <h3>Recent Trades</h3>
          <table className="trades-table">
            <thead>
              <tr>
                <th>Price</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.slice(0, 20).map((trade, idx) => (
                <tr key={idx}>
                  <td className={trade.side && 'Buy' in trade.side ? 'buy' : 'sell'}>
                    {(Number(trade.price) / 1e8).toFixed(6)}
                  </td>
                  <td>{(Number(trade.amount) / 1e8).toFixed(4)}</td>
                  <td>{new Date(Number(trade.timestamp) / 1000000).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Orders */}
      {userOrders.length > 0 && (
        <div className="user-orders-panel">
          <h3>Your Orders</h3>
          <table className="user-orders-table">
            <thead>
              <tr>
                <th>Side</th>
                <th>Type</th>
                <th>Price</th>
                <th>Amount</th>
                <th>Filled</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {userOrders.map((order) => (
                <tr key={order.id}>
                  <td className={order.side && 'Buy' in order.side ? 'buy' : 'sell'}>
                    {order.side && 'Buy' in order.side ? 'Buy' : 'Sell'}
                  </td>
                  <td>{order.order_type && 'Limit' in order.order_type ? 'Limit' : 'Market'}</td>
                  <td>{(Number(order.price) / 1e8).toFixed(6)}</td>
                  <td>{(Number(order.amount) / 1e8).toFixed(4)}</td>
                  <td>{(Number(order.filled_amount) / 1e8).toFixed(4)}</td>
                  <td>{getOrderStatus(order.status)}</td>
                  <td>
                    {(order.status && ('Open' in order.status || 'PartiallyFilled' in order.status)) && (
                      <button onClick={() => handleCancelOrder(order.id)}>
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

function getOrderStatus(status: any): string {
  if ('Open' in status) return 'Open';
  if ('PartiallyFilled' in status) return 'Partial';
  if ('Filled' in status) return 'Filled';
  if ('Cancelled' in status) return 'Cancelled';
  if ('Expired' in status) return 'Expired';
  if ('Rejected' in status) return 'Rejected';
  return 'Unknown';
}

export default OrderbookTrading;
