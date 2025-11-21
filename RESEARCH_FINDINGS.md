# 🔬 QURI Protocol - Research Findings & Implementation Guide

**Fecha**: 21 de Noviembre, 2024
**Propósito**: Investigación exhaustiva antes de implementación para Hackathon ICP Bitcoin DeFi

---

## 📋 TABLA DE CONTENIDOS

1. [Sign-In with Bitcoin (SIWB)](#1-sign-in-with-bitcoin-siwb)
2. [Testing Strategies](#2-testing-strategies)
3. [Hiro API & Runes Sync](#3-hiro-api--runes-sync)
4. [Bitcoin Transactions & Schnorr](#4-bitcoin-transactions--schnorr)
5. [ICP Stable Structures](#5-icp-stable-structures)
6. [Implementation Roadmap](#6-implementation-roadmap)

---

## 1. Sign-In with Bitcoin (SIWB)

### 📊 Estado Actual
- ✅ Librería `ic-siwb` instalada
- ✅ `BitcoinAuthProvider.ts` implementado
- ✅ `DualAuthProvider.tsx` integrado
- ❌ **FALTA**: Canister SIWB desplegado
- ❌ **FALTA**: Variable de entorno `NEXT_PUBLIC_SIWB_CANISTER_ID`

### 🔑 Hallazgos Clave

#### Wallets Soportadas
| Wallet | Estado | Última actualización |
|--------|--------|---------------------|
| Xverse | ✅ | Agosto 2024 |
| UniSat | ✅ | Inicial |
| Wizz | ✅ | Inicial |
| Leather | ✅ | Inicial |
| LaserEyes | ✅ | Noviembre 2024 (más reciente) |

#### Arquitectura Técnica
```
Usuario → Wallet Bitcoin → Sign Message →
SIWB Canister → Verify Signature →
Generate IC Principal → Session Created
```

**Tipos de firma soportados**:
- ECDSA signatures
- BIP-322-simple (más moderno)

### ⚠️ Problemas Conocidos

1. **Deployment Issues**:
   - Candid files mismatch entre releases
   - Build compilation errors con crate `time`
   - Port 8080 hardcoded en algunos casos

2. **Falta de documentación**:
   - No hay canister ID mainnet público claro
   - Testnet ID: `be2us-64aaa-aaaaa-qaabq-cai`
   - NPM packages aún en desarrollo

### 💡 Mejores Prácticas

```typescript
// Patrón recomendado basado en ic-siws (Solana)
import { SiwsIdentityProvider } from 'ic-siwb-js/react';

function App() {
  const wallet = useBitcoinWallet();
  return (
    <SiwsIdentityProvider canisterId={canisterId} adapter={wallet}>
      {/* app components */}
    </SiwsIdentityProvider>
  );
}

// Hook usage
const { login, loginStatus, identity } = useSiwb();
```

### 🎯 Plan de Implementación

**Opción A: Canister Público** (Recomendado para hackathon)
```bash
# Buscar canister público de ic-siwb team
NEXT_PUBLIC_SIWB_CANISTER_ID=<canister-publico>
```

**Opción B: Deploy Propio**
```bash
git clone https://github.com/AstroxNetwork/ic-siwb.git
cd ic-siwb
dfx deploy --network ic
# Copiar canister ID generado
```

### 📝 Tareas Pendientes SIWB

- [ ] Configurar/deploy canister SIWB
- [ ] Añadir variable en `.env.local` y `.env.production`
- [ ] Crear `BitcoinWalletSelector.tsx` component
- [ ] Actualizar `WalletModal.tsx` con tabs ICP/Bitcoin
- [ ] Descargar iconos de wallets a `/public/images/wallets/`
- [ ] Testing con cada wallet
- [ ] Verificar persistencia de sesión

---

## 2. Testing Strategies

### 🧪 Herramientas Principales

#### PocketIC
**Lo más moderno para testing ICP**

- ✅ Default desde `dfx v0.26.0`
- ✅ Deterministic testing environment
- ✅ Soporta Rust, Python, JavaScript/TypeScript
- ✅ REST API para integración con cualquier lenguaje

**Características clave**:
- Replica local sin consensus/networking layers
- Tests reproducibles 100%
- Simula mainnet behavior

**Estructura básica**:
```bash
# Build canisters
dfx build

# Run tests
cargo test --test integration_tests

# For Rust integration tests
cargo test --package my-canister --test integration
```

#### Testing con Threshold Schnorr

**Environment variables**:
```bash
# PocketIC binary required
export POCKET_IC_BIN=/path/to/pocket-ic

# Available test keys:
# - dfx_test_key (local only)
# - test_key_1 (mainnet test)
# - key_1 (production mainnet)
```

**Hardcoded keys**: PocketIC usa claves predefinidas para testing, lo cual es perfecto para tests determinísticos.

### 📊 Niveles de Testing

#### 1. Unit Tests (Rust)
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_elapsed_percentage() {
        // Test function logic
    }
}
```

#### 2. Integration Tests
```rust
// tests/integration_tests.rs
#[test]
fn test_canister_lifecycle() {
    // Deploy canister
    // Call methods
    // Verify state
}
```

#### 3. End-to-End Tests (con PocketIC)
```python
# Python example
from pocket_ic import PocketIC

def test_dead_man_switch_flow():
    pic = PocketIC()
    canister = pic.create_canister()
    # Test complete flow
```

### 🎯 Testing de Features del Hackathon

#### Dead Man's Switch
```rust
#[test]
async fn test_dms_complete_flow() {
    // 1. Create switch
    let switch_id = create_switch(params).await;

    // 2. Verify active status
    let info = get_switch_info(switch_id);
    assert_eq!(info.status, SwitchStatus::Active);

    // 3. Simulate time passing (expired)
    advance_time(timeout_ns + 1);

    // 4. Process expired switches
    let triggered = process_expired_switches().await;
    assert!(triggered.contains(&switch_id));
}
```

#### vetKeys Encryption
```rust
#[test]
async fn test_vetkeys_encryption_decryption() {
    // 1. Get public key
    let pubkey = get_public_key().await;

    // 2. Encrypt metadata
    let encrypted = encrypt_metadata(data, pubkey);
    store_metadata(encrypted).await;

    // 3. Owner decrypt
    let decrypted = decrypt_metadata(rune_id).await;
    assert_eq!(decrypted, original_data);

    // 4. Non-owner cannot decrypt (before reveal)
    let result = decrypt_as_other_user(rune_id).await;
    assert!(result.is_err());
}
```

### 💡 Best Practices

1. **Siempre build antes de test**:
   ```bash
   dfx build && cargo test
   ```

2. **Test con ciclos realistas**:
   - Mock HTTP outcalls responses
   - Simular delays de red
   - Test límites de cycles

3. **Cleanup entre tests**:
   ```bash
   dfx start --clean --background
   ```

---

## 3. Hiro API & Runes Sync

### 📊 Rate Limits (2024)

| Tier | RPM (Requests/min) | Costo |
|------|-------------------|-------|
| Free Starter | 900 RPM (15 req/s) | $0 |
| Paid Plans | Mayor + SLA | Contactar Hiro |

**Headers de Rate Limit**:
```http
X-RateLimit-Limit: 900
X-RateLimit-Remaining: 850
X-RateLimit-Reset: 1732234567
```

### 🚫 Limitaciones

- ❌ **NO hay batch requests nativos** - Es REST standard
- ✅ Todas las responses incluyen rate limit headers
- ✅ Cache responses para mejor performance
- ✅ Monitoring automático de quota

### ⚡ Estrategias de Optimización

#### 1. Rate Limiting Inteligente
```rust
// En el registry canister
const REQUESTS_PER_BATCH: u32 = 60;  // Runes per request
const DELAY_BETWEEN_BATCHES: u64 = 4_000_000_000; // 4 seconds

pub async fn sync_runes_optimized(
    start_height: u32,
    count: u32
) -> Result<u32, String> {
    let batches = (count as f64 / REQUESTS_PER_BATCH as f64).ceil() as u32;

    for batch in 0..batches {
        // Request
        sync_runes_from_hiro(start_height, REQUESTS_PER_BATCH).await?;

        // Delay to respect rate limits (15 req/s max)
        if batch < batches - 1 {
            ic_cdk_timers::set_timer(
                Duration::from_nanos(DELAY_BETWEEN_BATCHES),
                || {}
            );
        }
    }

    Ok(batches * REQUESTS_PER_BATCH)
}
```

#### 2. Database Optimization (Multi-row inserts)
```rust
// Batch inserts into BTreeMap
pub fn batch_insert_runes(runes: Vec<IndexedRune>) {
    INDEXED_RUNES.with(|r| {
        let mut map = r.borrow_mut();
        for rune in runes {
            map.insert(rune.identifier.clone(), rune);
        }
    });
}
```

#### 3. Lazy Index Creation
```rust
// Solo crear índices después de sync inicial
pub fn create_search_indices_after_sync() {
    if get_total_runes() > 10_000 {
        build_name_index();
        build_symbol_index();
    }
}
```

### 📈 Performance Targets

| Métrica | Actual | Target | Estrategia |
|---------|--------|--------|------------|
| Runes synced | 670 | 10,000+ | Batch optimization |
| Sync time | 3-5s/60 runes | 2s/60 runes | Parallel requests |
| Memory usage | ~19 MB | < 100 MB | Compression |
| Error rate | ~20% (ICP) | < 5% | Retry logic |

### 🎯 Script de Sync Optimizado

```bash
#!/bin/bash
# scripts/sync-optimized.sh

BATCH_SIZE=60
TOTAL_TO_SYNC=10000
CURRENT=$(dfx canister call registry get_indexer_stats --network ic | grep 'total_runes' | cut -d':' -f2)

REMAINING=$((TOTAL_TO_SYNC - CURRENT))
BATCHES=$((REMAINING / BATCH_SIZE))

echo "Syncing $REMAINING runes in $BATCHES batches..."

for ((i=0; i<BATCHES; i++)); do
    echo "Batch $((i+1))/$BATCHES..."

    dfx canister call registry sync_runes_from_hiro \
        "($CURRENT : nat32, $BATCH_SIZE : nat32)" \
        --network ic

    CURRENT=$((CURRENT + BATCH_SIZE))

    # Wait 4 seconds between batches (respects 15 req/s limit)
    sleep 4
done
```

---

## 4. Bitcoin Transactions & Schnorr

### 🔐 BIP-340 Schnorr Signatures

#### Especificaciones Técnicas
- **Public key size**: 32 bytes (vs 33 ECDSA)
- **Signature size**: 64 bytes (vs 70-72 ECDSA)
- **Non-malleable**: ✅ (vs ECDSA que no lo es)
- **Batch verification**: ✅ Más eficiente
- **MuSig2 support**: ✅ Multi-signature nativo

#### Ventajas de Seguridad
```
hash(R || P || m)  // Key prefixing protege contra related-key attacks
```

### 🏛️ Pay-to-Taproot (P2TR)

**Estructura**:
```
P2TR Output = P + hash(P || M) * G

Donde:
- P = Internal public key
- M = Merkle root de scripts
- G = Generator point
```

**Spend paths**:
1. **Key path**: Firma simple con P (más barato, más privado)
2. **Script path**: Reveal + execute script del Merkle tree

### 🎯 Runes Transfer Transaction

#### Runestone Structure
```
OP_RETURN
OP_13
<data_push_1>
<data_push_2>
...

Decoded to → 128-bit integers → Runestone
```

#### Edicts para Transfers
```rust
pub struct Edict {
    pub rune_id: RuneId,      // Qué rune transferir
    pub amount: u128,          // Cuánto
    pub output_number: u32,    // A qué output
}
```

**Comportamiento default**: Sin Runestone, todos los runes del input van al primer non-OP_RETURN output.

### 💡 Implementation Pattern para Dead Man's Switch

```rust
// En execute_transfer() del Dead Man's Switch
async fn execute_transfer(switch: &DeadManSwitch) -> Result<String, String> {
    // 1. Build Runestone
    let runestone = Runestone {
        edicts: vec![
            Edict {
                rune_id: parse_rune_id(&switch.rune_id)?,
                amount: switch.amount,
                output_number: 1, // Beneficiary output
            }
        ],
        ..Default::default()
    };

    // 2. Encode to OP_RETURN
    let script_pubkey = runestone.encipher();

    // 3. Build transaction
    let tx = build_p2tr_transaction(
        inputs: get_utxos().await?,
        outputs: vec![
            TxOut {
                value: 546, // dust limit
                script_pubkey: beneficiary_address_to_script(&switch.beneficiary),
            },
            TxOut {
                value: 0,
                script_pubkey, // OP_RETURN con runestone
            },
        ],
    );

    // 4. Sign with Threshold Schnorr (ICP)
    let signed_tx = sign_with_schnorr(tx).await?;

    // 5. Broadcast
    broadcast_transaction(signed_tx).await
}
```

### 🧪 Testing con ICP Schnorr

```rust
#[ic_cdk::test]
async fn test_schnorr_signing() {
    // Use test_key_1 on mainnet
    let key_id = SchnorrKeyId {
        algorithm: SchnorrAlgorithm::Bip340Secp256k1,
        name: "test_key_1".to_string(),
    };

    let request = SignWithSchnorrRequest {
        message: hash_to_sign,
        derivation_path: vec![],
        key_id,
    };

    let (response,) = ic_cdk::call(
        Principal::management_canister(),
        "sign_with_schnorr",
        (request,)
    ).await.unwrap();

    assert_eq!(response.signature.len(), 64);
}
```

---

## 5. ICP Stable Structures

### 🏗️ Arquitectura de Memoria

#### Problema: Heap Data se pierde en upgrades
```rust
// ❌ NO usar para datos importantes
static mut HEAP_DATA: Vec<u8> = Vec::new();

// Después de upgrade → HEAP_DATA está vacía
```

#### Solución: Stable Memory
```rust
// ✅ Persiste entre upgrades
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager},
    StableBTreeMap, DefaultMemoryImpl,
};
```

### 📦 MemoryManager Pattern

**Problema**: Cada estructura necesita su propia memoria.

**Solución**: MemoryManager crea hasta 255 memorias virtuales.

```rust
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Map 1 - MemoryId(0)
    static MAP_1: RefCell<StableBTreeMap<u64, User, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    // Map 2 - MemoryId(1)
    static MAP_2: RefCell<StableBTreeMap<String, Rune, Memory>> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
}
```

### 💾 Mapa de Memoria Actual en QURI

```rust
// En rune-engine/src/lib.rs

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = ...;

    // MemoryId(0) - RESERVED (future use)
    // MemoryId(1) - Etching state
    // MemoryId(2) - RBAC permissions
    // MemoryId(3) - Idempotency keys
    // MemoryId(4) - Etching config
    // MemoryId(5) - Canister config
    // MemoryId(6) - Block tracker
    // MemoryId(7) - Metrics ⚠️ HEAP (migrate to stable!)
    // MemoryId(8) - Logging
    // MemoryId(9) - Confirmation tracker
    // MemoryId(10) - Virtual runes
}
```

### 🎯 Migration Plan: Metrics to Stable

**Antes** (Heap - se pierde en upgrades):
```rust
// metrics.rs
thread_local! {
    static METRICS: RefCell<CanisterMetrics> = RefCell::new(
        CanisterMetrics::default()
    );
}
```

**Después** (Stable - persiste):
```rust
use ic_stable_structures::StableBTreeMap;

thread_local! {
    static METRICS: RefCell<StableBTreeMap<String, u64, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(7)))
        ));
}

pub fn increment_metric(key: &str) {
    METRICS.with(|m| {
        let mut map = m.borrow_mut();
        let current = map.get(key).unwrap_or(0);
        map.insert(key.to_string(), current + 1);
    });
}
```

### 🔒 Query Certification

#### Problema
```
User → Query Call → Single Replica → Response (no trust!)
                     ↓
                  Malicious replica could lie
```

#### Solución: Certified Variables
```rust
use ic_cdk::api::set_certified_data;
use ic_certified_map::{HashTree, labeled_hash};

// 1. Build Merkle tree de tus datos
let tree = build_merkle_tree(data);

// 2. Set root hash (32 bytes) como certified data
set_certified_data(&tree.root_hash());

// 3. En query, return data + proof
#[query]
fn get_certified_data(key: String) -> (Vec<u8>, Vec<u8>) {
    let value = get_value(&key);
    let witness = tree.witness(&key);
    (value, witness.serialize())
}

// 4. Client verifica con IC public key
verify_certificate(response, ic_public_key);
```

### 📊 Versioning de Stable Memory

```rust
// Primer byte = version
const VERSION: u8 = 1;

#[pre_upgrade]
fn pre_upgrade() {
    let state = StableState {
        version: VERSION,
        data: serialize_data(),
    };
    stable_save((state,)).unwrap();
}

#[post_upgrade]
fn post_upgrade() {
    let (state,): (StableState,) = stable_restore().unwrap();

    match state.version {
        1 => migrate_v1(state.data),
        2 => migrate_v2(state.data),
        _ => panic!("Unknown version"),
    }
}
```

---

## 6. Implementation Roadmap

### 🎯 Prioridad CRÍTICA (2 días)

#### Día 1: SIWB + Testing Setup
```bash
# Morning (4h)
[ ] Deploy/configure SIWB canister
[ ] Create BitcoinWalletSelector.tsx
[ ] Update WalletModal.tsx with tabs
[ ] Add wallet icons

# Afternoon (4h)
[ ] Setup PocketIC testing
[ ] Write DMS integration tests
[ ] Write vetKeys integration tests
[ ] SIWB connection tests
```

#### Día 2: Optimization + Settlement
```bash
# Morning (4h)
[ ] Migrate metrics to stable structures
[ ] Implement query certification for stats
[ ] Optimize Hiro API sync script

# Afternoon (4h)
[ ] Integrate execute_transfer() in DMS
[ ] Test Bitcoin transaction building
[ ] End-to-end DMS flow test
```

### 📊 Success Metrics

| Feature | Test Coverage | Performance | Documentation |
|---------|--------------|-------------|---------------|
| SIWB | >80% | <2s connect | ✅ |
| DMS | >90% | <200ms query | ✅ |
| vetKeys | >85% | <500ms encrypt | ✅ |
| Runes Sync | >70% | 15 req/s | ✅ |

### 🚀 Deployment Checklist

Pre-deployment:
- [ ] All tests passing
- [ ] Rate limits respected
- [ ] Stable structures migrated
- [ ] Query certification enabled
- [ ] Error handling robust
- [ ] Logs comprehensive

Post-deployment:
- [ ] Monitor cycles usage
- [ ] Track error rates
- [ ] Verify data persistence
- [ ] Test all user flows

---

## 📚 Referencias

### Documentación Oficial
- [PocketIC Testing](https://internetcomputer.org/docs/building-apps/test/pocket-ic)
- [Threshold Schnorr](https://internetcomputer.org/docs/building-apps/network-features/signatures/t-schnorr)
- [Stable Structures](https://github.com/dfinity/stable-structures)
- [Query Certification](https://internetcomputer.org/how-it-works/response-certification/)
- [Hiro Runes API](https://docs.hiro.so/apis/runes-api)

### Repositorios
- [ic-siwb](https://github.com/AstroxNetwork/ic-siwb)
- [rust-bitcoin](https://github.com/rust-bitcoin/rust-bitcoin)
- [ordinals](https://github.com/ordinals/ord)

### Tools
- [PocketIC Binary](https://github.com/dfinity/pocketic)
- [Bitcoin Testnet Faucet](https://testnet-faucet.com/btc-testnet/)
- [Hiro Platform](https://platform.hiro.so)

---

## ✅ Conclusiones

### Hallazgos Clave

1. **SIWB**: Implementable pero requiere canister deployment. LaserEyes es la integración más reciente.

2. **Testing**: PocketIC es el estándar moderno. Hardcoded keys facilitan tests determinísticos.

3. **Sync**: Rate limit de 900 RPM es suficiente para sync gradual. Batch optimization crítica.

4. **Bitcoin**: Schnorr + P2TR bien soportado. Runestone construction es straightforward.

5. **Stable Structures**: Crítico migrar metrics. MemoryManager pattern es clean.

### Riesgos Identificados

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| SIWB deployment fails | Media | Alto | Usar canister público |
| Rate limits exceeded | Baja | Medio | Batch optimization |
| Schnorr signing errors | Baja | Alto | Extensive testing |
| Memory overflow | Media | Alto | Stable structures |

### Next Steps

1. **Hoy**: Implementar SIWB completo
2. **Mañana**: Testing + Optimizations
3. **Día 3**: Settlement integration
4. **Día 4**: Polish + Video demo
5. **Día 5**: Submit!

---

**¿Listo para implementar?** 🚀
