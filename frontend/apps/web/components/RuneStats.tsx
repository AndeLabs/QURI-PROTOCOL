'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { TrendingUp, Database, Activity } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Global Rune Statistics Component
 * Shows real-time stats from Registry canister
 */

interface RuneStatsProps {
  refreshInterval?: number; // milliseconds
}

export function RuneStats({ refreshInterval = 30000 }: RuneStatsProps) {
  const [stats, setStats] = useState({
    totalRunes: 0,
    totalVolume24h: 0,
    loading: true,
    error: null as string | null,
  });

  const loadStats = async () => {
    try {
      const { getRegistryActor } = await import('@/lib/icp/actors');
      const actor = getRegistryActor();
      
      const registryStats = await actor.get_stats();
      
      setStats({
        totalRunes: Number(registryStats.total_runes),
        totalVolume24h: Number(registryStats.total_volume_24h),
        loading: false,
        error: null,
      });
      
      logger.info('Loaded registry stats', registryStats);
    } catch (error) {
      logger.error('Failed to load stats', error instanceof Error ? error : undefined);
      setStats(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load stats',
      }));
    }
  };

  useEffect(() => {
    loadStats();
    
    // Auto-refresh stats
    const interval = setInterval(loadStats, refreshInterval);
    
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000) {
      return `${(volume / 1_000_000).toFixed(2)}M`;
    } else if (volume >= 1_000) {
      return `${(volume / 1_000).toFixed(2)}K`;
    }
    return volume.toString();
  };

  if (stats.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Runes */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Total Runes
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.totalRunes.toLocaleString()}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Registered on-chain
            </p>
          </div>
          <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </Card>

      {/* 24h Volume */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              24h Volume
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatVolume(stats.totalVolume24h)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              {stats.totalVolume24h > 0 ? '↑ Live Trading' : 'No activity yet'}
            </p>
          </div>
          <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
            <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      {/* Network Status */}
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
              Network Status
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.error ? (
                <span className="text-red-600 dark:text-red-400 text-base">● Offline</span>
              ) : (
                <span className="text-green-600 dark:text-green-400 text-base">● Live</span>
              )}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
              Internet Computer
            </p>
          </div>
          <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
            <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}
