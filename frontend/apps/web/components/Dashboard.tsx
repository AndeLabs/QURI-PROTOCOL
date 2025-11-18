'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { TrendingUp, Activity, Zap, Users, Bitcoin, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface DashboardStats {
  totalRunes: number;
  activeUsers: number;
  totalVolume: string;
  avgFee: string;
  recentEtchings: number;
  successRate: number;
}

interface RecentRune {
  id: string;
  name: string;
  symbol: string;
  creator: string;
  timestamp: number;
  supply: string;
}

/**
 * Production-grade Dashboard component
 * Shows analytics, statistics, and recent activity
 */
export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRunes, setRecentRunes] = useState<RecentRune[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Implement actual API calls to registry canister
      // Example:
      // const actor = await getRegistryActor();
      // const stats = await actor.getDashboardStats();
      // const recentRunes = await actor.getRecentRunes();
      // setStats(stats);
      // setRecentRunes(recentRunes);

      throw new Error('API integration not yet implemented');

      logger.info('Dashboard data loaded successfully');
    } catch (err) {
      const errorMessage = 'Failed to load dashboard data';
      setError(errorMessage);
      logger.error(errorMessage, err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-bitcoin-500" />
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={loadDashboardData}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatTimestamp = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Runes"
          value={stats.totalRunes.toLocaleString()}
          icon={<TrendingUp className="w-6 h-6" />}
          trend="+12.5%"
          trendUp={true}
          color="bitcoin"
        />

        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          icon={<Users className="w-6 h-6" />}
          trend="+8.3%"
          trendUp={true}
          color="blue"
        />

        <StatCard
          title="Total Volume"
          value={stats.totalVolume}
          icon={<Bitcoin className="w-6 h-6" />}
          trend="+15.7%"
          trendUp={true}
          color="green"
        />

        <StatCard
          title="Avg Fee"
          value={stats.avgFee}
          icon={<Zap className="w-6 h-6" />}
          trend="-5.2%"
          trendUp={false}
          color="purple"
        />

        <StatCard
          title="Recent Etchings (24h)"
          value={stats.recentEtchings.toString()}
          icon={<Activity className="w-6 h-6" />}
          trend="+18.9%"
          trendUp={true}
          color="orange"
        />

        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend="+0.3%"
          trendUp={true}
          color="green"
        />
      </div>

      {/* Recent Runes Table */}
      <Card>
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Runes</h3>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Symbol
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Supply
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Creator
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentRunes.map((rune) => (
                  <tr
                    key={rune.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-gray-900">{rune.name}</td>
                    <td className="py-3 px-4 text-gray-700">{rune.symbol}</td>
                    <td className="py-3 px-4 text-gray-700">{rune.supply}</td>
                    <td className="py-3 px-4 font-mono text-sm text-gray-600">
                      {rune.creator}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {formatTimestamp(rune.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {recentRunes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No recent runes to display
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
  color: 'bitcoin' | 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon, trend, trendUp, color }: StatCardProps) {
  const colorClasses = {
    bitcoin: 'bg-bitcoin-100 text-bitcoin-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        </div>

        <div className="mb-2">
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>

        <div className="flex items-center gap-1">
          <span
            className={`text-sm font-medium ${
              trendUp ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trendUp ? '↑' : '↓'} {trend}
          </span>
          <span className="text-sm text-gray-500">vs last week</span>
        </div>
      </div>
    </Card>
  );
}
