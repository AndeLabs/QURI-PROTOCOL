'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { CheckCircle, XCircle, Zap, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * ckBTC Mint Flow Component
 *
 * Enables INSTANT Rune minting with ckBTC (1-2 seconds!)
 * vs traditional Bitcoin (10-60 minutes)
 *
 * Flow:
 * 1. Check user's ckBTC balance
 * 2. User approves QURI canister to spend ckBTC
 * 3. User mints Rune (ckBTC transfer + Rune creation in single call)
 * 4. Success! Rune created instantly
 */

interface RuneEtching {
  rune_name: string;
  symbol: string;
  divisibility: number;
  premine: bigint;
  cap: bigint | null;
  amount_per_mint: bigint | null;
  start_height: bigint | null;
  end_height: bigint | null;
  start_offset: bigint | null;
  end_offset: bigint | null;
  turbo: boolean;
}

interface RuneMetadata {
  name: string;
  description: string | null;
  image: string;
  external_url: string | null;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }> | null;
}

interface CkBTCMintFlowProps {
  runeData: RuneEtching;
  metadata?: RuneMetadata;
  onSuccess: (runeId: string) => void;
  onError: (error: string) => void;
}

// ckBTC Ledger Canister IDs
const CKBTC_LEDGER_MAINNET = 'mxzaz-hqaaa-aaaar-qaada-cai';
const CKBTC_LEDGER_TESTNET = 'mc6ru-gyaaa-aaaar-qaaaq-cai';

// QURI Registry Canister ID (TODO: Replace with actual deployed canister ID)
const QURI_REGISTRY_CANISTER = 'aaaaa-aa'; // Placeholder

// Mint fee in satoshis (0.001 ckBTC = 100,000 sats)
const MINT_FEE_SATS = 100_000n;

export function CkBTCMintFlow({
  runeData,
  metadata,
  onSuccess,
  onError,
}: CkBTCMintFlowProps) {
  const [step, setStep] = useState<'check' | 'approve' | 'mint' | 'success' | 'error'>('check');
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [runeId, setRuneId] = useState<string | null>(null);

  // Format ckBTC amount
  const formatCkBTC = (sats: bigint): string => {
    const btc = Number(sats) / 100_000_000;
    return `${btc.toFixed(8)} ckBTC`;
  };

  // Format USD equivalent (assuming $50,000 BTC price)
  const formatUSD = (sats: bigint): string => {
    const btc = Number(sats) / 100_000_000;
    const usd = btc * 50_000;
    return `~$${usd.toFixed(2)}`;
  };

  // Check ckBTC balance
  const checkBalance = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create agent
      const agent = new HttpAgent({
        host: 'https://ic0.app',
      });

      // In development, fetch root key
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      // Get user principal from Internet Identity or Plug
      const principal = await getUserPrincipal();
      if (!principal) {
        throw new Error('Please connect your wallet first');
      }

      // Create ckBTC ledger actor
      const ledgerActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CKBTC_LEDGER_MAINNET,
      });

      // Query balance
      const balanceResult = await ledgerActor.icrc1_balance_of({
        owner: principal,
        subaccount: [],
      });

      setBalance(balanceResult as bigint);
      setStep('approve');

      logger.info('ckBTC balance checked', {
        balance: formatCkBTC(balanceResult as bigint),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check balance';
      setError(errorMsg);
      setStep('error');
      logger.error('Failed to check ckBTC balance', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Approve QURI canister to spend ckBTC
  const approveSpending = async () => {
    try {
      setLoading(true);
      setError(null);

      const agent = new HttpAgent({ host: 'https://ic0.app' });
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      const ledgerActor = Actor.createActor(idlFactory, {
        agent,
        canisterId: CKBTC_LEDGER_MAINNET,
      });

      // Approve QURI canister
      const approveResult = await ledgerActor.icrc2_approve({
        from_subaccount: [],
        spender: {
          owner: Principal.fromText(QURI_REGISTRY_CANISTER),
          subaccount: [],
        },
        amount: MINT_FEE_SATS,
        expected_allowance: [],
        expires_at: [],
        fee: [],
        memo: [],
        created_at_time: [],
      });

      if ('Err' in approveResult) {
        throw new Error(`Approval failed: ${JSON.stringify(approveResult.Err)}`);
      }

      setStep('mint');
      logger.info('ckBTC spending approved', {
        block_index: approveResult.Ok,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to approve spending';
      setError(errorMsg);
      setStep('error');
      logger.error('Failed to approve ckBTC spending', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Mint Rune with ckBTC
  const mintRune = async () => {
    try {
      setLoading(true);
      setError(null);

      const agent = new HttpAgent({ host: 'https://ic0.app' });
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      // Create registry actor
      const registryActor = Actor.createActor(registryIdlFactory, {
        agent,
        canisterId: QURI_REGISTRY_CANISTER,
      });

      // Convert metadata to optional array
      const metadataOpt = metadata ? [metadata] : [];

      // Mint Rune with ckBTC
      const result = await registryActor.mint_rune_with_ckbtc(
        runeData,
        metadataOpt,
        MINT_FEE_SATS
      );

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      const createdRuneId = result.Ok;
      setRuneId(createdRuneId);
      setStep('success');
      onSuccess(createdRuneId);

      logger.info('Rune minted with ckBTC', {
        rune_id: createdRuneId,
        rune_name: runeData.rune_name,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mint Rune';
      setError(errorMsg);
      setStep('error');
      onError(errorMsg);
      logger.error('Failed to mint Rune with ckBTC', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Get user principal (mock - replace with actual wallet integration)
  const getUserPrincipal = async (): Promise<Principal | null> => {
    // TODO: Integrate with Internet Identity or Plug Wallet
    // For now, return mock principal
    try {
      // Try to get from window.ic if Plug is installed
      if (typeof window !== 'undefined' && (window as any).ic?.plug) {
        const connected = await (window as any).ic.plug.isConnected();
        if (connected) {
          return await (window as any).ic.plug.getPrincipal();
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  // Auto-check balance on mount
  useEffect(() => {
    checkBalance();
  }, []);

  const hasSufficientBalance = balance >= MINT_FEE_SATS;

  return (
    <Card className="border-2 border-gold-500">
      <CardHeader className="bg-gradient-to-r from-gold-50 to-yellow-50">
        <CardTitle className="font-serif text-2xl flex items-center gap-2">
          <Zap className="w-6 h-6 text-gold-500" />
          Instant Mint with ckBTC
        </CardTitle>
        <CardDescription className="text-base">
          Create your Rune in <span className="font-bold text-gold-600">1-2 seconds</span> instead
          of waiting 10-60 minutes for Bitcoin confirmations.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between">
          {['Check Balance', 'Approve', 'Mint', 'Success'].map((label, index) => {
            const stepNames = ['check', 'approve', 'mint', 'success'];
            const currentIndex = stepNames.indexOf(step);
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-gold-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span
                  className={`ml-2 text-sm ${isActive ? 'text-gold-600 font-semibold' : 'text-gray-500'}`}
                >
                  {label}
                </span>
                {index < 3 && (
                  <div className="w-12 h-0.5 bg-gray-200 mx-2" />
                )}
              </div>
            );
          })}
        </div>

        {/* Balance Check */}
        {step === 'check' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
              <p className="text-blue-900 font-semibold mb-2">Checking your ckBTC balance...</p>
              {loading && (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <p className="text-blue-700 text-sm">Querying ICP network...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Approval Step */}
        {step === 'approve' && (
          <div className="space-y-4">
            <div
              className={`border-2 p-4 rounded-sm ${
                hasSufficientBalance
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 mb-1">Your ckBTC Balance</p>
                  <p className="text-2xl font-mono font-bold text-gray-900">
                    {formatCkBTC(balance)}
                  </p>
                  <p className="text-sm text-gray-600">{formatUSD(balance)}</p>
                </div>
                {hasSufficientBalance ? (
                  <CheckCircle className="w-8 h-8 text-green-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>

              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-700 mb-1">Required to mint:</p>
                <p className="font-mono font-semibold text-gray-900">
                  {formatCkBTC(MINT_FEE_SATS)} ({formatUSD(MINT_FEE_SATS)})
                </p>
              </div>
            </div>

            {!hasSufficientBalance && (
              <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-yellow-900 font-semibold mb-1">Insufficient Balance</p>
                    <p className="text-yellow-800 text-sm mb-3">
                      You need at least {formatCkBTC(MINT_FEE_SATS)} to mint a Rune.
                    </p>
                    <a
                      href="https://nns.ic0.app/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm font-medium"
                    >
                      Get ckBTC on NNS
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {hasSufficientBalance && (
              <>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
                  <p className="text-blue-900 text-sm mb-2">
                    <strong>Next step:</strong> Approve QURI to spend {formatCkBTC(MINT_FEE_SATS)}{' '}
                    from your balance.
                  </p>
                  <p className="text-blue-700 text-xs">
                    This is a one-time approval. QURI can only spend the exact amount you approve.
                  </p>
                </div>

                <Button
                  onClick={approveSpending}
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Approve Spending
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Mint Step */}
        {step === 'mint' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 p-4 rounded-sm">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <p className="text-green-900 font-semibold">Approval successful!</p>
              </div>
              <p className="text-green-800 text-sm">
                You&apos;re ready to mint your Rune instantly.
              </p>
            </div>

            <div className="bg-gradient-to-r from-gold-50 to-yellow-50 border-2 border-gold-300 p-6 rounded-sm">
              <div className="text-center space-y-3">
                <Zap className="w-12 h-12 text-gold-500 mx-auto" />
                <p className="text-lg font-semibold text-gray-900">Ready to mint:</p>
                <p className="text-2xl font-serif font-bold text-gray-900">
                  {runeData.rune_name}
                </p>
                <p className="text-sm text-gray-600">
                  Symbol: <span className="font-mono font-semibold">{runeData.symbol}</span>
                </p>
                <div className="pt-3 border-t border-gold-200">
                  <p className="text-xs text-gray-600 mb-1">Estimated time:</p>
                  <p className="text-lg font-bold text-gold-600">1-2 seconds ⚡</p>
                </div>
              </div>
            </div>

            <Button
              onClick={mintRune}
              size="lg"
              className="w-full bg-gold-500 hover:bg-gold-600"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Minting Rune...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Mint Rune Instantly
                </>
              )}
            </Button>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && runeId && (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-300 p-6 rounded-sm text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-2xl font-bold text-green-900 mb-2">Rune Created!</p>
              <p className="text-green-800 mb-4">
                Your Rune was created in just 1-2 seconds using ckBTC.
              </p>
              <div className="bg-white border border-green-200 p-4 rounded-sm">
                <p className="text-sm text-gray-600 mb-1">Rune ID:</p>
                <p className="font-mono font-bold text-lg text-gray-900">{runeId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-sm">
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-sm">
                <p className="text-blue-600 font-semibold">Speed</p>
                <p className="text-blue-900 font-bold">1-2 sec</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-sm">
                <p className="text-purple-600 font-semibold">Fee</p>
                <p className="text-purple-900 font-bold">&lt; $0.01</p>
              </div>
            </div>

            <p className="text-center text-xs text-gray-500">
              vs Bitcoin on-chain: 10-60 min + $5-20 fees
            </p>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && error && (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 p-4 rounded-sm">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-900 font-semibold mb-1">Error</p>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>

            <Button onClick={checkBalance} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Candid IDL (Type Definitions)
// ============================================================================

// ckBTC Ledger IDL (simplified)
const idlFactory = ({ IDL }: any) => {
  const Account = IDL.Record({
    owner: IDL.Principal,
    subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const ApproveArgs = IDL.Record({
    from_subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    spender: Account,
    amount: IDL.Nat,
    expected_allowance: IDL.Opt(IDL.Nat),
    expires_at: IDL.Opt(IDL.Nat64),
    fee: IDL.Opt(IDL.Nat),
    memo: IDL.Opt(IDL.Vec(IDL.Nat8)),
    created_at_time: IDL.Opt(IDL.Nat64),
  });

  const ApproveError = IDL.Variant({
    BadFee: IDL.Record({ expected_fee: IDL.Nat }),
    InsufficientFunds: IDL.Record({ balance: IDL.Nat }),
    AllowanceChanged: IDL.Record({ current_allowance: IDL.Nat }),
    Expired: IDL.Record({ ledger_time: IDL.Nat64 }),
    TooOld: IDL.Null,
    CreatedInFuture: IDL.Record({ ledger_time: IDL.Nat64 }),
    Duplicate: IDL.Record({ duplicate_of: IDL.Nat }),
    TemporarilyUnavailable: IDL.Null,
    GenericError: IDL.Record({
      error_code: IDL.Nat,
      message: IDL.Text,
    }),
  });

  return IDL.Service({
    icrc1_balance_of: IDL.Func([Account], [IDL.Nat], ['query']),
    icrc2_approve: IDL.Func(
      [ApproveArgs],
      [IDL.Variant({ Ok: IDL.Nat, Err: ApproveError })],
      []
    ),
  });
};

// Registry IDL (simplified)
const registryIdlFactory = ({ IDL }: any) => {
  const RuneEtching = IDL.Record({
    rune_name: IDL.Text,
    symbol: IDL.Text,
    divisibility: IDL.Nat8,
    premine: IDL.Nat64,
    cap: IDL.Opt(IDL.Nat64),
    amount_per_mint: IDL.Opt(IDL.Nat64),
    start_height: IDL.Opt(IDL.Nat64),
    end_height: IDL.Opt(IDL.Nat64),
    start_offset: IDL.Opt(IDL.Nat64),
    end_offset: IDL.Opt(IDL.Nat64),
    turbo: IDL.Bool,
  });

  const RuneAttribute = IDL.Record({
    trait_type: IDL.Text,
    value: IDL.Variant({
      String: IDL.Text,
      Number: IDL.Nat64,
    }),
  });

  const RuneMetadata = IDL.Record({
    name: IDL.Text,
    description: IDL.Opt(IDL.Text),
    image: IDL.Text,
    external_url: IDL.Opt(IDL.Text),
    attributes: IDL.Opt(IDL.Vec(RuneAttribute)),
  });

  return IDL.Service({
    mint_rune_with_ckbtc: IDL.Func(
      [RuneEtching, IDL.Opt(RuneMetadata), IDL.Nat64],
      [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
      []
    ),
  });
};
