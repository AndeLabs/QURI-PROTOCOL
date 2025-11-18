/**
 * Avatar Primitive Component
 * Display user avatars with fallbacks
 */

'use client';

import { User } from 'lucide-react';
import { useState } from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'away' | 'busy';
  showStatus?: boolean;
  className?: string;
}

export function Avatar({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  shape = 'circle',
  status,
  showStatus = false,
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Size variants
  const sizeStyles = {
    xs: 'h-6 w-6 text-xs',
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg',
    xl: 'h-16 w-16 text-xl',
    '2xl': 'h-24 w-24 text-2xl',
  };

  // Status dot sizes
  const statusSizes = {
    xs: 'h-1.5 w-1.5 ring-1',
    sm: 'h-2 w-2 ring-1',
    md: 'h-2.5 w-2.5 ring-2',
    lg: 'h-3 w-3 ring-2',
    xl: 'h-4 w-4 ring-2',
    '2xl': 'h-5 w-5 ring-2',
  };

  // Status colors
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
  };

  // Generate initials from fallback text
  const getInitials = (name?: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = getInitials(fallback || alt);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Avatar Container */}
      <div
        className={`
          ${sizeStyles[size]}
          ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
          overflow-hidden flex items-center justify-center
          bg-gradient-to-br from-gold-400 to-gold-600
          text-white font-semibold
        `}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className="h-2/3 w-2/3" />
        )}
      </div>

      {/* Status Indicator */}
      {showStatus && status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${statusSizes[size]}
            ${statusColors[status]}
            ${shape === 'circle' ? 'rounded-full' : 'rounded'}
            ring-museum-white
          `}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

/**
 * AvatarGroup Component
 * Display multiple avatars in a stack
 */

export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    fallback?: string;
  }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  shape?: 'circle' | 'square';
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 3,
  size = 'md',
  shape = 'circle',
  className = '',
}: AvatarGroupProps) {
  const displayedAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {displayedAvatars.map((avatar, index) => (
        <div
          key={index}
          className="ring-2 ring-museum-white"
          style={{ zIndex: displayedAvatars.length - index }}
        >
          <Avatar {...avatar} size={size} shape={shape} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={`
            ${size === 'xs' ? 'h-6 w-6 text-xs' : ''}
            ${size === 'sm' ? 'h-8 w-8 text-sm' : ''}
            ${size === 'md' ? 'h-10 w-10 text-base' : ''}
            ${size === 'lg' ? 'h-12 w-12 text-lg' : ''}
            ${size === 'xl' ? 'h-16 w-16 text-xl' : ''}
            ${size === '2xl' ? 'h-24 w-24 text-2xl' : ''}
            ${shape === 'circle' ? 'rounded-full' : 'rounded-lg'}
            bg-museum-dark-gray text-museum-white
            flex items-center justify-center font-semibold
            ring-2 ring-museum-white
          `}
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
