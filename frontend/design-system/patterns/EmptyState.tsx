/**
 * EmptyState Pattern Component
 * Consistent empty state display with icon, title, and action
 */

'use client';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact';
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className = '',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={`text-center py-8 ${className}`}>
        {icon && <div className="flex justify-center mb-3 text-museum-dark-gray">{icon}</div>}
        <p className="text-sm font-medium text-museum-black mb-1">{title}</p>
        {description && <p className="text-xs text-museum-dark-gray">{description}</p>}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  return (
    <div
      className={`
        text-center py-12 px-6
        border-2 border-dashed border-museum-light-gray rounded-xl
        ${className}
      `}
    >
      {icon && (
        <div className="flex justify-center mb-4 text-museum-dark-gray">
          {icon}
        </div>
      )}
      <h3 className="font-serif text-xl font-bold text-museum-black mb-2">{title}</h3>
      {description && (
        <p className="text-museum-dark-gray mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
