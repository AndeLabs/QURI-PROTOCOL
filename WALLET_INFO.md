# 💰 QURI Protocol - Wallet Information

**Fecha:** November 21, 2025
**Para:** Recibir Cycles y fondear proyecto

---

## 🔑 Tu Información de Wallet

### Principal ID (Identity)
```
cj4ys-65r3u-s7a6s-ipocx-475yc-lzepm-n23b2-6rya3-ciirt-qgxvk-3qe
```
**Usa esto para:**
- Cycles Faucet
- Permisos de canisters
- Identity en dfx

### Wallet Canister ID
```
kkqut-giaaa-aaaac-a5e6q-cai
```
**Usa esto para:**
- Recibir cycles directamente
- Transferencias entre wallets

### Account ID (para ICP)
```
35a3e3d73849a19d0a67f32628cda671d581482144bca10a1fe82c6e274061c0
```
**Usa esto para:**
- Recibir ICP tokens
- Transfers desde exchanges

### Balance Actual
- **Cycles:** 89,000,000,000 (89B cycles = 0.089 TC)
- **ICP:** 0.00121829 ICP (~$0.01 USD)

---

## 🎁 OPCIÓN 1: Cycles Faucet (GRATIS - RECOMENDADO)

### Paso a Paso:

1. **Ve a:** https://faucet.dfinity.org

2. **Conecta tu wallet:**
   - Usa Internet Identity
   - O NFID
   - O Plug Wallet

3. **Ingresa tu Principal ID:**
   ```
   cj4ys-65r3u-s7a6s-ipocx-475yc-lzepm-n23b2-6rya3-ciirt-qgxvk-3qe
   ```

4. **Solicita cycles:**
   - El faucet da entre **10T - 20T cycles GRATIS**
   - Usualmente 1 vez por proyecto/hackathon
   - Llegará a tu wallet en minutos

5. **Verifica que llegaron:**
   ```bash
   export DFX_WARNING=-mainnet_plaintext_identity
   dfx wallet --network ic balance
   ```

### ¿Por qué usar el Faucet?
- ✅ **GRATIS** - No cuesta nada
- ✅ **RÁPIDO** - Llega en minutos
- ✅ **SUFICIENTE** - 10T-20T cycles es más que suficiente para el hackathon
- ✅ **OFICIAL** - Operado por DFINITY Foundation

---

## 💱 OPCIÓN 2: Convertir ICP a Cycles

Si tienes ICP tokens, puedes convertirlos a cycles:

### Paso 1: Recibir ICP

**Tu Account ID para recibir ICP:**
```
35a3e3d73849a19d0a67f32628cda671d581482144bca10a1fe82c6e274061c0
```

Envía ICP desde:
- Un exchange (Coinbase, Binance, etc.)
- Otra wallet ICP
- NNS Wallet

### Paso 2: Verificar balance ICP

```bash
export DFX_WARNING=-mainnet_plaintext_identity
dfx ledger --network ic balance
```

### Paso 3: Convertir ICP a Cycles

```bash
# Ejemplo: Convertir 1 ICP a cycles
export DFX_WARNING=-mainnet_plaintext_identity
dfx ledger --network ic top-up kkqut-giaaa-aaaac-a5e6q-cai --amount 1.0
```

**Tasa de conversión aproximada:**
- 1 ICP ≈ 1 trillion cycles (1T)
- Precio actual ICP: ~$8-10 USD
- Entonces: 1T cycles ≈ $8-10 USD

---

## 📨 OPCIÓN 3: Recibir Cycles de Otra Wallet

Si alguien más quiere enviarte cycles:

### Dale esta información:

**Wallet Canister ID:**
```
kkqut-giaaa-aaaac-a5e6q-cai
```

### Comando para que envíen:

```bash
# Desde su terminal
export DFX_WARNING=-mainnet_plaintext_identity
dfx wallet --network ic send kkqut-giaaa-aaaac-a5e6q-cai <cantidad>

# Ejemplo: Enviar 5T cycles
dfx wallet --network ic send kkqut-giaaa-aaaac-a5e6q-cai 5000000000000
```

---

## 📊 ¿Cuántos Cycles Necesitas?

### Para el Hackathon (3 semanas):
- **Mínimo:** 67B cycles (consumo estimado)
- **Recomendado:** 200B-500B cycles (con margen de seguridad)
- **Ideal:** 1T+ cycles (tranquilidad total)

### Ya Tienes:
- **En wallet:** 89B cycles
- **En canisters:** ~3.5T cycles (ya desplegados)
- **Total disponible:** ~3.6T cycles ✅

### ¿Necesitas más?
**NO URGENTE** - Tienes suficientes cycles para el hackathon.

Pero si quieres más margen:
1. Usa el **Faucet** (10-20T gratis)
2. O consigue ICP y conviértelo

---

## 🧪 Verificar Balance

```bash
# Ver balance de tu wallet
export DFX_WARNING=-mainnet_plaintext_identity
dfx wallet --network ic balance

# Ver balance de cada canister
dfx canister --network ic status pkrpq-5qaaa-aaaah-aroda-cai  # Rune Engine
dfx canister --network ic status pnqje-qiaaa-aaaah-arodq-cai  # Registry
dfx canister --network ic status y67br-5iaaa-aaaah-arn5q-cai  # Identity Manager
```

---

## 🎯 Recomendación Final

**Para el Hackathon:**

1. ✅ **Ya tienes suficientes cycles** (3.6T total)
2. 🎁 **OPCIONAL:** Usa el faucet para conseguir 10-20T extra gratis
3. 💰 **NO NECESARIO:** No necesitas comprar ICP ni convertir a cycles

**Link del Faucet:**
👉 **https://faucet.dfinity.org** 👈

**Tu Principal ID para pegar:**
```
cj4ys-65r3u-s7a6s-ipocx-475yc-lzepm-n23b2-6rya3-ciirt-qgxvk-3qe
```

---

## 📞 Soporte

Si tienes problemas:
- **Forum DFINITY:** https://forum.dfinity.org
- **Discord DFINITY:** https://discord.gg/jnjVVQaE2C
- **Hackathon Support:** Busca en el Discord del hackathon

---

**Generado:** November 21, 2025
**Proyecto:** QURI Protocol
**Hackathon:** ICP Bitcoin DeFi
**Deadline:** November 24, 2025
