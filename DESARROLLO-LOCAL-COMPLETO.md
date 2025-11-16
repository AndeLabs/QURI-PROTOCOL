# 🚀 Desarrollo Local Completo - QURI Protocol

## ✅ Sistema Totalmente Configurado

Este documento describe el setup final **production-ready** para desarrollo local del QURI Protocol.

## 🎯 Componentes del Sistema

### Backend (Internet Computer)

Todos los canisters corriendo en `http://127.0.0.1:8000`:

| Canister | ID | Función |
|----------|-------|---------|
| `internet_identity` | `ucwa4-rx777-77774-qaada-cai` | Autenticación (Development Build) |
| `rune-engine` | `umunu-kh777-77774-qaaca-cai` | Lógica de Runes |
| `bitcoin-integration` | `uxrrr-q7777-77774-qaaaq-cai` | Integración Bitcoin |
| `registry` | `uzt4z-lp777-77774-qaabq-cai` | Registro de Runes |
| `identity-manager` | `u6s2n-gx777-77774-qaaba-cai` | Gestión de identidades |

### Frontend (Next.js)

- **URL**: http://localhost:3000
- **Configuración**: `.env.development` (auto-cargado)
- **CSP**: Configurado para permitir localhost en desarrollo

## 🔧 Comandos de Inicio

### 1️⃣ Iniciar Backend ICP

```bash
# Iniciar replica local
dfx start --clean --background

# Desplegar todos los canisters
dfx deploy
```

### 2️⃣ Iniciar Frontend

```bash
cd frontend
npm run dev
```

El frontend se conecta automáticamente al backend local en puerto 8000.

## 🔐 Autenticación Local

### Internet Identity en Desarrollo

**URL Local**: http://ucwa4-rx777-77774-qaada-cai.localhost:8000

**Características**:
- ✅ **Development Build**: Sin necesidad de WebAuthn real
- ✅ **Sin proxy**: Funciona 100% offline
- ✅ **Fácil testing**: Crea identidades instantáneamente
- ✅ **Sin CAPTCHA**: Ideal para desarrollo

### Flujo de Autenticación

1. Usuario hace click en "Create Rune" o botón de login
2. Se redirige a Internet Identity **local**
3. Internet Identity crea/autentica la identidad
4. Usuario es redirigido de vuelta al frontend con identity
5. Frontend puede hacer llamadas autenticadas a los canisters

## 📁 Archivos de Configuración Clave

### `dfx.json`

```json
{
  "canisters": {
    "internet_identity": {
      "type": "custom",
      "candid": "https://github.com/dfinity/internet-identity/releases/latest/download/internet_identity.did",
      "wasm": "https://github.com/dfinity/internet-identity/releases/latest/download/internet_identity_dev.wasm.gz",
      "remote": {
        "id": {
          "ic": "rdmx6-jaaaa-aaaaa-aaadq-cai"
        }
      }
    }
  }
}
```

**Nota**: El `remote.id` previene desplegar II duplicado en mainnet.

### `frontend/.env.development`

Configuración auto-cargada por Next.js en desarrollo:

```bash
# ICP Local
NEXT_PUBLIC_IC_HOST=http://127.0.0.1:8000
NEXT_PUBLIC_IC_NETWORK=local

# Canister IDs
NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID=ucwa4-rx777-77774-qaada-cai
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=umunu-kh777-77774-qaaca-cai
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=uxrrr-q7777-77774-qaaaq-cai
NEXT_PUBLIC_REGISTRY_CANISTER_ID=uzt4z-lp777-77774-qaabq-cai

# Bitcoin
NEXT_PUBLIC_BITCOIN_NETWORK=testnet
```

### `frontend/lib/icp/agent.ts`

Configuración automática de Internet Identity:

```typescript
const II_CANISTER_ID = process.env.NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID;

const identityProvider = IS_LOCAL_DEV
  ? `http://${II_CANISTER_ID}.localhost:8000/#authorize`
  : `https://identity.ic0.app`;
```

## 🛠️ Solución de Problemas

### Problema 1: CSP blocking localhost

**Error**: `Refused to connect to http://127.0.0.1:8000`

**Solución**: `frontend/middleware.ts` detecta `NODE_ENV=development` y añade localhost al CSP automáticamente.

### Problema 2: Internet Identity no carga

**Verificar**:
```bash
# Debe retornar 200
curl -s -o /dev/null -w "%{http_code}" "http://ucwa4-rx777-77774-qaada-cai.localhost:8000/"
```

**Si falla**:
```bash
dfx canister status internet_identity
```

### Problema 3: Anonymous principal rechazado

**Causa**: El backend requiere autenticación real.

**Solución**: Internet Identity local ya configurado. No usar anonymous identity.

## 📊 Actualizar Canister IDs

Si redesplegas los canisters y sus IDs cambian:

```bash
cd frontend
npm run update:canister-ids
```

Este script actualiza automáticamente `.env.development` con los nuevos IDs.

## 🎯 Testing End-to-End

### Crear una Rune de Prueba

1. **Abrir**: http://localhost:3000
2. **Autenticar** con Internet Identity local
3. **Ir a** "Create Rune" o formulario de etching
4. **Completar**:
   - Symbol: `TEST•RUNE`
   - Amount: `1000000000`
   - Divisibility: `8`
   - Terms: `Open Mint` o configuración custom
5. **Metadata** (opcional): Logo, descripción
6. **Submit**: Crear Rune

### Flujo del Sistema

```
1. Frontend → Upload metadata a IPFS (Pinata)
2. Frontend → Call rune_engine.create_rune()
3. rune_engine → Validate data
4. rune_engine → Call bitcoin_integration.create_transaction()
5. bitcoin_integration → Create Bitcoin etching transaction
6. rune_engine → Track confirmation
7. User → Receives transaction ID
```

## 🔒 Seguridad en Desarrollo

- ✅ **CSP**: Configurado para desarrollo y producción
- ✅ **CORS**: Manejado por ICP boundary nodes
- ✅ **Authentication**: Internet Identity local
- ✅ **Keys**: IPFS JWT en .env (no commitear .env.local)

## 🚀 Deployment a Mainnet

Para desplegar a mainnet:

1. **Configurar**: `.env.production` con canister IDs de mainnet
2. **Deploy backend**:
   ```bash
   dfx deploy --network ic
   ```
3. **Update frontend env**:
   ```bash
   npm run update:canister-ids:mainnet
   ```
4. **Deploy frontend**: Vercel/Netlify con vars de entorno de producción

## 📚 Recursos

- [Internet Identity Docs](https://internetcomputer.org/docs/current/developer-docs/integrations/internet-identity/integrate-identity)
- [Development Build Info](https://github.com/dfinity/internet-identity/blob/main/demos/using-dev-build/README.md)
- [ICP Hackathon Cheat Sheet](https://www.notion.so/ICP-Hackathon-Cheat-Sheet)
- [DFINITY Examples](https://github.com/dfinity/examples)

---

## ✨ Resumen

Tu sistema ahora tiene:

✅ Backend ICP completamente funcional
✅ Internet Identity local (development build)
✅ Frontend configurado automáticamente
✅ CSP correcto para desarrollo
✅ Sin problemas de proxy/red
✅ Ready para testing y desarrollo

**¡A crear Runes!** 🎉
