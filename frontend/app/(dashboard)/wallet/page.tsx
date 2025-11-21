/**
 * Wallet Page
 * Complete wallet interface for managing ckBTC and Runes
 */

'use client';

import { Wallet } from 'lucide-react';
import { WalletButton, BalanceCard, TransactionHistory } from '@/components/wallet';
import { useDualAuth } from '@/lib/auth';

export default function WalletPage() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          My Wallet
        </h1>
        <p className="text-museum-dark-gray">
          Manage your ckBTC, Bitcoin Runes, and transactions
        </p>
      </div>

      {/* Connection State */}
      {!isConnected ? (
        <div className="border-2 border-dashed border-museum-light-gray rounded-2xl p-12 text-center">
          <Wallet className="h-16 w-16 text-museum-dark-gray mx-auto mb-6" />
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect Your Wallet
          </h2>
          <p className="text-museum-dark-gray mb-8 max-w-md mx-auto">
            Connect with Internet Identity to view your balances and manage your Bitcoin Runes
          </p>
          <div className="max-w-sm mx-auto">
            <WalletButton variant="default" />
          </div>

          {/* Info Box */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-3">About Internet Identity</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>
                  Internet Identity is a secure, privacy-preserving authentication system
                  built on the Internet Computer Protocol.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>No passwords or personal information required</li>
                  <li>Biometric authentication (Face ID, Touch ID, etc.)</li>
                  <li>Complete control of your digital identity</li>
                  <li>Works across all ICP applications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Principal Info */}
          {principal && (
            <div className="bg-museum-white border border-museum-light-gray rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-museum-dark-gray mb-1">Your Principal ID</p>
                  <p className="font-mono text-sm text-museum-black break-all">
                    {principal.toText()}
                  </p>
                </div>
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          )}

          {/* Balances Section */}
          <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8">
            <BalanceCard variant="default" showRefresh={true} />
          </div>

          {/* Transaction History Section */}
          <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8">
            <TransactionHistory variant="default" />
          </div>

          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ckBTC Info */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
              <h3 className="font-semibold text-orange-900 mb-3">About ckBTC</h3>
              <p className="text-sm text-orange-800 mb-4">
                ckBTC is a multi-chain Bitcoin twin on the Internet Computer. It&apos;s backed 1:1
                by real Bitcoin.
              </p>
              <ul className="space-y-2 text-sm text-orange-800">
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Backed by real Bitcoin held in custody</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Fast transfers with low fees</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">•</span>
                  <span>Used for Rune creation and trading</span>
                </li>
              </ul>
            </div>

            {/* Bitcoin Runes Info */}
            <div className="bg-gradient-to-br from-gold-50 to-gold-100 border border-gold-200 rounded-xl p-6">
              <h3 className="font-semibold text-gold-900 mb-3">About Bitcoin Runes</h3>
              <p className="text-sm text-gold-800 mb-4">
                Bitcoin Runes are native Bitcoin assets created using the Runes protocol,
                managed via QURI Protocol on ICP.
              </p>
              <ul className="space-y-2 text-sm text-gold-800">
                <li className="flex items-start gap-2">
                  <span className="text-gold-600 mt-0.5">•</span>
                  <span>Real Bitcoin assets, not wrapped tokens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-600 mt-0.5">•</span>
                  <span>Trade on any Bitcoin Runes marketplace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gold-600 mt-0.5">•</span>
                  <span>Created and managed through QURI</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Security Best Practices
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p className="font-medium mb-2">Do:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Keep your recovery phrases secure</li>
                  <li>Use biometric authentication when possible</li>
                  <li>Verify transaction details before confirming</li>
                  <li>Disconnect when using public devices</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Don&apos;t:</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>Share your Principal ID with untrusted apps</li>
                  <li>Use the same device for multiple identities</li>
                  <li>Ignore security warnings</li>
                  <li>Store large amounts without backup</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
