# Plan de Migración Frontend - QURI Protocol
**Basado en:** AUDIT_REPORT.md
**Duración Estimada:** 2-3 semanas
**Equipo:** 2-3 desarrolladores frontend

---

## FASE 1: PREPARACIÓN (Día 1)
**Duración:** 4 horas
**Riesgo:** Bajo
**Responsable:** Tech Lead

### Tareas

#### 1.1 Setup del entorno de migración
```bash
# Crear branch de migración
git checkout -b refactor/frontend-cleanup-audit

# Crear backup completo
cp -r . ../quri-frontend-backup-$(date +%Y%m%d)

# Instalar herramientas
npm install --save-dev @next/bundle-analyzer
npm install --save-dev depcheck
```

#### 1.2 Documentar estado actual
```bash
# Generar reporte de bundle
ANALYZE=true npm run build

# Ejecutar type-check y guardar output
npm run type-check > type-errors-before.txt 2>&1

# Contar métricas iniciales
echo "Files: $(find . -name '*.tsx' -o -name '*.ts' | wc -l)" > metrics-before.txt
echo "Client Components: $(grep -r 'use client' app --include='*.tsx' | wc -l)" >> metrics-before.txt
echo "Any usage: $(grep -r ': any' . --include='*.ts' --include='*.tsx' | wc -l)" >> metrics-before.txt
```

#### 1.3 Crear issues en GitHub
- [ ] Issue #1: Remove duplicate RuneCard components
- [ ] Issue #2: Fix TypeScript errors
- [ ] Issue #3: Remove unused hooks
- [ ] Issue #4: Add critical tests
- [ ] Issue #5: Optimize Server/Client components
- [ ] Issue #6: Reduce bundle size

---

## FASE 2: LIMPIEZA DE CÓDIGO MUERTO (Días 2-3)
**Duración:** 12 horas
**Riesgo:** Bajo-Medio
**Responsable:** Developer 1

### 2.1 Eliminar componentes duplicados

#### Paso 1: Análisis de imports
```bash
# Encontrar todos los archivos que importan RuneCard legacy
grep -rl "from '@/components/RuneCard'" . --include="*.tsx" --include="*.ts" > rune-card-imports.txt

# Ver la lista
cat rune-card-imports.txt
```

#### Paso 2: Migración de RuneCard a RuneCardSimple
```typescript
// ANTES (components/RuneCard.tsx)
import { RuneCard } from '@/components/RuneCard';

// DESPUÉS (components/runes/RuneCardSimple.tsx)
import { RuneCardSimple as RuneCard } from '@/components/runes/RuneCardSimple';
```

**Script de migración automática:**
```bash
# Reemplazar imports (REVISAR DESPUÉS!)
find app components -name "*.tsx" -type f -exec sed -i '' \
  's|from '\''@/components/RuneCard'\''|from '\''@/components/runes/RuneCardSimple'\''|g' {} \;

# Renombrar componente en imports
find app components -name "*.tsx" -type f -exec sed -i '' \
  's|{ RuneCard }|{ RuneCardSimple as RuneCard }|g' {} \;
```

#### Paso 3: Verificar compilación
```bash
npm run type-check
npm run build
```

#### Paso 4: Eliminar archivos duplicados
```bash
# SOLO si compilación exitosa
git rm components/RuneCard.tsx
git rm components/runes/RuneCard.tsx

# Commit
git add .
git commit -m "refactor: remove duplicate RuneCard components"
```

### 2.2 Eliminar hooks no usados

#### Verificación de uso
```bash
# useOrdinalsV2
grep -r "useOrdinalsV2" . --include="*.tsx" --include="*.ts"

# useRunesV2
grep -r "useRunesV2" . --include="*.tsx" --include="*.ts"
```

#### Eliminación
```bash
# Si no hay imports, eliminar
git rm hooks/useOrdinalsV2.ts
git rm hooks/useRunesV2.ts

# Commit
git commit -m "refactor: remove unused hooks (useOrdinalsV2, useRunesV2)"
```

### 2.3 Limpiar archivos backup
```bash
git rm lib/storage/nft-storage.ts.old
git commit -m "chore: remove old backup files"
```

### 2.4 Testing de regresión
```bash
# Ejecutar suite completa
npm run test

# Verificar build
npm run build

# Test manual en dev
npm run dev
# Probar: Explorer, Gallery, Dashboard
```

---

## FASE 3: CORRECCIÓN DE TYPES (Días 4-6)
**Duración:** 20 horas
**Riesgo:** Alto
**Responsable:** Developer 2 + Tech Lead

### 3.1 Generar tipos desde Candid

#### Verificar archivos .did actuales
```bash
ls -la ../canisters/*/src/*.did
```

#### Generar tipos TypeScript
```bash
# Si existe script de generación
npm run generate:types

# O manualmente con dfx
dfx generate

# Copiar tipos generados a frontend/lib/icp/types/
```

### 3.2 Corregir usos críticos de `any`

#### Prioridad 1: Transformaciones de canisters

**Archivo:** `hooks/useDeadManSwitch.ts`
```typescript
// ANTES
function transformDMSInfo(raw: any): DeadManSwitchInfo {
  // ...
}

// DESPUÉS
import { DMSInfo as CandidDMSInfo } from '@/lib/icp/types/deadman';

function transformDMSInfo(raw: CandidDMSInfo): DeadManSwitchInfo {
  return {
    id: raw.id,
    owner: raw.owner,
    // ... con type safety completo
  };
}
```

**Archivos a corregir:**
1. `hooks/useDeadManSwitch.ts`
2. `hooks/useEncryptedMetadata.ts`
3. `hooks/useSettlement.ts`
4. `hooks/useRuneExplorer.ts`

#### Prioridad 2: Props de componentes

**Archivo:** `app/(dashboard)/dashboard/page.tsx`
```typescript
// ANTES
interface StatCardProps {
  icon: any;
  title: string;
  value: string;
}

// DESPUÉS
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
}
```

#### Prioridad 3: Chart tooltips (Recharts)

**Archivo:** `components/explorer/charts/HolderDistribution.tsx`
```typescript
// ANTES
const CustomTooltip = ({ active, payload }: any) => {

// DESPUÉS
import type { TooltipProps } from 'recharts';

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
```

### 3.3 Actualizar configuración

**next.config.js:**
```javascript
// ANTES
typescript: {
  ignoreBuildErrors: true, // TODO: Set back to false
},

// DESPUÉS
typescript: {
  ignoreBuildErrors: false, // ✅ Errors fixed
},
```

**.eslintrc.json:**
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error", // ✅ Enforce
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

### 3.4 Verificación incremental
```bash
# Después de cada archivo corregido
npm run type-check

# Ver progreso
npm run type-check 2>&1 | grep -c "error TS"
```

### 3.5 Commit por área
```bash
git add hooks/useDeadManSwitch.ts hooks/useEncryptedMetadata.ts
git commit -m "fix(types): add proper types for canister transformations"

git add components/explorer/charts/
git commit -m "fix(types): add Recharts types for chart components"

git add app/(dashboard)/
git commit -m "fix(types): add proper icon types for dashboard"
```

---

## FASE 4: TESTING CRÍTICO (Días 7-9)
**Duración:** 20 horas
**Riesgo:** Medio
**Responsable:** Developer 1 + QA

### 4.1 Setup de infraestructura de tests

#### Configurar coverage threshold
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.ts',
        '.next/',
      ],
    },
  },
});
```

### 4.2 Tests para EnhancedEtchingForm

**Archivo:** `__tests__/components/EnhancedEtchingForm.test.tsx`
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedEtchingForm } from '@/components/EnhancedEtchingForm';

describe('EnhancedEtchingForm', () => {
  it('validates rune name correctly', async () => {
    render(<EnhancedEtchingForm />);

    const nameInput = screen.getByLabelText(/rune name/i);
    fireEvent.change(nameInput, { target: { value: 'INVALID NAME WITH SPACES' } });

    await waitFor(() => {
      expect(screen.getByText(/name must be uppercase/i)).toBeInTheDocument();
    });
  });

  it('calculates fees correctly', async () => {
    // Test fee estimation logic
  });

  it('handles image upload', async () => {
    // Test image upload flow
  });

  // ... más tests
});
```

### 4.3 Tests para useSettlement

**Archivo:** `__tests__/hooks/useSettlement.test.ts`
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useSettlement } from '@/hooks/useSettlement';

describe('useSettlement', () => {
  it('fetches settlement records', async () => {
    const { result } = renderHook(() => useSettlement());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.records).toBeDefined();
  });

  it('handles settlement creation', async () => {
    // Test settlement flow
  });
});
```

### 4.4 Tests para componentes UI

**Archivos a crear:**
- `__tests__/components/ui/Button.test.tsx`
- `__tests__/components/ui/Input.test.tsx`
- `__tests__/components/ui/Card.test.tsx`

### 4.5 Ejecutar y verificar coverage
```bash
# Run tests with coverage
npm run test:coverage

# Ver reporte
open coverage/index.html

# Verificar que pasa el threshold
# Should see: All coverage thresholds passed!
```

---

## FASE 5: OPTIMIZACIÓN SERVER/CLIENT (Días 10-12)
**Duración:** 20 horas
**Riesgo:** Medio
**Responsable:** Tech Lead

### 5.1 Refactor Explorer Page

#### ANTES (página completa es Client Component)
```typescript
// app/(dashboard)/explorer/page.tsx
'use client';

export default function ExplorerPage() {
  const [runes, setRunes] = useState([]);
  // ... lógica compleja
  return <RuneGrid runes={runes} />;
}
```

#### DESPUÉS (Server Component + Client interactivo)

**app/(dashboard)/explorer/page.tsx (Server Component)**
```typescript
// NO 'use client' directive
import { getInitialRunes } from '@/lib/api/server-actions';
import { ExplorerClient } from './ExplorerClient';

export default async function ExplorerPage() {
  // Fetch en servidor
  const initialRunes = await getInitialRunes({ limit: 24 });

  return (
    <div>
      <h1>Rune Explorer</h1>
      <ExplorerClient initialData={initialRunes} />
    </div>
  );
}
```

**app/(dashboard)/explorer/ExplorerClient.tsx**
```typescript
'use client';

import { useState } from 'react';
import { useRuneExplorer } from '@/hooks/useRuneExplorer';

export function ExplorerClient({ initialData }) {
  const { runes, fetchNextPage } = useRuneExplorer({ initialData });

  return (
    <RuneGrid runes={runes} onLoadMore={fetchNextPage} />
  );
}
```

### 5.2 Páginas a refactorizar

**Prioridad Alta:**
1. `app/(dashboard)/explorer/page.tsx`
2. `app/(dashboard)/gallery/page.tsx`
3. `app/ecosystem/page.tsx`
4. `app/roadmap/page.tsx`

**Prioridad Media:**
5. `app/(dashboard)/dashboard/page.tsx`
6. `app/(dashboard)/my-runes/page.tsx`

### 5.3 Verificación de performance

**Antes del refactor:**
```bash
npm run build
npm run start

# Ejecutar Lighthouse
npx lighthouse http://localhost:3000/explorer --view
```

**Después del refactor:**
```bash
npm run build
npm run start

# Ejecutar Lighthouse de nuevo
npx lighthouse http://localhost:3000/explorer --view

# Comparar métricas:
# - First Contentful Paint (should improve)
# - Time to Interactive (should improve)
# - Total Blocking Time (should decrease)
# - JavaScript bundle size (should decrease 15-20%)
```

---

## FASE 6: OPTIMIZACIÓN DE BUNDLE (Días 13-14)
**Duración:** 12 horas
**Riesgo:** Bajo
**Responsable:** Developer 2

### 6.1 Analizar bundle actual

```bash
ANALYZE=true npm run build

# Identificar módulos pesados:
# - framer-motion (~100KB)
# - recharts
# - @dfinity packages
```

### 6.2 Implementar code splitting

#### Lazy load componentes pesados
```typescript
// app/(dashboard)/gallery/page.tsx

// ANTES
import { RuneCardPremium } from '@/components/runes/RuneCardPremium';

// DESPUÉS
import dynamic from 'next/dynamic';

const RuneCardPremium = dynamic(
  () => import('@/components/runes/RuneCardPremium').then(m => ({ default: m.RuneCardPremium })),
  { loading: () => <RuneCardSkeleton /> }
);
```

#### Lazy load charts
```typescript
const VolumeChart = dynamic(() => import('@/components/explorer/charts/VolumeChart'), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});
```

### 6.3 Optimizar framer-motion

**Estrategia:**
1. Usar CSS animations para efectos simples
2. Lazy load framer-motion solo cuando se necesita
3. Considerar `framer-motion/dist/es/render/dom/motion-minimal` para builds

**Ejemplo:**
```typescript
// ANTES
import { motion } from 'framer-motion';

// DESPUÉS (para animaciones simples)
<div className="animate-fade-in"> {/* CSS animation */}
```

### 6.4 Verificar reducción de bundle

```bash
# Comparar tamaño antes/después
ANALYZE=true npm run build

# Objetivo: Reducir de 635MB a <500MB
```

---

## FASE 7: CONSOLIDACIÓN Y CLEANUP (Día 15)
**Duración:** 6 horas
**Riesgo:** Bajo
**Responsable:** Tech Lead

### 7.1 Consolidar stores Zustand

#### Deprecar useQURIStore
```typescript
// lib/store/useQURIStore.ts
/**
 * @deprecated Use lib/stores/index.ts instead
 * This store will be removed in v2.0
 */
export const useQURIStore = create<QURIStore>(...);
```

#### Documentar nueva estructura
```markdown
# State Management - QURI Protocol

## Stores Activos

1. **lib/stores/index.ts** - Store principal
   - Wallet state
   - UI state
   - Settings

2. **lib/store/useEtchingStore.ts** - Etching processes
3. **lib/store/useRuneStore.ts** - Rune cache

## ⚠️ Deprecated

- **lib/store/useQURIStore.ts** - Usar lib/stores/index.ts
```

### 7.2 Ejecutar script de cleanup final

```bash
./scripts/cleanup-audit.sh

# Revisar y commitear cambios
git add .
git commit -m "chore: final cleanup from audit"
```

### 7.3 Actualizar documentación

**README.md updates:**
```markdown
## Development

### Type Safety
All TypeScript errors must be fixed before merge:
\`\`\`bash
npm run type-check
\`\`\`

### Testing
Minimum 30% coverage required:
\`\`\`bash
npm run test:coverage
\`\`\`

### Performance
Run bundle analysis before major changes:
\`\`\`bash
ANALYZE=true npm run build
\`\`\`
```

---

## FASE 8: TESTING FINAL Y DEPLOYMENT (Días 16-17)
**Duración:** 12 horas
**Riesgo:** Medio
**Responsable:** Todo el equipo

### 8.1 Testing comprehensivo

#### Automated tests
```bash
# Type check
npm run type-check

# Linting
npm run lint

# Unit tests
npm run test

# Build
npm run build
```

#### Manual QA checklist
- [ ] Explorer page: búsqueda, filtros, infinite scroll
- [ ] Gallery: visualización de runes
- [ ] Create: formulario de etching completo
- [ ] My Runes: listado y settlement
- [ ] Wallet: conexión Internet Identity
- [ ] Admin: sync panel
- [ ] Mobile: responsive design

### 8.2 Performance testing

```bash
# Lighthouse audit
npm run build && npm run start
npx lighthouse http://localhost:3000 --view

# Target scores:
# - Performance: >90
# - Accessibility: >90
# - Best Practices: >90
# - SEO: >90
```

### 8.3 Staging deployment

```bash
# Deploy to staging
vercel --prod

# Run smoke tests
# Verificar funcionalidad crítica
```

### 8.4 Generar métricas finales

```bash
# Comparar con métricas iniciales
cat metrics-before.txt
echo "=== AFTER ===" > metrics-after.txt
echo "Files: $(find . -name '*.tsx' -o -name '*.ts' | wc -l)" >> metrics-after.txt
echo "Client Components: $(grep -r 'use client' app --include='*.tsx' | wc -l)" >> metrics-after.txt
echo "Any usage: $(grep -r ': any' . --include='*.ts' --include='*.tsx' | wc -l)" >> metrics-after.txt
echo "Test Coverage: $(npm run test:coverage 2>&1 | grep 'All files' | awk '{print $10}')" >> metrics-after.txt
cat metrics-after.txt

# Generar diff
diff metrics-before.txt metrics-after.txt
```

---

## FASE 9: MERGE Y PRODUCCIÓN (Día 18)
**Duración:** 4 horas
**Riesgo:** Medio
**Responsable:** Tech Lead

### 9.1 Code review final

```bash
# Crear PR
gh pr create --title "Frontend Cleanup & Optimization (Audit 2025-11)" \
  --body "$(cat AUDIT_SUMMARY.md)"

# Asignar reviewers
gh pr edit --add-reviewer @team-leads
```

### 9.2 Merge strategy

```bash
# Squash commits por fase
git rebase -i main

# Commits finales:
# - refactor: remove duplicate components and unused hooks
# - fix(types): comprehensive TypeScript fixes
# - test: add critical component tests
# - perf: optimize Server/Client component split
# - perf: reduce bundle size with code splitting
# - chore: final cleanup and documentation
```

### 9.3 Production deployment

```bash
# Merge a main
git checkout main
git merge refactor/frontend-cleanup-audit

# Tag release
git tag -a v1.1.0 -m "Frontend optimization release - Nov 2025"

# Deploy
vercel --prod

# Monitor
# - Check error tracking (Sentry)
# - Monitor analytics
# - Watch for regressions
```

### 9.4 Post-deployment monitoring

**First 24 hours:**
- [ ] Check error rates (should not increase)
- [ ] Monitor performance metrics
- [ ] Verify user engagement metrics
- [ ] Review user feedback

**First week:**
- [ ] Review bundle size in production
- [ ] Check Lighthouse scores
- [ ] Monitor load times
- [ ] Gather team feedback

---

## ROLLBACK PLAN

### Si algo falla en producción:

```bash
# Rollback immediato en Vercel
vercel rollback [deployment-url]

# O revert en Git
git revert [commit-hash]
git push origin main

# Restaurar desde backup
cp -r ../quri-frontend-backup-YYYYMMDD/* .
```

---

## SUCCESS CRITERIA

### Métricas Objetivo

| Métrica | Antes | Objetivo | Crítico |
|---------|-------|----------|---------|
| Type Errors | Ignorados | 0 | ✅ |
| Test Coverage | <5% | >30% | ✅ |
| Bundle Size | 635MB | <500MB | 🟡 |
| `any` usage | 55 | <10 | ✅ |
| Client Components | 86% | <50% | 🟡 |
| Lighthouse Performance | ? | >90 | 🟡 |

### Features Funcionales

- [x] Todas las páginas cargan correctamente
- [x] Búsqueda y filtros funcionan
- [x] Formulario de etching valida correctamente
- [x] Settlement flow completo
- [x] Internet Identity conecta sin errores
- [x] Mobile responsive

### Developer Experience

- [x] TypeScript autocomplete funciona
- [x] No warnings en consola
- [x] Build pasa sin errors
- [x] Tests pasan consistentemente
- [x] Hot reload rápido (<2s)

---

## COMUNICACIÓN

### Daily Standups
- **Cuando:** 9:00 AM
- **Duración:** 15 min
- **Topics:**
  - Progreso de ayer
  - Plan de hoy
  - Blockers

### Mid-sprint Review (Día 9)
- Revisar progreso (50%)
- Ajustar timeline si necesario
- Demo de cambios críticos

### Final Review (Día 17)
- Demo completo
- Métricas antes/después
- Decisión de deployment

---

## NOTAS FINALES

### Riesgos Identificados

1. **Type errors más complejos de lo esperado**
   - Mitigación: Asignar más tiempo a Fase 3
   - Contingencia: Usar `unknown` + type guards

2. **Tests rompen funcionalidad existente**
   - Mitigación: Tests aislados, no modificar lógica
   - Contingencia: Reducir coverage target a 20%

3. **Server Components causan problemas de hydration**
   - Mitigación: Refactor incremental
   - Contingencia: Mantener Client Components si es crítico

### Recursos Adicionales

- [Next.js 14 Docs](https://nextjs.org/docs)
- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs)
- [Zustand Patterns](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Última Actualización:** 2025-11-24
**Próxima Revisión:** Post-deployment (Día 19)
