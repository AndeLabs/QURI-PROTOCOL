'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Shield,
  Activity,
  AlertCircle,
  Users,
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader,
  TrendingUp,
  Clock,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { useRegistry } from '@/hooks/useRegistry';
import type { Role, CyclesMetrics, PerformanceMetrics } from '@/types/canisters';

export default function AdminDashboardPage() {
  const {
    getMyRole,
    getOwner,
    getRecentErrors,
    getRecentLogs,
    getCyclesMetrics,
    getPerformanceMetrics,
    listRoleAssignments,
    assignRole,
    revokeRole,
    healthCheck,
    loading: engineLoading,
    error: engineError,
  } = useRuneEngine();

  const {
    getCanisterMetrics,
    isWhitelisted,
    addToWhitelist,
    removeFromWhitelist,
    loading: registryLoading,
    error: registryError,
  } = useRegistry();

  // Auth state
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Metrics state
  const [cyclesMetrics, setCyclesMetrics] = useState<CyclesMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [registryMetrics, setRegistryMetrics] = useState<any | null>(null);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [roleAssignments, setRoleAssignments] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Whitelist management
  const [whitelistPrincipal, setWhitelistPrincipal] = useState('');
  const [whitelistStatus, setWhitelistStatus] = useState<boolean | null>(null);

  // Check admin access
  useEffect(() => {
    async function checkAccess() {
      try {
        setIsLoading(true);
        const [role, ownerPrincipal] = await Promise.all([getMyRole(), getOwner()]);

        setMyRole(role);
        setOwner(ownerPrincipal);

        // Check if user is Admin or Owner
        const hasAccess = role && ('Admin' in role || 'Owner' in role);
        setIsAdmin(hasAccess);
      } catch (err) {
        console.error('Failed to check admin access:', err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAccess();
  }, []);

  // Load metrics
  useEffect(() => {
    if (!isAdmin) return;

    async function loadMetrics() {
      try {
        const [cycles, performance, registry, errors, logs, roles, health] = await Promise.all([
          getCyclesMetrics(),
          getPerformanceMetrics(),
          getCanisterMetrics(),
          getRecentErrors(20n),
          getRecentLogs(50n),
          listRoleAssignments(),
          healthCheck(),
        ]);

        setCyclesMetrics(cycles);
        setPerformanceMetrics(performance);
        setRegistryMetrics(registry);
        setRecentErrors(errors || []);
        setRecentLogs(logs || []);
        setRoleAssignments(roles);
        setSystemHealth(health);
      } catch (err) {
        console.error('Failed to load metrics:', err);
      }
    }

    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleCheckWhitelist = async () => {
    if (!whitelistPrincipal) return;
    const status = await isWhitelisted(whitelistPrincipal);
    setWhitelistStatus(status);
  };

  const handleAddToWhitelist = async () => {
    if (!whitelistPrincipal) return;
    const success = await addToWhitelist(whitelistPrincipal);
    if (success) {
      alert('Principal added to whitelist');
      setWhitelistStatus(true);
    }
  };

  const handleRemoveFromWhitelist = async () => {
    if (!whitelistPrincipal) return;
    const success = await removeFromWhitelist(whitelistPrincipal);
    if (success) {
      alert('Principal removed from whitelist');
      setWhitelistStatus(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader className="h-12 w-12 animate-spin text-gold-600" />
      </div>
    );
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="border-2 border-red-300 bg-red-50 rounded-xl p-12 text-center">
          <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-bold text-red-900 mb-2">Access Denied</h1>
          <p className="text-red-700 mb-6">
            You need Admin or Owner privileges to access this dashboard.
          </p>
          <div className="bg-white border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <strong>Your Role:</strong>{' '}
              {myRole
                ? Object.keys(myRole)[0]
                : 'Unknown'}
            </p>
            {owner && (
              <p className="text-sm text-red-800 mt-2">
                <strong>Owner:</strong> {owner}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Format role name
  const roleName = myRole ? Object.keys(myRole)[0] : 'Unknown';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-4xl font-bold text-museum-black mb-2">
            Admin Dashboard
          </h1>
          <p className="text-museum-dark-gray">
            System monitoring and management console
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-gold-600" />
          <span className="font-semibold text-museum-black">{roleName}</span>
        </div>
      </div>

      {/* System Health */}
      {systemHealth && (
        <div
          className={`border rounded-xl p-6 ${
            systemHealth.healthy
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            {systemHealth.healthy ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
            <h2 className="font-serif text-2xl font-bold text-museum-black">System Health</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-museum-dark-gray mb-1">Overall</p>
              <p
                className={`font-semibold ${
                  systemHealth.healthy ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {systemHealth.healthy ? 'Healthy' : 'Issues Detected'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-museum-dark-gray mb-1">Etching Config</p>
              <p
                className={`font-semibold ${
                  systemHealth.etching_config_initialized ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {systemHealth.etching_config_initialized ? 'Ready' : 'Not Initialized'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-museum-dark-gray mb-1">Bitcoin</p>
              <p
                className={`font-semibold ${
                  systemHealth.bitcoin_integration_configured ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {systemHealth.bitcoin_integration_configured ? 'Connected' : 'Not Configured'}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-xs text-museum-dark-gray mb-1">Registry</p>
              <p
                className={`font-semibold ${
                  systemHealth.registry_configured ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {systemHealth.registry_configured ? 'Connected' : 'Not Configured'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Cycles Balance */}
        {cyclesMetrics && (
          <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
            <div className="flex items-center justify-between mb-4">
              <Database className="h-8 w-8 text-purple-600" />
              <span className="text-xs text-museum-dark-gray">Cycles</span>
            </div>
            <p className="text-2xl font-bold text-museum-black">
              {(Number(cyclesMetrics.balance) / 1_000_000_000_000).toFixed(2)} T
            </p>
            <p className="text-xs text-museum-dark-gray mt-1">
              ~{cyclesMetrics.days_remaining.toString()} days remaining
            </p>
          </div>
        )}

        {/* Total Runes Created */}
        {performanceMetrics && (
          <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <span className="text-xs text-museum-dark-gray">Created</span>
            </div>
            <p className="text-2xl font-bold text-museum-black">
              {performanceMetrics.total_runes_created.toString()}
            </p>
            <p className="text-xs text-museum-dark-gray mt-1">Total Runes</p>
          </div>
        )}

        {/* Active Processes */}
        {performanceMetrics && (
          <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
            <div className="flex items-center justify-between mb-4">
              <Activity className="h-8 w-8 text-blue-600" />
              <span className="text-xs text-museum-dark-gray">Active</span>
            </div>
            <p className="text-2xl font-bold text-museum-black">
              {performanceMetrics.active_processes}
            </p>
            <p className="text-xs text-museum-dark-gray mt-1">
              {performanceMetrics.pending_processes} pending
            </p>
          </div>
        )}

        {/* Error Rate */}
        {performanceMetrics && (
          <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
            <div className="flex items-center justify-between mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <span className="text-xs text-museum-dark-gray">Errors</span>
            </div>
            <p className="text-2xl font-bold text-museum-black">
              {performanceMetrics.total_errors.toString()}
            </p>
            <p className="text-xs text-museum-dark-gray mt-1">
              {performanceMetrics.total_retries.toString()} retries
            </p>
          </div>
        )}
      </div>

      {/* Performance Details */}
      {performanceMetrics && (
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-6 flex items-center gap-2">
            <Cpu className="h-6 w-6 text-gold-600" />
            Performance Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-museum-dark-gray mb-2">Avg Etching Latency</p>
              <p className="text-xl font-bold text-museum-black">
                {(Number(performanceMetrics.avg_etching_latency_ns) / 1_000_000).toFixed(2)} ms
              </p>
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray mb-2">Avg Signing Latency</p>
              <p className="text-xl font-bold text-museum-black">
                {(Number(performanceMetrics.avg_signing_latency_ns) / 1_000_000).toFixed(2)} ms
              </p>
            </div>
            <div>
              <p className="text-sm text-museum-dark-gray mb-2">Avg Broadcast Latency</p>
              <p className="text-xl font-bold text-museum-black">
                {(Number(performanceMetrics.avg_broadcast_latency_ns) / 1_000_000).toFixed(2)} ms
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Registry Metrics */}
      {registryMetrics && (
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-6 flex items-center gap-2">
            <HardDrive className="h-6 w-6 text-gold-600" />
            Registry Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-museum-cream rounded-lg p-4">
              <p className="text-xs text-museum-dark-gray mb-1">Total Queries</p>
              <p className="text-lg font-bold text-museum-black">
                {registryMetrics.total_queries?.toString() || '0'}
              </p>
            </div>
            <div className="bg-museum-cream rounded-lg p-4">
              <p className="text-xs text-museum-dark-gray mb-1">Total Errors</p>
              <p className="text-lg font-bold text-museum-black">
                {registryMetrics.total_errors?.toString() || '0'}
              </p>
            </div>
            <div className="bg-museum-cream rounded-lg p-4">
              <p className="text-xs text-museum-dark-gray mb-1">Cache Hits</p>
              <p className="text-lg font-bold text-museum-black">
                {registryMetrics.cache_hits?.toString() || '0'}
              </p>
            </div>
            <div className="bg-museum-cream rounded-lg p-4">
              <p className="text-xs text-museum-dark-gray mb-1">Memory MB</p>
              <p className="text-lg font-bold text-museum-black">
                {registryMetrics.memory_size
                  ? (Number(registryMetrics.memory_size) / 1_000_000).toFixed(2)
                  : '0'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Management */}
      <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
        <h2 className="font-serif text-2xl font-bold text-museum-black mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-gold-600" />
          Whitelist Management
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-museum-black mb-2">
              Principal ID
            </label>
            <input
              type="text"
              value={whitelistPrincipal}
              onChange={(e) => setWhitelistPrincipal(e.target.value)}
              placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
              className="w-full px-4 py-2 border border-museum-light-gray rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none"
            />
          </div>
          {whitelistStatus !== null && (
            <div
              className={`p-3 rounded-lg ${
                whitelistStatus ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-800'
              }`}
            >
              Status: {whitelistStatus ? 'Whitelisted ✓' : 'Not Whitelisted'}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleCheckWhitelist} variant="outline" disabled={registryLoading}>
              Check Status
            </Button>
            <Button onClick={handleAddToWhitelist} disabled={registryLoading}>
              Add to Whitelist
            </Button>
            <Button
              onClick={handleRemoveFromWhitelist}
              variant="outline"
              disabled={registryLoading}
            >
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div className="border border-red-200 rounded-xl p-6 bg-red-50">
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-6 flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            Recent Errors ({recentErrors.length})
          </h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentErrors.slice(0, 10).map((error, idx) => (
              <div key={idx} className="bg-white border border-red-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900">
                      {error.level || 'Error'}
                    </p>
                    <p className="text-sm text-red-700 mt-1 font-mono">
                      {error.message || JSON.stringify(error)}
                    </p>
                  </div>
                  {error.timestamp && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(Number(error.timestamp) / 1_000_000).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Assignments */}
      {roleAssignments.length > 0 && (
        <div className="border border-museum-light-gray rounded-xl p-6 bg-museum-white">
          <h2 className="font-serif text-2xl font-bold text-museum-black mb-6 flex items-center gap-2">
            <Shield className="h-6 w-6 text-gold-600" />
            Role Assignments ({roleAssignments.length})
          </h2>
          <div className="space-y-2">
            {roleAssignments.map((assignment, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-museum-cream rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-mono text-sm text-museum-black">{assignment.target}</p>
                  <p className="text-xs text-museum-dark-gray mt-1">
                    Granted by: {assignment.granted_by}
                  </p>
                </div>
                <span className="px-3 py-1 bg-gold-100 text-gold-800 rounded-full text-sm font-medium">
                  {assignment.role ? Object.keys(assignment.role)[0] : 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors */}
      {(engineError || registryError) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">{engineError || registryError}</p>
        </div>
      )}
    </div>
  );
}
