/**
 * IPFS Storage Integration
 * Handles image and metadata uploads to IPFS via Pinata
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
 * Upload file to IPFS via Pinata
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading file to IPFS', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check if Pinata API key is configured
    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      logger.warn('Pinata credentials not configured, using mock upload');
      return mockIPFSUpload(file);
    }

    const formData = new FormData();
    formData.append('file', file);

    const metadata = JSON.stringify({
      name: file.name,
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;

    const result: IPFSUploadResult = {
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      size: file.size,
    };

    logger.info('File uploaded to IPFS successfully', { ipfsHash });
    return result;
  } catch (error) {
    logger.error('Failed to upload to IPFS', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadMetadataToIPFS(
  metadata: RuneMetadata
): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading metadata to IPFS', { name: metadata.name });

    const pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    const pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

    if (!pinataApiKey || !pinataSecretKey) {
      logger.warn('Pinata credentials not configured, using mock upload');
      return mockMetadataUpload(metadata);
    }

    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'pinata_api_key': pinataApiKey,
        'pinata_secret_api_key': pinataSecretKey,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${metadata.symbol}-metadata.json`,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinata metadata upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.IpfsHash;

    const result: IPFSUploadResult = {
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      size: JSON.stringify(metadata).length,
    };

    logger.info('Metadata uploaded to IPFS successfully', { ipfsHash });
    return result;
  } catch (error) {
    logger.error('Failed to upload metadata to IPFS', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Upload image and create metadata in one go
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
      image: imageUpload.gatewayUrl, // Use gateway URL for better compatibility
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
