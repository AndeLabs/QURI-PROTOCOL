/**
 * Modular Rune Filters Component
 * Provides filtering, sorting, and search capabilities
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Filter, X, SlidersHorizontal } from 'lucide-react';
import { OctopusRuneEntry } from '@/lib/integrations/octopus-indexer';

export interface RuneFilterOptions {
  search: string;
  sortBy: 'recent' | 'supply' | 'mints' | 'name';
  sortOrder: 'asc' | 'desc';
  showOnlyVerified: boolean;
  showOnlyTurbo: boolean;
  minConfirmations: number;
  minSupply: string;
  maxSupply: string;
}

export const DEFAULT_FILTERS: RuneFilterOptions = {
  search: '',
  sortBy: 'recent',
  sortOrder: 'desc',
  showOnlyVerified: false,
  showOnlyTurbo: false,
  minConfirmations: 0,
  minSupply: '',
  maxSupply: '',
};

interface RuneFiltersProps {
  filters: RuneFilterOptions;
  onFiltersChange: (filters: RuneFilterOptions) => void;
  resultCount: number;
  totalCount: number;
  onReset?: () => void;
  compact?: boolean;
}

export function RuneFilters({ 
  filters, 
  onFiltersChange, 
  resultCount, 
  totalCount,
  onReset,
  compact = false 
}: RuneFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (key: keyof RuneFilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onFiltersChange(DEFAULT_FILTERS);
    setShowAdvanced(false);
    onReset?.();
  };

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 bg-white border rounded-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, symbol, or Rune ID..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <select
          value={filters.sortBy}
          onChange={(e) => updateFilter('sortBy', e.target.value)}
          className="border border-gray-300 rounded-sm px-3 py-2 text-sm min-w-[150px]"
        >
          <option value="recent">Most Recent</option>
          <option value="supply">Highest Supply</option>
          <option value="mints">Most Mints</option>
          <option value="name">Name (A-Z)</option>
        </select>

        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="outline"
          size="sm"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
        </Button>

        {hasActiveFilters && (
          <Button onClick={handleReset} variant="outline" size="sm">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}

        <div className="text-sm text-gray-600 whitespace-nowrap">
          {resultCount.toLocaleString()} / {totalCount.toLocaleString()}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Search
          </CardTitle>
          {hasActiveFilters && (
            <Button onClick={handleReset} variant="outline" size="sm">
              <X className="w-4 h-4 mr-2" />
              Reset All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name, symbol, or Rune ID..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort & Quick Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-gray-700 mb-1 block">Sort By</label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
            >
              <option value="recent">Most Recent</option>
              <option value="supply">Highest Supply</option>
              <option value="mints">Most Mints</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-1 block">Order</label>
            <select
              value={filters.sortOrder}
              onChange={(e) => updateFilter('sortOrder', e.target.value)}
              className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-700 mb-1 block">Min Confirmations</label>
            <Input
              type="number"
              min="0"
              value={filters.minConfirmations}
              onChange={(e) => updateFilter('minConfirmations', parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showOnlyVerified}
              onChange={(e) => updateFilter('showOnlyVerified', e.target.checked)}
              className="w-4 h-4 text-orange-600"
            />
            <span className="text-sm">Verified Only (6+ confirmations)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showOnlyTurbo}
              onChange={(e) => updateFilter('showOnlyTurbo', e.target.checked)}
              className="w-4 h-4 text-orange-600"
            />
            <span className="text-sm">Turbo Only ⚡</span>
          </label>
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          onClick={() => setShowAdvanced(!showAdvanced)}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
        </Button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Supply Range</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Min Supply</label>
                <Input
                  type="text"
                  placeholder="0"
                  value={filters.minSupply}
                  onChange={(e) => updateFilter('minSupply', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Max Supply</label>
                <Input
                  type="text"
                  placeholder="Unlimited"
                  value={filters.maxSupply}
                  onChange={(e) => updateFilter('maxSupply', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-600">
            Showing <strong>{resultCount.toLocaleString()}</strong> of{' '}
            <strong>{totalCount.toLocaleString()}</strong> Runes
          </p>
          {hasActiveFilters && (
            <p className="text-xs text-orange-600">
              {Object.keys(filters).filter(key => {
                const value = filters[key as keyof RuneFilterOptions];
                const defaultValue = DEFAULT_FILTERS[key as keyof RuneFilterOptions];
                return JSON.stringify(value) !== JSON.stringify(defaultValue);
              }).length} active filter(s)
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Apply filters to runes array
 */
export function applyFilters(
  runes: OctopusRuneEntry[], 
  filters: RuneFilterOptions
): OctopusRuneEntry[] {
  let filtered = [...runes];

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(
      (rune) =>
        rune.spaced_rune.toLowerCase().includes(searchLower) ||
        (rune.symbol && rune.symbol.toLowerCase().includes(searchLower)) ||
        rune.rune_id.toLowerCase().includes(searchLower) ||
        rune.etching.toLowerCase().includes(searchLower)
    );
  }

  // Verified filter
  if (filters.showOnlyVerified) {
    filtered = filtered.filter((rune) => rune.confirmations >= 6);
  }

  // Turbo filter
  if (filters.showOnlyTurbo) {
    filtered = filtered.filter((rune) => rune.turbo);
  }

  // Min confirmations
  if (filters.minConfirmations > 0) {
    filtered = filtered.filter((rune) => rune.confirmations >= filters.minConfirmations);
  }

  // Supply range
  if (filters.minSupply) {
    const minSupply = BigInt(filters.minSupply);
    filtered = filtered.filter((rune) => rune.premine >= minSupply);
  }
  if (filters.maxSupply) {
    const maxSupply = BigInt(filters.maxSupply);
    filtered = filtered.filter((rune) => rune.premine <= maxSupply);
  }

  // Sort
  filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (filters.sortBy) {
      case 'recent':
        comparison = Number(b.block - a.block);
        break;
      case 'supply':
        comparison = Number(b.premine - a.premine);
        break;
      case 'mints':
        comparison = Number(b.mints - a.mints);
        break;
      case 'name':
        comparison = a.spaced_rune.localeCompare(b.spaced_rune);
        break;
    }

    return filters.sortOrder === 'asc' ? -comparison : comparison;
  });

  return filtered;
}
