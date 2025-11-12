'use client';

import { Button } from './ui/Button';
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
    <div className="relative overflow-hidden bg-gradient-to-b from-bitcoin-50 to-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="relative rounded-full bg-bitcoin-100 p-4">
              <Bitcoin className="h-16 w-16 text-bitcoin-500" />
            </div>
          </div>

          <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
            QURI Protocol
          </h1>

          <p className="mb-4 text-xl text-gray-600 sm:text-2xl">
            Professional Bitcoin Runes Launchpad
          </p>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-500">
            Launch your Bitcoin Runes on Internet Computer Protocol with zero fees, threshold
            Schnorr signatures, and production-grade security.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={handleAuthClick} isLoading={isLoading}>
              {isConnected ? 'Disconnect' : 'Connect Wallet'}
            </Button>

            {isConnected && principal && (
              <div className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">
                Connected: {principal.toText().slice(0, 8)}...{principal.toText().slice(-6)}
              </div>
            )}
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-full bg-bitcoin-100 p-3">
                <Shield className="h-8 w-8 text-bitcoin-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Secure & Decentralized</h3>
              <p className="text-sm text-gray-600">
                Threshold cryptography with distributed key management
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-full bg-bitcoin-100 p-3">
                <Bitcoin className="h-8 w-8 text-bitcoin-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Zero Fees</h3>
              <p className="text-sm text-gray-600">
                No platform fees - only Bitcoin network transaction costs
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-full bg-bitcoin-100 p-3">
                <Rocket className="h-8 w-8 text-bitcoin-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Production Ready</h3>
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
