/**
 * Pinata IPFS Storage Integration - DEPRECATED
 *
 * WARNING: This file is deprecated and should not be used directly.
 * Use the usePinata hook instead for secure server-side uploads.
 *
 * Migration Guide:
 * - Old: import { uploadToPinata } from '@/lib/storage/pinata-storage'
 * - New: import { usePinata } from '@/hooks/usePinata'
 *
 * Why the change?
 * - Moved JWT to server-side for security
 * - API routes handle uploads in /app/api/pinata/*
 * - Client never sees the JWT token
 * - Better rate limiting and error handling
 *
 * This file is kept for backwards compatibility but now proxies to API routes.
 */

import { logger } from '@/lib/logger';

export interface IPFSUploadResult {
  ipfsHash: string;
  ipfsUrl: string;
  gatewayUrl: string;
  size: number;
}

export interface RuneMetadata {
  name: string;
  symbol: string;
  description?: string;
  image: string; // IPFS URL
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    supply: string;
    divisibility: number;
    creator: string;
    blockHeight?: number;
    mint_amount?: string;
    mint_cap?: string;
  };
}

const PINATA_GATEWAY = 'https://gateway.pinata.cloud';

// Rate limiting configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delayMs = RETRY_DELAY_MS
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;

    // Check if it's a retriable error (network, 5xx, rate limit)
    const shouldRetry = error instanceof Error && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503') ||
      error.message.includes('429') // Rate limit
    );

    if (!shouldRetry) throw error;

    logger.warn(`Retrying after error, ${retries} attempts remaining`, {
      error: error instanceof Error ? error.message : String(error),
      retriesLeft: retries,
    });
    await sleep(delayMs);
    return withRetry(fn, retries - 1, delayMs * 2); // Exponential backoff
  }
}

/**
 * Upload file to Pinata via secure API route
 * @deprecated Use usePinata hook instead
 */
export async function uploadToPinata(file: File): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading file via API route', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 10MB`);
    }

    // Upload via API route with retry logic
    const result = await withRetry(async () => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload to our secure API route
      const response = await fetch('/api/pinata/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      return await response.json();
    });

    logger.info('File uploaded successfully via API route', {
      cid: result.ipfsHash,
      size: result.size,
    });

    return result;
  } catch (error) {
    logger.error('Failed to upload via API route', error instanceof Error ? error : undefined);

    // Enhanced error messaging
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error('Rate limit alcanzado. Por favor espera un momento e intenta nuevamente.');
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Error de autenticación. Por favor inicia sesión nuevamente.');
      }
      throw new Error(`Error al subir a IPFS: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Upload JSON metadata to Pinata via secure API route
 * @deprecated Use usePinata hook instead
 */
export async function uploadMetadataToPinata(
  metadata: RuneMetadata
): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading metadata via API route', { name: metadata.name });

    // Upload via API route with retry logic
    const result = await withRetry(async () => {
      // Upload JSON to our secure API route
      const response = await fetch('/api/pinata/pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata,
          name: `${metadata.name}-metadata.json`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Metadata upload failed: ${response.status}`);
      }

      return await response.json();
    });

    logger.info('Metadata uploaded successfully via API route', {
      cid: result.ipfsHash,
      size: result.size,
    });

    return result;
  } catch (error) {
    logger.error('Failed to upload metadata via API route', error instanceof Error ? error : undefined);

    // Enhanced error messaging
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error('Rate limit alcanzado. Por favor espera un momento e intenta nuevamente.');
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Error de autenticación. Por favor inicia sesión nuevamente.');
      }
      throw new Error(`Error al subir metadata a IPFS: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Upload image and metadata together via secure API route
 * @deprecated Use usePinata hook instead
 */
export async function uploadRuneAssets(
  imageFile: File,
  metadata: Omit<RuneMetadata, 'image'>
): Promise<{ imageUpload: IPFSUploadResult; metadataUpload: IPFSUploadResult }> {
  try {
    logger.info('Starting Rune assets upload via API route', {
      imageName: imageFile.name,
      runeName: metadata.name,
    });

    // Step 1: Upload image
    const imageUpload = await uploadToPinata(imageFile);

    // Step 2: Create full metadata with image URL
    const fullMetadata: RuneMetadata = {
      ...metadata,
      image: imageUpload.ipfsUrl,
    };

    // Step 3: Upload metadata
    const metadataUpload = await uploadMetadataToPinata(fullMetadata);

    logger.info('Rune assets uploaded successfully via API route', {
      imageHash: imageUpload.ipfsHash,
      metadataHash: metadataUpload.ipfsHash,
    });

    return { imageUpload, metadataUpload };
  } catch (error) {
    logger.error('Failed to upload rune assets via API route', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Get multiple gateway URLs for redundancy
 */
export function getMultipleGatewayUrls(ipfsUrl: string): string[] {
  const hash = ipfsUrl.replace('ipfs://', '');

  return [
    `${PINATA_GATEWAY}/ipfs/${hash}`,           // Primary: Pinata
    `https://ipfs.io/ipfs/${hash}`,              // Backup 1: Public IPFS
    `https://cloudflare-ipfs.com/ipfs/${hash}`,  // Backup 2: Cloudflare
    `https://dweb.link/ipfs/${hash}`,            // Backup 3: Protocol Labs
  ];
}

/**
 * Convert IPFS URL to gateway URL
 */
export function ipfsToGatewayUrl(
  ipfsUrl: string,
  gateway: 'pinata' | 'ipfs' | 'cloudflare' | 'dweb' = 'pinata'
): string {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl;
  }

  const hash = ipfsUrl.replace('ipfs://', '');

  const gateways = {
    pinata: `${PINATA_GATEWAY}/ipfs/${hash}`,
    ipfs: `https://ipfs.io/ipfs/${hash}`,
    cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
    dweb: `https://dweb.link/ipfs/${hash}`,
  };

  return gateways[gateway];
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de archivo inválido. Usa JPEG, PNG, GIF, WebP, o SVG.',
    };
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Archivo muy grande. Máximo 10MB.',
    };
  }

  return { valid: true };
}
