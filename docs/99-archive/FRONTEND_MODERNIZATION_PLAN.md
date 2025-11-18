# Frontend Modernization Plan - QURI Protocol

## 📊 Current Status: B- (Good Foundation, Needs Modernization)

**What's Working:**
- ✅ Robust authentication (Internet Identity)
- ✅ Excellent security (CSP, XSS protection, rate limiting)
- ✅ Production-grade logging
- ✅ Type-safe with TypeScript
- ✅ Next.js 14 App Router
- ✅ Responsive design

**Critical Gaps:**
- ❌ Only 1/6 backend canisters integrated
- ❌ No state management (repeated API calls)
- ❌ No toast notifications
- ❌ No dark mode
- ❌ No loading skeletons
- ❌ Missing modern UI components
- ❌ Zero tests

---

## 🎯 PHASE 1: CRITICAL BACKEND INTEGRATION (Week 1)

**Priority: P0 - Blocks Core Functionality**

### 1.1 Generate IDL Factories

Create TypeScript IDL factories for all backend canisters:

```bash
# Install didc if not already installed
cargo install didc

# Generate IDL factories
didc bind canisters/bitcoin-integration/bitcoin_integration.did \
  --target ts > frontend/lib/icp/idl/bitcoin-integration.idl.ts

didc bind canisters/registry/registry.did \
  --target ts > frontend/lib/icp/idl/registry.idl.ts

didc bind canisters/identity-manager/identity_manager.did \
  --target ts > frontend/lib/icp/idl/identity-manager.idl.ts

didc bind canisters/marketplace/marketplace.did \
  --target ts > frontend/lib/icp/idl/marketplace.idl.ts
```

**Files to Create:**
```
frontend/lib/icp/idl/
├── rune-engine.idl.ts ✅ (already exists)
├── bitcoin-integration.idl.ts ❌ NEEDED
├── registry.idl.ts ❌ NEEDED
├── identity-manager.idl.ts ❌ NEEDED
└── marketplace.idl.ts ❌ NEEDED
```

### 1.2 Create Actor Factories

Update `frontend/lib/icp/actors.ts`:

```typescript
// Add these functions:

export function getBitcoinIntegrationActor(
  identity?: Identity
): ActorSubclass<BitcoinIntegrationService> {
  const canisterId = process.env.NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID!;
  return Actor.createActor(bitcoinIntegrationIdlFactory, {
    agent: getAgent(identity),
    canisterId,
  });
}

export function getRegistryActor(
  identity?: Identity
): ActorSubclass<RegistryService> {
  const canisterId = process.env.NEXT_PUBLIC_REGISTRY_CANISTER_ID!;
  return Actor.createActor(registryIdlFactory, {
    agent: getAgent(identity),
    canisterId,
  });
}

export function getIdentityManagerActor(
  identity?: Identity
): ActorSubclass<IdentityManagerService> {
  const canisterId = process.env.NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID!;
  return Actor.createActor(identityManagerIdlFactory, {
    agent: getAgent(identity),
    canisterId,
  });
}

export function getMarketplaceActor(
  identity?: Identity
): ActorSubclass<MarketplaceService> {
  const canisterId = process.env.NEXT_PUBLIC_MARKETPLACE_CANISTER_ID!;
  return Actor.createActor(marketplaceIdlFactory, {
    agent: getAgent(identity),
    canisterId,
  });
}
```

### 1.3 Create Canister Hooks

Create hooks for each canister:

```
frontend/hooks/
├── useRuneEngine.ts ✅ (already exists)
├── useBitcoinIntegration.ts ❌ NEEDED
├── useRegistry.ts ❌ NEEDED
├── useIdentityManager.ts ❌ NEEDED
└── useMarketplace.ts ❌ NEEDED
```

**Example: `frontend/hooks/useBitcoinIntegration.ts`**

```typescript
import { useState } from 'react';
import { getBitcoinIntegrationActor } from '@/lib/icp/actors';
import { useICP } from '@/lib/icp/ICPProvider';
import type { FeeEstimates, BitcoinAddress, UtxoSelection } from '@/types/canisters';

export function useBitcoinIntegration() {
  const { identity } = useICP();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getP2TRAddress = async (): Promise<BitcoinAddress | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getBitcoinIntegrationActor(identity);
      const result = await actor.get_p2tr_address();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getFeeEstimates = async (): Promise<FeeEstimates | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getBitcoinIntegrationActor(identity);
      const result = await actor.get_fee_estimates();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const selectUtxos = async (
    amount: bigint,
    feeRate: bigint
  ): Promise<UtxoSelection | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getBitcoinIntegrationActor(identity);
      const result = await actor.select_utxos(amount, feeRate);

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getBlockHeight = async (): Promise<bigint | null> => {
    try {
      setLoading(true);
      setError(null);
      const actor = getBitcoinIntegrationActor(identity);
      const result = await actor.get_block_height();

      if ('Ok' in result) {
        return result.Ok;
      } else {
        setError(result.Err);
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getP2TRAddress,
    getFeeEstimates,
    selectUtxos,
    getBlockHeight,
    loading,
    error,
  };
}
```

### 1.4 Fix useActor Hook

Replace placeholder in `frontend/hooks/useActor.ts` with working implementation:

```typescript
import { useMemo } from 'react';
import { useICP } from '@/lib/icp/ICPProvider';
import {
  getRuneEngineActor,
  getBitcoinIntegrationActor,
  getRegistryActor,
  getIdentityManagerActor,
  getMarketplaceActor,
} from '@/lib/icp/actors';

export type CanisterName =
  | 'rune-engine'
  | 'bitcoin-integration'
  | 'registry'
  | 'identity-manager'
  | 'marketplace';

export function useActor(canisterName: CanisterName) {
  const { identity } = useICP();

  return useMemo(() => {
    switch (canisterName) {
      case 'rune-engine':
        return getRuneEngineActor(identity);
      case 'bitcoin-integration':
        return getBitcoinIntegrationActor(identity);
      case 'registry':
        return getRegistryActor(identity);
      case 'identity-manager':
        return getIdentityManagerActor(identity);
      case 'marketplace':
        return getMarketplaceActor(identity);
      default:
        throw new Error(`Unknown canister: ${canisterName}`);
    }
  }, [canisterName, identity]);
}
```

**Estimated Time: 2-3 days**

---

## 🔄 PHASE 2: STATE MANAGEMENT (Week 1)

**Priority: P0 - Improves Performance & UX**

### 2.1 Install Dependencies

```bash
cd frontend
npm install zustand @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

### 2.2 Create Zustand Stores

**File: `frontend/lib/store/useRuneStore.ts`**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RegistryEntry } from '@/types/canisters';

interface RuneState {
  // Cached runes
  runes: Map<string, RegistryEntry>;
  // Loading states
  loading: boolean;
  // Actions
  addRune: (rune: RegistryEntry) => void;
  updateRune: (id: string, rune: RegistryEntry) => void;
  getRune: (id: string) => RegistryEntry | undefined;
  setLoading: (loading: boolean) => void;
}

export const useRuneStore = create<RuneState>()(
  persist(
    (set, get) => ({
      runes: new Map(),
      loading: false,

      addRune: (rune) => set((state) => {
        const newRunes = new Map(state.runes);
        const key = `${rune.rune_id.block}-${rune.rune_id.tx}`;
        newRunes.set(key, rune);
        return { runes: newRunes };
      }),

      updateRune: (id, rune) => set((state) => {
        const newRunes = new Map(state.runes);
        newRunes.set(id, rune);
        return { runes: newRunes };
      }),

      getRune: (id) => get().runes.get(id),

      setLoading: (loading) => set({ loading }),
    }),
    {
      name: 'quri-rune-storage',
    }
  )
);
```

**File: `frontend/lib/store/useEtchingStore.ts`**

```typescript
import { create } from 'zustand';
import type { EtchingProcessView } from '@/types/canisters';

interface EtchingState {
  // Active etchings
  processes: Map<string, EtchingProcessView>;
  // Actions
  addProcess: (id: string, process: EtchingProcessView) => void;
  updateProcess: (id: string, process: EtchingProcessView) => void;
  getProcess: (id: string) => EtchingProcessView | undefined;
  removeProcess: (id: string) => void;
  // Polling
  shouldPoll: (id: string) => boolean;
}

export const useEtchingStore = create<EtchingState>((set, get) => ({
  processes: new Map(),

  addProcess: (id, process) => set((state) => {
    const newProcesses = new Map(state.processes);
    newProcesses.set(id, process);
    return { processes: newProcesses };
  }),

  updateProcess: (id, process) => set((state) => {
    const newProcesses = new Map(state.processes);
    newProcesses.set(id, process);
    return { processes: newProcesses };
  }),

  getProcess: (id) => get().processes.get(id),

  removeProcess: (id) => set((state) => {
    const newProcesses = new Map(state.processes);
    newProcesses.delete(id);
    return { processes: newProcesses };
  }),

  shouldPoll: (id) => {
    const process = get().processes.get(id);
    if (!process) return false;

    // Poll if not in final state
    return !['Completed', 'Failed'].includes(process.state);
  },
}));
```

### 2.3 Add React Query Provider

**File: `frontend/app/providers.tsx` (update)**

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ICPProvider } from '@/lib/icp/ICPProvider';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ICPProvider>{children}</ICPProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 2.4 Create Query Hooks

**File: `frontend/hooks/queries/useRuneQueries.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRegistry } from '@/hooks/useRegistry';
import type { RegistryEntry, RuneId } from '@/types/canisters';

export function useRuneQuery(runeId: RuneId) {
  const { getRune } = useRegistry();

  return useQuery({
    queryKey: ['rune', runeId.block, runeId.tx],
    queryFn: () => getRune(runeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRunesQuery(offset: bigint, limit: bigint) {
  const { listRunes } = useRegistry();

  return useQuery({
    queryKey: ['runes', offset, limit],
    queryFn: () => listRunes(offset, limit),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useSearchRunesQuery(query: string) {
  const { searchRunes } = useRegistry();

  return useQuery({
    queryKey: ['runes', 'search', query],
    queryFn: () => searchRunes(query),
    enabled: query.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}
```

### 2.5 Add Real-Time Polling

**File: `frontend/hooks/queries/useEtchingPolling.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { useRuneEngine } from '@/hooks/useRuneEngine';
import { useEtchingStore } from '@/lib/store/useEtchingStore';

export function useEtchingPolling(processId: string) {
  const { getEtchingStatus } = useRuneEngine();
  const { shouldPoll, updateProcess } = useEtchingStore();

  return useQuery({
    queryKey: ['etching-status', processId],
    queryFn: async () => {
      const status = await getEtchingStatus(processId);
      if (status) {
        updateProcess(processId, status);
      }
      return status;
    },
    // Poll every 5 seconds if not in final state
    refetchInterval: shouldPoll(processId) ? 5000 : false,
    enabled: !!processId,
  });
}
```

**Estimated Time: 2 days**

---

## 🎨 PHASE 3: UI/UX MODERNIZATION (Week 2)

**Priority: P1 - User Experience**

### 3.1 Install shadcn/ui

```bash
cd frontend
npx shadcn-ui@latest init
```

**Configuration:**
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: Yes

### 3.2 Add Core Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add progress
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add select
npx shadcn-ui@latest add switch
```

### 3.3 Implement Toast Notification System

**File: `frontend/lib/toast.ts`**

```typescript
import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, { description });
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, { description });
  },

  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },
};

// Transaction-specific toasts
export const txToast = {
  submitted: (txId: string) => {
    toast.loading(`Transaction submitted: ${txId.slice(0, 8)}...`);
  },

  confirmed: (txId: string) => {
    toast.success('Transaction confirmed!', `TX: ${txId.slice(0, 8)}...`);
  },

  failed: (error: string) => {
    toast.error('Transaction failed', error);
  },
};
```

**Update: `frontend/app/layout.tsx`**

```typescript
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

### 3.4 Add Dark Mode Support

**Install dependency:**
```bash
npm install next-themes
```

**File: `frontend/components/ThemeProvider.tsx`**

```typescript
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes/dist/types';

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

**File: `frontend/components/ThemeToggle.tsx`**

```typescript
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
```

**Update: `frontend/app/providers.tsx`**

```typescript
import { ThemeProvider } from '@/components/ThemeProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <ICPProvider>{children}</ICPProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

**Update: `frontend/tailwind.config.ts`**

```typescript
module.exports = {
  darkMode: ['class'],
  // ... rest of config
}
```

### 3.5 Add Loading Skeletons

Replace loading states with skeletons:

**File: `frontend/components/RuneCardSkeleton.tsx`**

```typescript
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export function RuneCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-4" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </Card>
  );
}
```

### 3.6 Add Framer Motion

```bash
npm install framer-motion
```

**File: `frontend/components/PageTransition.tsx`**

```typescript
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Estimated Time: 3-4 days**

---

## 🧪 PHASE 4: TESTING (Week 3)

**Priority: P1 - Quality Assurance**

### 4.1 Unit Tests

**File: `frontend/__tests__/lib/validation.test.ts`**

```typescript
import { describe, it, expect } from '@jest/globals';
import { validateRuneName, validateSymbol } from '@/lib/security/input-validation';

describe('Rune Name Validation', () => {
  it('should accept valid rune names', () => {
    expect(validateRuneName('BITCOIN')).toBe(true);
    expect(validateRuneName('HELLO•WORLD')).toBe(true);
  });

  it('should reject invalid rune names', () => {
    expect(validateRuneName('bitcoin')).toBe(false); // lowercase
    expect(validateRuneName('HELLO••WORLD')).toBe(false); // consecutive spacers
    expect(validateRuneName('•HELLO')).toBe(false); // leading spacer
  });
});
```

### 4.2 Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { RuneCard } from '@/components/RuneCard';

describe('RuneCard', () => {
  it('renders rune information correctly', () => {
    const rune = {
      rune_id: { block: 1n, tx: 0n, name: 'TEST', timestamp: 0n },
      metadata: {
        name: 'TEST RUNE',
        symbol: 'TEST',
        // ... more fields
      },
    };

    render(<RuneCard rune={rune} />);

    expect(screen.getByText('TEST RUNE')).toBeInTheDocument();
    expect(screen.getByText('TEST')).toBeInTheDocument();
  });
});
```

### 4.3 E2E Tests with Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

**File: `frontend/e2e/etching.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('complete etching flow', async ({ page }) => {
  await page.goto('/dashboard/etch');

  // Fill form
  await page.fill('[name="runeName"]', 'TESTRUNENAME');
  await page.fill('[name="symbol"]', 'TEST');
  await page.fill('[name="divisibility"]', '8');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for success toast
  await expect(page.locator('text=Rune created successfully')).toBeVisible();
});
```

**Estimated Time: 3-4 days**

---

## ⚡ PHASE 5: PERFORMANCE OPTIMIZATION (Week 3)

**Priority: P2 - Performance**

### 5.1 Code Splitting

```typescript
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic';

const EtchingForm = dynamic(() => import('@/components/EnhancedEtchingForm'), {
  loading: () => <EtchingFormSkeleton />,
  ssr: false,
});

const RuneGallery = dynamic(() => import('@/components/RuneGallery'), {
  loading: () => <GallerySkeleton />,
});
```

### 5.2 Image Optimization

Replace `<img>` with Next.js `<Image>`:

```typescript
import Image from 'next/image';

<Image
  src={runeImage}
  alt={runeName}
  width={400}
  height={400}
  className="rounded-lg"
  loading="lazy"
  quality={85}
/>
```

### 5.3 Bundle Analysis

```bash
npm install -D @next/bundle-analyzer
```

**Update: `frontend/next.config.js`**

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer({
  // ... existing config
});
```

Run analysis:
```bash
ANALYZE=true npm run build
```

**Estimated Time: 2 days**

---

## 🚀 DELIVERY MILESTONES

### Week 1: Backend Integration + State Management
- ✅ All IDL factories generated
- ✅ All actor factories created
- ✅ All canister hooks implemented
- ✅ Zustand stores set up
- ✅ React Query integrated
- ✅ Real-time polling working

**Deliverable:** Fully integrated backend with caching

### Week 2: UI/UX Modernization
- ✅ shadcn/ui installed and configured
- ✅ Toast notifications system-wide
- ✅ Dark mode toggle
- ✅ Loading skeletons everywhere
- ✅ Framer Motion transitions
- ✅ Empty states

**Deliverable:** Modern, polished UI matching 2024 standards

### Week 3: Testing + Performance
- ✅ Unit tests for critical functions
- ✅ Component tests
- ✅ E2E tests for main flows
- ✅ Code splitting
- ✅ Image optimization
- ✅ Bundle analysis

**Deliverable:** Production-ready, tested, performant frontend

---

## 📋 QUICK WINS (Can Be Done Immediately)

These can be implemented in parallel:

1. **Add Toast to Existing Flows** (1 hour)
   - Install sonner: `npm install sonner`
   - Add to etching form submission
   - Add to connection flow

2. **Add Loading Skeletons** (2 hours)
   - Use existing LoadingSkeletons.tsx
   - Replace empty loading states

3. **Fix useActor Hook** (30 mins)
   - Simple replacement with working code

4. **Dark Mode CSS Variables** (1 hour)
   - Add dark mode classes to globals.css
   - No React changes needed yet

5. **Environment Variable Validation** (30 mins)
   ```bash
   npm install @t3-oss/env-nextjs zod
   ```

---

## 🎯 SUCCESS METRICS

**Before:**
- 1/6 canisters integrated (17%)
- No state management
- No tests
- No dark mode
- Grade: B-

**After (3 weeks):**
- 6/6 canisters integrated (100%)
- Full state management with caching
- 80%+ test coverage
- Dark mode + modern UI
- Grade: A+

---

## 💰 COST ESTIMATE

- **Week 1:** 40 hours (backend integration + state)
- **Week 2:** 32 hours (UI/UX modernization)
- **Week 3:** 32 hours (testing + performance)
- **Total:** 104 hours (~2.6 weeks of focused work)

---

## 🔄 CONTINUOUS IMPROVEMENTS

**Post-Launch:**
1. Add Web Vitals monitoring
2. Implement progressive Web App (PWA)
3. Add Sentry for error tracking
4. Set up Lighthouse CI
5. Add A/B testing framework
6. Implement analytics (Plausible/Umami)

---

## 📚 RESOURCES

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Framer Motion](https://www.framer.com/motion/)
- [Playwright Testing](https://playwright.dev/)

---

**Status:** Ready to Execute
**Priority Order:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
**Start Date:** When cycles are obtained and testnet is deployed
