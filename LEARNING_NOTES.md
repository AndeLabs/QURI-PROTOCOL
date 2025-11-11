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

## 🎯 Siguiente Paso

Ahora que entendemos Stable Memory y Storable, el próximo paso es:
1. Implementar el RateLimitData storable
2. Optimizar memory management
3. Agregar logging y observability

¡Continuemos aprendiendo! 🚀
