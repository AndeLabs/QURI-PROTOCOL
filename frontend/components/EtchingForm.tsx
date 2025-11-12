'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { ErrorAlert } from './ui/ErrorAlert';
import { TransactionPreview } from './TransactionPreview';
import { StatusTracker, EtchingStage } from './StatusTracker';
import { useICP } from '@/lib/icp/ICPProvider';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { validateRuneName, validateSymbol } from '@/lib/utils';
import { parseEtchingError } from '@/lib/error-messages';
import { AlertCircle, Sparkles } from 'lucide-react';
import { RuneEtching } from '@/types/canisters';

const etchingSchema = z.object({
  rune_name: z
    .string()
    .min(1, 'Rune name is required')
    .max(26, 'Rune name must be at most 26 characters')
    .refine((val) => validateRuneName(val) === null, {
      message: 'Invalid rune name format',
    }),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(4, 'Symbol must be at most 4 characters')
    .refine((val) => validateSymbol(val) === null, {
      message: 'Invalid symbol format',
    }),
  divisibility: z
    .number()
    .int()
    .min(0, 'Divisibility must be at least 0')
    .max(18, 'Divisibility must be at most 18'),
  premine: z.number().int().min(0, 'Premine must be non-negative'),
  mintAmount: z.number().int().min(0).optional(),
  mintCap: z.number().int().min(0).optional(),
});

type EtchingFormData = z.infer<typeof etchingSchema>;

export function EtchingForm() {
  const { isConnected } = useICP();
  const { createRune, isLoading, error } = useRuneEngine();

  // State management
  const [showPreview, setShowPreview] = useState(false);
  const [pendingEtching, setPendingEtching] = useState<RuneEtching | null>(null);
  const [processId, setProcessId] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<EtchingStage>('validating');
  const [txid, setTxid] = useState<string | undefined>();
  const [confirmations, setConfirmations] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<EtchingFormData>({
    resolver: zodResolver(etchingSchema),
    defaultValues: {
      divisibility: 8,
      premine: 0,
    },
  });

  // Handle form submission - show preview first
  const onSubmit = async (data: EtchingFormData) => {
    const etching: RuneEtching = {
      rune_name: data.rune_name,
      symbol: data.symbol,
      divisibility: data.divisibility,
      premine: BigInt(data.premine),
      terms:
        data.mintAmount && data.mintCap
          ? [
              {
                amount: BigInt(data.mintAmount),
                cap: BigInt(data.mintCap),
                height_start: [],
                height_end: [],
                offset_start: [],
                offset_end: [],
              },
            ]
          : [],
    };

    setPendingEtching(etching);
    setShowPreview(true);
  };

  // Handle confirmed transaction from preview
  const handleConfirmTransaction = async () => {
    if (!pendingEtching) return;

    setShowPreview(false);
    setCurrentStage('validating');

    const id = await createRune(pendingEtching);

    if (id) {
      setProcessId(id);
      setCurrentStage('checking_balance');
      // TODO: Poll for status updates
      // For now, we just show the initial state
      reset();
    }
  };

  // Handle cancel preview
  const handleCancelPreview = () => {
    setShowPreview(false);
    setPendingEtching(null);
  };

  // Handle dismiss error
  const handleDismissError = () => {
    // Error will be cleared by the hook on next action
  };

  // Parse error for better UX
  const parsedError = error ? parseEtchingError(error) : null;

  // Show status tracker if we have a process ID
  if (processId) {
    return (
      <div className="space-y-6">
        <StatusTracker
          processId={processId}
          currentStage={currentStage}
          txid={txid}
          confirmations={confirmations}
          requiredConfirmations={6}
          error={error || undefined}
        />

        {currentStage === 'completed' && (
          <div className="text-center">
            <Button
              onClick={() => {
                setProcessId(null);
                setCurrentStage('validating');
                setTxid(undefined);
                setConfirmations(0);
              }}
              size="lg"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Create Another Rune
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Create Your Rune</CardTitle>
          <CardDescription>
            Launch your Bitcoin Rune on the Bitcoin blockchain through Internet Computer
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Wallet Connection Warning */}
          {!isConnected && (
            <div className="mb-6 rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Connect Wallet to Continue</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    You can explore the form, but you&apos;ll need to connect your wallet using
                    Internet Identity before creating a Rune.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {parsedError && (
            <div className="mb-6">
              <ErrorAlert error={parsedError} onDismiss={handleDismissError} />
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Parameters</h3>

              <Input
                label="Rune Name"
                placeholder="BITCOIN•RUNE"
                helperText="Use only uppercase letters and spacers (•). Max 26 characters."
                error={errors.rune_name?.message}
                {...register('rune_name')}
              />

              <Input
                label="Symbol"
                placeholder="BTC"
                helperText="1-4 characters, alphanumeric only"
                error={errors.symbol?.message}
                {...register('symbol')}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Divisibility"
                  type="number"
                  placeholder="8"
                  helperText="Decimal places (0-18)"
                  error={errors.divisibility?.message}
                  {...register('divisibility', { valueAsNumber: true })}
                />

                <Input
                  label="Premine"
                  type="number"
                  placeholder="1000000"
                  helperText="Initial supply"
                  error={errors.premine?.message}
                  {...register('premine', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Mint Terms */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Mint Terms</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Optional: Allow others to mint your Rune after creation
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Mint Amount"
                  type="number"
                  placeholder="100"
                  helperText="Amount per mint"
                  error={errors.mintAmount?.message}
                  {...register('mintAmount', { valueAsNumber: true })}
                />

                <Input
                  label="Mint Cap"
                  type="number"
                  placeholder="10000"
                  helperText="Maximum mints"
                  error={errors.mintCap?.message}
                  {...register('mintCap', { valueAsNumber: true })}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={!isConnected || isLoading}
            >
              Review Transaction
            </Button>

            {!isConnected && (
              <p className="text-center text-sm text-gray-500">
                Connect your wallet above to enable Rune creation
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Transaction Preview Modal */}
      {showPreview && pendingEtching && (
        <TransactionPreview
          etching={pendingEtching}
          estimatedFee={BigInt(10000)} // TODO: Get actual fee estimate
          onConfirm={handleConfirmTransaction}
          onCancel={handleCancelPreview}
          isLoading={isLoading}
        />
      )}
    </>
  );
}
