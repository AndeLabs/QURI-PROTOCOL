/**
 * NumberDisplay Component
 * Shows blockchain numbers with full precision, tooltips, and copy-to-clipboard
 * NEVER rounds - essential for blockchain accuracy
 */

'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard, formatFullPrecision, formatCyclesFull } from '@/lib/utils/format';

interface NumberDisplayProps {
  /** The raw bigint value */
  value: bigint;
  /** Number of decimal places (e.g., 8 for ICP/BTC) */
  decimals: number;
  /** Unit label (e.g., "ICP", "ckBTC") */
  unit?: string;
  /** Optional label above the number */
  label?: string;
  /** Show copy button on hover */
  copyable?: boolean;
  /** Show full precision on hover tooltip */
  showTooltip?: boolean;
  /** Visual size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Additional classes */
  className?: string;
}

export function NumberDisplay({
  value,
  decimals,
  unit,
  label,
  copyable = true,
  showTooltip = true,
  size = 'md',
  align = 'left',
  className = '',
}: NumberDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showFullTooltip, setShowFullTooltip] = useState(false);

  const { display, full, raw } = formatFullPrecision(value, decimals);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(raw);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={`relative ${alignClasses[align]} ${className}`}>
      {label && (
        <p className="text-xs text-museum-dark-gray uppercase tracking-wider mb-1">
          {label}
        </p>
      )}

      <div
        className={`group inline-flex items-center gap-2 ${copyable ? 'cursor-pointer' : ''}`}
        onMouseEnter={() => setShowFullTooltip(true)}
        onMouseLeave={() => setShowFullTooltip(false)}
        onClick={copyable ? handleCopy : undefined}
      >
        <span
          className={`font-mono font-semibold tabular-nums text-museum-black ${sizeClasses[size]}`}
        >
          {display}
          {unit && <span className="ml-1 text-museum-dark-gray font-normal">{unit}</span>}
        </span>

        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-museum-cream"
            title="Copy raw value"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-museum-dark-gray" />
            )}
          </button>
        )}

        {/* Tooltip with full precision */}
        {showTooltip && showFullTooltip && full !== display && (
          <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-museum-charcoal text-white text-xs rounded shadow-lg whitespace-nowrap">
            <div className="font-mono">{full}</div>
            {copyable && <div className="text-museum-gray mt-1">Click to copy</div>}
            <div className="absolute top-full left-4 w-2 h-2 bg-museum-charcoal transform rotate-45 -translate-y-1" />
          </div>
        )}
      </div>

      {copied && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-xs rounded whitespace-nowrap">
          Copied!
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Specialized variants for common use cases
// ============================================================================

interface BalanceDisplayProps {
  value: bigint;
  label?: string;
  copyable?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Display ICP balance (8 decimals)
 */
export function ICPDisplay({ value, label, copyable = true, size = 'md', className }: BalanceDisplayProps) {
  return (
    <NumberDisplay
      value={value}
      decimals={8}
      unit="ICP"
      label={label}
      copyable={copyable}
      size={size}
      className={className}
    />
  );
}

/**
 * Display ckBTC balance (8 decimals)
 */
export function CkBTCDisplay({ value, label, copyable = true, size = 'md', className }: BalanceDisplayProps) {
  return (
    <NumberDisplay
      value={value}
      decimals={8}
      unit="ckBTC"
      label={label}
      copyable={copyable}
      size={size}
      className={className}
    />
  );
}

/**
 * Display Cycles with smart unit conversion
 */
export function CyclesDisplay({ value, label, copyable = true, size = 'md', className }: BalanceDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const { display, full, raw, unit } = formatCyclesFull(value);

  const handleCopy = async () => {
    const success = await copyToClipboard(raw);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <p className="text-xs text-museum-dark-gray uppercase tracking-wider mb-1">
          {label}
        </p>
      )}

      <div
        className={`group inline-flex items-center gap-2 ${copyable ? 'cursor-pointer' : ''}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={copyable ? handleCopy : undefined}
      >
        <span className={`font-mono font-semibold tabular-nums text-museum-black ${sizeClasses[size]}`}>
          {display}
          {unit && <span className="ml-1 text-museum-dark-gray font-normal">{unit}</span>}
        </span>

        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-museum-cream"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-museum-dark-gray" />
            )}
          </button>
        )}

        {showTooltip && (
          <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-museum-charcoal text-white text-xs rounded shadow-lg whitespace-nowrap">
            <div className="font-mono">{full}</div>
            <div className="text-museum-gray">{raw} cycles</div>
            {copyable && <div className="text-museum-gray mt-1">Click to copy</div>}
            <div className="absolute top-full left-4 w-2 h-2 bg-museum-charcoal transform rotate-45 -translate-y-1" />
          </div>
        )}
      </div>

      {copied && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-white text-xs rounded whitespace-nowrap">
          Copied!
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline number for tables/lists
 */
interface InlineNumberProps {
  value: bigint;
  decimals: number;
  unit?: string;
  copyable?: boolean;
  className?: string;
}

export function InlineNumber({ value, decimals, unit, copyable = true, className = '' }: InlineNumberProps) {
  const [copied, setCopied] = useState(false);

  const { display, raw } = formatFullPrecision(value, decimals);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const success = await copyToClipboard(raw);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <span
      className={`font-mono tabular-nums ${copyable ? 'cursor-pointer hover:text-gold-600' : ''} ${className}`}
      onClick={copyable ? handleCopy : undefined}
      title={copyable ? `${raw} (click to copy)` : raw}
    >
      {display}
      {unit && <span className="text-museum-dark-gray ml-1">{unit}</span>}
      {copied && (
        <span className="ml-2 text-green-600 text-xs">Copied!</span>
      )}
    </span>
  );
}
