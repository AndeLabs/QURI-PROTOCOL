import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

const features = [
  {
    title: 'Complete DEX Trading',
    description: 'AMM swaps + Limit orders with professional orderbook matching engine',
    link: '/dashboard/dex',
  },
  {
    title: 'Cross-Chain Bridge',
    description: 'Seamlessly transfer Bitcoin Runes between Bitcoin and ICP via Omnity Network',
    link: '/dashboard/bridge',
  },
  {
    title: 'Liquidity Mining',
    description: 'Earn rewards by providing liquidity with time and amount-based boost multipliers',
    link: '/dashboard/dex',
  },
  {
    title: 'Smart Order Routing',
    description: 'Best price execution with multi-hop and split routing across pools',
    link: '/dashboard/dex',
  },
  {
    title: 'Threshold Schnorr Signatures',
    description: 'Distributed key management using Internet Computer threshold cryptography',
    link: '/dashboard/create',
  },
  {
    title: 'ckBTC Integration',
    description: 'Native Chain-Key Bitcoin support (ICRC-1/ICRC-2) for seamless trading',
    link: '/dashboard/dex',
  },
  {
    title: 'Professional Orderbook',
    description: 'Limit, Market, Stop orders with GTC, IOC, FOK, GTT time-in-force options',
    link: '/dashboard/dex',
  },
  {
    title: 'Runes Staking',
    description: 'Stake your Runes to earn rewards with flexible lock periods',
    link: '/dashboard/staking',
  },
  {
    title: 'Global Explorer',
    description: 'Real-time on-chain verification and tracking of all Bitcoin Runes',
    link: '/dashboard/explorer',
  },
  {
    title: 'P2TR Taproot Addresses',
    description: 'Native SegWit v1 addresses with Taproot script capabilities',
    link: '/dashboard/create',
  },
  {
    title: 'UTXO Management',
    description: 'Intelligent coin selection with Branch & Bound algorithm',
    link: '/dashboard/create',
  },
  {
    title: 'Production Grade',
    description: '7,300+ lines of professional code with comprehensive testing',
    link: '/dashboard',
  },
];

export function Features() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Why Choose QURI Protocol?
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Built with production-grade architecture and best practices
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Link key={feature.title} href={feature.link}>
              <div className="group relative rounded-xl border border-gray-200 p-6 hover:border-gold-500 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                <div className="flex items-start">
                  <CheckCircle2 className="mr-4 h-6 w-6 flex-shrink-0 text-green-500 group-hover:text-gold-500 transition-colors" />
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-gold-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                    <div className="flex items-center text-sm font-medium text-gold-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Try it now
                      <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col items-center gap-4 p-8 rounded-2xl bg-gradient-to-br from-gold-50 to-museum-cream border border-gold-200">
            <h3 className="text-2xl font-bold text-gray-900">
              Ready to explore the full ecosystem?
            </h3>
            <p className="text-gray-600 max-w-2xl">
              Access the complete QURI Protocol dashboard with all features available at your fingertips.
            </p>
            <Link href="/dashboard">
              <button className="inline-flex items-center gap-2 bg-museum-black hover:bg-museum-charcoal text-white font-semibold px-8 py-4 rounded-lg transition-all duration-300 hover:shadow-xl">
                Launch Dashboard
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
