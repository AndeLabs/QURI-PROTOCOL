'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  Sparkles,
  Info,
  ArrowRight,
  CheckCircle,
  Loader,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import type { RuneEtching, MintTerms } from '@/types/canisters';

export default function CreateRunePage() {
  const router = useRouter();
  const { etchRune, getEtchingStatus, loading, error } = useRuneEngine();

  // Form state
  const [runeName, setRuneName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [divisibility, setDivisibility] = useState('0');
  const [premine, setPremine] = useState('');

  // Mint terms (optional)
  const [enableMintTerms, setEnableMintTerms] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [mintCap, setMintCap] = useState('');
  const [heightStart, setHeightStart] = useState('');
  const [heightEnd, setHeightEnd] = useState('');

  // Etching state
  const [processId, setProcessId] = useState<string | null>(null);
  const [etchingState, setEtchingState] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Rune name validation (Bitcoin Runes rules)
    if (!runeName) {
      errors.runeName = 'Rune name is required';
    } else if (runeName.length < 1 || runeName.length > 28) {
      errors.runeName = 'Rune name must be 1-28 characters';
    } else if (!/^[A-Z•]+$/.test(runeName)) {
      errors.runeName = 'Rune name must contain only A-Z and • characters';
    }

    // Symbol validation
    if (!symbol) {
      errors.symbol = 'Symbol is required';
    } else if (symbol.length > 1) {
      errors.symbol = 'Symbol must be a single character';
    }

    // Divisibility validation
    const div = parseInt(divisibility);
    if (isNaN(div) || div < 0 || div > 38) {
      errors.divisibility = 'Divisibility must be 0-38';
    }

    // Premine validation
    if (!premine) {
      errors.premine = 'Premine amount is required';
    } else if (BigInt(premine) < 0n) {
      errors.premine = 'Premine must be non-negative';
    }

    // Mint terms validation (if enabled)
    if (enableMintTerms) {
      if (!mintAmount) {
        errors.mintAmount = 'Mint amount is required';
      } else if (BigInt(mintAmount) <= 0n) {
        errors.mintAmount = 'Mint amount must be positive';
      }

      if (!mintCap) {
        errors.mintCap = 'Mint cap is required';
      } else if (BigInt(mintCap) <= 0n) {
        errors.mintCap = 'Mint cap must be positive';
      }

      // Height validation (optional but if provided must be valid)
      if (heightStart && heightEnd) {
        const start = BigInt(heightStart);
        const end = BigInt(heightEnd);
        if (start >= end) {
          errors.heightEnd = 'End height must be greater than start height';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Build RuneEtching object
    const etching: RuneEtching = {
      rune_name: runeName,
      symbol,
      divisibility: parseInt(divisibility),
      premine: BigInt(premine),
      terms: enableMintTerms
        ? [
            {
              amount: BigInt(mintAmount),
              cap: BigInt(mintCap),
              height_start: heightStart ? [BigInt(heightStart)] : [],
              height_end: heightEnd ? [BigInt(heightEnd)] : [],
              offset_start: [],
              offset_end: [],
            } as MintTerms,
          ]
        : [],
    };

    // Submit to backend
    const id = await etchRune(etching);

    if (id) {
      setProcessId(id);
      // Start polling for status
      pollStatus(id);
    }
  };

  const pollStatus = async (id: string) => {
    const poll = async () => {
      const status = await getEtchingStatus(id);
      if (status) {
        setEtchingState(status.state);

        // If completed or failed, stop polling
        if (status.state === 'Completed' || status.state === 'Failed') {
          return;
        }

        // Continue polling
        setTimeout(poll, 2000);
      }
    };

    poll();
  };

  const handleReset = () => {
    setRuneName('');
    setSymbol('');
    setDivisibility('0');
    setPremine('');
    setEnableMintTerms(false);
    setMintAmount('');
    setMintCap('');
    setHeightStart('');
    setHeightEnd('');
    setProcessId(null);
    setEtchingState(null);
    setValidationErrors({});
  };

  // If etching is in progress or completed, show status
  if (processId) {
    return (
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Creating Rune
          </h1>
          <p className="text-museum-dark-gray">
            Your Rune is being etched on the Bitcoin blockchain
          </p>
        </div>

        <div className="border border-museum-light-gray rounded-xl p-8 bg-museum-white">
          {/* Status indicator */}
          <div className="flex items-center justify-center mb-6">
            {etchingState === 'Completed' ? (
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle className="h-12 w-12" />
                <span className="text-2xl font-bold">Completed!</span>
              </div>
            ) : etchingState === 'Failed' ? (
              <div className="flex items-center gap-3 text-red-600">
                <AlertCircle className="h-12 w-12" />
                <span className="text-2xl font-bold">Failed</span>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-blue-600">
                <Loader className="h-12 w-12 animate-spin" />
                <span className="text-2xl font-bold">Processing...</span>
              </div>
            )}
          </div>

          {/* Process details */}
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-museum-light-gray">
              <span className="text-museum-dark-gray">Rune Name</span>
              <span className="font-semibold text-museum-black">{runeName}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-museum-light-gray">
              <span className="text-museum-dark-gray">Symbol</span>
              <span className="font-semibold text-museum-black">{symbol}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-museum-light-gray">
              <span className="text-museum-dark-gray">Process ID</span>
              <span className="font-mono text-sm text-museum-dark-gray">{processId}</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-museum-dark-gray">Status</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  etchingState === 'Completed'
                    ? 'bg-green-100 text-green-800'
                    : etchingState === 'Failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {etchingState || 'Pending'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            {etchingState === 'Completed' && (
              <Button
                onClick={() => router.push('/explorer')}
                size="lg"
                className="flex-1"
              >
                View in Explorer
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            <Button
              onClick={handleReset}
              variant="outline"
              size="lg"
              className={etchingState === 'Completed' ? 'flex-1' : 'w-full'}
            >
              Create Another Rune
            </Button>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Create Bitcoin Rune
        </h1>
        <p className="text-museum-dark-gray">
          Etch a new Rune on the Bitcoin blockchain via QURI Protocol
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-6">
            Basic Information
          </h2>

          <div className="space-y-6">
            {/* Rune Name */}
            <div>
              <label className="block text-sm font-medium text-museum-black mb-2">
                Rune Name *
              </label>
              <input
                type="text"
                value={runeName}
                onChange={(e) => setRuneName(e.target.value.toUpperCase())}
                placeholder="EXAMPLE•RUNE"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                  validationErrors.runeName
                    ? 'border-red-300 bg-red-50'
                    : 'border-museum-light-gray'
                }`}
              />
              {validationErrors.runeName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.runeName}</p>
              )}
              <p className="mt-1 text-xs text-museum-dark-gray">
                1-28 characters. Use A-Z and • (spacer). Example: MY•RUNE
              </p>
            </div>

            {/* Symbol */}
            <div>
              <label className="block text-sm font-medium text-museum-black mb-2">
                Symbol *
              </label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.slice(0, 1).toUpperCase())}
                placeholder="₿"
                maxLength={1}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                  validationErrors.symbol
                    ? 'border-red-300 bg-red-50'
                    : 'border-museum-light-gray'
                }`}
              />
              {validationErrors.symbol && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.symbol}</p>
              )}
              <p className="mt-1 text-xs text-museum-dark-gray">
                Single character symbol (e.g., ₿, Ꝛ, ⧉)
              </p>
            </div>

            {/* Divisibility */}
            <div>
              <label className="block text-sm font-medium text-museum-black mb-2">
                Divisibility *
              </label>
              <input
                type="number"
                value={divisibility}
                onChange={(e) => setDivisibility(e.target.value)}
                min="0"
                max="38"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                  validationErrors.divisibility
                    ? 'border-red-300 bg-red-50'
                    : 'border-museum-light-gray'
                }`}
              />
              {validationErrors.divisibility && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.divisibility}</p>
              )}
              <p className="mt-1 text-xs text-museum-dark-gray">
                Number of decimal places (0-38). 0 means whole units only.
              </p>
            </div>

            {/* Premine */}
            <div>
              <label className="block text-sm font-medium text-museum-black mb-2">
                Premine Amount *
              </label>
              <input
                type="text"
                value={premine}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setPremine(value);
                }}
                placeholder="1000000"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                  validationErrors.premine
                    ? 'border-red-300 bg-red-50'
                    : 'border-museum-light-gray'
                }`}
              />
              {validationErrors.premine && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.premine}</p>
              )}
              <p className="mt-1 text-xs text-museum-dark-gray">
                Initial supply minted to creator. Set to 0 for no premine.
              </p>
            </div>
          </div>
        </div>

        {/* Mint Terms (Optional) */}
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <button
            type="button"
            onClick={() => setEnableMintTerms(!enableMintTerms)}
            className="flex items-center justify-between w-full mb-4"
          >
            <div>
              <h2 className="font-serif text-2xl font-bold text-museum-black">
                Mint Terms (Optional)
              </h2>
              <p className="text-sm text-museum-dark-gray mt-1">
                Allow others to mint additional supply
              </p>
            </div>
            {enableMintTerms ? (
              <ChevronUp className="h-6 w-6 text-museum-dark-gray" />
            ) : (
              <ChevronDown className="h-6 w-6 text-museum-dark-gray" />
            )}
          </button>

          {enableMintTerms && (
            <div className="space-y-6 pt-4 border-t border-museum-light-gray">
              {/* Mint Amount */}
              <div>
                <label className="block text-sm font-medium text-museum-black mb-2">
                  Mint Amount per Mint *
                </label>
                <input
                  type="text"
                  value={mintAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setMintAmount(value);
                  }}
                  placeholder="1000"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                    validationErrors.mintAmount
                      ? 'border-red-300 bg-red-50'
                      : 'border-museum-light-gray'
                  }`}
                />
                {validationErrors.mintAmount && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.mintAmount}</p>
                )}
                <p className="mt-1 text-xs text-museum-dark-gray">
                  Amount minted per mint transaction
                </p>
              </div>

              {/* Mint Cap */}
              <div>
                <label className="block text-sm font-medium text-museum-black mb-2">
                  Total Mint Cap *
                </label>
                <input
                  type="text"
                  value={mintCap}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '');
                    setMintCap(value);
                  }}
                  placeholder="1000000"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                    validationErrors.mintCap
                      ? 'border-red-300 bg-red-50'
                      : 'border-museum-light-gray'
                  }`}
                />
                {validationErrors.mintCap && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.mintCap}</p>
                )}
                <p className="mt-1 text-xs text-museum-dark-gray">
                  Maximum number of times this Rune can be minted
                </p>
              </div>

              {/* Height Range (Optional) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-museum-black mb-2">
                    Start Height (Optional)
                  </label>
                  <input
                    type="text"
                    value={heightStart}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setHeightStart(value);
                    }}
                    placeholder="800000"
                    className="w-full px-4 py-3 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none"
                  />
                  <p className="mt-1 text-xs text-museum-dark-gray">
                    Bitcoin block height when minting starts
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-museum-black mb-2">
                    End Height (Optional)
                  </label>
                  <input
                    type="text"
                    value={heightEnd}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setHeightEnd(value);
                    }}
                    placeholder="900000"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none ${
                      validationErrors.heightEnd
                        ? 'border-red-300 bg-red-50'
                        : 'border-museum-light-gray'
                    }`}
                  />
                  {validationErrors.heightEnd && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.heightEnd}</p>
                  )}
                  <p className="mt-1 text-xs text-museum-dark-gray">
                    Bitcoin block height when minting ends
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Rune creation requires Bitcoin transaction fees</li>
              <li>The process may take several minutes to complete</li>
              <li>Rune names are permanent and cannot be changed</li>
              <li>Make sure all parameters are correct before submitting</li>
            </ul>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleReset}
            className="flex-1"
          >
            Reset Form
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader className="animate-spin h-5 w-5 mr-2" />
                Creating Rune...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 mr-2" />
                Create Rune
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
