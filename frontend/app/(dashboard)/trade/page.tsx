/**
 * Virtual Runes Trading Page
 * Trade Virtual Runes using ICP with bonding curve AMM
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownUp,
  Settings,
  Info,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Loader,
  CheckCircle,
  X,
  Wallet,
  Clock,
  Percent,
  TrendingUp,
  TrendingDown,
  Coins,
  Zap,
  Copy,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { useDualAuth } from '@/lib/auth';
import { WalletButton } from '@/components/wallet';
import useTrading from '@/hooks/useTrading';
import type { TradingPoolView, TradeQuoteView } from '@/types/canisters';

export default function TradePage() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const {
    loading,
    error,
    clearError,
    listPools,
    getPool,
    getBuyQuote,
    getSellQuote,
    buyRune,
    sellRune,
    getMyIcpBalance,
    getMyRuneBalance,
    formatIcp,
    parseIcpToE8s,
    E8S_PER_ICP,
  } = useTrading();

  // Available pools
  const [pools, setPools] = useState<TradingPoolView[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);

  // Selected pool
  const [selectedPool, setSelectedPool] = useState<TradingPoolView | null>(null);
  const [showPoolSelector, setShowPoolSelector] = useState(false);

  // Trade mode
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');

  // Amounts
  const [inputAmount, setInputAmount] = useState('');
  const [quote, setQuote] = useState<TradeQuoteView | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Balances
  const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [runeBalance, setRuneBalance] = useState<bigint>(0n);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');

  // Success state
  const [tradeSuccess, setTradeSuccess] = useState(false);
  const [tradeDetails, setTradeDetails] = useState<{
    type: 'buy' | 'sell';
    inputAmount: string;
    outputAmount: string;
    runeSymbol: string;
  } | null>(null);

  // Load pools
  const loadPools = useCallback(async () => {
    setLoadingPools(true);
    try {
      const fetchedPools = await listPools(0n, 50n);
      setPools(fetchedPools);
      if (fetchedPools.length > 0 && !selectedPool) {
        setSelectedPool(fetchedPools[0]);
      }
    } catch (err) {
      console.error('Failed to load pools:', err);
    } finally {
      setLoadingPools(false);
    }
  }, [listPools, selectedPool]);

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!isConnected || !selectedPool) return;

    setLoadingBalances(true);
    try {
      const [icp, rune] = await Promise.all([
        getMyIcpBalance(),
        getMyRuneBalance(selectedPool.rune_id),
      ]);
      setIcpBalance(icp);
      setRuneBalance(rune?.available || 0n);
    } catch (err) {
      console.error('Failed to load balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  }, [isConnected, selectedPool, getMyIcpBalance, getMyRuneBalance]);

  // Initial load
  useEffect(() => {
    loadPools();
  }, [loadPools]);

  // Load balances when pool changes or connection changes
  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  // Fetch quote when input changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !selectedPool) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      try {
        const slippageBps = parseFloat(slippage) * 100;

        if (tradeMode === 'buy') {
          const icpE8s = parseIcpToE8s(parseFloat(inputAmount));
          const q = await getBuyQuote(selectedPool.rune_id, parseFloat(inputAmount), parseFloat(slippage));
          setQuote(q);
        } else {
          const runeAmount = BigInt(Math.floor(parseFloat(inputAmount)));
          const q = await getSellQuote(selectedPool.rune_id, Number(runeAmount), parseFloat(slippage));
          setQuote(q);
        }
      } catch (err) {
        console.error('Failed to get quote:', err);
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [inputAmount, selectedPool, tradeMode, slippage, getBuyQuote, getSellQuote, parseIcpToE8s]);

  // Format output amount
  const getOutputAmount = (): string => {
    if (!quote) return '0';
    if (tradeMode === 'buy') {
      return quote.output_amount.toString();
    } else {
      return formatIcp(quote.output_amount);
    }
  };

  // Handle trade direction toggle
  const handleSwapDirection = () => {
    setTradeMode(tradeMode === 'buy' ? 'sell' : 'buy');
    setInputAmount('');
    setQuote(null);
  };

  // Handle max amount
  const handleMaxAmount = () => {
    if (tradeMode === 'buy') {
      // Leave some for fees
      const maxIcp = icpBalance > 100000n ? icpBalance - 100000n : 0n;
      const icpAmount = Number(maxIcp) / Number(E8S_PER_ICP);
      setInputAmount(icpAmount.toString());
    } else {
      setInputAmount(runeBalance.toString());
    }
  };

  // Execute trade
  const handleTrade = async () => {
    if (!quote || !selectedPool || !inputAmount) return;

    clearError();

    const details = {
      type: tradeMode,
      inputAmount,
      outputAmount: getOutputAmount(),
      runeSymbol: selectedPool.symbol,
    };

    let result;
    if (tradeMode === 'buy') {
      result = await buyRune(
        selectedPool.rune_id,
        parseFloat(inputAmount),
        quote.minimum_output
      );
    } else {
      result = await sellRune(
        selectedPool.rune_id,
        parseInt(inputAmount),
        quote.minimum_output
      );
    }

    if (result.success) {
      setTradeSuccess(true);
      setTradeDetails(details);
      setInputAmount('');
      setQuote(null);
      loadBalances();
    }
  };

  // Close success modal
  const closeSuccessModal = () => {
    setTradeSuccess(false);
    setTradeDetails(null);
  };

  // Check if trade is valid
  const canTrade = (): boolean => {
    if (!quote || loading || quoteLoading || !selectedPool) return false;

    if (tradeMode === 'buy') {
      const icpNeeded = parseIcpToE8s(parseFloat(inputAmount || '0'));
      return icpNeeded <= icpBalance;
    } else {
      const runeNeeded = BigInt(Math.floor(parseFloat(inputAmount || '0')));
      return runeNeeded <= runeBalance;
    }
  };

  // Get button text
  const getButtonText = (): string => {
    if (loading) return 'Processing...';
    if (quoteLoading) return 'Getting Quote...';
    if (!inputAmount) return 'Enter Amount';
    if (!quote) return 'No Quote Available';

    if (tradeMode === 'buy') {
      const icpNeeded = parseIcpToE8s(parseFloat(inputAmount || '0'));
      if (icpNeeded > icpBalance) return 'Insufficient ICP Balance';
      return `Buy ${selectedPool?.symbol || 'Runes'}`;
    } else {
      const runeNeeded = BigInt(Math.floor(parseFloat(inputAmount || '0')));
      if (runeNeeded > runeBalance) return 'Insufficient Rune Balance';
      return `Sell ${selectedPool?.symbol || 'Runes'}`;
    }
  };

  // Pool selector component
  const PoolSelector = () => {
    if (!showPoolSelector) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-museum-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl font-bold text-museum-black">Select Rune</h3>
            <button
              onClick={() => setShowPoolSelector(false)}
              className="p-2 hover:bg-museum-cream rounded-lg"
            >
              <X className="h-5 w-5 text-museum-dark-gray" />
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto max-h-[60vh]">
            {pools.length === 0 ? (
              <div className="text-center py-8 text-museum-dark-gray">
                No trading pools available yet
              </div>
            ) : (
              pools.map(pool => (
                <button
                  key={pool.rune_id}
                  onClick={() => {
                    setSelectedPool(pool);
                    setShowPoolSelector(false);
                    setInputAmount('');
                    setQuote(null);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                    selectedPool?.rune_id === pool.rune_id
                      ? 'border-gold-400 bg-gold-50'
                      : 'border-museum-light-gray hover:border-gold-200'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">{pool.symbol.slice(0, 2)}</span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-museum-black">{pool.rune_name}</p>
                    <p className="text-sm text-museum-dark-gray">{pool.symbol}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-museum-black">
                      {formatIcp(pool.price_per_rune)}
                    </p>
                    <p className="text-xs text-museum-dark-gray">per rune</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Trade Virtual Runes
          </h1>
          <p className="text-museum-dark-gray">
            Buy and sell Virtual Runes with ICP using bonding curve AMM
          </p>
        </div>
        <div className="border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center bg-museum-white">
          <Wallet className="h-16 w-16 text-museum-dark-gray mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect Your Wallet
          </h2>
          <p className="text-museum-dark-gray mb-8 max-w-md mx-auto">
            Connect with Internet Identity to start trading Virtual Runes
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <h1 className="font-serif text-4xl font-bold text-museum-black">
            Trade Virtual Runes
          </h1>
          <span className="text-sm font-semibold text-gold-600 bg-gold-100 px-3 py-1 rounded-full">
            AMM
          </span>
        </div>
        <p className="text-museum-dark-gray">
          Buy and sell Virtual Runes with ICP using bonding curve pricing
        </p>
      </motion.div>

      {/* Balances Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-gold-50 to-gold-100 border border-gold-200 rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gold-900">Your Balances</h3>
          <button
            onClick={loadBalances}
            disabled={loadingBalances}
            className="p-2 hover:bg-gold-200/50 rounded-lg transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 text-gold-700 ${loadingBalances ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/60 rounded-xl p-4">
            <p className="text-sm text-gold-700 mb-1">ICP Balance</p>
            <p className="text-2xl font-bold font-mono text-gold-900">
              {loadingBalances ? '...' : formatIcp(icpBalance)}
            </p>
          </div>
          {selectedPool && (
            <div className="bg-white/60 rounded-xl p-4">
              <p className="text-sm text-gold-700 mb-1">{selectedPool.symbol} Balance</p>
              <p className="text-2xl font-bold font-mono text-gold-900">
                {loadingBalances ? '...' : runeBalance.toString()}
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Trading Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-6 shadow-lg"
      >
        {/* Header with Settings */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setTradeMode('buy');
                setInputAmount('');
                setQuote(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                tradeMode === 'buy'
                  ? 'bg-green-500 text-white'
                  : 'bg-museum-cream text-museum-dark-gray hover:bg-museum-light-gray'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Buy
            </button>
            <button
              onClick={() => {
                setTradeMode('sell');
                setInputAmount('');
                setQuote(null);
              }}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                tradeMode === 'sell'
                  ? 'bg-red-500 text-white'
                  : 'bg-museum-cream text-museum-dark-gray hover:bg-museum-light-gray'
              }`}
            >
              <TrendingDown className="h-4 w-4 inline mr-2" />
              Sell
            </button>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showSettings ? 'bg-gold-100 text-gold-600' : 'hover:bg-museum-cream text-museum-dark-gray'
            }`}
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-museum-cream rounded-xl"
            >
              <div>
                <label className="flex items-center text-sm font-semibold text-museum-black mb-2">
                  <Percent className="h-4 w-4 mr-2" />
                  Slippage Tolerance
                </label>
                <div className="flex gap-2">
                  {['0.5', '1.0', '2.0', '5.0'].map(val => (
                    <button
                      key={val}
                      onClick={() => setSlippage(val)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        slippage === val
                          ? 'bg-gold-500 text-white'
                          : 'bg-museum-white border border-museum-light-gray hover:border-gold-300'
                      }`}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pool Selector */}
        <div className="mb-4">
          <label className="text-sm text-museum-dark-gray mb-2 block">Trading Pool</label>
          <button
            onClick={() => setShowPoolSelector(true)}
            className="w-full flex items-center gap-3 p-4 bg-museum-cream rounded-xl border border-museum-light-gray hover:border-gold-300 transition-colors"
          >
            {selectedPool ? (
              <>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {selectedPool.symbol.slice(0, 2)}
                  </span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-museum-black">{selectedPool.rune_name}</p>
                  <p className="text-sm text-museum-dark-gray">{selectedPool.symbol}</p>
                </div>
                <ChevronDown className="h-5 w-5 text-museum-dark-gray" />
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-museum-light-gray flex items-center justify-center">
                  <Coins className="h-5 w-5 text-museum-dark-gray" />
                </div>
                <span className="text-museum-dark-gray">Select a rune to trade</span>
                <ChevronDown className="h-5 w-5 text-museum-dark-gray ml-auto" />
              </>
            )}
          </button>
        </div>

        {/* Input Section */}
        <div className="bg-museum-cream rounded-xl p-4 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-museum-dark-gray">
              {tradeMode === 'buy' ? 'Pay with ICP' : `Sell ${selectedPool?.symbol || 'Runes'}`}
            </span>
            <span className="text-sm text-museum-dark-gray">
              Balance:{' '}
              {tradeMode === 'buy'
                ? formatIcp(icpBalance)
                : `${runeBalance} ${selectedPool?.symbol || ''}`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-museum-white rounded-xl">
              {tradeMode === 'buy' ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ICP</span>
                  </div>
                  <span className="font-bold text-museum-black">ICP</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {selectedPool?.symbol.slice(0, 2) || '??'}
                    </span>
                  </div>
                  <span className="font-bold text-museum-black">{selectedPool?.symbol || '---'}</span>
                </>
              )}
            </div>
            <input
              type="number"
              value={inputAmount}
              onChange={e => setInputAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 text-right text-2xl font-mono font-bold bg-transparent outline-none text-museum-black placeholder:text-museum-dark-gray/50"
            />
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={handleMaxAmount}
              className="text-xs font-medium text-gold-600 hover:text-gold-700"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-3 relative z-10">
          <button
            onClick={handleSwapDirection}
            className="p-3 bg-museum-white border-2 border-museum-light-gray rounded-xl hover:border-gold-300 hover:bg-gold-50 transition-all shadow-md"
          >
            <ArrowDownUp className="h-5 w-5 text-museum-dark-gray" />
          </button>
        </div>

        {/* Output Section */}
        <div className="bg-museum-cream rounded-xl p-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-museum-dark-gray">
              {tradeMode === 'buy' ? `Receive ${selectedPool?.symbol || 'Runes'}` : 'Receive ICP'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-3 bg-museum-white rounded-xl">
              {tradeMode === 'buy' ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {selectedPool?.symbol.slice(0, 2) || '??'}
                    </span>
                  </div>
                  <span className="font-bold text-museum-black">{selectedPool?.symbol || '---'}</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">ICP</span>
                  </div>
                  <span className="font-bold text-museum-black">ICP</span>
                </>
              )}
            </div>
            <div className="flex-1 text-right">
              {quoteLoading ? (
                <Loader className="h-6 w-6 animate-spin text-museum-dark-gray ml-auto" />
              ) : (
                <span className="text-2xl font-mono font-bold text-museum-black">
                  {getOutputAmount()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quote Details */}
        {quote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-4 bg-museum-cream rounded-xl space-y-3"
          >
            <div className="flex items-center justify-between text-sm">
              <span className="text-museum-dark-gray">Rate</span>
              <span className="font-mono text-museum-black">
                1 {selectedPool?.symbol} = {formatIcp(quote.price_per_rune)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center text-museum-dark-gray">
                Price Impact
                <Info className="h-3 w-3 ml-1" />
              </span>
              <span
                className={`font-mono ${
                  quote.price_impact_percent > 5
                    ? 'text-red-600'
                    : quote.price_impact_percent > 2
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {quote.price_impact_percent.toFixed(2)}%
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-museum-dark-gray">Trading Fee (0.3%)</span>
              <span className="font-mono text-museum-black">{formatIcp(quote.fee)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-museum-dark-gray">Minimum Received</span>
              <span className="font-mono text-museum-black">
                {tradeMode === 'buy'
                  ? quote.minimum_output.toString()
                  : formatIcp(quote.minimum_output)}{' '}
                {tradeMode === 'buy' ? selectedPool?.symbol : 'ICP'}
              </span>
            </div>
          </motion.div>
        )}

        {/* Price Impact Warning */}
        {quote && quote.price_impact_percent > 2 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
              quote.price_impact_percent > 10
                ? 'bg-red-100 border-2 border-red-300'
                : quote.price_impact_percent > 5
                ? 'bg-orange-100 border-2 border-orange-300'
                : 'bg-yellow-50 border border-yellow-200'
            }`}
          >
            <AlertTriangle
              className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                quote.price_impact_percent > 10
                  ? 'text-red-600'
                  : quote.price_impact_percent > 5
                  ? 'text-orange-600'
                  : 'text-yellow-600'
              }`}
            />
            <div>
              <p
                className={`font-semibold ${
                  quote.price_impact_percent > 10
                    ? 'text-red-800'
                    : quote.price_impact_percent > 5
                    ? 'text-orange-800'
                    : 'text-yellow-800'
                }`}
              >
                {quote.price_impact_percent > 10
                  ? 'Very High Price Impact!'
                  : quote.price_impact_percent > 5
                  ? 'High Price Impact'
                  : 'Moderate Price Impact'}
              </p>
              <p
                className={`text-sm ${
                  quote.price_impact_percent > 10
                    ? 'text-red-700'
                    : quote.price_impact_percent > 5
                    ? 'text-orange-700'
                    : 'text-yellow-700'
                }`}
              >
                Consider trading a smaller amount for better rates.
              </p>
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Trade Button */}
        <div className="mt-6">
          <ButtonPremium
            onClick={handleTrade}
            disabled={!canTrade() || loading || !selectedPool}
            variant="gold"
            size="lg"
            className="w-full"
            icon={
              loading ? (
                <Loader className="h-5 w-5 animate-spin" />
              ) : tradeMode === 'buy' ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )
            }
          >
            {getButtonText()}
          </ButtonPremium>
        </div>
      </motion.div>

      {/* Pool Info */}
      {selectedPool && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-museum-white border border-museum-light-gray rounded-2xl p-6"
        >
          <h3 className="font-serif text-lg font-bold text-museum-black mb-4">Pool Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-museum-dark-gray mb-1">Price</p>
              <p className="font-mono font-bold text-museum-black">
                {formatIcp(selectedPool.price_per_rune)}
              </p>
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray mb-1">Market Cap</p>
              <p className="font-mono font-bold text-museum-black">
                {formatIcp(selectedPool.market_cap)}
              </p>
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray mb-1">ICP Liquidity</p>
              <p className="font-mono font-bold text-museum-black">
                {formatIcp(selectedPool.icp_reserve)}
              </p>
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray mb-1">Total Trades</p>
              <p className="font-mono font-bold text-museum-black">
                {selectedPool.total_trades.toString()}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success Modal */}
      <AnimatePresence>
        {tradeSuccess && tradeDetails && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={closeSuccessModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-museum-white rounded-2xl p-8 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    tradeDetails.type === 'buy' ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  <CheckCircle
                    className={`h-10 w-10 ${
                      tradeDetails.type === 'buy' ? 'text-green-600' : 'text-red-600'
                    }`}
                  />
                </motion.div>
                <h3 className="font-serif text-2xl font-bold text-museum-black mb-2">
                  {tradeDetails.type === 'buy' ? 'Purchase' : 'Sale'} Successful!
                </h3>
                <p className="text-museum-dark-gray mb-6">Your trade has been executed</p>

                <div className="bg-museum-cream rounded-xl p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-museum-dark-gray">You {tradeDetails.type === 'buy' ? 'paid' : 'sold'}</span>
                    <span className="font-bold text-museum-black">
                      {tradeDetails.inputAmount}{' '}
                      {tradeDetails.type === 'buy' ? 'ICP' : tradeDetails.runeSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-center my-2">
                    <ArrowDownUp className="h-4 w-4 text-museum-dark-gray" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-museum-dark-gray">You received</span>
                    <span
                      className={`font-bold ${tradeDetails.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}
                    >
                      ~{tradeDetails.outputAmount}{' '}
                      {tradeDetails.type === 'buy' ? tradeDetails.runeSymbol : 'ICP'}
                    </span>
                  </div>
                </div>

                <ButtonPremium onClick={closeSuccessModal} variant="gold" size="lg" className="w-full">
                  Done
                </ButtonPremium>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pool Selector Modal */}
      <PoolSelector />
    </div>
  );
}
