'use client';

/**
 * Volume Chart Component
 * Displays trading volume over time with area chart
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatCompact } from '@/lib/utils/format';

interface VolumeDataPoint {
  date: string;
  volume: number;
}

interface VolumeChartProps {
  data: VolumeDataPoint[];
  height?: number;
  showGrid?: boolean;
  color?: string;
  className?: string;
}

export function VolumeChart({
  data,
  height = 300,
  showGrid = true,
  color = '#D4AF37',
  className = '',
}: VolumeChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-museum-white border border-museum-light-gray rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-museum-black mb-1">{label}</p>
          <p className="text-sm text-museum-dark-gray">
            Volume:{' '}
            <span className="font-semibold text-museum-black">
              {formatCompact(payload[0].value)}
            </span>
          </p>
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
        <p className="text-museum-dark-gray text-sm">No volume data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
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
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="volume"
            stroke={color}
            strokeWidth={2}
            fill="url(#volumeGradient)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Generate mock volume data for demonstration
 */
export function generateMockVolumeData(days: number = 30): VolumeDataPoint[] {
  const data: VolumeDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      volume: Math.floor(Math.random() * 100000) + 10000,
    });
  }

  return data;
}
