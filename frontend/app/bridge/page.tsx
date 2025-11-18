/**
 * Bridge Page
 * Bridge BTC ↔ ckBTC between Bitcoin and Internet Computer
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, ArrowRight, Shield, Clock, Coins } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DirectionSelector, AmountInput, StatusTracker } from '@/components/bridge';
import { useICP } from '@/lib/icp/ICPProvider';
import { useBitcoinIntegration } from '@/hooks/useBitcoinIntegration';
import type { BridgeDirection, BridgeStep } from '@/components/bridge';
import { Breadcrumb, BreadcrumbPresets } from '@/components/Breadcrumb';

type BridgeStage = 'input' | 'review' | 'processing' | 'completed';

export default function BridgePage() {
  const { isConnected, principal } = useICP();
  const { getCkBTCBalance } = useBitcoinIntegration();

  // State
  const [direction, setDirection] = useState<BridgeDirection>('to-ckbtc');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<BridgeStage>('input');
  const [currentStep, setCurrentStep] = useState(0);

  // Mock balance - in production, fetch real balance
  const mockBalance = direction === 'to-ckbtc' ? 100000000n : 50000000n; // 1 BTC or 0.5 ckBTC

  // Bridge steps based on direction
  const bridgeSteps: BridgeStep[] =
    direction === 'to-ckbtc'
      ? [
          {
            id: 'deposit',
            label: 'Send BTC',
            description: 'Send Bitcoin to the bridge address',
            status: stage === 'input' ? 'pending' : stage === 'review' ? 'in-progress' : 'completed',
          },
          {
            id: 'confirmations',
            label: 'Wait for Confirmations',
            description: '6 Bitcoin network confirmations required',
            status: stage === 'processing' && currentStep === 0 ? 'in-progress' : stage === 'completed' ? 'completed' : 'pending',
          },
          {
            id: 'mint',
            label: 'Mint ckBTC',
            description: 'Create ckBTC tokens on ICP',
            status: stage === 'processing' && currentStep === 1 ? 'in-progress' : stage === 'completed' ? 'completed' : 'pending',
          },
          {
            id: 'transfer',
            label: 'Transfer to Wallet',
            description: 'ckBTC sent to your ICP wallet',
            status: stage === 'completed' ? 'completed' : 'pending',
          },
        ]
      : [
          {
            id: 'initiate',
            label: 'Initiate Withdrawal',
            description: 'Submit withdrawal request',
            status: stage === 'input' ? 'pending' : stage === 'review' ? 'in-progress' : 'completed',
          },
          {
            id: 'burn',
            label: 'Burn ckBTC',
            description: 'Burn ckBTC tokens on ICP',
            status: stage === 'processing' && currentStep === 0 ? 'in-progress' : stage === 'completed' ? 'completed' : 'pending',
          },
          {
            id: 'sign',
            label: 'Sign Bitcoin Transaction',
            description: 'Create and sign BTC transaction',
            status: stage === 'processing' && currentStep === 1 ? 'in-progress' : stage === 'completed' ? 'completed' : 'pending',
          },
          {
            id: 'broadcast',
            label: 'Broadcast to Bitcoin',
            description: 'Send transaction to Bitcoin network',
            status: stage === 'completed' ? 'completed' : 'pending',
          },
        ];

  const handleInitiateBridge = () => {
    setStage('review');
  };

  const handleConfirmBridge = async () => {
    setStage('processing');
    setCurrentStep(0);

    // Simulate bridge process
    setTimeout(() => setCurrentStep(1), 3000);
    setTimeout(() => setStage('completed'), 6000);
  };

  const handleReset = () => {
    setStage('input');
    setAmount('');
    setCurrentStep(0);
  };

  // Input Stage
  if (stage === 'input') {
    return (
      <div className="min-h-screen bg-museum-cream">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Breadcrumb Navigation */}
            <Breadcrumb items={BreadcrumbPresets.bridge} showDashboardHome={true} />

            {/* Header */}
            <div>
              <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
                Bitcoin Bridge
              </h1>
              <p className="text-museum-dark-gray">
                Bridge Bitcoin (BTC) and Chain Key Bitcoin (ckBTC) seamlessly
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 space-y-6">
              {/* Connection Check */}
              {!isConnected ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-900 mb-4">
                    Please connect your wallet to use the bridge
                  </p>
                  <Button>Connect Wallet</Button>
                </div>
              ) : (
                <>
                  {/* Direction Selector */}
                  <DirectionSelector
                    direction={direction}
                    onChange={setDirection}
                  />

                  {/* Amount Input */}
                  <AmountInput
                    amount={amount}
                    onChange={setAmount}
                    direction={direction}
                    balance={mockBalance}
                  />

                  {/* Action Button */}
                  <Button
                    onClick={handleInitiateBridge}
                    disabled={!amount || parseFloat(amount) <= 0}
                    size="lg"
                    className="w-full"
                  >
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Continue to Review
                  </Button>
                </>
              )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Secure</h3>
                </div>
                <p className="text-sm text-blue-800">
                  Chain Key cryptography ensures secure bridging without centralized custody
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Coins className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold text-green-900">1:1 Backed</h3>
                </div>
                <p className="text-sm text-green-800">
                  Every ckBTC is backed 1:1 by real Bitcoin held in the protocol
                </p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-6 w-6 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">Fast</h3>
                </div>
                <p className="text-sm text-purple-800">
                  Process completed in ~30-60 minutes depending on direction
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Review Stage
  if (stage === 'review') {
    return (
      <div className="min-h-screen bg-museum-cream">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Breadcrumb Navigation */}
            <Breadcrumb items={BreadcrumbPresets.bridge} showDashboardHome={true} />

            <div>
              <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
                Review Bridge Transaction
              </h1>
              <p className="text-museum-dark-gray">
                Please review the details before confirming
              </p>
            </div>

            <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 space-y-6">
              {/* Transaction Summary */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-museum-light-gray">
                  <span className="text-museum-dark-gray">You send</span>
                  <span className="font-mono font-bold text-xl text-museum-black">
                    {amount} {direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-museum-dark-gray">Estimated fee</span>
                  <span className="font-mono text-museum-black">
                    {direction === 'to-ckbtc' ? '~0.0001 BTC' : '~0.0002 ckBTC'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-museum-dark-gray">Processing time</span>
                  <span className="font-mono text-museum-black">
                    {direction === 'to-ckbtc' ? '~30 minutes' : '~60 minutes'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-museum-light-gray">
                  <span className="font-semibold text-museum-black">You receive</span>
                  <span className="font-mono font-bold text-xl text-gold-600">
                    {direction === 'to-ckbtc'
                      ? (parseFloat(amount) - 0.0001).toFixed(8)
                      : (parseFloat(amount) - 0.0002).toFixed(8)}{' '}
                    {direction === 'to-ckbtc' ? 'ckBTC' : 'BTC'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setStage('input')}
                  variant="outline"
                  size="lg"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleConfirmBridge} size="lg" className="flex-1">
                  Confirm Bridge
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing or Completed Stage
  return (
    <div className="min-h-screen bg-museum-cream">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Breadcrumb Navigation */}
          <Breadcrumb items={BreadcrumbPresets.bridge} showDashboardHome={true} />

          <div>
            <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
              {stage === 'completed' ? 'Bridge Completed!' : 'Processing Bridge'}
            </h1>
            <p className="text-museum-dark-gray">
              {stage === 'completed'
                ? 'Your transaction has been completed successfully'
                : 'Please wait while we process your bridge transaction'}
            </p>
          </div>

          {/* Status Tracker */}
          <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8">
            <StatusTracker steps={bridgeSteps} currentStep={currentStep} />
          </div>

          {/* Completed Actions */}
          {stage === 'completed' && (
            <div className="flex gap-3">
              <Button onClick={handleReset} variant="outline" size="lg" className="flex-1">
                Bridge Again
              </Button>
              <Link href="/wallet" className="flex-1">
                <Button size="lg" className="w-full">
                  View in Wallet
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
