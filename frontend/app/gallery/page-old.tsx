'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  Home,
  Grid3x3,
  List,
  TrendingUp,
  Sparkles,
  ExternalLink,
  Heart,
  Eye,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useRegistry } from '@/hooks/useRegistry';
import type { RegistryEntry, Page } from '@/types/canisters';

export default function GalleryPage() {
  const {
    listRunes,
    getTotalRunes,
    getTrending,
    loading,
    error,
  } = useRegistry();

  const [runes, setRunes] = useState<RegistryEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0n);
  const [viewMode, setViewMode] = useState<'grid' | 'masonry'>('grid');
  const [sortMode, setSortMode] = useState<'recent' | 'popular'>('recent');
  const [selectedRune, setSelectedRune] = useState<RegistryEntry | null>(null);

  // Load Runes
  const loadRunes = async () => {
    try {
      const page: Page = {
        offset: 0n,
        limit: 50n,
        sort_by: sortMode === 'popular' ? [{ Volume: null }] : [{ Block: null }],
        sort_order: [{ Desc: null }],
      };

      const [response, total] = await Promise.all([
        listRunes(page),
        getTotalRunes(),
      ]);

      setRunes(response.items);
      setTotalCount(total);
    } catch (err) {
      console.error('Failed to load Runes:', err);
    }
  };

  useEffect(() => {
    loadRunes();

    // Refresh every 30 seconds
    const interval = setInterval(loadRunes, 30000);
    return () => clearInterval(interval);
  }, [sortMode]);

  // Format supply
  const formatSupply = (amount: bigint, divisibility: number): string => {
    const value = Number(amount) / Math.pow(10, divisibility);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: Math.min(divisibility, 2),
    });
  };

  // Get color for Rune based on name
  const getRuneColor = (name: string): string => {
    const colors = [
      'from-gold-400 to-gold-600',
      'from-blue-400 to-blue-600',
      'from-purple-400 to-purple-600',
      'from-green-400 to-green-600',
      'from-red-400 to-red-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-orange-400 to-orange-600',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-museum-dark-gray hover:text-museum-black transition-colors"
      >
        <Home className="h-5 w-5" />
        Back to Home
      </Link>

      {/* Header */}
      <div>
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Runes Gallery
        </h1>
        <p className="text-museum-dark-gray">
          Visual showcase of Bitcoin Runes on QURI Protocol
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-museum-light-gray rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-gold-100 text-gold-800'
                  : 'text-museum-dark-gray hover:bg-museum-cream'
              }`}
            >
              <Grid3x3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('masonry')}
              className={`p-2 rounded ${
                viewMode === 'masonry'
                  ? 'bg-gold-100 text-gold-800'
                  : 'text-museum-dark-gray hover:bg-museum-cream'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as 'recent' | 'popular')}
            className="px-4 py-2 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none"
          >
            <option value="recent">Recently Created</option>
            <option value="popular">Most Popular</option>
          </select>

          <div className="text-sm text-museum-dark-gray">
            {runes.length} of {totalCount.toString()} Runes
          </div>
        </div>

        <Button onClick={loadRunes} variant="outline" disabled={loading}>
          <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Gallery Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {runes.map((rune) => (
            <div
              key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
              onClick={() => setSelectedRune(rune)}
              className="group relative cursor-pointer"
            >
              {/* Card */}
              <div className="relative overflow-hidden rounded-xl border border-museum-light-gray bg-museum-white hover:border-gold-300 transition-all hover:shadow-xl">
                {/* Gradient Background */}
                <div className={`h-48 bg-gradient-to-br ${getRuneColor(rune.metadata.name)} p-6 flex flex-col justify-between relative overflow-hidden`}>
                  {/* Decorative pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                    <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full translate-x-20 translate-y-20"></div>
                  </div>

                  {/* Symbol */}
                  <div className="relative text-6xl font-bold text-white drop-shadow-lg">
                    {rune.metadata.symbol}
                  </div>

                  {/* Verified Badge */}
                  {/* TODO: Enable when backend adds verified field */}
                  {/* {rune.verified && (
                    <div className="absolute top-4 right-4 px-2 py-1 bg-white/90 rounded-full text-xs font-medium text-green-600 flex items-center gap-1">
                      ✓ Verified
                    </div>
                  )} */}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-serif text-xl font-bold text-museum-black mb-2 truncate">
                    {rune.metadata.name}
                  </h3>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-museum-dark-gray text-xs">Supply</p>
                      <p className="font-semibold text-museum-black">
                        {formatSupply(rune.metadata.premine, rune.metadata.divisibility)}
                      </p>
                    </div>
                    <div>
                      <p className="text-museum-dark-gray text-xs">Holders</p>
                      <p className="font-semibold text-museum-black">
                        {rune.holder_count?.toString() || '0'}
                      </p>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-museum-cream rounded-lg text-sm font-medium text-museum-black hover:bg-gold-100 transition-colors flex items-center justify-center gap-1">
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <a
                      href={`https://mempool.space/rune/${rune.metadata.key}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-2 bg-museum-cream rounded-lg text-sm font-medium text-museum-black hover:bg-gold-100 transition-colors flex items-center justify-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Masonry Layout */
        <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
          {runes.map((rune) => (
            <div
              key={`${rune.metadata.key.block}:${rune.metadata.key.tx}`}
              onClick={() => setSelectedRune(rune)}
              className="break-inside-avoid cursor-pointer group"
            >
              <div className="relative overflow-hidden rounded-xl border border-museum-light-gray bg-museum-white hover:border-gold-300 transition-all hover:shadow-xl">
                {/* Gradient Header */}
                <div className={`h-32 bg-gradient-to-br ${getRuneColor(rune.metadata.name)} p-4 relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-24 h-24 bg-white rounded-full -translate-x-12 -translate-y-12"></div>
                  </div>
                  <div className="relative text-4xl font-bold text-white drop-shadow-lg">
                    {rune.metadata.symbol}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-serif text-lg font-bold text-museum-black mb-3">
                    {rune.metadata.name}
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">Supply</span>
                      <span className="font-semibold text-museum-black">
                        {formatSupply(rune.metadata.premine, rune.metadata.divisibility)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">Holders</span>
                      <span className="font-semibold text-museum-black">
                        {rune.holder_count?.toString() || '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-museum-dark-gray">Divisibility</span>
                      <span className="font-semibold text-museum-black">
                        {rune.metadata.divisibility}
                      </span>
                    </div>
                    {rune.trading_volume_24h && Number(rune.trading_volume_24h) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-museum-dark-gray">24h Volume</span>
                        <span className="font-semibold text-green-600">
                          {Number(rune.trading_volume_24h).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mint Terms Badge */}
                  {rune.metadata.terms.length > 0 && (
                    <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-semibold text-blue-900 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Minting Available
                      </p>
                    </div>
                  )}

                  {/* Verified Badge */}
                  {/* TODO: Enable when backend adds verified field */}
                  {/* {rune.verified && (
                    <div className="mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-semibold text-green-900">
                        ✓ Verified Rune
                      </p>
                    </div>
                  )} */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && runes.length === 0 && (
        <div className="border-2 border-dashed border-museum-light-gray rounded-xl p-12 text-center">
          <Sparkles className="h-12 w-12 text-museum-dark-gray mx-auto mb-4" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            No Runes Yet
          </h3>
          <p className="text-museum-dark-gray mb-6">
            Be the first to create a Bitcoin Rune
          </p>
          <Link href="/create">
            <Button size="lg">
              <Sparkles className="h-5 w-5 mr-2" />
              Create Your First Rune
            </Button>
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/create"
          className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-gold-50 to-gold-100 hover:shadow-lg transition-all group"
        >
          <Sparkles className="h-8 w-8 text-gold-600 mb-3" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            Create a Rune
          </h3>
          <p className="text-sm text-museum-dark-gray">
            Etch your own Bitcoin Rune on the blockchain
          </p>
          <div className="mt-4 flex items-center gap-2 text-gold-600 font-medium">
            Start Creating
            <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/explorer"
          className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-lg transition-all group"
        >
          <Filter className="h-8 w-8 text-blue-600 mb-3" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            Advanced Search
          </h3>
          <p className="text-sm text-museum-dark-gray">
            Filter and search all Runes with advanced options
          </p>
          <div className="mt-4 flex items-center gap-2 text-blue-600 font-medium">
            Open Explorer
            <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        <Link
          href="/dashboard"
          className="border border-museum-light-gray rounded-xl p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-lg transition-all group"
        >
          <TrendingUp className="h-8 w-8 text-purple-600 mb-3" />
          <h3 className="font-serif text-xl font-bold text-museum-black mb-2">
            My Dashboard
          </h3>
          <p className="text-sm text-museum-dark-gray">
            View your Runes and track your creations
          </p>
          <div className="mt-4 flex items-center gap-2 text-purple-600 font-medium">
            Go to Dashboard
            <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Detail Modal */}
      {selectedRune && (
        <div
          onClick={() => setSelectedRune(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-museum-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className={`h-48 bg-gradient-to-br ${getRuneColor(selectedRune.metadata.name)} p-8 relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-32 -translate-y-32"></div>
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-32 translate-y-32"></div>
              </div>
              <div className="relative">
                <div className="text-7xl font-bold text-white drop-shadow-2xl mb-4">
                  {selectedRune.metadata.symbol}
                </div>
                <h2 className="font-serif text-3xl font-bold text-white drop-shadow-lg">
                  {selectedRune.metadata.name}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-museum-cream rounded-lg p-4">
                  <p className="text-xs text-museum-dark-gray mb-1">Supply</p>
                  <p className="text-lg font-bold text-museum-black">
                    {formatSupply(selectedRune.metadata.premine, selectedRune.metadata.divisibility)}
                  </p>
                </div>
                <div className="bg-museum-cream rounded-lg p-4">
                  <p className="text-xs text-museum-dark-gray mb-1">Holders</p>
                  <p className="text-lg font-bold text-museum-black">
                    {selectedRune.holder_count?.toString() || '0'}
                  </p>
                </div>
                <div className="bg-museum-cream rounded-lg p-4">
                  <p className="text-xs text-museum-dark-gray mb-1">Divisibility</p>
                  <p className="text-lg font-bold text-museum-black">
                    {selectedRune.metadata.divisibility}
                  </p>
                </div>
                <div className="bg-museum-cream rounded-lg p-4">
                  <p className="text-xs text-museum-dark-gray mb-1">24h Volume</p>
                  <p className="text-lg font-bold text-green-600">
                    {selectedRune.trading_volume_24h
                      ? Number(selectedRune.trading_volume_24h).toLocaleString()
                      : '0'}
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-museum-light-gray">
                  <span className="text-museum-dark-gray">Rune ID</span>
                  <span className="font-mono text-sm text-museum-black">
                    {selectedRune.metadata.key.block.toString()}:{selectedRune.metadata.key.tx}
                  </span>
                </div>
                {/* TODO: Enable when backend adds verified field */}
                {/* <div className="flex justify-between py-2 border-b border-museum-light-gray">
                  <span className="text-museum-dark-gray">Status</span>
                  <span className={`font-medium ${selectedRune.verified ? 'text-green-600' : 'text-gray-600'}`}>
                    {selectedRune.verified ? '✓ Verified' : 'Unverified'}
                  </span>
                </div> */}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={() => setSelectedRune(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Close
                </Button>
                <a
                  href={`https://mempool.space/rune/${selectedRune.metadata.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Bitcoin
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
