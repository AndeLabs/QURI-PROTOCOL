# 🚀 Pasos para Aplicar la Solución

## ✅ Cambios Ya Implementados en el Código

Todos los cambios están listos en los archivos. Solo necesitas redesplegar.

## 📋 Pasos a Seguir

### 1. Verificar que tienes dfx instalado

```bash
dfx --version
```

Si no lo tienes, instálalo:
```bash
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### 2. Compilar el canister actualizado

```bash
cd /Users/munay/dev/QURI-PROTOCOL

# Compilar solo rune-engine
dfx build rune-engine --network ic
```

### 3. Redesplegar el canister

```bash
# Esto aplicará todos los cambios:
# - Auto-inicialización
# - Health check
# - Mejores mensajes de error

dfx deploy rune-engine --network ic
```

### 4. Configurar los canisters dependientes

```bash
# Usar el script automatizado
chmod +x scripts/configure-rune-engine.sh
./scripts/configure-rune-engine.sh ic
```

O manualmente:

```bash
# Leer IDs de .env.local
source frontend/.env.local

# Configurar
dfx canister call $NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID configure_canisters \
  "(principal \"$NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID\", principal \"$NEXT_PUBLIC_REGISTRY_CANISTER_ID\")" \
  --network ic
```

### 5. Verificar que funciona

```bash
# Health check
dfx canister call $NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID health_check --network ic
```

Deberías ver:
```
record {
  healthy = true;
  etching_config_initialized = true;
  bitcoin_integration_configured = true;
  registry_configured = true;
  canister_id = principal "xblvd-yqaaa-aaaab-qaddq-cai";
}
```

### 6. Reiniciar el frontend

```bash
cd frontend
npm run dev
```

### 7. Probar crear un Rune

Ahora cuando intentes crear un Rune:
- ✅ El health check se ejecutará automáticamente
- ✅ Verás mensajes claros si algo falla
- ✅ El canister se auto-inicializará si es necesario

## 🔧 Troubleshooting

### Si el health check muestra `bitcoin_integration_configured = false`:

```bash
dfx canister call rune-engine configure_canisters \
  "(principal \"363tq-3yaaa-aaaab-qacma-cai\", principal \"6qg6m-4aaaa-aaaab-qacqq-cai\")" \
  --network ic
```

### Si aún sale error de "Etching config not initialized":

El código ahora tiene auto-inicialización. Si ves este error después del deploy, significa que el deploy no se completó correctamente. Intenta:

```bash
# Upgrade forzado
dfx canister install rune-engine --mode upgrade --network ic
```

### Si usas IC Playground:

⚠️ **IMPORTANTE:** IC Playground expira cada 20 minutos. Considera usar:
- IC Mainnet (producción)
- Local replica (desarrollo)
- Tu propia subnet (staging)

## 📊 Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `canisters/rune-engine/src/lib.rs` | ✅ Auto-init + health_check() |
| `canisters/rune-engine/rune_engine.did` | ✅ Tipo HealthStatus |
| `frontend/lib/integrations/rune-engine.did.ts` | ✅ TypeScript types |
| `frontend/components/EnhancedEtchingForm.tsx` | ✅ Validación + mejores errores |
| `scripts/configure-rune-engine.sh` | ✅ Script de configuración |

## 🎯 Próximo Test

Una vez desplegado, intenta crear un Rune con estos datos de prueba:

- **Rune Name:** `TEST•RUNE`
- **Symbol:** `TEST`
- **Divisibility:** 8
- **Premine:** 1000000
- **Imagen:** Cualquier SVG/PNG pequeño

El sistema ahora mostrará mensajes claros en cada paso del proceso.

---

**Nota:** Si necesitas ayuda durante el deployment, avísame y te puedo guiar paso a paso.
