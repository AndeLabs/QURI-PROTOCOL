'use client';

import { RuneStaking } from '@/components/RuneStaking';
import { Lock } from 'lucide-react';

export default function StakingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Stake Runes
        </h1>
        <p className="text-museum-dark-gray">
          Stake your Bitcoin Runes to earn rewards with flexible lock periods
        </p>
      </div>

      {/* Staking Interface */}
      {/* TODO: Load rune data from user's wallet or route params */}
      {/* <div className="max-w-4xl mx-auto">
        <RuneStaking
          runeId={selectedRuneId}
          runeName={selectedRuneName}
          runeSymbol={selectedRuneSymbol}
        />
      </div> */}

      {/* Stats Cards - Removed hardcoded data */}
      {/* TODO: Load staking statistics from Registry canister */}

      {/* How Staking Works */}
      <div className="rounded-xl border border-museum-light-gray bg-museum-white p-8">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
          How Staking Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="rounded-lg bg-museum-cream p-3 w-12 h-12 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-museum-charcoal" />
            </div>
            <h3 className="font-semibold text-lg text-museum-black mb-2">
              1. Lock Your Runes
            </h3>
            <p className="text-sm text-museum-dark-gray">
              Choose your lock period (7, 30, 90, or 180 days) and stake your Runes.
            </p>
          </div>
          <div>
            <div className="rounded-lg bg-museum-cream p-3 w-12 h-12 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-museum-charcoal" />
            </div>
            <h3 className="font-semibold text-lg text-museum-black mb-2">
              2. Earn Rewards
            </h3>
            <p className="text-sm text-museum-dark-gray">
              Receive rewards in QURI tokens. Longer lock periods earn higher APY.
            </p>
          </div>
          <div>
            <div className="rounded-lg bg-museum-cream p-3 w-12 h-12 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-museum-charcoal" />
            </div>
            <h3 className="font-semibold text-lg text-museum-black mb-2">
              3. Claim & Unstake
            </h3>
            <p className="text-sm text-museum-dark-gray">
              Claim rewards anytime. Unstake after lock period ends to get your Runes back.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
