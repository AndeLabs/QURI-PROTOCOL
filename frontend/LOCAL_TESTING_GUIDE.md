# Guía de Pruebas Locales - QURI Protocol Frontend

**Fecha:** 16 de Noviembre, 2025
**Estado:** ✅ Servidor Corriendo
**URL Local:** http://localhost:3001

---

## 🎯 Objetivo

Esta guía te ayudará a probar completamente el frontend modernizado del QURI Protocol con los contratos (canisters) deployados en Playground de ICP.

---

## ✅ Estado Actual del Deployment

### Canisters Deployados en Playground

| Canister | ID | Estado | URL Candid |
|----------|-----|--------|------------|
| **rune-engine** | `mytki-xqaaa-aaaab-qabrq-cai` | ✅ Running | [Ver en Candid](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=mytki-xqaaa-aaaab-qabrq-cai) |
| **bitcoin-integration** | `z7chj-7qaaa-aaaab-qacbq-cai` | ✅ Running | [Ver en Candid](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=z7chj-7qaaa-aaaab-qacbq-cai) |
| **registry** | `7pon3-7yaaa-aaaab-qacua-cai` | ✅ Running | [Ver en Candid](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=7pon3-7yaaa-aaaab-qacua-cai) |
| **identity-manager** | `3l4c5-2qaaa-aaaab-qacpq-cai` | ✅ Running | [Ver en Candid](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=3l4c5-2qaaa-aaaab-qacpq-cai) |

**⚠️ IMPORTANTE:** Estos canisters expiran en 20 minutos. Si expiran, redeploy con:
```bash
cd /Users/munay/dev/quri-protocol
dfx deploy --playground
```

### Frontend Local

- **URL:** http://localhost:3001
- **Puerto:** 3001 (3000 ya estaba en uso)
- **Estado:** ✅ Corriendo
- **Framework:** Next.js 14.2.33

---

## 🚀 Quick Start

### 1. Verificar que el servidor esté corriendo

Si el servidor no está corriendo:

```bash
cd /Users/munay/dev/QURI-PROTOCOL/frontend
npm run dev
```

### 2. Abrir el navegador

Abre tu navegador en:
```
http://localhost:3001
```

### 3. Componentes disponibles para probar

El frontend tiene los siguientes componentes modernos listos para probar:

1. **ModernDashboard** - Dashboard con métricas en tiempo real
2. **ModernEtchingForm** - Formulario para crear Runes
3. **ProcessMonitor** - Monitoreo de procesos en tiempo real
4. **ModernRuneGallery** - Galería con infinite scroll
5. **ActiveProcesses** - Monitor de procesos activos
6. **SystemHealth** - Monitor de salud del sistema

---

## 📋 Plan de Pruebas

### Test 1: Verificar Health del Sistema

**Objetivo:** Ver que todos los canisters estén conectados

**Pasos:**
1. Navega a http://localhost:3001
2. Busca el componente SystemHealth o dashboard
3. Deberías ver:
   - ✅ Etching Config: Initialized
   - ⚠️ Bitcoin Integration: Not configured (necesita config)
   - ⚠️ Registry: Not configured (necesita config)

**Resultado Esperado:**
- El componente debe renderizar sin errores
- Debe mostrar el estado de salud (aunque algunos servicios no estén configurados)

---

### Test 2: Probar Query Hooks

**Objetivo:** Verificar que React Query funcione correctamente

**Componente a probar:** ModernDashboard

**Pasos:**
1. Navega al dashboard
2. Abre DevTools (F12) → Console
3. Busca errores de red o React Query

**Resultado Esperado:**
- Los queries deben ejecutarse automáticamente
- Deberías ver las llamadas a los canisters en Network tab
- Los datos deben renderizar (aunque sean valores iniciales: 0 runes, etc.)

**Queries que se ejecutan:**
```typescript
- useRegistryStatsQuery() // Total runes, volume
- useMetricsSummaryQuery() // Performance metrics
- useHealthQuery() // System health
- useActiveProcessesMonitor() // Active processes
```

---

### Test 3: Probar Formulario de Etching

**Objetivo:** Verificar validación y UX del formulario

**Componente:** ModernEtchingForm

**Pasos:**
1. Navega a la página de Create (si existe) o renderiza ModernEtchingForm directamente
2. Prueba el formulario:
   - Deja campos vacíos y verifica errores de validación
   - Ingresa "TEST•RUNE" en rune_name
   - Ingresa "TEST" en symbol
   - Set divisibility = 8
   - Set premine = 1000
3. Abre "Advanced Options" y prueba mint terms
4. Observa el preview en vivo

**Resultado Esperado:**
- ✅ Validación funciona (errores en rojo cuando inválido)
- ✅ Preview se actualiza en tiempo real
- ✅ Inputs se convierten a UPPERCASE automáticamente
- ⚠️ Submit puede fallar si Bitcoin Integration no está configurado (esperado)

---

### Test 4: Probar Rune Gallery

**Objetivo:** Verificar infinite scroll y búsqueda

**Componente:** ModernRuneGallery

**Pasos:**
1. Navega a la galería de Runes
2. Verifica que renderice (probablemente vacío: "No runes available yet")
3. Prueba la búsqueda:
   - Escribe algo en el search box
   - Verifica que haya un delay de 300ms (debouncing)
4. Prueba el toggle Grid/List view
5. Prueba el dropdown de sorting

**Resultado Esperado:**
- ✅ Empty state se muestra correctamente
- ✅ Search input funciona con debouncing
- ✅ View toggle cambia entre grid/list
- ✅ Sort dropdown funciona
- ⚠️ No hay runes para mostrar aún (esperado - necesitamos crear algunos)

---

### Test 5: Probar Active Processes Monitor

**Objetivo:** Verificar monitoreo de procesos

**Componente:** ActiveProcesses

**Pasos:**
1. Renderiza el componente ActiveProcesses
2. Verifica el empty state: "No active processes"
3. Abre DevTools y verifica que NO esté haciendo polling (porque no hay procesos activos)

**Resultado Esperado:**
- ✅ Empty state renderiza correctamente
- ✅ No hay polling innecesario
- ✅ Stats muestran: Active: 0, Completed: 0, Failed: 0

---

### Test 6: Probar Auto-Polling (Simulado)

**Objetivo:** Verificar que el auto-polling funcione

**Nota:** Este test requiere que creemos un proceso primero, lo cual puede fallar sin Bitcoin configurado. Por ahora podemos verificar la lógica.

**Pasos:**
1. Abre DevTools → Console
2. Importa useEtchingStatusQuery en algún componente
3. Pasa un processId ficticio
4. Verifica que el hook NO haga polling (porque el process no existe)

**Resultado Esperado:**
- El hook debe manejar gracefully el caso de proceso no encontrado
- No debe crashear la app

---

### Test 7: Verificar Toast Notifications

**Objetivo:** Ver que las notificaciones funcionen

**Componente:** Toaster (de Sonner)

**Pasos:**
1. Intenta submitear el formulario de etching (ModernEtchingForm)
2. Deberías ver un toast notification

**Resultado Esperado:**
- ✅ Toast aparece en top-right
- ✅ Toast tiene el mensaje apropiado
- ✅ Toast desaparece después de ~4 segundos

---

### Test 8: Verificar Responsiveness

**Objetivo:** Ver que el diseño sea responsive

**Pasos:**
1. Abre DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Prueba diferentes resoluciones:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1920px)
3. Verifica que los grids se adapten:
   - Dashboard grid: 1 col → 2 cols → 4 cols
   - Rune gallery: 1 col → 2 cols → 3 cols

**Resultado Esperado:**
- ✅ Todo el layout se adapta correctamente
- ✅ No hay overflow horizontal
- ✅ Textos siguen siendo legibles

---

## 🔧 Configuración de Integraciones

Actualmente los canisters están deployados pero no configurados entre sí. Para configurarlos:

### Configurar Bitcoin Integration en Rune Engine

```bash
cd /Users/munay/dev/quri-protocol

# Configurar Bitcoin Integration ID
dfx canister --playground call rune-engine set_bitcoin_integration_canister \
  '(principal "z7chj-7qaaa-aaaab-qacbq-cai")'

# Configurar Registry ID
dfx canister --playground call rune-engine set_registry_canister \
  '(principal "7pon3-7yaaa-aaaab-qacua-cai")'
```

### Verificar Configuración

```bash
dfx canister --playground call rune-engine health_check
```

Deberías ver:
```candid
record {
  healthy = true;
  bitcoin_integration_configured = true;
  registry_configured = true;
  etching_config_initialized = true;
}
```

---

## 🐛 Troubleshooting

### Problema: "Cannot fetch Candid interface"

**Solución:** Esto es solo un warning, los canisters funcionan igualmente.

### Problema: "Canister has timed out"

**Solución:** Los canisters de Playground expiran en 20 minutos. Redeploy:
```bash
cd /Users/munay/dev/quri-protocol
dfx deploy --playground
```

Luego actualiza los IDs en `/Users/munay/dev/QURI-PROTOCOL/frontend/.env.local`

### Problema: "Port 3000 is in use"

**Solución:** El servidor automáticamente usa puerto 3001. Usa http://localhost:3001

### Problema: "Bitcoin Integration returns errors"

**Causa:** El Bitcoin Integration canister necesita cycles para llamar al Bitcoin API.

**Solución (temporal):**
- En Playground, los calls al Bitcoin API pueden fallar por falta de cycles
- Esto es esperado y normal
- Para tests reales, usa los canisters de mainnet:
  ```bash
  # En .env.local, comenta Playground IDs y descomenta Mainnet IDs
  NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=yz6hf-qqaaa-aaaah-arn5a-cai
  ```

### Problema: "Module not found" o TypeScript errors

**Solución:**
```bash
cd /Users/munay/dev/QURI-PROTOCOL/frontend
rm -rf .next node_modules
npm install
npm run dev
```

---

## 📊 Checklist de Pruebas

### UI Components
- [ ] ModernDashboard renderiza sin errores
- [ ] ModernEtchingForm valida correctamente
- [ ] ModernEtchingForm muestra preview
- [ ] ModernRuneGallery muestra empty state
- [ ] ModernRuneGallery tiene search con debouncing
- [ ] ModernRuneGallery toggle Grid/List funciona
- [ ] ProcessMonitor renderiza (si hay un process ID)
- [ ] ActiveProcesses muestra empty state
- [ ] SystemHealth muestra health status

### React Query
- [ ] Queries se ejecutan automáticamente
- [ ] Loading states aparecen
- [ ] Datos se renderizan cuando llegan
- [ ] Errores se manejan gracefully
- [ ] React Query DevTools funciona (si está habilitado)

### State Management
- [ ] Zustand store se inicializa
- [ ] localStorage persistence funciona
- [ ] Search query se guarda en Zustand
- [ ] View mode (grid/list) persiste al reload

### Toast Notifications
- [ ] Toast aparece al submitear form
- [ ] Toast tiene el mensaje correcto
- [ ] Toast se auto-dismisses
- [ ] Toast tiene el color correcto (success/error)

### Performance
- [ ] Página carga en < 3 segundos
- [ ] No hay memory leaks (verificar en Performance tab)
- [ ] Debouncing funciona (search espera 300ms)
- [ ] Infinite scroll no hace requests duplicados

### Responsive Design
- [ ] Mobile (375px) se ve bien
- [ ] Tablet (768px) se ve bien
- [ ] Desktop (1920px) se ve bien
- [ ] No hay overflow horizontal
- [ ] Touch targets son suficientemente grandes

---

## 🎯 Próximos Pasos

### 1. Configurar Integraciones (Alta Prioridad)
- Ejecutar comandos de configuración arriba
- Verificar que `health_check` retorne `healthy = true`

### 2. Crear Rune de Prueba
Una vez configurado, intenta crear un Rune:
```bash
# Via CLI (más rápido para testing)
dfx canister --playground call rune-engine etch_rune '(
  record {
    rune_name = "TEST•RUNE";
    symbol = "TEST";
    divisibility = 8;
    premine = 1000;
    terms = vec {};
  }
)'
```

### 3. Integrar Componentes en Páginas

Actualmente los componentes existen pero no están integrados en las páginas del App Router. Necesitas:

**Crear/Actualizar páginas:**

```tsx
// app/dashboard/page.tsx
import { ModernDashboard } from '@/components/ModernDashboard';
import { SystemHealth } from '@/components/SystemHealth';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">QURI Dashboard</h1>
      <SystemHealth />
      <ModernDashboard />
    </div>
  );
}
```

```tsx
// app/create/page.tsx
import { ModernEtchingForm } from '@/components/ModernEtchingForm';

export default function CreatePage() {
  return (
    <div className="container mx-auto py-8">
      <ModernEtchingForm />
    </div>
  );
}
```

```tsx
// app/explore/page.tsx
import { ModernRuneGallery } from '@/components/ModernRuneGallery';

export default function ExplorePage() {
  return (
    <div className="container mx-auto py-8">
      <ModernRuneGallery />
    </div>
  );
}
```

### 4. Testing Completo

Una vez que todo esté configurado:
- Crear varios Runes de prueba
- Monitorear procesos en tiempo real
- Verificar que el polling funcione
- Verificar que el infinite scroll cargue más Runes
- Probar búsqueda y filtros

### 5. Deploy a Producción

Cuando estés listo:
```bash
# Build de producción
npm run build

# Deploy a Vercel
vercel --prod

# O deploy a ICP
dfx deploy frontend --network ic
```

---

## 📚 Recursos

### Documentación
- [FRONTEND_COMPLETE.md](./FRONTEND_COMPLETE.md) - Resumen completo del proyecto
- [MODERN_COMPONENTS_GUIDE.md](./MODERN_COMPONENTS_GUIDE.md) - Guía de componentes
- [PHASE_3_COMPLETE.md](./PHASE_3_COMPLETE.md) - Detalles de Phase 3

### Candid UIs (para testing directo de canisters)
- [Rune Engine](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=mytki-xqaaa-aaaab-qabrq-cai)
- [Bitcoin Integration](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=z7chj-7qaaa-aaaab-qacbq-cai)
- [Registry](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=7pon3-7yaaa-aaaab-qacua-cai)
- [Identity Manager](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=3l4c5-2qaaa-aaaab-qacpq-cai)

### ICP Docs
- [Internet Computer Docs](https://internetcomputer.org/docs)
- [Candid Documentation](https://internetcomputer.org/docs/current/developer-docs/backend/candid/)
- [Playground Guide](https://internetcomputer.org/docs/current/developer-docs/getting-started/deploy/playground)

---

## ✅ Estado Final

**Frontend:**
- ✅ Servidor corriendo en http://localhost:3001
- ✅ Todos los componentes creados
- ✅ React Query configurado
- ✅ Zustand configurado
- ✅ Toast notifications funcionando
- ✅ TypeScript sin errores

**Canisters:**
- ✅ 4 canisters deployados en Playground
- ⚠️ Necesitan configuración de integraciones
- ⚠️ Expiran en 20 minutos (redeploy cuando sea necesario)

**Próximos pasos inmediatos:**
1. Configurar integraciones entre canisters (5 min)
2. Integrar componentes en páginas (15 min)
3. Probar flujo completo de creación de Rune (10 min)

---

**¡El frontend está listo para pruebas!** 🚀

Para cualquier pregunta o issue, revisa la documentación completa en los archivos mencionados arriba.
