'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useICP } from '@/lib/icp/ICPProvider';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { validateRuneName, validateSymbol } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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
  const [processId, setProcessId] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  const onSubmit = async (data: EtchingFormData) => {
    setSuccess(false);
    setProcessId(null);

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

    const id = await createRune(etching);

    if (id) {
      setProcessId(id);
      setSuccess(true);
      reset();
    }
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Create Your Rune</CardTitle>
        <CardDescription>
          Launch your Bitcoin Rune on the Bitcoin blockchain through Internet Computer
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!isConnected && (
          <div className="mb-6 rounded-lg bg-yellow-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Wallet Required</h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Please connect your wallet to create a Rune
                </p>
              </div>
            </div>
          </div>
        )}

        {success && processId && (
          <div className="mb-6 rounded-lg bg-green-50 p-4">
            <div className="flex">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Rune Creation Initiated!</h3>
                <p className="mt-1 text-sm text-green-700">
                  Process ID: <span className="font-mono">{processId}</span>
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Your Rune is being etched on the Bitcoin blockchain. This may take a few minutes.
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          <Input
            label="Divisibility"
            type="number"
            placeholder="8"
            helperText="Decimal places (0-18). Bitcoin uses 8."
            error={errors.divisibility?.message}
            {...register('divisibility', { valueAsNumber: true })}
          />

          <Input
            label="Premine"
            type="number"
            placeholder="1000000"
            helperText="Initial supply to mint immediately"
            error={errors.premine?.message}
            {...register('premine', { valueAsNumber: true })}
          />

          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              Mint Terms (Optional)
            </h3>

            <div className="space-y-4">
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
                helperText="Maximum number of mints"
                error={errors.mintCap?.message}
                {...register('mintCap', { valueAsNumber: true })}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!isConnected || isLoading}
            isLoading={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Rune...
              </>
            ) : (
              'Create Rune'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
