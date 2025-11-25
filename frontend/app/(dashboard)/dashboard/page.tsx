'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  ArrowUpRight,
  TrendingUp,
  Coins,
  Users,
  Activity,
  Sparkles,
  Repeat,
  ArrowLeftRight,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader,
  Zap,
  BarChart3,
} from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { useTrading } from '@/hooks/useTrading';

interface StatCard {
  title: string;
  value: string;
  change?: string;
  icon: any;
  trend?: 'up' | 'down';
  loading?: boolean;
}

interface QuickAction {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'Create Rune',
    description: 'Etch new Bitcoin Runes',
    icon: Sparkles,
    href: '/create',
    color: 'from-gold-400 to-gold-600',
  },
  {
    title: 'Trade',
    description: 'Buy & Sell Virtual Runes',
    icon: Zap,
    href: '/trade',
    color: 'from-orange-400 to-red-500',
  },
  {
    title: 'Explorer',
    description: 'Browse all Runes',
    icon: Repeat,
    href: '/explorer',
    color: 'from-blue-400 to-blue-600',
  },
  {
    title: 'My Wallet',
    description: 'Manage your assets',
    icon: Lock,
    href: '/wallet',
    color: 'from-green-400 to-green-600',
  },
];

export default function DashboardPage() {
  const {
    getTotalRunes,
    getStats,
    getMyRunes,
    loading: registryLoading,
    error: registryError,
  } = useRegistry();

  const {
    getMyEtchings,
    healthCheck,
    loading: engineLoading,
    error: engineError,
  } = useRuneEngine();

  const {
    listPools,
    getPoolCount,
    getMyIcpBalance,
    getMyAllRuneBalances,
    formatIcp,
  } = useTrading();

  const [stats, setStats] = useState<StatCard[]>([]);
  const [myRunes, setMyRunes] = useState<any[]>([]);
  const [myEtchings, setMyEtchings] = useState<any[]>([]);
  const [tradingPools, setTradingPools] = useState<any[]>([]);
  const [myIcpBalance, setMyIcpBalance] = useState<bigint>(0n);
  const [myRuneBalances, setMyRuneBalances] = useState<any[]>([]);
  const [systemHealthy, setSystemHealthy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        setIsLoading(true);

        // Load data in parallel - health check separate to not block
        const [totalRunes, registryStats, userRunes, userEtchings, pools, icpBalance, runeBalances, poolCount] = await Promise.all([
          getTotalRunes(),
          getStats(),
          getMyRunes(),
          getMyEtchings(),
          listPools(0n, 50n),
          getMyIcpBalance(),
          getMyAllRuneBalances(),
          getPoolCount(),
        ]);

        // Check health separately (non-blocking)
        try {
          const health = await healthCheck();
          setSystemHealthy(health?.healthy !== false);
        } catch {
          // If health check fails, assume healthy (don't block UI)
          setSystemHealthy(true);
        }

        // Set my runes and etchings
        setMyRunes(userRunes);
        setMyEtchings(userEtchings);
        setTradingPools(pools);
        setMyIcpBalance(icpBalance);
        setMyRuneBalances(runeBalances);

        // Build stats cards
        const statsCards: StatCard[] = [
          {
            title: 'Total Runes',
            value: totalRunes.toString(),
            icon: Coins,
            trend: 'up',
          },
          {
            title: 'Trading Pools',
            value: poolCount.toString(),
            icon: BarChart3,
            trend: 'up',
          },
          {
            title: 'My Etchings',
            value: userEtchings.length.toString(),
            icon: Activity,
          },
          {
            title: 'My ICP Balance',
            value: formatIcp(icpBalance),
            icon: TrendingUp,
          },
        ];

        setStats(statsCards);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Get active etchings count
  const activeEtchings = myEtchings.filter(
    (e) => e.state === 'Building' || e.state === 'Broadcasting'
  ).length;

  const completedEtchings = myEtchings.filter((e) => e.state === 'Completed').length;

  const failedEtchings = myEtchings.filter((e) => e.state === 'Failed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Dashboard
        </h1>
        <p className="text-museum-dark-gray">
          Welcome to QURI Protocol - Your complete Bitcoin Runes ecosystem
        </p>
      </div>

      {/* System Health Alert */}
      {!isLoading && !systemHealthy && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">System Health Warning</h3>
            <p className="text-sm text-red-700 mt-1">
              One or more backend services are experiencing issues. Some features may be unavailable.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-museum-light-gray bg-museum-white p-6 animate-pulse"
            >
              <div className="h-20 bg-museum-cream rounded"></div>
            </div>
          ))
        ) : (
          stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="relative overflow-hidden rounded-xl border border-museum-light-gray bg-museum-white p-6 hover:border-gold-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="rounded-lg bg-museum-cream p-2">
                    <Icon className="h-5 w-5 text-museum-charcoal" />
                  </div>
                  {stat.change && (
                    <span
                      className={`text-sm font-medium ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-sm text-museum-dark-gray mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-museum-black">{stat.value}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <div className="group relative overflow-hidden rounded-xl border border-museum-light-gray bg-museum-white p-6 hover:border-gold-300 transition-all hover:shadow-lg">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity`}
                  />
                  <div className="relative">
                    <div
                      className={`rounded-lg bg-gradient-to-br ${action.color} p-3 w-12 h-12 flex items-center justify-center mb-4`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-museum-black mb-2 flex items-center justify-between">
                      {action.title}
                      <ArrowUpRight className="h-4 w-4 text-museum-dark-gray group-hover:text-gold-600 transition-colors" />
                    </h3>
                    <p className="text-sm text-museum-dark-gray">{action.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trading Pools */}
      {tradingPools.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold text-museum-black">
              Active Trading Pools
            </h2>
            <Link href="/trade">
              <Button variant="outline" size="sm">
                View All Pools
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {tradingPools.slice(0, 5).map((pool) => (
              <Link key={pool.rune_id} href={`/trade?rune=${pool.rune_id}`}>
                <div className="border border-museum-light-gray rounded-lg p-4 bg-museum-white hover:border-gold-300 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-museum-black">{pool.rune_id}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-museum-dark-gray">
                        <span>
                          <span className="text-museum-charcoal font-medium">Liquidity:</span>{' '}
                          {formatIcp(pool.icp_balance)} + {Number(pool.rune_balance).toLocaleString()} runes
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-museum-dark-gray">Total Trades</p>
                        <p className="text-lg font-bold text-museum-black">{Number(pool.total_trades).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-museum-dark-gray">Volume</p>
                        <p className="text-lg font-bold text-museum-black">{formatIcp(pool.total_volume_icp)}</p>
                      </div>
                      <Zap className="h-5 w-5 text-gold-500" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My Rune Balances */}
      {myRuneBalances.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold text-museum-black">
              My Rune Balances
            </h2>
            <Link href="/wallet">
              <Button variant="outline" size="sm">
                View Wallet
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myRuneBalances.slice(0, 6).map(([runeId, balance]) => (
              <div
                key={runeId}
                className="border border-museum-light-gray rounded-lg p-4 bg-museum-white hover:border-gold-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-museum-black truncate">{runeId}</h3>
                  <Coins className="h-4 w-4 text-gold-500" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-museum-dark-gray">Available</span>
                    <span className="font-medium text-museum-black">
                      {Number(balance.available).toLocaleString()}
                    </span>
                  </div>
                  {Number(balance.locked) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-museum-dark-gray">Locked</span>
                      <span className="font-medium text-orange-600">
                        {Number(balance.locked).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Recent Etchings */}
      {myEtchings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl font-bold text-museum-black">
              My Recent Etchings
            </h2>
            <Link href="/explorer?tab=mine">
              <Button variant="outline" size="sm">
                View All
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Etching Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Active</p>
                  <p className="text-2xl font-bold text-blue-900">{activeEtchings}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-700">Completed</p>
                  <p className="text-2xl font-bold text-green-900">{completedEtchings}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-red-700">Failed</p>
                  <p className="text-2xl font-bold text-red-900">{failedEtchings}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent etchings list */}
          <div className="grid grid-cols-1 gap-4">
            {myEtchings.slice(0, 5).map((etching) => (
              <div
                key={etching.id}
                className="border border-museum-light-gray rounded-lg p-4 bg-museum-white hover:border-gold-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-museum-black">{etching.rune_name}</h3>
                    <p className="text-sm text-museum-dark-gray font-mono">{etching.id}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        etching.state === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : etching.state === 'Failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {etching.state}
                    </div>
                    {etching.txid && (
                      <a
                        href={`https://mempool.space/testnet/tx/${etching.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for new users */}
      {!isLoading && myEtchings.length === 0 && (
        <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
          <Sparkles className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            Start Creating Bitcoin Runes
          </h3>
          <p className="text-museum-dark-gray mb-6">
            You haven&apos;t created any Runes yet. Create your first Bitcoin Rune now!
          </p>
          <Link href="/create">
            <Button size="lg">
              <Sparkles className="h-5 w-5 mr-2" />
              Create Your First Rune
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
