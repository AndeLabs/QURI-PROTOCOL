'use client';

/**
 * Settlement Modal Component
 * Complete settlement flow for settling virtual runes to Bitcoin
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ExternalLink,
  Info,
  Shield,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { BitcoinAddressInput, AddressPreview } from './BitcoinAddressInput';
import { SavedAddressesList, useSavedAddresses } from './SavedAddresses';
import { FeeSelector, FeeDisplay } from './FeeSelector';
import { RuneStateBadge, RuneStateTimeline } from './RuneStateBadge';
import { validateBitcoinAddress, isRuneCompatible } from '@/lib/utils/bitcoin';
import {
  SETTLEMENT_MODES,
  type SettlementMode,
  type SettlementRequest,
  type SettlementEstimate,
  type SettlementResult,
  type FeeEstimates,
} from '@/types/settlement';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  runeKey: { block: bigint; tx: number };
  runeName: string;
  runeSymbol: string;
  availableBalance: bigint;
  decimals: number;
  onSettle: (request: SettlementRequest) => Promise<SettlementResult>;
  feeEstimates?: FeeEstimates;
}

type SettlementStep = 'address' | 'amount' | 'fee' | 'confirm' | 'processing' | 'success' | 'error';

export function SettlementModal({
  isOpen,
  onClose,
  runeKey,
  runeName,
  runeSymbol,
  availableBalance,
  decimals,
  onSettle,
  feeEstimates,
}: SettlementModalProps) {
  // Form state
  const [step, setStep] = useState<SettlementStep>('address');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedMode, setSelectedMode] = useState<SettlementMode>('batched');
  const [customFeeRate, setCustomFeeRate] = useState(10);

  // Validation state
  const [addressValid, setAddressValid] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<SettlementResult | null>(null);

  // Saved addresses
  const { recordUsage } = useSavedAddresses();

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('address');
      setDestinationAddress('');
      setAmount('');
      setSelectedMode('batched');
      setAddressValid(false);
      setAmountError(null);
      setResult(null);
    }
  }, [isOpen]);

  // Format balance for display
  const formatBalance = (value: bigint): string => {
    const divisor = BigInt(10 ** decimals);
    const wholePart = value / divisor;
    const fractionalPart = value % divisor;
    if (fractionalPart === 0n) {
      return wholePart.toString();
    }
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '');
    return `${wholePart}.${fractionalStr}`;
  };

  // Parse amount to bigint
  const parseAmount = (value: string): bigint | null => {
    try {
      const parts = value.split('.');
      const wholePart = BigInt(parts[0] || '0');
      let fractionalPart = 0n;
      if (parts[1]) {
        const padded = parts[1].slice(0, decimals).padEnd(decimals, '0');
        fractionalPart = BigInt(padded);
      }
      const multiplier = BigInt(10 ** decimals);
      return wholePart * multiplier + fractionalPart;
    } catch {
      return null;
    }
  };

  // Validate amount
  const validateAmount = useCallback((value: string) => {
    if (!value) {
      setAmountError('Amount is required');
      return false;
    }
    const parsed = parseAmount(value);
    if (parsed === null) {
      setAmountError('Invalid amount format');
      return false;
    }
    if (parsed <= 0n) {
      setAmountError('Amount must be greater than 0');
      return false;
    }
    if (parsed > availableBalance) {
      setAmountError('Insufficient balance');
      return false;
    }
    setAmountError(null);
    return true;
  }, [availableBalance, decimals]);

  // Handle address validation
  const handleAddressValidation = (result: any) => {
    setAddressValid(result.valid);
  };

  // Handle saved address selection
  const handleSavedAddressSelect = (address: string) => {
    setDestinationAddress(address);
    const validation = validateBitcoinAddress(address);
    setAddressValid(validation.valid);
  };

  // Set max amount
  const handleSetMax = () => {
    setAmount(formatBalance(availableBalance));
    setAmountError(null);
  };

  // Navigate steps
  const goToNext = () => {
    switch (step) {
      case 'address':
        setStep('amount');
        break;
      case 'amount':
        if (validateAmount(amount)) {
          setStep('fee');
        }
        break;
      case 'fee':
        setStep('confirm');
        break;
    }
  };

  const goBack = () => {
    switch (step) {
      case 'amount':
        setStep('address');
        break;
      case 'fee':
        setStep('amount');
        break;
      case 'confirm':
        setStep('fee');
        break;
    }
  };

  // Handle settlement
  const handleSettle = async () => {
    setIsProcessing(true);
    setStep('processing');

    try {
      const parsedAmount = parseAmount(amount);
      if (!parsedAmount) throw new Error('Invalid amount');

      const request: SettlementRequest = {
        runeKey,
        runeName,
        amount: parsedAmount,
        destinationAddress,
        mode: selectedMode,
        customFeeRate: selectedMode === 'manual' ? customFeeRate : undefined,
      };

      const settlementResult = await onSettle(request);
      setResult(settlementResult);

      if (settlementResult.success) {
        setStep('success');
      } else {
        setStep('error');
      }
    } catch (err) {
      setResult({
        success: false,
        error: err instanceof Error ? err.message : 'Settlement failed',
      });
      setStep('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Get estimated fee for display
  const getEstimatedFee = (): string => {
    if (!feeEstimates) return SETTLEMENT_MODES[selectedMode].feeRange;
    const estimate = selectedMode === 'instant'
      ? feeEstimates.instant
      : selectedMode === 'batched'
      ? feeEstimates.batched
      : feeEstimates.scheduled;
    return estimate ? `$${estimate.usdValue.toFixed(2)}` : SETTLEMENT_MODES[selectedMode].feeRange;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-museum-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-museum-light-gray">
            <div>
              <h2 className="text-lg font-semibold text-museum-black">
                Settle to Bitcoin
              </h2>
              <p className="text-sm text-museum-dark-gray">
                {runeName} ({runeSymbol})
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-museum-dark-gray hover:text-museum-black
                       hover:bg-museum-cream rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress */}
          {!['processing', 'success', 'error'].includes(step) && (
            <div className="px-4 pt-4">
              <div className="flex items-center gap-2">
                {['address', 'amount', 'fee', 'confirm'].map((s, i) => (
                  <div key={s} className="flex items-center flex-1">
                    <div
                      className={`w-full h-1 rounded-full transition-colors ${
                        ['address', 'amount', 'fee', 'confirm'].indexOf(step) >= i
                          ? 'bg-gold-500'
                          : 'bg-museum-light-gray'
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4 max-h-[60vh] overflow-y-auto">
            {/* Step: Address */}
            {step === 'address' && (
              <div className="space-y-4">
                <SavedAddressesList
                  onSelect={handleSavedAddressSelect}
                  selectedAddress={destinationAddress}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-museum-light-gray" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-2 bg-museum-white text-xs text-museum-dark-gray">
                      or enter address
                    </span>
                  </div>
                </div>

                <BitcoinAddressInput
                  value={destinationAddress}
                  onChange={setDestinationAddress}
                  onValidationChange={handleAddressValidation}
                  requireMainnet={true}
                />

                {destinationAddress && addressValid && !isRuneCompatible(destinationAddress) && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-yellow-800">
                          Legacy Address Warning
                        </p>
                        <p className="text-yellow-700">
                          This address type may have issues receiving Runes.
                          Taproot (bc1p...) addresses are recommended.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step: Amount */}
            {step === 'amount' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-museum-black">
                      Amount to Settle
                    </label>
                    <button
                      onClick={handleSetMax}
                      className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                    >
                      Max: {formatBalance(availableBalance)} {runeSymbol}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        validateAmount(e.target.value);
                      }}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 pr-20 text-lg font-mono rounded-xl border-2
                               bg-museum-white transition-colors
                               ${amountError ? 'border-red-400' : 'border-museum-light-gray focus:border-gold-400'}`}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-museum-dark-gray font-medium">
                      {runeSymbol}
                    </span>
                  </div>
                  {amountError && (
                    <p className="mt-1 text-sm text-red-600">{amountError}</p>
                  )}
                </div>

                {/* Destination Preview */}
                <div className="p-3 bg-museum-cream/50 rounded-lg">
                  <p className="text-xs text-museum-dark-gray mb-1">Destination</p>
                  <AddressPreview address={destinationAddress} />
                </div>
              </div>
            )}

            {/* Step: Fee Selection */}
            {step === 'fee' && (
              <FeeSelector
                selectedMode={selectedMode}
                onModeChange={setSelectedMode}
                feeEstimates={feeEstimates}
                customFeeRate={customFeeRate}
                onCustomFeeChange={setCustomFeeRate}
              />
            )}

            {/* Step: Confirm */}
            {step === 'confirm' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="p-4 bg-museum-cream/50 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-museum-dark-gray">Amount</span>
                    <span className="text-sm font-semibold text-museum-black">
                      {amount} {runeSymbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-museum-dark-gray">Destination</span>
                    <AddressPreview address={destinationAddress} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-museum-dark-gray">Settlement Mode</span>
                    <span className="text-sm font-medium text-museum-black">
                      {SETTLEMENT_MODES[selectedMode].label}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-museum-light-gray flex justify-between">
                    <span className="text-sm font-medium text-museum-black">Estimated Fee</span>
                    <span className="text-sm font-semibold text-gold-600">
                      {getEstimatedFee()}
                    </span>
                  </div>
                </div>

                {/* Security Note */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-800">
                        Secure Settlement
                      </p>
                      <p className="text-blue-700">
                        Your runes will be burned on QURI and minted natively on Bitcoin.
                        This action is irreversible.
                      </p>
                    </div>
                  </div>
                </div>

                {/* State Transition */}
                <div className="p-3 bg-museum-cream/30 rounded-lg">
                  <p className="text-xs text-museum-dark-gray mb-2">State Transition</p>
                  <div className="flex items-center justify-center gap-3">
                    <RuneStateBadge state="virtual" size="sm" />
                    <ArrowRight className="h-4 w-4 text-museum-dark-gray" />
                    <RuneStateBadge state="pending" size="sm" />
                    <ArrowRight className="h-4 w-4 text-museum-dark-gray" />
                    <RuneStateBadge state="native" size="sm" />
                  </div>
                </div>
              </div>
            )}

            {/* Step: Processing */}
            {step === 'processing' && (
              <div className="py-8 text-center">
                <Loader2 className="h-12 w-12 text-gold-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-museum-black mb-2">
                  Processing Settlement
                </h3>
                <p className="text-sm text-museum-dark-gray">
                  Please wait while we process your settlement request...
                </p>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && result && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-museum-black mb-2">
                  Settlement Initiated
                </h3>
                <p className="text-sm text-museum-dark-gray mb-4">
                  {result.estimatedConfirmationTime || 'Your settlement is being processed.'}
                </p>
                {result.txid && (
                  <a
                    href={`https://mempool.space/tx/${result.txid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-gold-600 hover:underline"
                  >
                    View Transaction
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            )}

            {/* Step: Error */}
            {step === 'error' && result && (
              <div className="py-8 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-museum-black mb-2">
                  Settlement Failed
                </h3>
                <p className="text-sm text-red-600 mb-4">
                  {result.error || 'An error occurred during settlement.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-museum-light-gray bg-museum-cream/30">
            {/* Navigation buttons for address/amount/fee/confirm steps */}
            {['address', 'amount', 'fee', 'confirm'].includes(step) && (
              <div className="flex gap-3">
                {step !== 'address' && (
                  <ButtonPremium
                    variant="secondary"
                    onClick={goBack}
                    className="flex-1"
                  >
                    Back
                  </ButtonPremium>
                )}
                {step !== 'confirm' ? (
                  <ButtonPremium
                    variant="primary"
                    onClick={goToNext}
                    disabled={
                      (step === 'address' && !addressValid) ||
                      (step === 'amount' && (!!amountError || !amount))
                    }
                    className="flex-1"
                  >
                    Continue
                  </ButtonPremium>
                ) : (
                  <ButtonPremium
                    variant="primary"
                    onClick={handleSettle}
                    className="flex-1"
                  >
                    Confirm Settlement
                  </ButtonPremium>
                )}
              </div>
            )}

            {/* Close button for success/error */}
            {['success', 'error'].includes(step) && (
              <ButtonPremium
                variant={step === 'success' ? 'primary' : 'secondary'}
                onClick={onClose}
                className="w-full"
              >
                {step === 'success' ? 'Done' : 'Close'}
              </ButtonPremium>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Quick Settle Button
 * Compact trigger for settlement modal
 */
export function SettleButton({
  onClick,
  disabled = false,
  size = 'md',
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <ButtonPremium
      variant="primary"
      size={size}
      onClick={onClick}
      disabled={disabled}
      icon={<ArrowRight className="h-4 w-4" />}
      className={className}
    >
      Settle to Bitcoin
    </ButtonPremium>
  );
}
