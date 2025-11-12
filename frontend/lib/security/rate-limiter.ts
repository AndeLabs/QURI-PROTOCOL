/**
 * Production-grade rate limiting for API endpoints and user actions
 * Prevents abuse and DoS attacks
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter
 * For production, use Redis or similar distributed cache
 */
class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if action is allowed for the given identifier
   */
  async check(identifier: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Date.now();
    const key = identifier;
    const entry = this.limits.get(key);

    // No entry or expired window
    if (!entry || now >= entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // Within window - check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }

    // Increment counter
    entry.count++;
    this.limits.set(key, entry);

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.limits.delete(identifier);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now >= entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Destroy rate limiter and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.limits.clear();
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Common rate limit configurations
 */
export const RateLimits = {
  // Strict: 10 requests per minute
  STRICT: { maxRequests: 10, windowMs: 60000 },

  // Normal: 30 requests per minute
  NORMAL: { maxRequests: 30, windowMs: 60000 },

  // Generous: 100 requests per minute
  GENEROUS: { maxRequests: 100, windowMs: 60000 },

  // Create Rune: 3 per hour (expensive operation)
  CREATE_RUNE: { maxRequests: 3, windowMs: 3600000 },

  // Wallet Connection: 10 per minute
  WALLET_CONNECT: { maxRequests: 10, windowMs: 60000 },

  // Query operations: 100 per minute
  QUERY: { maxRequests: 100, windowMs: 60000 },
};

/**
 * Create rate limiter middleware for API routes
 */
export function createRateLimitMiddleware(config: RateLimitConfig) {
  return async (identifier: string): Promise<{
    allowed: boolean;
    headers: Record<string, string>;
  }> => {
    const result = await rateLimiter.check(identifier, config);

    return {
      allowed: result.allowed,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      },
    };
  };
}

/**
 * Client-side rate limiter for user actions
 */
export class ClientRateLimiter {
  private lastAction: number = 0;
  private actionCount: number = 0;
  private windowStart: number = Date.now();

  constructor(
    private maxActions: number,
    private windowMs: number
  ) {}

  /**
   * Check if action is allowed
   */
  canPerformAction(): boolean {
    const now = Date.now();

    // Reset window if expired
    if (now - this.windowStart >= this.windowMs) {
      this.actionCount = 0;
      this.windowStart = now;
    }

    // Check limit
    if (this.actionCount >= this.maxActions) {
      return false;
    }

    // Allow action
    this.actionCount++;
    this.lastAction = now;
    return true;
  }

  /**
   * Get time until next action is allowed
   */
  getWaitTime(): number {
    if (this.canPerformAction()) {
      return 0;
    }
    const timeInWindow = Date.now() - this.windowStart;
    return Math.max(0, this.windowMs - timeInWindow);
  }

  /**
   * Reset limiter
   */
  reset(): void {
    this.actionCount = 0;
    this.windowStart = Date.now();
    this.lastAction = 0;
  }
}
