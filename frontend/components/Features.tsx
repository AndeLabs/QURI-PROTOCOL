import { CheckCircle2 } from 'lucide-react';

const features = [
  {
    title: 'Complete DEX Trading',
    description: 'AMM swaps + Limit orders with professional orderbook matching engine',
  },
  {
    title: 'Cross-Chain Bridge',
    description: 'Seamlessly transfer Bitcoin Runes between Bitcoin and ICP via Omnity Network',
  },
  {
    title: 'Liquidity Mining',
    description: 'Earn rewards by providing liquidity with time and amount-based boost multipliers',
  },
  {
    title: 'Smart Order Routing',
    description: 'Best price execution with multi-hop and split routing across pools',
  },
  {
    title: 'Threshold Schnorr Signatures',
    description: 'Distributed key management using Internet Computer threshold cryptography',
  },
  {
    title: 'ckBTC Integration',
    description: 'Native Chain-Key Bitcoin support (ICRC-1/ICRC-2) for seamless trading',
  },
  {
    title: 'Professional Orderbook',
    description: 'Limit, Market, Stop orders with GTC, IOC, FOK, GTT time-in-force options',
  },
  {
    title: 'Runes Staking',
    description: 'Stake your Runes to earn rewards with flexible lock periods',
  },
  {
    title: 'Global Explorer',
    description: 'Real-time on-chain verification and tracking of all Bitcoin Runes',
  },
  {
    title: 'P2TR Taproot Addresses',
    description: 'Native SegWit v1 addresses with Taproot script capabilities',
  },
  {
    title: 'UTXO Management',
    description: 'Intelligent coin selection with Branch & Bound algorithm',
  },
  {
    title: 'Production Grade',
    description: '7,300+ lines of professional code with comprehensive testing',
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
            <div key={feature.title} className="relative rounded-xl border border-gray-200 p-6">
              <div className="flex items-start">
                <CheckCircle2 className="mr-4 h-6 w-6 flex-shrink-0 text-green-500" />
                <div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
