/**
 * TransactionHistory Component
 * Display transaction and etching history
 */

'use client';

import { useState, useEffect } from 'react';
import { History, ExternalLink, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import type { EtchingProcessView } from '@/types/canisters';

interface TransactionHistoryProps {
  variant?: 'default' | 'compact';
  limit?: number;
  className?: string;
}

export function TransactionHistory({
  variant = 'default',
  limit,
  className = '',
}: TransactionHistoryProps) {
  const { getMyEtchings } = useRuneEngine();

  const [etchings, setEtchings] = useState<EtchingProcessView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEtchings();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadEtchings, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadEtchings = async () => {
    try {
      setLoading(true);
      const data = await getMyEtchings();
      const sortedData = data.sort(
        (a, b) => Number(b.created_at) - Number(a.created_at)
      );
      setEtchings(limit ? sortedData.slice(0, limit) : sortedData);
    } catch (error) {
      console.error('Failed to load etchings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (state: string) => {
    switch (state) {
      case 'Completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bg: 'bg-green-50',
          label: 'Completed',
        };
      case 'Building':
        return {
          icon: Loader,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          label: 'Building',
          animate: true,
        };
      case 'Broadcasting':
        return {
          icon: Loader,
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          label: 'Broadcasting',
          animate: true,
        };
      case 'Failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          label: 'Failed',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          label: 'Pending',
        };
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleString();
  };

  const formatTimeAgo = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`border border-museum-light-gray rounded-xl p-4 bg-museum-white ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <History className="h-5 w-5 text-museum-dark-gray" />
          <span className="font-semibold text-museum-black">Recent Activity</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-museum-cream animate-pulse rounded-lg" />
            ))}
          </div>
        ) : etchings.length === 0 ? (
          <p className="text-sm text-museum-dark-gray text-center py-4">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {etchings.map((etching) => {
              const config = getStatusConfig(etching.state);
              const Icon = config.icon;
              return (
                <div
                  key={etching.id}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-museum-cream transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`h-4 w-4 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
                    />
                    <div>
                      <p className="text-sm font-medium text-museum-black">
                        {etching.rune_name}
                      </p>
                      <p className="text-xs text-museum-dark-gray">
                        {formatTimeAgo(etching.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={className}>
      <div className="flex items-center gap-3 mb-6">
        <History className="h-6 w-6 text-museum-dark-gray" />
        <h2 className="font-serif text-2xl font-bold text-museum-black">Transaction History</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-museum-cream animate-pulse rounded-xl" />
          ))}
        </div>
      ) : etchings.length === 0 ? (
        <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
          <History className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            No Transactions Yet
          </h3>
          <p className="text-museum-dark-gray">
            Your etching and transaction history will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {etchings.map((etching) => {
            const config = getStatusConfig(etching.state);
            const Icon = config.icon;

            return (
              <div
                key={etching.id}
                className="border border-museum-light-gray rounded-xl p-6 bg-museum-white hover:border-gold-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${config.bg}`}>
                      <Icon
                        className={`h-6 w-6 ${config.color} ${config.animate ? 'animate-spin' : ''}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-museum-black mb-1">
                        Rune Etching: {etching.rune_name}
                      </h3>
                      <p className="text-sm text-museum-dark-gray">
                        {formatTimestamp(etching.created_at)}
                      </p>
                      <p className="text-xs text-museum-dark-gray mt-1">
                        {formatTimeAgo(etching.created_at)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
                  >
                    {config.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-museum-cream rounded-lg p-3">
                    <p className="text-xs text-museum-dark-gray mb-1">Process ID</p>
                    <p className="text-xs font-mono text-museum-black">
                      {etching.id.slice(0, 16)}...
                    </p>
                  </div>
                  <div className="bg-museum-cream rounded-lg p-3">
                    <p className="text-xs text-museum-dark-gray mb-1">Retries</p>
                    <p className="text-sm font-semibold text-museum-black">
                      {etching.retry_count}
                    </p>
                  </div>
                </div>

                {etching.txid && etching.txid.length > 0 && etching.txid[0] && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700 mb-1">Bitcoin Transaction</p>
                        <p className="text-xs font-mono text-blue-900">
                          {etching.txid[0].slice(0, 32)}...
                        </p>
                      </div>
                      <a
                        href={`https://mempool.space/testnet/tx/${etching.txid[0]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-blue-600" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
