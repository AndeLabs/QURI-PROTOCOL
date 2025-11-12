'use client';

import { Bridge } from 'lucide-react';

// Import bridge component
// import { BridgeInterface } from '@/src/components/dex/bridge/BridgeInterface';

export default function BridgePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Cross-Chain Bridge
        </h1>
        <p className="text-museum-dark-gray">
          Transfer Bitcoin Runes between Bitcoin and ICP via Omnity Network
        </p>
      </div>

      {/* Bridge Interface */}
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
          {/* <BridgeInterface /> */}
          <div className="text-center text-museum-dark-gray py-12">
            <Bridge className="h-16 w-16 mx-auto mb-4 text-museum-charcoal" />
            <p className="font-medium mb-2">Bridge Interface</p>
            <p className="text-sm">
              Connect wallet to bridge your Runes
            </p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Total Bridged</p>
          <p className="text-2xl font-bold text-museum-black">$850K</p>
        </div>
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Deposits (24h)</p>
          <p className="text-2xl font-bold text-museum-black">45</p>
        </div>
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Withdrawals (24h)</p>
          <p className="text-2xl font-bold text-museum-black">38</p>
        </div>
      </div>

      {/* How it Works */}
      <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
          How Bridge Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold text-lg text-museum-black mb-3">
              Bitcoin → ICP (Deposit)
            </h3>
            <ol className="space-y-2 text-sm text-museum-dark-gray">
              <li>1. Lock Runes on Bitcoin</li>
              <li>2. Submit Bitcoin transaction ID</li>
              <li>3. Wait for 6 confirmations (~60 min)</li>
              <li>4. Receive wRunes on ICP</li>
            </ol>
          </div>
          <div>
            <h3 className="font-semibold text-lg text-museum-black mb-3">
              ICP → Bitcoin (Withdrawal)
            </h3>
            <ol className="space-y-2 text-sm text-museum-dark-gray">
              <li>1. Burn wRunes on ICP</li>
              <li>2. Provide Bitcoin address</li>
              <li>3. Relayer processes withdrawal</li>
              <li>4. Receive Runes on Bitcoin</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
