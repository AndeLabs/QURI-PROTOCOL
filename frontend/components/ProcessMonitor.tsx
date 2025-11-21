/**
 * Process Monitor Component
 * Real-time monitoring with automatic polling
 */

'use client';

import { useEffect } from 'react';
import { useEtchingStatusQuery } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { runeToast } from '@/lib/toast';
import { Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

interface ProcessMonitorProps {
  processId: string;
  onComplete?: (txid: string) => void;
}

export function ProcessMonitor({ processId, onComplete }: ProcessMonitorProps) {
  const { data: status, isLoading } = useEtchingStatusQuery(processId);
  // ✅ Auto-polls every 5 seconds while active

  // Show completion toast
  useEffect(() => {
    if (status?.state === 'Completed' && status.txid[0]) {
      const txid = status.txid[0];
      runeToast.etchingCompleted(status.rune_name, txid);
      onComplete?.(txid);
    }
  }, [status, onComplete]);

  // Show failure toast
  useEffect(() => {
    if (status?.state === 'Failed') {
      runeToast.etchingFailed(status.rune_name, 'Process failed');
    }
  }, [status]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading process status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-gray-500">Process not found</p>
        </CardContent>
      </Card>
    );
  }

  const progress = getProgress(status.state);
  const isActive = !['Completed', 'Failed'].includes(status.state);
  const isCompleted = status.state === 'Completed';
  const isFailed = status.state === 'Failed';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {isFailed && <XCircle className="w-5 h-5 text-red-500" />}
            {isActive && <Loader2 className="w-5 h-5 animate-spin text-orange-500" />}
            <span className="font-mono">{status.rune_name}</span>
          </span>
          {isActive && (
            <span className="text-xs font-normal text-gray-500">
              Updating live...
            </span>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{status.state}</span>
            <span className="text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-green-500'
                  : isFailed
                  ? 'bg-red-500'
                  : 'bg-orange-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Process Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Process ID:</span>
            <span className="font-mono text-xs">{processId.slice(0, 12)}...</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span>
              {new Date(Number(status.created_at) / 1_000_000).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated:</span>
            <span>
              {new Date(Number(status.updated_at) / 1_000_000).toLocaleString()}
            </span>
          </div>

          {status.retry_count > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">Retries:</span>
              <span className="text-orange-600 font-medium">{status.retry_count}</span>
            </div>
          )}

          {status.txid[0] && (
            <div className="pt-2 border-t border-gray-200">
              <span className="text-gray-600 block mb-1">Transaction ID:</span>
              <a
                href={`https://mempool.space/testnet/tx/${status.txid[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-mono text-xs break-all"
              >
                {status.txid[0]}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Failed State Message */}
        {isFailed && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-red-700 font-medium">
              ❌ Process failed. Please try creating a new etching.
            </p>
          </div>
        )}

        {isCompleted && status.txid[0] && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-green-700 font-medium mb-2">
              ✅ Rune successfully created on Bitcoin!
            </p>
            <a
              href={`https://mempool.space/testnet/tx/${status.txid[0]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-block"
            >
              <Button className="w-full">
                View on Mempool.space
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Get progress percentage based on state
 */
function getProgress(state: string): number {
  const stateProgress: Record<string, number> = {
    Pending: 5,
    Validating: 10,
    CheckingBalance: 20,
    SelectingUtxos: 35,
    BuildingTransaction: 50,
    SigningTransaction: 65,
    Signing: 65,
    Broadcasting: 80,
    AwaitingConfirmation: 90,
    Confirming: 90,
    Indexing: 95,
    Completed: 100,
    Failed: 0,
  };

  return stateProgress[state] || 50;
}

/**
 * Minimal Process Badge for displaying in lists
 */
export function ProcessBadge({ state }: { state: string }) {
  const isActive = !['Completed', 'Failed'].includes(state);
  const isCompleted = state === 'Completed';
  const isFailed = state === 'Failed';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        isCompleted
          ? 'bg-green-100 text-green-800'
          : isFailed
          ? 'bg-red-100 text-red-800'
          : 'bg-orange-100 text-orange-800'
      }`}
    >
      {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
      {isFailed && <XCircle className="w-3 h-3" />}
      {state}
    </span>
  );
}
