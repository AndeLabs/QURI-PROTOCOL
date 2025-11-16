# 🚀 Guía Rápida de Deployment - QURI Protocol

## ⚡ Deployment Inmediato a Testnet

### Paso 1: Verificar dfx (30 segundos)

```bash
# Verificar que dfx esté instalado
dfx --version

# Si no está instalado:
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### Paso 2: Verificar Identidad (30 segundos)

```bash
# Ver identidad actual
dfx identity whoami

# Si es 'default', crear una nueva (recomendado)
dfx identity new testnet-deploy
dfx identity use testnet-deploy

# Obtener tu principal
dfx identity get-principal
```

### Paso 3: Build Todos los Canisters (2-3 minutos)

```bash
cd /Users/munay/dev/QURI-PROTOCOL

# Build todos
dfx build --all

# Si hay errores de compilación, verlos:
cargo build --target wasm32-unknown-unknown --release
```

### Paso 4: Deploy a Testnet (5-10 minutos)

```bash
# Opción A: Usar el script automático (RECOMENDADO)
./scripts/deploy-production.sh ic-testnet

# Opción B: Deployment manual paso a paso
# (solo si el script falla)
```

### Paso 5: Verificar Deployment (2 minutos)

```bash
# Ejecutar test suite
./scripts/test-deployment.sh ic-testnet

# Ver logs para verificar timers
dfx canister logs rune-engine --network ic-testnet
```

---

## 🔧 Si Hay Errores de Compilación

### Error: "raw_rand not found"

Puede que necesites actualizar dependencias:

```bash
# En canisters/identity-manager/Cargo.toml
[dependencies]
ic-cdk = "0.12"  # Asegúrate de tener versión reciente
ic-cdk-macros = "0.8"
```

### Error: "module not found: rbac"

```bash
# Verificar que el archivo existe
ls -la canisters/rune-engine/src/rbac.rs

# Verificar que está en lib.rs
grep "mod rbac" canisters/rune-engine/src/lib.rs
```

### Error: "StableBTreeMap trait bounds"

Esto significa que necesitas implementar `Storable` para algunos tipos. Ya lo implementé para `RateLimitData` en identity-manager, pero si ves este error en otros lugares, avísame.

---

## ⚠️ Nota Importante: Placeholder de Confirmations

El módulo `confirmation_tracker.rs` tiene un **PLACEHOLDER** en la función `get_transaction_confirmations()` (línea ~340).

Para deployment a testnet está OK (solo para testing), pero para MAINNET **DEBES reemplazarlo**.

Para testnet, el placeholder funcionará para probar el flujo completo.

---

## 📊 Qué Esperar Después del Deployment

### Inmediatamente:
- ✅ Health check debería retornar `healthy: true`
- ✅ Owner configurado con tu principal
- ✅ Bitcoin Integration y Registry configurados

### Después de 10 minutos:
- ✅ Fee estimates cacheados (primer timer run)
- ✅ Logs mostrando timer execution

### Para probar end-to-end:
```bash
# Crear un Rune de prueba
dfx canister call rune-engine create_rune \
  '(record {
    rune_name = "TEST•QURI•DEPLOY";
    symbol = "TQD";
    divisibility = 8;
    premine = 1000000;
    terms = null;
  })' \
  --network ic-testnet
```

---

## 🆘 Si Algo Falla

### El script de deployment falla:

**Opción 1**: Revisar el error y corregir

**Opción 2**: Deployment manual:

```bash
# Deploy Bitcoin Integration primero
dfx deploy bitcoin-integration \
  --network ic-testnet \
  --argument '(variant { Testnet }, principal "aaaaa-aa")'

# Deploy Registry
dfx deploy registry --network ic-testnet

# Deploy Identity Manager
dfx deploy identity-manager --network ic-testnet

# Deploy Rune Engine (último)
dfx deploy rune-engine --network ic-testnet

# Obtener IDs
BITCOIN_ID=$(dfx canister id bitcoin-integration --network ic-testnet)
REGISTRY_ID=$(dfx canister id registry --network ic-testnet)

# Configurar Rune Engine
dfx canister call rune-engine configure_canisters \
  "(principal \"$BITCOIN_ID\", principal \"$REGISTRY_ID\")" \
  --network ic-testnet

# Health check
dfx canister call rune-engine health_check --network ic-testnet
```

---

## 💡 Tips

1. **Primera vez con ICP?**: El deployment puede tardar 5-10 minutos, es normal.

2. **Cycles necesarios**: Para testnet, dfx te da cycles gratis automáticamente.

3. **Logs en tiempo real**:
   ```bash
   # Terminal aparte para ver logs
   watch -n 30 'dfx canister logs rune-engine --network ic-testnet'
   ```

4. **Verificar que timers corren**:
   Deberías ver en los logs cada 10 minutos:
   - "Checking N pending transactions for confirmations"
   - "Fee estimates updated: low=X, medium=Y, high=Z sat/vbyte"

---

## ✅ Checklist Post-Deployment

- [ ] `dfx canister call rune-engine health_check` retorna healthy=true
- [ ] `dfx canister call rune-engine get_owner` retorna tu principal
- [ ] `dfx canister call rune-engine get_my_role` retorna Owner
- [ ] `./scripts/test-deployment.sh ic-testnet` pasa todos los tests
- [ ] Logs muestran timer execution cada 10 min
- [ ] `dfx canister call rune-engine get_current_fee_estimates` retorna datos

---

## 🚀 ¡VAMOS!

**Ejecuta esto AHORA**:

```bash
cd /Users/munay/dev/QURI-PROTOCOL
./scripts/deploy-production.sh ic-testnet
```

Si todo va bien, verás:

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║                  Deployment Completado ✓                     ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

Canister IDs:
  Rune Engine:         xxxxx-xxxxx-xxxxx-xxxxx-xxx
  Bitcoin Integration: yyyyy-yyyyy-yyyyy-yyyyy-yyy
  Registry:            zzzzz-zzzzz-zzzzz-zzzzz-zzz
  Identity Manager:    wwwww-wwwww-wwwww-wwwww-www

¡Deployment exitoso! 🚀
```

**¡Adelante! Copia y pega el comando y comparte el resultado!** 🎉
