/**
 * Modern Rune Explorer
 * Modular, scalable, and robust explorer for Bitcoin Runes
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RuneCard, RuneCardCompact } from '@/components/explorer/RuneCard';
import { RuneFilters, applyFilters, DEFAULT_FILTERS, RuneFilterOptions } from '@/components/explorer/RuneFilters';
import { Pagination, usePagination } from '@/components/explorer/Pagination';
import { useRuneExplorer, useRuneStats } from '@/hooks/useRuneExplorer';
import { 
  Home, 
  RefreshCw, 
  Grid, 
  List, 
  Loader, 
  AlertCircle,
  TrendingUp,
  Coins,
  CheckCircle,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

function ExplorerContent() {
  const searchParams = useSearchParams();
  const newEtchingId = searchParams.get('new');

  // State
  const [filters, setFilters] = useState<RuneFilterOptions>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [network] = useState<'mainnet' | 'testnet'>('mainnet');

  // Data fetching
  const {
    runes,
    loading,
    error,
    latestBlock,
    lastUpdate,
    refresh,
    isRefreshing,
  } = useRuneExplorer({
    network,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  // Apply filters
  const filteredRunes = applyFilters(runes, filters);

  // Pagination
  const {
    currentPage,
    pageSize,
    totalPages,
    handlePageChange,
    handlePageSizeChange,
    paginateItems,
  } = usePagination(filteredRunes.length, 24);

  const displayedRunes = paginateItems(filteredRunes);

  // Statistics
  const stats = useRuneStats(runes);

  // Handle URL params for new rune
  useEffect(() => {
    if (newEtchingId) {
      logger.info('New etching detected', { etchingId: newEtchingId });
      // TODO: Fetch and display new rune details
    }
  }, [newEtchingId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>

          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={refresh}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="font-serif text-4xl md:text-5xl text-neutral-900">
            Bitcoin Runes Explorer
          </h1>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
            Explore all Bitcoin Runes on-chain
          </p>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Coins className="w-5 h-5" />}
            label="Total Runes"
            value={stats.total.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Verified"
            value={stats.verified.toLocaleString()}
            color="green"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Turbo"
            value={stats.turbo.toLocaleString()}
            color="orange"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Latest Block"
            value={`#${latestBlock.toLocaleString()}`}
            color="purple"
          />
        </div>

        {/* Filters */}
        <RuneFilters
          filters={filters}
          onFiltersChange={setFilters}
          resultCount={filteredRunes.length}
          totalCount={runes.length}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          compact={true}
        />

        {/* View Mode Toggle */}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => setViewMode('grid')}
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setViewMode('list')}
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">Error Loading Runes</h3>
                  <p className="text-sm text-red-700">{error}</p>
                  <Button onClick={refresh} variant="outline" size="sm" className="mt-3">
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && runes.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600">Loading Runes from Bitcoin...</p>
            </CardContent>
          </Card>
        )}

        {/* Runes Grid/List */}
        {!loading && !error && (
          <>
            {filteredRunes.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {filters.search || filters.showOnlyVerified || filters.showOnlyTurbo
                      ? 'No Runes match your filters'
                      : 'No Runes indexed yet'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {filters.search || filters.showOnlyVerified || filters.showOnlyTurbo ? (
                      <>Try adjusting your filters or search criteria</>
                    ) : (
                      <>The Octopus Indexer is continuously syncing with Bitcoin</>
                    )}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedRunes.map((rune) => (
                      <RuneCard
                        key={rune.rune_id}
                        rune={rune}
                        network={network}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedRunes.map((rune) => (
                      <RuneCardCompact
                        key={rune.rune_id}
                        rune={rune}
                        network={network}
                      />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={filteredRunes.length}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  showPageSize={true}
                  pageSizeOptions={[12, 24, 48, 96]}
                />
              </>
            )}
          </>
        )}

        {/* Info Footer */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Data Source</h4>
                <p className="text-gray-600">Octopus Network Runes Indexer</p>
                <p className="font-mono text-xs text-gray-500 mt-1">
                  kzrva-ziaaa-aaaar-qamyq-cai
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Network</h4>
                <p className="text-gray-600">ICP Mainnet + Bitcoin</p>
                <p className="text-xs text-gray-500 mt-1">
                  Updated every Bitcoin block
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Statistics</h4>
                <p className="text-gray-600">
                  {stats.totalMints.toLocaleString()} total mints
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Avg {stats.averageConfirmations.toFixed(1)} confirmations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
  };

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[color]}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-80 mb-1">{label}</p>
            <p className="text-xl font-bold truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Export with Suspense
export default function RuneExplorer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading Explorer...</p>
        </div>
      </div>
    }>
      <ExplorerContent />
    </Suspense>
  );
}
