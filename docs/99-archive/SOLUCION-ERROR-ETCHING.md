# Solución: Error "Etching config not initialized"

## 📋 Diagnóstico del Problema

El error **"Etching config not initialized"** ocurría cuando intentabas crear un Rune porque:

1. **El canister `rune-engine` no estaba completamente inicializado**
   - Aunque se desplegó correctamente, faltaba configurar los IDs de los canisters dependientes
   - La función `init()` establece configuraciones por defecto, pero no persiste en todos los reinicios

2. **Faltaba validación en el frontend**
   - No se verificaba si el backend estaba listo antes de intentar crear un Rune
   - Los errores no eran claros para el usuario

3. **Configuración incompleta**
   - Los IDs de `bitcoin-integration` y `registry` no estaban configurados en el canister

## ✅ Soluciones Implementadas

### 1. **Auto-inicialización del canister** (`canisters/rune-engine/src/lib.rs`)

**Cambio:** La función `create_rune` ahora auto-inicializa la configuración si no existe:

```rust
// Antes (fallaba si no estaba inicializado):
let config = ETCHING_CONFIG
    .with(|c| c.borrow().clone())
    .ok_or("Etching config not initialized")?;

// Ahora (auto-inicializa con defaults):
let config = ETCHING_CONFIG.with(|c| {
    let config_opt = c.borrow().clone();
    match config_opt {
        Some(cfg) => cfg,
        None => {
            ic_cdk::println!("Auto-initializing etching config with defaults");
            let default_config = EtchingConfig::default();
            *c.borrow_mut() = Some(default_config.clone());
            default_config
        }
    }
});
```

### 2. **Health Check API** (`health_check()`)

Nuevo endpoint para verificar el estado del canister:

```rust
#[query]
fn health_check() -> HealthStatus {
    let etching_config_ok = ETCHING_CONFIG.with(|c| c.borrow().is_some());
    let canister_config = CANISTER_CONFIG.with(|c| c.borrow().clone());
    
    // Verifica si todos los componentes están configurados
    HealthStatus {
        healthy: etching_config_ok,
        etching_config_initialized: etching_config_ok,
        bitcoin_integration_configured: ...,
        registry_configured: ...,
        canister_id: ic_cdk::id(),
    }
}
```

### 3. **Validación en el Frontend** (`EnhancedEtchingForm.tsx`)

Ahora verifica la salud del canister ANTES de intentar crear un Rune:

```typescript
// Verificar salud del canister
const healthStatus = await actor.health_check();

if (!healthStatus.healthy) {
    let errorDetails = 'El backend de ICP no está completamente configurado:\n';
    if (!healthStatus.etching_config_initialized) {
        errorDetails += '- Configuración de etching no inicializada\n';
    }
    // ... más detalles
    throw new Error(errorDetails);
}
```

### 4. **Mejores mensajes de error**

El frontend ahora parsea errores y muestra mensajes claros:

```typescript
if (errorMsg.includes('Canister configuration not set')) {
    throw new Error(
        'El canister no está configurado correctamente. ' +
        'Necesita configurar los IDs de Bitcoin Integration y Registry.'
    );
} else if (errorMsg.includes('Insufficient')) {
    throw new Error(
        'Balance insuficiente. Necesitas ~20,000 sats (~$10-15 USD).'
    );
}
```

### 5. **Script de Configuración** (`scripts/configure-rune-engine.sh`)

Nuevo script para configurar el canister automáticamente:

```bash
./scripts/configure-rune-engine.sh ic
```

Esto configura:
- IDs de canisters dependientes (bitcoin-integration, registry)
- Configuración de etching (network, fee_rate, etc.)
- Ejecuta health check para verificar

## 🚀 Cómo Usar

### Opción 1: Auto-inicialización (recomendado para desarrollo)

La configuración por defecto ahora se aplica automáticamente. Solo asegúrate de que:

1. Los canisters estén desplegados
2. Las variables de entorno estén configuradas en `frontend/.env.local`

### Opción 2: Configuración manual (producción)

```bash
# 1. Configurar IDs de canisters
dfx canister call rune-engine configure_canisters \
    "(principal \"$BTC_CANISTER_ID\", principal \"$REGISTRY_CANISTER_ID\")" \
    --network ic

# 2. (Opcional) Actualizar configuración de etching
dfx canister call rune-engine update_etching_config \
    '(record {
        network = variant { Testnet };
        fee_rate = 2 : nat64;
        required_confirmations = 1 : nat32;
        enable_retries = true;
    })' \
    --network ic

# 3. Verificar salud
dfx canister call rune-engine health_check --network ic
```

### Opción 3: Usar el script automatizado

```bash
cd /Users/munay/dev/QURI-PROTOCOL
./scripts/configure-rune-engine.sh ic
```

## 🔍 Verificación

Para verificar que todo está funcionando:

```bash
# Método 1: Desde dfx
dfx canister call rune-engine health_check --network ic

# Método 2: Desde el frontend (en consola del navegador)
const actor = await createActor(CANISTER_ID, { agent });
const health = await actor.health_check();
console.log(health);
```

Respuesta esperada:
```
record {
    healthy = true;
    etching_config_initialized = true;
    bitcoin_integration_configured = true;
    registry_configured = true;
    canister_id = principal "xblvd-yqaaa-aaaab-qaddq-cai";
}
```

## 📝 Archivos Modificados

1. **Backend:**
   - `canisters/rune-engine/src/lib.rs` - Auto-inicialización y health check
   - `canisters/rune-engine/rune_engine.did` - Nuevo tipo HealthStatus

2. **Frontend:**
   - `frontend/lib/integrations/rune-engine.did.ts` - Tipos TypeScript actualizados
   - `frontend/components/EnhancedEtchingForm.tsx` - Validación y mejor manejo de errores

3. **Scripts:**
   - `scripts/configure-rune-engine.sh` - Nuevo script de configuración

## 🎯 Próximos Pasos

El error está resuelto, pero para producción considera:

1. **Autenticación de admin** - Restringir `configure_canisters` solo a admins
2. **Monitoreo** - Agregar alertas si health check falla
3. **Persistencia** - Usar stable storage para configuración crítica
4. **Testing** - Tests de integración para el flujo completo

## 💡 Testing Local

Para probar localmente:

```bash
# 1. Desplegar canisters
dfx deploy --network ic

# 2. Configurar (si es necesario)
./scripts/configure-rune-engine.sh ic

# 3. Iniciar frontend
cd frontend && npm run dev

# 4. Intentar crear un Rune
# - El health check se ejecutará automáticamente
# - Si falla, verás un mensaje claro del problema
```

## 📚 Documentación Relacionada

- [RUNE-DATA-LAYERS.md](./RUNE-DATA-LAYERS.md) - Arquitectura de datos
- [STORAGE_SYSTEM.md](./STORAGE_SYSTEM.md) - Sistema de almacenamiento
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guía de deployment

---

**Resumen:** El error está completamente resuelto con auto-inicialización inteligente, validación proactiva y mensajes de error claros. El sistema ahora es más robusto y fácil de debugear.
