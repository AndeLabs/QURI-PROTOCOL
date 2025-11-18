'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import {
  OctopusIndexerClient,
  OctopusRuneEntry,
  isConfirmed,
  getConfirmationStatus,
  estimateConfirmationTime,
  formatConfirmationTime,
  formatSupply,
} from '@/lib/integrations/octopus-indexer';
import { logger } from '@/lib/logger';
import { CheckCircle, XCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';

/**
 * Rune Verification Component
 * Verifies that a QURI-created Rune exists on-chain via Octopus Indexer
 */

interface RuneVerificationProps {
  runeId: string;
  expectedData: {
    name: string;
    symbol?: string;
    divisibility: number;
    premine: string;
  };
  etchingTxid?: string;
}

export function RuneVerification({
  runeId,
  expectedData,
  etchingTxid,
}: RuneVerificationProps) {
  const [indexerData, setIndexerData] = useState<OctopusRuneEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const client = new OctopusIndexerClient('mainnet');

  const verifyRune = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Verifying rune on-chain', { rune_id: runeId });

      const data = await client.getRuneById(runeId);

      if (!data) {
        setError('Rune not found in indexer. It may not be confirmed yet.');
        setIndexerData(null);
      } else {
        setIndexerData(data);
        setLastChecked(new Date());
        logger.info('Rune verified on-chain', {
          rune_id: runeId,
          confirmations: data.confirmations,
        });
      }
    } catch (err) {
      logger.error('Failed to verify rune', err instanceof Error ? err : undefined);
      setError(err instanceof Error ? err.message : 'Failed to verify rune');
      setIndexerData(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify on mount
  useEffect(() => {
    verifyRune();
  }, [runeId]);

  const confirmationStatus = indexerData
    ? getConfirmationStatus(indexerData.confirmations)
    : null;

  const estimatedTime = indexerData
    ? estimateConfirmationTime(indexerData.confirmations)
    : null;

  const dataMatches = indexerData
    ? indexerData.spaced_rune === expectedData.name &&
      indexerData.divisibility === expectedData.divisibility &&
      indexerData.premine.toString() === expectedData.premine
    : false;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="font-serif text-2xl flex items-center gap-2">
          On-Chain Verification
          {confirmationStatus === 'confirmed' && (
            <CheckCircle className="w-6 h-6 text-green-500" />
          )}
          {confirmationStatus === 'confirming' && (
            <Clock className="w-6 h-6 text-yellow-500" />
          )}
          {confirmationStatus === 'pending' && (
            <Clock className="w-6 h-6 text-gray-400" />
          )}
        </CardTitle>
        <CardDescription>
          Verified via Octopus Network Runes Indexer
          {lastChecked && (
            <span className="ml-2 text-xs">
              • Last checked: {lastChecked.toLocaleTimeString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-gold-500 animate-spin" />
            <p className="ml-4 text-museum-gray">Querying blockchain indexer...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-sm">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-900 font-semibold mb-1">Verification Failed</p>
                <p className="text-red-700 text-sm">{error}</p>
                <Button
                  onClick={verifyRune}
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={loading}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success State */}
        {indexerData && !loading && (
          <>
            {/* Confirmation Status */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-blue-900 mb-1">Confirmation Status</p>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        confirmationStatus === 'confirmed'
                          ? 'bg-green-500'
                          : confirmationStatus === 'confirming'
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-gray-400'
                      }`}
                    />
                    <span className="text-blue-800 font-medium">
                      {indexerData.confirmations} / 6 confirmations
                    </span>
                  </div>
                  {estimatedTime && (
                    <p className="text-xs text-blue-700 mt-1">
                      Estimated time to confirmation: ~{formatConfirmationTime(estimatedTime)}
                    </p>
                  )}
                  {confirmationStatus === 'confirmed' && (
                    <p className="text-xs text-green-700 mt-1 font-semibold">
                      ✅ Fully confirmed and immutable
                    </p>
                  )}
                </div>
                <Button onClick={verifyRune} size="sm" variant="ghost" disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Data Verification */}
            <div
              className={`border-2 p-4 rounded-sm ${
                dataMatches
                  ? 'bg-green-50 border-green-300'
                  : 'bg-yellow-50 border-yellow-300'
              }`}
            >
              <p className="font-semibold mb-3 flex items-center gap-2">
                {dataMatches ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-900">Data Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-yellow-600" />
                    <span className="text-yellow-900">Data Mismatch</span>
                  </>
                )}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Name</p>
                  <p className="font-mono font-semibold">{indexerData.spaced_rune}</p>
                  {indexerData.spaced_rune !== expectedData.name && (
                    <p className="text-yellow-700 text-xs mt-1">
                      Expected: {expectedData.name}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-gray-600 mb-1">Symbol</p>
                  <p className="font-semibold">{indexerData.symbol || 'None'}</p>
                </div>

                <div>
                  <p className="text-gray-600 mb-1">Divisibility</p>
                  <p className="font-mono font-semibold">{indexerData.divisibility}</p>
                  {indexerData.divisibility !== expectedData.divisibility && (
                    <p className="text-yellow-700 text-xs mt-1">
                      Expected: {expectedData.divisibility}
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-gray-600 mb-1">Premine</p>
                  <p className="font-mono font-semibold">
                    {formatSupply(indexerData.premine, indexerData.divisibility)}
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-museum-gray mb-1">Block Height</p>
                <p className="font-mono font-semibold">
                  #{indexerData.block.toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-museum-gray mb-1">Rune ID</p>
                <p className="font-mono text-sm">{indexerData.rune_id}</p>
              </div>

              <div>
                <p className="text-museum-gray mb-1">Timestamp</p>
                <p className="text-sm">
                  {new Date(Number(indexerData.timestamp) * 1000).toLocaleString()}
                </p>
              </div>

              <div>
                <p className="text-museum-gray mb-1">Total Mints</p>
                <p className="font-mono font-semibold">
                  {indexerData.mints.toLocaleString()}
                </p>
              </div>

              {indexerData.burned > 0n && (
                <div>
                  <p className="text-museum-gray mb-1">Burned</p>
                  <p className="font-mono font-semibold text-red-600">
                    {formatSupply(indexerData.burned, indexerData.divisibility)}
                  </p>
                </div>
              )}
            </div>

            {/* Etching Transaction */}
            {etchingTxid && (
              <div className="pt-4 border-t border-museum-light-gray">
                <p className="text-sm text-museum-gray mb-2">Etching Transaction</p>
                <a
                  href={`https://mempool.space/tx/${etchingTxid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline text-sm font-mono"
                >
                  {etchingTxid.slice(0, 16)}...{etchingTxid.slice(-16)}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}

            {/* Indexer Info */}
            <div className="pt-4 border-t border-museum-light-gray text-xs text-museum-gray">
              <p>
                Data source:{' '}
                <a
                  href="https://github.com/octopus-network/runes-indexer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Octopus Network Runes Indexer
                </a>
              </p>
              <p className="mt-1">
                Canister ID: kzrva-ziaaa-aaaar-qamyq-cai (ICP Mainnet)
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact Verification Badge
 * Shows verification status inline
 */
interface VerificationBadgeProps {
  runeId: string;
  onStatusChange?: (status: 'verified' | 'unverified' | 'pending') => void;
}

export function VerificationBadge({ runeId, onStatusChange }: VerificationBadgeProps) {
  const [status, setStatus] = useState<'verified' | 'unverified' | 'pending'>('pending');
  const [confirmations, setConfirmations] = useState(0);

  useEffect(() => {
    const client = new OctopusIndexerClient('mainnet');

    const checkStatus = async () => {
      try {
        const data = await client.getRuneById(runeId);
        if (data) {
          setConfirmations(data.confirmations);
          const newStatus = isConfirmed(data) ? 'verified' : 'pending';
          setStatus(newStatus);
          onStatusChange?.(newStatus);
        } else {
          setStatus('unverified');
          onStatusChange?.('unverified');
        }
      } catch (error) {
        setStatus('unverified');
        onStatusChange?.('unverified');
      }
    };

    checkStatus();

    // Re-check every minute if not verified
    const interval = setInterval(() => {
      if (status !== 'verified') {
        checkStatus();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [runeId]);

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 border rounded-full text-sm">
      {status === 'verified' && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-700 font-medium">Verified On-Chain</span>
        </>
      )}
      {status === 'pending' && (
        <>
          <Clock className="w-4 h-4 text-yellow-500 animate-pulse" />
          <span className="text-yellow-700 font-medium">
            {confirmations}/6 Confirmations
          </span>
        </>
      )}
      {status === 'unverified' && (
        <>
          <XCircle className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">Not Found</span>
        </>
      )}
    </div>
  );
}
