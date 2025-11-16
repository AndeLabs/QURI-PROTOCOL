'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    icon: 'text-green-600',
    title: 'text-green-900',
    message: 'text-green-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    icon: 'text-red-600',
    title: 'text-red-900',
    message: 'text-red-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    icon: 'text-amber-600',
    title: 'text-amber-900',
    message: 'text-amber-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    icon: 'text-blue-600',
    title: 'text-blue-900',
    message: 'text-blue-800',
  },
};

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = icons[type];
  const colorScheme = colors[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  return (
    <div
      className={`
        ${colorScheme.bg} ${colorScheme.border}
        border-l-4 rounded-lg shadow-lg p-4 mb-3
        max-w-md w-full
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-6 h-6 ${colorScheme.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${colorScheme.title} text-sm mb-1`}>
            {title}
          </h4>
          {message && (
            <p className={`${colorScheme.message} text-sm leading-relaxed`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={handleClose}
          className={`${colorScheme.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts }: { toasts: ToastProps[] }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  );
}

// Hook para usar toast
export function useToast() {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const showToast = (toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: ToastProps = {
      ...toast,
      id,
      onClose: () => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      },
    };
    setToasts((prev) => [...prev, newToast]);
  };

  return { toasts, showToast };
}
