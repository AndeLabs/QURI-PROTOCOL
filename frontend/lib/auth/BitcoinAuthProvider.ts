/**
 * Bitcoin Authentication Provider
 * Handles Sign-in with Bitcoin (SIWB) authentication
 * Uses ic-siwb library for ICP delegation
 */

import { Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { DelegationIdentity } from '@dfinity/identity';
import { createActor, siwbMachine } from 'ic-siwb';
import { createActor as xstateCreateActor } from 'xstate';
import type { AuthProvider, BitcoinAuthState, BitcoinWalletType, AuthConfig } from './types';
import { DEFAULT_AUTH_CONFIG, AuthError } from './types';
import { saveBitcoinAuth, clearBitcoinAuth, saveLastWallet } from './utils/authStorage';
import { logger } from '@/lib/logger';

// Map our wallet types to ic-siwb provider keys
type SIWBProviderKey =
  | 'wizz'
  | 'unisat'
  | 'atom'
  | 'XverseProviders.BitcoinProvider'
  | 'okxwallet.bitcoinTestnet'
  | 'okxwallet.bitcoin'
  | 'okxwallet.bitcoinSignet'
  | 'BitcoinProvider'
  | 'OrangecryptoProviders.BitcoinProvider';

const WALLET_TO_PROVIDER: Record<BitcoinWalletType, SIWBProviderKey> = {
  unisat: 'unisat',
  xverse: 'XverseProviders.BitcoinProvider',
  leather: 'BitcoinProvider', // Leather uses BitcoinProvider
  okx: 'okxwallet.bitcoin',
  phantom: 'wizz', // Phantom Bitcoin uses similar provider
};

export class BitcoinAuthProvider implements AuthProvider {
  private config: AuthConfig;
  private siwbActor: ReturnType<typeof xstateCreateActor<typeof siwbMachine>> | null = null;
  private identity: DelegationIdentity | null = null;
  private address: string | null = null;
  private publicKey: string | null = null;
  private wallet: BitcoinWalletType | null = null;
  private canisterId: string;

  constructor(canisterId: string, config?: Partial<AuthConfig>) {
    this.config = { ...DEFAULT_AUTH_CONFIG, ...config };
    this.canisterId = canisterId;
  }

  /**
   * Initialize the SIWB actor
   */
  private async initSIWBActor() {
    if (this.siwbActor) return;

    // Create the anonymous actor for SIWB canister
    const anonymousActor = createActor(this.canisterId, {
      agentOptions: {
        host: this.config.icHost,
      },
    });

    // Create the xstate actor with the SIWB machine
    this.siwbActor = xstateCreateActor(siwbMachine, {
      input: {
        anonymousActor,
      },
    });

    this.siwbActor.start();
  }

  /**
   * Connect with Bitcoin wallet
   */
  async connect(walletType: BitcoinWalletType = 'xverse'): Promise<boolean> {
    try {
      await this.initSIWBActor();

      if (!this.siwbActor) {
        throw new AuthError('Failed to initialize SIWB', 'UNKNOWN');
      }

      const providerKey = WALLET_TO_PROVIDER[walletType];
      if (!providerKey) {
        throw new AuthError(`Unsupported wallet: ${walletType}`, 'WALLET_NOT_FOUND');
      }

      logger.info('Starting Bitcoin wallet connection...', { wallet: walletType });

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.warn('Bitcoin login timed out');
          resolve(false);
        }, 120000);

        // Subscribe to state changes
        const subscription = this.siwbActor!.subscribe((state) => {
          logger.debug('SIWB state:', { value: state.value });

          if (state.matches('authenticated')) {
            clearTimeout(timeout);

            // Extract data from context
            const ctx = state.context;
            this.identity = ctx.identity || null;
            this.address = ctx.address || null;
            this.publicKey = ctx.publicKey || null;
            this.wallet = walletType;

            // Save to storage
            if (this.address && this.publicKey) {
              saveBitcoinAuth({
                address: this.address,
                publicKey: this.publicKey,
                wallet: walletType,
                timestamp: Date.now(),
              });
              saveLastWallet(walletType);
            }

            logger.info('Bitcoin authentication successful', {
              address: this.address,
              principal: this.identity?.getPrincipal().toText(),
            });

            subscription.unsubscribe();
            resolve(true);
          }

          if (state.matches('idle') && state.context.connected === false) {
            // Check if we're in error state
            clearTimeout(timeout);
            logger.warn('Bitcoin connection failed or cancelled');
            subscription.unsubscribe();
            resolve(false);
          }
        });

        // Send connect event
        this.siwbActor!.send({ type: 'CONNECT', providerKey });
      });
    } catch (error) {
      logger.error('Bitcoin connection error', error instanceof Error ? error : undefined);
      throw error instanceof AuthError
        ? error
        : new AuthError('Failed to connect Bitcoin wallet', 'UNKNOWN', error);
    }
  }

  /**
   * Disconnect Bitcoin wallet
   */
  async disconnect(): Promise<void> {
    try {
      // Stop the xstate actor
      if (this.siwbActor) {
        this.siwbActor.stop();
        this.siwbActor = null;
      }

      // Clear state
      this.identity = null;
      this.address = null;
      this.publicKey = null;
      this.wallet = null;

      // Clear storage
      clearBitcoinAuth();

      logger.info('Bitcoin wallet disconnected');
    } catch (error) {
      logger.error('Bitcoin disconnect error', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Check if authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return this.identity !== null && this.address !== null;
  }

  /**
   * Get current identity
   */
  getIdentity(): Identity | null {
    return this.identity;
  }

  /**
   * Get principal from delegated identity
   */
  getPrincipal(): Principal | null {
    if (!this.identity) return null;
    return this.identity.getPrincipal();
  }

  /**
   * Get Bitcoin address
   */
  getAddress(): string | null {
    return this.address;
  }

  /**
   * Get public key
   */
  getPublicKey(): string | null {
    return this.publicKey;
  }

  /**
   * Get connected wallet type
   */
  getWallet(): BitcoinWalletType | null {
    return this.wallet;
  }

  /**
   * Get current auth state
   */
  async getState(): Promise<BitcoinAuthState> {
    const authenticated = await this.isAuthenticated();

    return {
      isAuthenticated: authenticated,
      address: this.address,
      publicKey: this.publicKey,
      wallet: this.wallet,
      network: this.config.network,
      delegatedIdentity: this.identity,
    };
  }

  /**
   * Sign a message with Bitcoin wallet
   */
  async signMessage(message: string): Promise<string | null> {
    if (!this.siwbActor) {
      throw new AuthError('Not connected', 'UNKNOWN');
    }

    const state = this.siwbActor.getSnapshot();
    const provider = state.context.provider;

    if (!provider) {
      throw new AuthError('No wallet provider', 'WALLET_NOT_FOUND');
    }

    try {
      const signature = await provider.signMessage(message);
      return signature;
    } catch (error) {
      logger.error('Failed to sign message', error instanceof Error ? error : undefined);
      throw new AuthError('Failed to sign message', 'USER_REJECTED', error);
    }
  }
}

// Factory function for creating Bitcoin auth provider
let bitcoinAuthProvider: BitcoinAuthProvider | null = null;

export function getBitcoinAuthProvider(
  canisterId: string,
  config?: Partial<AuthConfig>
): BitcoinAuthProvider {
  if (!bitcoinAuthProvider) {
    bitcoinAuthProvider = new BitcoinAuthProvider(canisterId, config);
  }
  return bitcoinAuthProvider;
}

export function resetBitcoinAuthProvider(): void {
  if (bitcoinAuthProvider) {
    bitcoinAuthProvider.disconnect().catch(console.error);
  }
  bitcoinAuthProvider = null;
}
