/**
 * Rune Explorer Hook
 * Manages data fetching, caching, and real-time updates for the explorer
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { OctopusIndexerClient, OctopusRuneEntry } from '@/lib/integrations/octopus-indexer';
import { logger } from '@/lib/logger';

export interface RuneExplorerState {
  runes: OctopusRuneEntry[];
  loading: boolean;
  error: string | null;
  latestBlock: number;
  lastUpdate: Date | null;
}

export interface RuneExplorerOptions {
  network?: 'mainnet' | 'testnet';
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  cacheEnabled?: boolean;
  cacheDuration?: number; // milliseconds
}

const DEFAULT_OPTIONS: Required<RuneExplorerOptions> = {
  network: 'mainnet',
  autoRefresh: true,
  refreshInterval: 60000, // 1 minute
  cacheEnabled: true,
  cacheDuration: 300000, // 5 minutes
};

// In-memory cache
interface CacheEntry {
  data: OctopusRuneEntry[];
  timestamp: number;
  blockHeight: number;
}

const runeCache = new Map<string, CacheEntry>();

export function useRuneExplorer(options: RuneExplorerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [state, setState] = useState<RuneExplorerState>({
    runes: [],
    loading: true,
    error: null,
    latestBlock: 0,
    lastUpdate: null,
  });

  const clientRef = useRef<OctopusIndexerClient>();
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  // Initialize client
  useEffect(() => {
    clientRef.current = new OctopusIndexerClient(opts.network);
  }, [opts.network]);

  // Fetch latest block
  const fetchLatestBlock = useCallback(async (): Promise<number> => {
    if (!clientRef.current) return 0;
    
    try {
      const blockInfo = await clientRef.current.getLatestBlock();
      return Number(blockInfo.height);
    } catch (error) {
      logger.error('Failed to fetch latest block', error instanceof Error ? error : undefined);
      return 0;
    }
  }, []);

  // Fetch rune by ID
  const fetchRuneById = useCallback(async (runeId: string): Promise<OctopusRuneEntry | null> => {
    if (!clientRef.current) return null;

    try {
      const rune = await clientRef.current.getRuneById(runeId);
      return rune;
    } catch (error) {
      logger.error('Failed to fetch rune by ID', error instanceof Error ? error : undefined);
      return null;
    }
  }, []);

  // Fetch rune by name
  const fetchRuneByName = useCallback(async (name: string): Promise<OctopusRuneEntry | null> => {
    if (!clientRef.current) return null;

    try {
      const rune = await clientRef.current.getRune(name);
      return rune;
    } catch (error) {
      logger.error('Failed to fetch rune by name', error instanceof Error ? error : undefined);
      return null;
    }
  }, []);

  // Main data loading function
  const loadRunes = useCallback(async (forceRefresh: boolean = false) => {
    if (!clientRef.current) return;

    const cacheKey = `runes_${opts.network}`;

    // Check cache first
    if (opts.cacheEnabled && !forceRefresh) {
      const cached = runeCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < opts.cacheDuration) {
        logger.info('Using cached rune data', { 
          age: Date.now() - cached.timestamp,
          count: cached.data.length 
        });
        
        setState(prev => ({
          ...prev,
          runes: cached.data,
          latestBlock: cached.blockHeight,
          loading: false,
          lastUpdate: new Date(cached.timestamp),
        }));
        return;
      }
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get latest block
      const blockHeight = await fetchLatestBlock();
      
      logger.info('Fetching runes from Octopus Indexer', { 
        network: opts.network,
        blockHeight 
      });

      // TODO: When Octopus adds list_runes endpoint, implement pagination here
      // For now, we'll return empty array as placeholder
      // In production, this would be something like:
      // const runes = await clientRef.current.listRunes({ limit: 1000 });
      
      const runes: OctopusRuneEntry[] = [];

      // Update cache
      if (opts.cacheEnabled) {
        runeCache.set(cacheKey, {
          data: runes,
          timestamp: Date.now(),
          blockHeight,
        });
      }

      setState({
        runes,
        loading: false,
        error: null,
        latestBlock: blockHeight,
        lastUpdate: new Date(),
      });

      logger.info('Runes loaded successfully', { count: runes.length });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load runes';
      logger.error('Failed to load runes', error instanceof Error ? error : undefined);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMsg,
      }));
    }
  }, [opts.network, opts.cacheEnabled, opts.cacheDuration, fetchLatestBlock]);

  // Initial load
  useEffect(() => {
    loadRunes();
  }, [loadRunes]);

  // Auto-refresh setup
  useEffect(() => {
    if (!opts.autoRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      logger.info('Auto-refreshing rune data');
      loadRunes();
    }, opts.refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [opts.autoRefresh, opts.refreshInterval, loadRunes]);

  // Manual refresh
  const refresh = useCallback(() => {
    logger.info('Manual refresh triggered');
    return loadRunes(true);
  }, [loadRunes]);

  // Clear cache
  const clearCache = useCallback(() => {
    const cacheKey = `runes_${opts.network}`;
    runeCache.delete(cacheKey);
    logger.info('Cache cleared');
  }, [opts.network]);

  return {
    ...state,
    refresh,
    clearCache,
    fetchRuneById,
    fetchRuneByName,
    fetchLatestBlock,
    isRefreshing: state.loading && state.runes.length > 0,
  };
}

/**
 * Hook for tracking a specific rune with real-time updates
 */
export function useRuneTracking(runeId: string | null, options: RuneExplorerOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const [rune, setRune] = useState<OctopusRuneEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const clientRef = useRef<OctopusIndexerClient>();
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    clientRef.current = new OctopusIndexerClient(opts.network);
  }, [opts.network]);

  const fetchRune = useCallback(async () => {
    if (!runeId || !clientRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const data = await clientRef.current.getRuneById(runeId);
      setRune(data);
      logger.info('Rune fetched', { runeId, found: !!data });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch rune';
      setError(errorMsg);
      logger.error('Failed to fetch rune', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  }, [runeId]);

  useEffect(() => {
    fetchRune();
  }, [fetchRune]);

  // Auto-refresh
  useEffect(() => {
    if (!opts.autoRefresh || !runeId) return;

    refreshTimerRef.current = setInterval(fetchRune, opts.refreshInterval);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [opts.autoRefresh, opts.refreshInterval, runeId, fetchRune]);

  return {
    rune,
    loading,
    error,
    refresh: fetchRune,
  };
}

/**
 * Hook for getting explorer statistics
 */
export function useRuneStats(runes: OctopusRuneEntry[]) {
  const stats = {
    total: runes.length,
    verified: runes.filter(r => r.confirmations >= 6).length,
    turbo: runes.filter(r => r.turbo).length,
    totalSupply: runes.reduce((sum, r) => sum + Number(r.premine), 0),
    totalMints: runes.reduce((sum, r) => sum + Number(r.mints), 0),
    totalBurned: runes.reduce((sum, r) => sum + Number(r.burned), 0),
    averageConfirmations: runes.length > 0 
      ? runes.reduce((sum, r) => sum + r.confirmations, 0) / runes.length 
      : 0,
  };

  return stats;
}
