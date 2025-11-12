'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Coins, TrendingUp, ArrowDownToLine, ArrowUpFromLine, Loader2, Info } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Rune Staking Component
 *
 * FIRST-EVER staking for Bitcoin Runes!
 * Earn 5% APY in ckBTC by staking your Runes.
 *
 * Features:
 * - Stake any amount (min 0.0001 ckBTC equivalent)
 * - Earn 5% APY in ckBTC
 * - Withdraw anytime (no lock period)
 * - Auto-compounding rewards
 * - Real-time reward tracking
 */

interface StakePosition {
  rune_id: string;
  amount: bigint;
  staked_at: bigint;
  last_claim: bigint;
  total_rewards_claimed: bigint;
}

interface StakingPool {
  rune_id: string;
  total_staked: bigint;
  total_stakers: bigint;
  apy_rate: number; // Basis points (500 = 5%)
  rewards_distributed: bigint;
  created_at: bigint;
}

interface RewardCalculation {
  principal_amount: bigint;
  reward_amount: bigint;
  time_staked_seconds: bigint;
  apy_rate: number;
}

interface RuneStakingProps {
  runeId: string;
  runeName: string;
  runeSymbol: string;
  userBalance?: bigint; // User's Rune balance (if known)
}

// QURI Registry Canister ID
const QURI_REGISTRY_CANISTER = 'aaaaa-aa'; // TODO: Replace with actual

const MIN_STAKE_AMOUNT = 10_000n; // 0.0001 ckBTC

export function RuneStaking({ runeId, runeName, runeSymbol, userBalance }: RuneStakingProps) {
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake' | 'rewards'>('stake');
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<StakePosition | null>(null);
  const [pool, setPool] = useState<StakingPool | null>(null);
  const [pendingRewards, setPendingRewards] = useState<RewardCalculation | null>(null);

  // Format amounts
  const formatAmount = (amount: bigint): string => {
    const btc = Number(amount) / 100_000_000;
    return btc.toFixed(8);
  };

  const formatAPY = (bps: number): string => {
    return (bps / 100).toFixed(2) + '%';
  };

  const formatUSD = (sats: bigint): string => {
    const btc = Number(sats) / 100_000_000;
    const usd = btc * 50_000; // Assuming $50k BTC
    return `$${usd.toFixed(2)}`;
  };

  const formatTimeStaked = (seconds: bigint): string => {
    const totalSeconds = Number(seconds);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Load user position and pool data
  const loadData = async () => {
    try {
      const agent = new HttpAgent({ host: 'https://ic0.app' });
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: QURI_REGISTRY_CANISTER,
      });

      // Load position
      const positionResult = await actor.get_stake(runeId);
      if (positionResult && positionResult.length > 0) {
        setPosition(positionResult[0]);
      } else {
        setPosition(null);
      }

      // Load pool
      const poolResult = await actor.get_pool(runeId);
      if (poolResult && poolResult.length > 0) {
        setPool(poolResult[0]);
      }

      // Load pending rewards if user has stake
      if (positionResult && positionResult.length > 0) {
        const rewardsResult = await actor.calculate_pending_rewards(runeId);
        if ('Ok' in rewardsResult) {
          setPendingRewards(rewardsResult.Ok);
        }
      }
    } catch (err) {
      logger.error('Failed to load staking data', err instanceof Error ? err : undefined);
    }
  };

  // Stake Runes
  const handleStake = async () => {
    try {
      setLoading(true);
      setError(null);

      const amount = BigInt(Math.floor(parseFloat(stakeAmount) * 100_000_000));

      if (amount < MIN_STAKE_AMOUNT) {
        throw new Error(`Minimum stake: ${formatAmount(MIN_STAKE_AMOUNT)} ckBTC`);
      }

      const agent = new HttpAgent({ host: 'https://ic0.app' });
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: QURI_REGISTRY_CANISTER,
      });

      const result = await actor.stake(runeId, amount);

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      setStakeAmount('');
      await loadData();

      logger.info('Staked Runes', {
        rune_id: runeId,
        amount: formatAmount(amount),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stake';
      setError(errorMsg);
      logger.error('Failed to stake Runes', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Unstake Runes
  const handleUnstake = async () => {
    try {
      setLoading(true);
      setError(null);

      const amount = BigInt(Math.floor(parseFloat(unstakeAmount) * 100_000_000));

      if (!position || amount > position.amount) {
        throw new Error('Insufficient staked amount');
      }

      const agent = new HttpAgent({ host: 'https://ic0.app' });
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: QURI_REGISTRY_CANISTER,
      });

      const result = await actor.unstake(runeId, amount);

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      const [unstaked, rewards] = result.Ok;

      setUnstakeAmount('');
      await loadData();

      logger.info('Unstaked Runes', {
        rune_id: runeId,
        unstaked: formatAmount(unstaked),
        rewards: formatAmount(rewards),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unstake';
      setError(errorMsg);
      logger.error('Failed to unstake Runes', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Claim rewards
  const handleClaim = async () => {
    try {
      setLoading(true);
      setError(null);

      const agent = new HttpAgent({ host: 'https://ic0.app' });
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: QURI_REGISTRY_CANISTER,
      });

      const result = await actor.claim_staking_rewards(runeId);

      if ('Err' in result) {
        throw new Error(result.Err);
      }

      const rewards = result.Ok;
      await loadData();

      logger.info('Claimed staking rewards', {
        rune_id: runeId,
        rewards: formatAmount(rewards),
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim rewards';
      setError(errorMsg);
      logger.error('Failed to claim rewards', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load data on mount and refresh every 30 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [runeId]);

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="font-serif text-2xl flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-green-500" />
          Stake {runeName}
        </CardTitle>
        <CardDescription className="text-base">
          <span className="font-bold text-green-600">FIRST-EVER</span> staking for Bitcoin Runes.
          Earn 5% APY in ckBTC.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
            <p className="text-sm text-blue-600 mb-1">Your Staked</p>
            <p className="text-xl font-mono font-bold text-blue-900">
              {position ? formatAmount(position.amount) : '0.00000000'}
            </p>
            <p className="text-xs text-blue-700">
              {position ? formatUSD(position.amount) : '$0.00'}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 p-4 rounded-sm">
            <p className="text-sm text-green-600 mb-1">Pending Rewards</p>
            <p className="text-xl font-mono font-bold text-green-900">
              {pendingRewards ? formatAmount(pendingRewards.reward_amount) : '0.00000000'}
            </p>
            <p className="text-xs text-green-700">
              {pendingRewards ? formatUSD(pendingRewards.reward_amount) : '$0.00'}
            </p>
          </div>

          {pool && (
            <>
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-sm">
                <p className="text-sm text-purple-600 mb-1">APY</p>
                <p className="text-xl font-bold text-purple-900">{formatAPY(pool.apy_rate)}</p>
                <p className="text-xs text-purple-700">Auto-compounding</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-4 rounded-sm">
                <p className="text-sm text-orange-600 mb-1">Total Staked</p>
                <p className="text-xl font-mono font-bold text-orange-900">
                  {formatAmount(pool.total_staked)}
                </p>
                <p className="text-xs text-orange-700">
                  {pool.total_stakers.toString()} stakers
                </p>
              </div>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('stake')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'stake'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Coins className="w-4 h-4 inline mr-2" />
            Stake
          </button>
          <button
            onClick={() => setActiveTab('unstake')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'unstake'
                ? 'text-orange-600 border-b-2 border-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={!position}
          >
            <ArrowUpFromLine className="w-4 h-4 inline mr-2" />
            Unstake
          </button>
          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'rewards'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={!position}
          >
            <ArrowDownToLine className="w-4 h-4 inline mr-2" />
            Claim
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded-sm">
            <p className="text-red-900 text-sm">{error}</p>
          </div>
        )}

        {/* Stake Tab */}
        {activeTab === 'stake' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">How it works:</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Stake your {runeSymbol} Runes to earn ckBTC</li>
                    <li>Earn 5% APY paid in ckBTC</li>
                    <li>No lock period - withdraw anytime</li>
                    <li>Rewards compound automatically</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="stake-amount">Amount to Stake</Label>
              <div className="relative">
                <Input
                  id="stake-amount"
                  type="number"
                  step="0.00000001"
                  min={formatAmount(MIN_STAKE_AMOUNT)}
                  placeholder="0.00000000"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="pr-20 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  ckBTC
                </span>
              </div>
              {userBalance && (
                <p className="text-xs text-gray-600">
                  Available: {formatAmount(userBalance)} ckBTC
                  <button
                    onClick={() => setStakeAmount(formatAmount(userBalance))}
                    className="ml-2 text-blue-600 hover:underline"
                  >
                    Max
                  </button>
                </p>
              )}
            </div>

            <Button
              onClick={handleStake}
              size="lg"
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={loading || !stakeAmount}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Staking...
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5 mr-2" />
                  Stake {runeSymbol}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Unstake Tab */}
        {activeTab === 'unstake' && position && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-sm">
              <p className="text-orange-900 text-sm mb-2">
                <strong>Note:</strong> Unstaking will automatically claim your pending rewards.
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-orange-600">Time Staked:</p>
                  <p className="font-semibold text-orange-900">
                    {pendingRewards
                      ? formatTimeStaked(pendingRewards.time_staked_seconds)
                      : '0m'}
                  </p>
                </div>
                <div>
                  <p className="text-orange-600">Pending Rewards:</p>
                  <p className="font-mono font-semibold text-orange-900">
                    {pendingRewards ? formatAmount(pendingRewards.reward_amount) : '0.00000000'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="unstake-amount">Amount to Unstake</Label>
              <div className="relative">
                <Input
                  id="unstake-amount"
                  type="number"
                  step="0.00000001"
                  min="0"
                  max={formatAmount(position.amount)}
                  placeholder="0.00000000"
                  value={unstakeAmount}
                  onChange={(e) => setUnstakeAmount(e.target.value)}
                  className="pr-20 font-mono"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                  ckBTC
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Staked: {formatAmount(position.amount)} ckBTC
                <button
                  onClick={() => setUnstakeAmount(formatAmount(position.amount))}
                  className="ml-2 text-blue-600 hover:underline"
                >
                  Max
                </button>
              </p>
            </div>

            <Button
              onClick={handleUnstake}
              size="lg"
              className="w-full bg-orange-500 hover:bg-orange-600"
              disabled={loading || !unstakeAmount}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Unstaking...
                </>
              ) : (
                <>
                  <ArrowUpFromLine className="w-5 h-5 mr-2" />
                  Unstake & Claim
                </>
              )}
            </Button>
          </div>
        )}

        {/* Rewards Tab */}
        {activeTab === 'rewards' && position && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-6 rounded-sm text-center">
              <p className="text-sm text-green-600 mb-2">Claimable Rewards</p>
              <p className="text-3xl font-mono font-bold text-green-900 mb-1">
                {pendingRewards ? formatAmount(pendingRewards.reward_amount) : '0.00000000'}
              </p>
              <p className="text-sm text-green-700">
                {pendingRewards ? formatUSD(pendingRewards.reward_amount) : '$0.00'}
              </p>

              {pendingRewards && (
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-600">Time Staked</p>
                      <p className="font-semibold text-green-900">
                        {formatTimeStaked(pendingRewards.time_staked_seconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-600">APY</p>
                      <p className="font-semibold text-green-900">
                        {formatAPY(pendingRewards.apy_rate)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-sm text-sm">
              <p className="text-blue-900">
                <strong>Total Claimed:</strong>{' '}
                <span className="font-mono">
                  {formatAmount(position.total_rewards_claimed)} ckBTC
                </span>
              </p>
            </div>

            <Button
              onClick={handleClaim}
              size="lg"
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={loading || !pendingRewards || pendingRewards.reward_amount === 0n}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <ArrowDownToLine className="w-5 h-5 mr-2" />
                  Claim Rewards
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Candid IDL
// ============================================================================

const idlFactory = ({ IDL }: any) => {
  const StakePosition = IDL.Record({
    rune_id: IDL.Text,
    amount: IDL.Nat64,
    staked_at: IDL.Nat64,
    last_claim: IDL.Nat64,
    total_rewards_claimed: IDL.Nat64,
  });

  const StakingPool = IDL.Record({
    rune_id: IDL.Text,
    total_staked: IDL.Nat64,
    total_stakers: IDL.Nat64,
    apy_rate: IDL.Nat8,
    rewards_distributed: IDL.Nat64,
    created_at: IDL.Nat64,
  });

  const RewardCalculation = IDL.Record({
    principal_amount: IDL.Nat64,
    reward_amount: IDL.Nat64,
    time_staked_seconds: IDL.Nat64,
    apy_rate: IDL.Nat8,
  });

  return IDL.Service({
    stake: IDL.Func(
      [IDL.Text, IDL.Nat64],
      [IDL.Variant({ Ok: StakePosition, Err: IDL.Text })],
      []
    ),
    unstake: IDL.Func(
      [IDL.Text, IDL.Nat64],
      [IDL.Variant({ Ok: IDL.Tuple(IDL.Nat64, IDL.Nat64), Err: IDL.Text })],
      []
    ),
    claim_staking_rewards: IDL.Func(
      [IDL.Text],
      [IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })],
      []
    ),
    get_stake: IDL.Func([IDL.Text], [IDL.Opt(StakePosition)], ['query']),
    get_pool: IDL.Func([IDL.Text], [IDL.Opt(StakingPool)], ['query']),
    calculate_pending_rewards: IDL.Func(
      [IDL.Text],
      [IDL.Variant({ Ok: RewardCalculation, Err: IDL.Text })],
      ['query']
    ),
  });
};
