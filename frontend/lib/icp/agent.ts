import { HttpAgent, Actor, ActorSubclass } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { Principal } from '@dfinity/principal';

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
    } catch (error) {
      console.warn('Unable to fetch root key:', error);
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

  return new Promise((resolve) => {
    client.login({
      identityProvider:
        IC_HOST.includes('localhost')
          ? `http://localhost:4943?canisterId=${process.env.NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai'}`
          : 'https://identity.ic0.app',
      onSuccess: () => {
        // Update agent with authenticated identity
        const identity = client.getIdentity();
        agent = new HttpAgent({
          host: IC_HOST,
          identity,
        });

        if (IC_HOST.includes('localhost')) {
          agent.fetchRootKey().catch(console.warn);
        }

        resolve(true);
      },
      onError: (error) => {
        console.error('Login failed:', error);
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
    await agent.fetchRootKey().catch(console.warn);
  }
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
