import { HttpAgent, Actor, ActorSubclass } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { logger } from '@/lib/logger';

const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'http://localhost:4943';
const IS_LOCAL_DEV = IC_HOST.includes('localhost') || IC_HOST.includes('127.0.0.1');

let agent: HttpAgent | null = null;
let authClient: AuthClient | null = null;

export async function getAgent(forceRecreate = false): Promise<HttpAgent> {
  // If agent exists and we're not forcing recreation, return it
  if (agent && !forceRecreate) return agent;

  // Check if user is already authenticated (e.g., session restored)
  const client = await getAuthClient();
  const authenticated = await client.isAuthenticated();

  if (authenticated) {
    // Create agent with authenticated identity
    const identity = client.getIdentity();
    agent = new HttpAgent({
      host: IC_HOST,
      identity,
    });
    logger.debug('Agent created with authenticated identity', {
      principal: identity.getPrincipal().toText(),
    });
  } else {
    // Create anonymous agent
    agent = new HttpAgent({
      host: IC_HOST,
    });
    logger.debug('Agent created as anonymous');
  }

  // Fetch root key for local development
  if (IC_HOST.includes('localhost')) {
    try {
      await agent.fetchRootKey();
      logger.debug('Root key fetched successfully');
    } catch (error) {
      logger.warn('Unable to fetch root key (local development)', { error });
    }
  }

  return agent;
}

export async function getAuthClient(): Promise<AuthClient> {
  if (authClient) return authClient;
  authClient = await AuthClient.create();
  return authClient;
}

export async function login(): Promise<boolean> {
  try {
    const client = await getAuthClient();

    // Determine identity provider URL
    const identityProvider = IS_LOCAL_DEV
      ? `http://localhost:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai`
      : 'https://identity.ic0.app';

    logger.info('🔐 Starting Internet Identity login...', { identityProvider });

    return new Promise((resolve) => {
      // Set a reasonable timeout (2 minutes for user to complete auth)
      const timeout = setTimeout(() => {
        logger.warn('⏱️ Login timed out - user may have closed the popup');
        resolve(false);
      }, 120000); // 2 minutes

      client.login({
        identityProvider,
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
        onSuccess: async () => {
          clearTimeout(timeout);

          // Update agent with authenticated identity
          const identity = client.getIdentity();
          agent = new HttpAgent({
            host: IC_HOST,
            identity,
          });

          // Fetch root key only in local development
          if (IS_LOCAL_DEV) {
            try {
              await agent.fetchRootKey();
              logger.info('Root key fetched after login');
            } catch (err) {
              logger.warn('Failed to fetch root key', { error: err });
            }
          }

          logger.info('✅ Login successful', {
            principal: identity.getPrincipal().toText()
          });
          resolve(true);
        },
        onError: (error) => {
          clearTimeout(timeout);
          logger.error('❌ Login failed', {
            error: typeof error === 'string' ? error : String(error)
          });
          resolve(false);
        },
      });

      // Detect popup blockers
      setTimeout(() => {
        // If popup is blocked, the auth window won't open
        // We can't directly detect this, but we can inform the user
        logger.info('💡 If nothing happens, please allow popups for this site');
      }, 1000);
    });
  } catch (error) {
    logger.error('💥 Login error', error instanceof Error ? error : undefined);
    return false;
  }
}

export async function logout(): Promise<void> {
  const client = await getAuthClient();
  await client.logout();

  // Reset agent to anonymous
  agent = new HttpAgent({ host: IC_HOST });
  if (IC_HOST.includes('localhost')) {
    await agent.fetchRootKey().catch((err) => {
      logger.warn('Failed to fetch root key after logout', { error: err });
    });
  }

  logger.info('Logout successful');
}


export async function isAuthenticated(): Promise<boolean> {
  const client = await getAuthClient();
  return client.isAuthenticated();
}

export async function getPrincipal(): Promise<Principal | null> {
  const client = await getAuthClient();
  const authenticated = await client.isAuthenticated();

  if (!authenticated) return null;

  const identity = client.getIdentity();
  return identity.getPrincipal();
}

export function createActor<T>(
  canisterId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  idlFactory: any
): ActorSubclass<T> {
  const canisterIdPrincipal = Principal.fromText(canisterId);

  if (!agent) {
    throw new Error('Agent not initialized. Call getAgent() first.');
  }

  return Actor.createActor<T>(idlFactory, {
    agent,
    canisterId: canisterIdPrincipal,
  });
}
