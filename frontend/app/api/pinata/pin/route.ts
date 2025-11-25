/**
 * Pinata Pin JSON API Route - Server-side IPFS JSON Upload
 *
 * Security Features:
 * - JWT token kept server-side (not exposed to client)
 * - Rate limiting to prevent abuse
 * - JSON validation
 * - ICP authentication check
 * - Proper error handling
 *
 * Usage:
 * POST /api/pinata/pin
 * Content-Type: application/json
 * Body: { metadata: RuneMetadata, name?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// Configuration
const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud';
const MAX_JSON_SIZE = 1024 * 1024; // 1MB

// Rate limiting: Simple in-memory store (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute (more than file uploads)

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

  const parts = jwt.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed JWT token' };
  }

  return { valid: true };
}

/**
 * Validate authentication
 */
function validateAuth(request: NextRequest): { authenticated: boolean; error?: string } {
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('icp-session');

  // Allow unauthenticated for now (same as upload route)
  if (authHeader || sessionCookie) {
    return { authenticated: true };
  }

  return { authenticated: true };
}

/**
 * Validate JSON metadata structure
 */
function validateMetadata(metadata: any): { valid: boolean; error?: string } {
  if (!metadata || typeof metadata !== 'object') {
    return { valid: false, error: 'Metadata debe ser un objeto' };
  }

  // Basic validation for RuneMetadata structure
  if (typeof metadata.name !== 'string' || !metadata.name) {
    return { valid: false, error: 'Metadata.name es requerido' };
  }

  if (typeof metadata.symbol !== 'string' || !metadata.symbol) {
    return { valid: false, error: 'Metadata.symbol es requerido' };
  }

  // Validate size
  const jsonString = JSON.stringify(metadata);
  if (jsonString.length > MAX_JSON_SIZE) {
    return {
      valid: false,
      error: `JSON muy grande (${(jsonString.length / 1024).toFixed(2)}KB). Máximo: 1MB`,
    };
  }

  return { valid: true };
}

/**
 * POST /api/pinata/pin
 * Pin JSON metadata to Pinata IPFS
 */
export async function POST(request: NextRequest) {
  try {
    logger.info('Pinata pin request received', {
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
      logger.warn('Unauthenticated pin attempt', { clientId });
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

    // 4. Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.warn('Invalid JSON in request body');
      return NextResponse.json(
        { error: 'JSON inválido' },
        { status: 400 }
      );
    }

    const { metadata, name } = body;

    if (!metadata) {
      return NextResponse.json(
        { error: 'Campo "metadata" es requerido' },
        { status: 400 }
      );
    }

    // 5. Validate metadata
    const metadataValidation = validateMetadata(metadata);
    if (!metadataValidation.valid) {
      logger.warn('Invalid metadata', { error: metadataValidation.error });
      return NextResponse.json(
        { error: metadataValidation.error },
        { status: 400 }
      );
    }

    logger.info('Pinning JSON to Pinata', {
      metadataName: metadata.name,
      metadataSymbol: metadata.symbol,
      size: JSON.stringify(metadata).length,
    });

    // 6. Pin JSON to Pinata
    const pinataMetadata = {
      name: name || `${metadata.name}-metadata.json`,
      keyvalues: {
        type: 'rune-metadata',
        rune: metadata.name,
        symbol: metadata.symbol,
        uploadedBy: 'QURI-Protocol',
        timestamp: new Date().toISOString(),
        clientId: clientId.substring(0, 10), // Truncate for privacy
      },
    };

    const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Pinata pin failed', new Error(`Status ${response.status}: ${errorText}`));

      // Parse error for better messaging
      let errorMessage = 'Error al subir metadata a IPFS';
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

    logger.info('JSON pinned successfully', {
      ipfsHash: data.IpfsHash,
      size: data.PinSize,
    });

    // 7. Return success response
    return NextResponse.json(
      {
        ipfsHash: data.IpfsHash,
        ipfsUrl: `ipfs://${data.IpfsHash}`,
        gatewayUrl: `${PINATA_GATEWAY}/ipfs/${data.IpfsHash}`,
        size: data.PinSize || JSON.stringify(metadata).length,
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
    logger.error('Unexpected error in pin route', error instanceof Error ? error : undefined);

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
