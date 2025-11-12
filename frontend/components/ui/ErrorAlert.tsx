'use client';

import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { ErrorDetails } from '@/lib/error-messages';

interface ErrorAlertProps {
  error: ErrorDetails;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-red-900">{error.title}</h3>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex-shrink-0 rounded p-1 text-red-500 hover:bg-red-100"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="mt-1 text-sm text-red-700">{error.message}</p>

          {error.action && (
            <p className="mt-2 text-sm font-medium text-red-800">
              <span className="font-semibold">Action:</span> {error.action}
            </p>
          )}

          {error.learnMoreUrl && (
            <a
              href={error.learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900"
            >
              Learn more
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
