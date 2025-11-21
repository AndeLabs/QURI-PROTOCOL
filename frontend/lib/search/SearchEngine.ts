/**
 * Premium Search Engine
 *
 * World-class search system with:
 * - Instant client-side fuzzy search (Fuse.js)
 * - Smart caching and background sync
 * - Relevance scoring and ranking
 * - Modular and extensible architecture
 */

import Fuse from 'fuse.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SearchableItem {
  id: string;
  name: string;
  normalizedName: string;  // Name without dots/spaces for better matching
  symbol: string;
  [key: string]: any;
}

export interface SearchResult<T> {
  item: T;
  score: number;
  matches?: ReadonlyArray<{
    key?: string;
    value?: string;
    indices: ReadonlyArray<readonly [number, number]>;
  }>;
}

export interface SearchEngineConfig {
  /** Keys to search in */
  keys: Array<string | { name: string; weight: number }>;
  /** Fuzzy matching threshold (0 = exact, 1 = match anything) */
  threshold?: number;
  /** Minimum characters to match */
  minMatchCharLength?: number;
  /** Include score in results */
  includeScore?: boolean;
  /** Include match info for highlighting */
  includeMatches?: boolean;
  /** Max results to return */
  limit?: number;
  /** Sort by score */
  sortByScore?: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const RUNE_SEARCH_CONFIG: SearchEngineConfig = {
  keys: [
    { name: 'name', weight: 2 },           // Name has highest priority
    { name: 'normalizedName', weight: 2 }, // Normalized name (no dots/spaces)
    { name: 'symbol', weight: 1.5 },       // Symbol is secondary
    { name: 'id', weight: 0.5 },           // ID is tertiary
  ],
  threshold: 0.4,           // Balanced fuzzy matching (0 = exact, 1 = anything)
  minMatchCharLength: 2,    // At least 2 chars
  includeScore: true,
  includeMatches: true,
  limit: 50,
  sortByScore: true,
};

// ============================================================================
// SEARCH ENGINE CLASS
// ============================================================================

export class SearchEngine<T extends SearchableItem> {
  private fuse: Fuse<T>;
  private items: T[] = [];
  private config: SearchEngineConfig;
  private indexBuilt: boolean = false;

  constructor(config: SearchEngineConfig = RUNE_SEARCH_CONFIG) {
    this.config = config;
    this.fuse = this.createFuseInstance([]);
  }

  /**
   * Create Fuse.js instance with configuration
   * Optimized based on Fuse.js best practices
   */
  private createFuseInstance(items: T[]): Fuse<T> {
    return new Fuse(items, {
      keys: this.config.keys,
      threshold: this.config.threshold ?? 0.4,
      minMatchCharLength: this.config.minMatchCharLength ?? 2,
      includeScore: this.config.includeScore ?? true,
      includeMatches: this.config.includeMatches ?? true,
      // Advanced options for better relevance
      ignoreLocation: true,        // Don't penalize matches at end of string
      useExtendedSearch: true,     // Enable advanced search operators
      findAllMatches: true,        // Find all matches, not just first
      shouldSort: this.config.sortByScore ?? true,
      // Performance optimizations from best practices
      ignoreFieldNorm: true,       // Important for short names like runes
      distance: 1000,              // Allow matches anywhere in the string
    });
  }

  /**
   * Build/rebuild search index with new items
   */
  buildIndex(items: T[]): void {
    this.items = items;
    this.fuse = this.createFuseInstance(items);
    this.indexBuilt = true;
  }

  /**
   * Add items to existing index (incremental update)
   */
  addItems(newItems: T[]): void {
    const existingIds = new Set(this.items.map(item => item.id));
    const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));

    if (uniqueNewItems.length > 0) {
      this.items = [...this.items, ...uniqueNewItems];
      this.fuse = this.createFuseInstance(this.items);
    }
  }

  /**
   * Update specific items in index
   */
  updateItems(updatedItems: T[]): void {
    const updateMap = new Map(updatedItems.map(item => [item.id, item]));

    this.items = this.items.map(item =>
      updateMap.has(item.id) ? updateMap.get(item.id)! : item
    );

    this.fuse = this.createFuseInstance(this.items);
  }

  /**
   * Remove items from index
   */
  removeItems(ids: string[]): void {
    const idsToRemove = new Set(ids);
    this.items = this.items.filter(item => !idsToRemove.has(item.id));
    this.fuse = this.createFuseInstance(this.items);
  }

  /**
   * Search with query string
   * Returns results sorted by relevance
   */
  search(query: string): SearchResult<T>[] {
    if (!query || query.length < (this.config.minMatchCharLength ?? 2)) {
      return [];
    }

    if (!this.indexBuilt || this.items.length === 0) {
      return [];
    }

    // Normalize query
    const normalizedQuery = query.trim().toUpperCase();

    // Perform search
    const results = this.fuse.search(normalizedQuery, {
      limit: this.config.limit ?? 50,
    });

    // Transform and enhance results
    return results.map(result => ({
      item: result.item,
      score: 1 - (result.score ?? 0), // Convert to 0-1 where 1 is best
      matches: result.matches,
    }));
  }

  /**
   * Search with advanced options
   */
  searchAdvanced(query: string, options?: {
    exactMatch?: boolean;
    prefixMatch?: boolean;
    limit?: number;
  }): SearchResult<T>[] {
    if (!query || !this.indexBuilt) {
      return [];
    }

    let searchQuery = query.trim().toUpperCase();

    // Use Fuse.js extended search syntax
    if (options?.exactMatch) {
      searchQuery = `="${searchQuery}"`;  // Exact match
    } else if (options?.prefixMatch) {
      searchQuery = `^${searchQuery}`;    // Starts with
    }

    const results = this.fuse.search(searchQuery, {
      limit: options?.limit ?? this.config.limit ?? 50,
    });

    return results.map(result => ({
      item: result.item,
      score: 1 - (result.score ?? 0),
      matches: result.matches,
    }));
  }

  /**
   * Get all items (useful for filtering)
   */
  getAllItems(): T[] {
    return [...this.items];
  }

  /**
   * Get index statistics
   */
  getStats(): { itemCount: number; indexBuilt: boolean } {
    return {
      itemCount: this.items.length,
      indexBuilt: this.indexBuilt,
    };
  }

  /**
   * Clear all items and index
   */
  clear(): void {
    this.items = [];
    this.fuse = this.createFuseInstance([]);
    this.indexBuilt = false;
  }
}

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

// Global search engine for runes
let runeSearchEngine: SearchEngine<SearchableItem> | null = null;

export function getRuneSearchEngine(): SearchEngine<SearchableItem> {
  if (!runeSearchEngine) {
    runeSearchEngine = new SearchEngine(RUNE_SEARCH_CONFIG);
  }
  return runeSearchEngine;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Highlight matched text in a string
 */
export function highlightMatches(
  text: string,
  indices: ReadonlyArray<[number, number]>
): { text: string; highlighted: boolean }[] {
  if (!indices || indices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const result: { text: string; highlighted: boolean }[] = [];
  let lastIndex = 0;

  // Sort indices by start position
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedIndices) {
    // Add non-highlighted text before this match
    if (start > lastIndex) {
      result.push({
        text: text.slice(lastIndex, start),
        highlighted: false,
      });
    }

    // Add highlighted match
    result.push({
      text: text.slice(start, end + 1),
      highlighted: true,
    });

    lastIndex = end + 1;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({
      text: text.slice(lastIndex),
      highlighted: false,
    });
  }

  return result;
}

/**
 * Calculate relevance score for sorting
 */
export function calculateRelevance(
  query: string,
  item: SearchableItem
): number {
  const queryUpper = query.toUpperCase();
  const nameUpper = item.name.toUpperCase();
  const symbolUpper = item.symbol.toUpperCase();

  let score = 0;

  // Exact match = highest score
  if (nameUpper === queryUpper) {
    score += 100;
  } else if (symbolUpper === queryUpper) {
    score += 90;
  }
  // Starts with = high score
  else if (nameUpper.startsWith(queryUpper)) {
    score += 80;
  } else if (symbolUpper.startsWith(queryUpper)) {
    score += 70;
  }
  // Contains = medium score
  else if (nameUpper.includes(queryUpper)) {
    score += 50;
  } else if (symbolUpper.includes(queryUpper)) {
    score += 40;
  }

  return score;
}

export default SearchEngine;
