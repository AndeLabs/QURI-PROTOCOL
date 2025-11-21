'use client';

/**
 * Stats Chart Component
 * Multi-line chart for displaying various statistics over time
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCompact } from '@/lib/utils/format';

interface StatsDataPoint {
  date: string;
  [key: string]: number | string;
}

interface StatConfig {
  key: string;
  label: string;
  color: string;
}

interface StatsChartProps {
  data: StatsDataPoint[];
  stats: StatConfig[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

export function StatsChart({
  data,
  stats,
  height = 300,
  showGrid = true,
  showLegend = true,
  className = '',
}: StatsChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-museum-white border border-museum-light-gray rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-museum-black mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-museum-dark-gray">{entry.name}:</span>
                <span className="font-semibold text-museum-black">
                  {formatCompact(entry.value)}
                </span>
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-museum-cream/50 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-museum-dark-gray text-sm">No data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E5E7EB"
              vertical={false}
            />
          )}
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickFormatter={(value) => formatCompact(value)}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: 20 }}
            />
          )}
          {stats.map((stat) => (
            <Line
              key={stat.key}
              type="monotone"
              dataKey={stat.key}
              name={stat.label}
              stroke={stat.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: stat.color }}
              animationDuration={1000}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Generate mock stats data for demonstration
 */
export function generateMockStatsData(days: number = 30): StatsDataPoint[] {
  const data: StatsDataPoint[] = [];
  const now = new Date();

  let mints = 100;
  let holders = 50;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    mints += Math.floor(Math.random() * 20);
    holders += Math.floor(Math.random() * 10);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      mints,
      holders,
      volume: Math.floor(Math.random() * 50000) + 5000,
    });
  }

  return data;
}
