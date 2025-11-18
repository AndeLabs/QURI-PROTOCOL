/**
 * FormField Pattern Component
 * Consistent form field with label, help text, and error handling
 */

'use client';

import { AlertCircle, Info } from 'lucide-react';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  optional = false,
  children,
  className = '',
}: FormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={htmlFor}
          className={`
            block text-sm font-medium
            ${error ? 'text-red-700' : 'text-museum-black'}
          `}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {optional && <span className="text-museum-dark-gray ml-2 text-xs font-normal">(Optional)</span>}
        </label>
      )}

      {/* Input/Control */}
      <div>{children}</div>

      {/* Hint or Error */}
      {(hint || error) && (
        <div className="flex items-start gap-1.5">
          {error ? (
            <>
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </>
          ) : hint ? (
            <>
              <Info className="h-4 w-4 text-museum-dark-gray flex-shrink-0 mt-0.5" />
              <p className="text-sm text-museum-dark-gray">{hint}</p>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
