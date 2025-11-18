import React from 'react';

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Product Roadmap
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            Building the Future of Bitcoin Runes
          </p>
          <div className="mt-8">
            <span className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-lg font-bold">
              Target: $92M Annual Revenue
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="max-w-5xl mx-auto">
          {/* Phase 1 */}
          <PhaseCard
            phase="1"
            title="Stability & Foundation"
            timeline="Weeks 1-4"
            status="complete"
            statusLabel="COMPLETE - Live on Mainnet"
            progress={100}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ChecklistItem done>Advanced pagination system</ChecklistItem>
              <ChecklistItem done>Security features (rate limiting)</ChecklistItem>
              <ChecklistItem done>Mainnet deployment</ChecklistItem>
              <ChecklistItem done>Comprehensive docs</ChecklistItem>
              <ChecklistItem>Monitor production metrics</ChecklistItem>
              <ChecklistItem>Migrate metrics to stable structures</ChecklistItem>
              <ChecklistItem>Add Discord/Telegram alerting</ChecklistItem>
              <ChecklistItem>Security audit</ChecklistItem>
            </div>
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h4 className="font-bold text-green-400 mb-2">Delivered:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• 4 canisters live on mainnet</li>
                <li>• ~4T cycles ($5.2M runway for 73 years)</li>
                <li>• {'<'}200ms query performance</li>
                <li>• Production-grade security</li>
              </ul>
            </div>
          </PhaseCard>

          {/* Phase 2 */}
          <PhaseCard
            phase="2"
            title="Core Features"
            timeline="Weeks 5-12"
            status="upcoming"
            statusLabel="UPCOMING"
            progress={0}
          >
            <div className="space-y-6">
              <FeatureSection
                title="Bonding Curve System"
                icon="📈"
                items={[
                  'Automated price discovery',
                  'Graduation to AMM at target market cap',
                  'Fair launch mechanics'
                ]}
              />
              <FeatureSection
                title="AMM Implementation"
                icon="💱"
                items={[
                  'Uniswap V2-style pools',
                  '0.3% trading fees',
                  'LP token rewards'
                ]}
              />
              <FeatureSection
                title="Staking & Rewards"
                icon="💰"
                items={[
                  'Stake Runes for yield',
                  'Configurable APY',
                  'Auto-compounding options'
                ]}
              />
              <FeatureSection
                title="NFT Support"
                icon="🖼️"
                items={[
                  'Runes with divisibility = 0',
                  'Collection management',
                  'Metadata standards'
                ]}
              />
            </div>
            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="font-bold text-purple-400">Revenue Target: $500K/month</p>
            </div>
          </PhaseCard>

          {/* Phase 3 */}
          <PhaseCard
            phase="3"
            title="Scaling & Performance"
            timeline="Months 3-6"
            status="planned"
            statusLabel="PLANNED"
            progress={0}
          >
            <div className="space-y-6">
              <FeatureSection
                title="Horizontal Scaling"
                icon="⚡"
                items={[
                  'Canister sharding',
                  'Load balancing',
                  'Automatic scaling'
                ]}
              />
              <FeatureSection
                title="Query Certification"
                icon="🔐"
                items={[
                  'Cryptographic query proofs',
                  'Enhanced security',
                  'Trustless verification'
                ]}
              />
              <FeatureSection
                title="RBAC System"
                icon="🛡️"
                items={[
                  'Role-based access control',
                  'Admin panel',
                  'Permission management'
                ]}
              />
              <FeatureSection
                title="Developer SDK"
                icon="🔧"
                items={[
                  'TypeScript SDK',
                  'Rust SDK',
                  'Code examples'
                ]}
              />
            </div>
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="font-bold text-blue-400">Performance Target: 10,000 queries/second</p>
            </div>
          </PhaseCard>

          {/* Phase 4 */}
          <PhaseCard
            phase="4"
            title="Ecosystem Expansion"
            timeline="Months 6-12"
            status="planned"
            statusLabel="FUTURE"
            progress={0}
          >
            <div className="space-y-6">
              <FeatureSection
                title="Full Marketplace Web App"
                icon="🌐"
                items={[
                  'Modern UI/UX',
                  'Advanced trading features',
                  'Portfolio management',
                  'Analytics dashboard'
                ]}
              />
              <FeatureSection
                title="Mobile Applications"
                icon="📱"
                items={[
                  'iOS app (React Native)',
                  'Android app (React Native)',
                  'Push notifications',
                  'Biometric auth'
                ]}
              />
              <FeatureSection
                title="Trading Bots"
                icon="🤖"
                items={[
                  'Telegram trading bot',
                  'Discord price alerts',
                  'Auto-trading features',
                  'Strategy marketplace'
                ]}
              />
              <FeatureSection
                title="Governance DAO"
                icon="🏛️"
                items={[
                  'On-chain voting',
                  'Proposal system',
                  'Treasury management',
                  'Community governance'
                ]}
              />
            </div>
            <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="font-bold text-cyan-400">User Target: 100,000+ active users</p>
            </div>
          </PhaseCard>
        </div>

        {/* Revenue Projection */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            💰 Revenue Projections
          </h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <RevenueCard
              title="Trading Fees"
              amount="$1.08M"
              period="annually"
              description="0.3% per swap on $1M daily volume"
              icon="💱"
            />
            <RevenueCard
              title="Listing Fees"
              amount="$15.1M"
              period="annually"
              description="0.01 BTC per Rune, 100 runes/day"
              icon="📋"
            />
            <RevenueCard
              title="Bonding Curve"
              amount="$75.6M"
              period="annually"
              description="0.5% of market cap on graduations"
              icon="📈"
              highlight
            />
            <RevenueCard
              title="Premium Features"
              amount="$600K"
              period="annually"
              description="Badges, analytics, API access"
              icon="⭐"
            />
            <RevenueCard
              title="Staking Fees"
              amount="$60K"
              period="annually"
              description="5% of staking rewards"
              icon="💰"
            />
            <RevenueCard
              title="Total Revenue"
              amount="$92.4M"
              period="annually"
              description="Combined revenue streams"
              icon="🎯"
              highlight
            />
          </div>
        </section>

        {/* Market Potential */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            🎯 Market Potential
          </h2>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <MarketCard
              title="Bitcoin Runes Traders"
              size="$500M+"
              description="Growing market for Bitcoin-native tokens"
            />
            <MarketCard
              title="NFT Collectors"
              size="$2B+"
              description="Bitcoin NFTs and digital collectibles"
            />
            <MarketCard
              title="DeFi Users"
              size="$50B+"
              description="Total value locked across all chains"
            />
            <MarketCard
              title="Meme Coin Traders"
              size="$10B+"
              description="Daily trading volume"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// Components
function PhaseCard({
  phase,
  title,
  timeline,
  status,
  statusLabel,
  progress,
  children
}: {
  phase: string;
  title: string;
  timeline: string;
  status: 'complete' | 'upcoming' | 'planned';
  statusLabel: string;
  progress: number;
  children: React.ReactNode;
}) {
  const statusColors = {
    complete: 'bg-green-500/20 text-green-400 border-green-500/30',
    upcoming: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    planned: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  };

  return (
    <div className="mb-12 relative">
      {/* Timeline connector */}
      {phase !== '4' && (
        <div className="absolute left-8 top-32 w-0.5 h-full bg-gradient-to-b from-gray-600 to-transparent"></div>
      )}

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl font-bold text-white mr-4">
              {phase}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">{title}</h3>
              <p className="text-gray-400">{timeline}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold border ${statusColors[status]}`}>
            {statusLabel}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-400 mt-2">{progress}% Complete</p>
        </div>

        {children}
      </div>
    </div>
  );
}

function ChecklistItem({ done, children }: { done?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center text-gray-300">
      <span className={`mr-2 ${done ? 'text-green-400' : 'text-gray-500'}`}>
        {done ? '✓' : '○'}
      </span>
      <span className={done ? 'line-through text-gray-500' : ''}>{children}</span>
    </div>
  );
}

function FeatureSection({ title, icon, items }: { title: string; icon: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-bold text-white mb-3 flex items-center">
        <span className="mr-2">{icon}</span>
        {title}
      </h4>
      <ul className="ml-8 space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-gray-400 flex items-start">
            <span className="text-blue-400 mr-2">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RevenueCard({ title, amount, period, description, icon, highlight }: {
  title: string;
  amount: string;
  period: string;
  description: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className={`p-6 rounded-xl border ${
      highlight
        ? 'bg-gradient-to-br from-purple-600/20 to-blue-600/20 border-purple-500'
        : 'bg-gray-800/50 border-gray-700'
    }`}>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <div className="mb-3">
        <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
          {amount}
        </span>
        <span className="text-gray-400 text-sm ml-2">/{period}</span>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}

function MarketCard({ title, size, description }: {
  title: string;
  size: string;
  description: string;
}) {
  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-3xl font-bold text-purple-400 mb-3">{size}</p>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}
