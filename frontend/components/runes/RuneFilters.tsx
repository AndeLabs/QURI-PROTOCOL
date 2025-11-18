/**
 * Modular RuneFilters Component
 * Reusable filters for Rune lists
 */

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { RuneSortBy, SortOrder } from '@/types/canisters';

export interface FilterState {
  search: string;
  sortBy: RuneSortBy;
  sortOrder: SortOrder;
  showVerifiedOnly: boolean;
}

interface RuneFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
  loading?: boolean;
  showSortOptions?: boolean;
  showVerifiedFilter?: boolean;
  className?: string;
}

export function RuneFilters({
  onFilterChange,
  totalCount,
  filteredCount,
  loading = false,
  showSortOptions = true,
  showVerifiedFilter = true,
  className = '',
}: RuneFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sortBy: { Block: null },
    sortOrder: { Desc: null },
    showVerifiedOnly: false,
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearSearch = () => {
    handleFilterChange({ search: '' });
  };

  const resetFilters = () => {
    const defaultFilters: FilterState = {
      search: '',
      sortBy: { Block: null },
      sortOrder: { Desc: null },
      showVerifiedOnly: false,
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div
      className={`border border-museum-light-gray rounded-xl p-6 bg-museum-white ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-museum-black flex items-center gap-2">
          <Filter className="h-5 w-5 text-gold-600" />
          Filters
        </h3>
        <Button
          onClick={resetFilters}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-museum-black mb-2">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-museum-dark-gray" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              placeholder="Search by name, symbol, or key..."
              className="w-full pl-10 pr-10 py-2 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none"
            />
            {filters.search && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-museum-dark-gray hover:text-museum-black"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sort Options */}
        {showSortOptions && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-museum-black mb-2">
                Sort By
              </label>
              <select
                value={Object.keys(filters.sortBy)[0]}
                onChange={(e) => {
                  const value = e.target.value;
                  const sortBy =
                    value === 'Name'
                      ? ({ Name: null } as RuneSortBy)
                      : value === 'Volume'
                      ? ({ Volume: null } as RuneSortBy)
                      : value === 'Holders'
                      ? ({ Holders: null } as RuneSortBy)
                      : ({ Block: null } as RuneSortBy);
                  handleFilterChange({ sortBy });
                }}
                className="w-full px-3 py-2 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none"
              >
                <option value="Block">Recent (Block)</option>
                <option value="Name">Name (A-Z)</option>
                <option value="Volume">Volume</option>
                <option value="Holders">Holders</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-museum-black mb-2">
                Order
              </label>
              <select
                value={Object.keys(filters.sortOrder)[0]}
                onChange={(e) => {
                  const sortOrder =
                    e.target.value === 'Asc'
                      ? ({ Asc: null } as SortOrder)
                      : ({ Desc: null } as SortOrder);
                  handleFilterChange({ sortOrder });
                }}
                className="w-full px-3 py-2 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none"
              >
                <option value="Desc">Descending</option>
                <option value="Asc">Ascending</option>
              </select>
            </div>
          </div>
        )}

        {/* Verified Filter */}
        {showVerifiedFilter && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showVerifiedOnly}
              onChange={(e) =>
                handleFilterChange({ showVerifiedOnly: e.target.checked })
              }
              className="w-4 h-4 text-gold-600 border-museum-light-gray rounded focus:ring-2 focus:ring-gold-400"
            />
            <span className="text-sm text-museum-black">
              Show verified Runes only
            </span>
          </label>
        )}

        {/* Results Count */}
        <div className="pt-4 border-t border-museum-light-gray">
          <p className="text-sm text-museum-dark-gray">
            Showing <strong className="text-museum-black">{filteredCount}</strong> of{' '}
            <strong className="text-museum-black">{totalCount}</strong> Runes
          </p>
        </div>
      </div>
    </div>
  );
}
