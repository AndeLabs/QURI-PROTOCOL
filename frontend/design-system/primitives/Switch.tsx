/**
 * Switch Primitive Component
 * Toggle switch with smooth animation
 */

'use client';

export interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Switch({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
}: SwitchProps) {
  const handleChange = () => {
    if (!disabled) {
      onChange?.(!checked);
    }
  };

  // Size variants
  const sizeStyles = {
    sm: {
      track: 'h-5 w-9',
      thumb: 'h-4 w-4',
      translate: 'translate-x-4',
      label: 'text-sm',
      description: 'text-xs',
    },
    md: {
      track: 'h-6 w-11',
      thumb: 'h-5 w-5',
      translate: 'translate-x-5',
      label: 'text-base',
      description: 'text-sm',
    },
    lg: {
      track: 'h-7 w-14',
      thumb: 'h-6 w-6',
      translate: 'translate-x-7',
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
      {/* Switch Track */}
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
            ${styles.track}
            rounded-full transition-all duration-200 ease-in-out
            ${
              checked
                ? error
                  ? 'bg-red-600'
                  : 'bg-gold-500'
                : error
                ? 'bg-red-200'
                : 'bg-gray-200'
            }
            ${
              !disabled && !checked
                ? error
                  ? 'group-hover:bg-red-300'
                  : 'group-hover:bg-gray-300'
                : ''
            }
            ${!disabled && 'focus-within:ring-2 focus-within:ring-gold-200'}
            relative
          `}
        >
          {/* Switch Thumb */}
          <div
            className={`
              ${styles.thumb}
              absolute top-0.5 left-0.5
              bg-museum-white rounded-full
              transition-transform duration-200 ease-in-out
              shadow-sm
              ${checked ? styles.translate : 'translate-x-0'}
            `}
          />
        </div>
      </div>

      {/* Label & Description */}
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <div
              className={`
              ${styles.label}
              font-medium
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
