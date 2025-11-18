/**
 * Modular Rune Card Component
 * Displays Bitcoin Rune information in a card format
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExternalLink, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { OctopusRuneEntry } from '@/lib/integrations/octopus-indexer';
import { VerificationBadge } from '@/components/RuneVerification';

interface RuneCardProps {
  rune: OctopusRuneEntry;
  onSelect?: (rune: OctopusRuneEntry) => void;
  showDetails?: boolean;
  network?: 'mainnet' | 'testnet';
}

export function RuneCard({ rune, onSelect, showDetails = true, network = 'mainnet' }: RuneCardProps) {
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: divisibility,
    });
  };

  const formatDate = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
  };

  const isConfirmed = rune.confirmations >= 6;
  const explorerUrl = network === 'mainnet' 
    ? `https://mempool.space/rune/${rune.rune_id}`
    : `https://mempool.space/testnet/rune/${rune.rune_id}`;

  return (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onSelect?.(rune)}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="font-serif text-xl truncate group-hover:text-orange-600 transition-colors">
              {rune.spaced_rune}
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {rune.rune_id}
            </CardDescription>
          </div>
          {rune.symbol && (
            <div className="text-3xl flex-shrink-0" title={`Symbol: ${rune.symbol}`}>
              {rune.symbol}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verification Status */}
        <div className="flex items-center gap-2">
          {isConfirmed ? (
            <div className="flex items-center gap-1 text-green-600 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-yellow-600 text-sm">
              <Clock className="w-4 h-4" />
              <span>{rune.confirmations}/6 confirmations</span>
            </div>
          )}
          {rune.turbo && (
            <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
              ⚡ TURBO
            </div>
          )}
        </div>

        {showDetails && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <StatCard 
                label="Supply" 
                value={formatSupply(rune.premine, rune.divisibility)}
                mono
              />
              <StatCard 
                label="Mints" 
                value={rune.mints.toLocaleString()}
                mono
              />
              <StatCard 
                label="Block" 
                value={`#${rune.block.toLocaleString()}`}
                mono
              />
              <StatCard 
                label="Burned" 
                value={formatSupply(rune.burned, rune.divisibility)}
                mono
              />
            </div>

            {/* Terms Info */}
            {rune.terms && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm space-y-2">
                <p className="text-xs font-semibold text-blue-900">Minting Terms</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
                  <div>
                    <span className="text-blue-600">Amount:</span>{' '}
                    <span className="font-mono">{formatSupply(rune.terms.amount, rune.divisibility)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Cap:</span>{' '}
                    <span className="font-mono">{rune.terms.cap.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {formatDate(rune.timestamp)}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              window.open(explorerUrl, '_blank');
            }}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for stat cards
function StatCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-gray-50 p-3 rounded-sm">
      <p className="text-gray-600 text-xs mb-1">{label}</p>
      <p className={`font-semibold text-gray-900 text-sm ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  );
}

// Compact version for lists
export function RuneCardCompact({ rune, onSelect, network = 'mainnet' }: RuneCardProps) {
  const isConfirmed = rune.confirmations >= 6;
  
  return (
    <div 
      onClick={() => onSelect?.(rune)}
      className="flex items-center gap-4 p-4 border rounded-sm hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-serif text-lg font-semibold truncate">
            {rune.spaced_rune}
          </h3>
          {rune.symbol && (
            <span className="text-xl">{rune.symbol}</span>
          )}
          {isConfirmed && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />}
          {rune.turbo && <span className="text-xs">⚡</span>}
        </div>
        <p className="text-xs text-gray-500 font-mono">{rune.rune_id}</p>
      </div>
      
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <p className="text-gray-600 text-xs">Supply</p>
          <p className="font-mono font-semibold">
            {Number(rune.premine) / Math.pow(10, rune.divisibility)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-600 text-xs">Mints</p>
          <p className="font-mono font-semibold">{rune.mints.toLocaleString()}</p>
        </div>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            const url = network === 'mainnet' 
              ? `https://mempool.space/rune/${rune.rune_id}`
              : `https://mempool.space/testnet/rune/${rune.rune_id}`;
            window.open(url, '_blank');
          }}
          variant="outline"
          size="sm"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
