/**
 * Modern Dashboard with Real-time Metrics
 * Uses React Query for auto-updating stats
 */

'use client';

import {
  useRegistryStatsQuery,
  useMetricsSummaryQuery,
  useHealthQuery,
  useActiveProcessesMonitor,
} from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { ProcessBadge } from './ProcessMonitor';
import {
  Loader2,
  TrendingUp,
  Zap,
  Activity,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export function ModernDashboard() {
  const { data: registryStats, isLoading: statsLoading, isError: statsError } = useRegistryStatsQuery();
  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useMetricsSummaryQuery();
  const { data: health, isLoading: healthLoading, isError: healthError, error: healthErrorMsg } = useHealthQuery();
  const { activeProcesses, totalActive } = useActiveProcessesMonitor();

  const isLoading = statsLoading || metricsLoading || healthLoading;
  const hasErrors = statsError || metricsError || healthError;

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-3" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Failed to Load Dashboard
          </h3>
          <p className="text-sm text-red-600 mb-4">
            {healthErrorMsg instanceof Error ? healthErrorMsg.message : 'Unable to fetch dashboard data'}
          </p>
          <p className="text-xs text-red-500">
            Please check your connection and try refreshing the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Health Banner */}
      {health && (
        <Card
          className={`border-2 ${
            health.healthy ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
          }`}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {health.healthy ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      health.healthy ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {health.healthy ? 'System Healthy' : 'System Issues Detected'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {health.etching_config_initialized
                      ? '✓'
                      : '✗'} Config • {health.bitcoin_integration_configured ? '✓' : '✗'} Bitcoin •{' '}
                    {health.registry_configured ? '✓' : '✗'} Registry
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-500">
                Updated {new Date().toLocaleTimeString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Runes */}
        <StatCard
          title="Total Runes"
          value={registryStats?.total_runes.toString() || '0'}
          icon={<TrendingUp className="w-5 h-5" />}
          trend="+12%"
          trendUp
        />

        {/* 24h Volume */}
        <StatCard
          title="24h Volume"
          value={`${Number(registryStats?.total_volume_24h || 0n) / 1e8} BTC`}
          icon={<Activity className="w-5 h-5" />}
          trend="+5%"
          trendUp
        />

        {/* Success Rate */}
        <StatCard
          title="Success Rate"
          value={`${metrics?.success_rate_percent || 0}%`}
          icon={<CheckCircle className="w-5 h-5" />}
          trend="+2%"
          trendUp
        />

        {/* Active Processes */}
        <StatCard
          title="Active Processes"
          value={totalActive.toString()}
          icon={<Zap className="w-5 h-5" />}
          isLive
        />
      </div>

      {/* Performance Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricItem
                label="Total Runes Created"
                value={metrics.total_runes_created.toString()}
              />
              <MetricItem
                label="Total Errors"
                value={metrics.total_errors.toString()}
                valueColor="text-red-600"
              />
              <MetricItem
                label="Avg Latency"
                value={`${Number(metrics.avg_etching_latency_ms)}ms`}
              />
              <MetricItem
                label="Active Processes"
                value={metrics.active_processes.toString()}
              />
              <MetricItem
                label="Pending Processes"
                value={metrics.pending_processes.toString()}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Processes */}
      {activeProcesses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 animate-pulse text-orange-500" />
              Active Etchings ({totalActive})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeProcesses.map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-mono font-medium">{process.rune_name}</p>
                    <p className="text-xs text-gray-500">
                      Started {new Date(Number(process.created_at) / 1_000_000).toLocaleTimeString()}
                    </p>
                  </div>
                  <ProcessBadge state={process.state} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  isLive?: boolean;
}

function StatCard({ title, value, icon, trend, trendUp, isLive }: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{title}</span>
          <div className="text-gray-400">{icon}</div>
        </div>
        <div className="flex items-baseline justify-between">
          <p className="text-2xl font-bold">{value}</p>
          {trend && (
            <span
              className={`text-xs font-medium ${
                trendUp ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend}
            </span>
          )}
          {isLive && (
            <span className="flex items-center gap-1 text-xs text-orange-600">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Metric Item Component
 */
interface MetricItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

function MetricItem({ label, value, valueColor = 'text-gray-900' }: MetricItemProps) {
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className={`text-xl font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
