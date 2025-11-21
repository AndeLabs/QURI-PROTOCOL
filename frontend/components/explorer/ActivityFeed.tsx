'use client';

/**
 * Activity Feed Component
 * Real-time feed of Rune activities (etchings, mints, transfers)
 * Professional explorer-style component with animations
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Activity,
  Sparkles,
  ArrowUpRight,
  Clock,
  Hash,
  Loader,
  RefreshCw,
} from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import type { RegistryEntry } from '@/types/canisters';
import {
  formatRelativeTime,
  formatSupply,
  formatAddress,
  getRuneId,
} from '@/lib/utils/format';
import { staggerContainer, staggerItem, prefersReducedMotion } from '@/design-system/motion/presets';

// Activity types
type ActivityType = 'etching' | 'mint' | 'transfer';

interface ActivityItem {
  id: string;
  type: ActivityType;
  rune: RegistryEntry;
  timestamp: bigint;
  txid?: string;
}

interface ActivityFeedProps {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showHeader?: boolean;
  className?: string;
}

export function ActivityFeed({
  limit = 10,
  autoRefresh = true,
  refreshInterval = 30000,
  showHeader = true,
  className = '',
}: ActivityFeedProps) {
  const { listRunes, loading } = useRegistry();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const reducedMotion = prefersReducedMotion();

  // Load recent activity
  const loadActivity = async () => {
    setIsRefreshing(true);
    try {
      const response = await listRunes({
        offset: 0n,
        limit: BigInt(limit),
        sort_by: [{ IndexedAt: null }],
        sort_order: [{ Desc: null }],
      });

      // Convert to activity items (for now, all are etchings)
      const items: ActivityItem[] = response.items.map((rune) => ({
        id: getRuneId(rune.metadata.key.block, rune.metadata.key.tx),
        type: 'etching' as ActivityType,
        rune,
        timestamp: rune.indexed_at,
      }));

      setActivities(items);
    } catch (error) {
      console.error('Failed to load activity:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load and auto-refresh
  useEffect(() => {
    loadActivity();

    if (autoRefresh) {
      const interval = setInterval(loadActivity, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh, refreshInterval]);

  // Activity type config
  const getActivityConfig = (type: ActivityType) => {
    switch (type) {
      case 'etching':
        return {
          icon: Sparkles,
          label: 'New Rune Etched',
          color: 'text-gold-600',
          bgColor: 'bg-gold-50',
        };
      case 'mint':
        return {
          icon: Activity,
          label: 'Rune Minted',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
        };
      case 'transfer':
        return {
          icon: ArrowUpRight,
          label: 'Rune Transferred',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
    }
  };

  return (
    <div className={`bg-museum-white border border-museum-light-gray rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b border-museum-light-gray">
          <h3 className="font-semibold text-museum-black flex items-center gap-2">
            <Activity className="h-5 w-5 text-gold-600" />
            Recent Activity
          </h3>
          <button
            onClick={loadActivity}
            disabled={isRefreshing}
            className="p-2 hover:bg-museum-cream rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 text-museum-dark-gray ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      )}

      {/* Activity List */}
      <div className="divide-y divide-museum-light-gray">
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-gold-600" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-museum-dark-gray">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <motion.div
            variants={reducedMotion ? undefined : staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {activities.map((activity) => {
                const config = getActivityConfig(activity.type);

                return (
                  <motion.div
                    key={activity.id}
                    variants={reducedMotion ? undefined : staggerItem}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="p-4 hover:bg-museum-cream/50 transition-colors"
                  >
                    <Link
                      href={`/explorer/rune/${activity.id}`}
                      className="flex items-start gap-3 group"
                    >
                      {/* Icon */}
                      <div className={`p-2 ${config.bgColor} rounded-lg flex-shrink-0`}>
                        <config.icon className={`h-4 w-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-museum-dark-gray">
                            {config.label}
                          </span>
                          <span className="text-xs text-museum-dark-gray flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(activity.timestamp)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-museum-black group-hover:text-gold-600 transition-colors truncate">
                            {activity.rune.metadata.name}
                          </h4>
                          <span className="text-sm text-museum-dark-gray">
                            {activity.rune.metadata.symbol}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-museum-dark-gray">
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {activity.id}
                          </span>
                          <span>
                            Supply:{' '}
                            {formatSupply(
                              activity.rune.metadata.premine,
                              activity.rune.metadata.divisibility
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowUpRight className="h-4 w-4 text-museum-dark-gray opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="p-3 border-t border-museum-light-gray bg-museum-cream/30">
          <Link
            href="/explorer"
            className="text-sm text-gold-600 hover:text-gold-700 font-medium flex items-center justify-center gap-1"
          >
            View All Activity
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Activity Feed for sidebars/widgets
 */
export function ActivityFeedCompact({ limit = 5 }: { limit?: number }) {
  return (
    <ActivityFeed
      limit={limit}
      showHeader={false}
      className="border-0 bg-transparent"
    />
  );
}
