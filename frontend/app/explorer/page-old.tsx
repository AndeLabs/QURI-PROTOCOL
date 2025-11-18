'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { RuneGrid, RuneFilters, EtchingCard, type FilterState } from '@/components/runes';
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

export default function ExplorerPage() {
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

    // Verified filter
    // TODO: Enable when backend adds verified field to RegistryEntry
    // if (filters.showVerifiedOnly) {
    //   filtered = filtered.filter((rune) => rune.verified);
    // }

    // Note: Sorting is done by backend via listRunes

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

  return (
    <div className="space-y-8">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-museum-dark-gray hover:text-museum-black transition-colors"
      >
        <Home className="h-5 w-5" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Runes Explorer
        </h1>
        <p className="text-museum-dark-gray">
          Explore Bitcoin Runes created on QURI Protocol
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <div className="flex items-center gap-3 mb-2">
            <Coins className="h-8 w-8 text-gold-600" />
            <span className="text-sm text-museum-dark-gray">Total Runes</span>
          </div>
          <p className="text-3xl font-bold text-museum-black">
            {totalRunesCount.toString()}
          </p>
        </div>

        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-blue-600" />
            <span className="text-sm text-museum-dark-gray">My Runes</span>
          </div>
          <p className="text-3xl font-bold text-museum-black">{myRunes.length}</p>
        </div>

        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="h-8 w-8 text-purple-600" />
            <span className="text-sm text-museum-dark-gray">My Etchings</span>
          </div>
          <p className="text-3xl font-bold text-museum-black">{myEtchings.length}</p>
        </div>

        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <span className="text-sm text-museum-dark-gray">24h Volume</span>
          </div>
          <p className="text-3xl font-bold text-museum-black">
            {stats?.total_volume_24h
              ? Number(stats.total_volume_24h).toLocaleString()
              : '0'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Button
            onClick={() => setActiveTab('all')}
            variant={activeTab === 'all' ? 'primary' : 'outline'}
            size="lg"
          >
            <Coins className="h-5 w-5 mr-2" />
            All Runes ({allRunes.length})
          </Button>
          <Button
            onClick={() => setActiveTab('mine')}
            variant={activeTab === 'mine' ? 'primary' : 'outline'}
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            My Runes ({myRunes.length})
          </Button>
          <Button
            onClick={() => setActiveTab('etchings')}
            variant={activeTab === 'etchings' ? 'primary' : 'outline'}
            size="lg"
          >
            <Activity className="h-5 w-5 mr-2" />
            My Etchings ({myEtchings.length})
          </Button>
        </div>

        <Button onClick={handleRefresh} variant="outline" disabled={loading}>
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* All Runes Tab */}
      {activeTab === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
              emptyMessage="No Runes found"
              emptyDescription="Try adjusting your filters or create your first Rune"
            />
          </div>
        </div>
      )}

      {/* My Runes Tab */}
      {activeTab === 'mine' && (
        <div>
          {myRunes.length === 0 ? (
            <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
              <Sparkles className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
              <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
                No Runes Created Yet
              </h3>
              <p className="text-museum-dark-gray mb-6">
                Create your first Bitcoin Rune now
              </p>
              <Link href="/create">
                <Button size="lg">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Your First Rune
                </Button>
              </Link>
            </div>
          ) : (
            <RuneGrid
              runes={myRunes}
              loading={loading}
              variant="detailed"
              emptyMessage="No Runes found"
            />
          )}
        </div>
      )}

      {/* My Etchings Tab */}
      {activeTab === 'etchings' && (
        <div>
          {myEtchings.length === 0 ? (
            <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
              <Activity className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
              <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
                No Etchings Yet
              </h3>
              <p className="text-museum-dark-gray mb-6">
                Start creating Bitcoin Runes to see etching processes here
              </p>
              <Link href="/create">
                <Button size="lg">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create a Rune
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myEtchings.map((etching) => (
                <EtchingCard key={etching.id} etching={etching} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
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
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-blue-700 mb-1">Network</p>
              <p className="font-semibold text-blue-900">Bitcoin Testnet</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-blue-700 mb-1">Infrastructure</p>
              <p className="font-semibold text-blue-900">Internet Computer</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
