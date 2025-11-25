/**
 * usePinata Hook - Secure IPFS Upload via Server-side API Routes
 *
 * This hook provides a clean interface for uploading files and JSON
 * to IPFS via Pinata, using secure server-side API routes.
 *
 * Features:
 * - Server-side JWT handling (not exposed to client)
 * - Automatic retry logic
 * - Progress tracking
 * - Error handling
 * - Rate limit awareness
 *
 * Usage:
 * ```tsx
 * const { uploadFile, uploadMetadata, uploadRuneAssets, isUploading, error } = usePinata();
 *
 * // Upload a single file
 * const result = await uploadFile(imageFile);
 *
 * // Upload JSON metadata
 * const metadata = await uploadMetadata({ name: 'MyRune', symbol: 'RUNE', ... });
 *
 * // Upload both image and metadata
 * const { imageUpload, metadataUpload } = await uploadRuneAssets(imageFile, metadata);
 * ```
 */

import { useState, useCallback } from 'react';
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

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UsePinataReturn {
  uploadFile: (file: File, onProgress?: (progress: UploadProgress) => void) => Promise<IPFSUploadResult>;
  uploadMetadata: (metadata: RuneMetadata, name?: string) => Promise<IPFSUploadResult>;
  uploadRuneAssets: (
    imageFile: File,
    metadata: Omit<RuneMetadata, 'image'>,
    onProgress?: (progress: UploadProgress) => void
  ) => Promise<{ imageUpload: IPFSUploadResult; metadataUpload: IPFSUploadResult }>;
  isUploading: boolean;
  error: string | null;
  clearError: () => void;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

    // Check if it's a retriable error
    const shouldRetry = error instanceof Error && (
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('500') ||
      error.message.includes('502') ||
      error.message.includes('503')
    );

    if (!shouldRetry) throw error;

    logger.warn(`Retrying after error, ${retries} attempts remaining`, {
      error: error instanceof Error ? error.message : String(error),
      retriesLeft: retries,
    });

    await sleep(delayMs);
    return withRetry(fn, retries - 1, delayMs * 2);
  }
}

/**
 * usePinata Hook
 */
export function usePinata(): UsePinataReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Upload a file to IPFS via API route
   */
  const uploadFile = useCallback(
    async (file: File, onProgress?: (progress: UploadProgress) => void): Promise<IPFSUploadResult> => {
      try {
        setIsUploading(true);
        setError(null);

        logger.info('Uploading file via API route', {
          name: file.name,
          size: file.size,
          type: file.type,
        });

        const result = await withRetry(async () => {
          const formData = new FormData();
          formData.append('file', file);

          // Create XMLHttpRequest for progress tracking
          return new Promise<IPFSUploadResult>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // Progress tracking
            if (onProgress) {
              xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                  onProgress({
                    loaded: e.loaded,
                    total: e.total,
                    percentage: Math.round((e.loaded / e.total) * 100),
                  });
                }
              });
            }

            // Success handler
            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  resolve(data);
                } catch (err) {
                  reject(new Error('Invalid response from server'));
                }
              } else {
                try {
                  const error = JSON.parse(xhr.responseText);
                  reject(new Error(error.error || `Upload failed: ${xhr.status}`));
                } catch {
                  reject(new Error(`Upload failed: ${xhr.status}`));
                }
              }
            });

            // Error handler
            xhr.addEventListener('error', () => {
              reject(new Error('Network error during upload'));
            });

            // Abort handler
            xhr.addEventListener('abort', () => {
              reject(new Error('Upload cancelled'));
            });

            // Send request
            xhr.open('POST', '/api/pinata/upload');
            xhr.send(formData);
          });
        });

        logger.info('File uploaded successfully', {
          ipfsHash: result.ipfsHash,
          size: result.size,
        });

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al subir archivo';
        logger.error('File upload failed', err instanceof Error ? err : undefined);
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  /**
   * Upload JSON metadata to IPFS via API route
   */
  const uploadMetadata = useCallback(
    async (metadata: RuneMetadata, name?: string): Promise<IPFSUploadResult> => {
      try {
        setIsUploading(true);
        setError(null);

        logger.info('Uploading metadata via API route', {
          name: metadata.name,
          symbol: metadata.symbol,
        });

        const result = await withRetry(async () => {
          const response = await fetch('/api/pinata/pin', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              metadata,
              name,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Upload failed' }));
            throw new Error(error.error || `Upload failed: ${response.status}`);
          }

          return await response.json();
        });

        logger.info('Metadata uploaded successfully', {
          ipfsHash: result.ipfsHash,
          size: result.size,
        });

        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al subir metadata';
        logger.error('Metadata upload failed', err instanceof Error ? err : undefined);
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  /**
   * Upload both image and metadata for a Rune
   */
  const uploadRuneAssets = useCallback(
    async (
      imageFile: File,
      metadata: Omit<RuneMetadata, 'image'>,
      onProgress?: (progress: UploadProgress) => void
    ): Promise<{ imageUpload: IPFSUploadResult; metadataUpload: IPFSUploadResult }> => {
      try {
        setIsUploading(true);
        setError(null);

        logger.info('Uploading Rune assets', {
          imageName: imageFile.name,
          runeName: metadata.name,
        });

        // Step 1: Upload image
        const imageUpload = await uploadFile(imageFile, onProgress);

        // Step 2: Create full metadata with image URL
        const fullMetadata: RuneMetadata = {
          ...metadata,
          image: imageUpload.ipfsUrl,
        };

        // Step 3: Upload metadata
        const metadataUpload = await uploadMetadata(fullMetadata);

        logger.info('Rune assets uploaded successfully', {
          imageHash: imageUpload.ipfsHash,
          metadataHash: metadataUpload.ipfsHash,
        });

        return { imageUpload, metadataUpload };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al subir assets';
        logger.error('Rune assets upload failed', err instanceof Error ? err : undefined);
        setError(errorMessage);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, uploadMetadata]
  );

  return {
    uploadFile,
    uploadMetadata,
    uploadRuneAssets,
    isUploading,
    error,
    clearError,
  };
}

/**
 * Get multiple gateway URLs for redundancy
 */
export function getMultipleGatewayUrls(ipfsUrl: string): string[] {
  const hash = ipfsUrl.replace('ipfs://', '');

  return [
    `https://gateway.pinata.cloud/ipfs/${hash}`, // Primary: Pinata
    `https://ipfs.io/ipfs/${hash}`, // Backup 1: Public IPFS
    `https://cloudflare-ipfs.com/ipfs/${hash}`, // Backup 2: Cloudflare
    `https://dweb.link/ipfs/${hash}`, // Backup 3: Protocol Labs
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
    pinata: `https://gateway.pinata.cloud/ipfs/${hash}`,
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
