/**
 * Toast notification utilities
 * Wrapper around Sonner with QURI-specific helpers
 */

import { toast as sonnerToast, ExternalToast } from 'sonner';

// Re-export basic toast methods
export const toast = {
  success: (message: string, opts?: ExternalToast) => {
    return sonnerToast.success(message, opts);
  },

  error: (message: string, opts?: ExternalToast) => {
    return sonnerToast.error(message, opts);
  },

  info: (message: string, opts?: ExternalToast) => {
    return sonnerToast.info(message, opts);
  },

  warning: (message: string, opts?: ExternalToast) => {
    return sonnerToast.warning(message, opts);
  },

  loading: (message: string, opts?: ExternalToast) => {
    return sonnerToast.loading(message, opts);
  },

  promise: <T,>(
    promise: Promise<T>,
    opts: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, opts);
  },

  custom: (component: React.ReactNode, opts?: ExternalToast) => {
    return sonnerToast.custom(component, opts);
  },

  dismiss: (id?: string | number) => {
    return sonnerToast.dismiss(id);
  },
};

// ============================================================================
// TRANSACTION-SPECIFIC TOASTS
// ============================================================================

export const txToast = {
  /**
   * Transaction submitted notification
   */
  submitted: (txId: string, opts?: ExternalToast) => {
    return toast.loading('Transaction submitted', {
      ...opts,
      description: `TX: ${txId.slice(0, 12)}...${txId.slice(-4)}`,
    });
  },

  /**
   * Transaction confirmed notification
   */
  confirmed: (txId: string, opts?: ExternalToast) => {
    return toast.success('Transaction confirmed!', {
      ...opts,
      description: `TX: ${txId.slice(0, 12)}...${txId.slice(-4)}`,
      duration: 5000,
    });
  },

  /**
   * Transaction failed notification
   */
  failed: (error: string, opts?: ExternalToast) => {
    return toast.error('Transaction failed', {
      ...opts,
      description: error,
      duration: 6000,
    });
  },

  /**
   * Waiting for confirmations
   */
  confirming: (confirmations: number, required: number, opts?: ExternalToast) => {
    return toast.loading(`Confirming transaction`, {
      ...opts,
      description: `${confirmations}/${required} confirmations`,
    });
  },
};

// ============================================================================
// RUNE-SPECIFIC TOASTS
// ============================================================================

export const runeToast = {
  /**
   * Rune etching started
   */
  etchingStarted: (runeName: string, processId: string, opts?: ExternalToast) => {
    return toast.success(`Etching ${runeName}`, {
      ...opts,
      description: `Process started: ${processId.slice(0, 8)}...`,
      duration: 5000,
    });
  },

  /**
   * Rune etching completed
   */
  etchingCompleted: (runeName: string, txId: string, opts?: ExternalToast) => {
    return toast.success(`${runeName} created successfully! 🎉`, {
      ...opts,
      description: `TX: ${txId.slice(0, 12)}...`,
      duration: 8000,
    });
  },

  /**
   * Rune etching failed
   */
  etchingFailed: (runeName: string, error: string, opts?: ExternalToast) => {
    return toast.error(`Failed to etch ${runeName}`, {
      ...opts,
      description: error,
      duration: 6000,
    });
  },

  /**
   * Rune registered
   */
  registered: (runeName: string, opts?: ExternalToast) => {
    return toast.success(`${runeName} registered!`, {
      ...opts,
      description: 'Rune is now listed in the registry',
      duration: 5000,
    });
  },
};

// ============================================================================
// SESSION-SPECIFIC TOASTS
// ============================================================================

export const sessionToast = {
  /**
   * Session created
   */
  created: (expiresInMinutes: number, opts?: ExternalToast) => {
    return toast.success('Session created', {
      ...opts,
      description: `Valid for ${expiresInMinutes} minutes`,
      duration: 4000,
    });
  },

  /**
   * Session expired
   */
  expired: (opts?: ExternalToast) => {
    return toast.warning('Session expired', {
      ...opts,
      description: 'Please create a new session to continue',
      duration: 6000,
    });
  },

  /**
   * Permission denied
   */
  permissionDenied: (action: string, opts?: ExternalToast) => {
    return toast.error('Permission denied', {
      ...opts,
      description: `You don't have permission to ${action}`,
      duration: 5000,
    });
  },
};

// ============================================================================
// AUTH-SPECIFIC TOASTS
// ============================================================================

export const authToast = {
  /**
   * Login success
   */
  connected: (principal: string, opts?: ExternalToast) => {
    return toast.success('Connected successfully!', {
      ...opts,
      description: `Principal: ${principal.slice(0, 12)}...`,
      duration: 4000,
    });
  },

  /**
   * Popup blocked warning
   */
  popupBlocked: (opts?: ExternalToast) => {
    return toast.warning('Popup may be blocked', {
      ...opts,
      description: 'Please allow popups for this site and try again',
      duration: 8000,
    });
  },

  /**
   * Login cancelled
   */
  cancelled: (opts?: ExternalToast) => {
    return toast.info('Login cancelled', {
      ...opts,
      description: 'You closed the authentication window',
      duration: 3000,
    });
  },

  /**
   * Login failed
   */
  failed: (error?: string, opts?: ExternalToast) => {
    return toast.error('Connection failed', {
      ...opts,
      description: error || 'Unable to connect to Internet Identity',
      duration: 6000,
    });
  },

  /**
   * Disconnected
   */
  disconnected: (opts?: ExternalToast) => {
    return toast.success('Disconnected', {
      ...opts,
      description: 'You have been logged out',
      duration: 3000,
    });
  },
};

// ============================================================================
// BITCOIN-SPECIFIC TOASTS
// ============================================================================

export const btcToast = {
  /**
   * Address generated
   */
  addressGenerated: (address: string, opts?: ExternalToast) => {
    return toast.success('Bitcoin address generated', {
      ...opts,
      description: `${address.slice(0, 12)}...${address.slice(-6)}`,
      duration: 5000,
    });
  },

  /**
   * UTXO selected
   */
  utxoSelected: (count: number, totalValue: bigint, opts?: ExternalToast) => {
    const btc = Number(totalValue) / 100_000_000;
    return toast.info(`${count} UTXOs selected`, {
      ...opts,
      description: `Total: ${btc.toFixed(8)} BTC`,
      duration: 4000,
    });
  },

  /**
   * Fee estimate fetched
   */
  feeEstimate: (slow: bigint, medium: bigint, fast: bigint, opts?: ExternalToast) => {
    return toast.info('Current Bitcoin fees', {
      ...opts,
      description: `Slow: ${slow} | Medium: ${medium} | Fast: ${fast} sat/vB`,
      duration: 5000,
    });
  },
};

// ============================================================================
// GENERAL HELPERS
// ============================================================================

/**
 * Copy to clipboard with toast
 */
export function copyToClipboard(text: string, label: string = 'Text') {
  navigator.clipboard.writeText(text).then(
    () => {
      toast.success(`${label} copied to clipboard!`, {
        duration: 2000,
      });
    },
    () => {
      toast.error('Failed to copy to clipboard');
    }
  );
}

/**
 * Generic error toast from Error object
 */
export function errorToast(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : 'An unknown error occurred';
  const description = context ? `Context: ${context}` : undefined;

  return toast.error('Error', {
    description: description || message,
    duration: 6000,
  });
}

/**
 * Success toast with optional action button
 */
export function successWithAction(
  message: string,
  actionLabel: string,
  onAction: () => void,
  opts?: ExternalToast
) {
  return toast.success(message, {
    ...opts,
    action: {
      label: actionLabel,
      onClick: onAction,
    },
  });
}
