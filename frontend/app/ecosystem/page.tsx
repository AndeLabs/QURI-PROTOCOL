import React from 'react';
import Link from 'next/link';

export default function EcosystemPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            QURI Protocol Ecosystem
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
            The Complete Bitcoin Runes Infrastructure
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <span className="px-4 py-2 bg-green-500/20 text-green-400 rounded-full">
              🟢 Live on Mainnet
            </span>
            <span className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-full">
              $92M Revenue Potential
            </span>
            <span className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-full">
              4 Canisters Deployed
            </span>
          </div>
        </div>

        {/* Architecture Overview */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            🏗️ Architecture Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CanisterCard
              title="Registry"
              icon="📋"
              id="pnqje-qiaaa-aaaah-arodq-cai"
              description="Central directory of all Bitcoin Runes with advanced search"
              features={[
                'Advanced pagination',
                '5 sort criteria',
                'O(log n) lookups',
                'Rate limiting'
              ]}
            />
            <CanisterCard
              title="Rune Engine"
              icon="⚒️"
              id="pkrpq-5qaaa-aaaah-aroda-cai"
              description="Operations processor for Runes creation and management"
              features={[
                'Etch new Runes',
                'Mint tokens',
                'Transfer runes',
                'Bonding curves'
              ]}
            />
            <CanisterCard
              title="Bitcoin Integration"
              icon="⛓️"
              id="yz6hf-qqaaa-aaaah-arn5a-cai"
              description="Direct Bitcoin blockchain access and transaction creation"
              features={[
                'Read Bitcoin',
                'Schnorr signatures',
                'Runestone verify',
                'TX creation'
              ]}
            />
            <CanisterCard
              title="Identity Manager"
              icon="👤"
              id="y67br-5iaaa-aaaah-arn5q-cai"
              description="User authentication and session management"
              features={[
                'Authentication',
                'BTC address derivation',
                'Permissions',
                'Session tokens'
              ]}
            />
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            💡 Use Cases & Applications
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <UseCaseCard
              title="Pump.fun for Bitcoin"
              icon="🎪"
              description="Viral launchpad with automatic bonding curves"
              revenue="$1M-10M/month"
              features={[
                'Bonding curve pricing',
                'Auto AMM graduation',
                'Fair launch mechanics',
                'Community building'
              ]}
            />
            <UseCaseCard
              title="NFT Marketplace"
              icon="🖼️"
              description="Collections using Runes with divisibility = 0"
              revenue="Based on volume"
              features={[
                'NFT collections',
                'Rarity traits',
                'Trading & auctions',
                'Royalties'
              ]}
            />
            <UseCaseCard
              title="Decentralized Exchange"
              icon="💱"
              description="Uniswap-style AMM for Runes trading"
              revenue="0.3% trading fee"
              features={[
                'Liquidity pools',
                'Constant product AMM',
                'LP tokens',
                'Yield farming'
              ]}
            />
            <UseCaseCard
              title="Governance DAO"
              icon="🏛️"
              description="Token-weighted voting and proposals"
              revenue="Treasury fees"
              features={[
                'On-chain voting',
                'Proposal system',
                'Treasury mgmt',
                'Auto-execution'
              ]}
            />
            <UseCaseCard
              title="Staking & Rewards"
              icon="💰"
              description="Lock tokens to earn yield"
              revenue="5% of rewards"
              features={[
                'Configurable APY',
                'Multiple pools',
                'Auto-compound',
                'Early unlock fees'
              ]}
            />
            <UseCaseCard
              title="Trading Bot"
              icon="🤖"
              description="Telegram/Discord bot for trading"
              revenue="Premium subs"
              features={[
                'Buy/sell commands',
                'Portfolio tracking',
                'Price alerts',
                'Auto-trading'
              ]}
            />
          </div>
        </section>

        {/* Technical Advantages */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">
            🚀 Technical Advantages
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AdvantageCard
              title="Performance"
              icon="⚡"
              points={[
                'Fast queries: <200ms',
                'Efficient pagination: O(n log n)',
                'Secondary indexes: O(log n)',
                'Stable structures'
              ]}
            />
            <AdvantageCard
              title="Security"
              icon="🔒"
              points={[
                'Rate limiting: 60 req/min',
                'Input validation',
                'Whitelist support',
                'Real-time monitoring'
              ]}
            />
            <AdvantageCard
              title="Scalability"
              icon="📈"
              points={[
                '~4T cycles (73 years)',
                'Query calls: Free',
                'Update calls: $0.0001',
                'Horizontal scaling ready'
              ]}
            />
            <AdvantageCard
              title="Interoperability"
              icon="🔗"
              points={[
                'Direct Bitcoin access',
                'Schnorr signatures',
                'Runestone protocol',
                'Threshold ECDSA'
              ]}
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Build on QURI?
            </h2>
            <p className="text-xl text-gray-200 mb-8">
              Join the Bitcoin Runes revolution with complete infrastructure
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/explorer"
                className="px-8 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-gray-100 transition"
              >
                Explore Runes
              </Link>
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-purple-800 text-white font-bold rounded-lg hover:bg-purple-900 transition"
              >
                Launch Your Rune
              </Link>
              <a
                href="https://github.com/yourusername/QURI-PROTOCOL"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 transition"
              >
                View Docs
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// Components
function CanisterCard({ title, icon, id, description, features }: {
  title: string;
  icon: string;
  id: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-purple-500 transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4 font-mono">
        {id.slice(0, 15)}...
      </p>
      <p className="text-gray-300 mb-4">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="text-sm text-gray-400 flex items-center">
            <span className="text-green-400 mr-2">✓</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UseCaseCard({ title, icon, description, revenue, features }: {
  title: string;
  icon: string;
  description: string;
  revenue: string;
  features: string[];
}) {
  return (
    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-blue-500 transition">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-300 mb-4">{description}</p>
      <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-sm text-green-400">Revenue: {revenue}</p>
      </div>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="text-sm text-gray-400 flex items-center">
            <span className="text-blue-400 mr-2">•</span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdvantageCard({ title, icon, points }: {
  title: string;
  icon: string;
  points: string[];
}) {
  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <div className="flex items-center mb-4">
        <span className="text-3xl mr-3">{icon}</span>
        <h3 className="text-2xl font-bold text-white">{title}</h3>
      </div>
      <ul className="space-y-3">
        {points.map((point, i) => (
          <li key={i} className="text-gray-300 flex items-start">
            <span className="text-purple-400 mr-2">▸</span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
