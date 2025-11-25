'use client';

/**
 * Create Virtual Rune Page
 *
 * Clear step-by-step wizard for creating Virtual Runes on ICP
 * with explanation of settlement to Bitcoin
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  Info,
  Zap,
  Clock,
  Bitcoin,
  Database,
  HelpCircle,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { ButtonPremium } from '@/components/ui/ButtonPremium';
import { useDualAuth } from '@/lib/auth';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { WalletButton } from '@/components/wallet';
import type { RuneEtching, MintTerms } from '@/types/canisters';
import { toast } from 'sonner';

// ============================================================================
// Schema & Types
// ============================================================================

// Security constants
const MAX_SUPPLY = BigInt('340282366920938463463374607431768211455'); // u128 max
const MAX_SAFE_INPUT = '340282366920938463463374607431768211455';
const RUNE_NAME_BLACKLIST = ['BITCOIN', 'BTC', 'SATOSHI', 'NAKAMOTO']; // Reserved names

// Sanitize numeric input to prevent overflow
const sanitizeNumericInput = (value: string): string => {
  const cleaned = value.replace(/[^0-9]/g, '');
  if (cleaned.length > MAX_SAFE_INPUT.length) {
    return MAX_SAFE_INPUT;
  }
  if (cleaned.length === MAX_SAFE_INPUT.length && cleaned > MAX_SAFE_INPUT) {
    return MAX_SAFE_INPUT;
  }
  return cleaned;
};

const createRuneSchema = z.object({
  // Step 1: Basic Info
  rune_name: z.string()
    .min(1, 'Rune name is required')
    .max(28, 'Maximum 28 characters')
    .regex(/^[A-Z]+$|^[A-Z]+•[A-Z]+$|^[A-Z]+•[A-Z]+•[A-Z]+$/,
      'Only uppercase A-Z and • as separator (e.g., MY•RUNE)')
    .refine(
      (name) => !RUNE_NAME_BLACKLIST.some(reserved =>
        name.replace(/•/g, '').includes(reserved)
      ),
      'This name contains reserved words'
    ),

  symbol: z.string()
    .max(1, 'Maximum 1 character')
    .regex(/^[A-Z]?$/, 'Only uppercase A-Z (leave empty for none)')
    .optional()
    .or(z.literal('')),

  // Step 2: Supply
  divisibility: z.number()
    .int()
    .min(0, 'Minimum 0')
    .max(38, 'Maximum 38'),

  premine: z.string()
    .regex(/^\d*$/, 'Only numbers')
    .refine(
      (val) => !val || BigInt(val || '0') <= MAX_SUPPLY,
      'Exceeds maximum supply (u128)'
    )
    .optional()
    .or(z.literal('')),

  // Step 3: Mint Terms (Optional)
  enable_mint: z.boolean().default(false),
  mint_amount: z.string()
    .regex(/^\d*$/, 'Only numbers')
    .refine(
      (val) => !val || BigInt(val || '0') <= MAX_SUPPLY,
      'Exceeds maximum value'
    )
    .optional()
    .or(z.literal('')),
  mint_cap: z.string()
    .regex(/^\d*$/, 'Only numbers')
    .refine(
      (val) => !val || BigInt(val || '0') <= MAX_SUPPLY,
      'Exceeds maximum value'
    )
    .optional()
    .or(z.literal('')),
}).refine(
  (data) => {
    // Validate total supply doesn't overflow
    if (data.enable_mint && data.mint_amount && data.mint_cap) {
      try {
        const mintAmount = BigInt(data.mint_amount || '0');
        const mintCap = BigInt(data.mint_cap || '0');
        const premine = BigInt(data.premine || '0');
        const totalMintable = mintAmount * mintCap;
        const totalSupply = premine + totalMintable;
        return totalSupply <= MAX_SUPPLY;
      } catch {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Total supply exceeds maximum (u128 overflow)',
    path: ['mint_cap'],
  }
);

type CreateRuneFormData = z.infer<typeof createRuneSchema>;

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  form: ReturnType<typeof useForm<CreateRuneFormData>>;
  onNext: () => void;
  onBack?: () => void;
}

// Step 0: Introduction - What are Virtual Runes?
function StepIntro({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <div className="inline-flex p-4 bg-gradient-to-br from-gold-100 to-gold-200 rounded-2xl mb-4">
          <Sparkles className="h-12 w-12 text-gold-600" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-museum-black mb-2">
          Create a Virtual Rune
        </h2>
        <p className="text-museum-dark-gray max-w-md mx-auto">
          Design your Rune on ICP, then settle to Bitcoin when ready
        </p>
      </div>

      {/* How it works */}
      <div className="bg-museum-cream rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-museum-black flex items-center gap-2">
          <Info className="h-5 w-5 text-gold-600" />
          How Virtual Runes Work
        </h3>

        <div className="grid gap-4">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-medium text-museum-black">Create on ICP (Low Cost)</p>
              <p className="text-sm text-museum-dark-gray">
                Your Rune is stored on ICP canisters. Uses minimal cycles (~0.001 ICP).
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-gold-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-medium text-museum-black">Test & Trade</p>
              <p className="text-sm text-museum-dark-gray">
                Trade your Virtual Rune on QURI DEX while you build community.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-bitcoin-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-medium text-museum-black">Settle to Bitcoin</p>
              <p className="text-sm text-museum-dark-gray">
                When ready, etch your Rune permanently on Bitcoin (requires ckBTC).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <Zap className="h-5 w-5 text-green-600 mb-2" />
          <p className="font-medium text-green-800 text-sm">Instant Creation</p>
          <p className="text-xs text-green-600">No waiting for Bitcoin blocks</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <Clock className="h-5 w-5 text-blue-600 mb-2" />
          <p className="font-medium text-blue-800 text-sm">Low Cost</p>
          <p className="text-xs text-blue-600">~0.001 ICP now, ckBTC fees when settling</p>
        </div>
      </div>

      <ButtonPremium
        onClick={onNext}
        variant="gold"
        size="lg"
        className="w-full"
        icon={<ArrowRight className="h-5 w-5" />}
        iconPosition="right"
      >
        Start Creating
      </ButtonPremium>
    </motion.div>
  );
}

// Step 1: Basic Information
function StepBasicInfo({ form, onNext, onBack }: StepProps) {
  const { register, formState: { errors }, watch, trigger } = form;
  const runeName = watch('rune_name');
  const symbol = watch('symbol');

  const handleNext = async () => {
    const isValid = await trigger(['rune_name', 'symbol']);
    if (isValid) onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-1">
          Basic Information
        </h2>
        <p className="text-sm text-museum-dark-gray">
          Choose a unique name and symbol for your Rune
        </p>
      </div>

      {/* Rune Name */}
      <div>
        <label className="block text-sm font-semibold text-museum-black mb-2">
          Rune Name <span className="text-red-500">*</span>
        </label>
        <input
          {...register('rune_name')}
          placeholder="MYTOKEN or MY•TOKEN"
          className={`w-full px-4 py-3 border-2 rounded-xl text-lg font-mono uppercase [color-scheme:light]
            focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition-all
            ${errors.rune_name ? 'border-red-300 bg-red-50 text-red-900' : 'border-museum-light-gray hover:border-gold-200 bg-white text-museum-black'}`}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z•]/g, '');
            e.target.value = value;
            form.setValue('rune_name', value, { shouldValidate: true });
          }}
        />
        {errors.rune_name && (
          <p className="mt-1 text-sm text-red-600">{errors.rune_name.message}</p>
        )}
        <p className="mt-1 text-xs text-museum-dark-gray">
          Only A-Z letters. Use • to separate words (Alt+8 on Mac, Alt+0149 on Windows)
        </p>
      </div>

      {/* Symbol */}
      <div>
        <label className="block text-sm font-semibold text-museum-black mb-2">
          Symbol <span className="text-museum-dark-gray text-xs">(optional)</span>
        </label>
        <input
          {...register('symbol')}
          placeholder="T"
          maxLength={1}
          className={`w-full px-4 py-3 border-2 rounded-xl text-2xl text-center font-mono uppercase [color-scheme:light]
            focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition-all
            ${errors.symbol ? 'border-red-300 bg-red-50 text-red-900' : 'border-museum-light-gray hover:border-gold-200 bg-white text-museum-black'}`}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
            e.target.value = value;
            form.setValue('symbol', value, { shouldValidate: true });
          }}
        />
        {errors.symbol && (
          <p className="mt-1 text-sm text-red-600">{errors.symbol.message}</p>
        )}
        <p className="mt-1 text-xs text-museum-dark-gray">
          Single letter A-Z to represent your Rune (leave empty for none)
        </p>
      </div>

      {/* Preview */}
      {runeName && (
        <div className="bg-museum-cream rounded-xl p-4">
          <p className="text-xs text-museum-dark-gray mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gold-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl font-bold text-gold-600">
                {symbol || runeName.charAt(0)}
              </span>
            </div>
            <div>
              <p className="font-bold text-museum-black">{runeName}</p>
              <p className="text-xs text-museum-dark-gray">Your new Rune</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <ButtonPremium
          onClick={onBack}
          variant="secondary"
          size="lg"
          className="flex-1"
          icon={<ArrowLeft className="h-5 w-5" />}
        >
          Back
        </ButtonPremium>
        <ButtonPremium
          onClick={handleNext}
          variant="gold"
          size="lg"
          className="flex-1"
          icon={<ArrowRight className="h-5 w-5" />}
          iconPosition="right"
        >
          Next
        </ButtonPremium>
      </div>
    </motion.div>
  );
}

// Step 2: Supply Configuration
function StepSupply({ form, onNext, onBack }: StepProps) {
  const { register, formState: { errors }, watch, trigger, setValue } = form;
  const premine = watch('premine');
  const divisibility = watch('divisibility');

  const handleNext = async () => {
    const isValid = await trigger(['divisibility', 'premine']);
    if (isValid) onNext();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-1">
          Supply Configuration
        </h2>
        <p className="text-sm text-museum-dark-gray">
          Define the initial supply and decimal places
        </p>
      </div>

      {/* Divisibility */}
      <div>
        <label className="block text-sm font-semibold text-museum-black mb-2">
          Divisibility (Decimals)
        </label>
        <input
          type="number"
          {...register('divisibility', { valueAsNumber: true })}
          min={0}
          max={38}
          placeholder="0"
          className={`w-full px-4 py-3 border-2 rounded-xl text-lg [color-scheme:light]
            focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition-all
            ${errors.divisibility ? 'border-red-300 bg-red-50 text-red-900' : 'border-museum-light-gray hover:border-gold-200 bg-white text-museum-black'}`}
        />
        {errors.divisibility && (
          <p className="mt-1 text-sm text-red-600">{errors.divisibility.message}</p>
        )}
        <p className="mt-1 text-xs text-museum-dark-gray">
          0-38 decimal places. Common: 0 (NFT), 8 (Bitcoin), 18 (Ethereum)
        </p>
      </div>

      {/* Premine */}
      <div>
        <label className="block text-sm font-semibold text-museum-black mb-2">
          Initial Supply (Premine)
        </label>
        <input
          {...register('premine')}
          placeholder="1000000"
          className={`w-full px-4 py-3 border-2 rounded-xl text-lg [color-scheme:light]
            focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition-all
            ${errors.premine ? 'border-red-300 bg-red-50 text-red-900' : 'border-museum-light-gray hover:border-gold-200 bg-white text-museum-black'}`}
          onChange={(e) => {
            const value = sanitizeNumericInput(e.target.value);
            e.target.value = value;
            setValue('premine', value);
          }}
        />
        {errors.premine && (
          <p className="mt-1 text-sm text-red-600">{errors.premine.message}</p>
        )}
        <p className="mt-1 text-xs text-museum-dark-gray">
          Tokens minted directly to your wallet. Leave empty for 0.
        </p>
      </div>

      {/* Supply Preview */}
      {premine && BigInt(premine || '0') > 0n && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-800">
            You will receive: {BigInt(premine).toLocaleString()} tokens
          </p>
          {divisibility > 0 && (
            <p className="text-xs text-green-600 mt-1">
              Smallest unit: {(1 / Math.pow(10, divisibility)).toFixed(divisibility)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <ButtonPremium
          onClick={onBack}
          variant="secondary"
          size="lg"
          className="flex-1"
          icon={<ArrowLeft className="h-5 w-5" />}
        >
          Back
        </ButtonPremium>
        <ButtonPremium
          onClick={handleNext}
          variant="gold"
          size="lg"
          className="flex-1"
          icon={<ArrowRight className="h-5 w-5" />}
          iconPosition="right"
        >
          Next
        </ButtonPremium>
      </div>
    </motion.div>
  );
}

// Step 3: Mint Terms (Optional)
function StepMintTerms({ form, onNext, onBack }: StepProps) {
  const { register, watch, setValue, trigger } = form;
  const enableMint = watch('enable_mint');
  const mintAmount = watch('mint_amount');
  const mintCap = watch('mint_cap');

  const handleNext = async () => {
    if (enableMint) {
      const isValid = await trigger(['mint_amount', 'mint_cap']);
      if (isValid) onNext();
    } else {
      onNext();
    }
  };

  const totalMintable = mintAmount && mintCap
    ? BigInt(mintAmount || '0') * BigInt(mintCap || '0')
    : 0n;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-1">
          Public Minting
        </h2>
        <p className="text-sm text-museum-dark-gray">
          Allow others to mint additional tokens
        </p>
      </div>

      {/* Enable Toggle */}
      <div className="bg-museum-cream rounded-xl p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium text-museum-black">Enable Public Minting</p>
            <p className="text-xs text-museum-dark-gray mt-1">
              Anyone can mint tokens after creation
            </p>
          </div>
          <input
            type="checkbox"
            {...register('enable_mint')}
            className="w-5 h-5 text-gold-600 rounded border-museum-light-gray
              focus:ring-gold-500 cursor-pointer"
          />
        </label>
      </div>

      {enableMint && (
        <div className="space-y-4">
          {/* Mint Amount */}
          <div>
            <label className="block text-sm font-semibold text-museum-black mb-2">
              Tokens Per Mint
            </label>
            <input
              {...register('mint_amount')}
              placeholder="100"
              className="w-full px-4 py-3 border-2 border-museum-light-gray rounded-xl [color-scheme:light]
                focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition-all
                hover:border-gold-200 bg-white text-museum-black"
              onChange={(e) => {
                const value = sanitizeNumericInput(e.target.value);
                e.target.value = value;
                setValue('mint_amount', value);
              }}
            />
            <p className="mt-1 text-xs text-museum-dark-gray">
              How many tokens each mint transaction creates
            </p>
          </div>

          {/* Mint Cap */}
          <div>
            <label className="block text-sm font-semibold text-museum-black mb-2">
              Maximum Mints
            </label>
            <input
              {...register('mint_cap')}
              placeholder="10000"
              className="w-full px-4 py-3 border-2 border-museum-light-gray rounded-xl [color-scheme:light]
                focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition-all
                hover:border-gold-200 bg-white text-museum-black"
              onChange={(e) => {
                const value = sanitizeNumericInput(e.target.value);
                e.target.value = value;
                setValue('mint_cap', value);
              }}
            />
            <p className="mt-1 text-xs text-museum-dark-gray">
              Total number of mint transactions allowed
            </p>
          </div>

          {/* Calculation Preview */}
          {totalMintable > 0n && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-800">
                Total Mintable Supply: {totalMintable.toLocaleString()} tokens
              </p>
              <p className="text-xs text-purple-600 mt-1">
                {mintAmount} tokens × {mintCap} mints
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <ButtonPremium
          onClick={onBack}
          variant="secondary"
          size="lg"
          className="flex-1"
          icon={<ArrowLeft className="h-5 w-5" />}
        >
          Back
        </ButtonPremium>
        <ButtonPremium
          onClick={handleNext}
          variant="gold"
          size="lg"
          className="flex-1"
          icon={<ArrowRight className="h-5 w-5" />}
          iconPosition="right"
        >
          Review
        </ButtonPremium>
      </div>
    </motion.div>
  );
}

// Step 4: Review & Create
function StepReview({ form, onBack, onSubmit, isLoading }: StepProps & { onSubmit: () => void; isLoading: boolean }) {
  const { watch } = form;
  const values = watch();

  const premine = BigInt(values.premine || '0');
  const mintAmount = BigInt(values.mint_amount || '0');
  const mintCap = BigInt(values.mint_cap || '0');
  const totalMintable = values.enable_mint ? mintAmount * mintCap : 0n;
  const totalSupply = premine + totalMintable;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-1">
          Review Your Rune
        </h2>
        <p className="text-sm text-museum-dark-gray">
          Confirm the details before creating
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-museum-cream rounded-2xl p-6 space-y-4">
        {/* Name & Symbol */}
        <div className="flex items-center gap-4 pb-4 border-b border-museum-light-gray">
          <div className="w-16 h-16 bg-gold-100 rounded-xl flex items-center justify-center">
            <span className="text-3xl font-bold text-gold-600">
              {values.symbol || values.rune_name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <p className="font-serif text-2xl font-bold text-museum-black">
              {values.rune_name || 'UNNAMED'}
            </p>
            <p className="text-sm text-museum-dark-gray">Virtual Rune on ICP</p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-museum-dark-gray">Divisibility</span>
            <span className="font-medium text-museum-black">{values.divisibility} decimals</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-museum-dark-gray">Initial Supply</span>
            <span className="font-medium text-museum-black">
              {premine > 0n ? premine.toLocaleString() : '0'}
            </span>
          </div>
          {values.enable_mint && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-museum-dark-gray">Mintable Supply</span>
                <span className="font-medium text-museum-black">
                  {totalMintable.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-museum-dark-gray">Per Mint</span>
                <span className="font-medium text-museum-black">
                  {mintAmount.toLocaleString()} × {mintCap.toLocaleString()} mints
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between pt-3 border-t border-museum-light-gray">
            <span className="text-sm font-semibold text-museum-black">Max Total Supply</span>
            <span className="font-bold text-gold-600">
              {totalSupply.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">This creates a Virtual Rune</p>
            <p className="text-xs text-blue-600">
              Your Rune will be stored on ICP. You can settle it to Bitcoin later
              from the Settlement page when you're ready to pay Bitcoin fees.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <ButtonPremium
          onClick={onBack}
          variant="secondary"
          size="lg"
          className="flex-1"
          icon={<ArrowLeft className="h-5 w-5" />}
          disabled={isLoading}
        >
          Back
        </ButtonPremium>
        <ButtonPremium
          onClick={onSubmit}
          variant="gold"
          size="lg"
          className="flex-1"
          icon={isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Virtual Rune'}
        </ButtonPremium>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function CreateRunePage() {
  const router = useRouter();
  const { isConnected } = useDualAuth();
  const { createVirtualRune, loading, error } = useRuneEngine();

  const [currentStep, setCurrentStep] = useState(0);
  const [createdRuneId, setCreatedRuneId] = useState<string | null>(null);

  const form = useForm<CreateRuneFormData>({
    resolver: zodResolver(createRuneSchema),
    mode: 'onChange',
    defaultValues: {
      rune_name: '',
      symbol: '',
      divisibility: 0,
      premine: '',
      enable_mint: false,
      mint_amount: '',
      mint_cap: '',
    },
  });

  const handleSubmit = async () => {
    const values = form.getValues();

    // Build etching data
    const etching: RuneEtching = {
      rune_name: values.rune_name,
      symbol: values.symbol || '',
      divisibility: values.divisibility,
      premine: values.premine ? BigInt(values.premine) : 0n,
      terms: values.enable_mint && values.mint_amount && values.mint_cap
        ? [{
            amount: BigInt(values.mint_amount),
            cap: BigInt(values.mint_cap),
            height_start: [],
            height_end: [],
            offset_start: [],
            offset_end: [],
          } as MintTerms]
        : [],
    };

    try {
      toast.loading('Creating Virtual Rune...', { id: 'create-rune' });
      const runeId = await createVirtualRune(etching);

      if (runeId) {
        toast.success(`Virtual Rune "${values.rune_name}" created successfully!`, { id: 'create-rune' });
        setCreatedRuneId(runeId);
        setCurrentStep(5); // Success step
      } else {
        // Error is set in the hook
        toast.error(error || 'Failed to create Virtual Rune', { id: 'create-rune' });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create Virtual Rune';
      toast.error(errorMsg, { id: 'create-rune' });
      console.error('Failed to create rune:', err);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-8 text-center">
          <Wallet className="h-16 w-16 text-museum-dark-gray mx-auto mb-6" />
          <h1 className="font-serif text-2xl font-bold text-museum-black mb-3">
            Connect Your Wallet
          </h1>
          <p className="text-museum-dark-gray mb-6">
            Connect with Internet Identity to create Virtual Runes
          </p>
          <WalletButton variant="default" />
        </div>
      </div>
    );
  }

  // Success state
  if (currentStep === 5 && createdRuneId) {
    return (
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-museum-white border-2 border-green-200 rounded-2xl p-8 text-center"
        >
          <div className="inline-flex p-4 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-museum-black mb-3">
            Rune Created!
          </h1>
          <p className="text-museum-dark-gray mb-6">
            Your Virtual Rune has been created on ICP
          </p>

          <div className="bg-museum-cream rounded-xl p-4 mb-6">
            <p className="text-sm text-museum-dark-gray mb-1">Rune ID</p>
            <p className="font-mono text-sm break-all text-museum-black">
              {createdRuneId}
            </p>
          </div>

          <div className="space-y-3">
            <ButtonPremium
              onClick={() => router.push('/explorer')}
              variant="gold"
              size="lg"
              className="w-full"
              icon={<ArrowRight className="h-5 w-5" />}
              iconPosition="right"
            >
              View in Explorer
            </ButtonPremium>
            <ButtonPremium
              onClick={() => router.push('/settlement')}
              variant="secondary"
              size="lg"
              className="w-full"
              icon={<Bitcoin className="h-5 w-5" />}
            >
              Settle to Bitcoin
            </ButtonPremium>
            <button
              onClick={() => {
                setCurrentStep(0);
                setCreatedRuneId(null);
                form.reset();
              }}
              className="text-sm text-museum-dark-gray hover:text-museum-black transition-colors"
            >
              Create Another Rune
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Progress indicator
  const steps = ['Intro', 'Name', 'Supply', 'Mint', 'Review'];

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress Bar */}
      {currentStep > 0 && currentStep < 5 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {steps.slice(1).map((step, index) => {
              const stepNum = index + 1;
              const isCompleted = currentStep > stepNum;
              const isCurrent = currentStep === stepNum;

              return (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isCompleted ? 'bg-green-500 text-white' :
                      isCurrent ? 'bg-gold-500 text-white' :
                      'bg-museum-light-gray text-museum-dark-gray'}`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNum}
                  </div>
                  {index < steps.length - 2 && (
                    <div className={`w-12 h-1 mx-1 rounded
                      ${currentStep > stepNum + 1 ? 'bg-green-500' :
                        currentStep > stepNum ? 'bg-gold-500' :
                        'bg-museum-light-gray'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-center text-museum-dark-gray">
            Step {currentStep} of {steps.length - 1}: {steps[currentStep]}
          </p>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-museum-white border-2 border-museum-light-gray rounded-2xl p-6 md:p-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Steps */}
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <StepIntro key="intro" onNext={() => setCurrentStep(1)} />
          )}
          {currentStep === 1 && (
            <StepBasicInfo
              key="basic"
              form={form}
              onNext={() => setCurrentStep(2)}
              onBack={() => setCurrentStep(0)}
            />
          )}
          {currentStep === 2 && (
            <StepSupply
              key="supply"
              form={form}
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <StepMintTerms
              key="mint"
              form={form}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 4 && (
            <StepReview
              key="review"
              form={form}
              onNext={() => {}}
              onBack={() => setCurrentStep(3)}
              onSubmit={handleSubmit}
              isLoading={loading}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
