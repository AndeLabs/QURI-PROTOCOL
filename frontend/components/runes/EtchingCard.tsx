/**
 * Modular EtchingCard Component
 * Card for displaying etching process status
 */

import { Loader, CheckCircle, AlertCircle, XCircle, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { EtchingProcessView } from '@/types/canisters';

interface EtchingCardProps {
  etching: EtchingProcessView;
  onRetry?: (id: string) => void;
  onViewDetails?: (id: string) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export function EtchingCard({
  etching,
  onRetry,
  onViewDetails,
  variant = 'default',
  className = '',
}: EtchingCardProps) {
  // Get state styling
  const getStateConfig = (state: string) => {
    switch (state) {
      case 'Completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'Completed',
        };
      case 'Building':
        return {
          icon: Loader,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          label: 'Building Transaction',
          animate: true,
        };
      case 'Broadcasting':
        return {
          icon: Loader,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          label: 'Broadcasting to Bitcoin',
          animate: true,
        };
      case 'Failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          label: 'Failed',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: state,
        };
    }
  };

  const config = getStateConfig(etching.state);
  const Icon = config.icon;

  // Format timestamp
  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleString();
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div
        className={`border rounded-lg p-4 ${config.bg} ${config.border} ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Icon className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
            <div>
              <h3 className="font-semibold text-museum-black">{etching.rune_name}</h3>
              <p className="text-xs text-museum-dark-gray font-mono">{etching.id.slice(0, 16)}...</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      className={`border border-museum-light-gray rounded-xl p-6 bg-museum-white hover:border-gold-300 transition-colors ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-museum-black">{etching.rune_name}</h3>
          <p className="text-xs text-museum-dark-gray font-mono mt-1">{etching.id}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`border rounded-lg p-3 mb-4 ${config.bg} ${config.border}`}>
        <div className="flex items-center justify-center gap-2">
          <Icon className={`h-5 w-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
          <span className={`font-semibold ${config.color}`}>{config.label}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-museum-cream rounded-lg p-3">
          <p className="text-xs text-museum-dark-gray mb-1">Created</p>
          <p className="text-xs font-mono text-museum-black">
            {formatTimestamp(etching.created_at)}
          </p>
        </div>

        <div className="bg-museum-cream rounded-lg p-3">
          <p className="text-xs text-museum-dark-gray mb-1">Updated</p>
          <p className="text-xs font-mono text-museum-black">
            {formatTimestamp(etching.updated_at)}
          </p>
        </div>

        <div className="bg-museum-cream rounded-lg p-3">
          <p className="text-xs text-museum-dark-gray mb-1">Retries</p>
          <p className="font-semibold text-museum-black">{etching.retry_count}</p>
        </div>

        <div className="bg-museum-cream rounded-lg p-3">
          <p className="text-xs text-museum-dark-gray mb-1">Status</p>
          <p className="text-xs text-museum-black">
            {etching.state === 'Completed' ? '✓ On Bitcoin' : '⏳ Processing'}
          </p>
        </div>
      </div>

      {/* Transaction ID */}
      {etching.txid && etching.txid.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-700 mb-1">Bitcoin Transaction</p>
          <a
            href={`https://mempool.space/testnet/tx/${etching.txid[0]}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-blue-600 hover:underline break-all flex items-center gap-1"
          >
            {etching.txid[0]}
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {etching.state === 'Failed' && onRetry && (
          <Button onClick={() => onRetry(etching.id)} variant="outline" size="sm" className="flex-1">
            Retry
          </Button>
        )}
        {etching.txid && etching.txid.length > 0 && (
          <Button
            onClick={() =>
              window.open(`https://mempool.space/testnet/tx/${etching.txid[0]}`, '_blank')
            }
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Bitcoin
          </Button>
        )}
        {onViewDetails && (
          <Button
            onClick={() => onViewDetails(etching.id)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Details
          </Button>
        )}
      </div>
    </div>
  );
}
