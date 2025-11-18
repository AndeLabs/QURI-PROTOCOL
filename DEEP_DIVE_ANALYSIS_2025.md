# 🔬 QURI Protocol - Deep Dive Analysis 2025

**Complemento a:** ARCHITECTURAL_ANALYSIS_2025.md  
**Fecha:** 17 de Noviembre, 2025  
**Enfoque:** Frontend, Bitcoin Integration, Escalabilidad, Security

---

## 📱 PARTE 1: Frontend Architecture - Análisis Profundo

### 🎯 Estado Actual: Stack Tecnológico

```json
{
  "framework": "Next.js 14.2.0 (App Router)",
  "state_management": {
    "queries": "@tanstack/react-query 5.90.10",
    "client_state": "zustand 5.0.8",
    "icp": "@dfinity/agent 2.1.0"
  },
  "ui": {
    "styling": "Tailwind CSS + clsx/tw-merge",
    "components": "Custom + Lucide React icons",
    "notifications": "sonner 2.0.7"
  },
  "forms": "react-hook-form 7.53.0 + zod 3.23.0",
  "total_files": 103
}
```

### ✅ Fortalezas Arquitectónicas

#### 1. **Excellent State Management Separation**

El proyecto separa correctamente 3 tipos de estado:

```typescript
// ✅ Server State - React Query
const { data, isLoading } = useQuery({
  queryKey: ['runes', offset, limit],
  queryFn: () => registryActor.list_runes(offset, limit),
  staleTime: 60_000, // 1 min
});

// ✅ Client State - Zustand
const { addRune, runes } = useRuneStore();

// ✅ ICP Identity State - Custom Provider
const { isConnected, principal, connect } = useICP();
```

**Ventajas:**
- Cada tool hace lo que mejor sabe hacer
- No hay mezcla de concerns
- Testing más fácil

#### 2. **Optimistic Updates Pattern**

```typescript
// hooks/queries/useEtchingQueries.ts - LÍNEAS 109-174

onMutate: async (etching) => {
  // 1. Cancel outgoing queries
  await queryClient.cancelQueries({ queryKey: etchingKeys.lists() });
  
  // 2. Snapshot para rollback
  const previousProcesses = queryClient.getQueryData(etchingKeys.lists());
  
  // 3. Update optimista
  const tempId = `temp-${Date.now()}`;
  queryClient.setQueryData(etchingKeys.list(0n, 20n), old => [
    optimisticProcess,
    ...old
  ]);
  
  return { toastId, previousProcesses, tempId };
},

onSuccess: ({ processId, runeName }, etching, context) => {
  // 4. Replace temp con real
  queryClient.setQueryData(/* ... */);
  
  // 5. Start polling
  queryClient.invalidateQueries({ queryKey: etchingKeys.detail(processId) });
},

onError: (error, etching, context) => {
  // 6. Rollback si falla
  if (context?.previousProcesses) {
    queryClient.setQueryData(/* rollback */);
  }
}
```

**Resultado:** UX instantánea (< 100ms perceived latency)

#### 3. **Intelligent Polling Strategy**

```typescript
// Auto-poll active processes every 5s
refetchInterval: (query) => {
  if (!processId || !query.state.data) return false;
  return shouldPoll(processId) ? 5000 : false;
},
refetchIntervalInBackground: true, // ✅ Sigue polling cuando tab no visible
```

**Pro:**
- Polling solo cuando necesario (estados activos)
- Se detiene automáticamente cuando proceso completa
- Sigue actualizando en background

#### 4. **Zustand Store Design**

```typescript
// lib/store/useRuneStore.ts

interface RuneState {
  // ✅ Data: Map para O(1) lookups
  runes: Map<string, RegistryEntry>;
  
  // ✅ UI State separado
  viewMode: 'grid' | 'list';
  sortBy: 'created' | 'volume' | 'trending';
  
  // ✅ Computed values
  getRunesBySearch: () => RegistryEntry[];
  getTotalRunes: () => number;
}

// ✅ Persistencia selectiva
persist(
  (set, get) => ({ /* ... */ }),
  {
    name: 'quri-rune-storage',
    partialize: (state) => ({
      runes: Array.from(state.runes.entries()), // Solo data
      // NO persiste UI state (searchQuery, viewMode)
    }),
  }
)
```

**Ventajas:**
- Map en lugar de Array = O(1) lookups
- Persistencia solo de data importante
- Serialización custom para Map

### ❌ Problemas y Áreas de Mejora

#### Problema 1: **Fragmentación de Estado**

Actualmente tienes 3 fuentes de verdad:

```typescript
// 1. React Query cache
queryClient.getQueryData(['runes']);

// 2. Zustand store
useRuneStore().runes;

// 3. Hooks locales (sin centralizar)
const [localRunes, setLocalRunes] = useState([]);
```

**Impacto:**
- Posible inconsistencia
- Duplicación de datos
- Confusión sobre cuál usar

#### Problema 2: **Sin Normalización de Datos**

```typescript
// ❌ ACTUAL: Runes duplicados en múltiples lugares
{
  runes: Map<string, RegistryEntry>,    // Toda la rune
  myRunes: RegistryEntry[],             // Duplicado
  trendingRunes: RegistryEntry[],       // Duplicado
}

// ✅ MEJOR: Normalized Store
{
  entities: {
    runes: Map<string, RegistryEntry>,   // Single source
  },
  collections: {
    myRuneIds: string[],                 // Solo IDs
    trendingIds: string[],               // Solo IDs
  }
}
```

#### Problema 3: **Sin Error Boundaries Específicos**

```typescript
// Solo hay 1 ErrorBoundary global en providers.tsx
// Sin recovery strategies específicas por feature
```

#### Problema 4: **Falta de Cacheo Estratégico**

```typescript
// ❌ No hay Service Worker
// ❌ No hay cacheo de imágenes/assets
// ❌ No hay prefetching de rutas probables
```

### 🎯 Arquitectura Frontend Optimizada

```typescript
// ============================================================================
// NEW: lib/store/normalized/runeStore.ts
// ============================================================================

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { RegistryEntry, RuneKey } from '@/types/canisters';

// ============================================================================
// NORMALIZED SCHEMA
// ============================================================================

interface NormalizedRuneState {
  // ✅ Single source of truth
  entities: {
    runes: Map<string, RegistryEntry>;        // key -> rune
    creators: Map<string, Set<string>>;       // principal -> rune keys
    tags: Map<string, Set<string>>;           // tag -> rune keys
  };
  
  // ✅ Collections (solo IDs)
  collections: {
    all: string[];              // Todos los runes
    trending: string[];         // Ordenados por volume
    recent: string[];           // Ordenados por created_at
    myRunes: string[];          // Del usuario actual
    favorites: string[];        // Favoritos del usuario
  };
  
  // ✅ UI State
  ui: {
    selectedRuneId: string | null;
    viewMode: 'grid' | 'list';
    sortBy: 'created' | 'volume' | 'holders';
    filters: {
      searchQuery: string;
      minVolume: bigint | null;
      tags: string[];
    };
  };
  
  // ✅ Loading/Error State (por collection)
  loading: {
    all: boolean;
    trending: boolean;
    myRunes: boolean;
  };
  
  errors: {
    all: string | null;
    trending: string | null;
    myRunes: string | null;
  };
  
  // Actions
  addRune: (rune: RegistryEntry) => void;
  addRunes: (runes: RegistryEntry[]) => void;
  updateRune: (key: string, updates: Partial<RegistryEntry>) => void;
  removeRune: (key: string) => void;
  
  // Collection management
  setCollection: (name: keyof typeof this.collections, ids: string[]) => void;
  addToCollection: (name: keyof typeof this.collections, id: string) => void;
  
  // Computed selectors
  getRune: (key: string) => RegistryEntry | undefined;
  getRunesByIds: (ids: string[]) => RegistryEntry[];
  getFilteredRunes: () => RegistryEntry[];
  getTrendingRunes: () => RegistryEntry[];
  getMyRunes: () => RegistryEntry[];
  
  // UI actions
  setFilters: (filters: Partial<typeof this.ui.filters>) => void;
  clearFilters: () => void;
}

function getRuneKey(rune: RegistryEntry): string {
  return `${rune.metadata.key.block}:${rune.metadata.key.tx}`;
}

export const useNormalizedRuneStore = create<NormalizedRuneState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        entities: {
          runes: new Map(),
          creators: new Map(),
          tags: new Map(),
        },
        
        collections: {
          all: [],
          trending: [],
          recent: [],
          myRunes: [],
          favorites: [],
        },
        
        ui: {
          selectedRuneId: null,
          viewMode: 'grid',
          sortBy: 'created',
          filters: {
            searchQuery: '',
            minVolume: null,
            tags: [],
          },
        },
        
        loading: {
          all: false,
          trending: false,
          myRunes: false,
        },
        
        errors: {
          all: null,
          trending: null,
          myRunes: null,
        },
        
        // ----------------------------------------------------------------
        // Entity Management
        // ----------------------------------------------------------------
        
        addRune: (rune) =>
          set((state) => {
            const key = getRuneKey(rune);
            
            // Add to entities
            state.entities.runes.set(key, rune);
            
            // Add to all collection if not exists
            if (!state.collections.all.includes(key)) {
              state.collections.all.push(key);
            }
            
            // Index by creator
            const creatorKey = rune.metadata.creator.toText();
            if (!state.entities.creators.has(creatorKey)) {
              state.entities.creators.set(creatorKey, new Set());
            }
            state.entities.creators.get(creatorKey)!.add(key);
          }),
        
        addRunes: (runes) =>
          set((state) => {
            runes.forEach((rune) => {
              const key = getRuneKey(rune);
              state.entities.runes.set(key, rune);
              
              if (!state.collections.all.includes(key)) {
                state.collections.all.push(key);
              }
              
              // Index by creator
              const creatorKey = rune.metadata.creator.toText();
              if (!state.entities.creators.has(creatorKey)) {
                state.entities.creators.set(creatorKey, new Set());
              }
              state.entities.creators.get(creatorKey)!.add(key);
            });
          }),
        
        updateRune: (key, updates) =>
          set((state) => {
            const current = state.entities.runes.get(key);
            if (current) {
              state.entities.runes.set(key, { ...current, ...updates });
            }
          }),
        
        removeRune: (key) =>
          set((state) => {
            state.entities.runes.delete(key);
            
            // Remove from all collections
            Object.keys(state.collections).forEach((collectionKey) => {
              const collection = state.collections[collectionKey as keyof typeof state.collections];
              const index = collection.indexOf(key);
              if (index !== -1) {
                collection.splice(index, 1);
              }
            });
          }),
        
        // ----------------------------------------------------------------
        // Collection Management
        // ----------------------------------------------------------------
        
        setCollection: (name, ids) =>
          set((state) => {
            state.collections[name] = ids;
          }),
        
        addToCollection: (name, id) =>
          set((state) => {
            if (!state.collections[name].includes(id)) {
              state.collections[name].push(id);
            }
          }),
        
        // ----------------------------------------------------------------
        // Selectors (Computed)
        // ----------------------------------------------------------------
        
        getRune: (key) => get().entities.runes.get(key),
        
        getRunesByIds: (ids) => {
          const { entities } = get();
          return ids
            .map((id) => entities.runes.get(id))
            .filter((rune): rune is RegistryEntry => rune !== undefined);
        },
        
        getFilteredRunes: () => {
          const { collections, ui, entities } = get();
          const { searchQuery, minVolume, tags } = ui.filters;
          
          let runeIds = collections.all;
          let runes = get().getRunesByIds(runeIds);
          
          // Apply search filter
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            runes = runes.filter(
              (rune) =>
                rune.metadata.name.toLowerCase().includes(query) ||
                rune.metadata.symbol.toLowerCase().includes(query)
            );
          }
          
          // Apply volume filter
          if (minVolume !== null) {
            runes = runes.filter((rune) => rune.trading_volume_24h >= minVolume);
          }
          
          // Apply tags filter
          if (tags.length > 0) {
            runes = runes.filter((rune) => {
              const runeKey = getRuneKey(rune);
              return tags.some((tag) =>
                entities.tags.get(tag)?.has(runeKey)
              );
            });
          }
          
          // Sort
          runes.sort((a, b) => {
            switch (ui.sortBy) {
              case 'volume':
                return Number(b.trading_volume_24h - a.trading_volume_24h);
              case 'holders':
                return Number(b.holder_count - a.holder_count);
              case 'created':
              default:
                return Number(b.metadata.created_at - a.metadata.created_at);
            }
          });
          
          return runes;
        },
        
        getTrendingRunes: () => {
          const { collections } = get();
          return get().getRunesByIds(collections.trending);
        },
        
        getMyRunes: () => {
          const { collections } = get();
          return get().getRunesByIds(collections.myRunes);
        },
        
        // ----------------------------------------------------------------
        // UI Actions
        // ----------------------------------------------------------------
        
        setFilters: (filters) =>
          set((state) => {
            state.ui.filters = { ...state.ui.filters, ...filters };
          }),
        
        clearFilters: () =>
          set((state) => {
            state.ui.filters = {
              searchQuery: '',
              minVolume: null,
              tags: [],
            };
          }),
      })),
      {
        name: 'quri-normalized-runes',
        partialize: (state) => ({
          // Persist entities and collections
          entities: {
            runes: Array.from(state.entities.runes.entries()),
            creators: Array.from(state.entities.creators.entries()).map(
              ([key, set]) => [key, Array.from(set)]
            ),
            tags: Array.from(state.entities.tags.entries()).map(
              ([key, set]) => [key, Array.from(set)]
            ),
          },
          collections: state.collections,
          // Don't persist UI state
        }),
        // Custom serialization for Maps and Sets
        serialize: (state) => JSON.stringify({
          ...state,
          state: {
            ...state.state,
            entities: {
              runes: Array.from((state.state as any).entities.runes),
              creators: Array.from((state.state as any).entities.creators),
              tags: Array.from((state.state as any).entities.tags),
            },
          },
        }),
        deserialize: (str) => {
          const parsed = JSON.parse(str);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              entities: {
                runes: new Map(parsed.state.entities.runes),
                creators: new Map(
                  parsed.state.entities.creators.map(
                    ([k, v]: [string, string[]]) => [k, new Set(v)]
                  )
                ),
                tags: new Map(
                  parsed.state.entities.tags.map(
                    ([k, v]: [string, string[]]) => [k, new Set(v)]
                  )
                ),
              },
            },
          };
        },
      }
    ),
    { name: 'NormalizedRuneStore' }
  )
);

// ============================================================================
// REACT QUERY INTEGRATION
// ============================================================================

/**
 * Hook que sincroniza React Query con Zustand
 */
export function useSyncRunesWithQuery() {
  const { addRunes, setCollection } = useNormalizedRuneStore();
  
  return useQuery({
    queryKey: ['runes', 'all'],
    queryFn: async () => {
      const runes = await registryActor.list_runes(0n, 100n);
      
      // ✅ Update Zustand store
      addRunes(runes.results);
      
      // ✅ Update collection
      const ids = runes.results.map(getRuneKey);
      setCollection('all', ids);
      
      return runes;
    },
    staleTime: 60_000,
  });
}

/**
 * Hook para trending runes con sync automático
 */
export function useTrendingRunes() {
  const { addRunes, setCollection, getTrendingRunes } = useNormalizedRuneStore();
  
  const query = useQuery({
    queryKey: ['runes', 'trending'],
    queryFn: async () => {
      const runes = await registryActor.get_trending(0n, 20n);
      
      // Sync con store
      addRunes(runes.results);
      
      const ids = runes.results.map(getRuneKey);
      setCollection('trending', ids);
      
      return runes;
    },
    staleTime: 30_000, // 30s
  });
  
  // Return both query data and normalized data
  return {
    ...query,
    runes: getTrendingRunes(), // From Zustand (instant)
  };
}
```

**Ventajas de Normalización:**
- ✅ Sin duplicación de datos
- ✅ Updates consistentes (1 source of truth)
- ✅ Queries optimizadas (solo IDs en collections)
- ✅ Fácil implementación de favorites/tags
- ✅ Memory efficiency

### 🚀 Service Worker para Offline-First

```typescript
// public/sw.js - Service Worker

const CACHE_NAME = 'quri-v1';
const RUNTIME_CACHE = 'quri-runtime-v1';

// Assets críticos para cachear
const PRECACHE_ASSETS = [
  '/',
  '/gallery',
  '/create',
  '/_next/static/**',
  '/favicon.ico',
];

// Install: Pre-cache assets críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Limpiar caches viejos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first para ICP calls, Cache-first para assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ICP calls: Network-first (con fallback a cache)
  if (url.host.includes('icp-api.io') || url.host.includes('ic0.app')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback a cache si offline
          return caches.match(request);
        })
    );
    return;
  }
  
  // Static assets: Cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request);
      })
    );
    return;
  }
  
  // Resto: Network-first
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
```

**Registrar Service Worker:**

```typescript
// app/layout.tsx

useEffect(() => {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.error('SW registration failed:', error);
      });
  }
}, []);
```

**Beneficios:**
- ✅ Offline capability
- ✅ Faster repeat visits (cached assets)
- ✅ Reduced ICP canister calls
- ✅ Better UX en conexiones lentas

---

## ₿ PARTE 2: Bitcoin Integration Patterns - Análisis Profundo

### 🔍 Estado Actual (1,529 líneas)

**Componentes:**
1. **Schnorr Signatures** (schnorr.rs) - Threshold cryptography
2. **ckBTC Integration** (ckbtc.rs) - ICRC-1/ICRC-2 ledger
3. **Transaction Building** (transaction.rs) - Bitcoin TX construction
4. **UTXO Management** (utxo.rs) - Coin selection
5. **Bitcoin API** (bitcoin_api.rs) - IC Bitcoin integration

### ✅ Implementaciones Correctas

#### 1. **Schnorr Signatures con Threshold Cryptography**

```rust
// canisters/bitcoin-integration/src/schnorr.rs

pub async fn sign_message(
    message: Vec<u8>,
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let args = SignWithSchnorrArgs {
        message,
        derivation_path,
        key_id: SchnorrKeyId {
            algorithm: "bip340secp256k1".to_string(),  // ✅ BIP-340 compliant
            name: "dfx_test_key".to_string(),           // ⚠️ Cambiar a "key_1" para mainnet
        },
    };

    let (result,): (SignWithSchnorrResult,) = ic_cdk::call(
        Principal::management_canister(),
        "sign_with_schnorr",
        (args,),
    )
    .await
    .map_err(|(code, msg)| format!("Failed to sign: {:?} - {}", code, msg))?;

    Ok(result.signature)
}
```

**✅ Correcto:**
- Usa BIP-340 (Schnorr para Taproot)
- Derivation paths únicos
- Threshold signing (key nunca existe completa)

**⚠️ CRÍTICO: Key ID**
```rust
// ❌ ACTUAL: Hardcoded "dfx_test_key"
name: "dfx_test_key".to_string(),

// ✅ DEBE SER (para mainnet):
name: "key_1".to_string(),

// ✅ MEJOR: Configurable
name: std::env::var("SCHNORR_KEY_ID")
    .unwrap_or_else(|_| "dfx_test_key".to_string()),
```

#### 2. **ckBTC ICRC-1/ICRC-2 Integration**

```rust
// canisters/bitcoin-integration/src/ckbtc.rs

pub async fn charge_etching_fee(from: Principal, amount: u64) -> Result<u64, String> {
    // ✅ Usa ICRC-2 transferFrom (con approval previa del usuario)
    transfer_from(
        from,
        ic_cdk::api::id(), // canister recibe la fee
        amount,
        Some(b"Rune etching fee".to_vec()),
    ).await
}

async fn transfer_from(
    from: Principal,
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String> {
    let ledger = Principal::from_text("mxzaz-hqaaa-aaaar-qaada-cai")?; // ckBTC Mainnet

    let args = TransferFromArgs {
        from: Account { owner: from, subaccount: None },
        to: Account { owner: to, subaccount: None },
        amount: Nat::from(amount),
        fee: None, // ✅ Ledger calcula fee automáticamente
        memo,
        created_at_time: None,
    };

    let (result,): (TransferResult,) = call(ledger, "icrc2_transfer_from", (args,)).await?;
    
    match result {
        Ok(block_index) => Ok(block_index.0.try_into().unwrap()),
        Err(e) => Err(format!("Transfer failed: {:?}", e)),
    }
}
```

**✅ Correcto:**
- ICRC-2 approve/transferFrom pattern
- Error handling robusto
- Memo para tracking

#### 3. **P2TR Address Derivation**

```rust
// canisters/bitcoin-integration/src/lib.rs

pub async fn get_p2tr_address() -> Result<BitcoinAddress, String> {
    // ✅ Derivation path único por canister
    let derivation_path = vec![ic_cdk::api::id().as_slice().to_vec()];

    // ✅ Obtiene Schnorr pubkey del threshold scheme
    let public_key = schnorr::get_schnorr_public_key(derivation_path.clone()).await?;

    // ✅ Deriva dirección P2TR (Taproot)
    let network = get_network()?;
    let address = derive_p2tr_address(&public_key, network)?;

    Ok(BitcoinAddress { address, derivation_path })
}
```

**✅ Correcto:**
- P2TR (Taproot) para compatibilidad Runes
- Derivation path basado en canister ID
- Retorna tanto address como path (para futuras signatures)

### ❌ Problemas y Mejoras Necesarias

#### Problema 1: **Hardcoded Key ID (CRÍTICO para Mainnet)**

```rust
// ❌ ACTUAL: No funcionará en mainnet
const SCHNORR_KEY_ID: &str = "dfx_test_key";

// ✅ SOLUCIÓN: Environment-aware
fn get_schnorr_key_id() -> String {
    #[cfg(feature = "local")]
    {
        "dfx_test_key".to_string()
    }
    
    #[cfg(not(feature = "local"))]
    {
        "key_1".to_string() // Mainnet key
    }
}

// O mejor: Configurable en init
#[init]
fn init(network: BitcoinNetwork, ckbtc_ledger: Principal, key_id: String) {
    CONFIG.with(|c| {
        *c.borrow_mut() = Some(Config {
            network,
            ckbtc_ledger_id: ckbtc_ledger,
            schnorr_key_id: key_id, // ✅ Configurable
        });
    });
}
```

#### Problema 2: **No Hay Cycle Payment para sign_with_schnorr**

Según best practices de DFINITY, `sign_with_schnorr` requiere ~26B cycles:

```rust
// ❌ ACTUAL: No paga cycles
let (result,): (SignWithSchnorrResult,) = ic_cdk::call(
    Principal::management_canister(),
    "sign_with_schnorr",
    (args,),
).await?;

// ✅ CORRECTO: Pagar cycles
use ic_cdk::api::call::call_with_payment128;

let cycles: u128 = 26_153_846_153; // ~26B cycles

let (result,): (SignWithSchnorrResult,) = call_with_payment128(
    Principal::management_canister(),
    "sign_with_schnorr",
    (args,),
    cycles,
).await.map_err(|(code, msg)| {
    format!("Schnorr signing failed: {:?} - {}", code, msg)
})?;
```

#### Problema 3: **UTXO Selection Subóptimo**

```rust
// utxo.rs - Simplified analysis

// ❌ ACTUAL: Naive "first-fit" selection
pub fn select_utxos(utxos: Vec<Utxo>, target: u64) -> Vec<Utxo> {
    let mut selected = Vec::new();
    let mut total = 0u64;
    
    for utxo in utxos {
        if total >= target {
            break;
        }
        selected.push(utxo.clone());
        total += utxo.value;
    }
    
    selected
}
```

**Problemas:**
- No optimiza por fees (más inputs = más fees)
- No considera dust outputs
- No implementa Branch and Bound

**✅ SOLUCIÓN: Coin Selection Algorithms**

```rust
// libs/bitcoin-utils/src/coin_selection.rs (NUEVO)

use bitcoin::Amount;

/// Bitcoin Core-inspired coin selection
pub enum SelectionStrategy {
    /// Minimize inputs (lower fees)
    MinimizeInputs,
    
    /// Branch and Bound (optimal)
    BranchAndBound,
    
    /// Largest-first (simple, good enough)
    LargestFirst,
}

pub struct CoinSelector {
    strategy: SelectionStrategy,
    target_feerate: u64, // sat/vB
}

impl CoinSelector {
    /// Select UTXOs usando Branch and Bound
    ///
    /// Algoritmo usado por Bitcoin Core desde 0.17
    /// Optimiza para:
    /// 1. Minimizar change output
    /// 2. Minimizar fees totales
    /// 3. Evitar dust
    pub fn select_with_bnb(
        &self,
        mut utxos: Vec<Utxo>,
        target: u64,
    ) -> Result<CoinSelection, String> {
        // Sort UTXOs descendente (largest first)
        utxos.sort_by(|a, b| b.value.cmp(&a.value));
        
        let base_tx_size = 10 + 1 + 1; // version + input count + output count
        let output_size = 43; // P2TR output
        
        let mut best_selection: Option<Vec<Utxo>> = None;
        let mut best_waste = u64::MAX;
        
        // Try all combinations (2^n, pero con pruning)
        self.bnb_recursive(
            &utxos,
            target,
            0,
            0,
            &mut vec![],
            &mut best_selection,
            &mut best_waste,
            base_tx_size,
            output_size,
        );
        
        match best_selection {
            Some(utxos) => {
                let total_input = utxos.iter().map(|u| u.value).sum();
                let tx_size = self.estimate_tx_size(&utxos, 2); // 2 outputs (dest + change)
                let fee = tx_size * self.target_feerate;
                let change = total_input.saturating_sub(target + fee);
                
                Ok(CoinSelection {
                    selected: utxos,
                    total_input,
                    target,
                    fee,
                    change,
                })
            }
            None => Err("No valid UTXO combination found".to_string()),
        }
    }
    
    fn bnb_recursive(
        &self,
        utxos: &[Utxo],
        target: u64,
        depth: usize,
        current_sum: u64,
        current_selection: &mut Vec<Utxo>,
        best_selection: &mut Option<Vec<Utxo>>,
        best_waste: &mut u64,
        base_size: usize,
        output_size: usize,
    ) {
        // Base case: All UTXOs considered
        if depth == utxos.len() {
            if current_sum >= target {
                let waste = self.calculate_waste(current_selection, target);
                if waste < *best_waste {
                    *best_waste = waste;
                    *best_selection = Some(current_selection.clone());
                }
            }
            return;
        }
        
        // Pruning: If current sum already exceeds target by too much
        let max_acceptable = target * 2; // Heuristic
        if current_sum > max_acceptable {
            return;
        }
        
        // Try including current UTXO
        let utxo = &utxos[depth];
        current_selection.push(utxo.clone());
        self.bnb_recursive(
            utxos,
            target,
            depth + 1,
            current_sum + utxo.value,
            current_selection,
            best_selection,
            best_waste,
            base_size,
            output_size,
        );
        current_selection.pop();
        
        // Try excluding current UTXO
        self.bnb_recursive(
            utxos,
            target,
            depth + 1,
            current_sum,
            current_selection,
            best_selection,
            best_waste,
            base_size,
            output_size,
        );
    }
    
    fn calculate_waste(&self, selection: &[Utxo], target: u64) -> u64 {
        let total = selection.iter().map(|u| u.value).sum::<u64>();
        let tx_size = self.estimate_tx_size(selection, 2);
        let fee = tx_size * self.target_feerate;
        
        // Waste = excess value + fee overhead
        total.saturating_sub(target + fee)
    }
    
    fn estimate_tx_size(&self, utxos: &[Utxo], outputs: usize) -> u64 {
        // P2TR input: ~57.5 vB each
        // P2TR output: ~43 vB each
        let input_size = 58 * utxos.len();
        let output_size = 43 * outputs;
        let overhead = 10; // version, locktime, etc
        
        (overhead + input_size + output_size) as u64
    }
}

pub struct CoinSelection {
    pub selected: Vec<Utxo>,
    pub total_input: u64,
    pub target: u64,
    pub fee: u64,
    pub change: u64,
}

impl CoinSelection {
    /// Check if selection is economically viable
    pub fn is_economically_viable(&self) -> bool {
        // Don't create dust change outputs
        const DUST_THRESHOLD: u64 = 546; // satoshis
        
        if self.change > 0 && self.change < DUST_THRESHOLD {
            return false;
        }
        
        true
    }
}
```

**Uso:**

```rust
// canisters/bitcoin-integration/src/utxo.rs

use bitcoin_utils::coin_selection::{CoinSelector, SelectionStrategy};

pub async fn select_utxos_for_etching(
    network: BitcoinNetwork,
    amount_needed: u64,
    fee_rate: u64,
) -> Result<CoinSelection, String> {
    // Fetch UTXOs from IC Bitcoin API
    let utxos = bitcoin_api::get_utxos(network).await?;
    
    // Use Branch and Bound for optimal selection
    let selector = CoinSelector {
        strategy: SelectionStrategy::BranchAndBound,
        target_feerate: fee_rate,
    };
    
    let selection = selector.select_with_bnb(utxos, amount_needed)?;
    
    // Validate selection
    if !selection.is_economically_viable() {
        return Err("Selection would create dust output".to_string());
    }
    
    Ok(selection)
}
```

#### Problema 4: **Transaction Building Sin RBF**

```rust
// transaction.rs

// ❌ ACTUAL: Sequence hardcoded a 0xFFFFFFFF (no RBF)
let input = TxIn {
    previous_output,
    script_sig: ScriptBuf::new(),
    sequence: Sequence::MAX, // ❌ No permite RBF
    witness: Witness::new(),
};

// ✅ MEJOR: Habilitar RBF (Replace-By-Fee)
let input = TxIn {
    previous_output,
    script_sig: ScriptBuf::new(),
    sequence: Sequence::ENABLE_RBF_NO_LOCKTIME, // ✅ 0xFFFFFFFD
    witness: Witness::new(),
};
```

**Por qué RBF?**
- Permite bump fees si tx se atora
- Mejor UX (re-etching sin crear nueva tx)
- Estándar en Bitcoin wallets modernas

### 🎯 Arquitectura Bitcoin Mejorada

```rust
// ============================================================================
// canisters/bitcoin-integration/src/config.rs (NUEVO)
// ============================================================================

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{DefaultMemoryImpl, StableCell, Storable};
use std::borrow::Cow;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BitcoinIntegrationConfig {
    pub network: BitcoinNetwork,
    pub ckbtc_ledger_id: Principal,
    pub schnorr_key_id: String,
    pub default_fee_rate: u64,      // sat/vB
    pub min_confirmations: u32,      // Para considerar tx confirmada
    pub enable_rbf: bool,            // Replace-By-Fee
    pub dust_threshold: u64,         // Satoshis
}

impl Storable for BitcoinIntegrationConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap())
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap()
    }
    
    const BOUND: Bound = Bound::Unbounded;
}

thread_local! {
    static CONFIG: RefCell<StableCell<BitcoinIntegrationConfig, Memory>> =
        RefCell::new(StableCell::init(memory, BitcoinIntegrationConfig::default()));
}

impl Default for BitcoinIntegrationConfig {
    fn default() -> Self {
        Self {
            network: BitcoinNetwork::Testnet,
            ckbtc_ledger_id: Principal::from_text(CKBTC_LEDGER_TESTNET).unwrap(),
            schnorr_key_id: "dfx_test_key".to_string(),
            default_fee_rate: 2,
            min_confirmations: 6,
            enable_rbf: true,
            dust_threshold: 546,
        }
    }
}

// Getters
pub fn get_config() -> BitcoinIntegrationConfig {
    CONFIG.with(|c| c.borrow().get().clone())
}

pub fn update_config<F>(f: F) where F: FnOnce(&mut BitcoinIntegrationConfig) {
    CONFIG.with(|c| {
        let mut config = c.borrow().get().clone();
        f(&mut config);
        c.borrow_mut().set(config);
    });
}
```

---

## 📈 PARTE 3: Escalabilidad a 1M+ Runes

### 🎯 Análisis de Límites Actuales

#### Stable Memory Limits

```
ICP Stable Memory: 400 GB máximo por canister
StableBTreeMap overhead: ~50 bytes por entry

Con RuneKey (12 bytes) + RegistryEntry (~500 bytes):
- Tamaño por rune: 512 bytes
- Capacidad teórica: 400 GB / 512 bytes = ~781M runes
- Capacidad práctica (con overhead): ~500M runes

✅ CONCLUSIÓN: 1M runes es 100% factible en un solo canister
```

#### Query Performance

```rust
// Registry search actual: O(n) scan

// ❌ Buscar en 1M runes:
for (_, entry) in registry.iter() {  // O(n) = 1M iterations
    if entry.name.contains(query) {
        results.push(entry);
    }
}

// Tiempo estimado: ~5-10 segundos (INACEPTABLE)
```

### 🚀 Estrategia de Escalabilidad

#### 1. **Índices Secundarios (Solución Inmediata)**

Ya propuesto en ARCHITECTURAL_ANALYSIS_2025.md:

```rust
// Memoria 0: Storage principal (RuneKey -> RegistryEntry)
type RegistryStorage = StableBTreeMap<RuneKey, RegistryEntry, Memory>;

// Memoria 1: Índice por nombre (O(log n) lookups)
type NameIndex = StableBTreeMap<String, RuneKey, Memory>;

// Memoria 2: Índice por creator
type CreatorIndex = StableBTreeMap<Principal, Vec<RuneKey>, Memory>;

// Memoria 3: Índice por volumen (para trending)
type VolumeIndex = StableBTreeMap<u64, Vec<RuneKey>, Memory>; // inverted: high -> low
```

**Performance:**
- Búsqueda exacta por nombre: O(log n) ≈ 20 comparaciones para 1M runes
- Trending: O(k) donde k = top N (ej: top 100)
- Mis runes: O(1) lookup + O(m) donde m = runes del usuario

#### 2. **Pagination Agresiva**

```rust
// ❌ ACTUAL: Permite limit hasta infinito
fn search_runes(query: String, offset: u64, limit: u64) -> Vec<RegistryEntry>

// ✅ MEJOR: Límite estricto
const MAX_RESULTS_PER_PAGE: u64 = 100;

fn search_runes(query: String, offset: u64, limit: u64) -> SearchResult {
    let limit = limit.min(MAX_RESULTS_PER_PAGE);
    
    // ... búsqueda ...
    
    SearchResult {
        results,
        total_matches,
        offset,
        limit,
        has_more: total_matches > (offset + limit),
        next_offset: if has_more { Some(offset + limit) } else { None },
    }
}
```

#### 3. **Cursor-Based Pagination (Más Eficiente)**

```rust
// En lugar de offset numérico, usa cursor (última RuneKey vista)

#[derive(CandidType, Deserialize)]
pub struct PaginationCursor {
    pub last_seen_key: Option<RuneKey>,
    pub limit: u64,
}

fn list_runes_cursor(cursor: PaginationCursor) -> CursorResult {
    let limit = cursor.limit.min(100);
    
    let results: Vec<RegistryEntry> = REGISTRY.with(|r| {
        r.borrow()
            .range(cursor.last_seen_key..) // ✅ Resume desde última key
            .take(limit as usize)
            .map(|(_, entry)| entry)
            .collect()
    });
    
    let next_cursor = results.last().map(|r| r.metadata.key.clone());
    
    CursorResult {
        results,
        next_cursor,
        has_more: results.len() == limit as usize,
    }
}
```

**Ventajas:**
- No skip overhead (offset no salta N items)
- Consistente aunque se inserten nuevos items
- Más rápido para grandes datasets

#### 4. **Sharding Strategy (Futuro > 10M runes)**

```
┌─────────────────────────────────────────────────────┐
│              Router Canister                        │
│  ┌────────────────────────────────────────────┐    │
│  │  Determina shard: hash(rune_key) % 16      │    │
│  └────────────────────────────────────────────┘    │
└──────────────┬──────────────────────────┬───────────┘
               │                          │
       ┌───────▼────────┐         ┌──────▼──────────┐
       │  Shard 0       │   ...   │   Shard 15      │
       │  (0-999,999)   │         │   (15M-15.9M)   │
       └────────────────┘         └─────────────────┘
       
Cada shard maneja ~1M runes
Escalable a 16M runes sin degradación
```

**Implementación:**

```rust
// router-canister/src/lib.rs

const SHARD_COUNT: u64 = 16;

type ShardMap = StableBTreeMap<u8, Principal, Memory>; // shard_id -> canister_id

thread_local! {
    static SHARDS: RefCell<ShardMap> = /* ... */;
}

fn get_shard_for_key(key: &RuneKey) -> u8 {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    
    let mut hasher = DefaultHasher::new();
    key.block.hash(&mut hasher);
    key.tx.hash(&mut hasher);
    
    (hasher.finish() % SHARD_COUNT) as u8
}

#[update]
async fn register_rune_sharded(metadata: RuneMetadata) -> Result<RuneKey, String> {
    let shard_id = get_shard_for_key(&metadata.key);
    
    let shard_canister = SHARDS.with(|s| {
        s.borrow().get(&shard_id)
            .ok_or("Shard not initialized".to_string())
    })?;
    
    // Forward to appropriate shard
    let (result,): (Result<RuneKey, String>,) = ic_cdk::call(
        shard_canister,
        "register_rune",
        (metadata,)
    ).await.map_err(|(code, msg)| format!("Shard call failed: {:?} - {}", code, msg))?;
    
    result
}

#[query]
async fn search_runes_sharded(query: String, limit: u64) -> Vec<RegistryEntry> {
    let mut all_results = Vec::new();
    
    // Query all shards in parallel
    let futures: Vec<_> = SHARDS.with(|s| {
        s.borrow()
            .iter()
            .map(|(_, canister_id)| {
                ic_cdk::call::<_, (Vec<RegistryEntry>,)>(
                    canister_id,
                    "search_runes",
                    (query.clone(), 0u64, limit)
                )
            })
            .collect()
    });
    
    // Collect results from all shards
    for future in futures {
        match future.await {
            Ok((results,)) => all_results.extend(results),
            Err(e) => ic_cdk::println!("Shard query failed: {:?}", e),
        }
    }
    
    // Merge and sort
    all_results.sort_by(|a, b| {
        b.trading_volume_24h.cmp(&a.trading_volume_24h)
    });
    
    all_results.truncate(limit as usize);
    all_results
}
```

#### 5. **Caching Layer (Para Queries Frecuentes)**

```rust
// registry/src/cache.rs (NUEVO)

use std::collections::HashMap;
use std::time::{Duration, Instant};

struct CacheEntry<T> {
    data: T,
    inserted_at: Instant,
}

pub struct QueryCache<K, V> {
    cache: HashMap<K, CacheEntry<V>>,
    ttl: Duration,
    max_size: usize,
}

impl<K: Eq + Hash, V: Clone> QueryCache<K, V> {
    pub fn new(ttl_secs: u64, max_size: usize) -> Self {
        Self {
            cache: HashMap::new(),
            ttl: Duration::from_secs(ttl_secs),
            max_size,
        }
    }
    
    pub fn get(&self, key: &K) -> Option<V> {
        self.cache.get(key).and_then(|entry| {
            if entry.inserted_at.elapsed() < self.ttl {
                Some(entry.data.clone())
            } else {
                None // Expired
            }
        })
    }
    
    pub fn insert(&mut self, key: K, value: V) {
        // Evict oldest if at capacity
        if self.cache.len() >= self.max_size {
            if let Some(oldest_key) = self.find_oldest_key() {
                self.cache.remove(&oldest_key);
            }
        }
        
        self.cache.insert(key, CacheEntry {
            data: value,
            inserted_at: Instant::now(),
        });
    }
    
    fn find_oldest_key(&self) -> Option<K> {
        self.cache
            .iter()
            .min_by_key(|(_, entry)| entry.inserted_at)
            .map(|(k, _)| k.clone())
    }
}

// Uso en registry
thread_local! {
    static TRENDING_CACHE: RefCell<QueryCache<(), Vec<RegistryEntry>>> =
        RefCell::new(QueryCache::new(30, 1)); // 30s TTL, solo 1 entry
    
    static SEARCH_CACHE: RefCell<QueryCache<String, Vec<RegistryEntry>>> =
        RefCell::new(QueryCache::new(60, 100)); // 1min TTL, 100 queries
}

#[query]
fn get_trending_cached(offset: u64, limit: u64) -> Vec<RegistryEntry> {
    // Check cache first
    if offset == 0 {
        if let Some(cached) = TRENDING_CACHE.with(|c| c.borrow().get(&())) {
            return cached.into_iter().take(limit as usize).collect();
        }
    }
    
    // Cache miss: compute and cache
    let results = get_trending_uncached(offset, limit);
    
    if offset == 0 {
        TRENDING_CACHE.with(|c| c.borrow_mut().insert((), results.clone()));
    }
    
    results
}
```

**Efecto:**
- Trending (muy consultado): cache hit 95% → latencia <1ms
- Búsquedas comunes: cache hit 60% → latencia <5ms
- Reduce carga en stable memory

### 📊 Performance Benchmarks Estimados

```
Dataset: 1,000,000 runes

┌──────────────────────────┬──────────────┬──────────────┬──────────────┐
│ Operación                │ Sin Índices  │ Con Índices  │ Con Cache    │
├──────────────────────────┼──────────────┼──────────────┼──────────────┤
│ get_rune(key)            │    5 ms      │    5 ms      │    5 ms      │
│ search_by_name(exact)    │  8,000 ms    │   15 ms      │    1 ms      │
│ get_trending(top 100)    │ 10,000 ms    │   50 ms      │    1 ms      │
│ get_my_runes()           │  9,000 ms    │   20 ms      │   20 ms      │
│ list_runes(page)         │    50 ms     │   50 ms      │   50 ms      │
└──────────────────────────┴──────────────┴──────────────┴──────────────┘

✅ Con índices + cache: TODAS las queries < 100ms
```

---

## 🔒 PARTE 4: Security Audit - Análisis Profundo

### 🎯 Metodología

Análisis basado en:
1. **OWASP Top 10 Web**
2. **ICP Security Best Practices**
3. **Bitcoin Security Patterns**
4. **Smart Contract Common Vulnerabilities**

### ✅ Controles de Seguridad Implementados

#### 1. **Threshold Cryptography (Schnorr)**

```rust
// ✅ Private keys NUNCA existen completas
// ✅ Requiere consenso de múltiples nodos
// ✅ BIP-340 compliant

pub async fn sign_message(message: Vec<u8>, derivation_path: Vec<Vec<u8>>) 
    -> Result<Vec<u8>, String> 
{
    // Firma distribuida entre nodos del subnet
    ic_cdk::call(
        Principal::management_canister(),
        "sign_with_schnorr",
        (args,)
    ).await
}
```

**Protege contra:**
- ✅ Key theft (no hay single key que robar)
- ✅ Insider attacks (1 nodo corrupto no puede firmar solo)
- ✅ Physical attacks (key shards en diferentes datacenters)

#### 2. **RBAC (Role-Based Access Control)**

```rust
// canisters/rune-engine/src/rbac.rs

pub enum Role {
    Owner,       // Full access
    Admin,       // Can manage settings
    Operator,    // Can trigger operations
    Viewer,      // Read-only
}

#[update]
fn admin_function() -> Result<(), String> {
    // ✅ Check authorization
    rbac::require_role(ic_cdk::caller(), Role::Admin)?;
    
    // ... admin logic ...
    Ok(())
}
```

**Protege contra:**
- ✅ Unauthorized access
- ✅ Privilege escalation
- ✅ Malicious canister calls

#### 3. **Session Keys con raw_rand()**

```rust
// canisters/identity-manager/src/lib.rs

async fn generate_session_key(principal: Principal) -> Result<Vec<u8>, String> {
    // ✅ Usa VRF threshold BLS (criptográficamente seguro)
    let random_bytes = ic_cdk::api::management_canister::main::raw_rand()
        .await?
        .0;

    let mut hasher = Sha256::new();
    hasher.update(&random_bytes);
    hasher.update(principal.as_slice());
    hasher.update(ic_cdk::api::time().to_le_bytes());
    
    Ok(hasher.finalize().to_vec())
}
```

**Protege contra:**
- ✅ Predictable session keys
- ✅ Replay attacks (timestamp)
- ✅ Session fixation

#### 4. **Rate Limiting**

```rust
// identity-manager: 100 requests/hour por principal

const MAX_REQUESTS_PER_HOUR: u32 = 100;
const RATE_LIMIT_WINDOW: u64 = 3_600_000_000_000; // 1h

fn check_rate_limit(principal: Principal) -> Result<(), String> {
    // ... implementación con sliding window ...
}
```

**Protege contra:**
- ✅ DoS attacks
- ✅ Spam
- ✅ Resource exhaustion

### 🔴 Vulnerabilidades Críticas Encontradas

#### CRITICAL-1: **Schnorr Key ID Hardcoded (Severity: CRITICAL)**

```rust
// ❌ schnorr.rs:6
const SCHNORR_KEY_ID: &str = "dfx_test_key";

// ⚠️ RIESGO: Si deploy a mainnet con "dfx_test_key"
// → Firmas FALLARÁN porque ese key no existe en mainnet
// → Fondos pueden quedar BLOQUEADOS en UTXOs no gastables
```

**Impacto:**
- 🚨 Sistema completamente no funcional en mainnet
- 🚨 Fondos bloqueados si ya se enviaron a direcciones
- 🚨 Requiere re-deploy completo

**Remediación:**
```rust
// ✅ SOLUCIÓN
fn get_schnorr_key_id() -> &'static str {
    #[cfg(feature = "mainnet")]
    { "key_1" }
    
    #[cfg(not(feature = "mainnet"))]
    { "dfx_test_key" }
}
```

#### CRITICAL-2: **Sin Cycle Payment para sign_with_schnorr (Severity: HIGH)**

```rust
// ❌ ACTUAL: No paga cycles
ic_cdk::call(
    Principal::management_canister(),
    "sign_with_schnorr",
    (args,)
).await

// ⚠️ RIESGO: Call puede fallar silenciosamente
// → Transacciones Bitcoin no se firmarán
// → Procesos de etching quedarán stuck
```

**Remediación:**
```rust
// ✅ SOLUCIÓN
use ic_cdk::api::call::call_with_payment128;

call_with_payment128(
    Principal::management_canister(),
    "sign_with_schnorr",
    (args,),
    26_153_846_153u128, // ~26B cycles
).await
```

#### HIGH-1: **Anonymous Principal Puede Crear Sesiones (Severity: HIGH)**

```rust
// identity-manager/src/lib.rs:69

#[update]
async fn create_session(permissions: SessionPermissions, duration: u64) 
    -> Result<UserSession, String> 
{
    let caller = ic_cdk::caller();

    // ✅ CORRECTO: Bloquea anonymous
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create sessions".to_string());
    }
    
    // ...
}
```

**Estado:** ✅ YA IMPLEMENTADO CORRECTAMENTE

#### HIGH-2: **SQL Injection Equivalent (Candid Injection)**

```rust
// ❌ VULNERABLE: Si se construye query dinámicamente

fn search_runes_unsafe(user_input: String) -> Vec<RegistryEntry> {
    // Si user_input contiene caracteres especiales de Candid...
    // Potencial injection
}

// ✅ SAFE: Candid encoding automático
fn search_runes_safe(query: String) -> Vec<RegistryEntry> {
    // ✅ Candid sanitiza automáticamente
    REGISTRY.with(|r| {
        r.borrow()
            .iter()
            .filter(|(_, entry)| entry.metadata.name.contains(&query))
            .map(|(_, entry)| entry)
            .collect()
    })
}
```

**Estado:** ✅ Actualmente seguro (usa Candid nativo)

#### MEDIUM-1: **Falta de Input Validation en RuneConfig**

```rust
// ❌ ACTUAL: No valida
pub struct RuneConfig {
    pub divisibility: u8,  // Debe ser 0-38
    pub total_supply: u64, // Debe ser > 0
    pub premine: u64,      // Debe ser <= total_supply
}

// Si un usuario envía divisibility = 255:
// → Bitcoin tx inválida
// → Fondos perdidos en fees
```

**Remediación:**
```rust
// ✅ Ya propuesta en ARCHITECTURAL_ANALYSIS_2025.md
impl RuneMetadataBuilder {
    pub fn divisibility(mut self, div: u8) -> Result<Self, ValidationError> {
        if div > 38 {
            return Err(ValidationError::DivisibilityOutOfRange(div));
        }
        self.divisibility = div;
        Ok(self)
    }
    
    pub fn build(self, creator: Principal) -> Result<RuneMetadata, ValidationError> {
        // Validar invariante: total >= premine
        if self.total_supply < self.premine {
            return Err(ValidationError::PremineExceedsSupply);
        }
        // ...
    }
}
```

#### MEDIUM-2: **Reentrancy en Updates**

```rust
// ⚠️ POTENCIAL REENTRANCY

#[update]
async fn process_etching(id: String) -> Result<(), String> {
    let process = get_process(&id)?;
    
    // ❌ PELIGRO: Async call permite reentrancy
    let result = bitcoin_integration.sign_tx(process.tx).await?;
    
    // Si otro caller invoca este método mientras await...
    // → Puede procesar mismo etching 2 veces
    update_process_state(process.id, EtchingState::Signed);
}
```

**Remediación:**
```rust
// ✅ SOLUCIÓN: Idempotency Lock

thread_local! {
    static PROCESSING_LOCKS: RefCell<HashSet<String>> = RefCell::new(HashSet::new());
}

#[update]
async fn process_etching(id: String) -> Result<(), String> {
    // Acquire lock
    let acquired = PROCESSING_LOCKS.with(|locks| {
        locks.borrow_mut().insert(id.clone())
    });
    
    if !acquired {
        return Err("Process already being handled".to_string());
    }
    
    // Process...
    let result = bitcoin_integration.sign_tx(...).await;
    
    // Release lock
    PROCESSING_LOCKS.with(|locks| {
        locks.borrow_mut().remove(&id);
    });
    
    result
}
```

#### LOW-1: **Información Sensible en Logs**

```rust
// ⚠️ POTENCIAL INFO LEAK

ic_cdk::println!("User {} created session with key {:?}", principal, session_key);
//                                                        ^^^^^^^^^^^^
//                                                        Sensitive!
```

**Remediación:**
```rust
// ✅ SOLUCIÓN: Log solo hash
let key_hash = sha256(&session_key);
ic_cdk::println!("User {} created session (hash: {})", 
    principal, 
    hex::encode(&key_hash[..8]) // Solo primeros 8 bytes
);
```

### 🛡️ Security Checklist Completo

```markdown
## Authentication & Authorization
- [x] Anonymous principal bloqueado
- [x] RBAC implementado
- [x] Session keys con raw_rand()
- [ ] Multi-sig para operaciones críticas
- [ ] Emergency pause mechanism

## Cryptography
- [x] Threshold Schnorr signatures
- [x] BIP-340/BIP-341 compliant
- [x] Secure random generation
- [ ] **FIX**: Schnorr key ID configurable
- [ ] **FIX**: Cycle payment para signatures

## Input Validation
- [ ] **FIX**: RuneConfig validation (divisibility, supply)
- [x] Candid type safety
- [ ] Name validation (1-26 uppercase chars)
- [ ] Amount validation (no overflow)

## Rate Limiting & DoS
- [x] 100 req/hour en identity-manager
- [ ] Rate limiting en registry
- [ ] Rate limiting en rune-engine
- [ ] Max active processes per user (10)
- [ ] Cleanup de procesos viejos

## Reentrancy & Race Conditions
- [x] Idempotency keys en etching
- [ ] **FIX**: Processing locks para async updates
- [ ] Optimistic concurrency control

## Data Integrity
- [x] StableBTreeMap para persistencia
- [x] Pre-upgrade hooks
- [x] Post-upgrade validación
- [ ] Checksum de state critical
- [ ] Backup/recovery strategy

## Logging & Monitoring
- [x] Error logging
- [x] Metrics collection
- [ ] **FIX**: No loggear secrets
- [ ] Audit trail para operaciones críticas
- [ ] Alerting para anomalías

## Bitcoin-Specific
- [x] P2TR address derivation
- [x] UTXO selection
- [ ] **FIX**: RBF enabled
- [ ] **FIX**: Dust threshold check
- [ ] Transaction replay protection
- [ ] Fee bumping mechanism

## Dependency Security
- [x] Pinned versions en Cargo.toml
- [ ] Regular dependency audits
- [ ] CVE monitoring
```

### 🎯 Plan de Remediación Priorizado

#### Fase 1: CRITICAL (Deploy Blockers) - 1 día
1. ✅ Arreglar Schnorr key ID (configurable)
2. ✅ Agregar cycle payment a sign_with_schnorr
3. ✅ Testing exhaustivo de signatures

#### Fase 2: HIGH (Security Issues) - 2 días
4. ✅ Implementar input validation completa
5. ✅ Processing locks para reentrancy
6. ✅ RBF habilitado en transactions
7. ✅ Dust threshold checks

#### Fase 3: MEDIUM (Robustez) - 2 días
8. ✅ Rate limiting en todos los canisters
9. ✅ Emergency pause mechanism
10. ✅ Audit logging
11. ✅ Sanitizar logs (no secrets)

#### Fase 4: LOW (Mejores Prácticas) - 1 día
12. ✅ Multi-sig para admin ops
13. ✅ Dependency audit
14. ✅ Penetration testing

---

## 📊 Resumen Ejecutivo

### Frontend
- ✅ **Fortalezas:** Excellent state management, optimistic updates, polling
- ❌ **Debilidades:** Fragmentación de estado, sin normalización
- 🎯 **Mejoras:** Normalized store, service worker, prefetching

### Bitcoin Integration
- ✅ **Fortalezas:** Threshold cryptography, ckBTC integration, P2TR
- ❌ **Debilidades:** Hardcoded key ID, no cycle payment, UTXO selection básico
- 🎯 **Mejoras:** Config system, Branch and Bound, RBF

### Escalabilidad
- ✅ **Capacidad:** 500M runes en single canister (1M es trivial)
- ❌ **Performance:** O(n) searches sin índices
- 🎯 **Mejoras:** Índices secundarios, cursor pagination, sharding strategy

### Security
- ✅ **Implementado:** Threshold crypto, RBAC, session keys, rate limiting
- 🔴 **CRITICAL:** Schnorr key ID, cycle payment
- 🎯 **Mejoras:** Input validation, reentrancy locks, audit logging

---

**PRÓXIMA ACCIÓN RECOMENDADA:**

Implementar **Fase 1 del Plan de Remediación** (1 día) seguido de **Fase 1 del Plan de Implementación** original (Registry fix).

En paralelo:
- Implementar normalized store (frontend)
- Agregar índices secundarios (registry)
- Testing comprehensivo

Tiempo total estimado para sistema production-ready: **10-14 días**.

¿Procedemos con la implementación? 🚀
