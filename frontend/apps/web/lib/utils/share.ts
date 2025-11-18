'use client';

import { logger } from '@/lib/logger';
import { RuneData } from '@/components/RuneCard';

/**
 * Share Utilities with Web Share API
 * Elegant sharing for museum-grade art pieces
 */

export interface ShareData {
  title: string;
  text: string;
  url: string;
}

/**
 * Check if Web Share API is supported
 */
export function isShareSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'share' in navigator && navigator.canShare !== undefined;
}

/**
 * Share using native Web Share API with fallback to clipboard
 */
export async function shareContent(data: ShareData): Promise<boolean> {
  try {
    if (isShareSupported() && navigator.canShare(data)) {
      await navigator.share(data);
      logger.userAction('Share Content (Native)', { title: data.title });
      return true;
    } else {
      // Fallback to clipboard
      await copyToClipboard(data.url);
      logger.userAction('Share Content (Clipboard)', { title: data.title });
      return true;
    }
  } catch (error) {
    // User cancelled or error occurred
    if (error instanceof Error && error.name !== 'AbortError') {
      logger.error('Share failed', error);
    }
    return false;
  }
}

/**
 * Share a Rune with formatted information
 */
export async function shareRune(rune: RuneData, baseUrl?: string): Promise<boolean> {
  const url = baseUrl
    ? `${baseUrl}/rune/${rune.id}`
    : typeof window !== 'undefined'
    ? `${window.location.origin}/rune/${rune.id}`
    : '';

  const shareData: ShareData = {
    title: `${rune.name} (${rune.symbol})`,
    text: `Check out ${rune.name} - a Bitcoin Rune on QURI Protocol. ${
      rune.description ? rune.description.slice(0, 100) + '...' : ''
    }`,
    url,
  };

  return shareContent(shareData);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof window === 'undefined') return false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      logger.userAction('Copy to Clipboard', { length: text.length });
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (success) {
        logger.userAction('Copy to Clipboard (Fallback)', { length: text.length });
      }
      return success;
    }
  } catch (error) {
    logger.error('Copy to clipboard failed', error instanceof Error ? error : undefined);
    return false;
  }
}

/**
 * Generate share links for social media platforms
 */
export function generateShareLinks(rune: RuneData, baseUrl?: string) {
  const url = baseUrl
    ? `${baseUrl}/rune/${rune.id}`
    : typeof window !== 'undefined'
    ? `${window.location.origin}/rune/${rune.id}`
    : '';

  const encodedUrl = encodeURIComponent(url);
  const title = encodeURIComponent(`${rune.name} (${rune.symbol})`);
  const description = encodeURIComponent(
    rune.description || `A Bitcoin Rune on QURI Protocol`
  );

  return {
    twitter: `https://twitter.com/intent/tweet?text=${title}&url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${title}`,
    whatsapp: `https://wa.me/?text=${title}%20${encodedUrl}`,
    reddit: `https://reddit.com/submit?url=${encodedUrl}&title=${title}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    email: `mailto:?subject=${title}&body=${description}%0A%0A${encodedUrl}`,
  };
}

/**
 * Share via specific social platform
 */
export function shareViaPlatform(
  platform: keyof ReturnType<typeof generateShareLinks>,
  rune: RuneData,
  baseUrl?: string
): void {
  const links = generateShareLinks(rune, baseUrl);
  const link = links[platform];

  if (typeof window !== 'undefined') {
    window.open(link, '_blank', 'noopener,noreferrer,width=600,height=600');
    logger.userAction('Share Via Platform', { platform, runeId: rune.id });
  }
}

/**
 * Download rune information as JSON
 */
export function downloadRuneInfo(rune: RuneData): void {
  const data = JSON.stringify(rune, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${rune.symbol.toLowerCase()}-${rune.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  logger.userAction('Download Rune Info', { runeId: rune.id });
}

/**
 * Generate QR code URL for rune page (using qrcode.react or similar)
 */
export function generateQRCodeData(rune: RuneData, baseUrl?: string): string {
  const url = baseUrl
    ? `${baseUrl}/rune/${rune.id}`
    : typeof window !== 'undefined'
    ? `${window.location.origin}/rune/${rune.id}`
    : '';

  return url;
}
