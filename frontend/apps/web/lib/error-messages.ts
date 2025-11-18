/**
 * User-friendly error messages for Web3 UX
 * Based on best practices: clear, actionable, and helpful
 */

export interface ErrorDetails {
  title: string;
  message: string;
  action?: string;
  learnMoreUrl?: string;
}

export function parseEtchingError(error: string): ErrorDetails {
  // Insufficient balance
  if (error.toLowerCase().includes('insufficient balance')) {
    const match = error.match(/have: (\d+), need: (\d+)/);
    return {
      title: 'Insufficient Balance',
      message: match
        ? `You need ${match[2]} sats but only have ${match[1]} sats in your ckBTC balance.`
        : 'Your ckBTC balance is too low to complete this transaction.',
      action: 'Please add more ckBTC to your wallet and try again.',
      learnMoreUrl: 'https://internetcomputer.org/docs/current/developer-docs/defi/ckbtc',
    };
  }

  // Invalid rune name
  if (error.toLowerCase().includes('invalid rune name')) {
    return {
      title: 'Invalid Rune Name',
      message: 'The Rune name format is incorrect.',
      action:
        'Use only uppercase letters (A-Z) and spacers (•). Name must be 1-26 characters and cannot start/end with spacers or have consecutive spacers.',
    };
  }

  // Invalid symbol
  if (error.toLowerCase().includes('invalid symbol')) {
    return {
      title: 'Invalid Symbol',
      message: 'The symbol format is incorrect.',
      action: 'Use only uppercase letters and numbers. Symbol must be 1-4 characters.',
    };
  }

  // Invalid divisibility
  if (error.toLowerCase().includes('invalid divisibility')) {
    return {
      title: 'Invalid Divisibility',
      message: 'The divisibility value is out of range.',
      action: 'Please enter a value between 0 and 18. Bitcoin uses 8 decimal places.',
    };
  }

  // Supply overflow
  if (error.toLowerCase().includes('supply overflow') || error.toLowerCase().includes('overflow')) {
    return {
      title: 'Supply Too Large',
      message: 'The total supply (premine + mintable) exceeds the maximum allowed value.',
      action: 'Please reduce the premine amount, mint amount, or mint cap to stay within limits.',
    };
  }

  // Insufficient UTXOs
  if (error.toLowerCase().includes('insufficient utxos')) {
    return {
      title: 'No Available Inputs',
      message: 'Your wallet does not have enough Bitcoin UTXOs to create this transaction.',
      action:
        'Please wait for pending transactions to confirm, or receive more Bitcoin to your wallet.',
    };
  }

  // Transaction build failed
  if (
    error.toLowerCase().includes('transaction build') ||
    error.toLowerCase().includes('tx construction')
  ) {
    return {
      title: 'Transaction Build Failed',
      message: 'Unable to construct a valid Bitcoin transaction.',
      action:
        'This could be due to network issues or invalid parameters. Please try again in a moment.',
    };
  }

  // Broadcast failed
  if (error.toLowerCase().includes('broadcast failed')) {
    return {
      title: 'Broadcast Failed',
      message: 'The transaction was built but could not be sent to the Bitcoin network.',
      action: 'This is usually temporary. Please try again in a few moments.',
    };
  }

  // Network rejected
  if (error.toLowerCase().includes('network rejected')) {
    return {
      title: 'Transaction Rejected',
      message: 'The Bitcoin network rejected your transaction.',
      action:
        'This could be due to insufficient fees or invalid transaction structure. Please try again.',
    };
  }

  // Etching in progress
  if (error.toLowerCase().includes('etching in progress')) {
    return {
      title: 'Etching Already In Progress',
      message: 'You already have an active Rune etching process running.',
      action: 'Please wait for your current etching to complete before starting a new one.',
    };
  }

  // Fee too low/high
  if (error.toLowerCase().includes('fee') && error.toLowerCase().includes('invalid')) {
    return {
      title: 'Invalid Fee',
      message: 'The transaction fee is outside acceptable bounds.',
      action: 'Please contact support if this issue persists.',
    };
  }

  // Canister error
  if (error.toLowerCase().includes('canister')) {
    return {
      title: 'Canister Error',
      message: 'There was an error communicating with the Internet Computer canister.',
      action: 'This is usually temporary. Please refresh the page and try again.',
    };
  }

  // Authentication required
  if (error.toLowerCase().includes('not authenticated') || error.toLowerCase().includes('login')) {
    return {
      title: 'Authentication Required',
      message: 'You must be logged in to create a Rune.',
      action: 'Please connect your wallet using Internet Identity.',
    };
  }

  // Rate limit
  if (error.toLowerCase().includes('rate limit') || error.toLowerCase().includes('too many')) {
    return {
      title: 'Too Many Requests',
      message: 'You have made too many requests in a short time.',
      action: 'Please wait a few minutes before trying again.',
    };
  }

  // Network connectivity
  if (
    error.toLowerCase().includes('network') ||
    error.toLowerCase().includes('timeout') ||
    error.toLowerCase().includes('connection')
  ) {
    return {
      title: 'Network Error',
      message: 'Unable to connect to the service.',
      action: 'Please check your internet connection and try again.',
    };
  }

  // Generic fallback
  return {
    title: 'Error Creating Rune',
    message: error || 'An unexpected error occurred.',
    action: 'Please try again. If the problem persists, contact support.',
  };
}

export function parseAuthError(error: string): ErrorDetails {
  if (error.toLowerCase().includes('user denied') || error.toLowerCase().includes('cancelled')) {
    return {
      title: 'Authentication Cancelled',
      message: 'You cancelled the authentication process.',
      action: 'Please try connecting again when ready.',
    };
  }

  if (error.toLowerCase().includes('popup blocked')) {
    return {
      title: 'Popup Blocked',
      message: 'Your browser blocked the authentication popup.',
      action: 'Please allow popups for this site and try again.',
    };
  }

  return {
    title: 'Authentication Failed',
    message: error || 'Unable to authenticate with Internet Identity.',
    action: 'Please try again or refresh the page.',
  };
}

export function parseNetworkError(error: Error | string): ErrorDetails {
  const message = typeof error === 'string' ? error : error.message;

  if (message.includes('fetch')) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to the Internet Computer network.',
      action: 'Please check your internet connection and try again.',
    };
  }

  if (message.includes('timeout')) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete.',
      action: 'The network might be congested. Please try again.',
    };
  }

  return {
    title: 'Network Error',
    message: message,
    action: 'Please try again in a moment.',
  };
}
