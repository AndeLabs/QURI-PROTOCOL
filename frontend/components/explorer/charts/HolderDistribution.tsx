'use client';

/**
 * Holder Distribution Chart Component
 * Pie/Donut chart showing holder distribution
 */

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCompact, formatPercent } from '@/lib/utils/format';

interface HolderData {
  name: string;
  value: number;
  address?: string;
  [key: string]: string | number | undefined;
}

interface HolderDistributionProps {
  data: HolderData[];
  height?: number;
  showLegend?: boolean;
  variant?: 'pie' | 'donut';
  className?: string;
}

// Golden-themed color palette
const COLORS = [
  '#D4AF37', // Gold
  '#B8860B', // Dark goldenrod
  '#FFD700', // Gold
  '#F0E68C', // Khaki
  '#EEE8AA', // Pale goldenrod
  '#BDB76B', // Dark khaki
  '#DAA520', // Goldenrod
  '#CD853F', // Peru
  '#A0522D', // Sienna
  '#8B7355', // Burlywood4
];

export function HolderDistribution({
  data,
  height = 300,
  showLegend = true,
  variant = 'donut',
  className = '',
}: HolderDistributionProps) {
  // Calculate total
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = (item.value / total) * 100;

      return (
        <div className="bg-museum-white border border-museum-light-gray rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-museum-black mb-1">{item.name}</p>
          <div className="space-y-1">
            <p className="text-sm text-museum-dark-gray">
              Balance:{' '}
              <span className="font-semibold text-museum-black">
                {formatCompact(item.value)}
              </span>
            </p>
            <p className="text-sm text-museum-dark-gray">
              Share:{' '}
              <span className="font-semibold text-museum-black">
                {formatPercent(percentage)}
              </span>
            </p>
            {item.address && (
              <p className="text-xs text-museum-dark-gray font-mono">
                {item.address.slice(0, 8)}...{item.address.slice(-8)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props;

    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-museum-dark-gray">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  if (data.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-museum-cream/50 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-museum-dark-gray text-sm">No holder data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={variant === 'donut' ? '60%' : 0}
            outerRadius="80%"
            paddingAngle={2}
            dataKey="value"
            animationDuration={1000}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend content={renderLegend} />}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Generate mock holder distribution data
 */
export function generateMockHolderData(): HolderData[] {
  return [
    { name: 'Top 1', value: 35000000, address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
    { name: 'Top 2', value: 25000000, address: 'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4' },
    { name: 'Top 3', value: 15000000, address: 'bc1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde450xdlk4ugp7szw5tk9' },
    { name: 'Top 4', value: 10000000, address: 'bc1qxhmdufsvnuaaaer4ynz88fspdsxq2h9e9cetdj' },
    { name: 'Top 5', value: 8000000, address: 'bc1qf5z4qn8e9vf3m0s9v3qn8e9vf3m0s9v3qn8e9v' },
    { name: 'Others', value: 7000000 },
  ];
}

/**
 * Concentration Bar Component
 * Shows top holder concentration as a horizontal bar
 */
export function ConcentrationBar({
  topHoldersPercentage,
  className = '',
}: {
  topHoldersPercentage: number;
  className?: string;
}) {
  const getConcentrationColor = (percentage: number) => {
    if (percentage > 80) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    if (percentage > 40) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getConcentrationLabel = (percentage: number) => {
    if (percentage > 80) return 'Very High';
    if (percentage > 60) return 'High';
    if (percentage > 40) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between text-sm">
        <span className="text-museum-dark-gray">Top 10 Concentration</span>
        <span className="font-medium text-museum-black">
          {formatPercent(topHoldersPercentage)}
        </span>
      </div>
      <div className="h-2 bg-museum-light-gray rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getConcentrationColor(
            topHoldersPercentage
          )}`}
          style={{ width: `${topHoldersPercentage}%` }}
        />
      </div>
      <p className="text-xs text-museum-dark-gray">
        {getConcentrationLabel(topHoldersPercentage)} concentration
      </p>
    </div>
  );
}
