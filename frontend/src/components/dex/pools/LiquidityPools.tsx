import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useActor } from '../../../hooks/useActor';
import { PoolInfo, UserPosition } from '../../../types/dex';

export const LiquidityPools: React.FC = () => {
  const { actor, loading: actorLoading } = useActor('dex');

  const [pools, setPools] = useState<PoolInfo[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add liquidity state
  const [amount0, setAmount0] = useState<string>('');
  const [amount1, setAmount1] = useState<string>('');

  // Load pools
  useEffect(() => {
    if (!actor) return;

    const loadPools = async () => {
      try {
        setLoading(true);
        const poolsData = await actor.get_all_pools();
        setPools(poolsData);
      } catch (err) {
        setError(`Failed to load pools: ${err}`);
        console.error('Load pools error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, [actor]);

  // Load user positions
  useEffect(() => {
    if (!actor) return;

    const loadPositions = async () => {
      try {
        // TODO: Get user principal
        const userPrincipal = Principal.anonymous();
        const positions = await actor.get_user_positions(userPrincipal);
        setUserPositions(positions);
      } catch (err) {
        console.error('Load positions error:', err);
      }
    };

    loadPositions();
  }, [actor]);

  // Add liquidity
  const handleAddLiquidity = async () => {
    if (!actor || !selectedPool) return;

    try {
      setLoading(true);
      setError(null);

      const amount0Nat = BigInt(Math.floor(parseFloat(amount0) * 1e8));
      const amount1Nat = BigInt(Math.floor(parseFloat(amount1) * 1e8));

      const result = await actor.add_liquidity(
        selectedPool.id,
        amount0Nat,
        amount1Nat
      );

      if ('Ok' in result) {
        alert(`Liquidity added successfully! LP tokens: ${result.Ok.lp_tokens_minted}`);
        setAmount0('');
        setAmount1('');
      } else {
        setError(result.Err);
      }
    } catch (err) {
      setError(`Failed to add liquidity: ${err}`);
      console.error('Add liquidity error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="liquidity-pools">
      <h2>Liquidity Pools</h2>

      {/* Pool List */}
      <div className="pool-list">
        <h3>Available Pools</h3>
        {loading && <div>Loading pools...</div>}
        {error && <div className="error">{error}</div>}

        <table className="pools-table">
          <thead>
            <tr>
              <th>Pool</th>
              <th>TVL</th>
              <th>Volume 24h</th>
              <th>APY</th>
              <th>Price</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <tr key={pool.id}>
                <td>
                  {pool.token0.toText().slice(0, 8)}/
                  {pool.token1.toText().slice(0, 8)}
                </td>
                <td>${pool.tvl_usd.toLocaleString()}</td>
                <td>${pool.volume_24h_usd.toLocaleString()}</td>
                <td className="apy">{pool.apy.toFixed(2)}%</td>
                <td>{pool.price.toFixed(6)}</td>
                <td>
                  <button onClick={() => setSelectedPool(pool)}>
                    Add Liquidity
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Positions */}
      {userPositions.length > 0 && (
        <div className="user-positions">
          <h3>Your Positions</h3>
          <table className="positions-table">
            <thead>
              <tr>
                <th>Pool</th>
                <th>LP Tokens</th>
                <th>Share</th>
                <th>Value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {userPositions.map((position) => (
                <tr key={position.pool_id}>
                  <td>{position.pool_id.slice(0, 16)}...</td>
                  <td>{Number(position.lp_tokens).toFixed(4)}</td>
                  <td>{position.share_percent.toFixed(4)}%</td>
                  <td>${position.value_usd.toFixed(2)}</td>
                  <td>
                    <button>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Liquidity Form */}
      {selectedPool && (
        <div className="add-liquidity-form">
          <h3>Add Liquidity to Pool</h3>
          <p>Pool: {selectedPool.id}</p>

          <div className="input-group">
            <label>Token 0 Amount:</label>
            <input
              type="number"
              placeholder="0.0"
              value={amount0}
              onChange={(e) => setAmount0(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Token 1 Amount:</label>
            <input
              type="number"
              placeholder="0.0"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
            />
          </div>

          <div className="button-group">
            <button onClick={handleAddLiquidity} disabled={loading}>
              {loading ? 'Adding...' : 'Add Liquidity'}
            </button>
            <button onClick={() => setSelectedPool(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidityPools;
