/**
 * Transaction Status Tracker
 * Real-time tracking of Bitcoin settlement using ONLY real data from canister
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  Loader2,
  ExternalLink,
  AlertCircle,
  Bitcoin,
} from 'lucide-react';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import type { EtchingProcessView } from '@/types/canisters';
import { cn } from '@/lib/utils';

interface TransactionStatusTrackerProps {
  processId: string;
  runeName?: string;
}

// Estados del backend (REALES del canister)
const ETCHING_STATES = [
  { key: 'Validating', label: 'Validating Parameters', icon: Check },
  { key: 'CheckingBalance', label: 'Checking ckBTC Balance', icon: Bitcoin },
  { key: 'SelectingUtxos', label: 'Selecting UTXOs', icon: Bitcoin },
  { key: 'BuildingTransaction', label: 'Building Transaction', icon: Loader2 },
  { key: 'Signing', label: 'Signing Transaction', icon: Clock },
  { key: 'Broadcasting', label: 'Broadcasting to Bitcoin', icon: Bitcoin },
  { key: 'Confirming', label: 'Awaiting Confirmations', icon: Clock },
  { key: 'Indexing', label: 'Indexing Rune', icon: Check },
  { key: 'Completed', label: 'Completed', icon: Check },
];

export function TransactionStatusTracker({
  processId,
  runeName,
}: TransactionStatusTrackerProps) {
  const { getEtchingStatus } = useRuneEngine();
  const [status, setStatus] = useState<EtchingProcessView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  // Polling con datos REALES del canister
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const data = await getEtchingStatus(processId);
        if (data) {
          setStatus(data);
          setError(null);

          // Detener polling si está completado o falló
          if (data.state && (data.state === 'Completed' || data.state === 'Failed' || data.state === 'RolledBack' || (typeof data.state === 'object' && ('Completed' in data.state || 'Failed' in data.state || 'RolledBack' in data.state)))) {
            setIsPolling(false);
          }
        }
      } catch (err) {
        console.error('Error fetching status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    };

    // Fetch inicial
    fetchStatus();

    // Polling cada 2 segundos mientras no esté completado
    if (isPolling) {
      intervalId = setInterval(fetchStatus, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [processId, getEtchingStatus, isPolling]);

  // Función helper para obtener el estado actual
  const getCurrentState = () => {
    if (!status?.state) return null;

    // El estado viene como { Validating: null } o { Confirming: { confirmations: 3 } }
    const stateKey = Object.keys(status.state)[0];
    return stateKey;
  };

  const currentState = getCurrentState();
  const currentStateIndex = ETCHING_STATES.findIndex(s => s.key === currentState);

  // Obtener número de confirmaciones si está en estado Confirming
  const getConfirmations = () => {
    if (status?.state) {
      if (typeof status.state === 'object' && 'Confirming' in status.state) {
        return (status.state as any).Confirming.confirmations || 0;
      }
    }
    return 0;
  };

  // Obtener TXID si existe
  const txid = status?.txid || null;

  // Estado de error
  if (status?.state && (status.state === 'Failed' || (typeof status.state === 'object' && 'Failed' in status.state))) {
    const failedState = typeof status.state === 'object' ? status.state as any : { Failed: { reason: 'Unknown error', at_state: status.state } };
    return (
      <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-red-900 mb-2">
              Settlement Failed
            </h3>
            <p className="text-red-700 mb-4">
              {failedState.Failed.reason || 'Unknown error occurred'}
            </p>
            <p className="text-sm text-red-600">
              Failed at: {failedState.Failed.at_state || 'Unknown stage'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado completado
  if (status?.state && (status.state === 'Completed' || (typeof status.state === 'object' && 'Completed' in status.state))) {
    const completedState = typeof status.state === 'object' ? status.state as any : { Completed: { txid: null } };
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-green-50 border-2 border-green-200 rounded-2xl p-6"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="inline-flex p-4 bg-green-100 rounded-full mb-4"
          >
            <Check className="h-12 w-12 text-green-600" />
          </motion.div>

          <h3 className="font-serif text-2xl font-bold text-green-900 mb-2">
            Settlement Completed!
          </h3>

          <p className="text-green-700 mb-6">
            {runeName || 'Your Rune'} is now permanently on the Bitcoin blockchain
          </p>

          {completedState.Completed.txid && (
            <a
              href={`https://mempool.space/tx/${completedState.Completed.txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-bitcoin-500 text-white rounded-xl hover:bg-bitcoin-600 transition-colors"
            >
              <Bitcoin className="h-5 w-5" />
              View on Bitcoin
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </motion.div>
    );
  }

  // Error de carga
  if (error) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-900">Unable to load status</p>
            <p className="text-sm text-yellow-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Estado en progreso
  return (
    <div className="bg-white border-2 border-museum-light-gray rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="font-serif text-xl font-bold text-museum-black mb-1">
          Settling to Bitcoin
        </h3>
        {runeName && (
          <p className="text-sm text-museum-dark-gray">{runeName}</p>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {ETCHING_STATES.map((state, index) => {
          const isActive = state.key === currentState;
          const isCompleted = currentStateIndex > index;
          const Icon = state.icon;

          return (
            <motion.div
              key={state.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4"
            >
              {/* Icon/Status */}
              <div className={cn(
                "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all",
                isCompleted && "bg-green-500 text-white",
                isActive && "bg-gold-500 text-white animate-pulse",
                !isCompleted && !isActive && "bg-gray-200 text-gray-400"
              )}>
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive && "animate-spin"
                  )} />
                )}
              </div>

              {/* Label */}
              <div className="flex-1">
                <p className={cn(
                  "font-medium transition-colors",
                  (isActive || isCompleted) ? "text-museum-black" : "text-gray-400"
                )}>
                  {state.label}
                </p>

                {/* Special info para Confirming */}
                {isActive && state.key === 'Confirming' && (
                  <p className="text-sm text-gold-600 animate-pulse">
                    {getConfirmations()}/6 confirmations
                  </p>
                )}
              </div>

              {/* Connector line */}
              {index < ETCHING_STATES.length - 1 && (
                <div className="absolute left-[1.25rem] top-10 w-0.5 h-8 bg-gray-200" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* TXID if available */}
      {txid && (
        <div className="bg-museum-cream rounded-xl p-4">
          <p className="text-xs text-museum-dark-gray mb-1">Transaction ID</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-sm break-all text-museum-black">
              {txid}
            </p>
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 text-gold-600 hover:text-gold-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      {/* Estimated time */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-blue-600" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Estimated Time</p>
            <p className="text-blue-700">
              {currentState === 'Confirming' ? '10-60 minutes for confirmations' :
               currentState === 'Broadcasting' ? 'A few seconds' :
               'Processing...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
