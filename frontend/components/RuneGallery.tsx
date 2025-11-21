/**
 * Modern Rune Gallery with Pagination
 * Uses React Query for data fetching and caching
 */

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRuneStore } from '@/lib/store/useRuneStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getRegistryActor } from '@/lib/icp/actors';
import { Card, CardContent } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Loader2, Search, Grid3x3, List, ChevronLeft, ChevronRight } from 'lucide-react';
import type { RegistryEntry, Page } from '@/types/canisters';

export function ModernRuneGallery() {
  const {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
  } = useRuneStore();

  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Debounce search with custom hook (more efficient)
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, sortBy]);

  // Fetch runes with pagination
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['runes', 'gallery', page, pageSize, sortBy, debouncedSearch],
    queryFn: async () => {
      const actor = await getRegistryActor();

      // If searching, use search endpoint
      if (debouncedSearch) {
        const result = await actor.search_runes(
          debouncedSearch,
          BigInt(page * pageSize),
          BigInt(pageSize)
        );
        return {
          items: result.results,
          total: BigInt(result.results.length + page * pageSize),
          hasMore: result.results.length === pageSize,
        };
      }

      // Otherwise use list endpoint with sorting
      const pageParams: Page = {
        offset: BigInt(page * pageSize),
        limit: BigInt(pageSize),
        sort_by: [sortBy === 'volume' ? { Volume: null } : { Block: null }],
        sort_order: [{ Desc: null }],
      };

      const result = await actor.list_runes([pageParams]);
      if ('Ok' in result) {
        return {
          items: result.Ok.items,
          total: result.Ok.total,
          hasMore: result.Ok.has_more,
        };
      }

      return { items: [], total: 0n, hasMore: false };
    },
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  const runes = data?.items || [];
  const totalPages = data?.total ? Math.ceil(Number(data.total) / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <h2 className="text-2xl font-bold">Rune Gallery</h2>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search runes by name or symbol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'created' | 'volume' | 'trending')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="created">Recently Created</option>
          <option value="volume">Highest Volume</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading runes...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && runes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {debouncedSearch
                ? `No runes found for "${debouncedSearch}"`
                : 'No runes available yet'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Runes Grid/List */}
      {!isLoading && runes.length > 0 && (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {runes.map((rune) => (
              <RuneCard key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`} rune={rune} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || isFetching}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>

              <span className="text-sm text-gray-600">
                Page {page + 1} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!data?.hasMore || isFetching}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {isFetching && !isLoading && (
            <div className="flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Rune Card Component
 */
function RuneCard({ rune }: { rune: RegistryEntry }) {
  const hasBondingCurve = rune.bonding_curve.length > 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-mono font-bold text-lg">{rune.metadata.name}</h3>
            <p className="text-sm text-gray-500">{rune.metadata.symbol}</p>
          </div>
          {hasBondingCurve && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Bonding Curve
            </span>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Supply:</span>
            <span className="font-medium">
              {Number(rune.metadata.total_supply).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">24h Volume:</span>
            <span className="font-medium">
              {Number(rune.trading_volume_24h).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Holders:</span>
            <span className="font-medium">
              {Number(rune.holder_count).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Divisibility:</span>
            <span className="font-medium">{rune.metadata.divisibility}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Created {new Date(Number(rune.metadata.created_at) / 1_000_000).toLocaleDateString()}
          </p>
        </div>

        <Button className="w-full mt-4" variant="outline" size="sm">
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}
