/**
 * Swap Page
 * Fast DEX swap interface powered by KongSwap
 * ~8 second swaps with dynamic slippage
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
  ExternalLink,
  Zap,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { useDualAuth } from '@/lib/auth';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useSwap, TokenConfig, SwapQuote } from '@/hooks/useSwap';
import { WalletButton } from '@/components/wallet';

export default function SwapPage() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const {
    loading,
    error,
    balances,
    loadingBalances,
    clearError,
    loadBalances,
    getQuote,
    executeSwap,
    formatBalance,
    getSupportedTokens,
    hasPool,
    TOKENS,
  } = useSwap();

  // Token selection
  const [fromToken, setFromToken] = useState<TokenConfig>(TOKENS.ICP);
  const [toToken, setToToken] = useState<TokenConfig>(TOKENS.ckBTC);

  // Amounts
  const [fromAmount, setFromAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [slippage, setSlippage] = useState('0.5');
  const [deadline, setDeadline] = useState('30');

  // UI state
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  const [swapSuccess, setSwapSuccess] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [swapDetails, setSwapDetails] = useState<{
    fromAmount: string;
    toAmount: string;
    fromSymbol: string;
    toSymbol: string;
  } | null>(null);

  // Debounced quote fetching
  useEffect(() => {
    const fetchQuote = async () => {
      if (!fromAmount || parseFloat(fromAmount) <= 0) {
        setQuote(null);
        return;
      }

      const amountIn = BigInt(
        Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals))
      );

      if (amountIn <= 0n) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      const newQuote = await getQuote(
        fromToken.symbol,
        toToken.symbol,
        amountIn,
        parseFloat(slippage)
      );
      setQuote(newQuote);
      setQuoteLoading(false);
    };

    const timer = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timer);
  }, [fromAmount, fromToken, toToken, slippage, getQuote]);

  // Format output amount
  const getOutputAmount = (): string => {
    if (!quote) return '';
    const value = Number(quote.amountOut) / Math.pow(10, toToken.decimals);
    return value.toFixed(Math.min(toToken.decimals, 8));
  };

  // Handle swap direction toggle
  const handleSwapDirection = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount('');
    setQuote(null);
  };

  // Handle max amount
  const handleMaxAmount = () => {
    const balance = balances[fromToken.symbol] || 0n;
    // Leave some for gas if ICP
    const buffer = fromToken.symbol === 'ICP' ? 10000n : 0n;
    const maxAmount = balance > buffer ? balance - buffer : 0n;
    const value = Number(maxAmount) / Math.pow(10, fromToken.decimals);
    setFromAmount(value.toString());
  };

  // Execute swap
  const handleSwap = async () => {
    if (!quote || !fromAmount) return;

    clearError();

    // Save details before swap
    const details = {
      fromAmount,
      toAmount: getOutputAmount(),
      fromSymbol: fromToken.symbol,
      toSymbol: toToken.symbol,
    };

    const result = await executeSwap(
      fromToken.symbol,
      toToken.symbol,
      quote.amountIn,
      quote.minimumReceived
    );

    if (result.success) {
      setSwapSuccess(true);
      setTxId(result.txId || null);
      setSwapDetails(details);
      // Don't auto-close - let user dismiss
    }
  };

  // Close success modal
  const closeSuccessModal = () => {
    setSwapSuccess(false);
    setFromAmount('');
    setQuote(null);
    setTxId(null);
    setSwapDetails(null);
  };

  // Check if swap is valid
  const canSwap = (): boolean => {
    if (!quote || loading || quoteLoading) return false;
    if (!hasPool(fromToken.symbol, toToken.symbol)) return false;

    const balance = balances[fromToken.symbol] || 0n;
    return quote.amountIn <= balance;
  };

  // Get button text
  const getButtonText = (): string => {
    if (loading) return 'Swapping...';
    if (quoteLoading) return 'Getting Quote...';
    if (!fromAmount) return 'Enter Amount';
    if (!quote) return 'No Route Found';
    if (!hasPool(fromToken.symbol, toToken.symbol)) return 'No Pool Available';

    const balance = balances[fromToken.symbol] || 0n;
    if (quote.amountIn > balance) return 'Insufficient Balance';

    return 'Swap';
  };

  // Token selector component
  const TokenSelector = ({
    selected,
    onSelect,
    show,
    onClose,
    excludeToken,
  }: {
    selected: TokenConfig;
    onSelect: (token: TokenConfig) => void;
    show: boolean;
    onClose: () => void;
    excludeToken: string;
  }) => {
    if (!show) return null;

    const tokens = getSupportedTokens().filter(t => t.symbol !== excludeToken);

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-museum-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl font-bold text-museum-black">Select Token</h3>
            <button onClick={onClose} className="p-2 hover:bg-museum-cream rounded-lg">
              <X className="h-5 w-5 text-museum-dark-gray" />
            </button>
          </div>
          <div className="space-y-2">
            {tokens.map(token => (
              <button
                key={token.symbol}
                onClick={() => {
                  onSelect(token);
                  onClose();
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                  selected.symbol === token.symbol
                    ? 'border-gold-400 bg-gold-50'
                    : 'border-museum-light-gray hover:border-gold-200'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    token.color === 'purple'
                      ? 'bg-purple-500'
                      : token.color === 'orange'
                      ? 'bg-orange-500'
                      : token.color === 'blue'
                      ? 'bg-blue-500'
                      : token.color === 'cyan'
                      ? 'bg-cyan-500'
                      : 'bg-green-500'
                  }`}
                >
                  <span className="text-white font-bold">{token.icon}</span>
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-museum-black">{token.symbol}</p>
                  <p className="text-sm text-museum-dark-gray">{token.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-museum-black">
                    {loadingBalances
                      ? '...'
                      : formatBalance(balances[token.symbol] || 0n, token.decimals)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Token Swap
          </h1>
          <p className="text-museum-dark-gray">
            Fast atomic swaps powered by KongSwap
          </p>
        </div>
        <div className="border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center bg-museum-white">
          <Wallet className="h-16 w-16 text-museum-dark-gray mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect Your Wallet
          </h2>
          <p className="text-museum-dark-gray mb-8 max-w-md mx-auto">
            Connect with Internet Identity to start swapping tokens
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
            Token Swap
          </h1>
          <span className="text-sm font-semibold text-gold-600 bg-gold-100 px-3 py-1 rounded-full">
            ~8s swaps
          </span>
        </div>
        <p className="text-museum-dark-gray">
          Fast atomic swaps powered by KongSwap
        </p>
      </motion.div>

        {/* Swap Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-6 shadow-lg"
        >
          {/* Header with Settings */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={loadBalances}
              disabled={loadingBalances}
              className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
            >
              <RefreshCw
                className={`h-5 w-5 text-museum-dark-gray ${loadingBalances ? 'animate-spin' : ''}`}
              />
            </button>
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
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-museum-cream rounded-xl"
            >
              <div className="space-y-4">
                <div>
                  <label className="flex items-center text-sm font-semibold text-museum-black mb-2">
                    <Percent className="h-4 w-4 mr-2" />
                    Slippage Tolerance
                  </label>
                  <div className="flex gap-2">
                    {['0.1', '0.5', '1.0', '3.0'].map(val => (
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
                <div>
                  <label className="flex items-center text-sm font-semibold text-museum-black mb-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Transaction Deadline
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={deadline}
                      onChange={e => setDeadline(e.target.value)}
                      className="w-20 px-3 py-2 border border-museum-light-gray rounded-lg text-sm text-center"
                    />
                    <span className="text-sm text-museum-dark-gray">minutes</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* From Token */}
          <div className="bg-museum-cream rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-museum-dark-gray">From</span>
              <span className="text-sm text-museum-dark-gray">
                Balance: {loadingBalances ? '...' : formatBalance(balances[fromToken.symbol] || 0n, fromToken.decimals)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFromSelector(true)}
                className={`flex items-center gap-2 px-4 py-3 bg-museum-white rounded-xl border border-museum-light-gray hover:border-gold-300 transition-colors`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    fromToken.color === 'purple'
                      ? 'bg-purple-500'
                      : fromToken.color === 'orange'
                      ? 'bg-orange-500'
                      : fromToken.color === 'blue'
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                >
                  <span className="text-white font-bold text-sm">{fromToken.icon}</span>
                </div>
                <span className="font-bold text-museum-black">{fromToken.symbol}</span>
                <ChevronDown className="h-4 w-4 text-museum-dark-gray" />
              </button>
              <input
                type="number"
                value={fromAmount}
                onChange={e => setFromAmount(e.target.value)}
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

          {/* To Token */}
          <div className="bg-museum-cream rounded-xl p-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-museum-dark-gray">To</span>
              <span className="text-sm text-museum-dark-gray">
                Balance: {loadingBalances ? '...' : formatBalance(balances[toToken.symbol] || 0n, toToken.decimals)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowToSelector(true)}
                className={`flex items-center gap-2 px-4 py-3 bg-museum-white rounded-xl border border-museum-light-gray hover:border-gold-300 transition-colors`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    toToken.color === 'purple'
                      ? 'bg-purple-500'
                      : toToken.color === 'orange'
                      ? 'bg-orange-500'
                      : toToken.color === 'blue'
                      ? 'bg-blue-500'
                      : 'bg-green-500'
                  }`}
                >
                  <span className="text-white font-bold text-sm">{toToken.icon}</span>
                </div>
                <span className="font-bold text-museum-black">{toToken.symbol}</span>
                <ChevronDown className="h-4 w-4 text-museum-dark-gray" />
              </button>
              <div className="flex-1 text-right">
                {quoteLoading ? (
                  <Loader className="h-6 w-6 animate-spin text-museum-dark-gray ml-auto" />
                ) : (
                  <span className="text-2xl font-mono font-bold text-museum-black">
                    {getOutputAmount() || '0.0'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Swap Details */}
          {quote && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 p-4 bg-museum-cream rounded-xl space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-museum-dark-gray">Rate</span>
                <span className="font-mono text-museum-black">
                  1 {fromToken.symbol} = {quote.executionPrice.toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center text-museum-dark-gray">
                  Price Impact
                  <Info className="h-3 w-3 ml-1" />
                </span>
                <span
                  className={`font-mono ${quote.priceImpact > 3 ? 'text-red-600' : quote.priceImpact > 1 ? 'text-yellow-600' : 'text-green-600'}`}
                >
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-museum-dark-gray">Minimum Received</span>
                <span className="font-mono text-museum-black">
                  {(Number(quote.minimumReceived) / Math.pow(10, toToken.decimals)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-museum-dark-gray">Network Fee</span>
                <span className="font-mono text-museum-black">
                  {(Number(quote.fee) / Math.pow(10, fromToken.decimals)).toFixed(6)} {fromToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-museum-dark-gray">Route</span>
                <span className="font-mono text-museum-black">
                  {quote.route.join(' → ')}
                </span>
              </div>
            </motion.div>
          )}

          {/* Price Impact Warnings */}
          {quote && quote.priceImpact > 1 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
                quote.priceImpact > 5
                  ? 'bg-red-100 border-2 border-red-300'
                  : quote.priceImpact > 3
                  ? 'bg-orange-100 border-2 border-orange-300'
                  : 'bg-yellow-50 border border-yellow-200'
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  quote.priceImpact > 5
                    ? 'text-red-600'
                    : quote.priceImpact > 3
                    ? 'text-orange-600'
                    : 'text-yellow-600'
                }`}
              />
              <div>
                <p
                  className={`font-semibold ${
                    quote.priceImpact > 5
                      ? 'text-red-800'
                      : quote.priceImpact > 3
                      ? 'text-orange-800'
                      : 'text-yellow-800'
                  }`}
                >
                  {quote.priceImpact > 5
                    ? 'Very High Price Impact!'
                    : quote.priceImpact > 3
                    ? 'High Price Impact'
                    : 'Moderate Price Impact'}
                </p>
                <p
                  className={`text-sm ${
                    quote.priceImpact > 5
                      ? 'text-red-700'
                      : quote.priceImpact > 3
                      ? 'text-orange-700'
                      : 'text-yellow-700'
                  }`}
                >
                  {quote.priceImpact > 5
                    ? `${quote.priceImpact.toFixed(2)}% impact will significantly reduce your received amount. Consider swapping smaller amounts.`
                    : quote.priceImpact > 3
                    ? `${quote.priceImpact.toFixed(2)}% price impact. Consider reducing the amount for better rates.`
                    : `${quote.priceImpact.toFixed(2)}% price impact is higher than usual.`}
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

          {/* Swap Button */}
          <div className="mt-6">
            <ButtonPremium
              onClick={handleSwap}
              disabled={!canSwap() || loading}
              variant="gold"
              size="lg"
              className="w-full"
              icon={loading ? <Loader className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
            >
              {getButtonText()}
            </ButtonPremium>
          </div>
        </motion.div>

        {/* Success Modal */}
        <AnimatePresence>
          {swapSuccess && swapDetails && (
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
                    className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </motion.div>
                  <h3 className="font-serif text-2xl font-bold text-museum-black mb-2">
                    Swap Successful!
                  </h3>
                  <p className="text-museum-dark-gray mb-6">
                    Your tokens have been swapped
                  </p>

                  <div className="bg-museum-cream rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-museum-dark-gray">You sent</span>
                      <span className="font-bold text-museum-black">
                        {swapDetails.fromAmount} {swapDetails.fromSymbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-center my-2">
                      <ArrowDownUp className="h-4 w-4 text-museum-dark-gray" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-museum-dark-gray">You received</span>
                      <span className="font-bold text-green-600">
                        ~{swapDetails.toAmount} {swapDetails.toSymbol}
                      </span>
                    </div>
                  </div>

                  {txId && (
                    <p className="text-xs text-museum-dark-gray font-mono mb-6 break-all">
                      TX: {txId}
                    </p>
                  )}

                  <ButtonPremium
                    onClick={closeSuccessModal}
                    variant="gold"
                    size="lg"
                    className="w-full"
                  >
                    Done
                  </ButtonPremium>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Powered by KongSwap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <a
            href="https://kongswap.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-museum-dark-gray hover:text-gold-600 transition-colors"
          >
            <Zap className="h-3 w-3" />
            Powered by KongSwap
            <ExternalLink className="h-3 w-3" />
          </a>
        </motion.div>

        {/* Features Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-gradient-to-br from-gold-50 to-gold-100 border border-gold-200 rounded-xl p-4 text-center">
            <Zap className="h-6 w-6 text-gold-600 mx-auto mb-2" />
            <p className="font-bold text-gold-900 text-sm">Fast Swaps</p>
            <p className="text-xs text-gold-700">~8 seconds</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4 text-center">
            <Shield className="h-6 w-6 text-green-600 mx-auto mb-2" />
            <p className="font-bold text-green-900 text-sm">Atomic</p>
            <p className="text-xs text-green-700">Single transaction</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center">
            <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
            <p className="font-bold text-blue-900 text-sm">Best Routes</p>
            <p className="text-xs text-blue-700">Auto-optimized</p>
          </div>
        </motion.div>

        {/* Token Selectors */}
        <TokenSelector
          selected={fromToken}
          onSelect={setFromToken}
          show={showFromSelector}
          onClose={() => setShowFromSelector(false)}
          excludeToken={toToken.symbol}
        />
        <TokenSelector
          selected={toToken}
          onSelect={setToToken}
          show={showToSelector}
          onClose={() => setShowToSelector(false)}
          excludeToken={fromToken.symbol}
        />
    </div>
  );
}
