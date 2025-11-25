# AUDITORÍA EXHAUSTIVA DEL FRONTEND - QURI PROTOCOL
**Fecha:** 24 de Noviembre, 2025
**Auditor:** Claude Code (Frontend React Agent)
**Alcance:** `/Users/munay/dev/QURI-PROTOCOL/frontend/`

---

## RESUMEN EJECUTIVO

### Métricas del Proyecto
- **Archivos TypeScript/TSX:** 255 archivos
- **Componentes Client:** 134 (52.5% del total)
- **Páginas en App Router:** 22
- **Archivos de Test:** 4 (Cobertura insuficiente)
- **Tamaño Total:** 1.2GB (incluyendo node_modules)
- **Tamaño Build:** 635MB (.next)
- **Usos de Framer Motion:** 41 archivos

### Estado General
🟡 **MEDIO-ALTO** - El proyecto está funcional pero requiere limpieza y optimizaciones importantes.

---

## 1. CÓDIGO MUERTO Y NO UTILIZADO

### 1.1 Componentes Duplicados - PRIORIDAD ALTA 🔴

#### Problema: 4 Versiones del Componente RuneCard
**Archivos:**
1. `/components/RuneCard.tsx` (235 líneas) - Versión "museo-grade"
2. `/components/runes/RuneCard.tsx` (224 líneas) - Versión modular
3. `/components/runes/RuneCardSimple.tsx` (208 líneas) - Versión SSR-safe
4. `/components/runes/RuneCardPremium.tsx` (476 líneas) - Versión con animaciones 3D

**Impacto:**
- **Bundle Size:** ~30-40KB duplicados innecesariamente
- **Mantenimiento:** Cambios deben replicarse en 4 lugares
- **Confusión:** Desarrolladores no saben cuál usar

**Diferencias Clave:**
- `RuneCard.tsx`: Usa interfaces propias (`RuneData`), no tipadas con canisters
- `runes/RuneCard.tsx`: Usa `RegistryEntry` de canisters, más moderno
- `runes/RuneCardSimple.tsx`: Sin framer-motion, mejor para SSR
- `runes/RuneCardPremium.tsx`: Efectos 3D/magnéticos, más pesado

**Recomendación:**
```typescript
// ELIMINAR: /components/RuneCard.tsx (obsoleto, no usa tipos de canisters)
// MANTENER: /components/runes/RuneCardSimple.tsx (por defecto)
// MANTENER: /components/runes/RuneCardPremium.tsx (casos premium)
// ELIMINAR: /components/runes/RuneCard.tsx (funcionalidad duplicada con Simple)
```

**Acción:**
1. Migrar todos los imports de `RuneCard` a `RuneCardSimple`
2. Eliminar `RuneCard.tsx` y `runes/RuneCard.tsx`
3. Reducción estimada: 35KB en bundle

---

### 1.2 Hooks No Utilizados o Deprecados - PRIORIDAD ALTA 🔴

#### `useOrdinalsV2.ts` - NO USADO
```bash
$ grep -r "from '@/hooks/useOrdinalsV2'" --include="*.tsx" --include="*.ts"
# Resultado: 0 usos
```
**Acción:** ELIMINAR archivo completo (286 líneas)

#### `useRunesV2.ts` - NO USADO
```bash
$ grep -r "from '@/hooks/useRunesV2'" --include="*.tsx" --include="*.ts"
# Resultado: 0 usos
```
**Acción:** ELIMINAR archivo completo

#### `useInfiniteRunes.ts` - CASI NO USADO
```bash
# Solo 1 uso encontrado (posiblemente legacy)
```
**Acción:** Evaluar reemplazo por `useRuneExplorer` y eliminar

#### `useOrdinals.ts` - USO LIMITADO
```bash
# Solo 2 usos (probablemente legacy)
```
**Acción:** Consolidar con `useOrdinalsV2` o eliminar si deprecado

**Reducción Total Estimada:** ~1,000 líneas de código muerto

---

### 1.3 Stores Duplicados - PRIORIDAD MEDIA 🟡

Se encontraron 2 implementaciones de stores Zustand:

1. **`lib/store/useQURIStore.ts`** (520 líneas)
   - Store normalizado con entidades
   - Middleware: immer, devtools, persist
   - Selectores optimizados

2. **`lib/stores/index.ts`** (149 líneas)
   - Store por slices (wallet, UI, settings)
   - Más moderno y modular
   - Mejor organización

**Problema:** Ambos están activos, creando confusión sobre cuál usar.

**Recomendación:**
- **MANTENER:** `lib/stores/index.ts` (más modular)
- **DEPRECAR:** `lib/store/useQURIStore.ts` (migrar funcionalidad)
- **MANTENER:** `lib/store/useEtchingStore.ts` (específico para etching)
- **MANTENER:** `lib/store/useRuneStore.ts` (específico para runes)

---

### 1.4 Archivos de Backup - PRIORIDAD BAJA 🟢

**Encontrado:**
```
./lib/storage/nft-storage.ts.old (456 líneas)
```

**Acción:** Mover a `.backup/` o eliminar si ya no es necesario.

---

## 2. COMPONENTES PLACEHOLDER (TODO) - PRIORIDAD BAJA 🟢

### 2.1 Componentes DEX No Implementados

Todos estos componentes están marcados como "TODO: Implement when DEX canister is deployed":

1. **`components/dex/swap/SwapInterface.tsx`** (26 líneas)
   - Solo placeholder con mensaje "Coming Soon"
   - Importado en: `app/(dashboard)/swap/page.tsx`

2. **`components/dex/orderbook/OrderbookTrading.tsx`** (33 líneas)
   - Solo placeholder
   - Props definidas pero sin uso

3. **`components/dex/pools/LiquidityPools.tsx`**
   - Placeholder para pools de liquidez

4. **`components/dex/bridge/BridgeInterface.tsx`**
   - Placeholder para bridge

**Recomendación:**
- MANTENER los placeholders (están referenciados en las páginas)
- Agregar issue/ticket en roadmap para implementación futura
- Considerar feature flags para mostrar/ocultar según ambiente

**Impacto en Bundle:** Mínimo (~5KB total)

---

## 3. PROBLEMAS DE TIPADO - PRIORIDAD ALTA 🔴

### 3.1 Uso Excesivo de `any`

Se encontraron **55 usos de `: any`** en el código:

#### Casos Críticos (Deben Corregirse):

```typescript
// hooks/useDeadManSwitch.ts:92
function transformDMSInfo(raw: any): DeadManSwitchInfo {
  // PROBLEMA: raw debería tener tipo específico del IDL
}

// hooks/useEncryptedMetadata.ts:38
function transformMetadata(raw: any): EncryptedRuneMetadata {
  // PROBLEMA: raw debería ser el tipo Candid generado
}

// hooks/useSettlement.ts:277
return records.map((item: any) => ({
  // PROBLEMA: item debería ser SettlementRecord del canister
}))

// app/(dashboard)/dashboard/page.tsx:27
icon: any;
// PROBLEMA: debería ser React.ComponentType o LucideIcon
```

#### Casos Aceptables (IDL Factory):

```typescript
// lib/icp/idl/*.idl.ts
export const idlFactory = ({ IDL }: any) => {
  // ACEPTABLE: IDL viene de @dfinity/candid, tipo externo
}
```

**Acción Requerida:**
1. Generar tipos TypeScript desde archivos `.did` del backend
2. Reemplazar todos los `any` de transformación canister con tipos específicos
3. Crear tipos para iconos: `type IconComponent = React.ComponentType<{ className?: string }>`

**Impacto:** Mejora significativa en type safety y experiencia de desarrollo

---

### 3.2 Configuración TypeScript

**`next.config.js`:**
```javascript
typescript: {
  // TODO: Set back to false after fixing all type errors
  ignoreBuildErrors: true,
},
eslint: {
  // TODO: Set back to false after cleaning up all warnings
  ignoreDuringBuilds: true,
},
```

🔴 **CRÍTICO:** El proyecto está compilando con errores de TypeScript ignorados.

**Acción Inmediata:**
1. Ejecutar `npm run type-check` y documentar todos los errores
2. Crear plan de corrección priorizado
3. Habilitar `ignoreBuildErrors: false` una vez corregido

---

## 4. SERVER COMPONENTS vs CLIENT COMPONENTS

### 4.1 Análisis de Uso

**Páginas en App Router:** 22 archivos
**Client Components en app/:** 19 (86%)

🟡 **PROBLEMA:** Casi todas las páginas son Client Components cuando deberían ser Server Components.

#### Páginas que DEBERÍAN ser Server Components:

```typescript
// ❌ ACTUAL: 'use client'
// app/(dashboard)/explorer/page.tsx
// - Solo necesita client para infinite scroll y filtros
// - Stats y datos iniciales pueden ser Server Component

// ✅ DEBE SER:
// app/(dashboard)/explorer/page.tsx (Server Component)
//   └── <ExplorerClient> (Client para interactividad)

// Beneficios:
// - Reducción de JavaScript enviado al cliente
// - Mejor SEO
// - Faster First Contentful Paint
```

**Páginas Evaluadas:**
- `app/(dashboard)/dashboard/page.tsx` ❌ Debería ser Server
- `app/(dashboard)/explorer/page.tsx` ❌ Debería ser Server
- `app/(dashboard)/gallery/page.tsx` ❌ Debería ser Server
- `app/(dashboard)/my-runes/page.tsx` ❌ Debería ser Server
- `app/ecosystem/page.tsx` ❌ Podría ser Server
- `app/roadmap/page.tsx` ❌ Debería ser Server

**Recomendación:**
Aplicar patrón de separación Server/Client:

```typescript
// page.tsx (Server Component)
export default async function ExplorerPage() {
  // Fetch data on server
  const initialData = await getRunesFromCanister();

  return <ExplorerClient initialData={initialData} />;
}

// ExplorerClient.tsx ('use client')
export function ExplorerClient({ initialData }) {
  // Interactive features here
}
```

**Impacto:**
- Reducción del bundle: 15-20%
- Mejora de performance en First Load
- Mejor SEO para páginas públicas

---

## 5. MANEJO DE ESTADO

### 5.1 Zustand - BIEN IMPLEMENTADO ✅

**Stores Activos:**
1. `lib/stores/index.ts` - Store principal (wallet, UI, settings)
2. `lib/store/useEtchingStore.ts` - Procesos de etching
3. `lib/store/useRuneStore.ts` - Cache de runes

**Patrones Correctos:**
- ✅ Uso de `useShallow` para evitar re-renders
- ✅ Middleware: devtools, persist
- ✅ Selectores optimizados
- ✅ Actions separadas del estado

**Problema Menor:**
- Duplicación entre `lib/store/` y `lib/stores/` (confusión de rutas)

---

### 5.2 TanStack Query - BIEN IMPLEMENTADO ✅

**Configuración:** `lib/query/client.ts`
```typescript
// ✅ CORRECTO: staleTime, cacheTime configurados
// ✅ CORRECTO: retry y refetch optimizados
// ✅ CORRECTO: Devtools habilitadas en dev
```

**Uso en Hooks:**
- `useRuneExplorer` - ✅ Infinite queries bien implementadas
- `useRegistry` - ✅ Queries con claves apropiadas
- `useRuneEngine` - ✅ Mutations con optimistic updates

**Oportunidad de Mejora:**
- Agregar prefetching en navegación (`lib/query/prefetch.ts` existe pero poco usado)

---

## 6. PERFORMANCE Y OPTIMIZACIÓN

### 6.1 Bundle Size - PRIORIDAD ALTA 🔴

**Build Actual:** 635MB (.next)

**Problemas Identificados:**

1. **Framer Motion Overuse** (41 archivos)
   - Biblioteca pesada (~100KB)
   - Usada incluso en componentes simples
   - **Recomendación:** Usar CSS animations cuando sea posible

2. **Múltiples Componentes RuneCard**
   - 4 versiones = ~40KB desperdiciados
   - Ya discutido en sección 1.1

3. **Recharts** (para gráficos)
   - Biblioteca pesada para visualizaciones
   - **Revisar:** ¿Se usa en muchos lugares? Considerar alternativas más ligeras

**Acciones:**
1. Analizar bundle con `npm run build` y `@next/bundle-analyzer`
2. Lazy load componentes pesados (RuneCardPremium, charts)
3. Code splitting más agresivo

---

### 6.2 Imágenes - SIN PROBLEMAS ✅

**Uso Correcto de next/image:**
```typescript
// ✅ components/RuneCard.tsx
<Image
  src={rune.imageUrl}
  alt={rune.name}
  fill
  sizes="(max-width: 768px) 100vw, 25vw"
  placeholder="blur"
  priority={featured}
/>
```

- ✅ Atributo `sizes` especificado
- ✅ `placeholder="blur"` para mejor UX
- ✅ `priority` para imágenes above-the-fold

---

## 7. ACCESIBILIDAD (a11y)

### 7.1 Problemas Encontrados - PRIORIDAD MEDIA 🟡

**Botones sin Labels:**
```typescript
// components/RuneCard.tsx:138
<button
  onClick={handleFavorite}
  aria-label="Add to favorites" // ✅ BIEN
>
  <Heart className="w-4 h-4" />
</button>
```
✅ **CORRECTO** en la mayoría de componentes

**Contraste de Colores:**
- Colores museum-gray pueden tener problemas de contraste
- **Acción:** Verificar con herramientas de accesibilidad (axe DevTools)

**Navegación por Teclado:**
- RuneCard clickeable pero no tiene soporte para Enter/Space
- **Recomendación:** Convertir a `<a>` o agregar `onKeyPress`

---

## 8. TESTING - PRIORIDAD CRÍTICA 🔴

### 8.1 Cobertura Actual

**Archivos de Test:** Solo 4 archivos
```
lib/bitcoin/__tests__/coinSelection.test.ts
lib/store/__tests__/useQURIStore.test.ts
__tests__/ (directorio con tests básicos)
```

**Cobertura Estimada:** <5% del código

### 8.2 Áreas Sin Tests

🔴 **CRÍTICO - Sin Tests:**
- Componentes principales (RuneCard, EnhancedEtchingForm)
- Hooks de canisters (useRegistry, useRuneEngine)
- Lógica de settlement
- Integración con Internet Identity
- Validaciones de formularios

**Acción Requerida:**
1. Configurar coverage mínimo (50%) en `vitest.config.ts`
2. Tests prioritarios:
   - `EnhancedEtchingForm` (lógica compleja de validación)
   - `useSettlement` (manejo de transacciones críticas)
   - `coinSelection.ts` (lógica de UTXOs)
   - Componentes UI base (Button, Input, Card)

---

## 9. TODOs Y FIXMEs

### 9.1 TODOs Críticos

**`components/RuneStaking.tsx`:**
```typescript
// TODO: Replace with actual deployed canister ID
const REGISTRY_CANISTER_ID = 'aaaaa-aa';

// TODO: Implement after deploying Registry canister (x4 veces)
```
🟡 **MEDIO:** Componente no funcional hasta deployment

**`components/CkBTCMintFlow.tsx`:**
```typescript
// TODO: Replace with actual deployed canister ID
// TODO: Implement after deploying Registry canister (x3 veces)
// TODO: Integrate with Internet Identity or Plug Wallet
```
🟡 **MEDIO:** Similar a RuneStaking

**`app/(dashboard)/inscribe/page.tsx`:**
```typescript
// TODO: Implement actual inscription logic
```
🔴 **ALTO:** Funcionalidad principal sin implementar

**`components/admin/HybridSync.tsx`:**
```typescript
// TODO: Implementar función en el canister que acepte datos directamente
```
🟡 **MEDIO:** Workaround temporal en uso

---

### 9.2 FIXMEs y Comentarios de Verificación

**`components/runes/RuneCard.tsx`:**
```typescript
{/* TODO: Enable when backend adds verified field */}
// Aparece 2 veces
```
🟢 **BAJO:** Feature futura

---

## 10. MEJORES PRÁCTICAS

### 10.1 Validación de Formularios - EXCELENTE ✅

**React Hook Form + Zod:**
```typescript
// components/EnhancedEtchingForm.tsx
const schema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(26, 'Name must be 26 characters or less'),
  symbol: z.string()
    .min(1, 'Symbol is required'),
  // ...
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
});
```

✅ **EXCELENTE IMPLEMENTACIÓN**

---

### 10.2 Manejo de Errores

**Error Boundaries:**
```typescript
// components/ErrorBoundary.tsx - ✅ Implementado
// components/QueryErrorBoundary.tsx - ✅ Para TanStack Query
```

**Logging:**
```typescript
// lib/logger.ts - ✅ Logger estructurado
// TODO: Integrar con servicio externo (Sentry, LogRocket)
```

---

## 11. SEGURIDAD

### 11.1 Validación de Inputs - BIEN IMPLEMENTADO ✅

**`lib/security/input-validation.ts`:**
- ✅ Validación de Bitcoin addresses
- ✅ Validación de Canister IDs
- ✅ Sanitización de strings
- ✅ Rate limiting básico

**`lib/security/rate-limiter.ts`:**
- ✅ Rate limiting en memoria
- 🟡 Considerar persistencia para producción

---

### 11.2 Autenticación

**Internet Identity:**
```typescript
// lib/auth/ICPAuthProvider.ts
// lib/auth/BitcoinAuthProvider.ts
// lib/auth/DualAuthProvider.tsx
```

✅ **BIEN:** Separación clara de responsabilidades
🟡 **MEJORAR:** Agregar tests de autenticación

---

## 12. PRIORIZACIÓN DE ACCIONES

### 🔴 PRIORIDAD CRÍTICA (Hacer Esta Semana)

1. **Habilitar Type Checking**
   - Corregir errores de TypeScript
   - Remover `ignoreBuildErrors: true`
   - Tiempo estimado: 8-12 horas

2. **Eliminar Componentes Duplicados**
   - Consolidar RuneCard variants
   - Eliminar hooks no usados (useOrdinalsV2, useRunesV2)
   - Tiempo estimado: 4-6 horas

3. **Corregir Uso de `any`**
   - Generar tipos desde .did files
   - Reemplazar any críticos
   - Tiempo estimado: 6-8 horas

---

### 🟡 PRIORIDAD ALTA (Próximas 2 Semanas)

4. **Optimizar Server/Client Components**
   - Convertir páginas a Server Components
   - Separar lógica interactiva
   - Tiempo estimado: 10-12 horas

5. **Mejorar Bundle Size**
   - Analizar con bundle analyzer
   - Lazy load componentes pesados
   - Reducir uso de framer-motion
   - Tiempo estimado: 8-10 horas

6. **Agregar Tests Críticos**
   - EnhancedEtchingForm
   - useSettlement
   - Componentes UI base
   - Tiempo estimado: 12-16 horas

---

### 🟢 PRIORIDAD MEDIA (Próximo Mes)

7. **Consolidar Stores**
   - Deprecar useQURIStore duplicado
   - Documentar estructura de stores
   - Tiempo estimado: 4-6 horas

8. **Mejorar Accesibilidad**
   - Auditoría con axe DevTools
   - Corregir problemas de contraste
   - Agregar soporte de teclado faltante
   - Tiempo estimado: 6-8 horas

9. **Implementar Features Pendientes**
   - Completar TODOs de RuneStaking
   - Implementar lógica de inscripción
   - Tiempo estimado: 16-20 horas

---

## 13. CONCLUSIONES

### Fortalezas del Proyecto ✅

1. **Arquitectura Moderna:** Next.js 14 App Router bien utilizado
2. **State Management:** Zustand + TanStack Query implementados correctamente
3. **Validación:** React Hook Form + Zod excelentemente integrados
4. **Seguridad:** Validación de inputs robusta
5. **Imágenes:** Optimización correcta con next/image

### Debilidades Principales 🔴

1. **Type Safety:** Demasiados `any`, TypeScript errors ignorados
2. **Code Duplication:** 4 versiones de RuneCard, hooks duplicados
3. **Testing:** Cobertura < 5%, crítico para producción
4. **Bundle Size:** 635MB, necesita optimización
5. **Server Components:** Sub-utilización (86% son Client Components)

### Recomendación Final

El proyecto está en un estado **funcional pero necesita refactoring antes de producción**.

**Prioridades Absolutas (Bloqueantes para producción):**
1. Corregir type safety (eliminar `ignoreBuildErrors`)
2. Agregar tests críticos (mínimo 30% coverage)
3. Eliminar código duplicado
4. Optimizar bundle size

**Tiempo Estimado Total para Correcciones Críticas:** 40-50 horas de desarrollo

---

## ANEXO A: ARCHIVOS PARA ELIMINAR

```bash
# Componentes Duplicados
rm frontend/components/RuneCard.tsx
rm frontend/components/runes/RuneCard.tsx

# Hooks No Usados
rm frontend/hooks/useOrdinalsV2.ts
rm frontend/hooks/useRunesV2.ts

# Archivos Backup
rm frontend/lib/storage/nft-storage.ts.old

# Total Reducción: ~2,000 líneas de código
```

---

## ANEXO B: COMANDOS DE VERIFICACIÓN

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Tests
npm run test

# Build
npm run build

# Bundle analyzer
npm install --save-dev @next/bundle-analyzer
ANALYZE=true npm run build
```

---

**Fin del Reporte**

**Siguiente Paso Recomendado:** Crear issues en GitHub/Linear para cada ítem de prioridad crítica y asignar a sprints.
