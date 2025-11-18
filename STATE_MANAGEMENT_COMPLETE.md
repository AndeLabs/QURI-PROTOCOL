# ✅ State Management Implementation - QURI Protocol

**Fecha**: November 16, 2025
**Status**: **COMPLETADO** 🎉

---

## 📊 Resumen

Hemos implementado un **sistema completo de state management** usando **Zustand + React Query + Sonner**, proporcionando:

- ✅ **Caché inteligente** con React Query
- ✅ **Estado local** con Zustand
- ✅ **Polling automático** para procesos activos
- ✅ **Toast notifications** con feedback visual
- ✅ **Optimistic updates** para mejor UX
- ✅ **Infinite scroll** support
- ✅ **Real-time monitoring** de procesos

---

## 🏗️ Arquitectura

### Stack Implementado

```
┌─────────────────────────────────────────────┐
│         React Components (UI)               │
├─────────────────────────────────────────────┤
│  React Query Hooks    │   Zustand Stores   │
│  (Server State)       │   (Client State)   │
├───────────────────────┴────────────────────┤
│          Canister Hooks                     │
│  (useRuneEngine, useRegistry, etc.)         │
├─────────────────────────────────────────────┤
│          Actor Factories                    │
│  (Canister Communication)                   │
├─────────────────────────────────────────────┤
│          ICP Canisters                      │
│  (Blockchain Backend)                       │
└─────────────────────────────────────────────┘
```

### Dependencias Instaladas

```bash
✅ zustand@^4.5.0              # Estado local
✅ @tanstack/react-query@^5.x  # Server state + caching
✅ sonner@^1.x                 # Toast notifications
```

---

## 📁 Estructura de Archivos

```
frontend/
├── lib/
│   ├── store/
│   │   ├── useRuneStore.ts          # ✅ Estado de Runes
│   │   └── useEtchingStore.ts       # ✅ Estado de procesos
│   └── toast.ts                     # ✅ Toast helpers
├── hooks/
│   └── queries/
│       ├── useRuneQueries.ts        # ✅ Query hooks para Runes
│       ├── useEtchingQueries.ts     # ✅ Query hooks para Etching
│       └── index.ts                 # ✅ Exports centralizados
└── app/
    └── providers.tsx                # ✅ Configurado con RQ + Toaster
```

---

## 🎯 Zustand Stores

### 1. `useRuneStore` - Gestión de Runes

**Estado**:
```typescript
{
  runes: Map<string, RegistryEntry>,    // Caché de Runes
  searchQuery: string,                   // Query de búsqueda
  selectedRune: RegistryEntry | null,   // Rune seleccionado
  viewMode: 'grid' | 'list',            // Modo de vista
  sortBy: 'created' | 'volume' | 'trending'  // Ordenamiento
}
```

**Métodos disponibles**:
```typescript
// Gestión de Runes
✅ addRune(rune)
✅ addRunes(runes[])
✅ updateRune(id, rune)
✅ getRune(id)
✅ removeRune(id)
✅ clearRunes()

// UI State
✅ setSearchQuery(query)
✅ setSelectedRune(rune)
✅ setViewMode(mode)
✅ setSortBy(sort)

// Computed
✅ getRunesBySearch()  // Filtrados y ordenados
✅ getTotalRunes()
```

**Características**:
- ✅ **Persistencia**: Se guarda en localStorage
- ✅ **Map para O(1) lookups**
- ✅ **Serialización custom** para Map
- ✅ **Búsqueda y filtrado** integrados
- ✅ **Ordenamiento** múltiple

**Ejemplo de uso**:
```typescript
import { useRuneStore } from '@/lib/store/useRuneStore';

function RuneList() {
  const {
    getRunesBySearch,
    setSearchQuery,
    sortBy,
    setSortBy
  } = useRuneStore();

  const runes = getRunesBySearch(); // Auto-filtered & sorted

  return (
    <div>
      <input onChange={(e) => setSearchQuery(e.target.value)} />
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
        <option value="created">Recent</option>
        <option value="volume">Volume</option>
        <option value="trending">Trending</option>
      </select>
      {runes.map(rune => <RuneCard key={rune.rune_id} rune={rune} />)}
    </div>
  );
}
```

---

### 2. `useEtchingStore` - Gestión de Procesos

**Estado**:
```typescript
{
  processes: Map<string, EtchingProcessView>,  // Procesos activos
  activeProcessId: string | null,              // Proceso en foco
  showOnlyActive: boolean,                     // Filtro de vista
}
```

**Métodos disponibles**:
```typescript
// Gestión de procesos
✅ addProcess(process)
✅ addProcesses(processes[])
✅ updateProcess(id, process)
✅ getProcess(id)
✅ removeProcess(id)
✅ clearProcesses()

// UI
✅ setActiveProcessId(id)
✅ setShowOnlyActive(show)

// Computed
✅ shouldPoll(id)           // ¿Debe hacer polling?
✅ getActiveProcesses()     // Solo activos
✅ getCompletedProcesses()  // Solo completados
✅ getFailedProcesses()     // Solo fallidos
✅ getTotalProcesses()
```

**Estados de Proceso**:
```typescript
// Activos (se hace polling)
'Pending', 'SelectingUtxos', 'BuildingTransaction',
'SigningTransaction', 'Broadcasting', 'AwaitingConfirmation'

// Finales (no polling)
'Completed', 'Failed', 'Cancelled'
```

**Ejemplo de uso**:
```typescript
import { useEtchingStore } from '@/lib/store/useEtchingStore';

function ProcessMonitor() {
  const {
    getActiveProcesses,
    getCompletedProcesses,
    shouldPoll
  } = useEtchingStore();

  const active = getActiveProcesses();
  const completed = getCompletedProcesses();

  return (
    <div>
      <h3>Active Processes ({active.length})</h3>
      {active.map(p => (
        <ProcessCard
          key={p.id}
          process={p}
          polling={shouldPoll(p.id)}
        />
      ))}

      <h3>Completed ({completed.length})</h3>
      {completed.map(p => <ProcessCard key={p.id} process={p} />)}
    </div>
  );
}
```

---

## 🔄 React Query Hooks

### Rune Registry Queries

#### `useRuneQuery(runeId)` - Get single Rune
```typescript
const { data: rune, isLoading, error } = useRuneQuery({
  block: 840000n,
  tx: 1n,
  name: 'BITCOIN',
  timestamp: 1234567890n
});
```

#### `useRunesQuery(offset, limit)` - List with pagination
```typescript
const { data: runes, isLoading } = useRunesQuery(0n, 20n);
```

#### `useInfiniteRunesQuery(limit)` - Infinite scroll
```typescript
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteRunesQuery(20n);

// En el scroll handler
if (hasNextPage && !isFetchingNextPage) {
  fetchNextPage();
}
```

#### `useSearchRunesQuery(query)` - Search
```typescript
const [search, setSearch] = useState('');
const { data: results } = useSearchRunesQuery(search);
// Auto-disabled cuando query.length === 0
```

#### `useTrendingRunesQuery(limit)` - Trending Runes
```typescript
const { data: trending } = useTrendingRunesQuery(10n);
```

#### `useRegistryStatsQuery()` - Global stats
```typescript
const { data: stats } = useRegistryStatsQuery();
// Auto-refetch every 1 minute
// stats: { total_runes, total_volume_24h }
```

### Mutations

#### `useRegisterRuneMutation()` - Register Rune
```typescript
const registerMutation = useRegisterRuneMutation();

const handleRegister = async () => {
  await registerMutation.mutateAsync(metadata);
  // Auto-invalidates queries
  // Shows toast notifications
};
```

#### `useUpdateVolumeMutation()` - Update volume
```typescript
const updateVolume = useUpdateVolumeMutation();

await updateVolume.mutateAsync({
  runeId,
  volume: 1000000n
});
```

---

### Etching Process Queries

#### `useEtchingStatusQuery(processId)` - Get status with polling
```typescript
const { data: status } = useEtchingStatusQuery(processId);
// ✅ Auto-polls every 5 seconds si está activo
// ✅ Stops polling cuando completa
// ✅ Updates Zustand store automáticamente
```

#### `useEtchingProcessesQuery(offset, limit)` - List processes
```typescript
const { data: processes } = useEtchingProcessesQuery(0n, 20n);
```

#### `useEtchRuneMutation()` - Create Rune
```typescript
const etchMutation = useEtchRuneMutation();

const handleEtch = async () => {
  const { processId } = await etchMutation.mutateAsync({
    rune_name: 'BITCOIN•RUNES',
    symbol: 'RUNE',
    divisibility: 8,
    premine: 1000000n,
    terms: [],
  });

  // ✅ Toast automático
  // ✅ Inicia polling automáticamente
  // ✅ Invalida queries relacionadas
};
```

#### `useRetryEtchingMutation()` - Retry failed
```typescript
const retryMutation = useRetryEtchingMutation();

await retryMutation.mutateAsync(processId);
// ✅ Re-starts polling
// ✅ Shows toast feedback
```

#### `useActiveProcessesMonitor()` - Monitor all active
```typescript
const {
  activeProcesses,
  queries,
  totalActive,
  isAnyLoading,
  hasErrors,
} = useActiveProcessesMonitor();

// Monitora TODOS los procesos activos simultáneamente
// Cada uno con su propio polling
```

---

### Health & Monitoring Queries

#### `useHealthQuery()` - System health
```typescript
const { data: health } = useHealthQuery();
// Auto-refetch every 1 minute
```

#### `useMetricsSummaryQuery()` - Metrics
```typescript
const { data: metrics } = useMetricsSummaryQuery();
// Auto-refetch every 30 seconds
```

---

## 🔔 Toast Notifications

### Basic Toasts

```typescript
import { toast } from '@/lib/toast';

// Success
toast.success('Rune created!');

// Error
toast.error('Failed to create Rune', {
  description: 'Insufficient balance'
});

// Loading
const toastId = toast.loading('Creating Rune...');
// Later...
toast.success('Rune created!', { id: toastId });

// Promise-based
toast.promise(
  createRune(),
  {
    loading: 'Creating Rune...',
    success: 'Rune created!',
    error: 'Failed to create Rune',
  }
);
```

### Transaction Toasts

```typescript
import { txToast } from '@/lib/toast';

// Submitted
txToast.submitted(txId);

// Confirming
txToast.confirming(2, 6); // 2/6 confirmations

// Confirmed
txToast.confirmed(txId);

// Failed
txToast.failed('Insufficient funds');
```

### Rune-Specific Toasts

```typescript
import { runeToast } from '@/lib/toast';

// Etching started
runeToast.etchingStarted('BITCOIN', processId);

// Etching completed
runeToast.etchingCompleted('BITCOIN', txId);

// Etching failed
runeToast.etchingFailed('BITCOIN', error);

// Registered
runeToast.registered('BITCOIN');
```

### Session Toasts

```typescript
import { sessionToast } from '@/lib/toast';

// Created
sessionToast.created(60); // 60 minutes

// Expired
sessionToast.expired();

// Permission denied
sessionToast.permissionDenied('create runes');
```

### Bitcoin Toasts

```typescript
import { btcToast } from '@/lib/toast';

// Address generated
btcToast.addressGenerated(address);

// UTXO selected
btcToast.utxoSelected(3, 100000n); // 3 UTXOs, 0.001 BTC

// Fee estimate
btcToast.feeEstimate(10n, 15n, 25n); // sat/vB
```

### Helpers

```typescript
import { copyToClipboard, errorToast, successWithAction } from '@/lib/toast';

// Copy to clipboard
copyToClipboard(txId, 'Transaction ID');

// Generic error
errorToast(error, 'Failed to fetch data');

// Success with action
successWithAction(
  'Rune created!',
  'View',
  () => router.push(`/rune/${runeId}`)
);
```

---

## 🎨 Ejemplos Completos

### Ejemplo 1: Create Rune con State Management

```typescript
'use client';

import { useState } from 'react';
import { useEtchRuneMutation } from '@/hooks/queries';
import { useEtchingStore } from '@/lib/store/useEtchingStore';
import { runeToast } from '@/lib/toast';

export function CreateRuneForm() {
  const [name, setName] = useState('');
  const etchMutation = useEtchRuneMutation();
  const { activeProcessId } = useEtchingStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { processId } = await etchMutation.mutateAsync({
        rune_name: name,
        symbol: 'RUNE',
        divisibility: 8,
        premine: 1000000n,
        terms: [],
      });

      // ✅ Toast automático
      // ✅ Polling automático iniciado
      // ✅ Queries invalidadas

    } catch (error) {
      // ✅ Toast de error automático
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Rune Name"
      />
      <button type="submit" disabled={etchMutation.isPending}>
        {etchMutation.isPending ? 'Creating...' : 'Create Rune'}
      </button>

      {activeProcessId && (
        <ProcessMonitor processId={activeProcessId} />
      )}
    </form>
  );
}
```

### Ejemplo 2: Rune Explorer con Infinite Scroll

```typescript
'use client';

import { useInfiniteRunesQuery } from '@/hooks/queries';
import { useRuneStore } from '@/lib/store/useRuneStore';
import { useEffect, useRef } from 'react';

export function RuneExplorer() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteRunesQuery(20n);

  const { searchQuery, setSearchQuery, sortBy, setSortBy } = useRuneStore();
  const observerTarget = useRef(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allRunes = data?.pages.flat() ?? [];

  return (
    <div>
      <div className="filters">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search runes..."
        />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="created">Recent</option>
          <option value="volume">Volume</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      <div className="grid">
        {allRunes.map((rune) => (
          <RuneCard key={`${rune.rune_id.block}-${rune.rune_id.tx}`} rune={rune} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div ref={observerTarget} className="h-10" />

      {isFetchingNextPage && <LoadingSpinner />}
    </div>
  );
}
```

### Ejemplo 3: Process Monitor con Polling

```typescript
'use client';

import { useEtchingStatusQuery, useRetryEtchingMutation } from '@/hooks/queries';
import { runeToast } from '@/lib/toast';
import { useEffect } from 'react';

export function ProcessMonitor({ processId }: { processId: string }) {
  const { data: status, isLoading } = useEtchingStatusQuery(processId);
  // ✅ Auto-polling every 5 seconds

  const retryMutation = useRetryEtchingMutation();

  // Show completion toast
  useEffect(() => {
    if (status?.state === 'Completed' && status.txid[0]) {
      runeToast.etchingCompleted(status.rune_name, status.txid[0]);
    }
  }, [status]);

  if (isLoading) return <div>Loading...</div>;
  if (!status) return <div>Process not found</div>;

  const progress = getProgress(status.state);

  return (
    <div className="process-monitor">
      <h3>{status.rune_name}</h3>
      <div className="progress-bar">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>
      <p>Status: {status.state}</p>
      <p>Created: {new Date(Number(status.created_at) / 1000000).toLocaleString()}</p>
      {status.retry_count > 0 && <p>Retries: {status.retry_count}</p>}

      {status.state === 'Failed' && (
        <button
          onClick={() => retryMutation.mutate(processId)}
          disabled={retryMutation.isPending}
        >
          Retry
        </button>
      )}

      {status.txid[0] && (
        <a href={`https://mempool.space/testnet/tx/${status.txid[0]}`} target="_blank">
          View Transaction
        </a>
      )}
    </div>
  );
}

function getProgress(state: string): number {
  const states = {
    Pending: 10,
    SelectingUtxos: 25,
    BuildingTransaction: 50,
    SigningTransaction: 70,
    Broadcasting: 85,
    AwaitingConfirmation: 95,
    Completed: 100,
    Failed: 0,
  };
  return states[state as keyof typeof states] || 0;
}
```

### Ejemplo 4: Dashboard con Real-time Stats

```typescript
'use client';

import {
  useRegistryStatsQuery,
  useMetricsSummaryQuery,
  useHealthQuery,
} from '@/hooks/queries';
import { useActiveProcessesMonitor } from '@/hooks/queries';

export function Dashboard() {
  const { data: registryStats } = useRegistryStatsQuery();
  const { data: metrics } = useMetricsSummaryQuery();
  const { data: health } = useHealthQuery();
  const { activeProcesses, totalActive } = useActiveProcessesMonitor();

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <StatCard
          title="Total Runes"
          value={registryStats?.total_runes.toString() || '0'}
          trend="+12%"
        />
        <StatCard
          title="24h Volume"
          value={`${Number(registryStats?.total_volume_24h || 0n) / 1e8} BTC`}
          trend="+5%"
        />
        <StatCard
          title="Success Rate"
          value={`${metrics?.success_rate_percent || 0}%`}
          trend="+2%"
        />
        <StatCard
          title="Active Processes"
          value={totalActive.toString()}
          isLive
        />
      </div>

      <div className="health-status">
        <div className={health?.healthy ? 'status-ok' : 'status-error'}>
          {health?.healthy ? '✅ System Healthy' : '❌ System Issues'}
        </div>
      </div>

      <div className="active-processes">
        <h3>Active Etchings ({totalActive})</h3>
        {activeProcesses.map((process) => (
          <ProcessCard key={process.id} process={process} />
        ))}
      </div>
    </div>
  );
}
```

---

## ⚙️ Configuración de React Query

### Query Defaults (ya configurado en `providers.tsx`)

```typescript
{
  queries: {
    staleTime: 60 * 1000,         // 1 minute
    gcTime: 5 * 60 * 1000,        // 5 minutes
    refetchOnWindowFocus: false,   // No refetch on focus
    refetchOnReconnect: true,      // Refetch on reconnect
    retry: 3,                      // 3 retries
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  },
  mutations: {
    retry: 2,
    retryDelay: 1000,
  },
}
```

### DevTools

En desarrollo, React Query DevTools está disponible en la esquina inferior derecha:
- Ver queries activas
- Ver cache
- Invalidar queries manualmente
- Ver tiempos de refetch

---

## 📊 Cache Management

### Invalidación Manual

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { runeKeys, etchingKeys } from '@/hooks/queries';

const queryClient = useQueryClient();

// Invalidar todas las queries de runes
queryClient.invalidateQueries({ queryKey: runeKeys.all });

// Invalidar un rune específico
queryClient.invalidateQueries({ queryKey: runeKeys.detail(runeId) });

// Invalidar listas de procesos
queryClient.invalidateQueries({ queryKey: etchingKeys.lists() });
```

### Prefetching

```typescript
// Prefetch next page
await queryClient.prefetchQuery({
  queryKey: runeKeys.list(nextOffset, limit),
  queryFn: () => listRunes(nextOffset, limit),
});

// Prefetch on hover
<RuneCard
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: runeKeys.detail(rune.rune_id),
      queryFn: () => getRune(rune.rune_id),
    });
  }}
/>
```

---

## ✅ Checklist de Implementación

- [x] Zustand stores creados (Runes + Etching)
- [x] React Query configurado
- [x] Query hooks para Runes (6 queries + 3 mutations)
- [x] Query hooks para Etching (5 queries + 3 mutations)
- [x] Polling automático implementado
- [x] Toast notifications configuradas
- [x] Toast helpers creados (tx, rune, session, btc)
- [x] Infinite scroll support
- [x] Optimistic updates
- [x] Cache management utilities
- [x] DevTools configuradas
- [x] Documentación completa

---

## 🎯 Beneficios Implementados

✅ **Performance**
- Caché inteligente reduce llamadas al backend
- Polling solo cuando necesario
- Invalidación selectiva

✅ **UX**
- Feedback inmediato con optimistic updates
- Toast notifications informativas
- Loading states consistentes

✅ **Developer Experience**
- Hooks simples y composables
- Type-safe en todo momento
- DevTools para debugging

✅ **Escalabilidad**
- Fácil agregar nuevos queries
- Patrón consistente
- Separación de concerns

---

## 🚀 Próximos Pasos

### Fase 3: UI Components (Siguiente)

1. ✅ Actualizar componentes existentes para usar queries
2. ✅ Eliminar datos hardcoded
3. ✅ Implementar loading skeletons
4. ✅ Error boundaries mejorados
5. ✅ Dark mode support

### Ejemplo de migración:

**Antes**:
```typescript
const [runes, setRunes] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchRunes().then(setRunes).finally(() => setLoading(false));
}, []);
```

**Después**:
```typescript
const { data: runes, isLoading } = useRunesQuery(0n, 20n);
// ✅ Auto-caching
// ✅ Auto-refetching
// ✅ Error handling
```

---

**🎉 State Management Completo y Listo para Usar!**

**Fecha**: November 16, 2025
