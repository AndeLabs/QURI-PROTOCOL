# Bitcoin Confirmation Tracking System

## Overview

El sistema de confirmation tracking implementado en el canister `bitcoin-integration` proporciona tracking real de confirmaciones de transacciones Bitcoin usando:

- **StableBTreeMap** para persistencia entre upgrades
- **Timers periódicos** (cada 10 minutos) para polling automático
- **Bitcoin API de ICP** para obtener block heights actuales
- **Timeout automático** después de 24 horas sin confirmaciones

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│ bitcoin-integration canister                                │
│                                                              │
│  ┌────────────────────┐      ┌─────────────────────────┐   │
│  │ confirmation_tracker│      │  StableBTreeMap         │   │
│  │                    │◄─────►│  txid -> Entry          │   │
│  │ - track()          │      │  (persistent)           │   │
│  │ - get_confirmations()     └─────────────────────────┘   │
│  │ - check_pending()  │                                     │
│  └────────────────────┘                                     │
│          ▲                                                   │
│          │ Timer (10 min)                                   │
│          │                                                   │
│  ┌───────▼────────────────────────────────────────────┐     │
│  │ Bitcoin API                                        │     │
│  │ - get_block_height()                               │     │
│  │ - broadcast_and_track()                            │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Componentes

### 1. ConfirmationEntry

Estructura de datos que almacena información de tracking:

```rust
pub struct ConfirmationEntry {
    pub txid: String,                    // Transaction ID
    pub network: BitcoinNetwork,         // Mainnet/Testnet/Regtest
    pub broadcast_height: u64,           // Block height al broadcast
    pub last_checked: u64,               // Última verificación (nanos)
    pub confirmations: u32,              // Confirmaciones actuales
    pub required_confirmations: u32,     // Confirmaciones requeridas
    pub started_at: u64,                 // Timestamp de inicio (nanos)
}
```

### 2. Storage Persistente

Usa `ic-stable-structures` para sobrevivir upgrades del canister:

```rust
thread_local! {
    static CONFIRMATION_ENTRIES: RefCell<Option<StableBTreeMap<Vec<u8>, Vec<u8>, Memory>>> = ...;
}
```

- **Key**: `txid.as_bytes().to_vec()`
- **Value**: `candid::encode_one(&entry)`
- **MemoryId**: 0

### 3. Timer Periódico

Polling cada 10 minutos para verificar confirmaciones:

```rust
ic_cdk_timers::set_timer_interval(
    Duration::from_secs(600), // 10 minutos
    || {
        ic_cdk::spawn(async {
            check_pending_confirmations().await;
        });
    },
);
```

### 4. Cálculo de Confirmaciones

```rust
// Fórmula
confirmations = current_height - broadcast_height + 1

// Ejemplo:
// broadcast_height = 850000
// current_height   = 850005
// confirmations    = 850005 - 850000 + 1 = 6
```

### 5. Timeout

Si una transacción no alcanza las confirmaciones requeridas en 24 horas, se remueve del tracker:

```rust
const TIMEOUT_NANOSECONDS: u64 = 24 * 60 * 60 * 1_000_000_000;

if current_time - entry.started_at > TIMEOUT_NANOSECONDS {
    untrack_transaction(&entry.txid);
}
```

## API

### Funciones Update

#### `broadcast_and_track(tx_bytes: Vec<u8>, required_confirmations: u32) -> Result<String, String>`

Broadcast una transacción y comienza el tracking automático.

**Ejemplo:**
```rust
let txid = broadcast_and_track(signed_tx, 6).await?;
// Automáticamente se trackea para 6 confirmaciones
```

#### `get_confirmations(txid: String) -> Result<u32, String>`

Obtiene las confirmaciones actuales de una transacción.

**Ejemplo:**
```rust
let confirmations = get_confirmations("abc123...".to_string()).await?;
```

#### `untrack_transaction(txid: String) -> Result<(), String>`

Remueve manualmente una transacción del tracker (admin function).

### Funciones Query

#### `get_all_tracked_transactions() -> Vec<ConfirmationEntry>`

Retorna todas las transacciones siendo tracked.

#### `get_pending_confirmations() -> Vec<ConfirmationEntry>`

Retorna transacciones que NO han alcanzado las confirmaciones requeridas.

#### `get_confirmed_transactions() -> Vec<ConfirmationEntry>`

Retorna transacciones que SÍ han alcanzado las confirmaciones requeridas.

#### `get_tracked_transaction_count() -> usize`

Retorna el número de transacciones siendo tracked.

#### `get_confirmation_entry(txid: String) -> Option<ConfirmationEntry>`

Obtiene la entry completa de una transacción.

## Integración con rune-engine

El canister `rune-engine` usa el confirmation tracker automáticamente:

### Broadcast con Tracking

```rust
// En etching_flow.rs
let (broadcast_result,): (Result<String, String>,) = ic_cdk::call(
    btc_canister_id,
    "broadcast_and_track",
    (signed_tx.to_vec(), self.config.required_confirmations),
)
.await?;

// También se trackea en rune-engine
crate::confirmation_tracker::track_transaction(
    process.id.to_string(),
    txid.clone(),
    self.config.required_confirmations,
    self.config.network,
);
```

### Estado de Confirmación

El estado `EtchingState::Confirming` ahora refleja confirmaciones reales:

```rust
// El confirmation_tracker actualiza automáticamente cuando se alcanzan confirmaciones
process.update_state(EtchingState::Confirming { confirmations: 0 });

// Timer periódico verifica y actualiza a:
process.update_state(EtchingState::Indexing); // Cuando confirmations >= required
```

## Lifecycle del Canister

### init()

```rust
#[init]
fn init(network: BitcoinNetwork, ckbtc_ledger_id: Principal) {
    // 1. Initialize confirmation storage
    let confirmation_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)));
    confirmation_tracker::init_confirmation_storage(confirmation_memory);

    // 2. Schedule timer initialization (after init completes)
    ic_cdk_timers::set_timer(Duration::from_secs(1), || {
        confirmation_tracker::init_confirmation_tracker();
    });
}
```

### pre_upgrade()

```rust
#[pre_upgrade]
fn pre_upgrade() {
    // Stop timer before upgrade
    confirmation_tracker::stop_confirmation_tracker();
}
```

### post_upgrade()

```rust
#[post_upgrade]
fn post_upgrade() {
    // 1. Reinitialize storage
    let confirmation_memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)));
    confirmation_tracker::reinit_confirmation_storage(confirmation_memory);

    // 2. Restart timer
    ic_cdk_timers::set_timer(Duration::from_secs(1), || {
        confirmation_tracker::init_confirmation_tracker();
    });
}
```

## Configuración

### Intervalo de Polling

```rust
const CHECK_INTERVAL_SECONDS: u64 = 600; // 10 minutos
```

Para cambiar, editar en `confirmation_tracker.rs`.

### Timeout

```rust
const TIMEOUT_NANOSECONDS: u64 = 24 * 60 * 60 * 1_000_000_000; // 24 horas
```

## Monitoreo

### Ver Transacciones Pending

```dfx
dfx canister call bitcoin-integration get_pending_confirmations
```

### Ver Transacciones Confirmadas

```dfx
dfx canister call bitcoin-integration get_confirmed_transactions
```

### Ver Entry Específica

```dfx
dfx canister call bitcoin-integration get_confirmation_entry '("abc123...")'
```

### Contar Transacciones Tracked

```dfx
dfx canister call bitcoin-integration get_tracked_transaction_count
```

## Logs

El sistema genera logs detallados:

```
✅ Confirmation tracker storage initialized
✅ Confirmation tracker timer initialized (600 second intervals)
📍 Now tracking tx abc123... (needs 6 confirmations, broadcast at height 850000)
🔍 Checking 3 pending transactions for confirmations
✅ Transaction abc123... has 6 confirmations (needs 6)
🎉 Transaction abc123... reached required confirmations!
⏰ Transaction xyz789... timed out after 24h without required confirmations
```

## Trade-offs

### Ventajas

- ✅ **Confirmaciones reales** de Bitcoin
- ✅ **Persistente** (sobrevive upgrades)
- ✅ **Automático** (timer periódico)
- ✅ **Timeout** automático
- ✅ **Monitoreable** (queries)

### Desventajas

- ⏱️ **Latencia**: Polling cada 10 minutos
- 💰 **Cycles**: Queries periódicas consumen cycles
- 🔄 **No inmediato**: Confirmaciones no se actualizan en tiempo real

## Performance

### Costo por Check

```
- get_block_height(): ~2M cycles
- Por transacción: ~100K cycles
- Total por intervalo (10 txs): ~3M cycles
```

### Costo diario

```
Intervalos por día: 24h * 60min / 10min = 144
Costo por día (10 txs): 144 * 3M = ~432M cycles (~$0.0006 USD)
```

## Testing

Los tests incluyen:

```rust
#[test]
fn test_confirmation_entry_creation()
#[test]
fn test_confirmation_calculation()
#[test]
fn test_timeout_logic()
```

Correr tests:

```bash
cd backend
cargo test --package bitcoin-integration
```

## Troubleshooting

### Transacción no se está tracking

**Causa**: No se usó `broadcast_and_track()`.

**Solución**: Usar `broadcast_and_track()` en lugar de `broadcast_transaction()`.

### Confirmaciones no se actualizan

**Causa**: Timer no está corriendo.

**Solución**: Verificar que el canister se haya inicializado correctamente:
```dfx
dfx canister call bitcoin-integration get_tracked_transaction_count
```

### Transacción desapareció del tracker

**Causa**: Timeout de 24 horas.

**Solución**: Verificar en logs. Si la transacción es válida, re-trackear manualmente.

## Mejoras Futuras

1. **HTTPS Outcalls a Blockstream API**: Para confirmaciones más precisas
2. **Confirmaciones exactas**: Calcular confirmations = current_height - tx_block_height + 1
3. **Notificaciones**: Callback cuando se alcanzan confirmaciones
4. **Priorización**: Verificar primero transacciones más antiguas
5. **Exponential backoff**: Aumentar intervalo para txs con muchas confirmaciones

## Referencias

- [ICP Bitcoin Integration](https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/)
- [ic-stable-structures](https://docs.rs/ic-stable-structures/)
- [ic-cdk-timers](https://docs.rs/ic-cdk-timers/)
- [Bitcoin Confirmations](https://en.bitcoin.it/wiki/Confirmation)
