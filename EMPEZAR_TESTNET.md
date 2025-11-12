# 🚀 EMPEZAR CON TESTNET - Pasos Inmediatos

> **¡TODO LISTO PARA DEPLOYAR!** Sigue estos pasos para poner QURI Protocol en testnet.

---

## ✅ Lo Que Ya Está Preparado

1. ✅ **Código configurado para Bitcoin Testnet**
   - `rune-engine` usa `BitcoinNetwork::Testnet` por defecto
   - `bitcoin-integration` recibirá configuración testnet en deployment

2. ✅ **Script de deployment automático creado**
   - `deploy-testnet.sh` - despliega todo con un comando

3. ✅ **Documentación completa**
   - `TESTNET_QUICKSTART.md` - Guía paso a paso
   - `TESTNET_DEPLOYMENT.md` - Testing detallado (8 escenarios)
   - `docs/PHASE1_COMPLETION_GUIDE.md` - Roadmap a producción

4. ✅ **Información de faucets y recursos**
   - Bitcoin testnet faucets identificados
   - ICP cycles faucet (10T gratis)
   - ckTESTBTC ledger canister ID: `mc6ru-gyaaa-aaaar-qaaaq-cai`

---

## 🎯 OPCIÓN 1: Deployment Automático (RECOMENDADO)

### Prerequisitos (15-30 min)

#### 1. Conseguir Cycles de ICP (GRATIS)

**Opción A: Faucet (Gratis pero toma 1-3 días)**
```bash
# 1. Ve a: https://faucet.dfinity.org
# 2. Click "REQUEST CYCLES" → Te lleva a Discord
# 3. En canal #cycles-faucet, usa comando: /faucet
# 4. Llena el formulario:
#    - Principal ID: (ejecuta: dfx identity get-principal)
#    - Proyecto: "QURI Protocol - Bitcoin Runes platform"
#    - Razón: "Phase 1 testnet deployment"
# 5. Espera aprobación (1-3 días)
# 6. Recibirás un coupon code via DM
# 7. Canjea: dfx wallet --network ic redeem-faucet-coupon <CODE>
```

**Opción B: Comprar Cycles (Inmediato - ~$20 USD)**
```bash
# Si tienes ICP tokens, puedes comprar cycles inmediatamente
dfx ledger --network ic top-up $(dfx identity get-wallet --network ic) --amount 2.0
# Esto te da ~2T cycles, suficiente para deployment y testing
```

#### 2. Verificar dfx instalado

```bash
# Check version (debe ser >= 0.15.1)
dfx --version

# Si no está instalado:
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
```

### Deployment (5-10 min)

Una vez tengas cycles:

```bash
# 1. Ir al directorio del proyecto
cd /home/user/QURI-PROTOCOL

# 2. Ejecutar script de deployment
./deploy-testnet.sh

# El script hará TODO automáticamente:
# ✓ Pre-flight checks
# ✓ Build de todos los canisters
# ✓ Deploy a ICP mainnet
# ✓ Configurar para Bitcoin TESTNET
# ✓ Conectar todos los canisters
# ✓ Guardar canister IDs
```

**Output esperado:**
```
╔═══════════════════════════════════════════════════════════╗
║           🎉 DEPLOYMENT SUCCESSFUL! 🎉                   ║
╚═══════════════════════════════════════════════════════════╝

Canister IDs:
  rune-engine:          xxxxx-xxxxx-xxxxx-xxxxx-cai
  bitcoin-integration:  yyyyy-yyyyy-yyyyy-yyyyy-cai
  registry:             zzzzz-zzzzz-zzzzz-zzzzz-cai
  identity-manager:     wwwww-wwwww-wwwww-wwwww-cai

Candid UIs:
  rune-engine:          https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=xxxxx...
```

**¡YA ESTÁ! Los canisters están live en ICP configurados para Bitcoin testnet.**

---

## 🧪 Testing Inmediato (Primera Transacción)

### 1. Conseguir Bitcoin Testnet (5 min)

```bash
# Opción 1: Crear wallet testnet si no tienes
# - Usa Electrum, BlueWallet, o Sparrow en modo testnet
# - Tu dirección DEBE empezar con "m" o "2"

# Opción 2: Conseguir tBTC de faucet
# Ve a: https://coinfaucet.eu/en/btc-testnet/
# 1. Pega tu dirección testnet
# 2. Completa captcha
# 3. Click "Get Bitcoins!"
# 4. Espera 5-15 min

# También puedes probar:
# - https://testnet.help/en/btcfaucet/testnet
# - https://bitcoinfaucet.uo1.net/
```

### 2. Crear tu primer Rune (5 min)

```bash
# 1. Abre el Candid UI de rune-engine
#    (URL del output del script de deployment)

# 2. En el navegador, ve al método "create_rune"

# 3. Llena el formulario:
{
  "rune_name": "TEST_RUNE",
  "symbol": "TEST",
  "divisibility": 2,
  "premine": 500000,
  "terms": [
    {
      "amount": 100,
      "cap": 1000000,
      "height_start": [],
      "height_end": [],
      "offset_start": [],
      "offset_end": []
    }
  ]
}

# 4. Click "Call" y autentifica con Internet Identity

# 5. Deberías recibir un process_id
# Ejemplo: "Ok(variant { Ok = \"process_abc123\" })"
```

### 3. Verificar el Status

```bash
# Opción A: Via Candid UI
# 1. Método: get_etching_status
# 2. Parámetro: "process_abc123"
# 3. Click "Query"

# Opción B: Via dfx CLI
dfx canister --network ic call <RUNE_ENGINE_ID> get_etching_status '("process_abc123")'

# Deberías ver:
# - state: "Pending" o "Processing" o "Completed"
# - txid: "abc123..." cuando esté en blockchain
```

### 4. Ver en Bitcoin Testnet Explorer

```bash
# Cuando tengas el txid, ve a:
https://blockstream.info/testnet/tx/<TXID>

# O:
https://mempool.space/testnet/tx/<TXID>

# Deberías ver tu transacción de Rune en Bitcoin testnet!
```

---

## 📊 Monitoreo y Debugging

### Ver logs de canisters

```bash
# Ver logs del rune-engine
dfx canister --network ic logs rune-engine

# Ver logs del bitcoin-integration
dfx canister --network ic logs bitcoin-integration

# Ver solo errores
dfx canister --network ic logs rune-engine | grep ERROR
```

### Check de cycles

```bash
# Ver balance de cycles de cada canister
dfx canister --network ic status rune-engine
dfx canister --network ic status bitcoin-integration

# Output incluye:
# Balance: 8_450_000_000_000 Cycles
```

### Recargar cycles si es necesario

```bash
# Si un canister se está quedando sin cycles
dfx ledger --network ic top-up <CANISTER_ID> --amount 1.0
# (deposita ~1T cycles)
```

---

## 🎯 OPCIÓN 2: Deployment Manual Paso a Paso

Si prefieres control total, sigue esta guía:

### 1. Build

```bash
cd /home/user/QURI-PROTOCOL
cargo build --target wasm32-unknown-unknown --release --workspace
```

### 2. Deploy bitcoin-integration

```bash
# Create
dfx canister --network ic create bitcoin-integration

# Get ID
BITCOIN_ID=$(dfx canister --network ic id bitcoin-integration)

# Install with Testnet config
dfx canister --network ic install bitcoin-integration \
  --mode reinstall \
  --argument "(variant { Testnet }, principal \"mc6ru-gyaaa-aaaar-qaaaq-cai\")"
```

### 3. Deploy registry

```bash
dfx canister --network ic create registry
dfx canister --network ic install registry --mode reinstall
REGISTRY_ID=$(dfx canister --network ic id registry)
```

### 4. Deploy identity-manager

```bash
dfx canister --network ic create identity-manager
dfx canister --network ic install identity-manager --mode reinstall
```

### 5. Deploy rune-engine

```bash
dfx canister --network ic create rune-engine
dfx canister --network ic install rune-engine --mode reinstall

# Configure connections
dfx canister --network ic call rune-engine configure_canisters \
  "(principal \"$BITCOIN_ID\", principal \"$REGISTRY_ID\")"

# Ensure Testnet config
dfx canister --network ic call rune-engine update_etching_config \
  "(record {
    network = variant { Testnet };
    fee_rate = 2 : nat64;
    required_confirmations = 1 : nat32;
    enable_retries = true
  })"
```

---

## 🐛 Troubleshooting Común

### Error: "Insufficient cycles"

```bash
# Solución: Añadir más cycles
dfx ledger --network ic top-up <CANISTER_ID> --amount 2.0
```

### Error: "No wallet canister"

```bash
# Solución: Crear wallet
dfx identity --network ic deploy-wallet <CYCLES_WALLET_CANISTER_ID>

# O esperar al faucet y redimir el coupon
dfx wallet --network ic redeem-faucet-coupon <COUPON_CODE>
```

### Error: "Failed to connect to Bitcoin network"

```bash
# Solución: La API de ICP Bitcoin testnet a veces tiene latencia
# Espera 30-60 segundos y reintenta

# Verifica status en:
# https://dashboard.internetcomputer.org/testbtc
```

### No recibo tBTC del faucet

```bash
# Verifica que tu dirección empieza con "m" o "2" (testnet)
# NO debe empezar con "1" o "3" (eso es mainnet)

# Prueba otro faucet de la lista
# Algunos tienen límites diarios

# Verifica en explorer:
# https://blockstream.info/testnet/address/<TU_DIRECCION>
```

---

## 📚 Recursos Importantes

### URLs Clave

- **ICP Cycles Faucet**: https://faucet.dfinity.org
- **Bitcoin Testnet Faucet**: https://coinfaucet.eu/en/btc-testnet/
- **ICP Dashboard**: https://dashboard.internetcomputer.org/
- **Bitcoin Testnet Explorer**: https://blockstream.info/testnet/
- **ckTESTBTC Info**: https://dashboard.internetcomputer.org/testbtc

### Canister IDs Importantes

- **ckTESTBTC Ledger**: `mc6ru-gyaaa-aaaar-qaaaq-cai`
- **Bitcoin Testnet Canister**: Integrado en ICP

### Documentación

- `TESTNET_QUICKSTART.md` - Guía paso a paso detallada
- `TESTNET_DEPLOYMENT.md` - 8 escenarios de testing completos
- `docs/PHASE1_COMPLETION_GUIDE.md` - Roadmap a mainnet
- `deploy-testnet.sh` - Script de deployment automático

---

## ⏭️ Próximos Pasos Después del Primer Test

1. **Testing Sistemático**
   - Seguir `TESTNET_DEPLOYMENT.md` para los 8 escenarios
   - Crear múltiples Runes de prueba
   - Probar casos de error

2. **Load Testing**
   - Múltiples transacciones simultáneas
   - Medir latencia y throughput
   - Verificar rate limiting

3. **Bug Fixing**
   - Corregir errores encontrados
   - Upgrade de canisters con fixes
   - Re-testing

4. **Preparar Mainnet**
   - Security audit (opcional)
   - Configurar para Bitcoin mainnet
   - Seguir `docs/PHASE1_COMPLETION_GUIDE.md`

---

## 💡 Tips Pro

### Desarrollo Iterativo

```bash
# Para rebuild y upgrade rápido durante fixes:
cargo build --target wasm32-unknown-unknown --release --package rune-engine
dfx canister --network ic install rune-engine --mode upgrade

# Esto mantiene el state del canister
```

### Ver todas tus transacciones

```bash
# Llamar get_my_etchings para ver tu historial
dfx canister --network ic call rune-engine get_my_etchings '()'
```

### Ahorra cycles

```bash
# Detener canisters que no uses temporalmente
dfx canister --network ic stop <CANISTER_ID>

# Reiniciar cuando los necesites
dfx canister --network ic start <CANISTER_ID>
```

---

## 🎉 ¡Listo para empezar!

**Orden recomendado:**
1. ✅ Conseguir cycles (faucet o comprar)
2. ✅ Ejecutar `./deploy-testnet.sh`
3. ✅ Conseguir tBTC de faucet
4. ✅ Crear primer Rune de prueba
5. ✅ Verificar en Bitcoin testnet explorer
6. ✅ Seguir con testing sistemático

**Tiempo estimado total:**
- Con cycles del faucet: 1-3 días (espera) + 30 min (deployment)
- Comprando cycles: 30-45 min

---

**¿Necesitas ayuda?**
- 📚 Revisa `TESTNET_QUICKSTART.md` para más detalles
- 💬 ICP Discord: https://discord.gg/jnjVVQaE2C
- 🐛 ICP Forum: https://forum.dfinity.org

**¡Buena suerte con el deployment! 🚀**
