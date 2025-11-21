'use client';

/**
 * Settlement History Component
 * Displays user's past settlements with status tracking
 */

import { motion } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useSettlementHistory } from '@/hooks/useSettlement';
import { RuneStateBadge } from './RuneStateBadge';
import { AddressPreview } from './BitcoinAddressInput';
import { SETTLEMENT_STATUSES, type SettlementStatus } from '@/types/settlement';

interface SettlementHistoryProps {
  className?: string;
  limit?: number;
}

export function SettlementHistory({
  className = '',
  limit = 10,
}: SettlementHistoryProps) {
  const { history, isLoading, error, refetch } = useSettlementHistory();

  const displayHistory = limit ? history.slice(0, limit) : history;

  if (isLoading) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin mx-auto mb-2" />
        <p className="text-sm text-museum-dark-gray">Loading settlement history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-red-50 rounded-xl text-center ${className}`}>
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700">Failed to load settlement history</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-600 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (displayHistory.length === 0) {
    return (
      <div className={`p-8 bg-museum-cream/50 rounded-xl text-center ${className}`}>
        <Clock className="h-8 w-8 text-museum-dark-gray mx-auto mb-2" />
        <p className="text-sm text-museum-dark-gray">No settlements yet</p>
        <p className="text-xs text-museum-dark-gray mt-1">
          Settle your virtual runes to Bitcoin mainnet
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {displayHistory.map((settlement) => (
        <SettlementHistoryItem key={settlement.id} settlement={settlement} />
      ))}

      {history.length > limit && (
        <button className="w-full py-2 text-sm text-gold-600 hover:text-gold-700
                        hover:bg-gold-50 rounded-lg transition-colors">
          View all {history.length} settlements
        </button>
      )}
    </div>
  );
}

/**
 * Single settlement history item
 */
function SettlementHistoryItem({
  settlement,
}: {
  settlement: {
    id: string;
    runeKey: { block: bigint; tx: number };
    runeName: string;
    amount: bigint;
    destinationAddress: string;
    mode: string;
    status: SettlementStatus;
    txid?: string;
    createdAt: number;
    updatedAt: number;
    confirmations?: number;
  };
}) {
  const statusInfo = SETTLEMENT_STATUSES[settlement.status];

  const getStatusIcon = () => {
    switch (settlement.status) {
      case 'confirmed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'confirming':
      case 'broadcasting':
      case 'signing':
        return <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatAmount = (amount: bigint) => {
    // Simplified formatting - should use actual divisibility
    return amount.toString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 bg-museum-white border border-museum-light-gray rounded-xl
               hover:border-gold-300 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Status Icon */}
        <div className="mt-0.5">{getStatusIcon()}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-museum-black truncate">
              {settlement.runeName}
            </span>
            <span className="text-xs text-museum-dark-gray">
              {formatTime(settlement.createdAt)}
            </span>
          </div>

          {/* Amount & Address */}
          <div className="space-y-1 mb-2">
            <p className="text-sm text-museum-black">
              {formatAmount(settlement.amount)} settled
            </p>
            <AddressPreview address={settlement.destinationAddress} />
          </div>

          {/* Status & Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                settlement.status === 'confirmed'
                  ? 'bg-green-100 text-green-700'
                  : settlement.status === 'failed'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {statusInfo.label}
              </span>
              <span className="text-xs text-museum-dark-gray capitalize">
                {settlement.mode}
              </span>
            </div>

            {/* Confirmations or Link */}
            {settlement.status === 'confirming' && settlement.confirmations !== undefined && (
              <span className="text-xs text-orange-600">
                {settlement.confirmations}/6 confirmations
              </span>
            )}
            {settlement.txid && (
              <a
                href={`https://mempool.space/tx/${settlement.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gold-600 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                View TX
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-4 w-4 text-museum-light-gray flex-shrink-0" />
      </div>
    </motion.div>
  );
}

/**
 * Compact settlement status indicator
 */
export function SettlementStatusIndicator({
  status,
  confirmations,
  className = '',
}: {
  status: SettlementStatus;
  confirmations?: number;
  className?: string;
}) {
  const statusInfo = SETTLEMENT_STATUSES[status];

  const getIcon = () => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'confirming':
      case 'broadcasting':
      case 'signing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getColor = () => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'confirming':
      case 'broadcasting':
      case 'signing':
        return 'text-orange-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className={`flex items-center gap-1.5 ${getColor()} ${className}`}>
      {getIcon()}
      <span className="text-sm font-medium">{statusInfo.label}</span>
      {status === 'confirming' && confirmations !== undefined && (
        <span className="text-xs">({confirmations}/6)</span>
      )}
    </div>
  );
}

/**
 * Active settlements count badge
 */
export function ActiveSettlementsBadge({
  count,
  className = '',
}: {
  count: number;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs
                   font-medium bg-orange-100 text-orange-700 rounded-full ${className}`}>
      <Loader2 className="h-3 w-3 animate-spin" />
      {count} pending
    </span>
  );
}
