# 🚀 Guía Rápida de Pruebas - QURI Protocol

**¡El frontend está listo para probar!**

---

## ✅ Página de Pruebas Creada

Creé una página especial de pruebas para que puedas probar todos los componentes fácilmente:

### 🔗 URL de Pruebas
```
http://localhost:3001/test
```

---

## 🎯 Qué Vas a Ver

La página de pruebas tiene **4 tabs** con los componentes modernos:

### 1️⃣ Dashboard
**Componente:** ModernDashboard

**Qué hace:**
- Muestra métricas del sistema en tiempo real
- 4 stat cards (Total Runes, 24h Volume, Success Rate, Active Processes)
- Performance metrics grid
- Active etchings list

**Qué esperar:**
- ✅ Renderiza sin errores
- ✅ Muestra valores iniciales (probablemente 0s)
- ✅ Hace queries a los canisters (ver Network tab)
- ✅ Loading states mientras carga

### 2️⃣ System Health
**Componente:** SystemHealth

**Qué hace:**
- Muestra el estado de salud del sistema
- Chequea 3 componentes: Config, Bitcoin, Registry
- Muestra métricas de performance

**Qué esperar:**
- ✅ Renderiza el health check
- ⚠️ Mostrará "System Issues" (esperado - canisters no configurados)
- ✅ Verás: Config ✓, Bitcoin ✗, Registry ✗
- ✅ Métricas mostrarán valores reales del canister

### 3️⃣ Active Processes
**Componente:** ActiveProcesses

**Qué hace:**
- Muestra todos los procesos de etching activos
- Auto-refresh cada 5 segundos
- Summary stats (Active, Completed, Failed)

**Qué esperar:**
- ✅ Renderiza el componente
- ✅ Muestra "No active processes" (esperado - no hay procesos aún)
- ✅ Stats muestran: Active: 0, Completed: 0, Failed: 0

### 4️⃣ Rune Gallery
**Componente:** ModernRuneGallery

**Qué hace:**
- Galería de Runes con infinite scroll
- Búsqueda con debouncing (300ms)
- Toggle Grid/List view
- Sort by: created, volume, trending

**Qué esperar:**
- ✅ Renderiza la galería
- ✅ Muestra "No runes available yet" (esperado - no hay runes)
- ✅ Search input funciona
- ✅ View toggle funciona
- ✅ Sort dropdown funciona

---

## 📋 Checklist de Pruebas Rápidas

### ✅ Prueba 1: Página Carga (30 segundos)
1. Abre http://localhost:3001/test
2. Verifica que la página carga sin errores
3. Deberías ver el header con "QURI Protocol - Test Mode"
4. Deberías ver 4 tabs: Dashboard, System Health, Active Processes, Rune Gallery

**✓ PASS:** Página carga y muestra tabs
**✗ FAIL:** Página crashea o muestra error

---

### ✅ Prueba 2: Dashboard (1 minuto)
1. Click en tab "Dashboard"
2. Espera a que cargue (verás spinners)
3. Deberías ver:
   - 4 stat cards en la parte superior
   - Performance metrics grid abajo
   - Probablemente un banner de "System Issues" (esperado)

**Abre DevTools (F12) → Network:**
- Deberías ver requests a canisters
- Busca calls como `get_metrics_summary`, `total_runes`, etc.

**✓ PASS:** Dashboard renderiza y hace queries
**✗ FAIL:** Errores en console o no carga

---

### ✅ Prueba 3: System Health (30 segundos)
1. Click en tab "System Health"
2. Deberías ver un banner rojo/amarillo: "System Issues Detected"
3. Verás 3 checks:
   - ✓ Etching Config (verde)
   - ✗ Bitcoin Integration (rojo)
   - ✗ Registry (rojo)

**Esto es esperado** - Los canisters de Playground no están configurados.

**✓ PASS:** Health check renderiza y muestra status
**✗ FAIL:** No carga o crashea

---

### ✅ Prueba 4: Active Processes (30 segundos)
1. Click en tab "Active Processes"
2. Deberías ver "No active processes"
3. Deberías ver stats: Active: 0, Completed: 0, Failed: 0

**✓ PASS:** Component muestra empty state correctamente
**✗ FAIL:** Errores o no renderiza

---

### ✅ Prueba 5: Rune Gallery (1 minuto)
1. Click en tab "Rune Gallery"
2. Deberías ver "No runes available yet"
3. Prueba la búsqueda:
   - Escribe algo en el search box
   - Debería haber un delay de ~300ms antes de buscar
4. Prueba los botones:
   - Click en Grid icon (cuadrícula)
   - Click en List icon (lista)
5. Prueba el dropdown de Sort

**✓ PASS:** Todos los controles funcionan sin errores
**✗ FAIL:** Búsqueda no funciona o botones crashean

---

### ✅ Prueba 6: React Query (Avanzado - 2 minutos)

**Abre DevTools → Console:**

Deberías ver logs de nuestro logger:
```
[DEBUG] Agent created as anonymous
[INFO] Fetching health check...
```

**Abre DevTools → Network:**

Filtra por "Fetch/XHR" y deberías ver requests a:
- `https://icp0.io/api/v2/canister/mytki-xqaaa-aaaab-qabrq-cai/query`
- `https://icp0.io/api/v2/canister/7pon3-7yaaa-aaaab-qacua-cai/query`

**✓ PASS:** Ves logs y requests en Network
**✗ FAIL:** No hay requests o muchos errores

---

### ✅ Prueba 7: Toast Notifications (30 segundos)

Deberías ver toast notifications automáticas cuando:
- Los datos cargan exitosamente
- Hay errores en las queries

Si no ves toasts, no te preocupes - solo se muestran en ciertas condiciones.

---

### ✅ Prueba 8: Responsive Design (1 minuto)

**Abre DevTools → Toggle Device Toolbar (Ctrl+Shift+M o Cmd+Shift+M):**

1. Prueba resolución Mobile (375px)
   - Los stat cards deberían apilarse verticalmente
   - Los tabs deberían ser scrollables

2. Prueba resolución Tablet (768px)
   - Grid debería mostrar 2 columnas

3. Prueba resolución Desktop (1920px)
   - Grid debería mostrar 4 columnas

**✓ PASS:** Layout se adapta en todas las resoluciones
**✗ FAIL:** Overflow horizontal o layout roto

---

## 🎯 Resultados Esperados

### ✅ Si Todo Funciona Correctamente

Deberías ver:
- ✅ Página carga sin errores
- ✅ Todos los tabs cambian correctamente
- ✅ Componentes muestran empty states (no hay datos aún)
- ✅ Requests en Network tab
- ✅ Logs en Console
- ✅ No hay errores críticos en Console
- ✅ Responsive design funciona

### ⚠️ Comportamientos Esperados (NO son errores)

- ⚠️ "System Issues Detected" - Normal, canisters no configurados
- ⚠️ "No runes available yet" - Normal, no hay runes creados
- ⚠️ "No active processes" - Normal, no hay procesos
- ⚠️ Valores en 0 (Total Runes: 0, Volume: 0, etc.) - Normal
- ⚠️ Algunos queries pueden fallar - Normal en Playground

### ❌ Errores Reales (Reportar si ves)

- ❌ Página crashea completamente
- ❌ "Module not found" errors
- ❌ TypeScript errors en Console
- ❌ Components no renderizan nada
- ❌ Todos los tabs están vacíos
- ❌ No hay requests en Network tab

---

## 🔍 Debug Info

### Ver Canister IDs
En el footer de la página de pruebas verás los primeros 10 caracteres de cada canister ID.

IDs completos:
- **Rune Engine:** `mytki-xqaaa-aaaab-qabrq-cai`
- **Bitcoin Integration:** `z7chj-7qaaa-aaaab-qacbq-cai`
- **Registry:** `7pon3-7yaaa-aaaab-qacua-cai`
- **Identity Manager:** `3l4c5-2qaaa-aaaab-qacpq-cai`

### Ver en Candid UI
Si algo no funciona en el frontend, puedes probar directamente en Candid UI:

- [Rune Engine](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=mytki-xqaaa-aaaab-qabrq-cai)
  - Prueba: `health_check()`
  - Prueba: `get_metrics_summary()`

- [Registry](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=7pon3-7yaaa-aaaab-qacua-cai)
  - Prueba: `total_runes()`

---

## 🚀 Siguientes Pasos Después de las Pruebas

### Si Todo Funciona ✅
¡Felicidades! El frontend está funcionando correctamente en modo query-only.

**Próximos pasos:**
1. Deploy canisters a mainnet para poder crear Runes
2. Configurar integraciones entre canisters
3. Crear algunos Runes de prueba
4. Probar el flujo completo de etching

### Si Encuentras Errores ❌
1. Toma screenshot del error
2. Copia el mensaje de error completo
3. Verifica Network tab para ver qué requests fallan
4. Verifica Console para TypeScript/React errors

---

## 📊 Resumen de lo que Estamos Probando

### Frontend (Phase 3 - Completo)
- ✅ 6 componentes modernos UI
- ✅ React Query para data fetching
- ✅ Zustand para state management
- ✅ Toast notifications
- ✅ Loading states
- ✅ Empty states
- ✅ Error handling
- ✅ Responsive design

### Backend (Phase 1 - Completo)
- ✅ 4 canisters deployados
- ✅ TypeScript IDL factories
- ✅ Actor factories
- ✅ Hooks para cada canister

### State Management (Phase 2 - Completo)
- ✅ QueryClient configurado
- ✅ 11 React Query hooks (Runes)
- ✅ 8 React Query hooks (Etching)
- ✅ 2 Zustand stores
- ✅ Toast system

---

## ⏰ Tiempo Estimado de Pruebas

- **Prueba rápida (todos los tabs):** 5 minutos
- **Prueba completa (con DevTools):** 10 minutos
- **Prueba exhaustiva (responsive + debug):** 15 minutos

---

## 🎉 ¡Listo para Probar!

**Abre ahora:**
```
http://localhost:3001/test
```

Y sigue el checklist arriba. ¡Disfruta probando el frontend modernizado! 🚀

Si todo funciona, habrás verificado que **~4,900 líneas de código TypeScript/React** funcionan correctamente. 🎊
