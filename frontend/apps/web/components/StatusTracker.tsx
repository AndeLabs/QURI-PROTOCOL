'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { CheckCircle2, Clock, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EtchingStage =
  | 'validating'
  | 'checking_balance'
  | 'selecting_utxos'
  | 'building_tx'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'indexing'
  | 'completed'
  | 'failed';

interface StatusTrackerProps {
  processId: string;
  currentStage: EtchingStage;
  txid?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  error?: string;
}

const stages: Array<{ key: EtchingStage; label: string; description: string }> = [
  {
    key: 'validating',
    label: 'Validating',
    description: 'Checking Rune parameters',
  },
  {
    key: 'checking_balance',
    label: 'Balance Check',
    description: 'Verifying ckBTC balance',
  },
  {
    key: 'selecting_utxos',
    label: 'UTXO Selection',
    description: 'Finding optimal inputs',
  },
  {
    key: 'building_tx',
    label: 'Building',
    description: 'Constructing transaction',
  },
  {
    key: 'signing',
    label: 'Signing',
    description: 'Threshold Schnorr signature',
  },
  {
    key: 'broadcasting',
    label: 'Broadcasting',
    description: 'Sending to Bitcoin network',
  },
  {
    key: 'confirming',
    label: 'Confirming',
    description: 'Waiting for confirmations',
  },
  {
    key: 'indexing',
    label: 'Indexing',
    description: 'Indexing Rune metadata',
  },
  {
    key: 'completed',
    label: 'Completed',
    description: 'Rune successfully created',
  },
];

export function StatusTracker({
  processId,
  currentStage,
  txid,
  confirmations = 0,
  requiredConfirmations = 6,
  error,
}: StatusTrackerProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const index = stages.findIndex((s) => s.key === currentStage);
    if (index !== -1) {
      setCurrentStageIndex(index);
    }
  }, [currentStage]);

  const getStageStatus = (stageIndex: number): 'completed' | 'current' | 'pending' | 'error' => {
    if (currentStage === 'failed') return 'error';
    if (stageIndex < currentStageIndex) return 'completed';
    if (stageIndex === currentStageIndex) return 'current';
    return 'pending';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Etching Progress</CardTitle>
          <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-mono text-blue-700">
            ID: {processId.slice(0, 8)}...
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="relative">
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                currentStage === 'failed' ? 'bg-red-500' : 'bg-bitcoin-500'
              )}
              style={{
                width: `${((currentStageIndex + 1) / stages.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Stages List */}
        <div className="space-y-3">
          {stages.map((stage, index) => {
            const status = getStageStatus(index);

            return (
              <div
                key={stage.key}
                className={cn(
                  'flex items-start gap-3 rounded-lg p-3 transition-all',
                  status === 'current' && 'bg-bitcoin-50',
                  status === 'error' && 'bg-red-50'
                )}
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {status === 'completed' && (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  )}
                  {status === 'current' && (
                    <Loader2 className="h-6 w-6 animate-spin text-bitcoin-500" />
                  )}
                  {status === 'pending' && <Clock className="h-6 w-6 text-gray-300" />}
                  {status === 'error' && <AlertCircle className="h-6 w-6 text-red-500" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={cn(
                        'font-semibold',
                        status === 'completed' && 'text-green-700',
                        status === 'current' && 'text-bitcoin-700',
                        status === 'pending' && 'text-gray-400',
                        status === 'error' && 'text-red-700'
                      )}
                    >
                      {stage.label}
                    </h4>
                    {status === 'current' && stage.key === 'confirming' && (
                      <span className="text-sm font-medium text-bitcoin-600">
                        {confirmations}/{requiredConfirmations}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-sm',
                      status === 'completed' && 'text-green-600',
                      status === 'current' && 'text-bitcoin-600',
                      status === 'pending' && 'text-gray-400',
                      status === 'error' && 'text-red-600'
                    )}
                  >
                    {stage.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div>
                <h4 className="font-semibold text-red-900">Error</h4>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Link */}
        {txid && (
          <div className="rounded-lg bg-green-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-green-900">Transaction Broadcasted</h4>
                <p className="mt-1 font-mono text-sm text-green-700">
                  {txid.slice(0, 8)}...{txid.slice(-8)}
                </p>
              </div>
              <a
                href={`https://mempool.space/tx/${txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                View on Explorer
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {currentStage === 'completed' && (
          <div className="rounded-lg bg-green-50 p-4 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-3 text-lg font-semibold text-green-900">
              Rune Created Successfully!
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Your Rune has been etched on the Bitcoin blockchain
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
