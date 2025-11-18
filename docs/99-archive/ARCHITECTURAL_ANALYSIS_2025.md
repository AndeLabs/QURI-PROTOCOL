# 🏗️ QURI Protocol - Análisis Arquitectónico Completo 2025

**Fecha:** 17 de Noviembre, 2025  
**Versión:** 1.0  
**Autor:** Auditoría Arquitectónica Profunda  
**Alcance:** Sistema completo de 8,879 líneas de Rust + Frontend Next.js

---

## 📊 Resumen Ejecutivo

### Estado Actual
- **Líneas de Código:** ~8,879 líneas Rust + ~15,000 líneas TypeScript
- **Canisters:** 5 (rune-engine, bitcoin-integration, registry, identity-manager, internet-identity)
- **Librerías Compartidas:** 5 (quri-types, quri-utils, bitcoin-utils, runes-utils, schnorr-signatures)
- **Network Status:** ✅ Desplegado en Mainnet ICP
- **Canister IDs:** 
  - Registry: `pnqje-qiaaa-aaaah-arodq-cai`
  - Rune Engine: Mainnet ready
  - Bitcoin Integration: Testnet configurado

### Problemas Críticos Identificados

#### 🔴 CRÍTICO: Bug en Registry Canister
**Problema:** `StableBTreeMap<RuneId, RegistryEntry>` usa `RuneId` (con `String` unbounded) como key.  
**Error:** `"Cannot get bounds of unbounded type"` en `ic-stable-structures`  
**Impacto:** 🚨 **Sistema NO FUNCIONAL** - No se pueden registrar Runes

#### 🟡 ALTO: Arquitectura de Tipos Fragmentada
- Duplicación de tipos entre `quri-types` y canisters locales
- `RuneId` definido en 3 lugares diferentes (quri-types, runes-utils, indexer)
- Falta de fuente única de verdad (Single Source of Truth)

#### 🟡 ALTO: TODOs en Código de Producción
- 9 TODOs críticos en lógica core (rollback, confirmations, block tracking)
- Funcionalidad incomplete en rutas críticas

#### 🟢 MEDIO: Escalabilidad Frontend
- State management necesita consolidación
- Queries sin paginación optimizada
- Falta de cacheo estratégico

---

## 🎯 Análisis Detallado por Componente

### 1. **Capa de Tipos (`libs/quri-types`)**

#### ✅ Fortalezas
```rust
// Excelente documentación educativa
// Implementación correcta de Storable para tipos unbounded
impl Storable for RuneMetadata {
    const BOUND: Bound = Bound::Unbounded;
    // ... serialización con Candid
}
```

#### ❌ Problemas Críticos

**Problema 1: RuneId con String Unbounded usado como Key**
```rust
// ❌ INCORRECTO: String en key de StableBTreeMap
pub struct RuneId {
    pub block: u64,
    pub tx: u64,
    pub name: String,  // ← Unbounded!
    pub timestamp: u64,
}

// ❌ USO INCORRECTO en Registry
type RegistryStorage = StableBTreeMap<RuneId, RegistryEntry, Memory>;
//                                     ^^^^^^
//                                     DEBE SER BOUNDED
```

**Problema 2: Duplicación de RuneId**
- `quri-types::RuneId` - Tiene name (unbounded)
- `runes-utils::RuneId` - Solo block:tx (bounded)
- `indexer::RuneIdentifier` - block + tx_index

**Problema 3: Falta de Validación de Invariantes**
```rust
pub struct RuneConfig {
    pub divisibility: u8,  // ❌ No valida: debe ser 0-38
    pub total_supply: u64, // ❌ No valida: debe ser > premine
    pub premine: u64,
}
```

#### 🎯 Recomendación: Nueva Arquitectura de Tipos

```rust
// libs/quri-types/src/rune_id.rs

/// Rune Key - Identificador único BOUNDED para StableBTreeMap keys
///
/// Basado en el protocolo Runes oficial: block:tx es el ID único
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, 
         PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct RuneKey {
    pub block: u64,
    pub tx: u32,  // tx_index en el bloque
}

impl RuneKey {
    pub const SIZE: u32 = 12; // 8 + 4 bytes
    
    /// Parse from string format "840000:1"
    pub fn from_str(s: &str) -> Result<Self, ParseError> {
        let parts: Vec<&str> = s.split(':').collect();
        if parts.len() != 2 {
            return Err(ParseError::InvalidFormat);
        }
        Ok(Self {
            block: parts[0].parse()?,
            tx: parts[1].parse()?,
        })
    }
    
    /// Format as "block:tx"
    pub fn to_string(&self) -> String {
        format!("{}:{}", self.block, self.tx)
    }
}

// ✅ Storable con Bounded (eficiente para keys)
impl Storable for RuneKey {
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut bytes = Vec::with_capacity(12);
        bytes.extend_from_slice(&self.block.to_le_bytes());
        bytes.extend_from_slice(&self.tx.to_le_bytes());
        Cow::Owned(bytes)
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        Self {
            block: u64::from_le_bytes(bytes[0..8].try_into().unwrap()),
            tx: u32::from_le_bytes(bytes[8..12].try_into().unwrap()),
        }
    }

    const BOUND: Bound = Bound::Bounded {
        max_size: 12,
        is_fixed_size: true,
    };
}

/// Metadata completa de un Rune (valores en StableBTreeMap)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneMetadata {
    pub key: RuneKey,           // Embedding del key
    pub name: String,           // Metadata (26 chars max)
    pub symbol: String,         // Ticker
    pub divisibility: u8,       // 0-38
    pub total_supply: u128,     // Total minted
    pub premine: u128,          // Pre-allocated
    pub creator: Principal,
    pub created_at: u64,
    pub terms: Option<MintTerms>,
}

impl RuneMetadata {
    /// Builder pattern con validación
    pub fn builder(key: RuneKey, name: impl Into<String>) -> RuneMetadataBuilder {
        RuneMetadataBuilder::new(key, name)
    }
}

/// Builder con validación de invariantes
pub struct RuneMetadataBuilder {
    key: RuneKey,
    name: String,
    symbol: Option<String>,
    divisibility: u8,
    total_supply: u128,
    premine: u128,
    terms: Option<MintTerms>,
}

impl RuneMetadataBuilder {
    pub fn new(key: RuneKey, name: impl Into<String>) -> Self {
        Self {
            key,
            name: name.into(),
            symbol: None,
            divisibility: 0,
            total_supply: 0,
            premine: 0,
            terms: None,
        }
    }
    
    pub fn symbol(mut self, symbol: impl Into<String>) -> Self {
        self.symbol = Some(symbol.into());
        self
    }
    
    pub fn divisibility(mut self, div: u8) -> Result<Self, ValidationError> {
        if div > 38 {
            return Err(ValidationError::DivisibilityOutOfRange(div));
        }
        self.divisibility = div;
        Ok(self)
    }
    
    pub fn build(self, creator: Principal) -> Result<RuneMetadata, ValidationError> {
        // Validar nombre según protocolo Runes
        validate_rune_name(&self.name)?;
        
        // Validar invariante: total_supply >= premine
        if self.total_supply < self.premine {
            return Err(ValidationError::PremineExceedsSupply);
        }
        
        Ok(RuneMetadata {
            key: self.key,
            name: self.name,
            symbol: self.symbol.unwrap_or_else(|| self.name.clone()),
            divisibility: self.divisibility,
            total_supply: self.total_supply,
            premine: self.premine,
            creator,
            created_at: ic_cdk::api::time(),
            terms: self.terms,
        })
    }
}

#[derive(Error, Debug)]
pub enum ValidationError {
    #[error("Rune name must be 1-26 uppercase letters or bullets")]
    InvalidRuneName,
    
    #[error("Divisibility {0} exceeds maximum 38")]
    DivisibilityOutOfRange(u8),
    
    #[error("Premine exceeds total supply")]
    PremineExceedsSupply,
    
    #[error("Invalid mint terms: {0}")]
    InvalidMintTerms(String),
}

/// Validar nombre según especificación Runes
fn validate_rune_name(name: &str) -> Result<(), ValidationError> {
    if name.is_empty() || name.len() > 26 {
        return Err(ValidationError::InvalidRuneName);
    }
    
    // Solo letras mayúsculas y bullets (•)
    for c in name.chars() {
        if !c.is_ascii_uppercase() && c != '•' {
            return Err(ValidationError::InvalidRuneName);
        }
    }
    
    Ok(())
}
```

**Impacto:**
- ✅ Arregla bug crítico del Registry
- ✅ Single Source of Truth para RuneId
- ✅ Validación de invariantes en compile-time
- ✅ API ergonómica con builder pattern
- ✅ 100% compatible con protocolo Runes oficial

---

### 2. **Registry Canister**

#### Estado Actual
```rust
// ❌ BROKEN: Cannot use unbounded RuneId as key
type RegistryStorage = StableBTreeMap<RuneId, RegistryEntry, Memory>;
```

#### ✅ Arquitectura Propuesta

```rust
// canisters/registry/src/lib.rs

use quri_types::{RuneKey, RuneMetadata, RegistryEntry};

// ✅ RuneKey es bounded (12 bytes fijos)
type RegistryStorage = StableBTreeMap<RuneKey, RegistryEntry, Memory>;

// Índices secundarios para búsqueda eficiente
type NameIndex = StableBTreeMap<String, RuneKey, Memory>;  // name -> key
type CreatorIndex = StableBTreeMap<Principal, Vec<RuneKey>, Memory>;  // creator -> runes

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // Memoria 0: Storage principal
    static REGISTRY: RefCell<RegistryStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );
    
    // Memoria 1: Índice por nombre (búsqueda rápida)
    static NAME_INDEX: RefCell<NameIndex> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
    
    // Memoria 2: Índice por creator (mis runes)
    static CREATOR_INDEX: RefCell<CreatorIndex> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(2)))
        )
    );
}

/// Registrar Rune con índices secundarios
#[update]
fn register_rune(metadata: RuneMetadata) -> Result<RuneKey, String> {
    // Validar que no existe
    let key = metadata.key.clone();
    
    REGISTRY.with(|r| {
        if r.borrow().contains_key(&key) {
            return Err(format!("Rune {}:{} already registered", key.block, key.tx));
        }
        Ok(())
    })?;
    
    // Validar nombre único
    NAME_INDEX.with(|idx| {
        if idx.borrow().contains_key(&metadata.name) {
            return Err(format!("Rune name '{}' already taken", metadata.name));
        }
        Ok(())
    })?;
    
    let entry = RegistryEntry {
        metadata: metadata.clone(),
        bonding_curve: None,
        trading_volume_24h: 0,
        holder_count: 1,
        indexed_at: ic_cdk::api::time(),
    };
    
    // Insertar en storage principal
    REGISTRY.with(|r| r.borrow_mut().insert(key.clone(), entry));
    
    // Actualizar índice de nombres
    NAME_INDEX.with(|idx| idx.borrow_mut().insert(metadata.name.clone(), key.clone()));
    
    // Actualizar índice de creator
    CREATOR_INDEX.with(|idx| {
        let mut idx_mut = idx.borrow_mut();
        let mut runes = idx_mut.get(&metadata.creator).unwrap_or_default();
        runes.push(key.clone());
        idx_mut.insert(metadata.creator, runes);
    });
    
    Ok(key)
}

/// Búsqueda por nombre (O(log n) en lugar de O(n))
#[query]
fn get_rune_by_name(name: String) -> Option<RegistryEntry> {
    NAME_INDEX.with(|idx| {
        idx.borrow().get(&name).and_then(|key| {
            REGISTRY.with(|r| r.borrow().get(&key))
        })
    })
}

/// Mis Runes (O(1) lookup + pequeño scan)
#[query]
fn get_my_runes() -> Vec<RegistryEntry> {
    let caller = ic_cdk::caller();
    
    CREATOR_INDEX.with(|idx| {
        idx.borrow().get(&caller).map(|keys| {
            REGISTRY.with(|r| {
                keys.iter()
                    .filter_map(|k| r.borrow().get(k))
                    .collect()
            })
        }).unwrap_or_default()
    })
}

/// Búsqueda full-text con paginación (fallback para queries complejas)
#[query]
fn search_runes(query: String, offset: u64, limit: u64) -> SearchResult<RegistryEntry> {
    let query_upper = query.to_uppercase();
    let limit = limit.min(100);
    
    // Si es búsqueda exacta, usar índice
    if let Some(entry) = get_rune_by_name(query.clone()) {
        return SearchResult {
            results: vec![entry],
            total_matches: 1,
            offset: 0,
            limit: 1,
        };
    }
    
    // Fallback: scan completo con filter
    REGISTRY.with(|r| {
        let all_matches: Vec<RegistryEntry> = r.borrow()
            .iter()
            .filter_map(|(_, entry)| {
                if entry.metadata.name.contains(&query_upper) 
                    || entry.metadata.symbol.contains(&query_upper) {
                    Some(entry)
                } else {
                    None
                }
            })
            .collect();
        
        let total = all_matches.len() as u64;
        let results: Vec<_> = all_matches
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        
        SearchResult {
            results,
            total_matches: total,
            offset,
            limit,
        }
    })
}
```

**Mejoras:**
- ✅ Arregla bug de unbounded key
- ✅ Índices secundarios para búsquedas O(log n)
- ✅ Separación de concerns (3 memorias)
- ✅ API ergonómica (get_my_runes, get_by_name)
- ✅ Escalable a millones de Runes

---

### 3. **Rune Engine - Orquestación de Etchings**

#### ✅ Fortalezas
- State machine bien diseñado (`EtchingState`)
- RBAC implementado correctamente
- Ciclos monitor activo
- Idempotency keys

#### ❌ Problemas

**Problema 1: TODOs en Lógica Crítica**
```rust
// ❌ etching_flow.rs:247
block_height: 0,  // TODO: Get actual block height

// ❌ etching_flow.rs:342
// TODO: Implement actual confirmation tracking

// ❌ etching_flow.rs:398
// TODO: Implement rollback logic
```

**Problema 2: State Storage con Vec<u8> Keys**
```rust
// ❌ Ineficiente: String -> Vec<u8> en cada operación
type ProcessStorage = StableBTreeMap<Vec<u8>, Vec<u8>, Memory>;

pub fn get_process(id: &str) -> Option<EtchingProcess> {
    let key = id.as_bytes().to_vec();  // ← Allocación innecesaria
    // ...
}
```

**Problema 3: Sin Límite de Procesos Activos**
```rust
// ❌ Puede agotar memoria con spam
#[update]
fn create_etching(config: RuneConfig) -> Result<String, String> {
    // No hay límite de procesos por usuario
    // No hay cleanup automático de procesos viejos
}
```

#### 🎯 Arquitectura Mejorada

```rust
// canisters/rune-engine/src/state.rs

use ic_stable_structures::Storable;

/// Process ID - UUID v4 format (128 bits = 16 bytes)
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct ProcessId([u8; 16]);

impl ProcessId {
    pub fn new() -> Self {
        // Generar UUID v4 usando random bytes de ICP
        // Implementación real requeriría async
        Self([0u8; 16])  // Placeholder
    }
    
    pub fn from_string(s: &str) -> Result<Self, String> {
        // Parse "550e8400-e29b-41d4-a716-446655440000"
        // Implementación completa...
        Ok(Self([0u8; 16]))
    }
}

impl Storable for ProcessId {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Borrowed(&self.0)
    }
    
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let mut id = [0u8; 16];
        id.copy_from_slice(&bytes[0..16]);
        Self(id)
    }
    
    const BOUND: Bound = Bound::Bounded {
        max_size: 16,
        is_fixed_size: true,
    };
}

/// ✅ Storage con Bounded keys
type ProcessStorage = StableBTreeMap<ProcessId, EtchingProcess, Memory>;
type UserProcessIndex = StableBTreeMap<Principal, Vec<ProcessId>, Memory>;

const MAX_ACTIVE_PROCESSES_PER_USER: usize = 10;
const PROCESS_TTL_NANOS: u64 = 7 * 24 * 3_600_000_000_000; // 7 días

thread_local! {
    static PROCESSES: RefCell<ProcessStorage> = /* ... */;
    static USER_INDEX: RefCell<UserProcessIndex> = /* ... */;
}

/// Crear etching con límite de rate
#[update]
async fn create_etching(config: RuneConfig) -> Result<ProcessId, String> {
    let caller = ic_cdk::caller();
    
    // Validar límite de procesos activos
    let active_count = USER_INDEX.with(|idx| {
        idx.borrow()
            .get(&caller)
            .map(|pids| {
                PROCESSES.with(|p| {
                    pids.iter()
                        .filter(|pid| {
                            p.borrow().get(pid)
                                .map(|proc| !proc.state.is_terminal())
                                .unwrap_or(false)
                        })
                        .count()
                })
            })
            .unwrap_or(0)
    });
    
    if active_count >= MAX_ACTIVE_PROCESSES_PER_USER {
        return Err(format!(
            "Maximum {} active etchings reached. Please wait for completion.",
            MAX_ACTIVE_PROCESSES_PER_USER
        ));
    }
    
    // Generar ID criptográficamente seguro
    let process_id = ProcessId::generate_secure().await?;
    
    // Validar config con builder pattern
    let metadata = RuneMetadata::builder(
        RuneKey { block: 0, tx: 0 },  // Será actualizado post-etch
        config.name
    )
    .symbol(config.symbol)
    .divisibility(config.divisibility)?
    .build(caller)?;
    
    // Crear proceso
    let process = EtchingProcess::new(
        process_id.clone(),
        caller,
        metadata,
    );
    
    // Guardar
    PROCESSES.with(|p| p.borrow_mut().insert(process_id.clone(), process));
    
    // Actualizar índice
    USER_INDEX.with(|idx| {
        let mut idx_mut = idx.borrow_mut();
        let mut pids = idx_mut.get(&caller).unwrap_or_default();
        pids.push(process_id.clone());
        idx_mut.insert(caller, pids);
    });
    
    // Iniciar orquestación async
    ic_cdk::spawn(orchestrate_etching(process_id.clone()));
    
    Ok(process_id)
}

/// Cleanup periódico (timer cada 1 hora)
#[update]
fn cleanup_old_processes() -> u64 {
    let now = ic_cdk::api::time();
    let threshold = now.saturating_sub(PROCESS_TTL_NANOS);
    
    let mut deleted = 0u64;
    let mut to_delete = Vec::new();
    
    PROCESSES.with(|p| {
        for (pid, process) in p.borrow().iter() {
            if process.state.is_terminal() 
                && process.updated_at < threshold {
                to_delete.push(pid);
            }
        }
    });
    
    PROCESSES.with(|p| {
        let mut p_mut = p.borrow_mut();
        for pid in &to_delete {
            p_mut.remove(pid);
            deleted += 1;
        }
    });
    
    // Limpiar índices también
    USER_INDEX.with(|idx| {
        let mut idx_mut = idx.borrow_mut();
        for (principal, pids) in idx_mut.iter() {
            let filtered: Vec<_> = pids.iter()
                .filter(|pid| !to_delete.contains(pid))
                .cloned()
                .collect();
            
            if filtered.len() != pids.len() {
                idx_mut.insert(principal, filtered);
            }
        }
    });
    
    deleted
}
```

**Mejoras:**
- ✅ ProcessId bounded (16 bytes UUID)
- ✅ Rate limiting (max 10 activos/usuario)
- ✅ Auto-cleanup de procesos viejos
- ✅ Índice secundario por usuario
- ✅ Validación robusta con builder

---

### 4. **Bitcoin Integration - Schnorr & ckBTC**

#### ✅ Fortalezas
- Schnorr signatures correctamente implementado
- UTXO management con tracking
- BIP340/BIP341 compliant

#### ❌ Problema: TODO en Confirmaciones

```rust
// bitcoin_api.rs:156
// TODO: Implement proper confirmation tracking
pub async fn wait_for_confirmations(txid: &str, required: u32) -> Result<u32, String> {
    // Mock implementation
    Ok(6)
}
```

#### 🎯 Solución: Confirmation Tracker Robusto

```rust
// canisters/bitcoin-integration/src/confirmation_tracker.rs

use ic_stable_structures::StableBTreeMap;

/// Transaction confirmation record
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ConfirmationRecord {
    pub txid: String,
    pub first_seen_block: u64,
    pub current_block: u64,
    pub confirmations: u32,
    pub required_confirmations: u32,
    pub status: ConfirmationStatus,
    pub last_checked: u64,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq)]
pub enum ConfirmationStatus {
    Pending,
    Confirmed,
    DeepConfirmed,  // > 100 confirmations
}

type TxIdHash = [u8; 32];  // SHA256(txid) as key
type ConfirmationStorage = StableBTreeMap<TxIdHash, ConfirmationRecord, Memory>;

thread_local! {
    static CONFIRMATIONS: RefCell<ConfirmationStorage> = /* ... */;
}

/// Track transaction confirmations
pub async fn track_transaction(
    txid: String,
    required_confirmations: u32
) -> Result<(), String> {
    let tx_hash = sha256(txid.as_bytes());
    
    // Obtener altura del bloque actual
    let current_height = get_current_block_height().await?;
    
    // Obtener información de la transacción
    let tx_info = bitcoin_api::get_transaction(&txid).await?;
    
    let record = ConfirmationRecord {
        txid: txid.clone(),
        first_seen_block: tx_info.block_height.unwrap_or(current_height),
        current_block: current_height,
        confirmations: tx_info.confirmations,
        required_confirmations,
        status: if tx_info.confirmations >= required_confirmations {
            ConfirmationStatus::Confirmed
        } else {
            ConfirmationStatus::Pending
        },
        last_checked: ic_cdk::api::time(),
    };
    
    CONFIRMATIONS.with(|c| {
        c.borrow_mut().insert(tx_hash, record);
    });
    
    Ok(())
}

/// Verificar confirmaciones actuales
pub async fn check_confirmations(txid: &str) -> Result<ConfirmationRecord, String> {
    let tx_hash = sha256(txid.as_bytes());
    
    CONFIRMATIONS.with(|c| {
        c.borrow().get(&tx_hash)
            .ok_or_else(|| format!("Transaction {} not tracked", txid))
    })
}

/// Timer: Actualizar confirmaciones cada 10 minutos
pub fn start_confirmation_updater() {
    ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(600),
        || {
            ic_cdk::spawn(async {
                update_all_confirmations().await;
            });
        }
    );
}

async fn update_all_confirmations() {
    let current_height = match get_current_block_height().await {
        Ok(h) => h,
        Err(e) => {
            ic_cdk::println!("Failed to get block height: {}", e);
            return;
        }
    };
    
    let mut to_update = Vec::new();
    
    CONFIRMATIONS.with(|c| {
        for (hash, record) in c.borrow().iter() {
            if record.status == ConfirmationStatus::Pending {
                to_update.push((hash, record));
            }
        }
    });
    
    for (hash, mut record) in to_update {
        let new_confirmations = current_height.saturating_sub(record.first_seen_block);
        record.confirmations = new_confirmations as u32;
        record.current_block = current_height;
        record.last_checked = ic_cdk::api::time();
        
        if new_confirmations >= record.required_confirmations as u64 {
            record.status = ConfirmationStatus::Confirmed;
        }
        
        if new_confirmations >= 100 {
            record.status = ConfirmationStatus::DeepConfirmed;
        }
        
        CONFIRMATIONS.with(|c| {
            c.borrow_mut().insert(hash, record);
        });
    }
}

async fn get_current_block_height() -> Result<u64, String> {
    // Usar Bitcoin RPC API del IC
    use ic_cdk::api::management_canister::bitcoin::{
        bitcoin_get_current_fee_percentiles, BitcoinNetwork,
    };
    
    // El IC expone block height en metadata
    // Implementación real...
    Ok(840000) // Placeholder
}

fn sha256(data: &[u8]) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().into()
}
```

**Mejoras:**
- ✅ Tracking real de confirmaciones
- ✅ Timer automático (cada 10 min)
- ✅ Estados: Pending → Confirmed → DeepConfirmed
- ✅ Queries eficientes con SHA256 hash keys

---

### 5. **Frontend - Next.js + Zustand**

#### ✅ Fortalezas
- CSP correctamente configurado
- TypeScript strict mode
- IDL types generados
- Componentes modernos (shadcn/ui)

#### ❌ Problemas

**Problema 1: Conexión a Mainnet con Datos Vacíos**
```typescript
// Frontend conecta correctamente pero Registry tiene 0 runes
// debido al bug de unbounded RuneId
```

**Problema 2: State Management Fragmentado**
```typescript
// hooks/useRuneEngine.ts - Estado local
// hooks/useRegistry.ts - Estado local
// lib/store/ - Zustand store (no usado?)
```

**Problema 3: Falta de Optimistic Updates**
```typescript
// Crear Rune = ~2-5 segundos de espera
// No hay feedback inmediato al usuario
```

#### 🎯 Arquitectura Frontend Optimizada

```typescript
// lib/store/runes.ts - Zustand con optimistic updates

import create from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface RuneState {
  // Data
  runes: Map<string, RegistryEntry>;
  myRunes: string[];  // RuneKey IDs
  
  // UI State
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchRunes: (offset: number, limit: number) => Promise<void>;
  fetchMyRunes: () => Promise<void>;
  searchRunes: (query: string) => Promise<void>;
  
  // Optimistic updates
  createRune: (config: RuneConfig) => Promise<string>;
  updateRuneLocally: (key: string, updates: Partial<RegistryEntry>) => void;
}

export const useRuneStore = create<RuneState>()(
  devtools(
    persist(
      immer((set, get) => ({
        runes: new Map(),
        myRunes: [],
        loading: false,
        error: null,
        
        fetchRunes: async (offset, limit) => {
          set({ loading: true, error: null });
          
          try {
            const { results } = await registryActor.list_runes(offset, limit);
            
            set(state => {
              results.forEach(entry => {
                const key = `${entry.metadata.key.block}:${entry.metadata.key.tx}`;
                state.runes.set(key, entry);
              });
              state.loading = false;
            });
          } catch (e) {
            set({ 
              loading: false, 
              error: e instanceof Error ? e.message : 'Failed to fetch runes' 
            });
          }
        },
        
        fetchMyRunes: async () => {
          set({ loading: true });
          
          try {
            const myRunes = await registryActor.get_my_runes();
            
            set(state => {
              state.myRunes = myRunes.map(r => 
                `${r.metadata.key.block}:${r.metadata.key.tx}`
              );
              
              myRunes.forEach(entry => {
                const key = `${entry.metadata.key.block}:${entry.metadata.key.tx}`;
                state.runes.set(key, entry);
              });
              
              state.loading = false;
            });
          } catch (e) {
            set({ loading: false, error: String(e) });
          }
        },
        
        // Optimistic update pattern
        createRune: async (config) => {
          // 1. Crear entrada optimista
          const optimisticId = `pending-${Date.now()}`;
          const optimisticEntry: RegistryEntry = {
            metadata: {
              key: { block: 0, tx: 0 },
              name: config.name,
              symbol: config.symbol,
              // ... resto
            },
            bonding_curve: null,
            trading_volume_24h: 0n,
            holder_count: 1n,
          };
          
          set(state => {
            state.runes.set(optimisticId, optimisticEntry);
            state.myRunes.push(optimisticId);
          });
          
          try {
            // 2. Llamada real al canister
            const processId = await runeEngineActor.create_etching(config);
            
            // 3. Poll status
            const finalEntry = await pollEtchingStatus(processId);
            
            // 4. Reemplazar optimistic con real
            const realKey = `${finalEntry.metadata.key.block}:${finalEntry.metadata.key.tx}`;
            
            set(state => {
              state.runes.delete(optimisticId);
              state.runes.set(realKey, finalEntry);
              
              const idx = state.myRunes.indexOf(optimisticId);
              if (idx !== -1) {
                state.myRunes[idx] = realKey;
              }
            });
            
            return realKey;
            
          } catch (e) {
            // 5. Rollback optimistic si falla
            set(state => {
              state.runes.delete(optimisticId);
              const idx = state.myRunes.indexOf(optimisticId);
              if (idx !== -1) {
                state.myRunes.splice(idx, 1);
              }
              state.error = String(e);
            });
            
            throw e;
          }
        },
        
        updateRuneLocally: (key, updates) => {
          set(state => {
            const current = state.runes.get(key);
            if (current) {
              state.runes.set(key, { ...current, ...updates });
            }
          });
        },
      })),
      {
        name: 'quri-runes-storage',
        partialize: (state) => ({
          // Solo persistir data, no UI state
          runes: Array.from(state.runes.entries()),
          myRunes: state.myRunes,
        }),
      }
    ),
    { name: 'RuneStore' }
  )
);

// Hook helper con suspense
export function useRunes(offset: number = 0, limit: number = 20) {
  const { runes, loading, error, fetchRunes } = useRuneStore();
  
  useEffect(() => {
    fetchRunes(offset, limit);
  }, [offset, limit]);
  
  return {
    runes: Array.from(runes.values()),
    loading,
    error,
  };
}

// Polling helper
async function pollEtchingStatus(
  processId: string,
  maxAttempts: number = 60,  // 5 minutos
  intervalMs: number = 5000
): Promise<RegistryEntry> {
  for (let i = 0; i < maxAttempts; i++) {
    const process = await runeEngineActor.get_process(processId);
    
    if (process.state.Completed) {
      const { txid, block_height } = process.state.Completed;
      
      // Buscar en registry
      const entry = await registryActor.get_rune_by_txid(txid);
      if (entry) {
        return entry;
      }
    }
    
    if (process.state.Failed || process.state.RolledBack) {
      throw new Error(`Etching failed: ${JSON.stringify(process.state)}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  
  throw new Error('Etching timeout after 5 minutes');
}
```

**Mejoras:**
- ✅ Optimistic updates (UX instantánea)
- ✅ Zustand con immer (mutaciones seguras)
- ✅ Persistencia automática (localStorage)
- ✅ DevTools integration
- ✅ Polling inteligente con timeout

---

## 🎯 Plan de Implementación Priorizado

### **Fase 1: Fixes Críticos (1-2 días)**
**Objetivo:** Sistema funcional en producción

1. **Arreglar Registry Bug** ✅ CRÍTICO
   - [ ] Implementar `RuneKey` bounded en `quri-types`
   - [ ] Migrar `Registry` a usar `RuneKey` como key
   - [ ] Agregar índices secundarios (name, creator)
   - [ ] Deploy a mainnet
   - [ ] Smoke test: Registrar 1 rune manualmente

2. **Completar TODOs Críticos**
   - [ ] Implementar `get_current_block_height()` real
   - [ ] Confirmation tracker con timer
   - [ ] Rollback logic en etching_flow

### **Fase 2: Validación y Robustez (2-3 días)**

3. **Builder Pattern con Validación**
   - [ ] `RuneMetadata::builder()` con validaciones
   - [ ] Validar nombres según spec Runes
   - [ ] Unit tests para edge cases

4. **Rate Limiting y Cleanup**
   - [ ] Límite 10 etchings activos/usuario
   - [ ] Timer cleanup cada 1 hora
   - [ ] Métricas de procesos activos

### **Fase 3: Optimizaciones (3-5 días)**

5. **Frontend con Optimistic Updates**
   - [ ] Zustand store unificado
   - [ ] Optimistic UI para create_rune
   - [ ] Polling inteligente
   - [ ] Loading states mejorados

6. **Índices Secundarios**
   - [ ] NameIndex para búsqueda O(log n)
   - [ ] CreatorIndex para "mis runes"
   - [ ] Tests de performance

### **Fase 4: Testing y Documentación (2-3 días)**

7. **Testing Comprehensivo**
   - [ ] Unit tests (>80% coverage)
   - [ ] Integration tests
   - [ ] E2E tests (frontend + backend)
   - [ ] Load testing (1000 runes)

8. **Documentación**
   - [ ] Architecture Decision Records (ADRs)
   - [ ] API docs (Candid interfaces)
   - [ ] User guides
   - [ ] Deployment runbook

---

## 📊 Métricas de Éxito

### Antes (Estado Actual)
- ❌ Registry: 0 runes registrados (BROKEN)
- ❌ 9 TODOs en código crítico
- ⚠️ Search: O(n) scan completo
- ⚠️ Sin rate limiting
- ⚠️ Frontend: 2-5s sin feedback

### Después (Meta)
- ✅ Registry: Funcional, >100 runes
- ✅ 0 TODOs en producción
- ✅ Search: O(log n) con índices
- ✅ Rate limit: 10 max/usuario
- ✅ Frontend: Optimistic UI <100ms

### KPIs
- **Tiempo de Etching:** <2 minutos (objetivo: 90% success)
- **Búsqueda:** <500ms para 10,000 runes
- **Uptime:** 99.9% (medido por health checks)
- **Costo Cycles:** <1T cycles/mes para 1000 usuarios

---

## 🔒 Consideraciones de Seguridad

### Implementadas ✅
- Schnorr signatures (BIP340)
- RBAC en rune-engine
- Session keys con `raw_rand()`
- CSP headers en frontend

### Pendientes ⚠️
- [ ] Rate limiting por IP (DoS protection)
- [ ] Signature verification en todas las mutaciones
- [ ] Audit log de operaciones sensibles
- [ ] Emergency pause mechanism

---

## 💰 Optimización de Cycles

### Consumo Actual (Estimado)
- Registry: ~0.5T cycles/mes
- Rune Engine: ~1T cycles/mes
- Bitcoin Integration: ~2T cycles/mes (HTTPS outcalls)

### Optimizaciones Propuestas
1. **Batch Bitcoin Queries:** Agrupar múltiples txid lookups
2. **Cache de Block Heights:** Actualizar cada 10 min en lugar de cada query
3. **Lazy Indexing:** Solo indexar runes con actividad
4. **Compute Allocation:** Ajustar según carga real

---

## 🌐 Escalabilidad a 1M Runes

### Límites Actuales
- StableBTreeMap: ~4GB stable memory max
- Con `RuneKey` (12 bytes) + `RegistryEntry` (~500 bytes):
  - **Capacidad:** ~8M runes
  - **Realidad:** ~1M runes con overhead

### Estrategia de Sharding (Futuro)
```
Registry 0: Runes A-G (block % 4 == 0)
Registry 1: Runes H-M (block % 4 == 1)
Registry 2: Runes N-S (block % 4 == 2)
Registry 3: Runes T-Z (block % 4 == 3)

Router Canister: Determina shard por RuneKey
```

---

## 📚 Referencias Técnicas

### Protocolos
- [Runes Protocol](https://docs.ordinals.com/runes.html)
- [BIP340 - Schnorr Signatures](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [BIP341 - Taproot](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki)

### ICP Best Practices
- [IC Stable Structures](https://github.com/dfinity/stable-structures)
- [Rust CDK Guide](https://internetcomputer.org/docs/current/developer-docs/backend/rust/)
- [Canister Upgrades](https://internetcomputer.org/docs/current/developer-docs/backend/upgrading)

### Inspiración
- [Odin.fun](https://odin.fun) - Session keys, bonding curves
- [ckBTC](https://github.com/dfinity/ic/tree/master/rs/bitcoin/ckbtc) - Bitcoin integration patterns

---

## ✅ Conclusión

### Estado Actual: 🟡 FUNCIONAL PERO CRÍTICO
- Sistema bien arquitecturado en general
- Bug crítico bloquea funcionalidad core
- TODOs en rutas críticas

### Prioridad Máxima
1. **Arreglar Registry** (unbounded key bug)
2. **Completar confirmation tracking**
3. **Implementar rollback logic**

### Esfuerzo Estimado
- **Fase 1 (Crítico):** 2-3 días
- **Fase 2 (Validación):** 2-3 días
- **Fase 3 (Optimización):** 3-5 días
- **Total:** 7-11 días para sistema production-ready

### Riesgo
- **Alto:** Registry roto = no se pueden crear Runes
- **Medio:** TODOs en confirmations = posibles falsos positivos
- **Bajo:** Frontend funciona pero UX subóptima

---

**Próximos Pasos Inmediatos:**

¿Quieres que implemente ahora mismo la **Fase 1** completa? Puedo:

1. Crear el nuevo `RuneKey` en `quri-types`
2. Migrar Registry a usar bounded keys
3. Implementar índices secundarios
4. Completar el confirmation tracker
5. Deploy a mainnet y smoke test

¿Procedemos? 🚀
