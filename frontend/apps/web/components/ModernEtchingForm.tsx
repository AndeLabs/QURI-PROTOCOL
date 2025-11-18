/**
 * Modern Etching Form with React Query Integration
 * Clean, simple form using mutation hooks and toast notifications
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Label } from './ui/Label';
import { useEtchRuneMutation } from '@/hooks/queries';
import { useEtchingStore } from '@/lib/store/useEtchingStore';
import { validateRuneName, validateSymbol } from '@/lib/utils';
import { AlertCircle, Sparkles, Loader2, Info } from 'lucide-react';
import type { RuneEtching } from '@/types/canisters';

const etchingSchema = z.object({
  rune_name: z
    .string()
    .min(1, 'Rune name is required')
    .max(26, 'Rune name must be at most 26 characters')
    .refine((val) => validateRuneName(val) === null, {
      message: 'Invalid rune name format. Use UPPERCASE letters and • spacer',
    }),
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(4, 'Symbol must be at most 4 characters')
    .refine((val) => validateSymbol(val) === null, {
      message: 'Invalid symbol format. Use UPPERCASE letters only',
    }),
  divisibility: z
    .number()
    .int()
    .min(0, 'Divisibility must be at least 0')
    .max(18, 'Divisibility must be at most 18'),
  premine: z.number().int().min(0, 'Premine must be non-negative'),
  mintAmount: z.number().int().min(0).optional(),
  mintCap: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    // If one mint term is set, both must be set
    const hasAmount = data.mintAmount && data.mintAmount > 0;
    const hasCap = data.mintCap && data.mintCap > 0;
    if (hasAmount !== hasCap) return false;
    return true;
  },
  {
    message: 'Both Mint Amount and Mint Cap must be set together',
    path: ['mintAmount'],
  }
);

type EtchingFormData = z.infer<typeof etchingSchema>;

export function ModernEtchingForm() {
  const etchMutation = useEtchRuneMutation();
  const { setActiveProcessId } = useEtchingStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<EtchingFormData>({
    resolver: zodResolver(etchingSchema),
    defaultValues: {
      divisibility: 8,
      premine: 0,
    },
  });

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

    try {
      const { processId } = await etchMutation.mutateAsync(etching);
      setActiveProcessId(processId);
      reset();
    } catch (error) {
      // Error toast already shown by mutation
    }
  };

  const runeName = watch('rune_name');
  const symbol = watch('symbol');
  const premine = watch('premine');
  const mintAmount = watch('mintAmount');
  const mintCap = watch('mintCap');

  // Calculate total supply
  const totalSupply = (premine || 0) + (mintCap || 0);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-orange-500" />
          Create New Rune
        </CardTitle>
        <CardDescription>
          Etch a new Rune on Bitcoin using the Rune Protocol
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Rune Name */}
          <div className="space-y-2">
            <Label htmlFor="rune_name">
              Rune Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rune_name"
              {...register('rune_name')}
              placeholder="BITCOIN•RUNES"
              className="font-mono uppercase"
              disabled={etchMutation.isPending}
            />
            {errors.rune_name && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.rune_name.message}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Use UPPERCASE letters and • as spacer (max 26 characters)
            </p>
          </div>

          {/* Symbol */}
          <div className="space-y-2">
            <Label htmlFor="symbol">
              Symbol <span className="text-red-500">*</span>
            </Label>
            <Input
              id="symbol"
              {...register('symbol')}
              placeholder="RUNE"
              className="font-mono uppercase"
              maxLength={4}
              disabled={etchMutation.isPending}
            />
            {errors.symbol && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.symbol.message}
              </p>
            )}
            <p className="text-xs text-gray-500">1-4 UPPERCASE letters only</p>
          </div>

          {/* Basic Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Divisibility */}
            <div className="space-y-2">
              <Label htmlFor="divisibility">
                Divisibility <span className="text-red-500">*</span>
              </Label>
              <Input
                id="divisibility"
                type="number"
                {...register('divisibility', { valueAsNumber: true })}
                min={0}
                max={18}
                disabled={etchMutation.isPending}
              />
              {errors.divisibility && (
                <p className="text-sm text-red-500">{errors.divisibility.message}</p>
              )}
              <p className="text-xs text-gray-500">Decimal places (0-18)</p>
            </div>

            {/* Premine */}
            <div className="space-y-2">
              <Label htmlFor="premine">Premine</Label>
              <Input
                id="premine"
                type="number"
                {...register('premine', { valueAsNumber: true })}
                min={0}
                disabled={etchMutation.isPending}
              />
              {errors.premine && (
                <p className="text-sm text-red-500">{errors.premine.message}</p>
              )}
              <p className="text-xs text-gray-500">Initial mint to creator</p>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2"
            >
              {showAdvanced ? '−' : '+'} Open Mint Terms (Optional)
            </button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2 text-sm text-gray-600 mb-3">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p>
                    Allow public minting after creation. Both fields required if enabled.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mintAmount">Amount per Mint</Label>
                    <Input
                      id="mintAmount"
                      type="number"
                      {...register('mintAmount', { valueAsNumber: true })}
                      min={0}
                      placeholder="0"
                      disabled={etchMutation.isPending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mintCap">Total Mint Cap</Label>
                    <Input
                      id="mintCap"
                      type="number"
                      {...register('mintCap', { valueAsNumber: true })}
                      min={0}
                      placeholder="0"
                      disabled={etchMutation.isPending}
                    />
                  </div>
                </div>

                {errors.mintAmount && (
                  <p className="text-sm text-red-500">{errors.mintAmount.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Preview */}
          {runeName && symbol && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
              <p className="text-sm font-medium text-orange-900">Preview:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{' '}
                  <span className="font-mono font-bold">{runeName}</span>
                </div>
                <div>
                  <span className="text-gray-600">Symbol:</span>{' '}
                  <span className="font-mono font-bold">{symbol}</span>
                </div>
                {premine > 0 && (
                  <div>
                    <span className="text-gray-600">Premine:</span>{' '}
                    <span className="font-bold">{premine.toLocaleString()}</span>
                  </div>
                )}
                {mintCap && mintCap > 0 && (
                  <div>
                    <span className="text-gray-600">Mint Cap:</span>{' '}
                    <span className="font-bold">{mintCap.toLocaleString()}</span>
                  </div>
                )}
                {totalSupply > 0 && (
                  <div className="col-span-2 pt-2 border-t border-orange-200">
                    <span className="text-gray-600">Total Supply:</span>{' '}
                    <span className="font-bold text-orange-900">
                      {totalSupply.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={etchMutation.isPending}
            className="w-full h-12 text-lg"
          >
            {etchMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Rune...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Create Rune on Bitcoin
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Estimated cost: ~20,000 sats ($10-15 USD) • Time: 1-2 minutes
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
