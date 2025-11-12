'use client';

import { BarChart3, TrendingUp, Activity, Users, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Analytics & Insights
        </h1>
        <p className="text-museum-dark-gray">
          Comprehensive statistics and performance metrics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Total Value Locked',
            value: '$1.2M',
            change: '+12.5%',
            icon: DollarSign,
            color: 'text-green-600',
          },
          {
            title: '24h Trading Volume',
            value: '$450K',
            change: '+8.3%',
            icon: Activity,
            color: 'text-blue-600',
          },
          {
            title: 'Total Transactions',
            value: '8,456',
            change: '+156',
            icon: TrendingUp,
            color: 'text-purple-600',
          },
          {
            title: 'Active Users',
            value: '2,450',
            change: '+18%',
            icon: Users,
            color: 'text-orange-600',
          },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.title}
              className="rounded-xl border border-museum-light-gray bg-museum-white p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`h-8 w-8 ${metric.color}`} />
                <span className="text-sm font-medium text-green-600">
                  {metric.change}
                </span>
              </div>
              <p className="text-sm text-museum-dark-gray mb-1">{metric.title}</p>
              <p className="text-3xl font-bold text-museum-black">{metric.value}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
          <h2 className="font-serif text-xl font-bold text-museum-black mb-6">
            Trading Volume (7 Days)
          </h2>
          <div className="flex items-center justify-center h-64 text-museum-dark-gray">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
              <p>Chart Coming Soon</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
          <h2 className="font-serif text-xl font-bold text-museum-black mb-6">
            TVL Growth (30 Days)
          </h2>
          <div className="flex items-center justify-center h-64 text-museum-dark-gray">
            <div className="text-center">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
              <p>Chart Coming Soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Pools */}
      <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
          Top Performing Pools
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-museum-light-gray text-left">
                <th className="pb-3 text-sm font-medium text-museum-dark-gray">Pool</th>
                <th className="pb-3 text-sm font-medium text-museum-dark-gray">TVL</th>
                <th className="pb-3 text-sm font-medium text-museum-dark-gray">Volume 24h</th>
                <th className="pb-3 text-sm font-medium text-museum-dark-gray">APY</th>
                <th className="pb-3 text-sm font-medium text-museum-dark-gray">Change</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'DOG/ckBTC', tvl: '$450K', volume: '$125K', apy: '45.2%', change: '+12.5%' },
                { name: 'RSIC/ckBTC', tvl: '$320K', volume: '$98K', apy: '38.7%', change: '+8.3%' },
                { name: 'PUPS/ckBTC', tvl: '$280K', volume: '$87K', apy: '35.1%', change: '+6.2%' },
                { name: 'NAK/ckBTC', tvl: '$210K', volume: '$65K', apy: '28.9%', change: '+4.8%' },
              ].map((pool, i) => (
                <tr
                  key={i}
                  className="border-b border-museum-light-gray last:border-0"
                >
                  <td className="py-4 font-medium text-museum-black">{pool.name}</td>
                  <td className="py-4 text-museum-dark-gray">{pool.tvl}</td>
                  <td className="py-4 text-museum-dark-gray">{pool.volume}</td>
                  <td className="py-4 font-medium text-green-600">{pool.apy}</td>
                  <td className="py-4 text-green-600">{pool.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-6">
          <h3 className="font-semibold text-museum-black mb-4">Total Runes Created</h3>
          <p className="text-4xl font-bold text-museum-black mb-2">156</p>
          <p className="text-sm text-green-600">+12 this week</p>
        </div>
        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-6">
          <h3 className="font-semibold text-museum-black mb-4">Bridge Transactions</h3>
          <p className="text-4xl font-bold text-museum-black mb-2">2,341</p>
          <p className="text-sm text-green-600">+89 today</p>
        </div>
        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-6">
          <h3 className="font-semibold text-museum-black mb-4">Staking Positions</h3>
          <p className="text-4xl font-bold text-museum-black mb-2">1,234</p>
          <p className="text-sm text-green-600">+45 this week</p>
        </div>
      </div>
    </div>
  );
}
