'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { AlertCircle, Info, ArrowRight, Bitcoin } from 'lucide-react';
import { RuneEtching } from '@/types/canisters';
import { formatSatoshis } from '@/lib/utils';

interface TransactionPreviewProps {
  etching: RuneEtching;
  estimatedFee?: bigint;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TransactionPreview({
  etching,
  estimatedFee,
  onConfirm,
  onCancel,
  isLoading,
}: TransactionPreviewProps) {
  const hasMinTerms = etching.terms && etching.terms.length > 0;
  const terms = hasMinTerms ? etching.terms[0] : null;

  const totalSupply = hasMinTerms
    ? etching.premine + terms!.amount * terms!.cap
    : etching.premine;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-6 w-6 text-bitcoin-500" />
            Review Your Rune Creation
          </CardTitle>
          <CardDescription>
            Please review the details carefully before confirming. Bitcoin transactions are
            irreversible.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Details */}
          <div className="space-y-4 rounded-lg bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">Rune Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Rune Name</p>
                <p className="font-mono font-semibold text-gray-900">{etching.rune_name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Symbol</p>
                <p className="font-mono font-semibold text-gray-900">{etching.symbol}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Divisibility</p>
                <p className="font-mono font-semibold text-gray-900">
                  {etching.divisibility} decimal places
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Premine</p>
                <p className="font-mono font-semibold text-gray-900">
                  {formatSatoshis(etching.premine)}
                </p>
              </div>
            </div>
          </div>

          {/* Mint Terms */}
          {hasMinTerms && terms && (
            <div className="space-y-4 rounded-lg bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900">Mint Terms</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Amount per Mint</p>
                  <p className="font-mono font-semibold text-blue-900">
                    {formatSatoshis(terms.amount)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-blue-700">Max Mints</p>
                  <p className="font-mono font-semibold text-blue-900">
                    {formatSatoshis(terms.cap)}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-blue-700">Total Mintable Supply</p>
                  <p className="font-mono font-semibold text-blue-900">
                    {formatSatoshis(terms.amount * terms.cap)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Total Supply */}
          <div className="rounded-lg border-2 border-bitcoin-500 bg-bitcoin-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-bitcoin-700">Total Supply</p>
                <p className="text-xs text-bitcoin-600">Premine + Mintable Supply</p>
              </div>
              <p className="font-mono text-2xl font-bold text-bitcoin-900">
                {formatSatoshis(totalSupply)}
              </p>
            </div>
          </div>

          {/* Fee Estimation */}
          <div className="space-y-2 rounded-lg bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">Transaction Fee</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Estimated Bitcoin network fee:{' '}
                  <span className="font-mono font-semibold">
                    {estimatedFee ? `${formatSatoshis(estimatedFee)} sats` : 'Calculating...'}
                  </span>
                </p>
                <p className="mt-1 text-xs text-yellow-600">
                  Final fee may vary based on network congestion
                </p>
              </div>
            </div>
          </div>

          {/* Important Warning */}
          <div className="space-y-2 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">Important Notice</h3>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  <li>• Bitcoin transactions are irreversible once confirmed</li>
                  <li>• Rune parameters cannot be changed after creation</li>
                  <li>• Make sure you have enough ckBTC balance for the fee</li>
                  <li>• The etching process may take several minutes</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              isLoading={isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? (
                'Processing...'
              ) : (
                <>
                  Confirm & Create Rune
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-gray-500">
            By confirming, you agree that you have reviewed all details and understand the
            transaction is irreversible.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
