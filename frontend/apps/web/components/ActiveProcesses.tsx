/**
 * Active Processes Monitor Component
 * Displays all active etching processes with real-time updates
 */

'use client';

import { useState } from 'react';
import { useActiveProcessesMonitor, useEtchingProcessesQuery } from '@/hooks/queries';
import { ProcessBadge } from './ProcessMonitor';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Button } from './ui/Button';
import {
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface ActiveProcessesProps {
  maxVisible?: number;
  showCompleted?: boolean;
  showFailed?: boolean;
}

export function ActiveProcesses({
  maxVisible = 5,
  showCompleted = true,
  showFailed = true,
}: ActiveProcessesProps) {
  const [expanded, setExpanded] = useState(false);
  const { activeProcesses, totalActive } = useActiveProcessesMonitor();
  const { data: recentProcesses, isLoading } = useEtchingProcessesQuery(0n, 20n);

  // Filter processes based on preferences
  const allProcesses = recentProcesses || [];
  const filteredProcesses = allProcesses.filter((process) => {
    const isActive = !['Completed', 'Failed'].includes(process.state);
    const isCompleted = process.state === 'Completed';
    const isFailed = process.state === 'Failed';

    if (isActive) return true;
    if (isCompleted && showCompleted) return true;
    if (isFailed && showFailed) return true;
    return false;
  });

  // Determine how many to show
  const visibleProcesses = expanded
    ? filteredProcesses
    : filteredProcesses.slice(0, maxVisible);
  const hasMore = filteredProcesses.length > maxVisible;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading processes...</p>
        </CardContent>
      </Card>
    );
  }

  if (filteredProcesses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-gray-400" />
            Active Processes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No active processes</p>
            <p className="text-xs text-gray-400 mt-1">
              Create a new Rune to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity
              className={`w-5 h-5 ${
                totalActive > 0 ? 'animate-pulse text-orange-500' : 'text-gray-400'
              }`}
            />
            Active Processes
            {totalActive > 0 && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs font-bold rounded-full">
                {totalActive}
              </span>
            )}
          </CardTitle>

          {totalActive > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              Auto-updating
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Process List */}
        <div className="space-y-2">
          {visibleProcesses.map((process) => (
            <ProcessRow key={process.id} process={process} />
          ))}
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-2"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Show {filteredProcesses.length - maxVisible} More
              </>
            )}
          </Button>
        )}

        {/* Summary Stats */}
        <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
          <SummaryStat
            label="Active"
            value={totalActive}
            icon={<Activity className="w-4 h-4" />}
            color="text-orange-600"
          />
          <SummaryStat
            label="Completed"
            value={allProcesses.filter((p) => p.state === 'Completed').length}
            icon={<CheckCircle2 className="w-4 h-4" />}
            color="text-green-600"
          />
          <SummaryStat
            label="Failed"
            value={allProcesses.filter((p) => p.state === 'Failed').length}
            icon={<XCircle className="w-4 h-4" />}
            color="text-red-600"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual Process Row
 */
interface ProcessRowProps {
  process: {
    id: string;
    rune_name: string;
    state: string;
    created_at: bigint;
    updated_at: bigint;
    retry_count: number;
  };
}

function ProcessRow({ process }: ProcessRowProps) {
  const isActive = !['Completed', 'Failed'].includes(process.state);
  const createdAt = new Date(Number(process.created_at) / 1_000_000);
  const timeSinceCreation = getTimeSince(createdAt);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        isActive
          ? 'bg-orange-50 border-orange-200'
          : process.state === 'Completed'
          ? 'bg-green-50 border-green-200'
          : 'bg-red-50 border-red-200'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono font-medium text-sm truncate">{process.rune_name}</p>
          {process.retry_count > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-600">
              <RefreshCw className="w-3 h-3" />
              {process.retry_count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{timeSinceCreation}</span>
          <span className="text-gray-300">•</span>
          <span className="font-mono">{process.id.slice(0, 8)}...</span>
        </div>
      </div>

      <div className="ml-4 flex-shrink-0">
        <ProcessBadge state={process.state} />
      </div>
    </div>
  );
}

/**
 * Summary Stat Component
 */
interface SummaryStatProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function SummaryStat({ label, value, icon, color }: SummaryStatProps) {
  return (
    <div>
      <div className={`flex items-center justify-center gap-1 mb-1 ${color}`}>
        {icon}
        <span className="text-xl font-bold">{value}</span>
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

/**
 * Helper: Calculate time since creation
 */
function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
