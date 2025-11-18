/**
 * NFT.Storage Integration
 * Handles image and metadata uploads to IPFS via NFT.Storage
 * Documentation: https://nft.storage/docs/
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
 * Upload file to IPFS via NFT.Storage
 * Uses Bearer token authentication as per NFT.Storage API documentation
 */
export async function uploadToIPFS(file: File): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading file to NFT.Storage', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Check if NFT.Storage API key is configured
    const apiKey = process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY;

    if (!apiKey) {
      logger.warn('NFT.Storage API key not configured, using mock upload');
      return mockIPFSUpload(file);
    }

    // Prepare the file for upload
    const formData = new FormData();
    formData.append('file', file);

    // Upload to NFT.Storage with Bearer token authentication
    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`, // Correct Bearer token format
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('NFT.Storage upload failed', undefined, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`NFT.Storage upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.value.cid; // NFT.Storage returns CID in data.value.cid

    const result: IPFSUploadResult = {
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://nftstorage.link/ipfs/${ipfsHash}`,
      size: file.size,
    };

    logger.info('File uploaded to NFT.Storage successfully', { ipfsHash });
    return result;
  } catch (error) {
    logger.error('Failed to upload to NFT.Storage', error instanceof Error ? error : undefined);
    throw error;
  }
}

/**
 * Upload JSON metadata to IPFS via NFT.Storage
 */
export async function uploadMetadataToIPFS(
  metadata: RuneMetadata
): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading metadata to NFT.Storage', { name: metadata.name });

    const apiKey = process.env.NEXT_PUBLIC_NFT_STORAGE_API_KEY;

    if (!apiKey) {
      logger.warn('NFT.Storage API key not configured, using mock upload');
      return mockMetadataUpload(metadata);
    }

    // Convert metadata to a Blob
    const metadataString = JSON.stringify(metadata, null, 2);
    const metadataBlob = new Blob([metadataString], { type: 'application/json' });
    const metadataFile = new File([metadataBlob], `${metadata.symbol}-metadata.json`, {
      type: 'application/json'
    });

    // Upload metadata as a file
    const formData = new FormData();
    formData.append('file', metadataFile);

    const response = await fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`, // Correct Bearer token format
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('NFT.Storage metadata upload failed', undefined, {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`NFT.Storage metadata upload failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const ipfsHash = data.value.cid;

    const result: IPFSUploadResult = {
      ipfsHash,
      ipfsUrl: `ipfs://${ipfsHash}`,
      gatewayUrl: `https://nftstorage.link/ipfs/${ipfsHash}`,
      size: metadataString.length,
    };

    logger.info('Metadata uploaded to NFT.Storage successfully', { ipfsHash });
    return result;
  } catch (error) {
    logger.error('Failed to upload metadata to NFT.Storage', error instanceof Error ? error : undefined);
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
export function ipfsToGatewayUrl(ipfsUrl: string, gateway = 'nftstorage'): string {
  if (!ipfsUrl.startsWith('ipfs://')) {
    return ipfsUrl; // Already a gateway URL
  }

  const hash = ipfsUrl.replace('ipfs://', '');

  const gateways = {
    nftstorage: `https://nftstorage.link/ipfs/${hash}`,
    ipfs: `https://ipfs.io/ipfs/${hash}`,
    cloudflare: `https://cloudflare-ipfs.com/ipfs/${hash}`,
    dweb: `https://dweb.link/ipfs/${hash}`,
  };

  return gateways[gateway as keyof typeof gateways] || gateways.nftstorage;
}

/**
 * Mock upload for development without NFT.Storage credentials
 */
function mockIPFSUpload(file: File): IPFSUploadResult {
  const mockHash = `bafybei${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  return {
    ipfsHash: mockHash,
    ipfsUrl: `ipfs://${mockHash}`,
    gatewayUrl: `https://nftstorage.link/ipfs/${mockHash}`,
    size: file.size,
  };
}

/**
 * Mock metadata upload for development
 */
function mockMetadataUpload(metadata: RuneMetadata): IPFSUploadResult {
  const mockHash = `bafybei${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  return {
    ipfsHash: mockHash,
    ipfsUrl: `ipfs://${mockHash}`,
    gatewayUrl: `https://nftstorage.link/ipfs/${mockHash}`,
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

  // Check file size (max 100MB for NFT.Storage)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 100MB.',
    };
  }

  return { valid: true };
}

/**
 * Check if an IPFS hash is accessible
 */
export async function checkIPFSStatus(ipfsHash: string): Promise<boolean> {
  try {
    const response = await fetch(`https://nftstorage.link/ipfs/${ipfsHash}`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch (error) {
    logger.error('Failed to check IPFS status', error instanceof Error ? error : undefined);
    return false;
  }
}
