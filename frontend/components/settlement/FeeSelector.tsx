'use client';

/**
 * Fee Selector Component
 * Settlement mode and fee selection with real-time estimates
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Zap,
  Clock,
  Calendar,
  Settings2,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  SETTLEMENT_MODES,
  type SettlementMode,
  type FeeEstimate,
  type FeeEstimates,
} from '@/types/settlement';

interface FeeSelectorProps {
  selectedMode: SettlementMode;
  onModeChange: (mode: SettlementMode) => void;
  feeEstimates?: FeeEstimates;
  customFeeRate?: number;
  onCustomFeeChange?: (rate: number) => void;
  disabled?: boolean;
  className?: string;
}

export function FeeSelector({
  selectedMode,
  onModeChange,
  feeEstimates,
  customFeeRate = 10,
  onCustomFeeChange,
  disabled = false,
  className = '',
}: FeeSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getModeIcon = (mode: SettlementMode) => {
    switch (mode) {
      case 'instant':
        return <Zap className="h-5 w-5" />;
      case 'batched':
        return <Clock className="h-5 w-5" />;
      case 'scheduled':
        return <Calendar className="h-5 w-5" />;
      case 'manual':
        return <Settings2 className="h-5 w-5" />;
    }
  };

  const getEstimate = (mode: SettlementMode): FeeEstimate | null => {
    if (!feeEstimates) return null;
    switch (mode) {
      case 'instant':
        return feeEstimates.instant;
      case 'batched':
        return feeEstimates.batched;
      case 'scheduled':
        return feeEstimates.scheduled;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Selection */}
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(SETTLEMENT_MODES) as SettlementMode[]).map((mode) => {
          const modeInfo = SETTLEMENT_MODES[mode];
          const estimate = getEstimate(mode);
          const isSelected = selectedMode === mode;

          return (
            <motion.button
              key={mode}
              onClick={() => !disabled && onModeChange(mode)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all
                       ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                       ${
                         isSelected
                           ? 'border-gold-500 bg-gold-50'
                           : 'border-museum-light-gray hover:border-gold-300 hover:bg-museum-cream/50'
                       }`}
              whileHover={!disabled ? { scale: 1.02 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
            >
              {/* Recommended Badge */}
              {modeInfo.recommended && (
                <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-medium
                               bg-green-500 text-white rounded-full">
                  Best
                </span>
              )}

              {/* Selected Indicator */}
              {isSelected && (
                <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-gold-500" />
              )}

              {/* Icon & Label */}
              <div className="flex items-center gap-2 mb-2">
                <div className={`${isSelected ? 'text-gold-600' : 'text-museum-dark-gray'}`}>
                  {getModeIcon(mode)}
                </div>
                <span className={`font-semibold ${
                  isSelected ? 'text-gold-700' : 'text-museum-black'
                }`}>
                  {modeInfo.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-museum-dark-gray mb-2">
                {modeInfo.description}
              </p>

              {/* Fee & Time */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-museum-dark-gray">Fee:</span>
                  <span className={`font-medium ${
                    isSelected ? 'text-gold-700' : 'text-museum-black'
                  }`}>
                    {estimate ? `$${estimate.usdValue.toFixed(2)}` : modeInfo.feeRange}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-museum-dark-gray">Time:</span>
                  <span className="text-museum-black">
                    {estimate ? estimate.timeEstimate : modeInfo.timeEstimate}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Current Network Fees */}
      {feeEstimates?.current && (
        <div className="p-3 bg-museum-cream/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-museum-dark-gray" />
            <span className="text-xs font-medium text-museum-black">
              Current Network Fees (sat/vB)
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-green-500" />
              Slow: {feeEstimates.current.slow}
            </span>
            <span>
              Medium: {feeEstimates.current.medium}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-orange-500" />
              Fast: {feeEstimates.current.fast}
            </span>
          </div>
        </div>
      )}

      {/* Manual Fee Input */}
      {selectedMode === 'manual' && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-museum-black">
              Custom Fee Rate
            </label>
            <span className="text-sm text-museum-dark-gray">
              {customFeeRate} sat/vB
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            value={customFeeRate}
            onChange={(e) => onCustomFeeChange?.(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-museum-light-gray rounded-lg appearance-none cursor-pointer
                     accent-gold-500"
          />
          <div className="flex justify-between text-xs text-museum-dark-gray">
            <span>1 sat/vB (Slow)</span>
            <span>200 sat/vB (Fast)</span>
          </div>
        </motion.div>
      )}

      {/* Advanced Options Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-museum-dark-gray
                 hover:text-museum-black transition-colors"
      >
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        {showAdvanced ? 'Hide' : 'Show'} advanced options
      </button>

      {/* Advanced Options */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 p-3 bg-museum-cream/30 rounded-lg text-sm"
        >
          <div className="flex justify-between">
            <span className="text-museum-dark-gray">Estimated Transaction Size:</span>
            <span className="text-museum-black">~250 vBytes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-museum-dark-gray">Batch Pool Size:</span>
            <span className="text-museum-black">
              {selectedMode === 'batched' ? '12 pending' : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-museum-dark-gray">Next Batch In:</span>
            <span className="text-museum-black">
              {selectedMode === 'batched' ? '~45 minutes' : 'N/A'}
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Compact Fee Display
 */
export function FeeDisplay({
  mode,
  estimate,
  className = '',
}: {
  mode: SettlementMode;
  estimate?: FeeEstimate;
  className?: string;
}) {
  const modeInfo = SETTLEMENT_MODES[mode];

  return (
    <div className={`flex items-center justify-between p-3 bg-museum-cream/50 rounded-lg ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-museum-black">{modeInfo.label}</span>
        {modeInfo.recommended && (
          <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
            Recommended
          </span>
        )}
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-museum-black">
          {estimate ? `$${estimate.usdValue.toFixed(2)}` : modeInfo.feeRange}
        </p>
        <p className="text-xs text-museum-dark-gray">
          {estimate ? estimate.timeEstimate : modeInfo.timeEstimate}
        </p>
      </div>
    </div>
  );
}

/**
 * Fee Comparison Table
 */
export function FeeComparisonTable({
  estimates,
  selectedMode,
  onSelect,
  className = '',
}: {
  estimates?: FeeEstimates;
  selectedMode?: SettlementMode;
  onSelect?: (mode: SettlementMode) => void;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-museum-light-gray ${className}`}>
      <table className="w-full text-sm">
        <thead className="bg-museum-cream">
          <tr>
            <th className="px-4 py-2 text-left font-medium text-museum-black">Mode</th>
            <th className="px-4 py-2 text-left font-medium text-museum-black">Fee</th>
            <th className="px-4 py-2 text-left font-medium text-museum-black">Time</th>
            <th className="px-4 py-2 text-left font-medium text-museum-black">Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-museum-light-gray">
          {(Object.keys(SETTLEMENT_MODES) as SettlementMode[])
            .filter((m) => m !== 'manual')
            .map((mode) => {
              const modeInfo = SETTLEMENT_MODES[mode];
              const estimate = estimates
                ? mode === 'instant'
                  ? estimates.instant
                  : mode === 'batched'
                  ? estimates.batched
                  : estimates.scheduled
                : null;
              const isSelected = selectedMode === mode;

              return (
                <tr
                  key={mode}
                  onClick={() => onSelect?.(mode)}
                  className={`transition-colors ${
                    onSelect ? 'cursor-pointer hover:bg-museum-cream/50' : ''
                  } ${isSelected ? 'bg-gold-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{modeInfo.label}</span>
                      {modeInfo.recommended && (
                        <span className="px-1 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                          Best
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-museum-black">
                    {estimate ? `$${estimate.usdValue.toFixed(2)}` : modeInfo.feeRange}
                  </td>
                  <td className="px-4 py-3 text-museum-dark-gray">
                    {estimate ? estimate.timeEstimate : modeInfo.timeEstimate}
                  </td>
                  <td className="px-4 py-3 text-museum-dark-gray">
                    {estimate ? `${estimate.feeRate} sat/vB` : '-'}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
