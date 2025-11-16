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
  // STEP 1: AUTO-CLEAR CACHE before attempting login
  // This ensures we don't have stale auth data causing issues
  await clearAuthCache();
  
  // STEP 1.5: Wait for IndexedDB cleanup to fully complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // STEP 2: Recreate AuthClient with fresh state
  authClient = null; // Clear existing reference
  authClient = await AuthClient.create();
  const client = authClient;
  
  logger.info('AuthClient recreated after cache clear');
  
  // Use local Internet Identity in development, mainnet in production
  const II_CANISTER_ID = process.env.NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID || 'rdmx6-jaaaa-aaaaa-aaadq-cai';
  
  // STEP 3: Try multiple URL strategies in order
  const urlStrategies = IS_LOCAL_DEV ? [
    // Strategy 1: Subdomain format (recommended by DFINITY)
    `http://${II_CANISTER_ID}.localhost:8000`,
    // Strategy 2: Query param format (fallback)
    `http://localhost:8000?canisterId=${II_CANISTER_ID}`,
    // Strategy 3: Direct 127.0.0.1 (if localhost DNS fails)
    `http://${II_CANISTER_ID}.127.0.0.1:8000`,
  ] : [
    `https://identity.ic0.app`
  ];

  // STEP 4: Try each strategy until one works
  for (let i = 0; i < urlStrategies.length; i++) {
    const identityProvider = urlStrategies[i];
    logger.info(`Login attempt ${i + 1}/${urlStrategies.length}`, { 
      identityProvider, 
      canisterId: II_CANISTER_ID 
    });

    const success = await Promise.race([
      // Main login promise
      new Promise<boolean>((resolve) => {
        client.login({
          identityProvider,
          maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
          onSuccess: async () => {
            // Update agent with authenticated identity
            const identity = client.getIdentity();
            agent = new HttpAgent({
              host: IC_HOST,
              identity,
            });

            // Only fetch root key in local development
            if (IS_LOCAL_DEV) {
              try {
                await agent.fetchRootKey();
                logger.info('Root key fetched after login');
              } catch (err) {
                logger.warn('Failed to fetch root key after login', { error: err });
              }
            }

            logger.info('✅ Login successful', { strategy: i + 1, identityProvider });
            resolve(true);
          },
          onError: (error) => {
            logger.warn(`Login strategy ${i + 1} failed`, { 
              identityProvider,
              error: typeof error === 'string' ? error : String(error)
            });
            resolve(false);
          },
        });
      }),
      // Timeout promise (30 seconds)
      new Promise<boolean>((resolve) => {
        setTimeout(() => {
          logger.warn(`Login strategy ${i + 1} timed out after 30s`, { identityProvider });
          resolve(false);
        }, 30000);
      })
    ]);

    if (success) {
      return true; // Success! Exit early
    }

    // If this wasn't the last strategy, wait a bit before trying next
    if (i < urlStrategies.length - 1) {
      logger.info(`Waiting 1s before trying next strategy...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // All strategies failed
  logger.error('All login strategies failed', new Error('LOGIN_FAILED'));
  return false;
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

export async function clearAuthCache(): Promise<void> {
  // Clear all auth-related storage - COMPREHENSIVE CLEANUP
  if (typeof window !== 'undefined') {
    try {
      // 1. Clear ALL localStorage (Internet Identity uses various keys)
      const keysToRemove = Object.keys(window.localStorage).filter(
        key => key.includes('ic-') || 
               key.includes('identity') || 
               key.includes('delegation') ||
               key.includes('auth')
      );
      keysToRemove.forEach(key => {
        try {
          window.localStorage.removeItem(key);
          logger.debug(`Removed localStorage key: ${key}`);
        } catch (e) {
          logger.warn(`Failed to remove localStorage key: ${key}`, { error: e });
        }
      });
      
      // 2. Clear IndexedDB databases used by auth-client
      if (window.indexedDB) {
        const dbNames = ['auth-client-db', 'ic-keyval'];
        for (const dbName of dbNames) {
          try {
            const deleteRequest = window.indexedDB.deleteDatabase(dbName);
            await new Promise<void>((resolve, reject) => {
              deleteRequest.onsuccess = () => {
                logger.debug(`Deleted IndexedDB: ${dbName}`);
                resolve();
              };
              deleteRequest.onerror = () => reject(deleteRequest.error);
              deleteRequest.onblocked = () => {
                logger.warn(`IndexedDB deletion blocked: ${dbName}`);
                resolve(); // Don't fail, just warn
              };
            });
          } catch (e) {
            logger.warn(`Failed to delete IndexedDB: ${dbName}`, { error: e });
          }
        }
      }
      
      // 3. Clear sessionStorage as well
      const sessionKeys = Object.keys(window.sessionStorage).filter(
        key => key.includes('ic-') || 
               key.includes('identity') || 
               key.includes('delegation') ||
               key.includes('auth')
      );
      sessionKeys.forEach(key => {
        try {
          window.sessionStorage.removeItem(key);
          logger.debug(`Removed sessionStorage key: ${key}`);
        } catch (e) {
          logger.warn(`Failed to remove sessionStorage key: ${key}`, { error: e });
        }
      });
      
      logger.info('✅ Auth cache cleared completely', {
        localStorageKeys: keysToRemove.length,
        sessionStorageKeys: sessionKeys.length
      });
    } catch (error) {
      logger.error('Failed to clear auth cache', error instanceof Error ? error : new Error(String(error)));
    }
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
