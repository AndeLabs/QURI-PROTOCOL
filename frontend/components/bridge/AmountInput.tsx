/**
 * AmountInput Component
 * Input for bridge amount with balance display and max button
 */

'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { BridgeDirection } from './DirectionSelector';

export interface AmountInputProps {
  amount: string;
  onChange: (amount: string) => void;
  direction: BridgeDirection;
  balance: bigint;
  minAmount?: bigint;
  maxAmount?: bigint;
  disabled?: boolean;
  error?: string;
  className?: string;
}

export function AmountInput({
  amount,
  onChange,
  direction,
  balance,
  minAmount = 10000n, // 0.0001 BTC minimum
  maxAmount,
  disabled = false,
  error,
  className = '',
}: AmountInputProps) {
  const [usdValue, setUsdValue] = useState<number>(0);

  // Format balance (8 decimals for BTC)
  const formatBalance = (value: bigint): string => {
    const btc = Number(value) / 100_000_000;
    return btc.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  // Convert amount string to satoshis
  const amountToSatoshis = (value: string): bigint => {
    const num = parseFloat(value || '0');
    return BigInt(Math.floor(num * 100_000_000));
  };

  // Calculate USD value (mock price - in production, fetch from API)
  useEffect(() => {
    const btcPrice = 45000; // Mock BTC price
    const btcAmount = parseFloat(amount || '0');
    setUsdValue(btcAmount * btcPrice);
  }, [amount]);

  const handleMaxClick = () => {
    if (!disabled) {
      // Leave some for fees
      const fee = direction === 'to-ckbtc' ? 10000n : 20000n;
      const maxAvailable = balance > fee ? balance - fee : 0n;
      onChange(formatBalance(maxAvailable));
    }
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
    const regex = /^\d*\.?\d{0,8}$/;
    if (regex.test(value) || value === '') {
      onChange(value);
    }
  };

  // Validation
  const amountSatoshis = amountToSatoshis(amount);
  const isInvalid = error || (amount !== '' && (
    amountSatoshis < minAmount ||
    amountSatoshis > balance ||
    (maxAmount && amountSatoshis > maxAmount)
  ));

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label and Balance */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-museum-black">
          Amount
        </label>
        <div className="text-sm text-museum-dark-gray">
          Balance:{' '}
          <span className="font-mono font-semibold text-museum-black">
            {formatBalance(balance)}
          </span>{' '}
          <span className="text-xs">
            {direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}
          </span>
        </div>
      </div>

      {/* Amount Input */}
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          placeholder="0.0"
          value={amount}
          onChange={(e) => handleAmountChange(e.target.value)}
          disabled={disabled}
          className={`
            pr-24 text-lg font-mono
            ${isInvalid ? 'border-red-300 bg-red-50 focus:border-red-500' : ''}
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-sm font-semibold text-museum-dark-gray">
            {direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}
          </span>
          <Button
            onClick={handleMaxClick}
            disabled={disabled}
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
          >
            MAX
          </Button>
        </div>
      </div>

      {/* USD Value */}
      {amount && !isInvalid && (
        <p className="text-sm text-museum-dark-gray">
          ≈ ${usdValue.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} USD
        </p>
      )}

      {/* Error or Min/Max Info */}
      {isInvalid ? (
        <p className="text-sm text-red-600 flex items-center gap-1">
          {error || (
            amountSatoshis < minAmount
              ? `Minimum amount is ${formatBalance(minAmount)} ${direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}`
              : amountSatoshis > balance
              ? 'Insufficient balance'
              : 'Amount exceeds maximum'
          )}
        </p>
      ) : (
        <p className="text-xs text-museum-dark-gray">
          Min: {formatBalance(minAmount)} {direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}
          {maxAmount && ` • Max: ${formatBalance(maxAmount)} ${direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}`}
        </p>
      )}

      {/* Amount Breakdown */}
      {amount && !isInvalid && (
        <div className="bg-museum-cream rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-museum-dark-gray">You send</span>
            <span className="font-mono font-semibold text-museum-black">
              {amount} {direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-museum-dark-gray">Estimated fee</span>
            <span className="font-mono text-museum-dark-gray">
              {direction === 'to-ckbtc' ? '~0.0001' : '~0.0002'}{' '}
              {direction === 'to-ckbtc' ? 'BTC' : 'ckBTC'}
            </span>
          </div>
          <div className="pt-2 border-t border-museum-light-gray flex items-center justify-between">
            <span className="font-semibold text-museum-black">You receive</span>
            <span className="font-mono font-bold text-gold-600">
              {direction === 'to-ckbtc'
                ? (parseFloat(amount) - 0.0001).toFixed(8)
                : (parseFloat(amount) - 0.0002).toFixed(8)}{' '}
              {direction === 'to-ckbtc' ? 'ckBTC' : 'BTC'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
