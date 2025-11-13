import { HttpAgent, Actor, ActorSubclass } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';
import { logger } from '@/lib/logger';

const IC_HOST = process.env.NEXT_PUBLIC_IC_HOST || 'http://localhost:4943';

let agent: HttpAgent | null = null;
let authClient: AuthClient | null = null;

export async function getAgent(): Promise<HttpAgent> {
  if (agent) return agent;

  agent = new HttpAgent({
    host: IC_HOST,
  });

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
  const client = await getAuthClient();
  
  const isLocal = IC_HOST.includes('localhost') || IC_HOST.includes('127.0.0.1');
  const iiCanisterId = process.env.NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai';

  return new Promise((resolve) => {
    client.login({
      identityProvider: isLocal
        ? `http://localhost:4943?canisterId=${iiCanisterId}`
        : `https://identity.ic0.app`,
      onSuccess: () => {
        // Update agent with authenticated identity
        const identity = client.getIdentity();
        agent = new HttpAgent({
          host: IC_HOST,
          identity,
        });

        // Only fetch root key in local development
        if (isLocal) {
          agent.fetchRootKey().catch((err) => {
            logger.warn('Failed to fetch root key after login', { error: err });
          });
        }

        logger.info('Login successful');
        resolve(true);
      },
      onError: (error) => {
        logger.error('Login failed', typeof error === 'string' ? new Error(error) : undefined, { rawError: error });
        resolve(false);
      },
    });
  });
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
