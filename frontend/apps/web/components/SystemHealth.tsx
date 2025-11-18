/**
 * System Health Monitor Component
 * Displays real-time health status of all canisters and integrations
 */

'use client';

import { useHealthQuery, useMetricsSummaryQuery } from '@/hooks/queries';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Activity,
  Server,
  Zap,
  TrendingUp,
  Loader2,
} from 'lucide-react';

interface SystemHealthProps {
  showMetrics?: boolean;
  compact?: boolean;
}

export function SystemHealth({ showMetrics = true, compact = false }: SystemHealthProps) {
  const { data: health, isLoading: healthLoading } = useHealthQuery();
  const { data: metrics, isLoading: metricsLoading } = useMetricsSummaryQuery();

  if (healthLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Checking system health...</p>
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card className="border-2 border-red-500 bg-red-50">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-red-900">Unable to fetch system health</p>
              <p className="text-sm text-red-700">Check canister connection</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isHealthy = health.healthy;
  const statusColor = isHealthy ? 'green' : 'red';
  const bgColor = isHealthy ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isHealthy ? 'border-green-500' : 'border-red-500';
  const textColor = isHealthy ? 'text-green-900' : 'text-red-900';

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bgColor} ${borderColor}`}
      >
        {isHealthy ? (
          <CheckCircle className={`w-4 h-4 text-${statusColor}-600`} />
        ) : (
          <AlertTriangle className={`w-4 h-4 text-${statusColor}-600`} />
        )}
        <span className={`text-sm font-medium ${textColor}`}>
          {isHealthy ? 'System Healthy' : 'System Issues'}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Health Status */}
      <Card className={`border-2 ${borderColor} ${bgColor}`}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isHealthy ? (
                <CheckCircle className={`w-6 h-6 text-${statusColor}-600`} />
              ) : (
                <AlertTriangle className={`w-6 h-6 text-${statusColor}-600`} />
              )}
              <div>
                <p className={`font-medium ${textColor}`}>
                  {isHealthy ? 'All Systems Operational' : 'System Issues Detected'}
                </p>
                <p className="text-xs text-gray-600">
                  Last checked: {new Date().toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className={`w-2 h-2 bg-${statusColor}-500 rounded-full animate-pulse`} />
              Live
            </div>
          </div>

          {/* Component Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-200">
            <ComponentStatus
              label="Etching Config"
              healthy={health.etching_config_initialized}
              icon={<Server className="w-4 h-4" />}
            />
            <ComponentStatus
              label="Bitcoin Integration"
              healthy={health.bitcoin_integration_configured}
              icon={<Zap className="w-4 h-4" />}
            />
            <ComponentStatus
              label="Registry"
              healthy={health.registry_configured}
              icon={<Activity className="w-4 h-4" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics Summary */}
      {showMetrics && metrics && !metricsLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricItem
                label="Total Runes"
                value={metrics.total_runes_created.toString()}
                color="text-blue-600"
              />
              <MetricItem
                label="Active"
                value={metrics.active_processes.toString()}
                color="text-orange-600"
              />
              <MetricItem
                label="Pending"
                value={metrics.pending_processes.toString()}
                color="text-yellow-600"
              />
              <MetricItem
                label="Success Rate"
                value={`${metrics.success_rate_percent}%`}
                color={metrics.success_rate_percent >= 95 ? 'text-green-600' : 'text-orange-600'}
              />
            </div>

            {/* Performance Metrics */}
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Avg Latency</p>
                <p className="text-sm font-bold text-gray-900">
                  {Number(metrics.avg_etching_latency_ms).toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Errors</p>
                <p
                  className={`text-sm font-bold ${
                    metrics.total_errors > 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {metrics.total_errors.toString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Component Status Indicator
 */
interface ComponentStatusProps {
  label: string;
  healthy: boolean;
  icon: React.ReactNode;
}

function ComponentStatus({ label, healthy, icon }: ComponentStatusProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={healthy ? 'text-green-600' : 'text-red-600'}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-600 truncate">{label}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {healthy ? (
            <CheckCircle className="w-3 h-3 text-green-600" />
          ) : (
            <XCircle className="w-3 h-3 text-red-600" />
          )}
          <span className={`text-xs font-medium ${healthy ? 'text-green-700' : 'text-red-700'}`}>
            {healthy ? 'OK' : 'Error'}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Metric Item Component
 */
interface MetricItemProps {
  label: string;
  value: string;
  color: string;
}

function MetricItem({ label, value, color }: MetricItemProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}

/**
 * Minimal System Health Badge
 * For use in headers/navigation
 */
export function SystemHealthBadge() {
  const { data: health, isLoading } = useHealthQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking...</span>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
        <XCircle className="w-3 h-3" />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
        health.healthy
          ? 'bg-green-100 text-green-800'
          : 'bg-red-100 text-red-800'
      }`}
    >
      {health.healthy ? (
        <CheckCircle className="w-3 h-3" />
      ) : (
        <AlertTriangle className="w-3 h-3" />
      )}
      <span>{health.healthy ? 'Healthy' : 'Issues'}</span>
    </div>
  );
}
