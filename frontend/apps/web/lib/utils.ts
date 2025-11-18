import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBTC(satoshis: bigint | number): string {
  const sats = typeof satoshis === 'bigint' ? Number(satoshis) : satoshis;
  return (sats / 100_000_000).toFixed(8);
}

export function formatSatoshis(satoshis: bigint | number): string {
  const sats = typeof satoshis === 'bigint' ? Number(satoshis) : satoshis;
  return sats.toLocaleString();
}

export function shortenAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function shortenTxId(txid: string, chars = 6): string {
  if (txid.length <= chars * 2 + 3) return txid;
  return `${txid.slice(0, chars)}...${txid.slice(-chars)}`;
}

export function validateRuneName(name: string): string | null {
  if (name.length < 1 || name.length > 26) {
    return 'Rune name must be between 1 and 26 characters';
  }

  if (!/^[A-Z•]+$/.test(name)) {
    return 'Rune name must contain only uppercase letters and spacers (•)';
  }

  if (name.startsWith('•') || name.endsWith('•')) {
    return 'Rune name cannot start or end with spacer (•)';
  }

  if (name.includes('••')) {
    return 'Rune name cannot have consecutive spacers';
  }

  return null;
}

export function validateSymbol(symbol: string): string | null {
  if (symbol.length === 0 || symbol.length > 4) {
    return 'Symbol must be between 1 and 4 characters';
  }

  if (!/^[A-Z0-9]+$/.test(symbol)) {
    return 'Symbol must contain only uppercase letters and numbers';
  }

  return null;
}
