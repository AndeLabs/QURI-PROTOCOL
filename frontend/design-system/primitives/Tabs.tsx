/**
 * Tabs Primitive Component
 * Accessible tab navigation with keyboard support
 */

'use client';

import { useState } from 'react';

export interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  badge?: number | string;
}

export interface TabsProps {
  tabs: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'line' | 'pills' | 'enclosed';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function Tabs({
  tabs,
  value: controlledValue,
  onChange,
  variant = 'line',
  size = 'md',
  className = '',
  children,
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(tabs[0]?.value || '');
  const value = controlledValue ?? internalValue;

  const handleChange = (newValue: string) => {
    if (!controlledValue) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  };

  // Size variants
  const sizeStyles = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-5 py-2.5',
  };

  // Variant styles
  const getTabStyles = (tab: TabItem, isActive: boolean) => {
    const base = `
      ${sizeStyles[size]}
      font-medium transition-all
      ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      flex items-center gap-2
    `;

    switch (variant) {
      case 'line':
        return `
          ${base}
          border-b-2
          ${
            isActive
              ? 'border-gold-500 text-gold-700'
              : 'border-transparent text-museum-dark-gray hover:text-museum-black hover:border-museum-light-gray'
          }
        `;

      case 'pills':
        return `
          ${base}
          rounded-lg
          ${
            isActive
              ? 'bg-gold-100 text-gold-700'
              : 'text-museum-dark-gray hover:bg-museum-cream hover:text-museum-black'
          }
        `;

      case 'enclosed':
        return `
          ${base}
          border border-b-0 rounded-t-lg
          ${
            isActive
              ? 'bg-museum-white border-museum-light-gray text-museum-black -mb-px'
              : 'bg-museum-cream border-transparent text-museum-dark-gray hover:text-museum-black'
          }
        `;

      default:
        return base;
    }
  };

  return (
    <div className={className}>
      {/* Tab List */}
      <div
        role="tablist"
        className={`
          flex items-center
          ${variant === 'line' ? 'border-b border-museum-light-gray' : ''}
          ${variant === 'pills' ? 'gap-2 p-1 bg-museum-cream rounded-lg' : ''}
          ${variant === 'enclosed' ? 'gap-1' : ''}
        `}
      >
        {tabs.map((tab) => {
          const isActive = tab.value === value;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled}
              onClick={() => !tab.disabled && handleChange(tab.value)}
              className={getTabStyles(tab, isActive)}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`
                    px-2 py-0.5 text-xs font-semibold rounded-full
                    ${
                      isActive
                        ? 'bg-gold-500 text-white'
                        : 'bg-museum-light-gray text-museum-dark-gray'
                    }
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {children && (
        <div role="tabpanel" className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}
