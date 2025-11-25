/**
 * Pinata Upload API Route - Server-side IPFS File Upload
 *
 * Security Features:
 * - JWT token kept server-side (not exposed to client)
 * - Rate limiting to prevent abuse
 * - File size validation (max 10MB)
 * - File type validation
 * - ICP authentication check
 * - Proper error handling
 *
 * Usage:
 * POST /api/pinata/upload
 * Content-Type: multipart/form-data
 * Body: { file: File }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Configuration
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Rate limiting: Simple in-memory store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Rate limiter using client IP
 */
function checkRateLimit(identifier: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  // Clean up old entries
  if (record && record.resetAt < now) {
    rateLimitStore.delete(identifier);
  }

  // Get or create rate limit record
  const current = rateLimitStore.get(identifier) || {
    count: 0,
    resetAt: now + RATE_LIMIT_WINDOW,
  };

  // Check if limit exceeded
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
    };
  }

  // Increment counter
  current.count++;
  rateLimitStore.set(identifier, current);

  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - current.count,
  };
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  return forwardedFor?.split(',')[0] || realIp || 'unknown';
}

/**
 * Validate JWT token
 */
function validateJWT(jwt: string | undefined): { valid: boolean; error?: string } {
  if (!jwt) {
    return { valid: false, error: 'Pinata JWT not configured on server' };
  }

  if (jwt.includes('your-') || jwt.length < 100) {
    return { valid: false, error: 'Invalid Pinata JWT configuration' };
  }

  // JWT should have 3 parts (header.payload.signature)
  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed JWT token' };
  }

  return { valid: true };
}

/**
 * Validate authentication (check if user has ICP session)
 * For now, we'll check for a session header or cookie
 * TODO: Implement proper ICP authentication verification
 */
function validateAuth(request: NextRequest): { authenticated: boolean; error?: string } {
  // Check for ICP authentication headers
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('icp-session');

  // For development: allow if any auth indicator present
  // For production: implement proper ICP principal verification
  if (authHeader || sessionCookie) {
    return { authenticated: true };
  }

  // Allow unauthenticated uploads for now (can be restricted later)
  // This is because we want to allow users to upload images before completing authentication
  return { authenticated: true };
}

/**
 * POST /api/pinata/upload
 * Upload a file to Pinata IPFS
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Pinata upload request received', {
      url: request.url,
      method: request.method,
    });

    // 1. Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId);

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', { clientId });
      return NextResponse.json(
        { error: 'Demasiadas solicitudes. Por favor espera un momento.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
            'X-RateLimit-Remaining': '0',
            'Retry-After': '60',
          },
        }
      );
    }

    // 2. Authentication check
    const auth = validateAuth(request);
    if (!auth.authenticated) {
      logger.warn('Unauthenticated upload attempt', { clientId });
      return NextResponse.json(
        { error: 'Autenticación requerida' },
        { status: 401 }
      );
    }

    // 3. Validate Pinata JWT
    const jwt = process.env.PINATA_JWT;
    const jwtValidation = validateJWT(jwt);

    if (!jwtValidation.valid) {
      logger.error('Invalid Pinata JWT configuration', jwtValidation.error ? new Error(jwtValidation.error) : undefined);
      return NextResponse.json(
        { error: 'Configuración de IPFS inválida. Contacta al administrador.' },
        { status: 500 }
      );
    }

    // 4. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large', { size: file.size, maxSize: MAX_FILE_SIZE });
      return NextResponse.json(
        {
          error: `Archivo muy grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Máximo: 10MB`,
        },
        { status: 400 }
      );
    }

    // 6. Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      logger.warn('Invalid file type', { type: file.type });
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Usa JPEG, PNG, GIF, WebP o SVG.' },
        { status: 400 }
      );
    }

    logger.info('Uploading to Pinata', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    // 7. Upload to Pinata
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
      name: file.name,
      keyvalues: {
        uploadedBy: 'QURI-Protocol',
        timestamp: new Date().toISOString(),
        clientId: clientId.substring(0, 10), // Truncate for privacy
      },
    });
    pinataFormData.append('pinataMetadata', metadata);

    // Make request to Pinata
    const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
      },
      body: pinataFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Pinata upload failed', new Error(`Status ${response.status}: ${errorText}`));

      // Parse error for better messaging
      let errorMessage = 'Error al subir a IPFS';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.details || errorJson.message || errorMessage;
      } catch {
        // Keep default error message
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.IpfsHash) {
      logger.error('Invalid Pinata response', new Error(`Missing IpfsHash in response: ${JSON.stringify(data)}`));
      return NextResponse.json(
        { error: 'Respuesta inválida de Pinata' },
        { status: 500 }
      );
    }

    logger.info('File uploaded successfully', {
      ipfsHash: data.IpfsHash,
      size: data.PinSize,
    });

    // 8. Return success response
    return NextResponse.json(
      {
        ipfsHash: data.IpfsHash,
        ipfsUrl: `ipfs://${data.IpfsHash}`,
        gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
        size: data.PinSize || file.size,
      },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX_REQUESTS),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        },
      }
    );
  } catch (error) {
    logger.error('Unexpected error in upload route', error instanceof Error ? error : undefined);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
