/**
 * DirectionSelector Component
 * Select bridge direction: BTC → ckBTC or ckBTC → BTC
 */

'use client';

import { ArrowRight, ArrowLeftRight } from 'lucide-react';

export type BridgeDirection = 'to-ckbtc' | 'to-btc';

export interface DirectionSelectorProps {
  direction: BridgeDirection;
  onChange: (direction: BridgeDirection) => void;
  disabled?: boolean;
  className?: string;
}

export function DirectionSelector({
  direction,
  onChange,
  disabled = false,
  className = '',
}: DirectionSelectorProps) {
  const handleSwap = () => {
    if (!disabled) {
      onChange(direction === 'to-ckbtc' ? 'to-btc' : 'to-ckbtc');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Direction Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* From */}
        <div
          className={`
            border rounded-xl p-6 text-center transition-all
            ${
              direction === 'to-ckbtc'
                ? 'border-orange-300 bg-orange-50'
                : 'border-museum-light-gray bg-museum-white'
            }
          `}
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">₿</span>
            </div>
          </div>
          <h3 className="font-semibold text-museum-black mb-1">
            {direction === 'to-ckbtc' ? 'From' : 'To'}
          </h3>
          <p className="text-sm text-museum-dark-gray">Bitcoin (BTC)</p>
          <p className="text-xs text-museum-dark-gray mt-1">Bitcoin Mainnet</p>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwap}
            disabled={disabled}
            className={`
              p-4 rounded-full border-2 transition-all
              ${
                disabled
                  ? 'border-museum-light-gray bg-museum-cream text-museum-dark-gray cursor-not-allowed opacity-50'
                  : 'border-gold-300 bg-gold-50 text-gold-600 hover:bg-gold-100 hover:border-gold-400 active:scale-95'
              }
            `}
            aria-label="Swap direction"
          >
            <ArrowLeftRight className="h-6 w-6" />
          </button>
        </div>

        {/* To */}
        <div
          className={`
            border rounded-xl p-6 text-center transition-all
            ${
              direction === 'to-btc'
                ? 'border-orange-300 bg-orange-50'
                : 'border-museum-light-gray bg-museum-white'
            }
          `}
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">ckBTC</span>
            </div>
          </div>
          <h3 className="font-semibold text-museum-black mb-1">
            {direction === 'to-btc' ? 'From' : 'To'}
          </h3>
          <p className="text-sm text-museum-dark-gray">Chain Key Bitcoin</p>
          <p className="text-xs text-museum-dark-gray mt-1">Internet Computer</p>
        </div>
      </div>

      {/* Direction Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <ArrowRight className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">
              {direction === 'to-ckbtc' ? (
                <>Bridge Bitcoin to Internet Computer</>
              ) : (
                <>Withdraw ckBTC to Bitcoin Mainnet</>
              )}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              {direction === 'to-ckbtc' ? (
                <>Send BTC to receive ckBTC on ICP (1:1 backed)</>
              ) : (
                <>Burn ckBTC to receive BTC on Bitcoin network</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Fee Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-museum-cream rounded-lg p-4">
          <p className="text-xs text-museum-dark-gray mb-1">Estimated Fee</p>
          <p className="font-mono font-semibold text-museum-black">
            {direction === 'to-ckbtc' ? '~0.0001 BTC' : '~0.0002 BTC'}
          </p>
        </div>
        <div className="bg-museum-cream rounded-lg p-4">
          <p className="text-xs text-museum-dark-gray mb-1">Processing Time</p>
          <p className="font-mono font-semibold text-museum-black">
            {direction === 'to-ckbtc' ? '~30 min' : '~1 hour'}
          </p>
        </div>
      </div>
    </div>
  );
}
