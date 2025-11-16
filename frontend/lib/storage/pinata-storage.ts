/**
 * Pinata IPFS Storage Integration
 * 
 * Why Pinata?
 * - Free tier: 1GB storage, 100GB bandwidth/month
 * - Used by top NFT platforms (OpenSea, Foundation, etc.)
 * - Reliable and fast global CDN
 * - Simple HTTP API (no SDK dependencies)
 * - Professional service with great uptime
 * 
 * Setup:
 * 1. Get FREE API key: https://pinata.cloud
 * 2. Add to .env.local: 
 *    NEXT_PUBLIC_PINATA_JWT=your-jwt-token
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

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud';

// Rate limiting and retry configuration
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
 * Validate JWT token format
 */
function validateJWT(jwt: string | undefined): { valid: boolean; error?: string } {
  if (!jwt) {
    return { valid: false, error: 'JWT token not found in environment variables' };
  }
  
  if (jwt.includes('your-') || jwt.length < 100) {
    return { valid: false, error: 'JWT token appears to be a placeholder or invalid' };
  }
  
  // JWT should have 3 parts
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: `Invalid JWT format: expected 3 parts, got ${parts.length}` };
  }
  
  return { valid: true };
}

/**
 * Upload file to Pinata (IPFS) with retry logic
 */
export async function uploadToPinata(file: File): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading file to Pinata', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Archivo muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 10MB`);
    }

    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    
    // Validate JWT
    const jwtValidation = validateJWT(jwt);
    if (!jwtValidation.valid) {
      logger.warn('Pinata JWT invalid, using free public IPFS', { error: jwtValidation.error });
      return uploadToPublicIPFS(file);
    }

    // Upload with retry logic
    const result = await withRetry(async () => {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Add metadata
      const metadata = JSON.stringify({
        name: file.name,
        keyvalues: {
          uploadedBy: 'QURI-Protocol',
          timestamp: new Date().toISOString(),
        }
      });
      formData.append('pinataMetadata', metadata);

      // Upload to Pinata
      const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Parse error for better messaging
        let errorMessage = `Pinata upload failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.details || errorJson.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response
      if (!data.IpfsHash) {
        throw new Error('Pinata response missing IpfsHash');
      }

      return {
        ipfsHash: data.IpfsHash,
        ipfsUrl: `ipfs://${data.IpfsHash}`,
        gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
        size: data.PinSize || file.size,
      };
    });

    logger.info('File uploaded to Pinata successfully', {
      cid: result.ipfsHash,
      size: result.size,
    });

    // Verify upload by checking if it's accessible
    await verifyIPFSUpload(result.ipfsHash);

    return result;
  } catch (error) {
    logger.error('Failed to upload to Pinata after retries', error instanceof Error ? error : undefined);
    
    // Enhanced error messaging
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error('Rate limit alcanzado. Por favor espera un momento e intenta nuevamente.');
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Error de autenticación con Pinata. Verifica tu API key.');
      }
      throw new Error(`Error al subir a IPFS: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Verify IPFS upload by checking gateway accessibility
 */
async function verifyIPFSUpload(cid: string): Promise<boolean> {
  try {
    logger.info('Verifying IPFS upload', { cid });
    
    // Try Pinata gateway first (fastest)
    const response = await fetch(`${PINATA_GATEWAY}/ipfs/${cid}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    if (response.ok) {
      logger.info('IPFS upload verified successfully', { cid });
      return true;
    }
    
    logger.warn('IPFS content not immediately accessible, but upload succeeded', { cid });
    return true; // Upload succeeded even if not immediately accessible
  } catch (error) {
    logger.warn('Could not verify IPFS upload, but upload succeeded', { cid, error });
    return true; // Don't fail the whole upload if verification fails
  }
}

/**
 * Upload JSON metadata to Pinata with retry logic
 */
export async function uploadMetadataToPinata(
  metadata: RuneMetadata
): Promise<IPFSUploadResult> {
  try {
    logger.info('Uploading metadata to Pinata', { name: metadata.name });

    const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
    
    // Validate JWT
    const jwtValidation = validateJWT(jwt);
    if (!jwtValidation.valid) {
      logger.warn('Pinata JWT invalid, using free public IPFS', { error: jwtValidation.error });
      return uploadMetadataToPublicIPFS(metadata);
    }

    // Upload with retry logic
    const result = await withRetry(async () => {
      // Upload JSON to Pinata
      const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `${metadata.name}-metadata.json`,
            keyvalues: {
              type: 'rune-metadata',
              rune: metadata.name,
              symbol: metadata.symbol,
              uploadedBy: 'QURI-Protocol',
              timestamp: new Date().toISOString(),
            }
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Parse error for better messaging
        let errorMessage = `Pinata metadata upload failed: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error?.details || errorJson.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage} - ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response
      if (!data.IpfsHash) {
        throw new Error('Pinata response missing IpfsHash');
      }

      return {
        ipfsHash: data.IpfsHash,
        ipfsUrl: `ipfs://${data.IpfsHash}`,
        gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
        size: data.PinSize || JSON.stringify(metadata).length,
      };
    });

    logger.info('Metadata uploaded to Pinata successfully', { 
      cid: result.ipfsHash,
      size: result.size,
    });

    // Verify upload
    await verifyIPFSUpload(result.ipfsHash);

    return result;
  } catch (error) {
    logger.error('Failed to upload metadata to Pinata after retries', error instanceof Error ? error : undefined);
    
    // Enhanced error messaging
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        throw new Error('Rate limit alcanzado. Por favor espera un momento e intenta nuevamente.');
      }
      if (error.message.includes('401') || error.message.includes('403')) {
        throw new Error('Error de autenticación con Pinata. Verifica tu API key.');
      }
      throw new Error(`Error al subir metadata a IPFS: ${error.message}`);
    }
    
    throw error;
  }
}

/**
 * Upload image and metadata together
 */
export async function uploadRuneAssets(
  imageFile: File,
  metadata: Omit<RuneMetadata, 'image'>
): Promise<{ imageUpload: IPFSUploadResult; metadataUpload: IPFSUploadResult }> {
  try {
    logger.info('Starting Rune assets upload to IPFS', {
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
 * Fallback: Upload to free public IPFS gateway
 * Uses ipfs.io public gateway
 */
async function uploadToPublicIPFS(file: File): Promise<IPFSUploadResult> {
  try {
    logger.info('Using free public IPFS upload', { file: file.name });

    // Use ipfs.io public API
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://ipfs.io/api/v0/add', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Public IPFS upload failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      ipfsHash: data.Hash,
      ipfsUrl: `ipfs://${data.Hash}`,
      gatewayUrl: `https://ipfs.io/ipfs/${data.Hash}`,
      size: file.size,
    };
  } catch (error) {
    logger.error('Public IPFS upload failed', error instanceof Error ? error : undefined);
    throw new Error('No se pudo subir a IPFS. Por favor configura Pinata o intenta más tarde.');
  }
}

/**
 * Fallback: Upload metadata to public IPFS
 */
async function uploadMetadataToPublicIPFS(metadata: RuneMetadata): Promise<IPFSUploadResult> {
  try {
    const jsonString = JSON.stringify(metadata);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], 'metadata.json', { type: 'application/json' });

    return await uploadToPublicIPFS(file);
  } catch (error) {
    logger.error('Public IPFS metadata upload failed', error instanceof Error ? error : undefined);
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
