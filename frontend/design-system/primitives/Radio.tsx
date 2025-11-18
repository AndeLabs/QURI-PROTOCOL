/**
 * Radio Primitive Component
 * Accessible radio button with label support
 */

'use client';

export interface RadioProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  value?: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Radio({
  checked = false,
  onChange,
  name,
  value,
  label,
  description,
  disabled = false,
  error = false,
  size = 'md',
  className = '',
}: RadioProps) {
  const handleChange = () => {
    if (!disabled) {
      onChange?.(true);
    }
  };

  // Size variants
  const sizeStyles = {
    sm: {
      box: 'h-4 w-4',
      dot: 'h-2 w-2',
      label: 'text-sm',
      description: 'text-xs',
    },
    md: {
      box: 'h-5 w-5',
      dot: 'h-2.5 w-2.5',
      label: 'text-base',
      description: 'text-sm',
    },
    lg: {
      box: 'h-6 w-6',
      dot: 'h-3 w-3',
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
      {/* Radio Circle */}
      <div className="flex-shrink-0 pt-0.5">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={`
            ${styles.box}
            rounded-full border-2 flex items-center justify-center transition-all
            ${
              checked
                ? error
                  ? 'border-red-600'
                  : 'border-gold-500'
                : error
                ? 'border-red-300 bg-red-50'
                : 'border-museum-light-gray bg-museum-white'
            }
            ${
              !disabled && !checked
                ? error
                  ? 'group-hover:border-red-400'
                  : 'group-hover:border-gold-300'
                : ''
            }
            ${!disabled && 'focus-within:ring-2 focus-within:ring-gold-200'}
          `}
        >
          {/* Inner Dot */}
          {checked && (
            <div
              className={`
                ${styles.dot}
                rounded-full transition-all
                ${error ? 'bg-red-600' : 'bg-gold-500'}
              `}
            />
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

/**
 * RadioGroup Component
 * Container for managing multiple radio buttons
 */

export interface RadioGroupOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioGroupOption[];
  value?: string;
  onChange?: (value: string) => void;
  name: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function RadioGroup({
  options,
  value,
  onChange,
  name,
  error = false,
  size = 'md',
  orientation = 'vertical',
  className = '',
}: RadioGroupProps) {
  return (
    <div
      className={`
        flex ${orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row gap-6'}
        ${className}
      `}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange?.(option.value)}
          label={option.label}
          description={option.description}
          disabled={option.disabled}
          error={error}
          size={size}
        />
      ))}
    </div>
  );
}
