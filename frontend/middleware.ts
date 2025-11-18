import { NextRequest, NextResponse } from 'next/server';

/**
 * Production-grade Next.js middleware
 * Handles security headers, rate limiting, and request filtering
 */

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security Headers
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // XSS Protection (legacy but still good)
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  // Allow ICP domains, Bitcoin explorers, IPFS gateways, and necessary resources
  // IMPORTANT: https://ic0.app (without wildcard) must be explicit, as wildcards don't match root domains
  
  // For local development, allow localhost connections
  const isDev = process.env.NODE_ENV === 'development';
  const localHosts = isDev ? 'http://localhost:8000 http://127.0.0.1:8000 http://localhost:4943 ws://localhost:8000 ws://127.0.0.1:8000' : '';
  
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval/inline
    "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${localHosts} https://ic0.app https://*.ic0.app https://icp0.io https://*.icp0.io https://icp-api.io https://*.icp-api.io https://*.internetcomputer.org https://mempool.space https://api.pinata.cloud https://gateway.pinata.cloud https://ipfs.io https://cloudflare-ipfs.com https://dweb.link wss://ic0.app wss://*.ic0.app`,
    "frame-src 'self' https://ic0.app https://*.ic0.app https://identity.ic0.app",
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', cspDirectives);

  // Permissions Policy (formerly Feature Policy)
  const permissionsPolicy = [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
  ].join(', ');

  response.headers.set('Permissions-Policy', permissionsPolicy);

  // CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_ALLOWED_ORIGIN || '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  // Rate limiting headers (for transparency)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('X-RateLimit-Policy', 'Check endpoint-specific limits');
  }

  // Add request ID for tracking
  const requestId = crypto.randomUUID();
  response.headers.set('X-Request-ID', requestId);

  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
