/**
 * Bridge Page
 * Bridge BTC ↔ ckBTC and ICP ↔ Cycles
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, ArrowRight, Shield, Clock, Coins, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DirectionSelector, AmountInput, StatusTracker } from '@/components/bridge';
import { useDualAuth } from '@/lib/auth';
import { useBitcoinIntegration } from '@/hooks/useBitcoinIntegration';
import { useCyclesConversion } from '@/hooks/useCyclesConversion';
import type { BridgeDirection, BridgeStep } from '@/components/bridge';
import { Breadcrumb, BreadcrumbPresets } from '@/components/Breadcrumb';
import { WalletButton } from '@/components/wallet';

type BridgeStage = 'input' | 'review' | 'processing' | 'completed';
type BridgeTab = 'bitcoin' | 'cycles';

export default function BridgePage() {
  const { isConnected, getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const { getCkBTCBalance } = useBitcoinIntegration();
  const {
    loading: cyclesLoading,
    error: cyclesError,
    getConversionRate,
    getCyclesBalance,
    getIcpBalance,
    getXtcBalance,
    convertIcpToCycles,
    wrapCyclesToXtc,
    estimateCyclesFromIcp,
    formatCycles,
    formatIcp,
  } = useCyclesConversion();

  // State
  const [activeTab, setActiveTab] = useState<BridgeTab>('cycles'); // Default to cycles since user needs it
  const [direction, setDirection] = useState<BridgeDirection>('to-ckbtc');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<BridgeStage>('input');
  const [currentStep, setCurrentStep] = useState(0);

  // Cycles conversion state
  const [cyclesDirection, setCyclesDirection] = useState<'icp-to-cycles' | 'cycles-to-xtc'>('icp-to-cycles');
  const [cyclesAmount, setCyclesAmount] = useState('');
  const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [cyclesBalance, setCyclesBalance] = useState<bigint>(0n);
  const [xtcBalance, setXtcBalance] = useState<bigint>(0n);
  const [estimatedOutput, setEstimatedOutput] = useState<bigint>(0n);
  const [conversionRate, setConversionRate] = useState<{ icpPerTCycles: number; cyclesPerIcp: bigint } | null>(null);
  const [cyclesStage, setCyclesStage] = useState<'input' | 'processing' | 'completed'>('input');

  // Load balances and rate
  useEffect(() => {
    if (isConnected && principal) {
      loadCyclesData();
    }
  }, [isConnected, principal]);

  const loadCyclesData = async () => {
    const [icp, cycles, xtc, rate] = await Promise.all([
      getIcpBalance(),
      getCyclesBalance(),
      getXtcBalance(),
      getConversionRate(),
    ]);
    setIcpBalance(icp);
    setCyclesBalance(cycles);
    setXtcBalance(xtc);
    if (rate) setConversionRate(rate);
  };

  // Estimate output when amount changes
  useEffect(() => {
    const estimate = async () => {
      if (!cyclesAmount || parseFloat(cyclesAmount) <= 0) {
        setEstimatedOutput(0n);
        return;
      }

      if (cyclesDirection === 'icp-to-cycles') {
        const icpE8s = BigInt(Math.floor(parseFloat(cyclesAmount) * 100_000_000));
        const cycles = await estimateCyclesFromIcp(icpE8s);
        setEstimatedOutput(cycles);
      } else {
        // Cycles to XTC is 1:1 (1 TC = 1 XTC)
        const cyclesInput = BigInt(Math.floor(parseFloat(cyclesAmount) * 1_000_000_000_000));
        setEstimatedOutput(cyclesInput);
      }
    };

    const timer = setTimeout(estimate, 300);
    return () => clearTimeout(timer);
  }, [cyclesAmount, cyclesDirection, estimateCyclesFromIcp]);

  // Handle cycles conversion
  const handleCyclesConversion = async () => {
    setCyclesStage('processing');

    let result;
    if (cyclesDirection === 'icp-to-cycles') {
      const icpE8s = BigInt(Math.floor(parseFloat(cyclesAmount) * 100_000_000));
      result = await convertIcpToCycles(icpE8s);
    } else {
      // Cycles to XTC - convert TC to cycles (multiply by 1e12)
      const cyclesInput = BigInt(Math.floor(parseFloat(cyclesAmount) * 1_000_000_000_000));
      result = await wrapCyclesToXtc(cyclesInput);
    }

    if (result?.success) {
      setCyclesStage('completed');
      await loadCyclesData();
      setTimeout(() => {
        setCyclesStage('input');
        setCyclesAmount('');
      }, 5000);
    } else {
      setCyclesStage('input');
    }
  };

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
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Bridge & Convert
          </h1>
          <p className="text-museum-dark-gray">
            Bridge Bitcoin or convert ICP to Cycles
          </p>
        </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-museum-light-gray rounded-xl">
              <button
                onClick={() => setActiveTab('cycles')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'cycles'
                    ? 'bg-museum-white text-museum-black shadow-sm'
                    : 'text-museum-dark-gray hover:text-museum-black'
                }`}
              >
                <Zap className="h-4 w-4" />
                ICP ↔ Cycles
              </button>
              <button
                onClick={() => setActiveTab('bitcoin')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'bitcoin'
                    ? 'bg-museum-white text-museum-black shadow-sm'
                    : 'text-museum-dark-gray hover:text-museum-black'
                }`}
              >
                <Coins className="h-4 w-4" />
                BTC ↔ ckBTC
              </button>
            </div>

            {/* Cycles Conversion Tab */}
            {activeTab === 'cycles' && (
              <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 space-y-6">
                {!isConnected ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-900 mb-4">
                      Connect your wallet to convert between ICP, Cycles, and XTC
                    </p>
                    <WalletButton />
                  </div>
                ) : cyclesStage === 'completed' ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-museum-black mb-2">
                      Conversion Complete!
                    </h3>
                    <p className="text-museum-dark-gray">
                      {cyclesDirection === 'icp-to-cycles'
                        ? 'Your cycles have been minted successfully'
                        : 'Your cycles have been wrapped to XTC tokens'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Balance Display */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">∞</span>
                          </div>
                          <span className="text-sm text-purple-900 font-medium">ICP</span>
                        </div>
                        <p className="font-mono font-bold text-lg text-purple-900">
                          {formatIcp(icpBalance)}
                        </p>
                      </div>
                      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-cyan-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">⚡</span>
                          </div>
                          <span className="text-sm text-cyan-900 font-medium">Cycles</span>
                        </div>
                        <p className="font-mono font-bold text-lg text-cyan-900">
                          {formatCycles(cyclesBalance)} TC
                        </p>
                      </div>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">X</span>
                          </div>
                          <span className="text-sm text-amber-900 font-medium">XTC</span>
                        </div>
                        <p className="font-mono font-bold text-lg text-amber-900">
                          {formatCycles(xtcBalance)}
                        </p>
                      </div>
                    </div>

                    {/* Refresh Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={loadCyclesData}
                        className="flex items-center gap-2 text-sm text-museum-dark-gray hover:text-museum-black"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </button>
                    </div>

                    {/* Direction Selector */}
                    <div className="flex gap-2 p-1 bg-museum-light-gray rounded-xl">
                      <button
                        onClick={() => {
                          setCyclesDirection('icp-to-cycles');
                          setCyclesAmount('');
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                          cyclesDirection === 'icp-to-cycles'
                            ? 'bg-museum-white text-museum-black shadow-sm'
                            : 'text-museum-dark-gray hover:text-museum-black'
                        }`}
                      >
                        ICP → Cycles
                      </button>
                      <button
                        onClick={() => {
                          setCyclesDirection('cycles-to-xtc');
                          setCyclesAmount('');
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                          cyclesDirection === 'cycles-to-xtc'
                            ? 'bg-museum-white text-museum-black shadow-sm'
                            : 'text-museum-dark-gray hover:text-museum-black'
                        }`}
                      >
                        Cycles → XTC
                      </button>
                    </div>

                    {/* Conversion Rate */}
                    {conversionRate && cyclesDirection === 'icp-to-cycles' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Current Rate:</span>{' '}
                          1 ICP = {(Number(conversionRate.cyclesPerIcp) / 1_000_000_000_000).toFixed(3)} TC
                        </p>
                      </div>
                    )}

                    {cyclesDirection === 'cycles-to-xtc' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-sm text-amber-900">
                          <span className="font-semibold">Rate:</span>{' '}
                          1 TC (Trillion Cycles) = 1 XTC
                        </p>
                      </div>
                    )}

                    {/* Conversion Direction Visual */}
                    <div className="flex items-center justify-center gap-4 py-4">
                      {cyclesDirection === 'icp-to-cycles' ? (
                        <>
                          <div className="text-center">
                            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-white font-bold">∞</span>
                            </div>
                            <p className="text-sm font-medium">ICP</p>
                          </div>
                          <ArrowRight className="h-6 w-6 text-gold-600" />
                          <div className="text-center">
                            <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-white font-bold">⚡</span>
                            </div>
                            <p className="text-sm font-medium">Cycles</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-white font-bold">⚡</span>
                            </div>
                            <p className="text-sm font-medium">Cycles</p>
                          </div>
                          <ArrowRight className="h-6 w-6 text-gold-600" />
                          <div className="text-center">
                            <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-2">
                              <span className="text-white font-bold">X</span>
                            </div>
                            <p className="text-sm font-medium">XTC</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Info */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-900">
                        {cyclesDirection === 'icp-to-cycles' ? (
                          <>
                            <span className="font-semibold">ICP → Cycles:</span>{' '}
                            Convert ICP to cycles for canister operations. Cycles are used to pay for computation on ICP.
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">Cycles → XTC:</span>{' '}
                            Wrap your cycles into XTC tokens. XTC is a tradeable token that can be exchanged on DEXs like ICPSwap or Sonic.
                          </>
                        )}
                      </p>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-museum-black">
                        {cyclesDirection === 'icp-to-cycles' ? 'ICP Amount' : 'Cycles Amount (TC)'}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={cyclesAmount}
                          onChange={(e) => setCyclesAmount(e.target.value)}
                          placeholder="0.0"
                          className="w-full px-4 py-3 pr-20 border border-museum-light-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 font-mono text-museum-black placeholder:text-museum-dark-gray [color-scheme:light]"
                        />
                        <button
                          onClick={() => {
                            if (cyclesDirection === 'icp-to-cycles') {
                              const max = Number(icpBalance) / 100_000_000 - 0.0001; // Leave for fee
                              setCyclesAmount(max > 0 ? max.toString() : '0');
                            } else {
                              const max = Number(cyclesBalance) / 1_000_000_000_000; // TC
                              setCyclesAmount(max > 0 ? max.toString() : '0');
                            }
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gold-600 hover:text-gold-700"
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Estimated Output */}
                    {cyclesAmount && parseFloat(cyclesAmount) > 0 && (
                      <div className="bg-museum-cream rounded-xl p-4">
                        <p className="text-sm text-museum-dark-gray mb-1">You will receive (estimated)</p>
                        <p className="font-mono font-bold text-2xl text-museum-black">
                          {cyclesDirection === 'icp-to-cycles'
                            ? `${formatCycles(estimatedOutput)} TC`
                            : `${formatCycles(estimatedOutput)} XTC`}
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {cyclesError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-900">{cyclesError}</p>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={handleCyclesConversion}
                      disabled={
                        cyclesLoading ||
                        !cyclesAmount ||
                        parseFloat(cyclesAmount) <= 0
                      }
                      size="lg"
                      className="w-full"
                    >
                      {cyclesLoading ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Converting...
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5 mr-2" />
                          {cyclesDirection === 'icp-to-cycles'
                            ? 'Convert to Cycles'
                            : 'Wrap to XTC'}
                        </>
                      )}
                    </Button>

                    {/* Note about trading XTC */}
                    {cyclesDirection === 'cycles-to-xtc' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-900">
                          <span className="font-semibold">Tip:</span>{' '}
                          Once you have XTC, you can trade it for ICP on decentralized exchanges like{' '}
                          <a href="https://app.icpswap.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                            ICPSwap
                          </a>{' '}
                          or{' '}
                          <a href="https://sonic.ooo" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                            Sonic
                          </a>.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Bitcoin Bridge Tab */}
            {activeTab === 'bitcoin' && (
              <div className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 space-y-6">
                {/* Connection Check */}
                {!isConnected ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <p className="text-yellow-900 mb-4">
                      Please connect your wallet to use the bridge
                    </p>
                    <WalletButton />
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
            )}

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeTab === 'cycles' ? (
                <>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Zap className="h-6 w-6 text-purple-600" />
                      <h3 className="font-semibold text-purple-900">Direct</h3>
                    </div>
                    <p className="text-sm text-purple-800">
                      Convert ICP to Cycles directly using the Cycles Minting Canister
                    </p>
                  </div>

                  <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Clock className="h-6 w-6 text-cyan-600" />
                      <h3 className="font-semibold text-cyan-900">Instant</h3>
                    </div>
                    <p className="text-sm text-cyan-800">
                      Conversion happens in seconds, not minutes
                    </p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="h-6 w-6 text-green-600" />
                      <h3 className="font-semibold text-green-900">Official</h3>
                    </div>
                    <p className="text-sm text-green-800">
                      Uses the official ICP protocol conversion mechanism
                    </p>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
      </div>
    );
  }

  // Review Stage
  if (stage === 'review') {
    return (
      <div className="space-y-8 max-w-3xl">
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
    );
  }

  // Processing or Completed Stage
  return (
    <div className="space-y-8 max-w-3xl">
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
  );
}
