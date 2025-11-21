/**
 * ICP Authentication Provider
 * Handles Internet Identity authentication
 */

import { HttpAgent, Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import type { AuthProvider, ICPAuthState, AuthConfig } from './types';
import { DEFAULT_AUTH_CONFIG, AuthError } from './types';
import { logger } from '@/lib/logger';

export class ICPAuthProvider implements AuthProvider {
  private authClient: AuthClient | null = null;
  private agent: HttpAgent | null = null;
  private config: AuthConfig;

  constructor(config?: Partial<AuthConfig>) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
  }

  /**
   * Initialize auth client
   */
  private async getAuthClient(): Promise<AuthClient> {
    if (this.authClient) return this.authClient;
    this.authClient = await AuthClient.create();
    return this.authClient;
  }

  /**
   * Get or create HTTP agent
   */
  async getAgent(forceRecreate = false): Promise<HttpAgent> {
    if (this.agent && !forceRecreate) return this.agent;

    const client = await this.getAuthClient();
    const authenticated = await client.isAuthenticated();

    if (authenticated) {
      const identity = client.getIdentity();
      this.agent = HttpAgent.createSync({
        host: this.config.icHost,
        identity,
        retryTimes: 5,
      });
      logger.debug('ICP Agent created with authenticated identity', {
        principal: identity.getPrincipal().toText(),
      });
    } else {
      this.agent = HttpAgent.createSync({
        host: this.config.icHost,
        retryTimes: 5,
      });
      logger.debug('ICP Agent created as anonymous');
    }

    // Fetch root key for local development
    if (this.config.icHost.includes('localhost')) {
      try {
        await this.agent.fetchRootKey();
        logger.debug('Root key fetched successfully');
      } catch (error) {
        logger.warn('Unable to fetch root key (local development)', { error });
      }
    }

    return this.agent;
  }

  /**
   * Connect with Internet Identity
   */
  async connect(): Promise<boolean> {
    try {
      const client = await this.getAuthClient();

      // Determine identity provider URL
      const isLocalDev =
        this.config.icHost.includes('localhost') || this.config.icHost.includes('127.0.0.1');

      const identityProvider = isLocalDev
        ? `http://localhost:4943?canisterId=${this.config.iiCanisterId || 'rdmx6-jaaaa-aaaaa-aaadq-cai'}`
        : 'https://identity.ic0.app';

      logger.info('Starting Internet Identity login...', { identityProvider });

      return new Promise((resolve) => {
        // Set a reasonable timeout (2 minutes for user to complete auth)
        const timeout = setTimeout(() => {
          logger.warn('Login timed out - user may have closed the popup');
          resolve(false);
        }, 120000);

        client.login({
          identityProvider,
          maxTimeToLive: this.config.sessionDuration,
          onSuccess: async () => {
            clearTimeout(timeout);

            // Update agent with authenticated identity
            const identity = client.getIdentity();
            this.agent = HttpAgent.createSync({
              host: this.config.icHost,
              identity,
              retryTimes: 5,
            });

            // Fetch root key only in local development
            if (isLocalDev) {
              try {
                await this.agent.fetchRootKey();
                logger.debug('Root key fetched after login');
              } catch (err) {
                logger.warn('Failed to fetch root key', { error: err });
              }
            }

            logger.info('ICP Login successful', {
              principal: identity.getPrincipal().toText(),
            });
            resolve(true);
          },
          onError: (error) => {
            clearTimeout(timeout);
            const errorMessage = typeof error === 'string' ? error : String(error);
            logger.error('ICP Login failed: ' + errorMessage);
            resolve(false);
          },
        });

        // Detect popup blockers
        setTimeout(() => {
          logger.info('If nothing happens, please allow popups for this site');
        }, 1000);
      });
    } catch (error) {
      logger.error('ICP Login error', error instanceof Error ? error : undefined);
      throw new AuthError(
        'Failed to connect with Internet Identity',
        'UNKNOWN',
        error
      );
    }
  }

  /**
   * Disconnect from Internet Identity
   */
  async disconnect(): Promise<void> {
    try {
      const client = await this.getAuthClient();
      await client.logout();

      // Reset agent to anonymous
      this.agent = HttpAgent.createSync({
        host: this.config.icHost,
        retryTimes: 5,
      });

      if (this.config.icHost.includes('localhost')) {
        await this.agent.fetchRootKey().catch((err) => {
          logger.warn('Failed to fetch root key after logout', { error: err });
        });
      }

      logger.info('ICP Logout successful');
    } catch (error) {
      logger.error('ICP Logout error', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const client = await this.getAuthClient();
    return client.isAuthenticated();
  }

  /**
   * Get current identity
   */
  getIdentity(): Identity | null {
    if (!this.authClient) return null;
    return this.authClient.getIdentity();
  }

  /**
   * Get principal
   */
  async getPrincipal(): Promise<Principal | null> {
    const client = await this.getAuthClient();
    const authenticated = await client.isAuthenticated();

    if (!authenticated) return null;

    const identity = client.getIdentity();
    return identity.getPrincipal();
  }

  /**
   * Get current auth state
   */
  async getState(): Promise<ICPAuthState> {
    const authenticated = await this.isAuthenticated();
    const principal = authenticated ? await this.getPrincipal() : null;
    const identity = authenticated ? this.getIdentity() : null;

    return {
      isAuthenticated: authenticated,
      principal,
      identity,
    };
  }
}

// Singleton instance for the application
let icpAuthProvider: ICPAuthProvider | null = null;

export function getICPAuthProvider(config?: Partial<AuthConfig>): ICPAuthProvider {
  if (!icpAuthProvider) {
    icpAuthProvider = new ICPAuthProvider(config);
  }
  return icpAuthProvider;
}

export function resetICPAuthProvider(): void {
  icpAuthProvider = null;
}
