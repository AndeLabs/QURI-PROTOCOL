/**
 * Alert Primitive Component
 * Display important messages with different severity levels
 */

'use client';

import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  showIcon?: boolean;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  icon,
  showIcon = true,
  onClose,
  className = '',
}: AlertProps) {
  // Variant configurations
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: Info,
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-800',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      textColor: 'text-green-800',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      textColor: 'text-yellow-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: XCircle,
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      textColor: 'text-red-800',
    },
  };

  const config = variants[variant];
  const Icon = icon || config.icon;

  return (
    <div
      role="alert"
      className={`
        ${config.bg} ${config.border}
        border rounded-lg p-4
        ${className}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {showIcon && (
          <div className="flex-shrink-0">
            {typeof Icon === 'function' ? (
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            ) : (
              Icon
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`font-semibold ${config.titleColor} mb-1`}>{title}</h3>
          )}
          <div className={`text-sm ${config.textColor}`}>{children}</div>
        </div>

        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className={`
              flex-shrink-0 p-1 rounded-lg transition-colors
              ${config.iconColor} hover:bg-black/5
            `}
            aria-label="Close alert"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
