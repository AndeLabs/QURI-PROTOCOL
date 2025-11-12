'use client';

import { useState } from 'react';
import { Repeat, Droplet, BookOpen, Sprout } from 'lucide-react';

// Import DEX components (will be moved to proper location)
// import { SwapInterface } from '@/src/components/dex/swap/SwapInterface';
// import { LiquidityPools } from '@/src/components/dex/pools/LiquidityPools';
// import { OrderbookTrading } from '@/src/components/dex/orderbook/OrderbookTrading';

type Tab = 'swap' | 'pools' | 'orderbook' | 'farming';

interface TabConfig {
  id: Tab;
  label: string;
  icon: any;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'swap',
    label: 'Swap',
    icon: Repeat,
    description: 'Trade tokens instantly',
  },
  {
    id: 'pools',
    label: 'Liquidity',
    icon: Droplet,
    description: 'Provide liquidity & earn fees',
  },
  {
    id: 'orderbook',
    label: 'Orderbook',
    icon: BookOpen,
    description: 'Limit & market orders',
  },
  {
    id: 'farming',
    label: 'Farm',
    icon: Sprout,
    description: 'Stake LP tokens for rewards',
  },
];

export default function DEXPage() {
  const [activeTab, setActiveTab] = useState<Tab>('swap');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          DEX Trading
        </h1>
        <p className="text-museum-dark-gray">
          Professional-grade decentralized exchange for Bitcoin Runes
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-museum-light-gray">
        <div className="flex gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-gold-500 text-gold-700'
                    : 'border-transparent text-museum-dark-gray hover:text-museum-black hover:border-museum-light-gray'
                }`}
              >
                <Icon className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'swap' && (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
              <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
                Swap Tokens
              </h2>
              {/* <SwapInterface /> */}
              <div className="text-center text-museum-dark-gray py-12">
                <Repeat className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
                <p className="font-medium mb-2">Swap Interface</p>
                <p className="text-sm">
                  Connect wallet to start trading
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pools' && (
          <div>
            <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
              <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
                Liquidity Pools
              </h2>
              {/* <LiquidityPools /> */}
              <div className="text-center text-museum-dark-gray py-12">
                <Droplet className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
                <p className="font-medium mb-2">Liquidity Pools</p>
                <p className="text-sm">
                  View and manage liquidity positions
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orderbook' && (
          <div>
            <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
              <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
                Orderbook Trading
              </h2>
              {/* <OrderbookTrading poolId="pool-1" /> */}
              <div className="text-center text-museum-dark-gray py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
                <p className="font-medium mb-2">Orderbook Trading</p>
                <p className="text-sm">
                  Place limit and market orders
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'farming' && (
          <div>
            <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
              <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
                Liquidity Mining
              </h2>
              <div className="text-center text-museum-dark-gray py-12">
                <Sprout className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
                <p className="font-medium mb-2">Liquidity Mining</p>
                <p className="text-sm">
                  Stake LP tokens and earn rewards
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Total TVL</p>
          <p className="text-2xl font-bold text-museum-black">$1.2M</p>
        </div>
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">24h Volume</p>
          <p className="text-2xl font-bold text-museum-black">$450K</p>
        </div>
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Active Pools</p>
          <p className="text-2xl font-bold text-museum-black">12</p>
        </div>
      </div>
    </div>
  );
}
