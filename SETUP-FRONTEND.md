# 🎨 Configuración del Frontend - Guía Definitiva

Esta guía soluciona los problemas recurrentes de configuración del frontend.

## 🎯 Problema Resuelto

**Antes**: Cada vez que deployabas, tenías que:
- Actualizar manualmente `.env.local`
- Copiar canister IDs
- Reiniciar el frontend
- Lidiar con errores de CSP
- Problemas de cache

**Ahora**: Todo es automático 🎉

---

## 📁 Archivos de Configuración

### `.env.development` (Auto-cargado en desarrollo)
```bash
# Next.js carga este archivo automáticamente en modo desarrollo
# NO necesitas .env.local
```

### `.env.production` (Para builds de producción)
```bash
# Se usa al hacer: npm run build
# Para deploy a Vercel/mainnet
```

### `.env.local` (DEPRECADO - Ya no lo uses)
```bash
# Este archivo causaba problemas
# Ahora usa .env.development
```

---

## 🚀 Comandos Mejorados

### Desarrollo Local

```bash
# Opción 1: Inicio normal
npm run dev

# Opción 2: Inicio limpio (borra cache)
npm run dev:clean

# Opción 3: Actualizar canister IDs después de deploy
npm run update:canister-ids
```

### Producción/Mainnet

```bash
# Actualizar canister IDs de mainnet
npm run update:canister-ids:mainnet

# Build para producción
npm run build

# Iniciar en producción
npm start
```

---

## 🔄 Workflow Completo

### Primera Vez

```bash
# 1. Instalar dependencias
cd frontend
npm install

# 2. Iniciar desarrollo
npm run dev
```

### Después de Deploy de Canisters

```bash
# En el root del proyecto
cd /Users/munay/dev/QURI-PROTOCOL

# Deploy canisters
dfx deploy

# Actualizar frontend automáticamente
cd frontend
npm run update:canister-ids

# Reiniciar (Ctrl+C y luego)
npm run dev
```

### Script All-in-One

```bash
# Desde el root del proyecto
./scripts/update-frontend-env.sh local

# O para mainnet
./scripts/update-frontend-env.sh ic
```

---

## 🛠️ Solución a Problemas Comunes

### ❌ Error: "CSP blocks localhost:8000"

**Causa**: Cache de Next.js o navegador

**Solución**:
```bash
# Opción 1: Limpiar cache de Next.js
npm run dev:clean

# Opción 2: Usar navegador en modo incógnito
# Opción 3: Limpiar cache del navegador (F12 > Network > Disable cache)
```

### ❌ Error: "Canister ID not found"

**Causa**: `.env.development` tiene IDs antiguos

**Solución**:
```bash
npm run update:canister-ids
```

### ❌ Error: "Failed to fetch"

**Causa**: dfx no está corriendo o puerto incorrecto

**Solución**:
```bash
# Verificar que dfx está corriendo
dfx ping

# Si no responde, iniciar
dfx start --background

# Verificar puerto en .env.development
cat .env.development | grep IC_HOST
# Debe ser: http://127.0.0.1:8000
```

### ❌ Error: "Cannot connect to Internet Identity"

**Causa**: Problema de proxy o Internet Identity no accesible

**Solución**: Ya implementado
```typescript
// El código ahora usa identity anónimo en desarrollo local
// No necesitas Internet Identity para desarrollo
```

---

## 📝 Jerarquía de Variables de Entorno

Next.js carga archivos en este orden (el último sobreescribe al anterior):

1. `.env` (base, para todos los ambientes)
2. `.env.local` (local overrides, **gitignored**)
3. `.env.development` (solo desarrollo, **committeado**)
4. `.env.production` (solo producción, **committeado**)
5. `.env.development.local` (desarrollo local, **gitignored**)
6. `.env.production.local` (producción local, **gitignored**)

**Nuestra configuración**:
- ✅ `.env.development` - Para desarrollo local
- ✅ `.env.production` - Para producción
- ❌ `.env.local` - NO usar (causaba problemas)

---

## 🎯 Checklist de Troubleshooting

Cuando algo no funcione:

- [ ] 1. dfx está corriendo: `dfx ping`
- [ ] 2. Canisters deployados: `dfx canister id rune-engine`
- [ ] 3. Variables actualizadas: `npm run update:canister-ids`
- [ ] 4. Cache limpio: `npm run dev:clean`
- [ ] 5. Puerto correcto: `.env.development` tiene `8000`
- [ ] 6. Navegador en incógnito (para evitar cache)
- [ ] 7. DevTools abierto (F12) para ver errores exactos

---

## 🔧 Configuración Avanzada

### Cambiar Puerto de dfx

Si necesitas usar un puerto diferente:

```bash
# 1. Editar dfx.json
{
  "networks": {
    "local": {
      "bind": "127.0.0.1:4943"  // Cambiar aquí
    }
  }
}

# 2. Actualizar .env.development
NEXT_PUBLIC_IC_HOST=http://127.0.0.1:4943

# 3. Reiniciar todo
dfx start --clean --background
npm run dev:clean
```

### Variables Adicionales

Puedes agregar más variables a `.env.development`:

```bash
# Ejemplo: Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_DEBUG_MODE=true

# Ejemplo: API keys adicionales
NEXT_PUBLIC_OTHER_API_KEY=xxx
```

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [dfx.json Configuration](https://internetcomputer.org/docs/current/references/cli-reference/dfx-json-reference)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## ✅ Resumen

**Antes** (problemático):
```bash
# Manual, propenso a errores
1. dfx deploy
2. dfx canister id rune-engine  # copiar
3. Editar .env.local            # pegar
4. Ctrl+C frontend
5. npm run dev
6. Limpiar cache del navegador
7. Rezar que funcione 🙏
```

**Ahora** (automatizado):
```bash
# Automático, confiable
1. dfx deploy
2. npm run update:canister-ids
3. npm run dev:clean
# ¡Listo! 🎉
```

---

**Última actualización**: 2025-11-14  
**Problemas resueltos**: CSP, cache, canister IDs, Internet Identity
