'use client';

import { Button } from './ui/Button';
import { TutorialButton } from './OnboardingTutorial';
import { useICP } from '@/lib/icp/ICPProvider';
import { Bitcoin, Rocket, Shield } from 'lucide-react';

export function Hero() {
  const { isConnected, connect, disconnect, principal, isLoading } = useICP();

  const handleAuthClick = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-bitcoin-50 to-white py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Tutorial Button - Top Right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
          <TutorialButton />
        </div>

        <div className="text-center">
          <div className="mb-6 flex justify-center sm:mb-8">
            <div className="relative rounded-full bg-bitcoin-100 p-3 sm:p-4">
              <Bitcoin className="h-12 w-12 text-bitcoin-500 sm:h-16 sm:w-16" />
            </div>
          </div>

          <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:mb-6 sm:text-5xl lg:text-6xl xl:text-7xl">
            QURI Protocol
          </h1>

          <p className="mb-3 text-lg text-gray-600 sm:mb-4 sm:text-xl lg:text-2xl">
            Professional Bitcoin Runes Launchpad
          </p>

          <p className="mx-auto mb-8 max-w-2xl px-4 text-base text-gray-500 sm:mb-10 sm:text-lg">
            Launch your Bitcoin Runes on Internet Computer Protocol with zero fees, threshold
            Schnorr signatures, and production-grade security.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 px-4 sm:flex-row sm:gap-4">
            <Button size="lg" onClick={handleAuthClick} isLoading={isLoading} className="w-full sm:w-auto">
              {isConnected ? 'Disconnect' : 'Connect Wallet'}
            </Button>

            {isConnected && principal && (
              <div className="w-full rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 sm:w-auto">
                <span className="hidden sm:inline">Connected: </span>
                <span className="font-mono">
                  {principal.toText().slice(0, 8)}...{principal.toText().slice(-6)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 px-4 sm:mt-16 sm:grid-cols-3 sm:gap-8">
            <div className="flex flex-col items-center rounded-lg p-4 transition-all hover:bg-bitcoin-50">
              <div className="mb-3 rounded-full bg-bitcoin-100 p-3 sm:mb-4">
                <Shield className="h-6 w-6 text-bitcoin-600 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
                Secure & Decentralized
              </h3>
              <p className="text-sm text-gray-600">
                Threshold cryptography with distributed key management
              </p>
            </div>

            <div className="flex flex-col items-center rounded-lg p-4 transition-all hover:bg-bitcoin-50">
              <div className="mb-3 rounded-full bg-bitcoin-100 p-3 sm:mb-4">
                <Bitcoin className="h-6 w-6 text-bitcoin-600 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">Zero Fees</h3>
              <p className="text-sm text-gray-600">
                No platform fees - only Bitcoin network transaction costs
              </p>
            </div>

            <div className="flex flex-col items-center rounded-lg p-4 transition-all hover:bg-bitcoin-50">
              <div className="mb-3 rounded-full bg-bitcoin-100 p-3 sm:mb-4">
                <Rocket className="h-6 w-6 text-bitcoin-600 sm:h-8 sm:w-8" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-gray-900 sm:text-lg">
                Production Ready
              </h3>
              <p className="text-sm text-gray-600">
                Enterprise-grade code with comprehensive testing
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
