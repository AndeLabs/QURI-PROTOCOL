'use client';

/**
 * Rune Detail Page
 * Professional explorer page for individual Rune details
 * Features: Overview, Holders distribution, Transaction history, Charts
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ExternalLink,
  Coins,
  Users,
  Activity,
  TrendingUp,
  Clock,
  Hash,
  Info,
  BarChart3,
  History,
  Flame,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CopyButton } from '@/components/ui/CopyFeedback';
import { useRegistry } from '@/hooks/useRegistry';
import { useOmnityRune, formatOmnityAmount, getOmnitySymbol } from '@/hooks/useOmnity';
import type { RegistryEntry } from '@/types/canisters';
import {
  formatSupply,
  formatCompact,
  formatDate,
  formatRelativeTime,
  getRuneId,
  getMempoolRuneUrl,
  formatBlockHeight,
} from '@/lib/utils/format';
import {
  pageTransition,
  fadeInUp,
  staggerContainer,
  staggerItem,
  prefersReducedMotion,
} from '@/design-system/motion/presets';

// Tab types
type TabId = 'overview' | 'holders' | 'history' | 'analytics';

interface TabConfig {
  id: TabId;
  label: string;
  icon: React.ElementType;
}

const tabs: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'holders', label: 'Holders', icon: Users },
  { id: 'history', label: 'History', icon: History },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function RuneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const runeId = params.id as string;

  // Parse rune ID (format: block:tx)
  const parts = runeId.split(':');
  const block = BigInt(parts[0]);
  const tx = parseInt(parts[1]);

  // Hooks
  const { getRune, loading: registryLoading, error: registryError } = useRegistry();

  // Omnity hook for real-time data
  const {
    data: omnityRune,
    isLoading: omnityLoading,
    error: omnityError,
  } = useOmnityRune(runeId);

  // State
  const [rune, setRune] = useState<RegistryEntry | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [reducedMotion, setReducedMotion] = useState(false);

  // Combined loading state
  const loading = registryLoading || omnityLoading;
  const error = registryError || (omnityError ? 'Failed to fetch from Omnity' : null);

  // Check reduced motion
  useEffect(() => {
    setReducedMotion(prefersReducedMotion());
  }, []);

  // Load rune data from registry
  useEffect(() => {
    const loadRune = async () => {
      if (!block || tx === undefined) return;

      const result = await getRune({ block, tx });
      if (result) {
        setRune(result);
      }
    };

    loadRune();
  }, [block, tx, getRune]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-museum-white via-museum-cream to-premium-exhibition-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-museum-light-gray rounded w-1/4" />
            <div className="h-48 bg-museum-light-gray rounded-xl" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-museum-light-gray rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !rune) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-museum-white via-museum-cream to-premium-exhibition-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-museum-white border border-red-200 rounded-xl p-8 text-center">
            <h2 className="text-2xl font-serif font-bold text-museum-black mb-2">
              Rune Not Found
            </h2>
            <p className="text-museum-dark-gray mb-6">
              {error || `Could not find Rune with ID ${runeId}`}
            </p>
            <Link href="/explorer">
              <ButtonPremium variant="gold" icon={<ArrowLeft className="h-5 w-5" />}>
                Back to Explorer
              </ButtonPremium>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { metadata } = rune;

  // Use Omnity data when available, fallback to registry
  const displayName = omnityRune?.spaced_rune || metadata.name;
  const displaySymbol = omnityRune ? getOmnitySymbol(omnityRune.symbol) : metadata.symbol;
  const displaySupply = omnityRune?.supply || metadata.total_supply;
  const displayDivisibility = omnityRune?.divisibility ?? metadata.divisibility;

  // Breadcrumb items
  const breadcrumbItems = [
    { label: 'Explorer', href: '/explorer' },
    { label: metadata.name, href: `/explorer/rune/${runeId}` },
  ];

  // Stats data - use Omnity for real-time data
  const statsData = [
    {
      icon: Coins,
      label: 'Total Supply',
      value: omnityRune
        ? formatOmnityAmount(omnityRune.supply, omnityRune.divisibility)
        : formatSupply(metadata.total_supply, metadata.divisibility),
      color: 'text-gold-600',
      bgColor: 'bg-gold-50',
    },
    {
      icon: Activity,
      label: 'Total Mints',
      value: omnityRune
        ? formatOmnityAmount(omnityRune.mints, 0)
        : '-',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Flame,
      label: 'Burned',
      value: omnityRune
        ? formatOmnityAmount(omnityRune.burned, omnityRune.divisibility)
        : '-',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: CheckCircle2,
      label: 'Confirmations',
      value: omnityRune
        ? omnityRune.confirmations.toLocaleString()
        : '-',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <motion.div
      className="min-h-screen bg-gradient-to-br from-museum-white via-museum-cream to-premium-exhibition-gray"
      initial="hidden"
      animate="enter"
      exit="exit"
      variants={reducedMotion ? undefined : pageTransition}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Breadcrumb */}
        <motion.div variants={reducedMotion ? undefined : fadeInUp}>
          <Breadcrumb items={breadcrumbItems} showDashboardHome={true} />
        </motion.div>

        {/* Header Section */}
        <motion.div
          className="bg-museum-white border border-museum-light-gray rounded-2xl p-8 shadow-sm"
          variants={reducedMotion ? undefined : fadeInUp}
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Rune Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="font-serif text-4xl md:text-5xl font-bold text-museum-black">
                  {displayName}
                </h1>
                <span className="text-3xl">{displaySymbol}</span>
                {omnityRune && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    <CheckCircle2 className="h-3 w-3" />
                    Live Data
                  </span>
                )}
                {omnityLoading && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading
                  </span>
                )}
              </div>

              {/* Rune ID with copy */}
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-sm text-museum-dark-gray">
                  {getRuneId(metadata.key.block, metadata.key.tx)}
                </span>
                <CopyButton
                  text={getRuneId(metadata.key.block, metadata.key.tx)}
                  size="sm"
                  label="Copy Rune ID"
                />
              </div>

              {/* Quick Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-museum-dark-gray">
                  <Hash className="h-4 w-4" />
                  <span>Block {formatBlockHeight(metadata.key.block)}</span>
                </div>
                <div className="flex items-center gap-2 text-museum-dark-gray">
                  <Clock className="h-4 w-4" />
                  <span>Created {formatDate(metadata.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-museum-dark-gray">
                  <Coins className="h-4 w-4" />
                  <span>Divisibility: {metadata.divisibility}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <a
                href={getMempoolRuneUrl(metadata.key.block, metadata.key.tx)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ButtonPremium
                  variant="secondary"
                  size="md"
                  icon={<ExternalLink className="h-4 w-4" />}
                >
                  View on Bitcoin
                </ButtonPremium>
              </a>
              <CopyButton
                text={typeof window !== 'undefined' ? window.location.href : ''}
                variant="button"
                size="md"
                label="Share"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={reducedMotion ? undefined : staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {statsData.map((stat) => (
            <motion.div
              key={stat.label}
              className="border-2 border-museum-light-gray rounded-xl p-6 bg-museum-white hover:shadow-xl hover:border-gold-300 transition-all"
              variants={reducedMotion ? undefined : staggerItem}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 ${stat.bgColor} rounded-lg`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <span className="text-sm font-semibold text-museum-black uppercase tracking-wide">
                  {stat.label}
                </span>
              </div>
              <p className="text-3xl font-bold text-museum-black tracking-tight">
                {stat.value}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          className="bg-museum-white border border-museum-light-gray rounded-2xl p-2"
          variants={reducedMotion ? undefined : fadeInUp}
        >
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gold-100 text-gold-900 shadow-sm'
                    : 'text-museum-dark-gray hover:bg-museum-cream hover:text-museum-black'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Details Card */}
              <div className="lg:col-span-2 bg-museum-white border border-museum-light-gray rounded-xl p-6">
                <h3 className="font-serif text-xl font-bold text-museum-black mb-6">
                  Rune Details
                </h3>

                <div className="space-y-4">
                  <DetailRow label="Name" value={displayName} />
                  <DetailRow label="Symbol" value={displaySymbol} />
                  <DetailRow
                    label="Total Supply"
                    value={omnityRune
                      ? formatOmnityAmount(omnityRune.supply, omnityRune.divisibility)
                      : formatSupply(metadata.total_supply, metadata.divisibility)}
                    mono
                  />
                  <DetailRow
                    label="Premine"
                    value={omnityRune
                      ? formatOmnityAmount(omnityRune.premine, omnityRune.divisibility)
                      : formatSupply(metadata.premine, metadata.divisibility)}
                    mono
                  />
                  <DetailRow label="Divisibility" value={(omnityRune?.divisibility ?? metadata.divisibility).toString()} />
                  {omnityRune && (
                    <>
                      <DetailRow
                        label="Etching TX"
                        value={omnityRune.etching}
                        mono
                        truncate
                        copyable
                      />
                      <DetailRow
                        label="Turbo Mode"
                        value={omnityRune.turbo ? 'Enabled' : 'Disabled'}
                      />
                    </>
                  )}
                  <DetailRow
                    label="Block Height"
                    value={formatBlockHeight(omnityRune ? omnityRune.block : metadata.key.block)}
                    mono
                  />
                  <DetailRow
                    label="Transaction Index"
                    value={metadata.key.tx.toString()}
                    mono
                  />
                </div>

                {/* Mint Terms */}
                {metadata.terms.length > 0 && metadata.terms[0] && (
                  <div className="mt-6 pt-6 border-t border-museum-light-gray">
                    <h4 className="font-semibold text-museum-black mb-4">Mint Terms</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Amount per Mint</p>
                          <p className="font-mono font-semibold text-blue-900">
                            {formatSupply(metadata.terms[0].amount, metadata.divisibility)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Total Cap</p>
                          <p className="font-mono font-semibold text-blue-900">
                            {metadata.terms[0].cap.toString()}
                          </p>
                        </div>
                        {metadata.terms[0].height_start.length > 0 && (
                          <div>
                            <p className="text-xs text-blue-700 mb-1">Start Height</p>
                            <p className="font-mono font-semibold text-blue-900">
                              {metadata.terms[0].height_start[0]?.toString()}
                            </p>
                          </div>
                        )}
                        {metadata.terms[0].height_end.length > 0 && (
                          <div>
                            <p className="text-xs text-blue-700 mb-1">End Height</p>
                            <p className="font-mono font-semibold text-blue-900">
                              {metadata.terms[0].height_end[0]?.toString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="bg-museum-white border border-museum-light-gray rounded-xl p-6">
                  <h3 className="font-semibold text-museum-black mb-4">Quick Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">Indexed</span>
                      <span className="font-medium text-museum-black">
                        {formatRelativeTime(rune.indexed_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">Total Holders</span>
                      <span className="font-medium text-museum-black">
                        {rune.holder_count.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">24h Volume</span>
                      <span className="font-medium text-museum-black">
                        {formatCompact(rune.trading_volume_24h)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Links */}
                <div className="bg-museum-white border border-museum-light-gray rounded-xl p-6">
                  <h3 className="font-semibold text-museum-black mb-4">External Links</h3>
                  <div className="space-y-2">
                    <a
                      href={getMempoolRuneUrl(metadata.key.block, metadata.key.tx)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Mempool.space
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Holders Tab */}
          {activeTab === 'holders' && (
            <motion.div
              key="holders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            >
              <h3 className="font-serif text-xl font-bold text-museum-black mb-6">
                Top Holders
              </h3>
              <div className="text-center py-12 text-museum-dark-gray">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Holder data coming soon</p>
                <p className="text-sm mt-2">
                  Real-time holder distribution will be available here
                </p>
              </div>
            </motion.div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            >
              <h3 className="font-serif text-xl font-bold text-museum-black mb-6">
                Transaction History
              </h3>
              <div className="text-center py-12 text-museum-dark-gray">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Transaction history coming soon</p>
                <p className="text-sm mt-2">
                  All mints, transfers, and burns will be tracked here
                </p>
              </div>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-museum-white border border-museum-light-gray rounded-xl p-6"
            >
              <h3 className="font-serif text-xl font-bold text-museum-black mb-6">
                Analytics & Charts
              </h3>
              <div className="text-center py-12 text-museum-dark-gray">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">Charts coming soon</p>
                <p className="text-sm mt-2">
                  Volume, mints over time, and holder distribution charts
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Helper component for detail rows
function DetailRow({
  label,
  value,
  mono = false,
  truncate = false,
  copyable = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-museum-light-gray last:border-0">
      <span className="text-museum-dark-gray">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={`font-medium text-museum-black ${mono ? 'font-mono text-sm' : ''} ${
            truncate ? 'max-w-[200px] truncate' : ''
          }`}
          title={truncate ? value : undefined}
        >
          {value}
        </span>
        {copyable && (
          <CopyButton text={value} size="sm" />
        )}
      </div>
    </div>
  );
}
