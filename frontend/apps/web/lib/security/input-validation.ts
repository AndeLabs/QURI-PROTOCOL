/**
 * Production-grade input validation and sanitization
 * Prevents XSS, injection attacks, and invalid data
 */

/**
 * Sanitize HTML content to prevent XSS
 * Simple implementation - for production consider using DOMPurify
 */
export function sanitizeHTML(dirty: string): string {
  if (typeof window !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = dirty;
    return div.innerHTML;
  }
  return dirty.replace(/[<>]/g, '');
}

/**
 * Sanitize plain text (remove HTML tags)
 */
export function sanitizeText(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Validate Rune name format
 * Must be uppercase A-Z with optional spacer dots
 */
export function validateRuneName(name: string): {
  valid: boolean;
  error?: string;
} {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Rune name is required' };
  }

  if (name.length < 1 || name.length > 28) {
    return { valid: false, error: 'Rune name must be 1-28 characters' };
  }

  // Check for valid characters (A-Z and spacer •)
  const validPattern = /^[A-Z•]+$/;
  if (!validPattern.test(name)) {
    return { valid: false, error: 'Rune name must contain only A-Z and spacer (•)' };
  }

  // Check for consecutive spacers
  if (name.includes('••')) {
    return { valid: false, error: 'Cannot have consecutive spacers' };
  }

  // Check for leading/trailing spacers
  if (name.startsWith('•') || name.endsWith('•')) {
    return { valid: false, error: 'Cannot start or end with spacer' };
  }

  return { valid: true };
}

/**
 * Validate Rune symbol (ticker)
 */
export function validateRuneSymbol(symbol: string): {
  valid: boolean;
  error?: string;
} {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Symbol is required' };
  }

  const trimmed = symbol.trim().toUpperCase();

  if (trimmed.length < 1 || trimmed.length > 5) {
    return { valid: false, error: 'Symbol must be 1-5 characters' };
  }

  if (!/^[A-Z]+$/.test(trimmed)) {
    return { valid: false, error: 'Symbol must contain only letters (A-Z)' };
  }

  return { valid: true };
}

/**
 * Validate divisibility (0-18)
 */
export function validateDivisibility(divisibility: number): {
  valid: boolean;
  error?: string;
} {
  if (typeof divisibility !== 'number' || !Number.isInteger(divisibility)) {
    return { valid: false, error: 'Divisibility must be an integer' };
  }

  if (divisibility < 0 || divisibility > 18) {
    return { valid: false, error: 'Divisibility must be between 0 and 18' };
  }

  return { valid: true };
}

/**
 * Validate supply amount
 */
export function validateSupply(supply: bigint | number | string): {
  valid: boolean;
  error?: string;
} {
  try {
    const amount = BigInt(supply);

    if (amount <= 0n) {
      return { valid: false, error: 'Supply must be greater than 0' };
    }

    // Max supply: 2^128 - 1 (maximum for u128)
    const MAX_SUPPLY = BigInt('340282366920938463463374607431768211455');
    if (amount > MAX_SUPPLY) {
      return { valid: false, error: 'Supply exceeds maximum allowed value' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid supply format' };
  }
}

/**
 * Validate Bitcoin address
 */
export function validateBitcoinAddress(address: string): {
  valid: boolean;
  error?: string;
} {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Bitcoin address is required' };
  }

  const trimmed = address.trim();

  // Basic validation - improve with proper Bitcoin address validation library
  // Supports legacy (1...), P2SH (3...), Bech32 (bc1...), Taproot (bc1p...)
  const addressPattern = /^(1[a-zA-HJ-NP-Z0-9]{25,34}|3[a-zA-HJ-NP-Z0-9]{25,34}|bc1[a-z0-9]{39,59})$/;

  if (!addressPattern.test(trimmed)) {
    return { valid: false, error: 'Invalid Bitcoin address format' };
  }

  return { valid: true };
}

/**
 * Validate Principal ID (ICP)
 */
export function validatePrincipalId(principal: string): {
  valid: boolean;
  error?: string;
} {
  if (!principal || typeof principal !== 'string') {
    return { valid: false, error: 'Principal ID is required' };
  }

  // Basic format check for Principal IDs
  // Format: xxxxx-xxxxx-xxxxx-xxxxx-xxx
  const principalPattern = /^[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{5}-[a-z0-9]{3}$/;

  if (!principalPattern.test(principal)) {
    return { valid: false, error: 'Invalid Principal ID format' };
  }

  return { valid: true };
}

/**
 * Validate URL
 */
export function validateURL(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const urlObj = new URL(url);
    // Only allow http and https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use http or https protocol' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validate email
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Escape special characters for safe display
 */
export function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(
  input: string,
  maxLength: number = 1000
): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  // Remove HTML tags
  sanitized = sanitizeText(sanitized);

  return sanitized;
}

/**
 * Check for SQL injection patterns (basic check)
 */
export function containsSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\#|\/\*|\*\/)/,
    /(\bOR\b.*=.*)/i,
    /(\bAND\b.*=.*)/i,
    /(;|\||&)/,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * Check for XSS patterns
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * Comprehensive input validation
 */
export function validateInput(input: string): {
  valid: boolean;
  error?: string;
  sanitized: string;
} {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Input is required', sanitized: '' };
  }

  // Check for malicious patterns
  if (containsSQLInjection(input)) {
    return { valid: false, error: 'Input contains invalid characters', sanitized: '' };
  }

  if (containsXSS(input)) {
    return { valid: false, error: 'Input contains invalid characters', sanitized: '' };
  }

  // Sanitize input
  const sanitized = sanitizeInput(input);

  return { valid: true, sanitized };
}
