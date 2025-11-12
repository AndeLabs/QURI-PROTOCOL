'use client';

import { ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import for Bridge component
const BridgeInterface = dynamic(
  () => import('@/components/dex/bridge/BridgeInterface').then((mod) => ({ default: mod.BridgeInterface })),
  { ssr: false }
);

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
        <BridgeInterface />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Total Bridged</p>
          <p className="text-2xl font-bold text-museum-black">$850K</p>
          <p className="text-xs text-green-600 mt-1">+15.2% this week</p>
        </div>
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Deposits (24h)</p>
          <p className="text-2xl font-bold text-museum-black">45</p>
          <p className="text-xs text-green-600 mt-1">+8 from yesterday</p>
        </div>
        <div className="rounded-lg border border-museum-light-gray bg-museum-white p-4">
          <p className="text-sm text-museum-dark-gray mb-1">Withdrawals (24h)</p>
          <p className="text-2xl font-bold text-museum-black">38</p>
          <p className="text-xs text-green-600 mt-1">+5 from yesterday</p>
        </div>
      </div>

      {/* How it Works */}
      <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
          How Bridge Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg text-museum-black mb-2">
                  Bitcoin → ICP (Deposit)
                </h3>
                <ol className="space-y-2 text-sm text-museum-dark-gray">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Lock Runes on Bitcoin</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Submit Bitcoin transaction ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Wait for 6 confirmations (~60 min)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Receive wRunes on ICP</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg text-museum-black mb-2">
                  ICP → Bitcoin (Withdrawal)
                </h3>
                <ol className="space-y-2 text-sm text-museum-dark-gray">
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Burn wRunes on ICP</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Provide Bitcoin address</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Relayer processes withdrawal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-500" />
                    <span>Receive Runes on Bitcoin</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="mt-8 pt-8 border-t border-museum-light-gray">
          <h3 className="font-semibold text-lg text-museum-black mb-4">
            Security Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-museum-black text-sm">6 Confirmations</p>
                <p className="text-xs text-museum-dark-gray">Bitcoin network security</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-museum-black text-sm">Multi-Signature</p>
                <p className="text-xs text-museum-dark-gray">Admin + relayer verification</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-sm">✓</span>
              </div>
              <div>
                <p className="font-medium text-museum-black text-sm">Daily Limits</p>
                <p className="text-xs text-museum-dark-gray">Configurable per-rune protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
