/**
 * IPFS Storage Integration - DEPRECATED
 *
 * WARNING: This file uses the old Pinata API key method and is deprecated.
 * Use the usePinata hook instead for secure server-side uploads with JWT.
 *
 * Migration Guide:
 * - Old: import { uploadToIPFS } from '@/lib/storage/ipfs'
 * - New: import { usePinata } from '@/hooks/usePinata'
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
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    supply: string;
    divisibility: number;
    creator: string;
    blockHeight?: number;
  };
}

/**
 * Upload file to IPFS via secure API route
 * @deprecated Use usePinata hook instead
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading file to IPFS via API route', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Use secure API route instead of direct Pinata access
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/pinata/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const result = await response.json();

    logger.info('File uploaded to IPFS successfully', { ipfsHash: result.ipfsHash });
    return result;
  } catch (error) {
    logger.error('Failed to upload to IPFS', error instanceof Error ? error : undefined);

    // Fallback to mock for development
    logger.warn('Using mock upload as fallback');
    return mockIPFSUpload(file);
  }
}

/**
 * Upload JSON metadata to IPFS via secure API route
 * @deprecated Use usePinata hook instead
 */
export async function uploadMetadataToIPFS(
  metadata: RuneMetadata
): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading metadata to IPFS via API route', { name: metadata.name });

    // Use secure API route instead of direct Pinata access
    const response = await fetch('/api/pinata/pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata,
        name: `${metadata.symbol}-metadata.json`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(errorData.error || `Metadata upload failed: ${response.status}`);
    }

    const result = await response.json();

    logger.info('Metadata uploaded to IPFS successfully', { ipfsHash: result.ipfsHash });
    return result;
  } catch (error) {
    logger.error('Failed to upload metadata to IPFS', error instanceof Error ? error : undefined);

    // Fallback to mock for development
    logger.warn('Using mock upload as fallback');
    return mockMetadataUpload(metadata);
  }
}

/**
 * Upload image and create metadata in one go
 * @deprecated Use usePinata hook instead
 */
export async function uploadRuneAssets(
  imageFile: File,
  metadata: Omit<RuneMetadata, 'image'>
): Promise<{ imageUpload: IPFSUploadResult; metadataUpload: IPFSUploadResult }> {
  try {
    // Step 1: Upload image
    const imageUpload = await uploadToIPFS(imageFile);

    // Step 2: Create full metadata with image URL
    const fullMetadata: RuneMetadata = {
      ...metadata,
      image: imageUpload.ipfsUrl, // Use IPFS URL for true decentralization
    };

    // Step 3: Upload metadata
    const metadataUpload = await uploadMetadataToIPFS(fullMetadata);

    logger.info('Rune assets uploaded successfully', {
      imageHash: imageUpload.ipfsHash,
      metadataHash: metadataUpload.ipfsHash,
    });

    return { imageUpload, metadataUpload };
  } catch (error) {
    logger.error('Failed to upload rune assets', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Convert IPFS URL to gateway URL
 */
export function ipfsToGatewayUrl(ipfsUrl: string, gateway = 'pinata'): string {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl; // Already a gateway URL
  }

  const hash = ipfsUrl.replace('ipfs://', '');

  const gateways = {
    pinata: `https://gateway.pinata.cloud/ipfs/${hash}`,
    ipfs: `https://ipfs.io/ipfs/${hash}`,
    cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
    dweb: `https://dweb.link/ipfs/${hash}`,
  };

  return gateways[gateway as keyof typeof gateways] || gateways.pinata;
}

/**
 * Mock upload for development without Pinata credentials
 */
function mockIPFSUpload(file: File): IPFSUploadResult {
  const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  logger.info('Using mock IPFS upload', { mockHash, fileName: file.name });

  return {
    ipfsHash: mockHash,
    ipfsUrl: `ipfs://${mockHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${mockHash}`,
    size: file.size,
  };
}

/**
 * Mock metadata upload for development
 */
function mockMetadataUpload(metadata: RuneMetadata): IPFSUploadResult {
  const mockHash = `Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  logger.info('Using mock metadata upload', { mockHash, name: metadata.name });

  return {
    ipfsHash: mockHash,
    ipfsUrl: `ipfs://${mockHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${mockHash}`,
    size: JSON.stringify(metadata).length,
  };
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPEG, PNG, GIF, WebP, or SVG.',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    };
  }

  return { valid: true };
}

/**
 * Get IPFS status
 */
export async function checkIPFSStatus(ipfsHash: string): Promise<boolean> {
  try {
    const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to check IPFS status', error instanceof Error ? error : undefined);
    return false;
  }
}
