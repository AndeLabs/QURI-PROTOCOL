'use client';

/**
 * Rune State Badge Component
 * Visual indicator for rune lifecycle states
 */

import { motion } from 'framer-motion';
import { Info, ExternalLink, CheckCircle, Clock, Loader2, FileText } from 'lucide-react';
import { RUNE_STATES, type RuneState } from '@/types/settlement';

interface RuneStateBadgeProps {
  state: RuneState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDescription?: boolean;
  txid?: string;
  className?: string;
}

export function RuneStateBadge({
  state,
  size = 'md',
  showLabel = true,
  showDescription = false,
  txid,
  className = '',
}: RuneStateBadgeProps) {
  const stateInfo = RUNE_STATES[state];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const getIcon = () => {
    switch (state) {
      case 'draft':
        return <FileText className={iconSizes[size]} />;
      case 'virtual':
        return <Clock className={iconSizes[size]} />;
      case 'pending':
        return <Loader2 className={`${iconSizes[size]} animate-spin`} />;
      case 'native':
        return <CheckCircle className={iconSizes[size]} />;
    }
  };

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <motion.div
        className={`inline-flex items-center gap-1.5 rounded-full font-medium
                   ${sizeClasses[size]} ${stateInfo.bgColor} ${stateInfo.color}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        {getIcon()}
        {showLabel && <span>{stateInfo.label}</span>}
        {state === 'native' && txid && (
          <a
            href={`https://mempool.space/tx/${txid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 hover:opacity-70"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className={iconSizes[size]} />
          </a>
        )}
      </motion.div>

      {showDescription && (
        <span className="text-xs text-museum-dark-gray mt-1">
          {stateInfo.description}
        </span>
      )}
    </div>
  );
}

/**
 * Rune State Timeline
 * Shows progression through states
 */
export function RuneStateTimeline({
  currentState,
  className = '',
}: {
  currentState: RuneState;
  className?: string;
}) {
  const states: RuneState[] = ['draft', 'virtual', 'pending', 'native'];
  const currentIndex = states.indexOf(currentState);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {states.map((state, index) => {
        const stateInfo = RUNE_STATES[state];
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={state} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                         transition-all ${
                           isActive
                             ? `${stateInfo.bgColor} ${stateInfo.color} ring-2 ring-offset-2 ring-current`
                             : isCompleted
                             ? 'bg-green-100 text-green-600'
                             : 'bg-museum-light-gray text-museum-dark-gray'
                         }`}
            >
              {isCompleted ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span>{stateInfo.icon}</span>
              )}
            </div>
            {index < states.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  isCompleted ? 'bg-green-400' : 'bg-museum-light-gray'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Rune State Card
 * Detailed state information
 */
export function RuneStateCard({
  state,
  txid,
  confirmations,
  className = '',
}: {
  state: RuneState;
  txid?: string;
  confirmations?: number;
  className?: string;
}) {
  const stateInfo = RUNE_STATES[state];

  return (
    <div
      className={`p-4 rounded-xl border ${stateInfo.bgColor} border-current/20 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/50 ${stateInfo.color}`}>
          <span className="text-2xl">{stateInfo.icon}</span>
        </div>
        <div className="flex-1">
          <h4 className={`font-semibold ${stateInfo.color}`}>
            {stateInfo.label}
          </h4>
          <p className="text-sm text-museum-dark-gray mt-0.5">
            {stateInfo.description}
          </p>

          {state === 'pending' && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
              <span className="text-orange-600">
                {confirmations !== undefined
                  ? `${confirmations}/6 confirmations`
                  : 'Broadcasting...'}
              </span>
            </div>
          )}

          {state === 'native' && txid && (
            <a
              href={`https://mempool.space/tx/${txid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-green-600 hover:underline"
            >
              View on Bitcoin
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
