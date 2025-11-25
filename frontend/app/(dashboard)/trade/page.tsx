/**
 * Virtual Runes Trading Page
 * Trade Virtual Runes using ICP with bonding curve AMM
 *
 * UX Flow:
 * 1. Connect Wallet
 * 2. Deposit ICP (if needed)
 * 3. Select a Rune to trade
 * 4. Buy or Sell
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  Percent,
  TrendingUp,
  TrendingDown,
  Coins,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Search,
  ArrowRight,
  Sparkles,
  BookOpen,
  DollarSign,
  BarChart3,
  HelpCircle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { useDualAuth } from '@/lib/auth';
import { WalletButton } from '@/components/wallet';
import useTrading from '@/hooks/useTrading';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import type { TradingPoolView, TradeQuoteView, VirtualRuneView } from '@/types/canisters';

export default function TradePage() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const searchParams = useSearchParams();
  const runeIdFromUrl = searchParams.get('rune');

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
    getDepositAddress,
    createPool,
    formatIcp,
    parseIcpToE8s,
    E8S_PER_ICP,
  } = useTrading();

  const { getVirtualRune } = useRuneEngine();

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

  // Deposit
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

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

  // Show help
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Pending rune (from URL, no pool yet)
  const [pendingRune, setPendingRune] = useState<VirtualRuneView | null>(null);
  const [showCreatePoolModal, setShowCreatePoolModal] = useState(false);
  const [createPoolIcp, setCreatePoolIcp] = useState('1');
  const [createPoolRunes, setCreatePoolRunes] = useState('1000000');
  const [creatingPool, setCreatingPool] = useState(false);

  // Load pools
  const loadPools = useCallback(async () => {
    setLoadingPools(true);
    setPendingRune(null);
    try {
      const fetchedPools = await listPools(0n, 50n);
      setPools(fetchedPools);

      // If there's a rune ID in the URL, select that pool or fetch rune details
      if (runeIdFromUrl) {
        const poolFromUrl = fetchedPools.find(p => p.rune_id === runeIdFromUrl);
        if (poolFromUrl) {
          setSelectedPool(poolFromUrl);
        } else {
          // No pool exists - try to fetch rune details to enable pool creation
          try {
            const rune = await getVirtualRune(runeIdFromUrl);
            if (rune) {
              setPendingRune(rune);
              setShowCreatePoolModal(true);
            }
          } catch (e) {
            console.error('Failed to fetch rune:', e);
          }
        }
      } else if (fetchedPools.length > 0 && !selectedPool) {
        setSelectedPool(fetchedPools[0]);
      }
    } catch (err) {
      console.error('Failed to load pools:', err);
    } finally {
      setLoadingPools(false);
    }
  }, [listPools, runeIdFromUrl, getVirtualRune]);

  // Load balances
  const loadBalances = useCallback(async () => {
    if (!isConnected) return;

    setLoadingBalances(true);
    try {
      const [icp, rune] = await Promise.all([
        getMyIcpBalance(),
        selectedPool ? getMyRuneBalance(selectedPool.rune_id) : Promise.resolve(null),
      ]);
      setIcpBalance(icp);
      setRuneBalance(rune?.available || 0n);
    } catch (err) {
      console.error('Failed to load balances:', err);
    } finally {
      setLoadingBalances(false);
    }
  }, [isConnected, selectedPool, getMyIcpBalance, getMyRuneBalance]);

  // Load deposit address
  const loadDepositAddress = useCallback(async () => {
    if (!isConnected) return;
    try {
      const address = await getDepositAddress();
      setDepositAddress(address);
    } catch (err) {
      console.error('Failed to get deposit address:', err);
    }
  }, [isConnected, getDepositAddress]);

  // Initial load
  useEffect(() => {
    loadPools();
  }, [loadPools]);

  // Load balances and deposit address when connected
  useEffect(() => {
    loadBalances();
    loadDepositAddress();
  }, [loadBalances, loadDepositAddress]);

  // Fetch quote when input changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !selectedPool) {
        setQuote(null);
        return;
      }

      setQuoteLoading(true);
      try {
        if (tradeMode === 'buy') {
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
  }, [inputAmount, selectedPool, tradeMode, slippage, getBuyQuote, getSellQuote]);

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

  // Copy deposit address
  const handleCopyAddress = async () => {
    if (depositAddress) {
      await navigator.clipboard.writeText(depositAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
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

  // Handle create pool
  const handleCreatePool = async () => {
    if (!pendingRune) return;

    setCreatingPool(true);
    try {
      const icpAmount = parseFloat(createPoolIcp);
      const runeAmount = parseInt(createPoolRunes);

      if (icpAmount < 0.001) {
        alert('Minimum ICP is 0.001');
        return;
      }

      const pool = await createPool(pendingRune.rune_id, icpAmount, runeAmount);

      if (pool) {
        setShowCreatePoolModal(false);
        setPendingRune(null);
        setSelectedPool(pool);
        // Reload pools to update the list
        await loadPools();
      }
    } catch (err) {
      console.error('Failed to create pool:', err);
    } finally {
      setCreatingPool(false);
    }
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

  // ============================================================================
  // RENDER: Not connected state
  // ============================================================================
  if (!isConnected) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Trade Virtual Runes
          </h1>
          <p className="text-museum-dark-gray">
            Buy and sell Virtual Runes with ICP using bonding curve AMM
          </p>
        </div>

        {/* How it Works Preview */}
        <div className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-2xl p-6">
          <h3 className="font-serif text-lg font-bold text-gold-900 mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            How Virtual Rune Trading Works
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mb-3">
                <span className="text-gold-600 font-bold">1</span>
              </div>
              <h4 className="font-semibold text-museum-black mb-1">Deposit ICP</h4>
              <p className="text-sm text-museum-dark-gray">
                Send ICP to your trading account to start buying runes
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mb-3">
                <span className="text-gold-600 font-bold">2</span>
              </div>
              <h4 className="font-semibold text-museum-black mb-1">Select a Rune</h4>
              <p className="text-sm text-museum-dark-gray">
                Choose from available Virtual Runes with active trading pools
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mb-3">
                <span className="text-gold-600 font-bold">3</span>
              </div>
              <h4 className="font-semibold text-museum-black mb-1">Buy or Sell</h4>
              <p className="text-sm text-museum-dark-gray">
                Trade instantly with bonding curve pricing - no order book needed
              </p>
            </div>
          </div>
        </div>

        {/* Connect Wallet CTA */}
        <div className="border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center bg-museum-white">
          <Wallet className="h-16 w-16 text-museum-dark-gray mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect Your Wallet to Start Trading
          </h2>
          <p className="text-museum-dark-gray mb-8 max-w-md mx-auto">
            Connect with Internet Identity to deposit ICP and trade Virtual Runes
          </p>
          <WalletButton />
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: No pools available - Empty State
  // ============================================================================
  if (!loadingPools && pools.length === 0) {
    return (
      <div className="space-y-8 max-w-3xl mx-auto">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Trade Virtual Runes
          </h1>
          <p className="text-museum-dark-gray">
            Buy and sell Virtual Runes with ICP using bonding curve AMM
          </p>
        </div>

        {/* Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-12 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-100 to-gold-200 flex items-center justify-center mx-auto mb-6">
            <Coins className="h-10 w-10 text-gold-600" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-3">
            No Trading Pools Yet
          </h2>
          <p className="text-museum-dark-gray mb-6 max-w-md mx-auto">
            Virtual Rune trading pools are created when users mint new runes in the Explorer.
            Be the first to create a rune and start trading!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/explorer">
              <ButtonPremium variant="gold" size="lg" icon={<Plus className="h-5 w-5" />}>
                Create a Virtual Rune
              </ButtonPremium>
            </Link>
            <button
              onClick={loadPools}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-museum-light-gray hover:border-gold-300 hover:bg-gold-50 transition-all font-semibold"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* How It Works Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-museum-cream to-museum-white border border-museum-light-gray rounded-2xl p-6"
        >
          <h3 className="font-serif text-xl font-bold text-museum-black mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold-600" />
            How Trading Pools Work
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-museum-black">Bonding Curve Pricing</h4>
                  <p className="text-sm text-museum-dark-gray">
                    Prices automatically adjust based on supply and demand.
                    Buy pressure increases price, sell pressure decreases it.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-museum-black">Instant Trading</h4>
                  <p className="text-sm text-museum-dark-gray">
                    No waiting for orders to match. Trade immediately at the current market price.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-museum-black">Graduation Mechanism</h4>
                  <p className="text-sm text-museum-dark-gray">
                    When a pool reaches 85 ICP market cap, it "graduates" to full DEX listing
                    with LP tokens.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-gold-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-museum-black">Fair Launch</h4>
                  <p className="text-sm text-museum-dark-gray">
                    Everyone buys at the same curve. No pre-sales, no insiders,
                    just fair market pricing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Main Trading Interface
  // ============================================================================
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-museum-black">
              Trade Virtual Runes
            </h1>
            <span className="text-xs font-semibold text-gold-600 bg-gold-100 px-2 py-1 rounded-full">
              AMM
            </span>
          </div>
          <button
            onClick={() => setShowHowItWorks(!showHowItWorks)}
            className="flex items-center gap-1 text-sm text-museum-dark-gray hover:text-gold-600 transition-colors"
          >
            <HelpCircle className="h-4 w-4" />
            How it works
          </button>
        </div>
        <p className="text-museum-dark-gray text-sm">
          Buy and sell Virtual Runes instantly with bonding curve pricing
        </p>
      </motion.div>

      {/* How It Works Expandable */}
      <AnimatePresence>
        {showHowItWorks && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-2xl p-5">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mx-auto mb-2">
                    <DollarSign className="h-5 w-5 text-gold-600" />
                  </div>
                  <h4 className="font-semibold text-museum-black text-sm">1. Deposit ICP</h4>
                  <p className="text-xs text-museum-dark-gray">Send ICP to trade</p>
                </div>
                <div>
                  <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mx-auto mb-2">
                    <Coins className="h-5 w-5 text-gold-600" />
                  </div>
                  <h4 className="font-semibold text-museum-black text-sm">2. Select Rune</h4>
                  <p className="text-xs text-museum-dark-gray">Choose a pool</p>
                </div>
                <div>
                  <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mx-auto mb-2">
                    <ArrowDownUp className="h-5 w-5 text-gold-600" />
                  </div>
                  <h4 className="font-semibold text-museum-black text-sm">3. Trade</h4>
                  <p className="text-xs text-museum-dark-gray">Buy or sell instantly</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balances & Deposit Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-br from-gold-50 to-gold-100 border border-gold-200 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gold-900">Your Trading Balance</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-gold-500 text-white rounded-lg text-sm font-semibold hover:bg-gold-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Deposit ICP
            </button>
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
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/60 rounded-xl p-4">
            <p className="text-sm text-gold-700 mb-1">ICP Balance</p>
            <p className="text-2xl font-bold font-mono text-gold-900">
              {loadingBalances ? '...' : formatIcp(icpBalance)}
            </p>
            {icpBalance === 0n && !loadingBalances && (
              <p className="text-xs text-gold-600 mt-1">
                Deposit ICP to start trading
              </p>
            )}
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
        className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-5 shadow-lg"
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
              className="mb-4 p-4 bg-museum-cream rounded-xl"
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
          <label className="text-sm text-museum-dark-gray mb-2 block">Select Rune to Trade</label>
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
                  <p className="text-sm text-museum-dark-gray">
                    {selectedPool.symbol} • {formatIcp(selectedPool.price_per_rune)}/rune
                  </p>
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
              {tradeMode === 'buy' ? 'You pay (ICP)' : `You sell (${selectedPool?.symbol || 'Runes'})`}
            </span>
            <span className="text-sm text-museum-dark-gray">
              Balance:{' '}
              <span className="font-mono">
                {tradeMode === 'buy'
                  ? formatIcp(icpBalance)
                  : `${runeBalance} ${selectedPool?.symbol || ''}`}
              </span>
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
              {tradeMode === 'buy' ? `You receive (${selectedPool?.symbol || 'Runes'})` : 'You receive (ICP)'}
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
            className="mt-4 p-4 bg-museum-cream rounded-xl space-y-2"
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
              <span className="text-museum-dark-gray">Fee (0.3%)</span>
              <span className="font-mono text-museum-black">{formatIcp(quote.fee)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-museum-dark-gray">Min. Received</span>
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
                className={`font-semibold text-sm ${
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
                className={`text-xs ${
                  quote.price_impact_percent > 10
                    ? 'text-red-700'
                    : quote.price_impact_percent > 5
                    ? 'text-orange-700'
                    : 'text-yellow-700'
                }`}
              >
                Trade a smaller amount for better rates
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
          {icpBalance === 0n && tradeMode === 'buy' ? (
            <ButtonPremium
              onClick={() => setShowDepositModal(true)}
              variant="gold"
              size="lg"
              className="w-full"
              icon={<Plus className="h-5 w-5" />}
            >
              Deposit ICP to Start Trading
            </ButtonPremium>
          ) : (
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
          )}
        </div>
      </motion.div>

      {/* Pool Info */}
      {selectedPool && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-museum-white border border-museum-light-gray rounded-2xl p-5"
        >
          <h3 className="font-serif text-lg font-bold text-museum-black mb-4">Pool Info</h3>
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
              <p className="text-sm text-museum-dark-gray mb-1">Liquidity</p>
              <p className="font-mono font-bold text-museum-black">
                {formatIcp(selectedPool.icp_reserve)}
              </p>
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray mb-1">Trades</p>
              <p className="font-mono font-bold text-museum-black">
                {selectedPool.total_trades.toString()}
              </p>
            </div>
          </div>

          {/* Graduation Progress */}
          {selectedPool.status === 'Active' && (
            <div className="mt-4 pt-4 border-t border-museum-light-gray">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-museum-dark-gray">Graduation Progress</span>
                <span className="text-sm font-mono text-gold-600">
                  {formatIcp(selectedPool.market_cap)} / 85 ICP
                </span>
              </div>
              <div className="w-full h-2 bg-museum-light-gray rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold-400 to-gold-600 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (Number(selectedPool.market_cap) / Number(85_00000000n)) * 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-museum-dark-gray mt-2">
                At 85 ICP, this pool graduates to full DEX listing with LP tokens
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Pool Selector Modal */}
      <AnimatePresence>
        {showPoolSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPoolSelector(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-museum-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
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

              <p className="text-sm text-museum-dark-gray mb-4">
                Choose a Virtual Rune to trade. Each rune has its own bonding curve pool.
              </p>

              <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                {loadingPools ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="h-8 w-8 animate-spin text-gold-500" />
                  </div>
                ) : pools.length === 0 ? (
                  <div className="text-center py-8">
                    <Coins className="h-12 w-12 text-museum-dark-gray mx-auto mb-3" />
                    <p className="text-museum-dark-gray mb-4">No trading pools available</p>
                    <Link href="/explorer">
                      <ButtonPremium variant="gold" size="sm" icon={<Plus className="h-4 w-4" />}>
                        Create a Rune
                      </ButtonPremium>
                    </Link>
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
                          : 'border-museum-light-gray hover:border-gold-200 hover:bg-museum-cream'
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDepositModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-museum-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-bold text-museum-black">Deposit ICP</h3>
                <button
                  onClick={() => setShowDepositModal(false)}
                  className="p-2 hover:bg-museum-cream rounded-lg"
                >
                  <X className="h-5 w-5 text-museum-dark-gray" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-gold-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-gold-800">
                      <p className="font-semibold mb-1">How to deposit:</p>
                      <ol className="list-decimal list-inside space-y-1 text-gold-700">
                        <li>Copy your deposit address below</li>
                        <li>Send ICP from your wallet or exchange</li>
                        <li>Wait for confirmation (usually instant)</li>
                        <li>Your balance will update automatically</li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-museum-black mb-2 block">
                    Your Deposit Address
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-museum-cream rounded-xl p-3 font-mono text-sm break-all">
                      {depositAddress || 'Loading...'}
                    </div>
                    <button
                      onClick={handleCopyAddress}
                      disabled={!depositAddress}
                      className="p-3 bg-gold-500 text-white rounded-xl hover:bg-gold-600 transition-colors disabled:opacity-50"
                    >
                      {copiedAddress ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Copy className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {copiedAddress && (
                    <p className="text-sm text-green-600 mt-2">Address copied to clipboard!</p>
                  )}
                </div>

                <div className="bg-museum-cream rounded-xl p-4">
                  <p className="text-sm text-museum-dark-gray">
                    <strong>Current Balance:</strong>{' '}
                    <span className="font-mono">{formatIcp(icpBalance)}</span>
                  </p>
                </div>

                <ButtonPremium
                  onClick={() => {
                    loadBalances();
                    setShowDepositModal(false);
                  }}
                  variant="gold"
                  size="lg"
                  className="w-full"
                  icon={<RefreshCw className="h-5 w-5" />}
                >
                  Refresh Balance & Close
                </ButtonPremium>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  Trade Successful!
                </h3>
                <p className="text-museum-dark-gray mb-6">
                  Your {tradeDetails.type === 'buy' ? 'purchase' : 'sale'} has been executed
                </p>

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
                  Continue Trading
                </ButtonPremium>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Pool Modal */}
      <AnimatePresence>
        {showCreatePoolModal && pendingRune && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreatePoolModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-museum-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl font-bold text-museum-black">Create Trading Pool</h3>
                <button
                  onClick={() => setShowCreatePoolModal(false)}
                  className="p-2 hover:bg-museum-cream rounded-lg"
                >
                  <X className="h-5 w-5 text-museum-dark-gray" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Rune Info */}
                <div className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                      <span className="text-white font-bold">{pendingRune.symbol.slice(0, 2)}</span>
                    </div>
                    <div>
                      <p className="font-bold text-museum-black">{pendingRune.rune_name}</p>
                      <p className="text-sm text-museum-dark-gray">
                        {pendingRune.symbol} • Supply: {pendingRune.total_supply.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Create a Trading Pool</p>
                      <p className="text-blue-700">
                        This rune doesn&apos;t have a trading pool yet. As the creator, you can enable trading
                        by providing initial liquidity.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Initial ICP */}
                <div>
                  <label className="text-sm font-semibold text-museum-black mb-2 block">
                    Initial ICP Liquidity
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={createPoolIcp}
                      onChange={e => setCreatePoolIcp(e.target.value)}
                      placeholder="1.0"
                      min="0.001"
                      step="0.1"
                      className="w-full px-4 py-3 pr-16 bg-museum-cream rounded-xl border border-museum-light-gray focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-museum-dark-gray font-semibold">
                      ICP
                    </span>
                  </div>
                  <p className="text-xs text-museum-dark-gray mt-1">Minimum: 0.001 ICP</p>
                </div>

                {/* Initial Runes */}
                <div>
                  <label className="text-sm font-semibold text-museum-black mb-2 block">
                    Initial Rune Liquidity
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={createPoolRunes}
                      onChange={e => setCreatePoolRunes(e.target.value)}
                      placeholder="1000000"
                      min="1"
                      className="w-full px-4 py-3 pr-24 bg-museum-cream rounded-xl border border-museum-light-gray focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-museum-dark-gray font-semibold">
                      {pendingRune.symbol}
                    </span>
                  </div>
                </div>

                {/* Price Preview */}
                <div className="bg-museum-cream rounded-xl p-4">
                  <p className="text-sm text-museum-dark-gray mb-1">Starting Price</p>
                  <p className="font-mono font-bold text-museum-black">
                    {(parseFloat(createPoolIcp || '0') / parseInt(createPoolRunes || '1') * 100000000).toFixed(8)} ICP per {pendingRune.symbol}
                  </p>
                  <p className="text-xs text-museum-dark-gray mt-1">
                    Price will adjust automatically based on trading activity
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <ButtonPremium
                  onClick={handleCreatePool}
                  disabled={creatingPool || !createPoolIcp || !createPoolRunes}
                  variant="gold"
                  size="lg"
                  className="w-full"
                  icon={creatingPool ? <Loader className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                >
                  {creatingPool ? 'Creating Pool...' : 'Create Trading Pool'}
                </ButtonPremium>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
