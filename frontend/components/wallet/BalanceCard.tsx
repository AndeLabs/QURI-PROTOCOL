/**
 * BalanceCard Component
 * Reusable card for displaying token balances
 */

'use client';

import { useState, useEffect } from 'react';
import { Wallet, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ICPDisplay, CkBTCDisplay, CyclesDisplay, NumberDisplay, InlineNumber } from '@/components/ui/NumberDisplay';
import { useBitcoinIntegration } from '@/hooks/useBitcoinIntegration';
import { useRegistry } from '@/hooks/useRegistry';
import { useDualAuth } from '@/lib/auth';
import { getICPLedgerActor, getCyclesLedgerActor } from '@/lib/icp/actors';
import { formatFullPrecision } from '@/lib/utils/format';

interface BalanceCardProps {
  variant?: 'default' | 'compact';
  showRefresh?: boolean;
  className?: string;
}

export function BalanceCard({
  variant = 'default',
  showRefresh = true,
  className = '',
}: BalanceCardProps) {
  const { getPrimaryPrincipal } = useDualAuth();
  const principal = getPrimaryPrincipal();
  const { getCkBTCBalance } = useBitcoinIntegration();
  const { getMyRunes } = useRegistry();

  const [ckBTCBalance, setCkBTCBalance] = useState<bigint>(0n);
  const [icpBalance, setIcpBalance] = useState<bigint>(0n);
  const [cyclesBalance, setCyclesBalance] = useState<bigint>(0n);
  const [myRunes, setMyRunes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBalances = async () => {
    try {
      setLoading(true);
      if (!principal) return;

      // Get ICP and Cycles ledger actors (async)
      const [icpLedger, cyclesLedger] = await Promise.all([
        getICPLedgerActor(),
        getCyclesLedgerActor(),
      ]);

      const [balance, runes, icpBal, cyclesBal] = await Promise.all([
        getCkBTCBalance(principal.toText()),
        getMyRunes(),
        icpLedger.icrc1_balance_of({
          owner: principal,
          subaccount: [],
        }).catch(() => 0n),
        cyclesLedger.icrc1_balance_of({
          owner: principal,
          subaccount: [],
        }).catch(() => 0n),
      ]);

      setCkBTCBalance(balance || 0n);
      setMyRunes(runes);
      setIcpBalance(icpBal);
      setCyclesBalance(cyclesBal);
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (principal) {
      loadBalances();

      // Auto-refresh every 30 seconds
      const interval = setInterval(loadBalances, 30000);
      return () => clearInterval(interval);
    }
  }, [principal]);

  const formatBalance = (balance: bigint, decimals: number = 8): string => {
    const value = Number(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  // Calculate total Runes value (placeholder - would need price data)
  const totalRunesValue = myRunes.reduce((acc, rune) => {
    const supply = Number(rune.metadata.total_supply) / Math.pow(10, Number(rune.metadata.divisibility));
    return acc + supply;
  }, 0);

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`border border-museum-light-gray rounded-xl p-4 bg-museum-white ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-gold-600" />
            <span className="font-semibold text-museum-black">Balances</span>
          </div>
          {showRefresh && (
            <button
              onClick={loadBalances}
              disabled={loading}
              className="p-1 hover:bg-museum-cream rounded transition-colors"
            >
              <RefreshCw className={`h-4 w-4 text-museum-dark-gray ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-museum-dark-gray">ICP</span>
            {loading ? (
              <span className="font-mono text-sm text-museum-dark-gray">...</span>
            ) : (
              <InlineNumber value={icpBalance} decimals={8} unit="ICP" className="text-sm font-semibold text-museum-black" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-museum-dark-gray">Cycles</span>
            {loading ? (
              <span className="font-mono text-sm text-museum-dark-gray">...</span>
            ) : (
              <CyclesDisplay value={cyclesBalance} size="sm" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-museum-dark-gray">ckBTC</span>
            {loading ? (
              <span className="font-mono text-sm text-museum-dark-gray">...</span>
            ) : (
              <InlineNumber value={ckBTCBalance} decimals={8} unit="ckBTC" className="text-sm font-semibold text-museum-black" />
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-museum-dark-gray">Runes</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-museum-black">
              {loading ? '...' : myRunes.length}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-gold-600" />
          <h2 className="font-serif text-2xl font-bold text-museum-black">My Balances</h2>
        </div>
        {showRefresh && (
          <Button onClick={loadBalances} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ICP Card */}
        <div className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">∞</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-museum-dark-gray">ICP Balance</p>
              <p className="text-xs text-museum-dark-gray">Internet Computer</p>
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <p className="font-mono font-bold text-3xl text-museum-dark-gray">...</p>
            ) : (
              <ICPDisplay value={icpBalance} size="xl" />
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-purple-200">
            <div className="flex items-center gap-2 text-xs text-purple-700">
              <TrendingUp className="h-3 w-3" />
              <span>Native ICP token</span>
            </div>
          </div>
        </div>

        {/* Cycles Card */}
        <div className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-cyan-50 to-cyan-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-cyan-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">⚡</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-museum-dark-gray">Cycles Balance</p>
              <p className="text-xs text-museum-dark-gray">Computation Power</p>
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <p className="font-mono font-bold text-3xl text-museum-dark-gray">...</p>
            ) : (
              <CyclesDisplay value={cyclesBalance} size="xl" />
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-cyan-200">
            <div className="flex items-center gap-2 text-xs text-cyan-700">
              <TrendingUp className="h-3 w-3" />
              <span>For canister operations</span>
            </div>
          </div>
        </div>

        {/* ckBTC Card */}
        <div className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">₿</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-museum-dark-gray">ckBTC Balance</p>
              <p className="text-xs text-museum-dark-gray">Chain Key Bitcoin</p>
            </div>
          </div>
          <div className="space-y-1">
            {loading ? (
              <p className="font-mono font-bold text-3xl text-museum-dark-gray">...</p>
            ) : (
              <CkBTCDisplay value={ckBTCBalance} size="xl" />
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-orange-200">
            <div className="flex items-center gap-2 text-xs text-orange-700">
              <TrendingUp className="h-3 w-3" />
              <span>Ready to use on ICP</span>
            </div>
          </div>
        </div>

        {/* Runes Card */}
        <div className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-gold-50 to-gold-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gold-600 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray">Bitcoin Runes</p>
              <p className="text-xs text-museum-dark-gray">Total Assets</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="font-mono font-bold text-3xl text-museum-black">
              {loading ? '...' : myRunes.length}
            </p>
            <p className="text-sm text-museum-dark-gray">Unique Runes</p>
          </div>
          <div className="mt-4 pt-4 border-t border-gold-200">
            <div className="flex items-center gap-2 text-xs text-gold-700">
              <Wallet className="h-3 w-3" />
              <span>Total Supply: {totalRunesValue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Runes List */}
      {myRunes.length > 0 && (
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <h3 className="font-semibold text-museum-black mb-4">Rune Holdings</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {myRunes.map((rune) => (
              <div
                key={rune.metadata.key}
                className="flex items-center justify-between p-4 border border-museum-light-gray rounded-lg hover:border-gold-300 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {rune.metadata.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-museum-black">{rune.metadata.symbol}</p>
                    <p className="text-xs text-museum-dark-gray">{rune.metadata.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <InlineNumber
                    value={rune.metadata.total_supply}
                    decimals={Number(rune.metadata.divisibility)}
                    className="font-semibold text-museum-black"
                  />
                  <p className="text-xs text-museum-dark-gray">
                    {rune.metadata.symbol}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {myRunes.length === 0 && !loading && (
        <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
          <Wallet className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            No Runes Yet
          </h3>
          <p className="text-museum-dark-gray">
            Create your first Bitcoin Rune to see it here
          </p>
        </div>
      )}
    </div>
  );
}
