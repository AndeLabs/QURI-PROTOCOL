'use client';

/**
 * Bitcoin Address Input Component
 * Production-ready input with real-time validation
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Copy,
  Check,
  Wallet,
} from 'lucide-react';
import {
  validateBitcoinAddress,
  getAddressTypeName,
  truncateAddress,
  type AddressValidationResult,
} from '@/lib/utils/bitcoin';

interface BitcoinAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidationChange?: (result: AddressValidationResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showValidation?: boolean;
  requireMainnet?: boolean;
  className?: string;
}

export function BitcoinAddressInput({
  value,
  onChange,
  onValidationChange,
  placeholder = 'Enter Bitcoin address (bc1p...)',
  label = 'Bitcoin Address',
  required = false,
  disabled = false,
  showValidation = true,
  requireMainnet = true,
  className = '',
}: BitcoinAddressInputProps) {
  const [validation, setValidation] = useState<AddressValidationResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Validate on value change
  useEffect(() => {
    if (value) {
      const result = validateBitcoinAddress(value);

      // Check mainnet requirement
      if (requireMainnet && result.valid && result.network !== 'mainnet') {
        result.valid = false;
        result.error = 'Please use a mainnet address';
      }

      setValidation(result);
      onValidationChange?.(result);
    } else {
      setValidation(null);
      onValidationChange?.({
        valid: false,
        type: 'unknown',
        network: 'mainnet',
        error: 'Address is required',
        isTaproot: false,
        isSegwit: false,
      });
    }
  }, [value, requireMainnet, onValidationChange]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  const getStatusIcon = () => {
    if (!value) return null;
    if (!validation) return null;

    if (validation.valid) {
      if (validation.isTaproot) {
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      }
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getBorderColor = () => {
    if (!value || !validation) return 'border-museum-light-gray';
    if (validation.valid) {
      return validation.isTaproot ? 'border-green-400' : 'border-yellow-400';
    }
    return 'border-red-400';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-museum-black">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        <div
          className={`flex items-center gap-2 rounded-xl border-2 bg-museum-white
                     transition-all ${getBorderColor()}
                     ${isFocused ? 'ring-2 ring-gold-200' : ''}
                     ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {/* Wallet Icon */}
          <div className="pl-3">
            <Wallet className="h-5 w-5 text-museum-dark-gray" />
          </div>

          {/* Input */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 py-3 pr-2 bg-transparent text-museum-black
                     placeholder:text-museum-dark-gray focus:outline-none
                     font-mono text-sm"
            spellCheck={false}
            autoComplete="off"
          />

          {/* Status Icon */}
          {getStatusIcon()}

          {/* Action Buttons */}
          <div className="flex items-center gap-1 pr-2">
            {value && (
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 hover:bg-museum-cream rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-museum-dark-gray" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handlePaste}
              disabled={disabled}
              className="px-2 py-1 text-xs font-medium text-gold-600 hover:text-gold-700
                       hover:bg-gold-50 rounded-lg transition-colors"
            >
              Paste
            </button>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {showValidation && value && validation && (
        <AnimatePresence mode="wait">
          <motion.div
            key={validation.valid ? 'valid' : 'invalid'}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-1"
          >
            {/* Error Message */}
            {!validation.valid && validation.error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                {validation.error}
              </p>
            )}

            {/* Success Info */}
            {validation.valid && (
              <div className="space-y-1">
                {/* Address Type */}
                <p className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {getAddressTypeName(validation.type)} address
                  {validation.network !== 'mainnet' && (
                    <span className="text-yellow-600 ml-1">
                      ({validation.network})
                    </span>
                  )}
                </p>

                {/* Recommendation */}
                {validation.recommendation && (
                  <p className={`flex items-start gap-1.5 text-sm ${
                    validation.isTaproot ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {validation.recommendation}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Helper Text */}
      {!value && (
        <p className="text-xs text-museum-dark-gray">
          Taproot addresses (bc1p...) are recommended for optimal Runes support
        </p>
      )}
    </div>
  );
}

/**
 * Compact Address Display
 */
export function AddressPreview({
  address,
  className = '',
}: {
  address: string;
  className?: string;
}) {
  const validation = validateBitcoinAddress(address);

  if (!validation.valid) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
        validation.isTaproot
          ? 'bg-green-100 text-green-700'
          : validation.isSegwit
          ? 'bg-blue-100 text-blue-700'
          : 'bg-yellow-100 text-yellow-700'
      }`}>
        {getAddressTypeName(validation.type)}
      </span>
      <span className="font-mono text-sm text-museum-black">
        {truncateAddress(address)}
      </span>
    </div>
  );
}
