'use client';

/**
 * Premium Explorer Page
 * Advanced Rune explorer with:
 * - Infinite scroll with TanStack Query
 * - Smooth page transitions
 * - Stagger animations for stats
 * - Animated tab switching
 * - Premium components
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { RuneGridSimple, RuneFilters, EtchingCard, type FilterState } from '@/components/runes';
import {
  Coins,
  Users,
  TrendingUp,
  RefreshCw,
  Sparkles,
  Activity,
  Loader2,
  Database,
} from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { useRuneExplorer } from '@/hooks/useRuneExplorer';
import { ActivityFeed } from '@/components/explorer/ActivityFeed';
import { NetworkStats } from '@/components/explorer/NetworkStats';
import { SearchBar } from '@/components/explorer/SearchBar';
import { TrendingRunes } from '@/components/explorer/TrendingRunes';
import type { RegistryEntry, VirtualRuneView, PublicVirtualRuneView } from '@/types/canisters';

export default function ExplorerPagePremium() {
  // Hooks
  const {
    getMyRunes,
    getStats,
    loading: registryLoading,
    error: registryError,
  } = useRegistry();

  const {
    getMyEtchings,
    getMyVirtualRunes,
    getAllVirtualRunes,
    getAllVirtualRunesCount,
    loading: engineLoading,
    error: engineError,
  } = useRuneEngine();

  // State
  const [activeTab, setActiveTab] = useState<'all' | 'virtual-public' | 'mine' | 'virtual' | 'etchings'>('all');
  const [myRunes, setMyRunes] = useState<RegistryEntry[]>([]);
  const [myVirtualRunes, setMyVirtualRunes] = useState<VirtualRuneView[]>([]);
  const [allPublicVirtualRunes, setAllPublicVirtualRunes] = useState<PublicVirtualRuneView[]>([]);
  const [virtualRunesCount, setVirtualRunesCount] = useState<bigint>(0n);
  const [myEtchings, setMyEtchings] = useState<any[]>([]);

  // Stats
  const [stats, setStats] = useState<any>(null);

  // Intersection Observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Unified explorer hook - handles search, filters, and pagination
  const {
    runes: allRunes,
    totalCount: totalRunesCount,
    filters,
    setFilters,
    clearSearch,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    isLoading: infiniteLoading,
    isError: infiniteError,
    error: infiniteErrorMsg,
    refetch: refetchRunes,
  } = useRuneExplorer({
    pageSize: 24,
    enabled: true,
  });

  // All runes are already filtered by the hook
  const filteredRunes = allRunes;

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isFetchingNextPage, fetchNextPage]);

  // Load user's Runes
  const loadMyRunes = useCallback(async () => {
    try {
      const runes = await getMyRunes();
      setMyRunes(runes);
    } catch (err) {
      console.error('Failed to load my Runes:', err);
    }
  }, [getMyRunes]);

  // Load user's virtual runes
  const loadMyVirtualRunes = useCallback(async () => {
    try {
      const virtualRunes = await getMyVirtualRunes();
      setMyVirtualRunes(virtualRunes);
    } catch (err) {
      console.error('Failed to load my virtual runes:', err);
    }
  }, [getMyVirtualRunes]);

  // Load ALL public virtual runes (visible to everyone)
  const loadAllPublicVirtualRunes = useCallback(async () => {
    try {
      const [runes, count] = await Promise.all([
        getAllVirtualRunes(0n, 100n),
        getAllVirtualRunesCount(),
      ]);
      setAllPublicVirtualRunes(runes);
      setVirtualRunesCount(count);
    } catch (err) {
      console.error('Failed to load public virtual runes:', err);
    }
  }, [getAllVirtualRunes, getAllVirtualRunesCount]);

  // Load user's etchings
  const loadMyEtchings = useCallback(async () => {
    try {
      const etchings = await getMyEtchings();
      setMyEtchings(etchings);
    } catch (err) {
      console.error('Failed to load my etchings:', err);
    }
  }, [getMyEtchings]);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const registryStats = await getStats();
      setStats(registryStats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [getStats]);

  // Load data on mount
  useEffect(() => {
    loadMyRunes();
    loadMyVirtualRunes();
    loadAllPublicVirtualRunes();
    loadMyEtchings();
    loadStats();

    // Refresh user data every 30 seconds
    const interval = setInterval(() => {
      loadMyRunes();
      loadMyVirtualRunes();
      loadAllPublicVirtualRunes();
      loadMyEtchings();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadMyRunes, loadMyVirtualRunes, loadAllPublicVirtualRunes, loadMyEtchings, loadStats]);

  const handleRefresh = () => {
    refetchRunes();
    loadMyRunes();
    loadMyVirtualRunes();
    loadAllPublicVirtualRunes();
    loadMyEtchings();
    loadStats();
  };

  const loading = registryLoading || engineLoading || infiniteLoading;
  const error = registryError || engineError || (infiniteError ? infiniteErrorMsg?.message : null);

  // Stats data - Use exact numbers, no rounding
  const statsData = [
    {
      icon: Coins,
      label: 'Bitcoin Runes',
      value: totalRunesCount.toString(),
      color: 'text-gold-600',
      bgColor: 'bg-gold-50',
    },
    {
      icon: Database,
      label: 'Virtual Runes',
      value: virtualRunesCount.toString(),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Users,
      label: 'My Runes',
      value: myRunes.length.toString(),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: TrendingUp,
      label: 'Total',
      value: (Number(totalRunesCount) + Number(virtualRunesCount)).toString(),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-museum-black mb-3">
              Runes Explorer
            </h1>
            <p className="text-museum-dark-gray text-lg">
              Explore all Bitcoin Runes indexed from the network
            </p>
          </div>
          <div className="lg:w-96">
            <SearchBar
              placeholder="Search by name, symbol, or ID..."
              localRunes={allRunes}
              onSelect={(rune) => {
                // When user selects from dropdown, set it as filter
                setFilters({ search: rune.metadata.name });
              }}
              showResults={true}
            />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statsData.map((stat) => (
          <div
            key={stat.label}
            className="border-2 border-museum-light-gray rounded-xl p-4 sm:p-6 bg-museum-white hover:shadow-xl hover:border-gold-300 hover:-translate-y-1 transition-all cursor-default min-w-0"
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className={`p-2 sm:p-3 ${stat.bgColor} rounded-lg shadow-sm flex-shrink-0`}>
                <stat.icon className={`h-4 w-4 sm:h-6 sm:w-6 ${stat.color}`} />
              </div>
              <span className="text-xs sm:text-sm font-semibold text-museum-black uppercase tracking-wide truncate">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-bold font-mono tabular-nums text-museum-black tracking-tight truncate">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Trending Runes */}
      <div>
        <TrendingRunes sortBy="recent" />
      </div>

      {/* Tabs */}
      <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-3">
          {[
            { id: 'all', icon: Coins, label: 'Bitcoin Runes', count: allRunes.length },
            { id: 'virtual-public', icon: Database, label: 'Virtual Runes', count: allPublicVirtualRunes.length },
            { id: 'mine', icon: Users, label: 'My Runes', count: myRunes.length },
            { id: 'virtual', icon: Sparkles, label: 'My Virtual', count: myVirtualRunes.length },
            { id: 'etchings', icon: Activity, label: 'Etchings', count: myEtchings.length },
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
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Content with AnimatePresence */}
      {/* Tab Content */}
      <div>
        {/* All Runes Tab */}
        {activeTab === 'all' && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Left Sidebar - Filters */}
            <div className="xl:col-span-1 space-y-6">
              <RuneFilters
                filters={filters}
                onFilterChange={setFilters}
                totalCount={totalRunesCount}
                filteredCount={filteredRunes.length}
                loading={loading}
              />

              {/* Network Stats - Hidden on mobile */}
              <div className="hidden xl:block">
                <NetworkStats compact />
              </div>
            </div>

            {/* Main Content - Runes Grid */}
            <div className="xl:col-span-2 space-y-6">
              <RuneGridSimple
                runes={filteredRunes}
                loading={loading && allRunes.length === 0}
                emptyMessage="No Runes found"
                emptyDescription="Try adjusting your filters or create your first Rune"
              />

              {/* Load More Section */}
              {allRunes.length > 0 && (
                <div className="flex flex-col items-center gap-4 py-8">
                  {/* Progress indicator - exact numbers */}
                  <p className="text-sm text-museum-dark-gray">
                    Showing <span className="font-mono tabular-nums font-semibold">{filteredRunes.length}</span> of <span className="font-mono tabular-nums font-semibold">{totalRunesCount}</span> runes
                  </p>

                  {/* Intersection Observer Target */}
                  <div ref={loadMoreRef} className="h-10 w-full" />

                  {/* Loading indicator */}
                  {isFetchingNextPage && (
                    <div className="flex items-center gap-2 text-museum-dark-gray">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Loading more runes...</span>
                    </div>
                  )}

                  {/* Load More Button (fallback) */}
                  {hasMore && !isFetchingNextPage && (
                    <ButtonPremium
                      onClick={() => fetchNextPage()}
                      variant="secondary"
                      size="md"
                    >
                      Load More Runes
                    </ButtonPremium>
                  )}

                  {/* End of list indicator */}
                  {!hasMore && allRunes.length > 0 && (
                    <p className="text-sm text-museum-dark-gray">
                      You&apos;ve reached the end
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right Sidebar - Activity Feed */}
            <div className="xl:col-span-1">
              <div className="sticky top-8 space-y-6">
                <ActivityFeed limit={8} />

                {/* Network Stats - Visible on mobile/tablet */}
                <div className="xl:hidden">
                  <NetworkStats />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Public Virtual Runes Tab */}
        {activeTab === 'virtual-public' && (
          <div>
            {allPublicVirtualRunes.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center shadow-sm">
                <div className="bg-purple-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Database className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">
                  No Virtual Runes Yet
                </h3>
                <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                  Be the first to create a Virtual Rune! They&apos;re free to create and can be traded instantly.
                </p>
                <Link href="/create">
                  <ButtonPremium
                    size="lg"
                    variant="gold"
                    icon={<Sparkles className="h-5 w-5" />}
                  >
                    Create First Virtual Rune
                  </ButtonPremium>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Info Banner */}
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Database className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-purple-800">
                        <strong>Virtual Runes</strong> are created on ICP (Internet Computer) and can be traded instantly with zero gas fees.
                        When ready, creators can settle them to Bitcoin to become real Bitcoin Runes.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Grid of Virtual Runes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allPublicVirtualRunes.map((rune) => (
                    <div
                      key={rune.id}
                      className="bg-museum-white border-2 border-purple-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-400 transition-all"
                    >
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                          <span className="text-2xl font-bold text-white">
                            {rune.symbol || rune.rune_name.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-museum-black truncate">{rune.rune_name}</p>
                          <p className="text-xs text-museum-dark-gray truncate">
                            by {rune.creator.slice(0, 8)}...{rune.creator.slice(-4)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          rune.status === 'Virtual'
                            ? 'bg-purple-100 text-purple-700'
                            : rune.status.includes('Etching')
                            ? 'bg-yellow-100 text-yellow-700'
                            : rune.status.includes('Etched')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {rune.status}
                        </span>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-museum-dark-gray">Symbol</span>
                          <span className="font-mono text-museum-black">{rune.symbol || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-museum-dark-gray">Premine</span>
                          <span className="font-mono text-museum-black">
                            {Number(rune.premine).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-museum-dark-gray">Divisibility</span>
                          <span className="font-mono text-museum-black">{rune.divisibility}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-museum-dark-gray">Created</span>
                          <span className="text-museum-black">
                            {new Date(Number(rune.created_at) / 1_000_000).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-museum-light-gray">
                        <Link href={`/swap?rune=${rune.id}`}>
                          <ButtonPremium
                            variant="gold"
                            size="sm"
                            className="w-full"
                          >
                            Trade
                          </ButtonPremium>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* My Runes Tab */}
        {activeTab === 'mine' && (
          <div>
            {myRunes.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center shadow-sm">
                <div className="bg-amber-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Sparkles className="h-12 w-12 text-amber-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">
                  No Runes Created Yet
                </h3>
                <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
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
              <RuneGridSimple
                runes={myRunes}
                loading={loading}
                variant="detailed"
                emptyMessage="No Runes found"
              />
            )}
          </div>
        )}

        {/* Virtual Runes Tab */}
        {activeTab === 'virtual' && (
          <div>
            {myVirtualRunes.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center shadow-sm">
                <div className="bg-purple-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Database className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">
                  No Virtual Runes Yet
                </h3>
                <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                  Create Virtual Runes on ICP and settle them to Bitcoin when ready
                </p>
                <Link href="/create">
                  <ButtonPremium
                    size="lg"
                    variant="gold"
                    icon={<Sparkles className="h-5 w-5" />}
                  >
                    Create Virtual Rune
                  </ButtonPremium>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myVirtualRunes.map((rune) => (
                  <div
                    key={rune.id}
                    className="bg-museum-white border-2 border-purple-200 rounded-2xl p-6 hover:shadow-lg hover:border-purple-400 transition-all"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-600">
                          {rune.symbol || rune.rune_name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-museum-black truncate">{rune.rune_name}</p>
                        <p className="text-xs text-museum-dark-gray">Virtual Rune</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        rune.status === 'active' || rune.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : rune.status === 'settling' || rune.status === 'Settling'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {rune.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-museum-dark-gray">Premine</span>
                        <span className="font-mono text-museum-black">
                          {rune.premine.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-museum-dark-gray">Divisibility</span>
                        <span className="font-mono text-museum-black">{rune.divisibility}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-museum-dark-gray">Created</span>
                        <span className="text-museum-black">
                          {new Date(Number(rune.created_at) / 1_000_000).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-museum-light-gray">
                      <Link href="/settlement">
                        <ButtonPremium
                          variant="secondary"
                          size="sm"
                          className="w-full"
                        >
                          Settle to Bitcoin
                        </ButtonPremium>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Etchings Tab */}
        {activeTab === 'etchings' && (
          <div>
            {myEtchings.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center shadow-sm">
                <div className="bg-purple-50 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <Activity className="h-12 w-12 text-purple-600" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-gray-900 mb-3">
                  No Etchings Yet
                </h3>
                <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myEtchings.map((etching) => (
                  <div key={etching.id}>
                    <EtchingCard etching={etching} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6 hover:scale-[1.01] transition-transform">
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
            <div className="bg-white rounded-lg p-3 hover:scale-[1.02] transition-transform">
              <p className="text-xs text-blue-700 mb-1">Network</p>
              <p className="font-semibold text-blue-900">Bitcoin Testnet</p>
            </div>
            <div className="bg-white rounded-lg p-3 hover:scale-[1.02] transition-transform">
              <p className="text-xs text-blue-700 mb-1">Infrastructure</p>
              <p className="font-semibold text-blue-900">Internet Computer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
