/**
 * Content Security Policy (CSP) Configuration
 *
 * Implements a strict CSP for production with nonce-based script execution
 * to prevent XSS attacks while maintaining Next.js functionality.
 */

import { headers } from 'next/headers';

/**
 * Generate a cryptographically secure nonce for CSP
 */
export function generateNonce(): string {
  if (typeof crypto === 'undefined') {
    // Fallback for environments without crypto API
    return Buffer.from(Math.random().toString()).toString('base64');
  }

  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * Get the current nonce from headers (set by middleware)
 */
export function getNonce(): string | undefined {
  const headersList = headers();
  return headersList.get('x-nonce') || undefined;
}

/**
 * Build CSP directives based on environment
 */
export function buildCSPDirectives(nonce: string, isDev: boolean = false): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],

    // Script sources
    // In production: only allow scripts with nonce or from self
    // In development: allow unsafe-eval for HMR (Hot Module Replacement)
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],

    // Style sources
    // Tailwind CSS and inline styles need unsafe-inline
    // TODO: Consider extracting critical CSS and using nonces for inline styles
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind and dynamic styles
    ],

    // Image sources
    // Allow images from self, data URIs, blob URIs, and HTTPS
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:', // Allow all HTTPS images (can be restricted further if needed)
    ],

    // Font sources
    'font-src': [
      "'self'",
      'data:', // For inline fonts
    ],

    // Connect sources (APIs, WebSockets, etc.)
    'connect-src': [
      "'self'",
      // ICP domains
      'https://ic0.app',
      'https://*.ic0.app',
      'https://icp0.io',
      'https://*.icp0.io',
      'https://icp-api.io',
      'https://*.icp-api.io',
      'https://*.internetcomputer.org',
      // WebSocket for ICP
      'wss://ic0.app',
      'wss://*.ic0.app',
      // Bitcoin explorers
      'https://mempool.space',
      'https://api.hiro.so',
      // IPFS gateways
      'https://api.pinata.cloud',
      'https://gateway.pinata.cloud',
      'https://ipfs.io',
      'https://cloudflare-ipfs.com',
      'https://dweb.link',
      // Price feeds
      'https://min-api.cryptocompare.com',
      // Development
      ...(isDev ? [
        'http://localhost:8000',
        'http://127.0.0.1:8000',
        'http://localhost:4943',
        'ws://localhost:8000',
        'ws://127.0.0.1:8000',
      ] : []),
    ],

    // Frame sources (for Internet Identity)
    'frame-src': [
      "'self'",
      'https://ic0.app',
      'https://*.ic0.app',
      'https://identity.ic0.app',
    ],

    // Worker sources (for Web Workers and Service Workers)
    'worker-src': [
      "'self'",
      'blob:', // Required for some ICP operations
    ],

    // Prevent embedding in iframes
    'frame-ancestors': ["'none'"],

    // Restrict base URI
    'base-uri': ["'self'"],

    // Restrict form actions
    'form-action': ["'self'"],

    // Upgrade insecure requests in production
    ...(isDev ? {} : { 'upgrade-insecure-requests': [] }),
  };

  // Convert to CSP string format
  return Object.entries(directives)
    .map(([key, values]) => {
      if (values.length === 0) return key;
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * CSP Reporting configuration (optional)
 * Uncomment and configure if you want to receive CSP violation reports
 */
export function buildCSPWithReporting(nonce: string, isDev: boolean = false): string {
  const baseCSP = buildCSPDirectives(nonce, isDev);

  // Add report-uri or report-to if you have a reporting endpoint
  // const reportUri = process.env.CSP_REPORT_URI;
  // if (reportUri) {
  //   return `${baseCSP}; report-uri ${reportUri}`;
  // }

  return baseCSP;
}

/**
 * Validation function to check if CSP is properly configured
 */
export function validateCSP(csp: string): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  // Check for unsafe directives in production
  if (process.env.NODE_ENV === 'production') {
    if (csp.includes("'unsafe-eval'")) {
      warnings.push("CSP contains 'unsafe-eval' in production - this weakens XSS protection");
    }

    // unsafe-inline for styles is acceptable due to Tailwind
    if (csp.includes("'unsafe-inline'") && !csp.includes('style-src')) {
      warnings.push("CSP contains 'unsafe-inline' outside of style-src - consider using nonces");
    }
  }

  // Check for required directives
  const requiredDirectives = ['default-src', 'script-src', 'connect-src'];
  for (const directive of requiredDirectives) {
    if (!csp.includes(directive)) {
      warnings.push(`CSP missing recommended directive: ${directive}`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}
