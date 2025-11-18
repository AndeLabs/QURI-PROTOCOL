# 📚 QURI Protocol - Notas de Aprendizaje

Este documento captura conceptos clave aprendidos durante el desarrollo.

## 🎓 Lección 1: Stable Memory y Storable Trait

### Concepto Principal

En ICP, hay dos tipos de memoria:

1. **Heap Memory (Temporal)** 🔄
   - Se pierde en upgrades
   - Máximo 4 GiB
   - Rápida pero volátil

2. **Stable Memory (Persistente)** 💾
   - Sobrevive upgrades
   - Hasta 500 GiB
   - Para datos críticos

### El Trait Storable

Es un "traductor" entre Rust y Stable Memory:

```rust
pub trait Storable {
    fn to_bytes(&self) -> Cow<[u8]>;      // Rust → Bytes
    fn from_bytes(bytes: Cow<[u8]>) -> Self;  // Bytes → Rust
    const BOUND: Bound;                    // Límite de tamaño
}
```

### Bounded vs Unbounded

#### Bounded (Tamaño Fijo)
- **Cuándo usar**: Tipos de tamaño conocido y constante
- **Ventaja**: Más eficiente, acceso O(1)
- **Desventaja**: No flexible

```rust
// Ejemplo: Un contador simple
struct Counter {
    value: u64,  // Siempre 8 bytes
}

const BOUND: Bound = Bound::Bounded {
    max_size: 8,
    is_fixed_size: true,
};
```

#### Unbounded (Tamaño Variable)
- **Cuándo usar**: Strings, Vecs, tipos complejos
- **Ventaja**: Flexible, permite crecimiento
- **Desventaja**: Overhead de metadata

```rust
// Ejemplo: RuneId con string variable
struct RuneId {
    block: u64,
    name: String,  // 1-26 caracteres
}

const BOUND: Bound = Bound::Unbounded;
```

### Por Qué Candid?

**Candid** es el formato de serialización oficial de ICP:

✅ **Ventajas**:
- Compatible entre versiones
- Type-safe
- Interoperable (Rust, Motoko, TypeScript)
- Maneja tipos complejos automáticamente

```rust
// Serializar
let bytes = candid::encode_one(&my_struct)?;

// Deserializar
let my_struct: MyType = candid::decode_one(&bytes)?;
```

### Mejores Prácticas

1. **Usa Candid siempre** para encoding/decoding
2. **Prefiere Unbounded** si tienes duda
3. **Maneja errores** con `expect()` y mensajes claros
4. **Versiona estructuras** con `Option<T>` para nuevos campos

---

## 🎓 Lección 2: Memory Manager Pattern

### Concepto

El **MemoryManager** divide la stable memory en múltiples "memorias virtuales".

### Problema Sin Memory Manager

```rust
// ❌ PROBLEMA: Un solo espacio de memoria
let map1 = StableBTreeMap::init(memory);
let map2 = StableBTreeMap::init(memory); // ⚠️ Conflicto!
```

Ambas estructuras intentarían usar la misma memoria, causando corrupción.

### Solución: Memory Manager

```rust
// ✅ SOLUCIÓN: Memorias virtuales separadas
static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> = ...;

let memory0 = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)));
let memory1 = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)));

let map1 = StableBTreeMap::init(memory0);  // ✅ Usa memoria 0
let map2 = StableBTreeMap::init(memory1);  // ✅ Usa memoria 1
```

### Límites

- Máximo **255 memorias virtuales** (MemoryId 0-254)
- Cada memoria es independiente
- No hay overhead de performance

### Patrón Recomendado

```rust
// Definir IDs como constantes para claridad
const RUNES_MEMORY_ID: MemoryId = MemoryId::new(0);
const INDEX_MEMORY_ID: MemoryId = MemoryId::new(1);
const SESSIONS_MEMORY_ID: MemoryId = MemoryId::new(2);
```

---

## 🎓 Lección 3: Thread-Local Storage Pattern

### Concepto

`thread_local!` crea storage global pero seguro en canisters.

### Por Qué Thread-Local?

En ICP, cada canister es **single-threaded**, pero:
- El estado debe ser global (accesible desde todas las funciones)
- Debe ser mutable (para actualizar datos)
- Debe ser seguro (no race conditions)

### El Patrón

```rust
thread_local! {
    // 🔒 Interior mutability con RefCell
    static STORAGE: RefCell<MyType> = RefCell::new(...);
}

// Uso
STORAGE.with(|storage| {
    storage.borrow_mut().insert(key, value);
});
```

### RefCell Explicado

**RefCell** permite mutabilidad interior:

```rust
// Sin RefCell - ❌ No compila
static mut COUNTER: u64 = 0;  // Unsafe!

// Con RefCell - ✅ Safe!
thread_local! {
    static COUNTER: RefCell<u64> = RefCell::new(0);
}

COUNTER.with(|c| {
    *c.borrow_mut() += 1;  // Safe mutation
});
```

**Reglas**:
- `borrow()` → lectura inmutable (múltiples permitidos)
- `borrow_mut()` → escritura mutable (solo uno a la vez)
- Panic en runtime si se viola (mejor que undefined behavior!)

---

## 🎓 Lección 4: Candid Type System

### Tipos Primitivos

```rust
// Números
nat8, nat16, nat32, nat64    // Unsigned
int8, int16, int32, int64    // Signed

// Texto
text                          // UTF-8 string
principal                     // ICP identity

// Colecciones
vec nat64                     // Vector
opt text                      // Optional
```

### Tipos Compuestos

```rust
// Record (struct)
type User = record {
    id: nat64;
    name: text;
    email: opt text;  // Optional field
};

// Variant (enum)
type Result = variant {
    Ok: nat64;
    Err: text;
};
```

### Evolución de Tipos

**Regla de Oro**: Solo agregar, nunca quitar

```rust
// ✅ SAFE: Agregar campo opcional
type User_v1 = record {
    id: nat64;
    name: text;
};

type User_v2 = record {
    id: nat64;
    name: text;
    email: opt text;  // Nuevo campo opcional
};

// ❌ UNSAFE: Quitar campo
type User_v3 = record {
    id: nat64;
    // name removido - ROMPE COMPATIBILIDAD!
};
```

---

## 🎓 Lección 5: Error Handling en ICP

### Patrón Result

```rust
// ✅ SIEMPRE usa Result para APIs públicas
#[update]
fn create_rune(config: RuneConfig) -> Result<RuneId, String> {
    validate_config(&config)?;  // Propagación automática

    let id = generate_id(&config);
    Ok(id)
}
```

### expect() vs unwrap()

```rust
// ❌ MAL: unwrap sin contexto
let value = some_option.unwrap();

// ✅ BIEN: expect con mensaje
let value = some_option
    .expect("RuneId must exist after creation");

// ✅ MEJOR: Manejar el error
let value = some_option
    .ok_or_else(|| "RuneId not found".to_string())?;
```

### Custom Error Types

```rust
#[derive(CandidType, Deserialize)]
pub enum QuriError {
    InvalidRuneName(String),
    InsufficientBalance,
    TransactionFailed(String),
}

impl Display for QuriError {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        match self {
            Self::InvalidRuneName(n) =>
                write!(f, "Invalid rune name: {}", n),
            // ...
        }
    }
}
```

---

## 📊 Comparación de Tecnologías

### Serialization: Candid vs Bincode vs JSON

| Feature | Candid | Bincode | JSON |
|---------|--------|---------|------|
| Type Safety | ✅ Excellent | ⚠️ Manual | ❌ None |
| Compatibility | ✅ Versioned | ❌ Brittle | ⚠️ Loose |
| Size | ⚠️ Medium | ✅ Small | ❌ Large |
| ICP Native | ✅ Yes | ❌ No | ❌ No |
| **Recomendación** | **✅ USAR** | Para blobs | Solo debug |

### Storage: Heap vs Stable

| Feature | Heap | Stable |
|---------|------|--------|
| Tamaño | 4 GiB | 500 GiB |
| Persistencia | ❌ Temporal | ✅ Permanente |
| Velocidad | ✅ Rápida | ⚠️ Aceptable |
| Upgrade Safety | ❌ Se pierde | ✅ Persiste |
| **Uso** | Cache temporal | **Datos críticos** |

---

## 💡 Tips y Trucos

### 1. Optimización de Ciclos

```rust
// ❌ INEFICIENTE: Llamadas repetidas
for i in 0..100 {
    STORAGE.with(|s| s.borrow().get(&i));  // 100 llamadas
}

// ✅ EFICIENTE: Una llamada
STORAGE.with(|s| {
    let storage = s.borrow();
    for i in 0..100 {
        storage.get(&i);  // 1 llamada, 100 accesos
    }
});
```

### 2. Logging Eficiente

```rust
// ❌ Solo en desarrollo
ic_cdk::println!("Debug: {:?}", large_struct);

// ✅ Condicional
#[cfg(debug_assertions)]
ic_cdk::println!("Debug: {:?}", large_struct);
```

### 3. Inicialización Lazy

```rust
thread_local! {
    // ❌ Eager init (caro si no se usa)
    static DATA: RefCell<Vec<u8>> = RefCell::new(
        expensive_initialization()
    );

    // ✅ Lazy init
    static DATA: RefCell<Option<Vec<u8>>> = RefCell::new(None);
}

fn get_data() -> Vec<u8> {
    DATA.with(|d| {
        let mut data = d.borrow_mut();
        if data.is_none() {
            *data = Some(expensive_initialization());
        }
        data.as_ref().unwrap().clone()
    })
}
```

---

## 🔍 Debugging en ICP

### Print Debugging

```rust
ic_cdk::println!("Value: {:?}", my_var);
```

### Traps (Errores)

```rust
// Trap manual
ic_cdk::trap("Critical error occurred");

// Automático con unwrap
let value = risky_operation().unwrap(); // Trap si None
```

### Testing Canisters

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rune_creation() {
        // Setup
        let config = RuneConfig { ... };

        // Execute
        let result = validate_config(&config);

        // Assert
        assert!(result.is_ok());
    }
}
```

---

## 🎓 Lección 6: Threshold Schnorr Signatures en ICP

### Concepto Principal

**Schnorr signatures** son un esquema de firma digital moderno que Bitcoin adoptó con la actualización Taproot (BIP-340). En ICP, usamos **threshold Schnorr** donde la clave privada está distribuida entre múltiples nodos.

### ¿Qué es Threshold Cryptography?

#### Sistema Tradicional (Single Key)
```
┌─────────────┐
│ Private Key │──► Firma transacción
└─────────────┘
    ❌ Si se compromete = fondos perdidos
    ❌ Single point of failure
    ❌ Requiere hardware seguro
```

#### Threshold Cryptography (Distributed Key)
```
Nodo 1 (Shard 1) ─┐
Nodo 2 (Shard 2) ─┤──► Threshold Signature
Nodo 3 (Shard 3) ─┘     (Requiere 2 de 3 nodos)

✅ No single point of failure
✅ Key nunca existe completa en un solo lugar
✅ Consenso distribuido (Byzantine fault tolerance)
✅ No requiere hardware especializado
```

### Por Qué Schnorr para Runes?

1. **Taproot Requirement**: Runes usan direcciones P2TR (Pay-to-Taproot)
   - P2TR es el estándar moderno de Bitcoin (activado Nov 2021)
   - Soporta contratos más eficientes y privados

2. **BIP-340 Standard**: Schnorr es el esquema oficial
   - 64 bytes por firma (vs 70-72 bytes ECDSA)
   - Permite signature aggregation (BatchVerify)
   - Determinístico (no requiere nonce aleatorio)

3. **Compatibilidad ICP**: Management canister tiene API nativa
   - `schnorr_public_key`: Obtener public key del canister
   - `sign_with_schnorr`: Firmar mensajes con threshold key

### Anatomía de una Schnorr Signature

```rust
// 1. Public Key (33 bytes - punto X coordinada)
let pubkey: [u8; 33] = [...];

// 2. Message Hash (32 bytes)
let msg_hash: [u8; 32] = sha256(transaction);

// 3. Signature (64 bytes)
let signature: [u8; 64] = {
    r: [u8; 32],  // Punto R (x-coordinate)
    s: [u8; 32],  // Scalar s
};

// Ecuación de verificación:
// s·G = R + H(R || P || m)·P
// Donde:
// - G: Generator point (base point de secp256k1)
// - R: Punto aleatorio (r·G)
// - P: Public key
// - m: Message
// - H: Hash function
```

### Implementación en ICP

Nuestro módulo `schnorr.rs` implementa dos funciones principales:

#### 1. Obtener Public Key

```rust
pub async fn get_schnorr_public_key(
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let args = SchnorrPublicKeyArgs {
        canister_id: None,  // Usa el caller canister ID
        derivation_path,     // Path para derivar keys únicas
        key_id: SchnorrKeyId {
            algorithm: "bip340secp256k1",  // Schnorr sobre secp256k1
            name: "dfx_test_key",           // Key ID (dev/prod)
        },
    };

    // Llamada al management canister
    let (result,): (SchnorrPublicKeyResult,) = ic_cdk::call(
        Principal::management_canister(),
        "schnorr_public_key",
        (args,),
    ).await?;

    Ok(result.public_key)
}
```

**Derivation Path**: Permite crear múltiples keys desde una master key
```
Master Key
    │
    ├─ derivation_path: [canister_id]
    │  └─► Key única para este canister
    │
    ├─ derivation_path: [canister_id, user_principal]
    │  └─► Key única para usuario específico
    │
    └─ derivation_path: [canister_id, rune_id]
       └─► Key única para un Rune específico
```

#### 2. Firmar Mensaje

```rust
pub async fn sign_message(
    message: Vec<u8>,
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    let args = SignWithSchnorrArgs {
        message,            // Raw bytes del mensaje (NO pre-hasheado)
        derivation_path,    // Mismo path que usamos para la public key
        key_id: SchnorrKeyId {
            algorithm: "bip340secp256k1",
            name: "dfx_test_key",
        },
    };

    // El management canister:
    // 1. Hashea el mensaje (SHA-256)
    // 2. Coordina con otros nodos para crear threshold signature
    // 3. Retorna firma de 64 bytes
    let (result,): (SignWithSchnorrResult,) = ic_cdk::call(
        Principal::management_canister(),
        "sign_with_schnorr",
        (args,),
    ).await?;

    Ok(result.signature)
}
```

### Flujo Completo: Etching de Rune

```rust
// Paso 1: Obtener public key del canister
let derivation_path = vec![ic_cdk::api::id().as_slice().to_vec()];
let pubkey = get_schnorr_public_key(derivation_path.clone()).await?;

// Paso 2: Derivar dirección Bitcoin P2TR
let address = derive_p2tr_address(&pubkey, BitcoinNetwork::Mainnet)?;
// address = "bc1p..." (bech32m encoding)

// Paso 3: Construir transacción Bitcoin
let tx = BitcoinTransaction {
    version: 2,
    inputs: vec![/* UTXOs */],
    outputs: vec![
        // Output 0: OP_RETURN con runestone
        TxOut {
            value: 0,
            script_pubkey: create_runestone_script(&etching)?,
        },
        // Output 1: Change
        TxOut {
            value: change_amount,
            script_pubkey: p2tr_script(&pubkey),
        },
    ],
    locktime: 0,
};

// Paso 4: Crear sighash (BIP-341 Taproot)
let sighash = create_taproot_sighash(&tx)?;

// Paso 5: Firmar con threshold Schnorr
let signature = sign_message(sighash, derivation_path).await?;

// Paso 6: Agregar witness a la transacción
tx.inputs[0].witness = vec![signature];

// Paso 7: Broadcast a Bitcoin network
broadcast_transaction(&tx).await?;
```

### Seguridad y Mejores Prácticas

#### ✅ DO

1. **Usa derivation paths únicos** por propósito
   ```rust
   // ✅ BIEN: Diferentes paths para diferentes propósitos
   let canister_key = vec![canister_id.as_slice()];
   let user_key = vec![canister_id.as_slice(), user.as_slice()];
   ```

2. **Verifica el network antes de firmar**
   ```rust
   // ✅ BIEN: Previene firmas en network incorrecta
   if config.network != BitcoinNetwork::Mainnet {
       return Err("Wrong network".to_string());
   }
   ```

3. **Valida sighashes antes de firmar**
   ```rust
   // ✅ BIEN: Verifica formato del sighash
   if sighash.len() != 32 {
       return Err("Invalid sighash length".to_string());
   }
   ```

#### ❌ DON'T

1. **No uses keys hardcodeadas**
   ```rust
   // ❌ MAL: Key ID hardcodeado en producción
   const KEY_ID: &str = "dfx_test_key";  // Solo para desarrollo!
   ```

2. **No firmes mensajes sin validar**
   ```rust
   // ❌ MAL: Firmar sin verificar el contenido
   let sig = sign_message(untrusted_data, path).await?;
   ```

3. **No reutilices derivation paths**
   ```rust
   // ❌ MAL: Misma key para todo
   let path = vec![b"default".to_vec()];
   ```

### Diferencias: Schnorr vs ECDSA

| Feature | Schnorr (BIP-340) | ECDSA (Pre-Taproot) |
|---------|-------------------|---------------------|
| **Tamaño Firma** | 64 bytes | 70-72 bytes |
| **Public Key** | 32 bytes (x-only) | 33 bytes (comprimida) |
| **Determinístico** | ✅ Sí (RFC 6979) | ⚠️ Requiere nonce aleatorio |
| **Batch Verify** | ✅ Soportado | ❌ No soportado |
| **Taproot** | ✅ Requerido | ❌ No compatible |
| **Complejidad** | ⚠️ Media | ✅ Simple |
| **Adoption** | ✅ Bitcoin estándar | ⚠️ Legacy |

### Costos en ICP

Las operaciones Schnorr tienen costo en cycles:

```rust
// Aproximado (puede variar):
schnorr_public_key:   ~10M cycles  (~$0.01 USD)
sign_with_schnorr:    ~26M cycles  (~$0.026 USD)
```

**Optimización**: Cache public keys en stable memory
```rust
thread_local! {
    static PUBKEY_CACHE: RefCell<Option<Vec<u8>>> = RefCell::new(None);
}

pub async fn get_cached_pubkey() -> Result<Vec<u8>, String> {
    PUBKEY_CACHE.with(|cache| {
        if let Some(pubkey) = cache.borrow().as_ref() {
            return Ok(pubkey.clone());  // ✅ Sin costo!
        }

        // Primera vez: llamar al management canister
        let pubkey = get_schnorr_public_key(path).await?;
        *cache.borrow_mut() = Some(pubkey.clone());
        Ok(pubkey)
    })
}
```

### Testing Schnorr Signatures

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_schnorr_pubkey() {
        let path = vec![b"test".to_vec()];
        let pubkey = get_schnorr_public_key(path).await.unwrap();

        // Verificar formato
        assert_eq!(pubkey.len(), 33);  // Comprimida
        assert!(pubkey[0] == 0x02 || pubkey[0] == 0x03);  // Prefix válido
    }

    #[tokio::test]
    async fn test_schnorr_signature() {
        let message = b"Hello, Bitcoin!";
        let path = vec![b"test".to_vec()];

        let signature = sign_message(message.to_vec(), path).await.unwrap();

        // Verificar formato
        assert_eq!(signature.len(), 64);
    }
}
```

### Referencias y Recursos

- **BIP-340**: Schnorr Signatures for secp256k1
  - https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki

- **BIP-341**: Taproot: SegWit version 1 spending rules
  - https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki

- **ICP Threshold Signatures**:
  - https://internetcomputer.org/docs/current/developer-docs/integrations/bitcoin/

- **Schnorr Math Deep Dive**:
  - https://cryptobook.nakov.com/digital-signatures/schnorr-signatures

---

## 🎯 Siguiente Paso

Ahora que entendemos Schnorr signatures y threshold cryptography, los próximos pasos son:

1. ✅ Implementar Storable traits (COMPLETADO)
2. ✅ Limpiar warnings (COMPLETADO)
3. ✅ Documentar Schnorr signatures (COMPLETADO)
4. ⏭️ Implementar construcción de transacciones Bitcoin (BIP-341)
5. ⏭️ Agregar tests de integración
6. ⏭️ Implementar session keys (UX mejorado inspirado en Odin.fun)

¡Continuemos construyendo! 🚀
