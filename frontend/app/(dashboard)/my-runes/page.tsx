/**
 * My Runes Dashboard
 * Shows user's Virtual Runes and Settlement status
 * ONLY uses real data from canisters
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Bitcoin,
  Clock,
  CheckCircle,
  Loader2,
  TrendingUp,
  ExternalLink,
} from 'lucide-react';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { useDualAuth } from '@/lib/auth';
import { WalletButton } from '@/components/wallet';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { TransactionStatusTracker } from '@/components/settlement/TransactionStatusTracker';
import type { VirtualRuneView, EtchingProcessView } from '@/types/canisters';
import { cn } from '@/lib/utils';

type TabValue = 'virtual' | 'settling' | 'settled';

export default function MyRunesPage() {
  const { isConnected } = useDualAuth();
  const { getMyVirtualRunes, getMyEtchings, etchToBitcoin, loading } = useRuneEngine();

  const [activeTab, setActiveTab] = useState<TabValue>('virtual');
  const [virtualRunes, setVirtualRunes] = useState<VirtualRuneView[]>([]);
  const [etchings, setEtchings] = useState<EtchingProcessView[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);

  // Fetch REAL data from canisters
  useEffect(() => {
    if (!isConnected) return;

    const fetchData = async () => {
      const [runes, processes] = await Promise.all([
        getMyVirtualRunes(),
        getMyEtchings(),
      ]);

      setVirtualRunes(runes);
      setEtchings(processes);
    };

    fetchData();

    // Refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [isConnected, getMyVirtualRunes, getMyEtchings]);

  // Filter runes by status (status is a string, not an object)
  const pureVirtualRunes = virtualRunes.filter(r => {
    if (!r.status) return false;
    return r.status === 'Virtual';
  });

  const settlingRunes = virtualRunes.filter(r => {
    if (!r.status) return false;
    return r.status === 'Etching';
  });

  const settledRunes = virtualRunes.filter(r => {
    if (!r.status) return false;
    return r.status === 'Etched';
  });

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-8 text-center">
          <div className="inline-flex p-4 bg-gold-100 rounded-full mb-6">
            <Sparkles className="h-12 w-12 text-gold-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect to View Your Runes
          </h1>
          <p className="text-museum-dark-gray mb-6">
            Connect with Internet Identity to see your Virtual Runes and settlements
          </p>
          <WalletButton variant="default" />
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 text-gold-600 animate-spin" />
        </div>
      </div>
    );
  }

  // Show transaction status if selected
  if (selectedProcess) {
    const etching = etchings.find(e => e.id === selectedProcess);
    return (
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setSelectedProcess(null)}
          className="text-sm text-museum-dark-gray hover:text-museum-black mb-4"
        >
          ← Back to My Runes
        </button>
        <TransactionStatusTracker
          processId={selectedProcess}
          runeName={etching?.rune_name}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-museum-black mb-2">
          My Runes
        </h1>
        <p className="text-museum-dark-gray">
          Manage your Virtual Runes and track Bitcoin settlements
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-2 border-museum-light-gray rounded-2xl p-2 flex gap-2">
        <TabButton
          active={activeTab === 'virtual'}
          onClick={() => setActiveTab('virtual')}
          icon={<Sparkles className="h-4 w-4" />}
          count={pureVirtualRunes.length}
        >
          Virtual Runes
        </TabButton>

        <TabButton
          active={activeTab === 'settling'}
          onClick={() => setActiveTab('settling')}
          icon={<Clock className="h-4 w-4" />}
          count={settlingRunes.length}
          variant="warning"
        >
          Settling
        </TabButton>

        <TabButton
          active={activeTab === 'settled'}
          onClick={() => setActiveTab('settled')}
          icon={<Bitcoin className="h-4 w-4" />}
          count={settledRunes.length}
          variant="success"
        >
          On Bitcoin
        </TabButton>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'virtual' && (
          <TabContent key="virtual">
            {pureVirtualRunes.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No Virtual Runes Yet"
                description="Create your first Virtual Rune to get started"
                actionLabel="Create Rune"
                actionHref="/create"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pureVirtualRunes.map((rune) => (
                  <VirtualRuneCard
                    key={rune.id}
                    rune={rune}
                    onSettle={async (runeId) => {
                      try {
                        await etchToBitcoin(runeId);
                        // Refresh data after settlement
                        const [runes, processes] = await Promise.all([
                          getMyVirtualRunes(),
                          getMyEtchings(),
                        ]);
                        setVirtualRunes(runes);
                        setEtchings(processes);
                      } catch (error) {
                        console.error('Settlement failed:', error);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </TabContent>
        )}

        {activeTab === 'settling' && (
          <TabContent key="settling">
            {settlingRunes.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No Settlements in Progress"
                description="Your settled Runes will appear here"
              />
            ) : (
              <div className="space-y-4">
                {settlingRunes.map((rune) => {
                  // Find the associated etching process
                  const etching = etchings.find(e => e.rune_name === rune.rune_name);
                  const processId = etching?.id;
                  return (
                    <SettlingRuneCard
                      key={rune.id}
                      rune={rune}
                      onViewStatus={() => processId && setSelectedProcess(processId)}
                    />
                  );
                })}
              </div>
            )}
          </TabContent>
        )}

        {activeTab === 'settled' && (
          <TabContent key="settled">
            {settledRunes.length === 0 ? (
              <EmptyState
                icon={Bitcoin}
                title="No Settled Runes Yet"
                description="Settle your Virtual Runes to Bitcoin to see them here"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {settledRunes.map((rune) => {
                  // Find the associated etching process to get the txid
                  const etching = etchings.find(e => e.rune_name === rune.rune_name);
                  return (
                    <SettledRuneCard key={rune.id} rune={rune} etching={etching} />
                  );
                })}
              </div>
            )}
          </TabContent>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  count,
  variant = 'default',
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count: number;
  variant?: 'default' | 'warning' | 'success';
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
        active
          ? "bg-gold-500 text-white shadow-lg"
          : "bg-transparent text-museum-dark-gray hover:bg-museum-cream"
      )}
    >
      {icon}
      <span>{children}</span>
      <span className={cn(
        "px-2 py-0.5 rounded-full text-xs font-bold",
        active
          ? "bg-white/20 text-white"
          : variant === 'warning'
          ? "bg-yellow-100 text-yellow-700"
          : variant === 'success'
          ? "bg-green-100 text-green-700"
          : "bg-museum-light-gray text-museum-dark-gray"
      )}>
        {count}
      </span>
    </button>
  );
}

// Tab Content wrapper
function TabContent({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// Virtual Rune Card
function VirtualRuneCard({
  rune,
  onSettle
}: {
  rune: VirtualRuneView;
  onSettle: (runeId: string) => Promise<void>;
}) {
  const [isSettling, setIsSettling] = useState(false);

  const handleSettle = async () => {
    setIsSettling(true);
    try {
      await onSettle(rune.id);
    } catch (error) {
      console.error('Failed to settle:', error);
      alert('Failed to initiate settlement. Please try again.');
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white border-2 border-museum-light-gray rounded-2xl p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl font-bold text-gold-600">
              {rune.symbol || rune.rune_name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-museum-black">{rune.rune_name}</h3>
            <p className="text-xs text-museum-dark-gray">Virtual on ICP</p>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-museum-dark-gray">Decimals</span>
          <span className="font-medium text-museum-black">{rune.divisibility}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-museum-dark-gray">Premine</span>
          <span className="font-medium text-museum-black">
            {rune.premine.toString()}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <ButtonPremium
          onClick={handleSettle}
          disabled={isSettling}
          variant="gold"
          size="sm"
          className="flex-1"
          icon={isSettling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bitcoin className="h-4 w-4" />}
        >
          {isSettling ? 'Settling...' : 'Settle to Bitcoin'}
        </ButtonPremium>
      </div>
    </motion.div>
  );
}

// Settling Rune Card
function SettlingRuneCard({
  rune,
  onViewStatus,
}: {
  rune: VirtualRuneView;
  onViewStatus: () => void;
}) {
  return (
    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-yellow-600 animate-spin" />
          </div>
          <div>
            <h3 className="font-bold text-yellow-900">{rune.rune_name}</h3>
            <p className="text-sm text-yellow-700">Settling to Bitcoin...</p>
          </div>
        </div>

        <ButtonPremium
          onClick={onViewStatus}
          variant="secondary"
          size="sm"
          icon={<ExternalLink className="h-4 w-4" />}
        >
          View Status
        </ButtonPremium>
      </div>
    </div>
  );
}

// Settled Rune Card
function SettledRuneCard({ rune, etching }: { rune: VirtualRuneView; etching?: EtchingProcessView }) {
  // Extract txid from etching process
  const txid = etching?.txid?.[0] || null;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-green-50 border-2 border-green-200 rounded-2xl p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-900">{rune.rune_name}</h3>
            <p className="text-xs text-green-700">On Bitcoin</p>
          </div>
        </div>
      </div>

      {txid && (
        <a
          href={`https://mempool.space/tx/${txid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 hover:underline"
        >
          <Bitcoin className="h-4 w-4" />
          View on Bitcoin
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </motion.div>
  );
}

// Empty State
function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: any;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="bg-museum-cream rounded-2xl p-12 text-center">
      <div className="inline-flex p-4 bg-museum-light-gray rounded-full mb-4">
        <Icon className="h-12 w-12 text-museum-dark-gray" />
      </div>
      <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
        {title}
      </h3>
      <p className="text-museum-dark-gray mb-6">
        {description}
      </p>
      {actionLabel && actionHref && (
        <ButtonPremium href={actionHref} variant="gold" size="lg">
          {actionLabel}
        </ButtonPremium>
      )}
    </div>
  );
}
