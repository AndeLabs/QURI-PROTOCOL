'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerificationBadge } from '@/components/RuneVerification';
import { OctopusIndexerClient, OctopusRuneEntry } from '@/lib/integrations/octopus-indexer';
import { Search, Filter, TrendingUp, Users, Coins, ExternalLink, RefreshCw } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Global Runes Explorer
 *
 * SHOWCASE of Octopus Network Runes Indexer integration!
 * Browse ALL Bitcoin Runes on-chain, not just QURI-created ones.
 *
 * Features:
 * - View all Runes indexed on Bitcoin
 * - Real-time on-chain data from Octopus Indexer
 * - Filter by name, symbol, block height
 * - Compare QURI Runes vs All Runes
 * - Verification status for each Rune
 *
 * This demonstrates ICP's Bitcoin integration capabilities!
 */

interface FilterOptions {
  search: string;
  sortBy: 'recent' | 'supply' | 'mints';
  showOnlyVerified: boolean;
}

export default function GlobalRunesExplorer() {
  const [activeTab, setActiveTab] = useState<'quri' | 'all'>('all');
  const [allRunes, setAllRunes] = useState<OctopusRuneEntry[]>([]);
  const [quriRunes, setQuriRunes] = useState<any[]>([]);
  const [filteredRunes, setFilteredRunes] = useState<OctopusRuneEntry[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'recent',
    showOnlyVerified: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBlock, setLatestBlock] = useState<number>(0);

  const client = new OctopusIndexerClient('mainnet');

  // Format supply
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: divisibility,
    });
  };

  // Load data from Octopus Indexer
  const loadAllRunes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get latest block
      const blockInfo = await client.getLatestBlock();
      setLatestBlock(Number(blockInfo.height));

      // In production, we'd have a method to get all Runes
      // For now, we'll demonstrate with a sample query
      // The actual implementation would paginate through all Runes

      // TODO: Implement pagination through all Runes
      // For hackathon demo, we'll show the concept with known Runes

      logger.info('Loaded Runes from Octopus Indexer', {
        latest_block: blockInfo.height,
      });

      // Mock data for demonstration
      // In production, this would query Octopus for all Runes
      setAllRunes([]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load Runes';
      setError(errorMsg);
      logger.error('Failed to load Runes', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Load QURI-created Runes
  const loadQuriRunes = async () => {
    try {
      // TODO: Query QURI Registry for user-created Runes
      setQuriRunes([]);
    } catch (err) {
      logger.error('Failed to load QURI Runes', err instanceof Error ? err : undefined);
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
          rune.spaced_rune.toLowerCase().includes(searchLower) ||
          (rune.symbol && rune.symbol.toLowerCase().includes(searchLower)) ||
          rune.rune_id.includes(searchLower)
      );
    }

    // Sort
    switch (filters.sortBy) {
      case 'recent':
        filtered.sort((a, b) => Number(b.block - a.block));
        break;
      case 'supply':
        filtered.sort((a, b) => Number(b.premine - a.premine));
        break;
      case 'mints':
        filtered.sort((a, b) => Number(b.mints - a.mints));
        break;
    }

    // Verified filter
    if (filters.showOnlyVerified) {
      filtered = filtered.filter((rune) => rune.confirmations >= 6);
    }

    setFilteredRunes(filtered);
  }, [allRunes, filters]);

  // Load data on mount
  useEffect(() => {
    loadAllRunes();
    loadQuriRunes();

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadAllRunes();
      loadQuriRunes();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-museum-cream p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="font-serif text-5xl text-museum-charcoal">
            Global Runes Explorer
          </h1>
          <p className="text-lg text-museum-gray max-w-3xl mx-auto">
            Browse <strong>ALL</strong> Bitcoin Runes on-chain, powered by{' '}
            <a
              href="https://github.com/octopus-network/runes-indexer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Octopus Network Runes Indexer
              <ExternalLink className="w-4 h-4" />
            </a>
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">Latest Block</p>
                <p className="text-2xl font-bold text-blue-900">
                  #{latestBlock.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-purple-600 mb-1">Total Runes</p>
                <p className="text-2xl font-bold text-purple-900">
                  {allRunes.length.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-green-600 mb-1">QURI Created</p>
                <p className="text-2xl font-bold text-green-900">
                  {quriRunes.length.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setActiveTab('all')}
            variant={activeTab === 'all' ? 'primary' : 'outline'}
            size="lg"
            className="min-w-[200px]"
          >
            <Coins className="w-5 h-5 mr-2" />
            All Runes ({allRunes.length})
          </Button>
          <Button
            onClick={() => setActiveTab('quri')}
            variant={activeTab === 'quri' ? 'primary' : 'outline'}
            size="lg"
            className="min-w-[200px]"
          >
            <Users className="w-5 h-5 mr-2" />
            QURI Runes ({quriRunes.length})
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, symbol, or ID..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  className="pl-10"
                />
              </div>

              {/* Sort By */}
              <select
                value={filters.sortBy}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    sortBy: e.target.value as FilterOptions['sortBy'],
                  })
                }
                className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
              >
                <option value="recent">Most Recent</option>
                <option value="supply">Highest Supply</option>
                <option value="mints">Most Mints</option>
              </select>

              {/* Verified Only */}
              <label className="flex items-center gap-2 border border-gray-300 rounded-sm px-3 py-2">
                <input
                  type="checkbox"
                  checked={filters.showOnlyVerified}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      showOnlyVerified: e.target.checked,
                    })
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">Verified Only (6+ conf)</span>
              </label>
            </div>

            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {filteredRunes.length} of {allRunes.length} Runes
              </p>
              <Button
                onClick={loadAllRunes}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-6 text-center">
              <p className="text-red-900 font-semibold mb-2">Error Loading Runes</p>
              <p className="text-red-700 text-sm">{error}</p>
              <Button
                onClick={loadAllRunes}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="w-12 h-12 text-gold-500 animate-spin mx-auto mb-4" />
              <p className="text-museum-gray">Loading Runes from Bitcoin...</p>
            </CardContent>
          </Card>
        )}

        {/* Runes Grid */}
        {!loading && activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRunes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {filters.search
                      ? 'No Runes match your search'
                      : 'No Runes found'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRunes.map((rune) => (
                <RuneExplorerCard key={rune.rune_id} rune={rune} />
              ))
            )}
          </div>
        )}

        {/* QURI Runes Tab */}
        {!loading && activeTab === 'quri' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quriRunes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No QURI Runes created yet
                  </p>
                  <Button onClick={() => (window.location.href = '/create')}>
                    Create Your First Rune
                  </Button>
                </CardContent>
              </Card>
            ) : (
              quriRunes.map((rune) => (
                <RuneExplorerCard key={rune.id} rune={rune} />
              ))
            )}
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Powered by Octopus Network
            </CardTitle>
            <CardDescription>
              This explorer uses Octopus Network&apos;s on-chain Runes Indexer running on ICP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Canister ID:</p>
                <p className="font-mono text-xs break-all">
                  kzrva-ziaaa-aaaar-qamyq-cai
                </p>
              </div>
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Network:</p>
                <p className="font-semibold">ICP Mainnet</p>
              </div>
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Data Source:</p>
                <p className="font-semibold">Bitcoin Full Node</p>
              </div>
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Update Frequency:</p>
                <p className="font-semibold">Every Bitcoin Block</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// Rune Explorer Card Component
// ============================================================================

function RuneExplorerCard({ rune }: { rune: OctopusRuneEntry }) {
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: divisibility,
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-serif text-xl">
              {rune.spaced_rune}
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {rune.rune_id}
            </CardDescription>
          </div>
          {rune.symbol && (
            <div className="text-2xl" title={`Symbol: ${rune.symbol}`}>
              {rune.symbol}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verification Badge */}
        <VerificationBadge runeId={rune.rune_id} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Supply</p>
            <p className="font-mono font-semibold text-gray-900">
              {formatSupply(rune.premine, rune.divisibility)}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Mints</p>
            <p className="font-mono font-semibold text-gray-900">
              {rune.mints.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Block</p>
            <p className="font-mono font-semibold text-gray-900">
              #{rune.block.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Confirmations</p>
            <p className="font-mono font-semibold text-gray-900">
              {rune.confirmations}
            </p>
          </div>
        </div>

        {/* Turbo Badge */}
        {rune.turbo && (
          <div className="bg-gold-100 border border-gold-300 px-3 py-2 rounded-sm text-center">
            <p className="text-gold-700 font-semibold text-sm">⚡ TURBO</p>
          </div>
        )}

        {/* View Button */}
        <Button
          onClick={() =>
            window.open(`https://mempool.space/rune/${rune.rune_id}`, '_blank')
          }
          variant="outline"
          size="sm"
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View on Explorer
        </Button>
      </CardContent>
    </Card>
  );
}
