'use client';

import Link from 'next/link';
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
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: any;
  trend: 'up' | 'down';
}

const stats: StatCard[] = [
  {
    title: 'Total Value Locked',
    value: '$1.2M',
    change: '+12.5%',
    icon: Coins,
    trend: 'up',
  },
  {
    title: '24h Trading Volume',
    value: '$450K',
    change: '+8.3%',
    icon: Activity,
    trend: 'up',
  },
  {
    title: 'Active Pools',
    value: '12',
    change: '+3',
    icon: TrendingUp,
    trend: 'up',
  },
  {
    title: 'Total Users',
    value: '2,450',
    change: '+156',
    icon: Users,
    trend: 'up',
  },
];

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
    href: '/dashboard/create',
    color: 'from-gold-400 to-gold-600',
  },
  {
    title: 'Trade DEX',
    description: 'Swap, pools & orderbook',
    icon: Repeat,
    href: '/dashboard/dex',
    color: 'from-blue-400 to-blue-600',
  },
  {
    title: 'Bridge',
    description: 'Bitcoin ↔ ICP transfers',
    icon: ArrowLeftRight,
    href: '/dashboard/bridge',
    color: 'from-purple-400 to-purple-600',
  },
  {
    title: 'Stake',
    description: 'Earn rewards',
    icon: Lock,
    href: '/dashboard/staking',
    color: 'from-green-400 to-green-600',
  },
];

export default function DashboardPage() {
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
                <span
                  className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.change}
                </span>
              </div>
              <p className="text-sm text-museum-dark-gray mb-1">{stat.title}</p>
              <p className="text-3xl font-bold text-museum-black">{stat.value}</p>
            </div>
          );
        })}
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
                    <div className={`rounded-lg bg-gradient-to-br ${action.color} p-3 w-12 h-12 flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-museum-black mb-2 flex items-center justify-between">
                      {action.title}
                      <ArrowUpRight className="h-4 w-4 text-museum-dark-gray group-hover:text-gold-600 transition-colors" />
                    </h3>
                    <p className="text-sm text-museum-dark-gray">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-museum-black">
            Recent Activity
          </h2>
          <Link href="/dashboard/explorer">
            <Button variant="outline" size="sm">
              View All
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="rounded-xl border border-museum-light-gray bg-museum-white overflow-hidden">
          <div className="divide-y divide-museum-light-gray">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 hover:bg-museum-cream transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-museum-cream flex items-center justify-center">
                    <Activity className="h-5 w-5 text-museum-charcoal" />
                  </div>
                  <div>
                    <p className="font-medium text-museum-black">
                      Swap completed
                    </p>
                    <p className="text-sm text-museum-dark-gray">
                      100 DOG → 0.001 BTC
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-museum-black">
                    2 min ago
                  </p>
                  <p className="text-sm text-museum-dark-gray">
                    Pool #12
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Pools */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-bold text-museum-black">
            Top Pools
          </h2>
          <Link href="/dashboard/dex/pools">
            <Button variant="outline" size="sm">
              View All Pools
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            { name: 'DOG/ckBTC', tvl: '$450K', apy: '45.2%', volume: '$125K' },
            { name: 'RSIC/ckBTC', tvl: '$320K', apy: '38.7%', volume: '$98K' },
          ].map((pool) => (
            <div
              key={pool.name}
              className="rounded-xl border border-museum-light-gray bg-museum-white p-6 hover:border-gold-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-xl text-museum-black">
                  {pool.name}
                </h3>
                <span className="text-sm font-medium text-green-600">
                  {pool.apy} APY
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-museum-dark-gray mb-1">TVL</p>
                  <p className="font-semibold text-museum-black">{pool.tvl}</p>
                </div>
                <div>
                  <p className="text-sm text-museum-dark-gray mb-1">24h Volume</p>
                  <p className="font-semibold text-museum-black">{pool.volume}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
