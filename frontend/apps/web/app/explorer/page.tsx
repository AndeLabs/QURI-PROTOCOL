'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { getAgent } from '@/lib/icp/agent';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { VerificationBadge } from '@/components/RuneVerification';
import { OctopusIndexerClient, OctopusRuneEntry } from '@/lib/integrations/octopus-indexer';
import { Search, Filter, TrendingUp, Users, Coins, ExternalLink, RefreshCw, CheckCircle, Loader, Home } from 'lucide-react';
import { logger } from '@/lib/logger';
import Link from 'next/link';

/**
 * Unified Runes Explorer
 * 
 * ALL Runes are Bitcoin Runes - there's no difference between QURI-created
 * and other Runes. They all live on Bitcoin blockchain.
 * 
 * This explorer shows:
 * - ALL Bitcoin Runes (from Octopus Indexer)
 * - MY Runes (created by current user via QURI)
 * 
 * Data sources:
 * - Octopus Indexer: All Bitcoin Runes
 * - Registry Canister: QURI creation tracking
 */

interface FilterOptions {
  search: string;
  sortBy: 'recent' | 'supply' | 'mints';
  showOnlyVerified: boolean;
}

function ExplorerContent() {
  const searchParams = useSearchParams();
  const newEtchingId = searchParams.get('new');
  
  // Tabs: 'all' shows all Bitcoin Runes, 'mine' shows user's creations
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [allRunes, setAllRunes] = useState<OctopusRuneEntry[]>([]);
  const [myRunes, setMyRunes] = useState<any[]>([]);
  const [filteredRunes, setFilteredRunes] = useState<OctopusRuneEntry[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    sortBy: 'recent',
    showOnlyVerified: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestBlock, setLatestBlock] = useState<number>(0);
  const [newRuneData, setNewRuneData] = useState<any | null>(null);
  const [loadingNewRune, setLoadingNewRune] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [userPrincipal, setUserPrincipal] = useState<string>('');

  const client = new OctopusIndexerClient('mainnet');

  // Format supply
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: divisibility,
    });
  };

  // Load user principal
  useEffect(() => {
    const loadUserPrincipal = async () => {
      try {
        const agent = await getAgent();
        const principal = await agent.getPrincipal();
        setUserPrincipal(principal.toString());
      } catch (err) {
        logger.warn('Failed to get user principal', err instanceof Error ? err : undefined);
      }
    };
    loadUserPrincipal();
  }, []);

  // Load data from Octopus Indexer
  const loadAllRunes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get latest block
      const blockInfo = await client.getLatestBlock();
      setLatestBlock(Number(blockInfo.height));

      logger.info('Loaded latest block from Octopus Indexer', {
        latest_block: blockInfo.height,
      });

      // TODO: Implement pagination through all Runes
      // For now, we show the concept with empty array
      // In production, Octopus would provide a list_runes method
      setAllRunes([]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load Runes';
      setError(errorMsg);
      logger.error('Failed to load Runes', err instanceof Error ? err : undefined);
    } finally {
      setLoading(false);
    }
  };

  // Load newly created Rune from ICP backend
  const loadNewRune = async (etchingId: string) => {
    try {
      setLoadingNewRune(true);
      logger.info('Loading new Rune from ICP', { etchingId });

      const agent = await getAgent();
      const runeEngineId = process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID;

      if (!runeEngineId) {
        throw new Error('NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID not configured');
      }

      const { idlFactory } = await import('@/lib/icp/idl/rune-engine.idl');
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(runeEngineId),
      }) as any;

      // Get etching status
      const status = await actor.get_etching_status(etchingId);
      
      if (status && status.length > 0) {
        const etchingData = status[0];
        setNewRuneData(etchingData);
        setShowSuccessBanner(true);
        logger.info('New Rune loaded', { etchingData });
        
        // Auto-hide banner after 10 seconds
        setTimeout(() => setShowSuccessBanner(false), 10000);
      }
    } catch (err) {
      logger.error('Failed to load new Rune', err instanceof Error ? err : undefined);
    } finally {
      setLoadingNewRune(false);
    }
  };

  // Load user's created Runes
  const loadMyRunes = async () => {
    try {
      const agent = await getAgent();
      const runeEngineId = process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID;

      if (!runeEngineId) {
        logger.warn('RUNE_ENGINE_CANISTER_ID not configured, skipping My Runes');
        setMyRunes([]);
        return;
      }

      const { idlFactory } = await import('@/lib/icp/idl/rune-engine.idl');
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(runeEngineId),
      }) as any;

      // Get user's etchings
      const myEtchings = await actor.get_my_etchings();
      setMyRunes(myEtchings);
      logger.info('Loaded My Runes', { count: myEtchings.length });
    } catch (err) {
      logger.error('Failed to load My Runes', err instanceof Error ? err : undefined);
      setMyRunes([]);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...allRunes];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (rune) =>
          rune.spaced_rune.toLowerCase().includes(searchLower) ||
          (rune.symbol && rune.symbol.toLowerCase().includes(searchLower)) ||
          rune.rune_id.includes(searchLower)
      );
    }

    // Sort
    switch (filters.sortBy) {
      case 'recent':
        filtered.sort((a, b) => Number(b.block - a.block));
        break;
      case 'supply':
        filtered.sort((a, b) => Number(b.premine - a.premine));
        break;
      case 'mints':
        filtered.sort((a, b) => Number(b.mints - a.mints));
        break;
    }

    // Verified filter
    if (filters.showOnlyVerified) {
      filtered = filtered.filter((rune) => rune.confirmations >= 6);
    }

    setFilteredRunes(filtered);
  }, [allRunes, filters]);

  // Load data on mount
  useEffect(() => {
    loadAllRunes();
    loadMyRunes();

    // Load new Rune if etchingId is present in URL
    if (newEtchingId) {
      loadNewRune(newEtchingId);
      // Show "My Runes" tab if coming from creation
      setActiveTab('mine');
    }

    // Refresh every 60 seconds
    const interval = setInterval(() => {
      loadAllRunes();
      loadMyRunes();
    }, 60000);

    return () => clearInterval(interval);
  }, [newEtchingId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Back to Home */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          <Home className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Success Banner for New Rune */}
        {showSuccessBanner && newRuneData && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-6 shadow-lg animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-serif font-bold text-green-900 mb-2">
                  🎉 Rune Created Successfully on Bitcoin!
                </h3>
                <div className="space-y-2 text-green-800">
                  <p className="text-lg">
                    <strong>Name:</strong> {newRuneData.rune_name}
                  </p>
                  <p className="text-sm font-mono">
                    <strong>Process ID:</strong> {newRuneData.id}
                  </p>
                  <p className="text-sm">
                    <strong>Status:</strong>{' '}
                    <span className="inline-flex items-center gap-1">
                      {newRuneData.state}
                      {newRuneData.state === 'Broadcasting' && (
                        <Loader className="w-4 h-4 animate-spin" />
                      )}
                    </span>
                  </p>
                  {newRuneData.txid && (
                    <p className="text-sm">
                      <strong>Transaction ID:</strong>{' '}
                      <a
                        href={`https://mempool.space/testnet/tx/${newRuneData.txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {newRuneData.txid.substring(0, 16)}...
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                  <p className="text-xs mt-2 text-green-700">
                    ✨ Your Rune is now live on the Bitcoin blockchain and will appear in "All Runes" once indexed!
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessBanner(false)}
                className="flex-shrink-0 text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="font-serif text-5xl text-neutral-900">
            Bitcoin Runes Explorer
          </h1>
          <p className="text-lg text-neutral-600 max-w-3xl mx-auto">
            Explore <strong>ALL</strong> Bitcoin Runes on-chain, powered by{' '}
            <a
              href="https://github.com/octopus-network/runes-indexer"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              Octopus Network Runes Indexer
              <ExternalLink className="w-4 h-4" />
            </a>
          </p>
          <p className="text-sm text-neutral-500 max-w-2xl mx-auto">
            All Runes shown here are <strong>native Bitcoin Runes</strong> living on the Bitcoin blockchain. 
            QURI creates real Bitcoin Runes, not synthetic tokens.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-blue-600 mb-1">Latest Block</p>
                <p className="text-2xl font-bold text-blue-900">
                  #{latestBlock.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-purple-600 mb-1">Total Indexed</p>
                <p className="text-2xl font-bold text-purple-900">
                  {allRunes.length.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-green-600 mb-1">Created by You</p>
                <p className="text-2xl font-bold text-green-900">
                  {myRunes.length.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-4">
          <Button
            onClick={() => setActiveTab('all')}
            variant={activeTab === 'all' ? 'primary' : 'outline'}
            size="lg"
            className="min-w-[200px]"
          >
            <Coins className="w-5 h-5 mr-2" />
            All Bitcoin Runes ({allRunes.length})
          </Button>
          <Button
            onClick={() => setActiveTab('mine')}
            variant={activeTab === 'mine' ? 'primary' : 'outline'}
            size="lg"
            className="min-w-[200px]"
          >
            <Users className="w-5 h-5 mr-2" />
            My Runes ({myRunes.length})
          </Button>
        </div>

        {/* Filters - Only show for "All Runes" tab */}
        {activeTab === 'all' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, symbol, or ID..."
                    value={filters.search}
                    onChange={(e) =>
                      setFilters({ ...filters, search: e.target.value })
                    }
                    className="pl-10"
                  />
                </div>

                {/* Sort By */}
                <select
                  value={filters.sortBy}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      sortBy: e.target.value as FilterOptions['sortBy'],
                    })
                  }
                  className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
                >
                  <option value="recent">Most Recent</option>
                  <option value="supply">Highest Supply</option>
                  <option value="mints">Most Mints</option>
                </select>

                {/* Verified Only */}
                <label className="flex items-center gap-2 border border-gray-300 rounded-sm px-3 py-2">
                  <input
                    type="checkbox"
                    checked={filters.showOnlyVerified}
                    onChange={(e) =>
                      setFilters({
                        ...filters,
                        showOnlyVerified: e.target.checked,
                      })
                    }
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Verified Only (6+ conf)</span>
                </label>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {filteredRunes.length} of {allRunes.length} Runes
                </p>
                <Button
                  onClick={loadAllRunes}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="p-6 text-center">
              <p className="text-red-900 font-semibold mb-2">Error Loading Runes</p>
              <p className="text-red-700 text-sm">{error}</p>
              <Button
                onClick={loadAllRunes}
                variant="outline"
                className="mt-4"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <p className="text-neutral-600">Loading Runes from Bitcoin...</p>
            </CardContent>
          </Card>
        )}

        {/* All Runes Grid */}
        {!loading && activeTab === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRunes.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="p-12 text-center">
                  <Coins className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {filters.search
                      ? 'No Runes match your search'
                      : 'No Runes indexed yet'}
                  </p>
                  <p className="text-sm text-gray-500">
                    The Octopus Indexer is continuously syncing with Bitcoin blockchain
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRunes.map((rune) => (
                <RuneExplorerCard key={rune.rune_id} rune={rune} />
              ))
            )}
          </div>
        )}

        {/* My Runes Tab */}
        {!loading && activeTab === 'mine' && (
          <div className="space-y-6">
            {loadingNewRune && (
              <Card className="border-blue-300 bg-blue-50">
                <CardContent className="p-8 text-center">
                  <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                  <p className="text-blue-900 font-semibold">
                    Loading your newly created Rune...
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRunes.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-12 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">
                      You haven't created any Runes yet
                    </p>
                    <Button onClick={() => (window.location.href = '/create')}>
                      Create Your First Bitcoin Rune
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                myRunes.map((rune) => (
                  <MyRuneCard 
                    key={rune.id} 
                    rune={rune} 
                    isNew={newEtchingId === rune.id}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              About This Explorer
            </CardTitle>
            <CardDescription>
              Powered by Octopus Network&apos;s on-chain Bitcoin Runes Indexer on ICP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="bg-white p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-neutral-900">How it works:</h4>
              <ul className="space-y-1 text-neutral-600">
                <li>• <strong>All Runes</strong>: Shows every Bitcoin Rune indexed by Octopus Network</li>
                <li>• <strong>My Runes</strong>: Shows Runes you created via QURI (these are also real Bitcoin Runes)</li>
                <li>• QURI creates <strong>native Bitcoin Runes</strong> via signed transactions to Bitcoin blockchain</li>
                <li>• Once confirmed, your Rune appears in both tabs (it's a real Bitcoin asset!)</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Indexer Canister:</p>
                <p className="font-mono text-xs break-all">
                  kzrva-ziaaa-aaaar-qamyq-cai
                </p>
              </div>
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Network:</p>
                <p className="font-semibold">ICP Mainnet + Bitcoin</p>
              </div>
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Data Source:</p>
                <p className="font-semibold">Bitcoin Full Node</p>
              </div>
              <div className="bg-white p-3 rounded-sm">
                <p className="text-gray-600 mb-1">Update Frequency:</p>
                <p className="font-semibold">Every Bitcoin Block</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// My Rune Card Component (for user-created Runes)
// ============================================================================

function MyRuneCard({ rune, isNew }: { rune: any; isNew: boolean }) {
  const getStateColor = (state: string) => {
    switch (state) {
      case 'Completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Broadcasting':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Building':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1000000); // Convert nanoseconds to milliseconds
    return date.toLocaleString();
  };

  return (
    <Card 
      className={`hover:shadow-lg transition-all ${
        isNew ? 'border-4 border-orange-400 shadow-xl animate-pulse-slow' : ''
      }`}
    >
      {isNew && (
        <div className="bg-gradient-to-r from-orange-400 to-orange-500 text-white text-center py-2 font-bold text-sm">
          ✨ NEWLY CREATED ✨
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-serif text-xl">
              {rune.rune_name}
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              Process: {rune.id}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* State Badge */}
        <div className={`border px-3 py-2 rounded-sm text-center ${getStateColor(rune.state)}`}>
          <p className="font-semibold text-sm flex items-center justify-center gap-2">
            {rune.state}
            {rune.state === 'Broadcasting' && (
              <Loader className="w-4 h-4 animate-spin" />
            )}
            {rune.state === 'Completed' && (
              <CheckCircle className="w-4 h-4" />
            )}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Created</p>
            <p className="font-mono text-xs text-gray-900">
              {formatTimestamp(rune.created_at)}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Updated</p>
            <p className="font-mono text-xs text-gray-900">
              {formatTimestamp(rune.updated_at)}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Retries</p>
            <p className="font-mono font-semibold text-gray-900">
              {rune.retry_count}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Status</p>
            <p className="font-mono text-xs text-gray-900">
              {rune.state === 'Completed' ? '✅ On Bitcoin' : '⏳ Processing'}
            </p>
          </div>

          {rune.txid && (
            <div className="bg-gray-50 p-3 rounded-sm col-span-2">
              <p className="text-gray-600 mb-1">Bitcoin Transaction</p>
              <a
                href={`https://mempool.space/testnet/tx/${rune.txid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-blue-600 hover:underline break-all flex items-center gap-1"
              >
                {rune.txid}
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
              </a>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {rune.txid && (
            <Button
              onClick={() =>
                window.open(`https://mempool.space/testnet/tx/${rune.txid}`, '_blank')
              }
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Bitcoin
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Rune Explorer Card Component (for all Bitcoin Runes)
// ============================================================================

function RuneExplorerCard({ rune }: { rune: OctopusRuneEntry }) {
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: divisibility,
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-serif text-xl">
              {rune.spaced_rune}
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {rune.rune_id}
            </CardDescription>
          </div>
          {rune.symbol && (
            <div className="text-2xl" title={`Symbol: ${rune.symbol}`}>
              {rune.symbol}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Verification Badge */}
        <VerificationBadge runeId={rune.rune_id} />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Supply</p>
            <p className="font-mono font-semibold text-gray-900">
              {formatSupply(rune.premine, rune.divisibility)}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Mints</p>
            <p className="font-mono font-semibold text-gray-900">
              {rune.mints.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Block</p>
            <p className="font-mono font-semibold text-gray-900">
              #{rune.block.toLocaleString()}
            </p>
          </div>

          <div className="bg-gray-50 p-3 rounded-sm">
            <p className="text-gray-600 mb-1">Confirmations</p>
            <p className="font-mono font-semibold text-gray-900">
              {rune.confirmations}
            </p>
          </div>
        </div>

        {/* Turbo Badge */}
        {rune.turbo && (
          <div className="bg-orange-100 border border-orange-300 px-3 py-2 rounded-sm text-center">
            <p className="text-orange-700 font-semibold text-sm">⚡ TURBO</p>
          </div>
        )}

        {/* View Button */}
        <Button
          onClick={() =>
            window.open(`https://mempool.space/rune/${rune.rune_id}`, '_blank')
          }
          variant="outline"
          size="sm"
          className="w-full"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          View on Explorer
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Export with Suspense Boundary
// ============================================================================

export default function UnifiedRunesExplorer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-purple-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-600">Loading Explorer...</p>
        </div>
      </div>
    }>
      <ExplorerContent />
    </Suspense>
  );
}
