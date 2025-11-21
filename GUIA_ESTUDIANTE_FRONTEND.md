# 🎓 Guía Educativa del Frontend de QURI Protocol

> **Para Estudiantes:** Esta guía te explica cómo funciona la aplicación web de QURI Protocol de forma clara y sencilla.

---

## 📚 Tabla de Contenidos

1. [¿Qué es QURI Protocol?](#1-qué-es-quri-protocol)
2. [Conceptos Básicos que Necesitas Conocer](#2-conceptos-básicos)
3. [Arquitectura de la Aplicación](#3-arquitectura-de-la-aplicación)
4. [Páginas Principales](#4-páginas-principales)
5. [Componentes Interesantes](#5-componentes-interesantes)
6. [Flujos de Usuario](#6-flujos-de-usuario)
7. [Tecnologías Utilizadas](#7-tecnologías-utilizadas)
8. [Conceptos Avanzados Explicados](#8-conceptos-avanzados)

---

## 1. ¿Qué es QURI Protocol?

### 🎯 Concepto General

QURI Protocol es como un **"banco digital para tokens de Bitcoin"** llamados **Runes**. Imagina que es como tener una aplicación para crear y gestionar tus propias monedas digitales sobre Bitcoin, pero de forma segura y fácil.

### 🔑 Analogía Simple

```
Bitcoin = Oro físico
Runes = Certificados de oro que puedes crear y transferir
QURI = El banco que te ayuda a crear y gestionar esos certificados
```

### 🌟 ¿Qué Puedes Hacer?

1. **Crear Runes** (Etching) - Como imprimir tu propia moneda
2. **Ver Runes** (Explorer) - Como un catálogo de todas las monedas
3. **Gestionar Herencia** (Dead Man's Switch) - Si no te conectas por 30 días, tus Runes se transfieren automáticamente a tu familia
4. **Encriptar Secretos** (vetKeys) - Guardar información privada que solo ciertos usuarios pueden ver

---

## 2. Conceptos Básicos

### 🔐 Blockchain y Canisters

**¿Qué es Blockchain?**
- Es como un libro contable digital que **nadie puede borrar o falsificar**
- Todas las transacciones quedan registradas para siempre
- Es público: todos pueden ver las transacciones

**¿Qué es ICP (Internet Computer)?**
- Es un tipo de blockchain **más rápido y moderno** que Ethereum
- Los programas aquí se llaman **"canisters"** (como contenedores de código)
- Es como tener una computadora descentralizada en la nube

**Canisters de QURI:**
```
┌─────────────────────┐
│   RUNE-ENGINE       │ ← Crea Runes, gestiona Dead Man's Switch
├─────────────────────┤
│   REGISTRY          │ ← Base de datos de todos los Runes
├─────────────────────┤
│ BITCOIN-INTEGRATION │ ← Conecta con Bitcoin para firmar transacciones
├─────────────────────┤
│  IDENTITY-MANAGER   │ ← Gestiona usuarios e identidad
└─────────────────────┘
```

### 🎨 Bitcoin Runes

**¿Qué es un Rune?**
- Son **tokens fungibles** (intercambiables como monedas) en Bitcoin
- Similar a tokens ERC-20 en Ethereum, pero en Bitcoin
- Creados con un protocolo llamado **"Runestone"** usando `OP_RETURN`

**Ejemplo:**
```
Rune Name: QURI•COIN
Symbol: ♦︎
Decimals: 2
Total Supply: 1,000,000
Premine: 100,000 (enviados al creador)
```

---

## 3. Arquitectura de la Aplicación

### 📁 Estructura de Carpetas

```
frontend/
├── app/                        # Páginas de la aplicación (Next.js App Router)
│   ├── page.tsx               # Página de inicio (/)
│   ├── layout.tsx             # Layout principal
│   ├── (dashboard)/           # Grupo de rutas del dashboard
│   │   ├── explorer/          # Explorador de Runes
│   │   ├── create/            # Crear Runes
│   │   ├── gallery/           # Galería de Runes
│   │   ├── wallet/            # Billetera
│   │   └── swap/              # Intercambio
│   ├── admin/                 # Panel de administración
│   └── settlement/            # Liquidación de transacciones
│
├── components/                 # Componentes reutilizables
│   ├── runes/                 # Componentes relacionados con Runes
│   │   ├── RuneGrid.tsx       # Cuadrícula de Runes
│   │   ├── RuneCard.tsx       # Tarjeta individual de Rune
│   │   └── RuneFilters.tsx    # Filtros de búsqueda
│   ├── explorer/              # Componentes del explorador
│   ├── wallet/                # Componentes de billetera
│   ├── deadman/               # Dead Man's Switch
│   ├── encryption/            # Metadatos encriptados
│   └── ui/                    # Componentes de interfaz
│
├── hooks/                      # Custom React Hooks
│   ├── useRegistry.ts         # Comunicación con Registry canister
│   ├── useRuneEngine.ts       # Comunicación con Rune-Engine
│   ├── useBitcoinIntegration.ts
│   └── useRuneExplorer.ts     # Lógica del explorador
│
├── lib/                        # Librerías y utilidades
│   ├── icp/                   # Configuración de ICP
│   │   ├── actors.ts          # Actores de canisters
│   │   ├── agent.ts           # Agente HTTP de ICP
│   │   └── idl/               # Definiciones Candid
│   └── store/                 # Estado global (Zustand)
│
└── types/                      # TypeScript types
    └── canisters.ts           # Tipos de canisters
```

### 🏗️ Patrón de Arquitectura

QURI usa **arquitectura modular moderna**:

```
┌─────────────────────────────────────────────┐
│           NAVEGADOR DEL USUARIO             │
└─────────────────┬───────────────────────────┘
                  │
        ┌─────────▼─────────┐
        │   Next.js App     │  ← Páginas (app/)
        │    (Frontend)     │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │  React Components │  ← Componentes (components/)
        │   + Custom Hooks  │     + Hooks (hooks/)
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │  ICP Agent Setup  │  ← Actores (lib/icp/)
        │   (HTTP Calls)    │
        └─────────┬─────────┘
                  │
        ┌─────────▼─────────┐
        │   ICP CANISTERS   │  ← Backend en Rust
        │  (Smart Contracts)│
        └───────────────────┘
```

---

## 4. Páginas Principales

### 🏠 **Página de Inicio** (`app/page.tsx`)

**Propósito:** Landing page que presenta el proyecto

**Características:**
```typescript
// Elementos visuales
✨ Logo animado con efecto de glow (brillo)
🎨 Decoraciones con imágenes andinas (ave, serpiente, inti, ojo, perro)
📱 Diseño responsivo (se adapta a móviles)
🎬 Animaciones con Framer Motion

// Secciones
1. Hero Section → Título principal + CTA buttons
2. Features Section → Características del protocolo
3. Footer → Links y información
```

**Componentes Clave:**
```tsx
<motion.div> {/* Animaciones suaves */}
  <ButtonPremium variant="gold"> {/* Botón premium con efectos */}
    Launch App
  </ButtonPremium>
</motion.div>
```

---

### 🔍 **Explorador** (`app/(dashboard)/explorer/page.tsx`)

**Propósito:** Ver todos los Runes disponibles

**Flujo de Datos:**
```
Usuario entra → useRuneExplorer() obtiene Runes
                      ↓
            Registry canister responde
                      ↓
         Runes se muestran en RuneGrid
                      ↓
         Usuario puede filtrar y buscar
```

**Características Avanzadas:**

1. **Infinite Scroll** (Scroll Infinito)
   ```typescript
   // Cuando llegas al final de la página, carga más Runes automáticamente
   const { fetchNextPage, hasMore } = useInfiniteRunes();

   // Intersection Observer detecta cuando llegas al final
   useEffect(() => {
     if (isIntersecting && hasMore) {
       fetchNextPage(); // Carga más
     }
   }, [isIntersecting]);
   ```

2. **Filtros Inteligentes**
   ```typescript
   interface FilterState {
     search: string;        // Buscar por nombre
     sortBy: 'created' | 'volume' | 'holders'; // Ordenar
     sortOrder: 'asc' | 'desc'; // Ascendente/Descendente
   }
   ```

3. **Tabs (Pestañas)**
   - **All** → Todos los Runes
   - **Mine** → Solo mis Runes
   - **Virtual** → Runes creados pero no en Bitcoin aún
   - **Etchings** → Procesos de creación

---

### 🎨 **Crear Rune** (`app/(dashboard)/create/page.tsx`)

**Propósito:** Interfaz para crear (etch) un nuevo Rune

**Componente Principal:** `EnhancedEtchingForm`

**Flujo de Creación:**
```
1. Usuario rellena formulario
   ├─ Nombre del Rune: "QURI•COIN"
   ├─ Símbolo: "♦︎"
   ├─ Decimales: 2
   ├─ Total Supply: 1,000,000
   └─ Premine: 100,000

2. Click en "Create Virtual Rune"
   └─ Se crea en ICP (rápido y barato)

3. Luego click en "Etch to Bitcoin"
   ├─ Se construye transacción Bitcoin
   ├─ Se firma con threshold Schnorr
   └─ Se envía a la red Bitcoin
```

**Validaciones:**
```typescript
// El formulario valida:
✓ Nombre debe tener letras A-Z y puntos
✓ Símbolo debe ser único
✓ Decimales entre 0-18
✓ Total Supply > 0
✓ Premine <= Total Supply
```

---

### 💼 **Billetera** (`app/(dashboard)/wallet/page.tsx`)

**Propósito:** Gestionar tus Runes y ckBTC

**Componentes:**
```
WalletButton → Muestra dirección Bitcoin y balance
WalletModal → Modal con opciones de conexión
   ├─ Internet Identity (ICP)
   └─ Bitcoin Wallets (Xverse, UniSat, Leather, OKX)
```

**Información Mostrada:**
```typescript
interface WalletInfo {
  bitcoinAddress: string;    // bc1q...
  ckbtcBalance: bigint;      // 0.001 BTC
  myRunes: RegistryEntry[];  // Lista de Runes
  totalValue: number;        // Valor total en USD
}
```

---

### 🛡️ **Dead Man's Switch** (`components/deadman/`)

**Propósito:** Herencia automática de Runes

**¿Cómo Funciona?**

Imagina que es como un **testamento digital automático**:

```
1. Tú creas un "switch" (interruptor)
   - Beneficiario: Dirección Bitcoin de tu familia
   - Timeout: 30 días sin conectarte
   - Rune: QURI•COIN
   - Cantidad: 1000 tokens

2. Cada vez que te conectas → Timer se resetea

3. Si pasan 30 días sin conectarte:
   → Los 1000 QURI•COIN se transfieren automáticamente
   → A la dirección Bitcoin de tu beneficiario
```

**Componentes:**
```
DeadManSwitchForm → Crear switch
DeadManSwitchList → Ver tus switches
DeadManSwitchCard → Tarjeta individual
   ├─ Barra de progreso (% de tiempo transcurrido)
   ├─ Botón "Check In" (resetear timer)
   └─ Botón "Cancel" (cancelar el switch)
```

---

### 🔐 **Metadatos Encriptados** (`components/encryption/`)

**Propósito:** Guardar información privada asociada a un Rune

**Ejemplo de Uso:**

Imagina que creas un Rune para tu proyecto y quieres guardar:
- Claves privadas de acceso
- Documentos legales
- Información de inversores

```typescript
// Datos a encriptar
const metadata = {
  legalDocs: "https://...",
  privateKey: "sk_...",
  investorList: ["Alice", "Bob"]
};

// Solo estos usuarios pueden desencriptar
const allowedUsers = [
  Principal.from("alice-principal"),
  Principal.from("bob-principal")
];

// Opcional: Revelar automáticamente después de X tiempo
const revealAfter = Date.now() + (365 * 24 * 60 * 60 * 1000); // 1 año
```

**Tecnología:** vetKeys (Identity-Based Encryption en ICP)

---

## 5. Componentes Interesantes

### 🎴 **RuneCard** (`components/runes/RuneCardPremium.tsx`)

Tarjeta que muestra un Rune individual con estilo premium:

```tsx
<RuneCardPremium rune={rune}>
  {/* Imagen del Rune */}
  <RuneImage src={rune.image} />

  {/* Información */}
  <RuneName>{rune.name}</RuneName>
  <RuneSymbol>{rune.symbol}</RuneSymbol>

  {/* Stats */}
  <Stats>
    <Stat label="Supply" value={formatNumber(rune.totalSupply)} />
    <Stat label="Holders" value={rune.holderCount} />
    <Stat label="Volume" value={formatBTC(rune.volume)} />
  </Stats>

  {/* Botón de acción */}
  <Button onClick={openDetails}>View Details</Button>
</RuneCardPremium>
```

**Características Visuales:**
- Efecto hover (se eleva al pasar el mouse)
- Gradient background (fondo degradado)
- Smooth animations (animaciones suaves)
- Responsive design (se adapta a móviles)

---

### 🔄 **RuneGrid** (`components/runes/RuneGrid.tsx`)

Cuadrícula responsiva de Runes:

```typescript
// Diseño adaptativo
lg: 4 columnas  // Pantallas grandes
md: 3 columnas  // Pantallas medianas
sm: 2 columnas  // Tabletas
xs: 1 columna   // Móviles

// Con animaciones escalonadas (stagger)
{runes.map((rune, index) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }} // Aparecen uno por uno
  >
    <RuneCard rune={rune} />
  </motion.div>
))}
```

---

### 🎯 **ButtonPremium** (`components/ui/ButtonPremium.tsx`)

Botón reutilizable con múltiples variantes:

```tsx
// Variantes
<ButtonPremium variant="gold">      {/* Dorado brillante */}
<ButtonPremium variant="secondary"> {/* Gris elegante */}
<ButtonPremium variant="ghost">     {/* Transparente */}

// Tamaños
<ButtonPremium size="sm">   {/* Pequeño */}
<ButtonPremium size="md">   {/* Mediano (default) */}
<ButtonPremium size="lg">   {/* Grande */}

// Con icono
<ButtonPremium icon={<Sparkles />}>
  Launch App
</ButtonPremium>

// Estados
<ButtonPremium loading>     {/* Muestra spinner */}
<ButtonPremium disabled>    {/* Deshabilitado */}
```

---

### 🔍 **SearchBar** (`components/explorer/SearchBar.tsx`)

Barra de búsqueda con autocompletado:

```typescript
// Características
- Debounce (espera 300ms antes de buscar)
- Highlighting (resalta coincidencias)
- Keyboard navigation (navega con teclado)
- Clear button (botón para limpiar)
```

---

## 6. Flujos de Usuario

### 🎨 **Flujo 1: Crear un Rune**

```
┌─────────────────────────────────────────────────────┐
│ 1. Usuario va a /create                             │
│                                                      │
│ 2. Rellena formulario de etching                    │
│    ├─ Nombre: QURI•COIN                            │
│    ├─ Símbolo: ♦︎                                   │
│    ├─ Decimales: 2                                  │
│    ├─ Total Supply: 1,000,000                       │
│    └─ Premine: 100,000                              │
│                                                      │
│ 3. Click "Create Virtual Rune"                      │
│    └─> POST /api/rune-engine/create_rune           │
│         ├─ Validación en canister                   │
│         └─ Rune creado en ICP (Virtual)             │
│                                                      │
│ 4. Usuario revisa y confirma                        │
│                                                      │
│ 5. Click "Etch to Bitcoin"                          │
│    └─> POST /api/rune-engine/etch_to_bitcoin       │
│         ├─ Selecciona UTXOs (Bitcoin)               │
│         ├─ Construye transacción con Runestone      │
│         ├─ Firma con threshold Schnorr              │
│         └─ Broadcast a Bitcoin network              │
│                                                      │
│ 6. Rune ahora existe en Bitcoin ✅                  │
└─────────────────────────────────────────────────────┘
```

---

### 🔍 **Flujo 2: Explorar Runes**

```
Usuario → Explorer Page
            │
            ├─> useRuneExplorer() hook
            │     │
            │     ├─> Fetch from Registry canister
            │     │    └─> list_runes(offset: 0, limit: 24)
            │     │
            │     └─> TanStack Query (cache + refetch)
            │
            ├─> Muestra en RuneGrid
            │     └─> 24 Runes en cuadrícula
            │
            ├─> Usuario hace scroll ⬇️
            │     └─> Intersection Observer detecta
            │           └─> fetchNextPage()
            │                 └─> list_runes(offset: 24, limit: 24)
            │
            └─> Usuario aplica filtros
                  └─> setFilters({ search: "QURI", sortBy: "volume" })
                        └─> Re-fetch con nuevos parámetros
```

---

### 🛡️ **Flujo 3: Configurar Dead Man's Switch**

```
Usuario → Dashboard → Dead Man's Switch
            │
            ├─> Crea nuevo switch
            │    ├─ Rune: QURI•COIN
            │    ├─ Cantidad: 1000
            │    ├─ Beneficiario: bc1q...familia
            │    └─ Timeout: 30 días
            │
            ├─> POST /api/rune-engine/create_dead_man_switch
            │     └─> Switch creado con ID #42
            │
            ├─> Timer empieza a correr ⏱️
            │
            ├─> Usuario hace "Check In" cada semana
            │     └─> POST /api/rune-engine/dms_checkin
            │           └─> Timer se resetea a 0
            │
            └─> Si pasan 30 días sin check-in:
                  └─> Canister timer detecta expiración
                        └─> process_expired_switches()
                              └─> execute_transfer()
                                    ├─ Construye tx Bitcoin
                                    ├─ Firma con threshold
                                    └─ Broadcast
                                          └─> 1000 QURI•COIN → beneficiario ✅
```

---

## 7. Tecnologías Utilizadas

### 🎨 **Frontend**

| Tecnología | Propósito | ¿Por qué? |
|-----------|-----------|-----------|
| **Next.js 14** | Framework React | App Router, SSR, mejor SEO |
| **TypeScript** | Tipado estático | Menos bugs, mejor DX |
| **Tailwind CSS** | Estilos utility-first | Rápido, consistente, responsivo |
| **Framer Motion** | Animaciones | Suaves, declarativas, GPU-accelerated |
| **TanStack Query** | Estado servidor | Cache, refetch, optimistic updates |
| **Zustand** | Estado global | Simple, sin boilerplate |
| **Lucide Icons** | Iconos | Modernos, tree-shakeable |

### 🔗 **Integración ICP**

| Tecnología | Propósito |
|-----------|-----------|
| **@dfinity/agent** | Cliente HTTP para ICP |
| **@dfinity/auth-client** | Internet Identity |
| **@dfinity/candid** | Serialización de datos |
| **@dfinity/identity** | Gestión de identidades |

### 🎯 **Herramientas de Desarrollo**

```bash
# Package Manager
pnpm  # Más rápido que npm

# Linting
ESLint + Prettier  # Código consistente

# Type Checking
TypeScript strict mode  # Máxima seguridad

# Build
Turbopack (Next.js)  # Build ultra-rápido
```

---

## 8. Conceptos Avanzados Explicados

### 🔄 **React Hooks Personalizados**

Los hooks son como **funciones especiales** que te dan "superpoderes" en React:

```typescript
// ❌ SIN hooks (difícil de mantener)
class RuneExplorer extends React.Component {
  state = { runes: [], loading: true };

  componentDidMount() {
    fetch('/api/runes').then(/* ... */);
  }

  render() {
    return <div>{/* JSX */}</div>;
  }
}

// ✅ CON hooks (limpio y reutilizable)
function RuneExplorer() {
  const { runes, loading } = useRuneExplorer();

  return <div>{/* JSX */}</div>;
}
```

**Ejemplo: useRuneExplorer()**

```typescript
export function useRuneExplorer(options) {
  // Estado
  const [runes, setRunes] = useState([]);
  const [filters, setFilters] = useState({});

  // TanStack Query (maneja cache, loading, errors automáticamente)
  const query = useInfiniteQuery({
    queryKey: ['runes', filters],  // Key única para cache
    queryFn: ({ pageParam = 0 }) => {
      // Llama al canister
      return registry.list_runes(pageParam, 24);
    },
    getNextPageParam: (lastPage, pages) => {
      // Calcula siguiente offset
      return pages.length * 24;
    }
  });

  // Retorna datos + funciones
  return {
    runes: query.data?.pages.flat() ?? [],
    loading: query.isLoading,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    setFilters,
    // ...
  };
}
```

**Ventajas:**
1. **Reutilizable** - Usa el hook en múltiples componentes
2. **Testable** - Fácil de testear por separado
3. **Separation of Concerns** - Lógica separada de UI
4. **Cache automático** - TanStack Query maneja el cache
5. **Optimistic Updates** - UI se actualiza antes de que el servidor responda

---

### 🎭 **Server vs Client Components (Next.js 14)**

Next.js 14 introduce un concepto importante:

```typescript
// 🖥️ SERVER COMPONENT (default)
// Se renderiza en el servidor, no envía JavaScript al cliente
export default async function StaticPage() {
  const data = await fetchData(); // Puede ser async

  return <div>{data}</div>;
}

// 📱 CLIENT COMPONENT (explícito)
'use client';  // ← Directiva mágica

export default function InteractivePage() {
  const [count, setCount] = useState(0); // Necesita cliente

  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**¿Cuándo usar cada uno?**

| Server Component | Client Component |
|-----------------|------------------|
| Fetch de datos | useState/useEffect |
| Lógica de backend | Event handlers (onClick, etc) |
| SEO importante | Animaciones |
| No necesita interactividad | Modales, dropdowns |
| **Ejemplo:** About page | **Ejemplo:** Explorer (filtros, search) |

---

### 🚀 **Optimistic Updates**

Hacer que la UI se sienta **ultra-rápida** asumiendo que la operación tendrá éxito:

```typescript
// ❌ SIN Optimistic Update (lento)
async function likeRune(runeId) {
  setLoading(true);
  await api.like(runeId);        // Espera respuesta (lento)
  await refetch();               // Vuelve a pedir datos
  setLoading(false);
}
// Usuario ve spinner por 2-3 segundos 😴

// ✅ CON Optimistic Update (rápido)
async function likeRune(runeId) {
  // 1. Actualiza UI inmediatamente
  setLikes(prev => prev + 1);

  // 2. Envía request en background
  try {
    await api.like(runeId);
  } catch (error) {
    // 3. Si falla, revierte cambio
    setLikes(prev => prev - 1);
    toast.error('Failed to like');
  }
}
// Usuario ve cambio instantáneo ⚡
```

---

### 🔐 **Identity-Based Encryption (vetKeys)**

Concepto complejo explicado simple:

**Problema:**
- Quieres que solo **Alice** pueda leer un mensaje
- Pero no quieres compartir una clave con Alice de antemano

**Solución tradicional (complicada):**
```
1. Alice genera par de claves (pública + privada)
2. Alice te envía su clave pública
3. Tú encriptas con su clave pública
4. Alice desencripta con su clave privada
```

**Solución vetKeys (mágica):**
```
1. Tú encriptas con la IDENTIDAD de Alice (su Principal ID)
2. Alice pide la clave al canister
3. Canister verifica que es Alice
4. Canister le da la clave derivada de su identidad
5. Alice desencripta
```

**Código:**
```typescript
// Encriptar para Alice
const encrypted = await encryptMetadata({
  runeId: "QURI•COIN",
  data: { secret: "Top secret info" },
  allowedUsers: [alicePrincipal], // Solo Alice puede leer
  revealAfter: futureTimestamp,    // O revelar automáticamente después
});

// Alice desencripta (solo si está autorizada)
const decryptionKey = await getDecryptionKey(
  "QURI•COIN",
  aliceEncryptionPublicKey
);
const decrypted = decrypt(encrypted, decryptionKey);
```

---

### ♾️ **Infinite Scroll con Intersection Observer**

Cargar más contenido automáticamente al hacer scroll:

**Concepto:**
```
┌───────────────────┐
│   Contenido       │ ← Usuario ve esto
│   visible         │
├───────────────────┤
│ [Trigger element] │ ← Elemento invisible "centinela"
├───────────────────┤
│   No cargado aún  │
└───────────────────┘

Cuando el centinela entra en viewport → Cargar más
```

**Implementación:**
```typescript
const loadMoreRef = useRef(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      // Detecta cuando el elemento entra en viewport
      if (entries[0].isIntersecting && hasMore) {
        fetchNextPage(); // Carga siguiente página
      }
    },
    {
      threshold: 0.1,      // Trigger al 10% visible
      rootMargin: '100px'  // Pre-carga 100px antes
    }
  );

  if (loadMoreRef.current) {
    observer.observe(loadMoreRef.current);
  }

  return () => observer.disconnect(); // Cleanup
}, [hasMore, fetchNextPage]);

// En el JSX
<div>
  {runes.map(rune => <RuneCard key={rune.id} rune={rune} />)}

  {/* Elemento centinela invisible */}
  <div ref={loadMoreRef} className="h-10" />
</div>
```

---

### 🎨 **Design System con Tokens**

QURI tiene un sistema de diseño basado en **tokens** (variables):

```typescript
// design-system/tokens/index.ts
export const tokens = {
  // Colores semánticos
  colors: {
    'museum-white': '#FEFBF6',
    'museum-cream': '#F5F1E8',
    'gold-400': '#F59E0B',
    'gold-500': '#D97706',
    // ...
  },

  // Espaciado consistente
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },

  // Tipografía
  fonts: {
    serif: 'Playfair Display',
    sans: 'Inter',
  },

  // Animaciones
  motion: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    }
  }
};
```

**Uso en Tailwind:**
```tsx
<div className="
  bg-museum-white           {/* Color del sistema */}
  p-md                      {/* Espaciado consistente */}
  font-serif                {/* Tipografía definida */}
  duration-normal           {/* Animación estándar */}
">
  Content
</div>
```

**Ventajas:**
1. **Consistencia** - Todos usan los mismos valores
2. **Mantenibilidad** - Cambias en un lugar, se actualiza todo
3. **Accesibilidad** - Contrastes calculados correctamente
4. **Theming** - Fácil crear tema oscuro

---

## 📝 Resumen Final

### ✅ Lo que Aprendiste

1. **Qué es QURI Protocol** - Plataforma para crear/gestionar Bitcoin Runes
2. **Arquitectura** - Next.js frontend + ICP canisters backend
3. **Páginas principales** - Home, Explorer, Create, Wallet, Dead Man's Switch
4. **Componentes clave** - RuneCard, RuneGrid, ButtonPremium
5. **Flujos de usuario** - Crear Rune, Explorar, Configurar herencia
6. **Tecnologías** - Next.js, TypeScript, TanStack Query, Tailwind
7. **Conceptos avanzados** - Hooks, Optimistic Updates, vetKeys, Infinite Scroll

### 🚀 Siguiente Nivel

Para profundizar más:

1. **Explora el código:**
   ```bash
   cd frontend
   code . # Abre en VS Code
   ```

2. **Ejecuta localmente:**
   ```bash
   npm install
   npm run dev
   # Abre http://localhost:3000
   ```

3. **Lee la documentación de las tecnologías:**
   - [Next.js Docs](https://nextjs.org/docs)
   - [TanStack Query](https://tanstack.com/query/latest)
   - [Framer Motion](https://www.framer.com/motion/)
   - [ICP Docs](https://internetcomputer.org/docs)

4. **Experimenta:**
   - Modifica colores en `design-system/tokens`
   - Crea un componente nuevo
   - Añade una nueva página

### 💡 Preguntas para Reflexionar

1. ¿Por qué usar Next.js en lugar de React puro?
2. ¿Qué ventajas tiene TanStack Query sobre fetch directo?
3. ¿Cómo beneficia TypeScript al proyecto?
4. ¿Por qué separar hooks de componentes?
5. ¿Qué problema resuelve el Dead Man's Switch?

---

**¡Felicitaciones!** 🎉 Ahora tienes una comprensión sólida del frontend de QURI Protocol.

**Creado para estudiantes que quieren aprender desarrollo web3 moderno.**
