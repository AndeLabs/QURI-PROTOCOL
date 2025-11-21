'use client';

/**
 * Copy to Clipboard Feedback Component
 * Provides visual feedback when content is copied
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Copy, ExternalLink } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'button' | 'inline';
  label?: string;
  showTooltip?: boolean;
}

export function CopyButton({
  text,
  className = '',
  size = 'md',
  variant = 'icon',
  label = 'Copy',
  showTooltip = true,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [text]);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleCopy}
        className={`inline-flex items-center gap-1 text-museum-dark-gray hover:text-museum-black
                   transition-colors ${className}`}
        title={copied ? 'Copied!' : label}
      >
        <span className="font-mono">{text}</span>
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className={`${iconSizes[size]} text-green-600`} />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Copy className={iconSizes[size]} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        onClick={handleCopy}
        className={`flex items-center gap-2 px-3 py-1.5 bg-museum-cream hover:bg-museum-light-gray
                   rounded-lg transition-colors text-sm font-medium text-museum-black ${className}`}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Check className={`${iconSizes[size]} text-green-600`} />
              Copied!
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Copy className={iconSizes[size]} />
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  }

  // Default: icon variant
  return (
    <div className="relative inline-block">
      <button
        onClick={handleCopy}
        className={`${sizeClasses[size]} hover:bg-museum-cream rounded transition-colors ${className}`}
        title={copied ? 'Copied!' : label}
      >
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Check className={`${iconSizes[size]} text-green-600`} />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Copy className={`${iconSizes[size]} text-museum-dark-gray`} />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <AnimatePresence>
          {copied && (
            <motion.div
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-museum-black text-white
                         text-xs rounded whitespace-nowrap z-50"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              Copied!
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent
                            border-t-museum-black" />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

/**
 * Copyable Text Component
 * Text that can be copied with click
 */
export function CopyableText({
  text,
  displayText,
  className = '',
  truncate = false,
  maxLength = 20,
}: {
  text: string;
  displayText?: string;
  className?: string;
  truncate?: boolean;
  maxLength?: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const display = displayText || text;
  const truncatedDisplay = truncate && display.length > maxLength
    ? `${display.slice(0, maxLength / 2)}...${display.slice(-maxLength / 2)}`
    : display;

  return (
    <button
      onClick={handleCopy}
      className={`group inline-flex items-center gap-1.5 font-mono text-sm cursor-pointer
                 hover:text-gold-600 transition-colors ${className}`}
      title={`Click to copy: ${text}`}
    >
      <span>{truncatedDisplay}</span>
      <AnimatePresence mode="wait">
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Check className="h-3.5 w-3.5 text-green-600" />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Copy className="h-3.5 w-3.5" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/**
 * Address Display with Copy
 * Specialized for blockchain addresses
 */
export function AddressDisplay({
  address,
  explorerUrl,
  className = '',
}: {
  address: string;
  explorerUrl?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CopyableText
        text={address}
        truncate
        maxLength={16}
        className="text-museum-black"
      />
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-museum-cream rounded transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="h-3.5 w-3.5 text-museum-dark-gray" />
        </a>
      )}
    </div>
  );
}

/**
 * Toast Notification for Copy Feedback
 * Global toast system for copy confirmations
 */
export function useCopyToast() {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string }>>([]);

  const showToast = useCallback((message: string = 'Copied to clipboard') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2000);
  }, []);

  const copyWithToast = useCallback(async (text: string, message?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(message);
      return true;
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  }, [showToast]);

  const ToastContainer = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            className="px-4 py-2 bg-museum-black text-white rounded-lg shadow-lg
                      flex items-center gap-2"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <Check className="h-4 w-4 text-green-400" />
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );

  return { copyWithToast, ToastContainer };
}
