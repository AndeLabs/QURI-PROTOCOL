/**
 * Slider Primitive Component
 * Range slider with labels and value display
 */

'use client';

import { useState } from 'react';

export interface SliderProps {
  value?: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Slider({
  value = 50,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onChange?.(Number(e.target.value));
    }
  };

  // Calculate percentage for filled track
  const percentage = ((value - min) / (max - min)) * 100;

  // Size variants
  const sizeStyles = {
    sm: {
      track: 'h-1',
      thumb: 'h-4 w-4',
      label: 'text-sm',
      value: 'text-xs',
    },
    md: {
      track: 'h-1.5',
      thumb: 'h-5 w-5',
      label: 'text-base',
      value: 'text-sm',
    },
    lg: {
      track: 'h-2',
      thumb: 'h-6 w-6',
      label: 'text-lg',
      value: 'text-base',
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label and Value */}
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              className={`
              ${styles.label}
              font-medium
              ${error ? 'text-red-700' : 'text-museum-black'}
              ${disabled ? 'opacity-50' : ''}
            `}
            >
              {label}
            </label>
          )}
          {showValue && (
            <span
              className={`
              ${styles.value}
              font-mono font-medium
              ${error ? 'text-red-600' : 'text-museum-dark-gray'}
              ${disabled ? 'opacity-50' : ''}
            `}
            >
              {value}
            </span>
          )}
        </div>
      )}

      {/* Slider Container */}
      <div className="relative">
        {/* Track Background */}
        <div
          className={`
            ${styles.track}
            w-full rounded-full
            ${error ? 'bg-red-100' : 'bg-gray-200'}
            ${disabled ? 'opacity-50' : ''}
          `}
        >
          {/* Filled Track */}
          <div
            className={`
              ${styles.track}
              rounded-full transition-all
              ${error ? 'bg-red-500' : 'bg-gold-500'}
            `}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Slider Input (invisible but functional) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className="
            absolute inset-0 w-full opacity-0 cursor-pointer
            disabled:cursor-not-allowed
          "
        />

        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `calc(${percentage}% - ${parseInt(styles.thumb.split(' ')[1].replace('w-', '')) * 4}px)` }}
        >
          <div
            className={`
              ${styles.thumb}
              rounded-full border-2 shadow-md transition-all
              ${error ? 'bg-museum-white border-red-500' : 'bg-museum-white border-gold-500'}
              ${isDragging ? 'scale-110' : 'scale-100'}
              ${disabled ? 'opacity-50' : ''}
            `}
          />
        </div>
      </div>

      {/* Min/Max Labels */}
      <div className="flex items-center justify-between">
        <span className={`text-xs text-museum-dark-gray ${disabled ? 'opacity-50' : ''}`}>
          {min}
        </span>
        <span className={`text-xs text-museum-dark-gray ${disabled ? 'opacity-50' : ''}`}>
          {max}
        </span>
      </div>
    </div>
  );
}
