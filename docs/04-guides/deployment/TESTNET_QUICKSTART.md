# 🚀 QURI Protocol - Guía Rápida de Testnet

> **¡EMPIEZA AQUÍ!** Guía paso a paso para deployment y testing en testnet

---

## 📋 Resumen: ¿Qué necesitamos?

### Para ICP (Internet Computer)
- ✅ **Cycles gratuitos** (10T = ~$13 USD) del faucet de DFINITY
- ✅ **dfx CLI** instalado
- ✅ **Internet Identity** configurada

### Para Bitcoin Testnet
- ✅ **Testnet BTC** gratuito de faucets públicos
- ✅ **Bitcoin testnet wallet** (dirección que empiece con "m" o "2")

**IMPORTANTE:** ICP **NO tiene testnet tradicional**. Usamos:
- 🎮 **Playground** para pruebas rápidas (canisters expiran en 20 min)
- 🌐 **Mainnet** con cycles gratuitos para testing real
- 🔧 **Bitcoin Testnet API** integrado en ICP para usar testnet de Bitcoin

---

## 🎯 Plan de Implementación (Opción Recomendada)

```
Fase 1: Setup Inicial (30 min)
   ↓
Fase 2: Deployment en ICP Mainnet (1 hora)
   (usando Bitcoin TESTNET API)
   ↓
Fase 3: Testing con Bitcoin Testnet (2-3 horas)
   ↓
Fase 4: Testing completo y corrección de bugs (1-2 días)
```

---

## 🛠️ Fase 1: Setup Inicial

### 1.1 Verificar dfx instalado

```bash
# Verificar versión (debe ser >= 0.15.1)
dfx --version

# Si no está instalado:
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### 1.2 Configurar identidad en ICP

```bash
# Ver identidad actual
dfx identity whoami

# Ver tu principal ID (necesario para el faucet)
dfx identity get-principal

# Guardar este principal ID - lo necesitarás para el faucet
```

**📝 Anota tu Principal ID:** `xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxx`

---

## 💰 Fase 2: Conseguir Cycles Gratuitos

### Opción A: Cycles Faucet (GRATIS - 10T cycles)

**Pasos:**

1. **Unirse a Discord de DFINITY**
   - Ve a: https://faucet.dfinity.org
   - Haz clic en "REQUEST CYCLES"
   - Te redirige a Discord

2. **Solicitar cycles en Discord**
   - Canal: `#cycles-faucet`
   - Comando: `/faucet` (slash command)
   - Completa el formulario con:
     - Tu Principal ID (del paso 1.2)
     - Descripción del proyecto: "Testing QURI Protocol - Bitcoin Runes creation platform"
     - Por qué lo necesitas: "Testnet deployment for Phase 1 testing"

3. **Esperar aprobación**
   - El bot te enviará un mensaje privado con un **coupon code**
   - Tiempo de espera: ~1-3 días

4. **Canjear coupon**
   ```bash
   # Cuando recibas el coupon
   dfx wallet --network ic redeem-faucet-coupon <COUPON-CODE>
   ```

### Opción B: Comprar Cycles (Inmediato)

Si necesitas empezar YA sin esperar aprobación:

```bash
# Comprar ~$20 USD de cycles via ICP
# (Necesitarás ICP tokens en tu wallet primero)
dfx ledger --network ic top-up <CANISTER-ID> --amount 1.0
```

**Precio:** 1 XDR ≈ $1.30 USD = 1 Trillion (1T) cycles

---

## 🪙 Fase 3: Conseguir Bitcoin Testnet (tBTC)

### 3.1 Crear Bitcoin Testnet Wallet

Puedes usar cualquier wallet que soporte testnet:
- **Electrum** (Desktop) - switch to testnet mode
- **BlueWallet** (Mobile) - crear testnet wallet
- **Sparrow** (Desktop) - configurar testnet

**Tu dirección DEBE empezar con "m" o "2"** (NO "1" o "3" que son mainnet)

### 3.2 Conseguir tBTC de Faucets

**Faucets Activos (2025):**

1. **Coinfaucet.eu** (Recomendado - más generoso)
   - URL: https://coinfaucet.eu/en/btc-testnet/
   - Cantidad: ~0.001 tBTC por request
   - Límite: 1 request cada 24 horas

   **Pasos:**
   ```
   1. Pega tu dirección testnet (empieza con "m" o "2")
   2. Completa el captcha
   3. Click "Get Bitcoins!"
   4. Espera 5-15 min para recibir
   ```

2. **Testnet.help** (Backup)
   - URL: https://testnet.help/en/btcfaucet/testnet
   - Cantidad: ~0.0001-0.0005 tBTC

3. **Bitcoinfaucet.uo1.net** (Backup)
   - URL: https://bitcoinfaucet.uo1.net/
   - Cantidad: variable

**💡 TIP:** Usa múltiples faucets para acumular más tBTC rápido

### 3.3 Verificar que recibiste tBTC

```bash
# En tu wallet, deberías ver la transacción
# También puedes verificar en exploradores:
# https://blockstream.info/testnet/address/<TU-DIRECCION>
```

---

## 🚀 Fase 4: Deployment en ICP

### 4.1 Configurar proyecto para Bitcoin TESTNET

Necesitamos configurar los canisters para usar **Bitcoin Testnet API** (no mainnet).

**Archivo a modificar:** `canisters/bitcoin-integration/src/lib.rs`

Busca la configuración de red y asegúrate que diga:

```rust
// Debería estar así para TESTNET:
const BITCOIN_NETWORK: Network = Network::Testnet;

// NO debe ser:
// const BITCOIN_NETWORK: Network = Network::Bitcoin; // ← Esto es mainnet!
```

### 4.2 Build del proyecto

```bash
# Asegúrate de estar en el directorio raíz del proyecto
cd /home/user/QURI-PROTOCOL

# Build de todos los canisters
cargo build --target wasm32-unknown-unknown --release --workspace

# Verificar que compiló correctamente
ls -lh target/wasm32-unknown-unknown/release/*.wasm
```

**Deberías ver:**
```
rune_engine.wasm
bitcoin_integration.wasm
registry.wasm
identity_manager.wasm
```

### 4.3 Deploy en ICP Mainnet (con Bitcoin Testnet)

**IMPORTANTE:** Vamos a deployar en ICP **mainnet** pero configurado para usar Bitcoin **testnet**

```bash
# Deploy todos los canisters
dfx deploy --network ic

# Esto hará:
# 1. Crear los canisters en ICP mainnet
# 2. Instalar el código
# 3. Inicializar con Bitcoin TESTNET configurado
# 4. Consumir cycles (~2-5T para deployment inicial)
```

**Output esperado:**
```
Deploying all canisters.
Creating canisters...
Creating canister rune-engine...
rune-engine canister created with canister id: xxxxx-xxxxx-xxxxx-xxxxx-cai
Creating canister bitcoin-integration...
bitcoin-integration canister created with canister id: yyyyy-yyyyy-yyyyy-yyyyy-cai
...
Installing canisters...
Installing code for canister rune-engine, with canister ID xxxxx-xxxxx-xxxxx-xxxxx-cai
Installing code for canister bitcoin-integration, with canister ID yyyyy-yyyyy-yyyyy-yyyyy-cai
...
Deployed canisters.
URLs:
  Backend canister via Candid interface:
    rune-engine: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=xxxxx-xxxxx-xxxxx-xxxxx-cai
    bitcoin-integration: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=yyyyy-yyyyy-yyyyy-yyyyy-cai
```

### 4.4 Guardar Canister IDs

```bash
# Crear archivo con los IDs para referencia
echo "RUNE_ENGINE_CANISTER_ID=$(dfx canister --network ic id rune-engine)" > .env.testnet
echo "BITCOIN_INTEGRATION_CANISTER_ID=$(dfx canister --network ic id bitcoin-integration)" >> .env.testnet
echo "REGISTRY_CANISTER_ID=$(dfx canister --network ic id registry)" >> .env.testnet
echo "IDENTITY_MANAGER_CANISTER_ID=$(dfx canister --network ic id identity-manager)" >> .env.testnet

# Ver los IDs
cat .env.testnet
```

### 4.5 Verificar que están usando Bitcoin Testnet

```bash
# Llamar al canister para verificar configuración
dfx canister --network ic call bitcoin-integration get_network

# Debería devolver: (variant { Testnet })
# NO debe devolver: (variant { Bitcoin }) ← esto sería mainnet!
```

---

## 🧪 Fase 5: Testing - Primera Transacción

### 5.1 Configurar Frontend (Opcional para testing)

Si quieres probar desde el frontend:

```bash
cd quri-frontend

# Actualizar .env con los canister IDs
cp ../.env.testnet .env.local

# Instalar y ejecutar
npm install
npm run dev
```

Frontend en: http://localhost:3000

### 5.2 Testing via Candid UI (Más rápido)

Puedes hacer testing directo desde la UI de Candid sin frontend:

1. **Abrir Candid UI** del rune-engine:
   ```
   https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=<RUNE_ENGINE_CANISTER_ID>
   ```

2. **Llamar método para crear Rune:**

   Busca el método `create_rune` o similar y llena:
   ```
   name: "TEST_RUNE"
   symbol: "TEST"
   decimals: 2
   total_supply: 1000000
   premine: 500000
   ```

3. **Ver el proceso:**
   - El canister debería generar transacciones Bitcoin
   - Usar Bitcoin TESTNET (no mainnet)
   - Puedes ver el status llamando a `get_etching_status`

### 5.3 Verificar en Bitcoin Testnet Explorer

```bash
# Una vez que el canister genere la transacción, copia el txid
# y búscalo en:
https://blockstream.info/testnet/tx/<TXID>

# O en:
https://mempool.space/testnet/tx/<TXID>
```

---

## 📊 Fase 6: Monitoreo y Debugging

### 6.1 Ver logs de canisters

```bash
# Ver logs en tiempo real
dfx canister --network ic logs rune-engine

# Filtrar errores
dfx canister --network ic logs rune-engine | grep ERROR
```

### 6.2 Check de Cycles consumidos

```bash
# Ver balance de cycles de cada canister
dfx canister --network ic status rune-engine
dfx canister --network ic status bitcoin-integration

# Deberías ver algo como:
# Memory allocation: 0
# Compute allocation: 0
# Freezing threshold: 2_592_000
# Balance: 8_450_000_000_000 Cycles
```

### 6.3 Recargar cycles si es necesario

```bash
# Si un canister se está quedando sin cycles
dfx canister --network ic deposit-cycles 1000000000000 rune-engine
# (esto deposita 1T cycles)
```

---

## ⚠️ Troubleshooting Común

### Error: "Insufficient cycles"

**Solución:**
```bash
# Depositar más cycles
dfx ledger --network ic top-up <CANISTER-ID> --amount 2.0
```

### Error: "Bitcoin network mismatch"

**Problema:** El canister está configurado para mainnet pero intentas usar testnet

**Solución:**
1. Verificar en `canisters/bitcoin-integration/src/lib.rs`:
   ```rust
   const BITCOIN_NETWORK: Network = Network::Testnet; // ← DEBE ser Testnet
   ```
2. Rebuild y redeploy:
   ```bash
   cargo build --target wasm32-unknown-unknown --release --package bitcoin-integration
   dfx canister --network ic install bitcoin-integration --mode upgrade
   ```

### Error: "Failed to connect to Bitcoin network"

**Solución:**
- ICP Bitcoin testnet API a veces tiene latencia
- Espera 30-60 segundos y reintenta
- Verifica el status en: https://dashboard.internetcomputer.org/testbtc

### No recibo tBTC del faucet

**Soluciones:**
1. Verifica que tu dirección empieza con "m" o "2" (testnet)
2. Prueba otro faucet de la lista
3. Algunos faucets tienen límites diarios
4. Verifica en el explorador si la tx fue enviada: https://blockstream.info/testnet/

---

## 📝 Checklist Completo

Antes de comenzar testing extensivo:

- [ ] ✅ dfx instalado y funcionando
- [ ] ✅ Principal ID anotado
- [ ] ✅ Cycles obtenidos (10T del faucet o comprados)
- [ ] ✅ Bitcoin testnet wallet creado
- [ ] ✅ tBTC obtenido de faucets (~0.001 tBTC mínimo)
- [ ] ✅ Proyecto compilado exitosamente
- [ ] ✅ Canisters configurados para Bitcoin TESTNET
- [ ] ✅ Canisters deployed en ICP mainnet
- [ ] ✅ Canister IDs guardados
- [ ] ✅ Verificado que usan Bitcoin Testnet API
- [ ] ✅ Primera transacción de prueba realizada
- [ ] ✅ Transacción visible en testnet explorer

---

## 🎯 Próximos Pasos

Una vez que todo lo anterior funcione:

1. **Testing Sistemático:** Seguir `TESTNET_DEPLOYMENT.md` para los 8 escenarios de testing
2. **Load Testing:** Probar con múltiples transacciones simultáneas
3. **Bug Fixing:** Corregir cualquier error encontrado
4. **Security Review:** Opcional pero recomendado
5. **Mainnet Launch:** Seguir `docs/PHASE1_COMPLETION_GUIDE.md`

---

## 🆘 Necesitas Ayuda?

**Recursos:**
- 📚 ICP Docs: https://internetcomputer.org/docs
- 💬 ICP Forum: https://forum.dfinity.org
- 🎮 Discord: https://discord.gg/jnjVVQaE2C (DFINITY Official)

**Bitcoin Testnet:**
- 🔍 Explorer: https://blockstream.info/testnet/
- 📖 Bitcoin Testnet Guide: https://developer.bitcoin.org/examples/testing.html

---

## 💡 Tips Pro

### Tip 1: Desarrollo Iterativo
```bash
# Para rebuild y upgrade rápido durante desarrollo:
cargo build --target wasm32-unknown-unknown --release --package <PACKAGE>
dfx canister --network ic install <CANISTER> --mode upgrade
```

### Tip 2: Testing Local Primero
```bash
# Antes de deployar en IC, prueba localmente:
dfx start --background --clean
dfx deploy

# Esto es GRATIS (no consume cycles)
# Pero usa Bitcoin MAINNET API (no testnet)
```

### Tip 3: Playground para Experimentos Rápidos
```bash
# Para testing super rápido de cambios pequeños:
dfx deploy --playground

# Pros: GRATIS, deployment en ~30 segundos
# Contras: Expira en 20 minutos, max 1GB memoria
```

### Tip 4: Ahorra Cycles
```bash
# Detener canisters que no estés usando
dfx canister --network ic stop <CANISTER-ID>

# Reiniciar cuando los necesites
dfx canister --network ic start <CANISTER-ID>
```

---

**🚀 ¡Listo para empezar! Comienza por la Fase 1 y avanza paso a paso.**
