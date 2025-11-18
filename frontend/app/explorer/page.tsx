'use client';

/**
 * Premium Explorer Page
 * Advanced Rune explorer with:
 * - Smooth page transitions
 * - Stagger animations for stats
 * - Animated tab switching
 * - Premium components
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { RuneGrid, RuneFilters, EtchingCard, type FilterState } from '@/components/runes';
import { Breadcrumb, BreadcrumbPresets } from '@/components/Breadcrumb';
import {
  Home,
  Coins,
  Users,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Activity,
} from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import type { RegistryEntry, Page } from '@/types/canisters';
import {
  pageTransition,
  fadeInUp,
  staggerContainer,
  staggerItem,
  prefersReducedMotion,
  durations,
} from '@/design-system/motion/presets';

export default function ExplorerPagePremium() {
  // Hooks
  const {
    listRunes,
    getTotalRunes,
    getMyRunes,
    getStats,
    loading: registryLoading,
    error: registryError,
  } = useRegistry();

  const {
    getMyEtchings,
    loading: engineLoading,
    error: engineError,
  } = useRuneEngine();

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'etchings'>('all');
  const [allRunes, setAllRunes] = useState<RegistryEntry[]>([]);
  const [myRunes, setMyRunes] = useState<RegistryEntry[]>([]);
  const [myEtchings, setMyEtchings] = useState<any[]>([]);
  const [filteredRunes, setFilteredRunes] = useState<RegistryEntry[]>([]);
  const [totalRunesCount, setTotalRunesCount] = useState(0n);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sortBy: { Block: null },
    sortOrder: { Desc: null },
    showVerifiedOnly: false,
  });

  // Stats
  const [stats, setStats] = useState<any>(null);
  const reducedMotion = prefersReducedMotion();

  // Load all Runes
  const loadAllRunes = async () => {
    try {
      const page: Page = {
        offset: 0n,
        limit: 100n,
        sort_by: [filters.sortBy],
        sort_order: [filters.sortOrder],
      };

      const [response, total, registryStats] = await Promise.all([
        listRunes(page),
        getTotalRunes(),
        getStats(),
      ]);

      setAllRunes(response.items);
      setTotalRunesCount(total);
      setStats(registryStats);
    } catch (err) {
      console.error('Failed to load all Runes:', err);
    }
  };

  // Load user's Runes
  const loadMyRunes = async () => {
    try {
      const runes = await getMyRunes();
      setMyRunes(runes);
    } catch (err) {
      console.error('Failed to load my Runes:', err);
    }
  };

  // Load user's etchings
  const loadMyEtchings = async () => {
    try {
      const etchings = await getMyEtchings();
      setMyEtchings(etchings);
    } catch (err) {
      console.error('Failed to load my etchings:', err);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allRunes];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (rune) =>
          rune.metadata.name.toLowerCase().includes(searchLower) ||
          rune.metadata.symbol.toLowerCase().includes(searchLower) ||
          `${rune.metadata.key.block}:${rune.metadata.key.tx}`.toLowerCase().includes(searchLower)
      );
    }

    setFilteredRunes(filtered);
  }, [allRunes, filters.search, filters.showVerifiedOnly]);

  // Reload when sort changes
  useEffect(() => {
    if (activeTab === 'all') {
      loadAllRunes();
    }
  }, [filters.sortBy, filters.sortOrder, activeTab]);

  // Load data on mount
  useEffect(() => {
    loadAllRunes();
    loadMyRunes();
    loadMyEtchings();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadAllRunes();
      loadMyRunes();
      loadMyEtchings();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    loadAllRunes();
    loadMyRunes();
    loadMyEtchings();
  };

  const loading = registryLoading || engineLoading;
  const error = registryError || engineError;

  // Stats data
  const statsData = [
    {
      icon: Coins,
      label: 'Total Runes',
      value: totalRunesCount.toString(),
      color: 'text-gold-600',
      bgColor: 'bg-gold-50',
    },
    {
      icon: Users,
      label: 'My Runes',
      value: myRunes.length.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Activity,
      label: 'My Etchings',
      value: myEtchings.length.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: TrendingUp,
      label: '24h Volume',
      value: stats?.total_volume_24h
        ? Number(stats.total_volume_24h).toLocaleString()
        : '0',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-museum-white via-museum-cream to-premium-exhibition-gray"
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={reducedMotion ? undefined : pageTransition}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <motion.div variants={reducedMotion ? undefined : fadeInUp}>
        <Breadcrumb items={BreadcrumbPresets.explorer} showDashboardHome={true} />
      </motion.div>

      {/* Header */}
      <motion.div
        variants={reducedMotion ? undefined : fadeInUp}
        className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 shadow-sm"
      >
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-museum-black mb-3">
          Runes Explorer
        </h1>
        <p className="text-museum-dark-gray text-lg">
          Explore Bitcoin Runes created on QURI Protocol
        </p>
      </motion.div>

      {/* Stats Bar with Stagger Animation */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={reducedMotion ? undefined : staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {statsData.map((stat, index) => (
          <motion.div
            key={stat.label}
            className="border-2 border-museum-light-gray rounded-xl p-6 bg-museum-white hover:shadow-xl hover:border-gold-300 transition-all cursor-default"
            variants={reducedMotion ? undefined : staggerItem}
            whileHover={reducedMotion ? undefined : { y: -4, scale: 1.02 }}
            transition={{ duration: durations.fast }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 ${stat.bgColor} rounded-lg shadow-sm`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <span className="text-sm font-semibold text-museum-black uppercase tracking-wide">
                {stat.label}
              </span>
            </div>
            <p className="text-4xl font-bold text-museum-black tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Tabs with Animation */}
      <motion.div
        className="bg-museum-white border border-museum-light-gray rounded-2xl p-6 shadow-sm"
        variants={reducedMotion ? undefined : fadeInUp}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'all', icon: Coins, label: 'All Runes', count: allRunes.length },
            { id: 'mine', icon: Users, label: 'My Runes', count: myRunes.length },
            { id: 'etchings', icon: Activity, label: 'My Etchings', count: myEtchings.length },
          ].map((tab) => (
            <ButtonPremium
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              variant={activeTab === tab.id ? 'gold' : 'secondary'}
              size="md"
              icon={<tab.icon className="h-5 w-5" />}
              enableMagnetic={false}
            >
              {tab.label} ({tab.count})
            </ButtonPremium>
          ))}
        </div>

        <ButtonPremium
          onClick={handleRefresh}
          variant="secondary"
          disabled={loading}
          icon={<RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </ButtonPremium>
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-50 border border-red-200 rounded-xl p-4"
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
          >
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        {/* All Runes Tab */}
        {activeTab === 'all' && (
          <motion.div
            key="all-tab"
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: durations.normal }}
          >
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <RuneFilters
                onFilterChange={setFilters}
                totalCount={allRunes.length}
                filteredCount={filteredRunes.length}
                loading={loading}
              />
            </div>

            {/* Runes Grid */}
            <div className="lg:col-span-3">
              <RuneGrid
                runes={filteredRunes}
                loading={loading}
                usePremiumCards={true}
                staggerSpeed="normal"
                enableMagneticEffect={true}
                enable3DTilt={true}
                emptyMessage="No Runes found"
                emptyDescription="Try adjusting your filters or create your first Rune"
              />
            </div>
          </motion.div>
        )}

        {/* My Runes Tab */}
        {activeTab === 'mine' && (
          <motion.div
            key="mine-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: durations.normal }}
          >
            {myRunes.length === 0 ? (
              <div className="bg-museum-white border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center shadow-sm">
                <div className="bg-gold-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-gold-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-museum-black mb-3">
                  No Runes Created Yet
                </h3>
                <p className="text-museum-dark-gray text-lg mb-8 max-w-md mx-auto">
                  Create your first Bitcoin Rune now and start building on QURI Protocol
                </p>
                <Link href="/create">
                  <ButtonPremium
                    size="lg"
                    variant="gold"
                    icon={<Sparkles className="h-5 w-5" />}
                  >
                    Create Your First Rune
                  </ButtonPremium>
                </Link>
              </div>
            ) : (
              <RuneGrid
                runes={myRunes}
                loading={loading}
                variant="detailed"
                usePremiumCards={true}
                staggerSpeed="normal"
                enableMagneticEffect={true}
                enable3DTilt={true}
                emptyMessage="No Runes found"
              />
            )}
          </motion.div>
        )}

        {/* My Etchings Tab */}
        {activeTab === 'etchings' && (
          <motion.div
            key="etchings-tab"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: durations.normal }}
          >
            {myEtchings.length === 0 ? (
              <div className="bg-museum-white border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center shadow-sm">
                <div className="bg-purple-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Activity className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-museum-black mb-3">
                  No Etchings Yet
                </h3>
                <p className="text-museum-dark-gray text-lg mb-8 max-w-md mx-auto">
                  Start creating Bitcoin Runes to see etching processes here
                </p>
                <Link href="/create">
                  <ButtonPremium
                    size="lg"
                    variant="gold"
                    icon={<Sparkles className="h-5 w-5" />}
                  >
                    Create a Rune
                  </ButtonPremium>
                </Link>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={reducedMotion ? undefined : staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {myEtchings.map((etching, index) => (
                  <motion.div
                    key={etching.id}
                    variants={reducedMotion ? undefined : staggerItem}
                  >
                    <EtchingCard etching={etching} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Card */}
      <motion.div
        className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6"
        variants={reducedMotion ? undefined : fadeInUp}
        whileHover={reducedMotion ? undefined : { scale: 1.01 }}
      >
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          About QURI Protocol
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>
            <strong>QURI Protocol</strong> creates native Bitcoin Runes on the Bitcoin blockchain
            via signed transactions.
          </p>
          <p>
            All Runes shown here are real Bitcoin assets, not synthetic tokens. They exist on
            Bitcoin and can be traded on any Bitcoin Runes marketplace.
          </p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <motion.div
              className="bg-white rounded-lg p-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: durations.fast }}
            >
              <p className="text-xs text-blue-700 mb-1">Network</p>
              <p className="font-semibold text-blue-900">Bitcoin Testnet</p>
            </motion.div>
            <motion.div
              className="bg-white rounded-lg p-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: durations.fast }}
            >
              <p className="text-xs text-blue-700 mb-1">Infrastructure</p>
              <p className="font-semibold text-blue-900">Internet Computer</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
      </div>
    </motion.div>
  );
}
