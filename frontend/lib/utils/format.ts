/**
 * Shared formatting utilities for QURI Protocol
 * Centralized formatters for consistent display across the app
 */

/**
 * Format a bigint amount with divisibility
 */
export function formatSupply(amount: bigint, divisibility: number): string {
  const value = Number(amount) / Math.pow(10, divisibility);
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(divisibility, 6),
  });
}

/**
 * Format a compact number (1K, 1M, etc.)
 */
export function formatCompact(value: number | bigint): string {
  const num = typeof value === 'bigint' ? Number(value) : value;

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

/**
 * Format a timestamp (bigint in nanoseconds) to readable date
 */
export function formatDate(timestamp: bigint): string {
  // Convert nanoseconds to milliseconds
  const ms = Number(timestamp / 1_000_000n);
  const date = new Date(ms);

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: bigint): string {
  const ms = Number(timestamp / 1_000_000n);
  const now = Date.now();
  const diff = now - ms;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

/**
 * Format a Bitcoin address (truncated)
 */
export function formatAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a principal ID (truncated)
 */
export function formatPrincipal(principal: string): string {
  if (principal.length <= 15) return principal;
  return `${principal.slice(0, 5)}...${principal.slice(-5)}`;
}

/**
 * Format satoshis to BTC
 */
export function formatBTC(sats: bigint | number): string {
  const value = typeof sats === 'bigint' ? Number(sats) : sats;
  const btc = value / 100_000_000;

  if (btc < 0.001) {
    return `${value.toLocaleString()} sats`;
  }

  return `${btc.toFixed(8)} BTC`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format block height with # prefix
 */
export function formatBlockHeight(height: bigint | number): string {
  const num = typeof height === 'bigint' ? Number(height) : height;
  return `#${num.toLocaleString()}`;
}

/**
 * Get Rune ID string from key
 */
export function getRuneId(block: bigint, tx: number): string {
  return `${block}:${tx}`;
}

/**
 * Get mempool.space explorer URL for a Rune
 */
export function getMempoolRuneUrl(
  block: bigint,
  tx: number,
  network: 'mainnet' | 'testnet' = 'testnet'
): string {
  const baseUrl = network === 'mainnet'
    ? 'https://mempool.space'
    : 'https://mempool.space/testnet';
  return `${baseUrl}/rune/${block}:${tx}`;
}

/**
 * Get mempool.space explorer URL for a transaction
 */
export function getMempoolTxUrl(
  txid: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): string {
  const baseUrl = network === 'mainnet'
    ? 'https://mempool.space'
    : 'https://mempool.space/testnet';
  return `${baseUrl}/tx/${txid}`;
}

/**
 * Get mempool.space explorer URL for a block
 */
export function getMempoolBlockUrl(
  height: bigint | number,
  network: 'mainnet' | 'testnet' = 'testnet'
): string {
  const baseUrl = network === 'mainnet'
    ? 'https://mempool.space'
    : 'https://mempool.space/testnet';
  return `${baseUrl}/block/${height}`;
}

/**
 * Format a duration in nanoseconds to human readable
 */
export function formatDuration(ns: bigint): string {
  const ms = Number(ns / 1_000_000n);

  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Copy text to clipboard with feedback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// ============================================================================
// FULL PRECISION BLOCKCHAIN NUMBER FORMATTING
// These functions NEVER round - they show exact blockchain values
// ============================================================================

/**
 * Format a bigint with full precision (NO ROUNDING)
 * Perfect for blockchain where exact values matter
 */
export function formatFullPrecision(
  amount: bigint,
  divisibility: number
): { display: string; full: string; raw: string } {
  const raw = amount.toString();

  if (divisibility === 0) {
    const display = addThousandsSeparator(raw);
    return { display, full: display, raw };
  }

  const paddedAmount = raw.padStart(divisibility + 1, '0');
  const intPart = paddedAmount.slice(0, -divisibility) || '0';
  const decPart = paddedAmount.slice(-divisibility);

  // Remove trailing zeros for display but keep full for tooltip
  const trimmedDec = decPart.replace(/0+$/, '');
  const formattedInt = addThousandsSeparator(intPart);

  const full = `${formattedInt}.${decPart}`;
  const display = trimmedDec ? `${formattedInt}.${trimmedDec}` : formattedInt;

  return { display, full, raw };
}

/**
 * Format ICP balance (8 decimals) with full precision
 */
export function formatICPFull(amount: bigint): { display: string; full: string; raw: string } {
  return formatFullPrecision(amount, 8);
}

/**
 * Format ckBTC balance (8 decimals) with full precision
 */
export function formatCkBTCFull(amount: bigint): { display: string; full: string; raw: string } {
  return formatFullPrecision(amount, 8);
}

/**
 * Format Cycles with appropriate unit (T, B, M, K)
 */
export function formatCyclesFull(amount: bigint): { display: string; full: string; raw: string; unit: string } {
  const raw = amount.toString();
  const num = Number(amount);

  // Full precision string
  const trillion = 1_000_000_000_000;
  const fullTC = (num / trillion).toFixed(12).replace(/\.?0+$/, '');

  let display: string;
  let unit: string;

  if (num >= trillion) {
    // Show as TC (trillion cycles)
    const tc = num / trillion;
    display = tc >= 1000 ? addThousandsSeparator(tc.toFixed(3)) : tc.toFixed(6).replace(/\.?0+$/, '');
    unit = 'TC';
  } else if (num >= 1_000_000_000) {
    // Show as B (billion)
    display = (num / 1_000_000_000).toFixed(3).replace(/\.?0+$/, '');
    unit = 'B';
  } else if (num >= 1_000_000) {
    // Show as M (million)
    display = (num / 1_000_000).toFixed(3).replace(/\.?0+$/, '');
    unit = 'M';
  } else if (num >= 1_000) {
    // Show as K (thousand)
    display = (num / 1_000).toFixed(3).replace(/\.?0+$/, '');
    unit = 'K';
  } else {
    display = addThousandsSeparator(raw);
    unit = '';
  }

  return { display, full: `${fullTC} TC`, raw, unit };
}

/**
 * Add thousands separators to a number string
 */
function addThousandsSeparator(numStr: string): string {
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format any blockchain amount with smart display
 * Shows abbreviated version but preserves full precision for tooltip/copy
 */
export function formatBlockchainAmount(
  amount: bigint,
  divisibility: number,
  options?: {
    showUnit?: string;
    maxDisplayDecimals?: number;
  }
): { display: string; full: string; raw: string } {
  const { display, full, raw } = formatFullPrecision(amount, divisibility);

  // Optionally limit display decimals while keeping full precision
  let finalDisplay = display;
  if (options?.maxDisplayDecimals !== undefined) {
    const parts = display.split('.');
    if (parts[1] && parts[1].length > options.maxDisplayDecimals) {
      const truncatedDec = parts[1].slice(0, options.maxDisplayDecimals);
      // Remove trailing zeros
      const cleanDec = truncatedDec.replace(/0+$/, '');
      finalDisplay = cleanDec ? `${parts[0]}.${cleanDec}` : parts[0];
    }
  }

  if (options?.showUnit) {
    finalDisplay = `${finalDisplay} ${options.showUnit}`;
  }

  return { display: finalDisplay, full, raw };
}
