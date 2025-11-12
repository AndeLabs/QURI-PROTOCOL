import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useActor } from '../../../hooks/useActor';
import { SwapQuote, SwapRoute, SwapResult } from '../../../types/dex';

interface Token {
  canister: Principal;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  logo?: string;
}

interface SwapInterfaceProps {
  poolId?: string;
  onSwapComplete?: (result: SwapResult) => void;
}

export const SwapInterface: React.FC<SwapInterfaceProps> = ({
  poolId,
  onSwapComplete,
}) => {
  const { actor, loading: actorLoading } = useActor('dex');

  // State
  const [tokenIn, setTokenIn] = useState<Token | null>(null);
  const [tokenOut, setTokenOut] = useState<Token | null>(null);
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [slippage, setSlippage] = useState<number>(0.5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch quote when amount changes
  useEffect(() => {
    if (!actor || !tokenIn || !tokenOut || !amountIn || parseFloat(amountIn) <= 0) {
      setQuote(null);
      setAmountOut('');
      return;
    }

    const fetchQuote = async () => {
      try {
        setLoading(true);
        setError(null);

        const amountInNat = BigInt(
          Math.floor(parseFloat(amountIn) * Math.pow(10, tokenIn.decimals))
        );

        const result = await actor.get_swap_quote(
          poolId || '',
          tokenIn.canister,
          amountInNat
        );

        if ('Ok' in result) {
          const swapQuote = result.Ok;
          setQuote(swapQuote);

          const amountOutFloat =
            Number(swapQuote.amount_out) / Math.pow(10, tokenOut.decimals);
          setAmountOut(amountOutFloat.toFixed(tokenOut.decimals));
        } else {
          setError(result.Err);
        }
      } catch (err) {
        setError(`Failed to fetch quote: ${err}`);
        console.error('Quote error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(debounceTimer);
  }, [actor, tokenIn, tokenOut, amountIn, poolId]);

  // Execute swap
  const handleSwap = async () => {
    if (!actor || !tokenIn || !tokenOut || !quote) return;

    try {
      setLoading(true);
      setError(null);

      const amountInNat = BigInt(
        Math.floor(parseFloat(amountIn) * Math.pow(10, tokenIn.decimals))
      );

      // Calculate minimum amount with slippage
      const minAmountOut = BigInt(
        Math.floor(
          Number(quote.amount_out) * (1 - slippage / 100)
        )
      );

      const result = await actor.swap(
        poolId || '',
        tokenIn.canister,
        amountInNat,
        minAmountOut
      );

      if ('Ok' in result) {
        const swapResult = result.Ok;
        onSwapComplete?.(swapResult);

        // Reset form
        setAmountIn('');
        setAmountOut('');
        setQuote(null);

        // Show success
        alert(`Swap successful! Received ${amountOut} ${tokenOut.symbol}`);
      } else {
        setError(result.Err);
      }
    } catch (err) {
      setError(`Swap failed: ${err}`);
      console.error('Swap error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Swap input/output tokens
  const handleFlipTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn(amountOut);
    setAmountOut(amountIn);
  };

  // Calculate price impact
  const priceImpact = quote ? quote.price_impact : 0;
  const priceImpactColor =
    priceImpact < 1 ? 'green' : priceImpact < 3 ? 'yellow' : 'red';

  return (
    <div className="swap-interface">
      <div className="swap-header">
        <h2>Swap Runes</h2>
        <div className="slippage-settings">
          <label>Slippage Tolerance:</label>
          <select
            value={slippage}
            onChange={(e) => setSlippage(parseFloat(e.target.value))}
          >
            <option value={0.1}>0.1%</option>
            <option value={0.5}>0.5%</option>
            <option value={1.0}>1.0%</option>
            <option value={3.0}>3.0%</option>
          </select>
        </div>
      </div>

      <div className="swap-form">
        {/* Token In */}
        <div className="token-input">
          <div className="token-input-header">
            <span>From</span>
            {tokenIn && (
              <span className="balance">
                Balance: {(Number(tokenIn.balance) / Math.pow(10, tokenIn.decimals)).toFixed(4)}
              </span>
            )}
          </div>
          <div className="token-input-main">
            <input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              disabled={loading || actorLoading}
            />
            <button className="token-select">
              {tokenIn ? (
                <>
                  {tokenIn.logo && <img src={tokenIn.logo} alt={tokenIn.symbol} />}
                  <span>{tokenIn.symbol}</span>
                </>
              ) : (
                <span>Select Token</span>
              )}
            </button>
          </div>
        </div>

        {/* Flip Button */}
        <div className="swap-flip">
          <button
            onClick={handleFlipTokens}
            disabled={!tokenIn || !tokenOut}
            className="flip-button"
          >
            ⇅
          </button>
        </div>

        {/* Token Out */}
        <div className="token-input">
          <div className="token-input-header">
            <span>To</span>
            {tokenOut && (
              <span className="balance">
                Balance: {(Number(tokenOut.balance) / Math.pow(10, tokenOut.decimals)).toFixed(4)}
              </span>
            )}
          </div>
          <div className="token-input-main">
            <input
              type="number"
              placeholder="0.0"
              value={amountOut}
              disabled
            />
            <button className="token-select">
              {tokenOut ? (
                <>
                  {tokenOut.logo && <img src={tokenOut.logo} alt={tokenOut.symbol} />}
                  <span>{tokenOut.symbol}</span>
                </>
              ) : (
                <span>Select Token</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quote Details */}
      {quote && (
        <div className="swap-details">
          <div className="detail-row">
            <span>Price:</span>
            <span>
              1 {tokenIn?.symbol} ={' '}
              {(Number(quote.amount_out) / Number(quote.amount_in)).toFixed(6)}{' '}
              {tokenOut?.symbol}
            </span>
          </div>
          <div className="detail-row">
            <span>Price Impact:</span>
            <span style={{ color: priceImpactColor }}>
              {priceImpact.toFixed(2)}%
            </span>
          </div>
          <div className="detail-row">
            <span>Fee:</span>
            <span>
              {(Number(quote.fee) / Math.pow(10, tokenIn?.decimals || 8)).toFixed(6)}{' '}
              {tokenIn?.symbol} (0.3%)
            </span>
          </div>
          <div className="detail-row">
            <span>Minimum Received:</span>
            <span>
              {(Number(quote.minimum_received) / Math.pow(10, tokenOut?.decimals || 8)).toFixed(6)}{' '}
              {tokenOut?.symbol}
            </span>
          </div>
          {quote.route && (
            <div className="detail-row">
              <span>Route:</span>
              <span>{renderRoute(quote.route)}</span>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Swap Button */}
      <button
        className="swap-button"
        onClick={handleSwap}
        disabled={
          loading ||
          actorLoading ||
          !tokenIn ||
          !tokenOut ||
          !amountIn ||
          !quote ||
          parseFloat(amountIn) <= 0
        }
      >
        {loading ? 'Swapping...' : actorLoading ? 'Loading...' : 'Swap'}
      </button>
    </div>
  );
};

// Helper to render swap route
function renderRoute(route: SwapRoute): string {
  if ('Direct' in route) {
    return 'Direct';
  } else if ('MultiHop' in route) {
    return `Multi-hop (${route.MultiHop.pools.length} pools)`;
  }
  return 'Unknown';
}

export default SwapInterface;
