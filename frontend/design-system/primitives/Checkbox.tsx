/**
 * Checkbox Primitive Component
 * Accessible checkbox with label support
 */

'use client';

import { Check, Minus } from 'lucide-react';

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  label,
  description,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
}: CheckboxProps) {
  const handleChange = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  // Size variants
  const sizeStyles = {
    sm: {
      box: 'h-4 w-4',
      icon: 'h-3 w-3',
      label: 'text-sm',
      description: 'text-xs',
    },
    md: {
      box: 'h-5 w-5',
      icon: 'h-4 w-4',
      label: 'text-base',
      description: 'text-sm',
    },
    lg: {
      box: 'h-6 w-6',
      icon: 'h-5 w-5',
      label: 'text-lg',
      description: 'text-base',
    },
  };

  const styles = sizeStyles[size];

  return (
    <label
      className={`
        flex items-start gap-3 group
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
    >
      {/* Checkbox Box */}
      <div className="flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            ${styles.box}
            rounded border-2 flex items-center justify-center transition-all
            ${
              checked || indeterminate
                ? error
                  ? 'bg-red-600 border-red-600'
                  : 'bg-gold-500 border-gold-500'
                : error
                ? 'border-red-300 bg-red-50'
                : 'border-museum-light-gray bg-museum-white'
            }
            ${
              !disabled && !checked && !indeterminate
                ? error
                  ? 'group-hover:border-red-400'
                  : 'group-hover:border-gold-300'
                : ''
            }
            ${!disabled && 'focus-within:ring-2 focus-within:ring-gold-200'}
          `}
        >
          {checked && !indeterminate && (
            <Check className={`${styles.icon} text-white`} strokeWidth={3} />
          )}
          {indeterminate && (
            <Minus className={`${styles.icon} text-white`} strokeWidth={3} />
          )}
        </div>
      </div>

      {/* Label & Description */}
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <div
              className={`
              ${styles.label}
              font-medium text-museum-black
              ${error ? 'text-red-700' : 'text-museum-black'}
            `}
            >
              {label}
            </div>
          )}
          {description && (
            <div className={`${styles.description} text-museum-dark-gray mt-0.5`}>
              {description}
            </div>
          )}
        </div>
      )}
    </label>
  );
}
