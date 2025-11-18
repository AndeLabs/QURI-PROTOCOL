/**
 * Test Page - For testing modern components in anonymous mode
 * Access at: http://localhost:3001/test
 */

'use client';

import { ModernDashboard } from '@/components/ModernDashboard';
import { SystemHealth } from '@/components/SystemHealth';
import { ActiveProcesses } from '@/components/ActiveProcesses';
import { ModernRuneGallery } from '@/components/ModernRuneGallery';
import { useState } from 'react';

export default function TestPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'health' | 'processes' | 'gallery'>(
    'dashboard'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QURI Protocol - Test Mode</h1>
              <p className="text-sm text-gray-500">Testing modern components in anonymous mode</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                Anonymous Mode
              </span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                Query Only
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'health'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              System Health
            </button>
            <button
              onClick={() => setActiveTab('processes')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'processes'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Active Processes
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'gallery'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Rune Gallery
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Instructions Banner */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-900 mb-2">
            📋 Testing Instructions
          </h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>✅ All components use real canister calls (query methods only)</li>
            <li>✅ Open DevTools (F12) → Network tab to see API calls</li>
            <li>✅ Data might be empty (0 runes, no processes) - this is expected</li>
            <li>⚠️ Creating runes requires mainnet deployment (mutation methods)</li>
          </ul>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Dashboard Test</h2>
              <p className="text-sm text-gray-600 mb-4">
                Testing: ModernDashboard component with real-time metrics
              </p>
            </div>
            <ModernDashboard />
          </div>
        )}

        {activeTab === 'health' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">System Health Test</h2>
              <p className="text-sm text-gray-600 mb-4">
                Testing: SystemHealth component with canister status checks
              </p>
            </div>
            <SystemHealth showMetrics={true} compact={false} />
          </div>
        )}

        {activeTab === 'processes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Active Processes Test</h2>
              <p className="text-sm text-gray-600 mb-4">
                Testing: ActiveProcesses component with auto-refresh (shows empty state if no
                processes)
              </p>
            </div>
            <ActiveProcesses maxVisible={10} showCompleted={true} showFailed={true} />
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Rune Gallery Test</h2>
              <p className="text-sm text-gray-600 mb-4">
                Testing: ModernRuneGallery with infinite scroll and search (shows empty state if no
                runes)
              </p>
            </div>
            <ModernRuneGallery />
          </div>
        )}
      </main>

      {/* Footer with Debug Info */}
      <footer className="mt-12 py-6 bg-white border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="text-center text-xs text-gray-500">
            <p className="mb-2">
              <strong>Canister IDs:</strong>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto">
              <div className="p-2 bg-gray-50 rounded">
                <p className="font-medium text-gray-700">Rune Engine</p>
                <p className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID?.slice(0, 10)}...
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="font-medium text-gray-700">Bitcoin</p>
                <p className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID?.slice(0, 10)}...
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="font-medium text-gray-700">Registry</p>
                <p className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_REGISTRY_CANISTER_ID?.slice(0, 10)}...
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <p className="font-medium text-gray-700">Identity</p>
                <p className="font-mono text-xs">
                  {process.env.NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID?.slice(0, 10)}...
                </p>
              </div>
            </div>
            <p className="mt-4 text-gray-400">
              🚀 QURI Protocol - Frontend Modernization Complete
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
