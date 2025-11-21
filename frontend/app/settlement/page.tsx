'use client';

/**
 * Settlement Page
 * Complete settlement flow for settling virtual runes to Bitcoin
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Info,
  Zap,
  Shield,
  Clock,
  CheckCircle,
} from 'lucide-react';
import {
  SettlementModal,
  SettleButton,
  RuneStateBadge,
  RuneStateTimeline,
  FeeComparisonTable,
  SettlementHistory,
  ActiveSettlementsBadge,
} from '@/components/settlement';
import { useSettlement, usePendingSettlements } from '@/hooks/useSettlement';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { useDualAuth } from '@/lib/auth';
import type { SettlementRequest, SettlementResult } from '@/types/settlement';

// Example rune data for demonstration
const DEMO_RUNE = {
  key: { block: 840000n, tx: 1 },
  name: 'QURI',
  symbol: 'Q',
  balance: 100000000n, // 1.0 with 8 decimals
  decimals: 8,
  state: 'virtual' as const,
};

export default function SettlementPage() {
  const { isConnected, connectICP, isLoading: isConnecting } = useDualAuth();
  const { settle, feeEstimates, isSettling, btcPrice } = useSettlement();
  const { count: pendingCount } = usePendingSettlements();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSettle = async (request: SettlementRequest): Promise<SettlementResult> => {
    return settle(request);
  };

  return (
    <div className="min-h-screen bg-museum-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold-50 to-museum-cream border-b border-museum-light-gray">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-museum-black mb-2">
            Settlement
          </h1>
          <p className="text-museum-dark-gray">
            Settle your virtual runes to Bitcoin mainnet as native runes
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* How it Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-museum-white border border-museum-light-gray rounded-2xl p-6"
            >
              <h2 className="text-xl font-semibold text-museum-black mb-4">
                How Settlement Works
              </h2>

              {/* State Timeline */}
              <div className="mb-6">
                <RuneStateTimeline currentState="virtual" />
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {[
                  {
                    icon: <Zap className="h-5 w-5" />,
                    title: 'Virtual State',
                    description: 'Your rune is active on QURI and can be traded instantly with zero fees.',
                  },
                  {
                    icon: <Clock className="h-5 w-5" />,
                    title: 'Pending Settlement',
                    description: 'When you settle, your rune enters a pending state while the Bitcoin transaction is confirmed.',
                  },
                  {
                    icon: <Shield className="h-5 w-5" />,
                    title: 'Native on Bitcoin',
                    description: 'After 6 confirmations, your rune becomes a native Bitcoin asset that you control.',
                  },
                ].map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="p-2 bg-gold-100 rounded-lg text-gold-600">
                      {step.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-museum-black">{step.title}</h3>
                      <p className="text-sm text-museum-dark-gray">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Fee Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-museum-white border border-museum-light-gray rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-museum-black">
                  Settlement Fees
                </h2>
                {btcPrice && (
                  <span className="text-sm text-museum-dark-gray">
                    BTC: ${btcPrice.toLocaleString()}
                  </span>
                )}
              </div>

              <FeeComparisonTable estimates={feeEstimates} />

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    Batched settlements are the most cost-effective option, sharing fees across multiple users.
                    Instant settlements get priority in the next block.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Example Rune Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-museum-white border border-museum-light-gray rounded-2xl p-6"
            >
              <h2 className="text-xl font-semibold text-museum-black mb-4">
                Your Virtual Runes
              </h2>

              {isConnected ? (
                <div className="space-y-4">
                  {/* Demo Rune */}
                  <div className="p-4 bg-museum-cream/50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-museum-black">
                          {DEMO_RUNE.name}
                        </h3>
                        <p className="text-sm text-museum-dark-gray">
                          Balance: {(Number(DEMO_RUNE.balance) / 10 ** DEMO_RUNE.decimals).toFixed(DEMO_RUNE.decimals)} {DEMO_RUNE.symbol}
                        </p>
                      </div>
                      <RuneStateBadge state={DEMO_RUNE.state} />
                    </div>

                    <SettleButton
                      onClick={() => setIsModalOpen(true)}
                      disabled={isSettling}
                    />
                  </div>

                  <p className="text-sm text-museum-dark-gray text-center">
                    This is a demo rune for testing the settlement flow.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-museum-dark-gray mb-4">
                    Connect your wallet to see your virtual runes
                  </p>
                  <ButtonPremium
                    variant="primary"
                    onClick={connectICP}
                    loading={isConnecting}
                  >
                    Connect Wallet
                  </ButtonPremium>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pending Settlements */}
            {pendingCount > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-orange-50 border border-orange-200 rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-orange-800">
                    Active Settlements
                  </h3>
                  <ActiveSettlementsBadge count={pendingCount} />
                </div>
                <p className="text-sm text-orange-700">
                  You have {pendingCount} settlement(s) in progress.
                </p>
              </motion.div>
            )}

            {/* Settlement History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-museum-white border border-museum-light-gray rounded-2xl p-4"
            >
              <h3 className="font-semibold text-museum-black mb-4">
                Recent Settlements
              </h3>
              {isConnected ? (
                <SettlementHistory limit={5} />
              ) : (
                <p className="text-sm text-museum-dark-gray text-center py-4">
                  Connect wallet to view history
                </p>
              )}
            </motion.div>

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-gold-50 to-museum-cream border border-gold-200 rounded-2xl p-4"
            >
              <h3 className="font-semibold text-museum-black mb-2">
                Why Settle?
              </h3>
              <ul className="space-y-2 text-sm text-museum-dark-gray">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Full control over your Bitcoin
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Native runes in your wallet
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Trade on any Bitcoin marketplace
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Permanent on-chain record
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Settlement Modal */}
      <SettlementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        runeKey={DEMO_RUNE.key}
        runeName={DEMO_RUNE.name}
        runeSymbol={DEMO_RUNE.symbol}
        availableBalance={DEMO_RUNE.balance}
        decimals={DEMO_RUNE.decimals}
        onSettle={handleSettle}
        feeEstimates={feeEstimates}
      />
    </div>
  );
}
