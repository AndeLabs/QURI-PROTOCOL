'use client';

/**
 * Public Sync Page
 * Página pública para sincronizar runes desde Hiro API
 * No requiere privilegios de admin
 */

import { HybridSync } from '@/components/admin/HybridSync';
import { useIndexerStats } from '@/hooks/useIndexedRunes';
import { Loader2 } from 'lucide-react';

export default function SyncPage() {
  const { data: stats, isLoading } = useIndexerStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-gold-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
          Rune Synchronization
        </h1>
        <p className="text-museum-dark-gray">
          Sync Bitcoin Runes from Hiro API to QURI Protocol
        </p>
      </div>

      {/* Current Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border border-museum-light-gray rounded-xl p-4 bg-museum-white">
            <p className="text-xs text-museum-dark-gray mb-1">Total Runes</p>
            <p className="text-2xl font-bold text-museum-black">
              {stats.total_runes.toString()}
            </p>
          </div>
          <div className="border border-museum-light-gray rounded-xl p-4 bg-museum-white">
            <p className="text-xs text-museum-dark-gray mb-1">Etchings</p>
            <p className="text-2xl font-bold text-museum-black">
              {stats.total_etchings.toString()}
            </p>
          </div>
          <div className="border border-museum-light-gray rounded-xl p-4 bg-museum-white">
            <p className="text-xs text-museum-dark-gray mb-1">Last Block</p>
            <p className="text-2xl font-bold text-museum-black">
              {stats.last_indexed_block.toString()}
            </p>
          </div>
          <div className="border border-museum-light-gray rounded-xl p-4 bg-museum-white">
            <p className="text-xs text-museum-dark-gray mb-1">Errors</p>
            <p className="text-2xl font-bold text-museum-black">
              {stats.indexing_errors.toString()}
            </p>
          </div>
        </div>
      )}

      {/* Hybrid Sync Component */}
      <HybridSync />

      {/* Info Section */}
      <div className="mt-8 border border-blue-200 bg-blue-50 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-blue-800">
          <li>
            <strong>Hybrid approach:</strong> Your browser fetches data from Hiro API
          </li>
          <li>
            <strong>Reliable:</strong> Avoids ICP HTTP outcall limitations
          </li>
          <li>
            <strong>Public:</strong> No admin privileges required
          </li>
          <li>
            <strong>Progress tracking:</strong> Real-time sync status and progress bar
          </li>
        </ul>
      </div>
    </div>
  );
}
