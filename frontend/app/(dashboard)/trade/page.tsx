/**
 * Virtual Runes Trading Page
 * Trade Virtual Runes using ICP with bonding curve AMM
 *
 * UX Flow:
 * 1. Search for a rune or select from existing pools
 * 2. If no pool exists, creator can create one
 * 3. Trade with bonding curve pricing
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
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
  AlertCircle,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { useDualAuth } from '@/lib/auth';
import { WalletButton } from '@/components/wallet';
import useTrading from '@/hooks/useTrading';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import type {
  TradingPoolV2View,
  TradeQuoteV2View,
  VirtualRuneView,
  PublicVirtualRuneView,
} from '@/types/canisters';

// Use V2 types for the trading page
type TradingPoolView = TradingPoolV2View;
type TradeQuoteView = TradeQuoteV2View;

export default function TradePage() {
  const router = useRouter();
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

  const { getVirtualRune, getAllVirtualRunes } = useRuneEngine();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PublicVirtualRuneView[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // All virtual runes for search
  const [allRunes, setAllRunes] = useState<PublicVirtualRuneView[]>([]);
  const [loadingRunes, setLoadingRunes] = useState(true);

  // Available pools
  const [pools, setPools] = useState<TradingPoolView[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);

  // Selected rune/pool state
  const [selectedRune, setSelectedRune] = useState<PublicVirtualRuneView | null>(null);
  const [selectedPool, setSelectedPool] = useState<TradingPoolView | null>(null);
  const [checkingPool, setCheckingPool] = useState(false);

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

  // Create pool modal
  const [showCreatePoolModal, setShowCreatePoolModal] = useState(false);
  const [createPoolIcp, setCreatePoolIcp] = useState('1');
  const [createPoolRunes, setCreatePoolRunes] = useState('1000000');
  const [creatingPool, setCreatingPool] = useState(false);

  // Load all runes for search
  const loadAllRunes = useCallback(async () => {
    setLoadingRunes(true);
    try {
      const runes = await getAllVirtualRunes(0n, 100n);
      setAllRunes(runes);
    } catch (err) {
      console.error('Failed to load runes:', err);
    } finally {
      setLoadingRunes(false);
    }
  }, [getAllVirtualRunes]);

  // Load pools
  const loadPools = useCallback(async () => {
    setLoadingPools(true);
    try {
      const fetchedPools = await listPools(0n, 50n);
      setPools(fetchedPools);
      return fetchedPools;
    } catch (err) {
      console.error('Failed to load pools:', err);
      return [];
    } finally {
      setLoadingPools(false);
    }
  }, [listPools]);

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
    loadAllRunes();
    loadPools();
  }, [loadAllRunes, loadPools]);

  // Load balances when connected or pool changes
  useEffect(() => {
    loadBalances();
    loadDepositAddress();
  }, [loadBalances, loadDepositAddress]);

  // Handle URL rune parameter
  useEffect(() => {
    if (runeIdFromUrl && allRunes.length > 0) {
      const rune = allRunes.find(r => r.id === runeIdFromUrl);
      if (rune) {
        handleSelectRune(rune);
      }
    }
  }, [runeIdFromUrl, allRunes]);

  // Filter search results
  const filteredRunes = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allRunes.filter(
      rune =>
        rune.rune_name.toLowerCase().includes(query) ||
        rune.symbol.toLowerCase().includes(query) ||
        rune.id.toLowerCase().includes(query)
    ).slice(0, 10);
  }, [searchQuery, allRunes]);

  // Handle selecting a rune (check if pool exists)
  const handleSelectRune = async (rune: PublicVirtualRuneView) => {
    setSelectedRune(rune);
    setShowSearchResults(false);
    setSearchQuery(rune.rune_name);
    setCheckingPool(true);

    try {
      // Check if pool exists
      const pool = await getPool(rune.id);
      if (pool) {
        setSelectedPool(pool);
      } else {
        setSelectedPool(null);
      }
    } catch (err) {
      console.error('Failed to check pool:', err);
      setSelectedPool(null);
    } finally {
      setCheckingPool(false);
    }
  };

  // Handle selecting a pool directly
  const handleSelectPool = (pool: TradingPoolView) => {
    setSelectedPool(pool);
    setSearchQuery(pool.rune_name);
    // Find the corresponding rune
    const rune = allRunes.find(r => r.id === pool.rune_id);
    if (rune) {
      setSelectedRune(rune);
    }
    setShowSearchResults(false);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedRune(null);
    setSelectedPool(null);
    setSearchQuery('');
    setInputAmount('');
    setQuote(null);
    router.push('/trade');
  };

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
    if (!selectedRune) return;

    setCreatingPool(true);
    clearError();
    try {
      const icpAmount = parseFloat(createPoolIcp);
      const runeAmount = parseInt(createPoolRunes);

      if (icpAmount < 0.001) {
        alert('Minimum ICP is 0.001');
        setCreatingPool(false);
        return;
      }

      if (runeAmount < 1) {
        alert('Minimum runes is 1');
        setCreatingPool(false);
        return;
      }

      console.log('Creating pool for:', selectedRune.id, 'ICP:', icpAmount, 'Runes:', runeAmount);
      const pool = await createPool(selectedRune.id, icpAmount, runeAmount);

      if (pool) {
        setShowCreatePoolModal(false);
        setSelectedPool(pool);
        // Reload pools
        await loadPools();
      }
    } catch (err) {
      console.error('Failed to create pool:', err);
    } finally {
      setCreatingPool(false);
    }
  };

  // Anyone can create a pool if they have the runes (decentralized)
  const canCreatePool = selectedRune && isConnected;

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
                Search and choose from available Virtual Runes
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <div className="w-10 h-10 rounded-full bg-gold-100 flex items-center justify-center mb-3">
                <span className="text-gold-600 font-bold">3</span>
              </div>
              <h4 className="font-semibold text-museum-black mb-1">Buy or Sell</h4>
              <p className="text-sm text-museum-dark-gray">
                Trade instantly with bonding curve pricing
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
  // RENDER: Main Trading Interface
  // ============================================================================
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-3xl font-bold text-museum-black mb-2">
          Trade Virtual Runes
        </h1>
        <p className="text-museum-dark-gray text-sm">
          Search for a rune to trade or create a new trading pool
        </p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-museum-dark-gray" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
              if (!e.target.value) {
                setSelectedRune(null);
                setSelectedPool(null);
              }
            }}
            onFocus={() => setShowSearchResults(true)}
            placeholder="Search runes by name, symbol, or ID..."
            className="w-full pl-12 pr-12 py-4 bg-museum-white border-2 border-museum-light-gray rounded-2xl focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all text-lg text-museum-black placeholder:text-museum-dark-gray"
          />
          {searchQuery && (
            <button
              onClick={handleClearSelection}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-museum-cream rounded-full"
            >
              <X className="h-5 w-5 text-museum-dark-gray" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showSearchResults && searchQuery && filteredRunes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-2 bg-museum-white border-2 border-museum-light-gray rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="max-h-80 overflow-y-auto">
                {filteredRunes.map((rune) => {
                  const hasPool = pools.some(p => p.rune_id === rune.id);
                  return (
                    <button
                      key={rune.id}
                      onClick={() => handleSelectRune(rune)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gold-50 transition-colors border-b border-museum-light-gray last:border-b-0"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm">
                          {rune.symbol || rune.rune_name.slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-semibold text-museum-black">{rune.rune_name}</p>
                        <p className="text-sm text-museum-dark-gray">{rune.symbol}</p>
                      </div>
                      {hasPool ? (
                        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          Pool Active
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full">
                          No Pool
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No results */}
        {showSearchResults && searchQuery && filteredRunes.length === 0 && !loadingRunes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute z-50 w-full mt-2 bg-museum-white border-2 border-museum-light-gray rounded-2xl p-6 text-center"
          >
            <p className="text-museum-dark-gray">No runes found for "{searchQuery}"</p>
            <Link href="/create" className="text-gold-600 hover:text-gold-700 text-sm font-medium mt-2 inline-block">
              Create a new rune →
            </Link>
          </motion.div>
        )}
      </motion.div>

      {/* Click outside to close search results */}
      {showSearchResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSearchResults(false)}
        />
      )}

      {/* Selected Rune Status */}
      {selectedRune && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Rune Info Card */}
          <div className="bg-gradient-to-br from-gold-50 to-amber-50 border border-gold-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedRune.symbol || selectedRune.rune_name.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-museum-black">
                    {selectedRune.rune_name}
                  </h3>
                  <p className="text-sm text-museum-dark-gray">
                    {selectedRune.symbol} &bull; Supply: {Number(selectedRune.premine).toLocaleString()}
                  </p>
                </div>
              </div>
              {checkingPool ? (
                <Loader className="h-6 w-6 animate-spin text-gold-500" />
              ) : selectedPool ? (
                <span className="text-sm font-medium text-green-600 bg-green-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Pool Active
                </span>
              ) : (
                <span className="text-sm font-medium text-yellow-600 bg-yellow-100 px-3 py-1.5 rounded-full flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  No Pool
                </span>
              )}
            </div>
          </div>

          {/* No Pool - Create Pool Option (Decentralized - Anyone can create) */}
          {!checkingPool && !selectedPool && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <Coins className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
                  No Trading Pool Yet
                </h3>
                <p className="text-museum-dark-gray mb-6 max-w-md mx-auto">
                  This rune doesn't have a trading pool yet.
                  Anyone with runes can create a pool to enable trading.
                </p>

                {canCreatePool ? (
                  <ButtonPremium
                    onClick={() => setShowCreatePoolModal(true)}
                    variant="gold"
                    size="lg"
                    icon={<Plus className="h-5 w-5" />}
                  >
                    Create Trading Pool
                  </ButtonPremium>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <p className="font-semibold mb-1">Connect Wallet</p>
                        <p className="text-blue-700">
                          Connect your wallet to create a trading pool for this rune.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Pool exists - Trading Interface */}
          {selectedPool && (
            <>
              {/* Balances & Deposit Card */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-purple-900">Your Trading Balance</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDepositModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Deposit ICP
                    </button>
                    <button
                      onClick={loadBalances}
                      disabled={loadingBalances}
                      className="p-2 hover:bg-purple-200/50 rounded-lg transition-colors"
                    >
                      <RefreshCw
                        className={`h-4 w-4 text-purple-700 ${loadingBalances ? 'animate-spin' : ''}`}
                      />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/60 rounded-xl p-4">
                    <p className="text-sm text-purple-700 mb-1">ICP Balance</p>
                    <p className="text-2xl font-bold font-mono text-purple-900">
                      {loadingBalances ? '...' : formatIcp(icpBalance)}
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-xl p-4">
                    <p className="text-sm text-purple-700 mb-1">{selectedPool.symbol} Balance</p>
                    <p className="text-2xl font-bold font-mono text-purple-900">
                      {loadingBalances ? '...' : runeBalance.toString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trading Card */}
              <div className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-5 shadow-lg">
                {/* Buy/Sell Toggle & Settings */}
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
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input Section */}
                <div className="bg-museum-cream rounded-xl p-4 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-museum-dark-gray">
                      {tradeMode === 'buy' ? 'You pay (ICP)' : `You sell (${selectedPool.symbol})`}
                    </span>
                    <span className="text-sm text-museum-dark-gray">
                      Balance:{' '}
                      <span className="font-mono">
                        {tradeMode === 'buy'
                          ? formatIcp(icpBalance)
                          : `${runeBalance} ${selectedPool.symbol}`}
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
                              {selectedPool.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-bold text-museum-black">{selectedPool.symbol}</span>
                        </>
                      )}
                    </div>
                    <input
                      type="number"
                      value={inputAmount}
                      onChange={e => setInputAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 text-right text-2xl font-mono font-bold bg-transparent outline-none text-museum-black placeholder:text-museum-dark-gray [color-scheme:light]"
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
                      {tradeMode === 'buy' ? `You receive (${selectedPool.symbol})` : 'You receive (ICP)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-3 bg-museum-white rounded-xl">
                      {tradeMode === 'buy' ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                            <span className="text-white font-bold text-xs">
                              {selectedPool.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <span className="font-bold text-museum-black">{selectedPool.symbol}</span>
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
                        1 {selectedPool.symbol} = {formatIcp(quote.price_per_rune)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-museum-dark-gray">Price Impact</span>
                      <span
                        className={`font-mono ${
                          quote.price_impact_bps > 500
                            ? 'text-red-600'
                            : quote.price_impact_bps > 200
                            ? 'text-yellow-600'
                            : 'text-green-600'
                        }`}
                      >
                        {(quote.price_impact_bps / 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-museum-dark-gray">Fee (0.3%)</span>
                      <span className="font-mono text-museum-black">{formatIcp(quote.fee)}</span>
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
                      disabled={!canTrade() || loading}
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
              </div>

              {/* Pool Info */}
              <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-5">
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
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Quick Access: Existing Pools */}
      {!selectedRune && pools.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-lg font-bold text-museum-black">
              Active Trading Pools
            </h3>
            <button
              onClick={loadPools}
              disabled={loadingPools}
              className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loadingPools ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-2">
            {pools.slice(0, 5).map((pool) => (
              <button
                key={pool.rune_id}
                onClick={() => handleSelectPool(pool)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border border-museum-light-gray hover:border-gold-300 hover:bg-gold-50 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{pool.symbol.slice(0, 2)}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-museum-black">{pool.rune_name}</p>
                  <p className="text-sm text-museum-dark-gray">{pool.symbol}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-museum-black">{formatIcp(pool.price_per_rune)}</p>
                  <p className="text-xs text-museum-dark-gray">per rune</p>
                </div>
              </button>
            ))}
          </div>
          {pools.length > 5 && (
            <p className="text-center text-sm text-museum-dark-gray mt-4">
              Showing {Math.min(5, pools.length)} of {pools.length} pools. Use search to find more.
            </p>
          )}
        </motion.div>
      )}

      {/* No Selection - Show Instructions */}
      {!selectedRune && pools.length === 0 && !loadingPools && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            Search for a Rune to Trade
          </h3>
          <p className="text-museum-dark-gray mb-4 max-w-md mx-auto">
            Use the search bar above to find Virtual Runes. If a rune doesn't have a trading pool yet,
            the creator can create one to enable trading.
          </p>
          <Link href="/create">
            <ButtonPremium variant="gold" size="sm" icon={<Plus className="h-4 w-4" />}>
              Create New Virtual Rune
            </ButtonPremium>
          </Link>
        </motion.div>
      )}

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
        {showCreatePoolModal && selectedRune && (
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
                      <span className="text-white font-bold">
                        {selectedRune.symbol || selectedRune.rune_name.slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-museum-black">{selectedRune.rune_name}</p>
                      <p className="text-sm text-museum-dark-gray">
                        {selectedRune.symbol} &bull; Supply: {Number(selectedRune.premine).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Decentralized Pool Creation</p>
                      <p className="text-blue-700">
                        Anyone can create a trading pool by providing ICP and runes.
                        You must own the runes you want to add as liquidity.
                        The initial price is determined by the ratio of ICP to runes.
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
                      className="w-full px-4 py-3 pr-16 bg-museum-cream rounded-xl border border-museum-light-gray focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all font-mono text-museum-black placeholder:text-museum-dark-gray [color-scheme:light]"
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
                      className="w-full px-4 py-3 pr-24 bg-museum-cream rounded-xl border border-museum-light-gray focus:border-gold-400 focus:ring-2 focus:ring-gold-100 outline-none transition-all font-mono text-museum-black placeholder:text-museum-dark-gray [color-scheme:light]"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-museum-dark-gray font-semibold">
                      {selectedRune.symbol || 'RUNES'}
                    </span>
                  </div>
                </div>

                {/* Price Preview */}
                <div className="bg-museum-cream rounded-xl p-4">
                  <p className="text-sm text-museum-dark-gray mb-1">Starting Price</p>
                  <p className="font-mono font-bold text-museum-black">
                    {(parseFloat(createPoolIcp || '0') / parseInt(createPoolRunes || '1')).toFixed(8)} ICP per {selectedRune.symbol || 'rune'}
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
