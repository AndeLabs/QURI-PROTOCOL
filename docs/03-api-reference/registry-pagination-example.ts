/**
 * Complete Example: Using the Registry Pagination API
 *
 * This example demonstrates how to use the new list_runes pagination
 * system in a real-world React application.
 */

import { useState, useEffect } from 'react';
import { useRegistry } from '@/hooks/useRegistry';
import type { Page, PagedResponse, RegistryEntry, RuneSortBy, SortOrder } from '@/types/canisters';

// ============================================================================
// Example 1: Basic Pagination
// ============================================================================

export function BasicRuneList() {
  const { listRunes, loading, error } = useRegistry();
  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const itemsPerPage = 50n;

  useEffect(() => {
    loadPage(page);
  }, [page]);

  const loadPage = async (pageNum: number) => {
    const response = await listRunes({
      offset: BigInt(pageNum) * itemsPerPage,
      limit: itemsPerPage,
      sort_by: [{ Block: null }],
      sort_order: [{ Desc: null }],
    });

    setRunes(response.items);
    setTotalPages(Math.ceil(Number(response.total) / Number(itemsPerPage)));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">All Runes</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {runes.map((rune) => (
          <RuneCard key={rune.metadata.name} rune={rune} />
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Previous
        </button>

        <span className="px-4 py-2">
          Page {page + 1} of {totalPages}
        </span>

        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages - 1}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Infinite Scroll
// ============================================================================

export function InfiniteRuneList() {
  const { listRunes, loading } = useRegistry();
  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [offset, setOffset] = useState(0n);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (!hasMore || loading) return;

    const response = await listRunes({
      offset,
      limit: 50n,
      sort_by: [{ Block: null }],
      sort_order: [{ Desc: null }],
    });

    setRunes((prev) => [...prev, ...response.items]);
    setOffset(offset + 50n);
    setHasMore(response.has_more);
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div className="space-y-4">
      {runes.map((rune) => (
        <RuneCard key={rune.metadata.name} rune={rune} />
      ))}

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Example 3: Sortable Table
// ============================================================================

type SortConfig = {
  field: RuneSortBy;
  order: SortOrder;
};

export function SortableRuneTable() {
  const { listRunes, loading } = useRegistry();
  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: { Block: null },
    order: { Desc: null },
  });

  useEffect(() => {
    loadRunes();
  }, [sortConfig]);

  const loadRunes = async () => {
    const response = await listRunes({
      offset: 0n,
      limit: 100n,
      sort_by: [sortConfig.field],
      sort_order: [sortConfig.order],
    });

    setRunes(response.items);
  };

  const handleSort = (field: RuneSortBy) => {
    setSortConfig((prev) => {
      // Toggle order if same field, otherwise use descending
      if (JSON.stringify(prev.field) === JSON.stringify(field)) {
        return {
          field,
          order: 'Asc' in prev.order ? { Desc: null } : { Asc: null },
        };
      }
      return { field, order: { Desc: null } };
    });
  };

  const getSortIcon = (field: RuneSortBy) => {
    if (JSON.stringify(sortConfig.field) !== JSON.stringify(field)) {
      return '⇅';
    }
    return 'Asc' in sortConfig.order ? '↑' : '↓';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th
              onClick={() => handleSort({ Name: null })}
              className="px-4 py-2 cursor-pointer hover:bg-gray-200"
            >
              Name {getSortIcon({ Name: null })}
            </th>
            <th
              onClick={() => handleSort({ Block: null })}
              className="px-4 py-2 cursor-pointer hover:bg-gray-200"
            >
              Block {getSortIcon({ Block: null })}
            </th>
            <th
              onClick={() => handleSort({ Volume: null })}
              className="px-4 py-2 cursor-pointer hover:bg-gray-200"
            >
              Volume 24h {getSortIcon({ Volume: null })}
            </th>
            <th
              onClick={() => handleSort({ Holders: null })}
              className="px-4 py-2 cursor-pointer hover:bg-gray-200"
            >
              Holders {getSortIcon({ Holders: null })}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={4} className="text-center py-4">
                Loading...
              </td>
            </tr>
          ) : (
            runes.map((rune) => (
              <tr key={rune.metadata.name} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-semibold">{rune.metadata.name}</td>
                <td className="px-4 py-2">{Number(rune.metadata.key.block)}</td>
                <td className="px-4 py-2">{Number(rune.trading_volume_24h).toLocaleString()}</td>
                <td className="px-4 py-2">{Number(rune.holder_count).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Example 4: Trending Dashboard
// ============================================================================

export function TrendingDashboard() {
  const { listRunes } = useRegistry();
  const [topByVolume, setTopByVolume] = useState<RegistryEntry[]>([]);
  const [topByHolders, setTopByHolders] = useState<RegistryEntry[]>([]);
  const [recentRunes, setRecentRunes] = useState<RegistryEntry[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    // Load top by volume
    const volumeResponse = await listRunes({
      offset: 0n,
      limit: 10n,
      sort_by: [{ Volume: null }],
      sort_order: [{ Desc: null }],
    });
    setTopByVolume(volumeResponse.items);

    // Load top by holders
    const holdersResponse = await listRunes({
      offset: 0n,
      limit: 10n,
      sort_by: [{ Holders: null }],
      sort_order: [{ Desc: null }],
    });
    setTopByHolders(holdersResponse.items);

    // Load recent runes
    const recentResponse = await listRunes({
      offset: 0n,
      limit: 10n,
      sort_by: [{ Block: null }],
      sort_order: [{ Desc: null }],
    });
    setRecentRunes(recentResponse.items);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Top by Volume */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">🔥 Top by Volume</h3>
        <div className="space-y-2">
          {topByVolume.map((rune, index) => (
            <div key={rune.metadata.name} className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="text-gray-500">#{index + 1}</span>
                <span className="font-semibold">{rune.metadata.name}</span>
              </span>
              <span className="text-sm text-gray-600">
                {Number(rune.trading_volume_24h).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top by Holders */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">👥 Most Popular</h3>
        <div className="space-y-2">
          {topByHolders.map((rune, index) => (
            <div key={rune.metadata.name} className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span className="text-gray-500">#{index + 1}</span>
                <span className="font-semibold">{rune.metadata.name}</span>
              </span>
              <span className="text-sm text-gray-600">
                {Number(rune.holder_count).toLocaleString()} holders
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Created */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">🆕 Recently Created</h3>
        <div className="space-y-2">
          {recentRunes.map((rune) => (
            <div key={rune.metadata.name} className="space-y-1">
              <div className="font-semibold">{rune.metadata.name}</div>
              <div className="text-sm text-gray-600">
                Block {Number(rune.metadata.key.block)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Search with Pagination
// ============================================================================

export function SearchableRuneList() {
  const { listRunes, loading } = useRegistry();
  const [query, setQuery] = useState('');
  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [total, setTotal] = useState(0n);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        searchRunes();
      } else {
        loadAllRunes();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const loadAllRunes = async () => {
    const response = await listRunes({
      offset: 0n,
      limit: 100n,
      sort_by: [{ Name: null }],
      sort_order: [{ Asc: null }],
    });

    setRunes(response.items);
    setTotal(response.total);
  };

  const searchRunes = async () => {
    // Client-side filter for demo (in production, use backend search)
    const response = await listRunes({
      offset: 0n,
      limit: 1000n, // Load more for client-side filtering
      sort_by: [{ Name: null }],
      sort_order: [{ Asc: null }],
    });

    const filtered = response.items.filter(
      (rune) =>
        rune.metadata.name.toLowerCase().includes(query.toLowerCase()) ||
        rune.metadata.symbol.toLowerCase().includes(query.toLowerCase())
    );

    setRunes(filtered);
    setTotal(BigInt(filtered.length));
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search runes by name or symbol..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {loading ? 'Searching...' : `Found ${Number(total)} runes`}
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {runes.map((rune) => (
          <RuneCard key={rune.metadata.name} rune={rune} />
        ))}
      </div>

      {runes.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">No runes found</div>
      )}
    </div>
  );
}

// ============================================================================
// Shared Component: RuneCard
// ============================================================================

function RuneCard({ rune }: { rune: RegistryEntry }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-bold">{rune.metadata.name}</h3>
        <span className="text-sm text-gray-500">{rune.metadata.symbol}</span>
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Block:</span>
          <span className="font-semibold">{Number(rune.metadata.key.block)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Volume 24h:</span>
          <span className="font-semibold">
            {Number(rune.trading_volume_24h).toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Holders:</span>
          <span className="font-semibold">{Number(rune.holder_count).toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Supply:</span>
          <span className="font-semibold">
            {Number(rune.metadata.total_supply).toLocaleString()}
          </span>
        </div>
      </div>

      {rune.bonding_curve && rune.bonding_curve.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <span className="text-xs text-blue-600 font-semibold">🚀 Bonding Curve Active</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Export all examples
// ============================================================================

export {
  BasicRuneList,
  InfiniteRuneList,
  SortableRuneTable,
  TrendingDashboard,
  SearchableRuneList,
};
