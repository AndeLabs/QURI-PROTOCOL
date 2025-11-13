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
} from 'lucide-react';

interface StatCard {
  title: string;
  value: string;
  change: string;
  icon: any;
  trend: 'up' | 'down';
}

// TODO: Load stats from DEX canister
const getStats = async (): Promise<StatCard[]> => {
  // const actor = await getDexActor();
  // const stats = await actor.getProtocolStats();
  // return stats;
  return [];
};

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
  const [stats, setStats] = useState<StatCard[]>([]);

  useEffect(() => {
    getStats().then(setStats);
  }, []);

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
      {stats.length > 0 && (
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
      )}

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
      {/* TODO: Implement recent activity from DEX canister */}
      {/* <div>
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
      </div> */}

      {/* Featured Pools */}
      {/* TODO: Implement top pools from DEX canister */}
      {/* <div>
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
      </div> */}
    </div>
  );
}
