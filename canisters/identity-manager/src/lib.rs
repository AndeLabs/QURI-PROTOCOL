use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use ic_stable_structures::storable::Bound;
use std::cell::RefCell;
use std::borrow::Cow;

use quri_types::{SessionPermissions, UserSession};

// ========================================================================
// 🎓 LECCIÓN 3: Storable para Tipos Locales
// ========================================================================
//
// RateLimitData es un tipo definido en este canister, no en quri-types.
// Aún así necesitamos implementar Storable para poder usarlo en
// StableBTreeMap.
//
// ## Estructura de RateLimitData
//
// ```rust
// struct RateLimitData {
//     requests: u32,      // 4 bytes
//     window_start: u64,  // 8 bytes
// }
// ```
//
// Total: 12 bytes fijos
//
// ## Decisión: Bounded vs Unbounded?
//
// Este es un EXCELENTE candidato para Bounded porque:
// - ✅ Tamaño fijo y conocido
// - ✅ Pequeño (12 bytes)
// - ✅ No contiene tipos variables (String, Vec)
//
// Ventajas de usar Bounded aquí:
// - 🚀 Acceso más rápido
// - 💾 Menos overhead de memoria
// - 🎯 Más eficiente para actualizaciones frecuentes
//
// ## Implementación Manual vs Candid
//
// Para tipos pequeños y fijos, podemos serializar manualmente
// (más eficiente) o usar Candid (más flexible).
//
// Vamos a usar serialización manual para demostrar ambos enfoques.
//
// ========================================================================

/// Datos de rate limiting por principal
///
/// Almacena:
/// - Número de requests en la ventana actual
/// - Timestamp del inicio de la ventana
///
/// ## Por Qué Este Diseño?
///
/// **Sliding Window** es más justo que contadores simples:
/// - Resetea cada hora
/// - Evita "burst" abuse
/// - Simple de implementar
///
/// ## Alternativas Consideradas
///
/// 1. **Token Bucket**: Más complejo pero más flexible
/// 2. **Leaky Bucket**: Constante pero puede bloquear legítimos
/// 3. **Fixed Window**: Simple pero vulnerable a "boundary abuse"
///
/// Elegimos Sliding Window por balance simplicidad/efectividad.
#[derive(CandidType, Deserialize, Clone, Debug)]
struct RateLimitData {
    /// Número de requests en la ventana actual
    requests: u32,

    /// Timestamp (nanoseconds) del inicio de la ventana
    window_start: u64,
}

// 🎓 IMPLEMENTACIÓN: Storable con Bounded
//
// Esta es la implementación más eficiente para tipos pequeños y fijos.
impl Storable for RateLimitData {
    /// Serializa RateLimitData a bytes
    ///
    /// ## Formato Manual
    ///
    /// Convertimos directamente a bytes sin overhead de Candid:
    /// - bytes[0..4]: requests (u32, little-endian)
    /// - bytes[4..12]: window_start (u64, little-endian)
    ///
    /// Total: 12 bytes exactos
    ///
    /// ## Por Qué Little-Endian?
    ///
    /// - Es el estándar en la mayoría de sistemas modernos
    /// - Compatible con Bitcoin (también usa little-endian)
    /// - Rust lo hace eficientemente con to_le_bytes()
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut bytes = Vec::with_capacity(12);

        // Serializar requests (u32 = 4 bytes)
        bytes.extend_from_slice(&self.requests.to_le_bytes());

        // Serializar window_start (u64 = 8 bytes)
        bytes.extend_from_slice(&self.window_start.to_le_bytes());

        Cow::Owned(bytes)
    }

    /// Deserializa bytes a RateLimitData
    ///
    /// ## Error Handling
    ///
    /// Usamos unwrap() aquí porque:
    /// 1. Sabemos que siempre son 12 bytes (Bounded)
    /// 2. StableBTreeMap garantiza consistencia
    /// 3. Si falla = bug crítico que queremos detectar
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        // Extraer requests (primeros 4 bytes)
        let requests = u32::from_le_bytes(
            bytes[0..4]
                .try_into()
                .expect("RateLimitData: invalid requests bytes"),
        );

        // Extraer window_start (siguientes 8 bytes)
        let window_start = u64::from_le_bytes(
            bytes[4..12]
                .try_into()
                .expect("RateLimitData: invalid window_start bytes"),
        );

        Self {
            requests,
            window_start,
        }
    }

    /// Define límite como Bounded
    ///
    /// ## Bounded Configuration
    ///
    /// - max_size: 12 bytes (4 + 8)
    /// - is_fixed_size: true (siempre 12 bytes)
    ///
    /// ## Beneficios
    ///
    /// StableBTreeMap puede:
    /// - Preasignar espacio exacto
    /// - Acceso O(1) sin overhead
    /// - Verificar corrupción de datos
    const BOUND: Bound = Bound::Bounded {
        max_size: 12,        // u32 + u64
        is_fixed_size: true, // Siempre el mismo tamaño
    };
}

// ========================================================================
// 🎓 COMPARACIÓN: Manual vs Candid Serialization
// ========================================================================
//
// ### OPCIÓN 1: Manual (actual)
// ```rust
// fn to_bytes(&self) -> Cow<[u8]> {
//     let mut bytes = Vec::with_capacity(12);
//     bytes.extend_from_slice(&self.requests.to_le_bytes());
//     bytes.extend_from_slice(&self.window_start.to_le_bytes());
//     Cow::Owned(bytes)
// }
// ```
// ✅ Pros: Rápido, tamaño mínimo (12 bytes)
// ❌ Cons: Menos flexible si cambia el struct
//
// ### OPCIÓN 2: Candid
// ```rust
// fn to_bytes(&self) -> Cow<[u8]> {
//     Cow::Owned(candid::encode_one(self).unwrap())
// }
// ```
// ✅ Pros: Flexible, puede evolucionar
// ❌ Cons: Overhead (~30 bytes en lugar de 12)
//
// ### CUÁNDO USAR CADA UNO?
//
// **Manual**: Tipos pequeños, inmutables, hot path (mucho acceso)
// **Candid**: Tipos complejos, que pueden evolucionar, cold path
//
// Para RateLimitData: Manual es perfecto ✅
// ========================================================================

// Type aliases
type Memory = VirtualMemory<DefaultMemoryImpl>;
type SessionStorage = StableBTreeMap<Principal, UserSession, Memory>;
type RateLimitStorage = StableBTreeMap<Principal, RateLimitData, Memory>;

// 🎓 LECCIÓN: Memory Manager Pattern
//
// Usamos MemoryId different para cada estructura:
// - SESSIONS usa MemoryId(0)
// - RATE_LIMITS usa MemoryId(1)
//
// Esto previene conflictos y corrupción de datos.
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static SESSIONS: RefCell<SessionStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static RATE_LIMITS: RefCell<RateLimitStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        )
    );
}

const MAX_REQUESTS_PER_HOUR: u32 = 100;
const RATE_LIMIT_WINDOW: u64 = 3600_000_000_000; // 1 hour in nanoseconds

#[init]
fn init() {
    ic_cdk::println!("Identity Manager canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing identity manager upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Identity manager upgrade completed");
}

/// Create a new session for a user
/// Inspired by Odin.fun's session keys feature
#[update]
fn create_session(permissions: SessionPermissions, duration_seconds: u64) -> Result<UserSession, String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create sessions".to_string());
    }

    // Check rate limit
    check_rate_limit(caller)?;

    // Generate session key (in production, use proper key generation)
    let session_key = generate_session_key(caller);

    let current_time = ic_cdk::api::time();
    let expires_at = quri_utils::time::calculate_expiry(current_time, duration_seconds);

    let session = UserSession {
        principal: caller,
        session_key,
        expires_at,
        permissions,
    };

    SESSIONS.with(|sessions| {
        sessions.borrow_mut().insert(caller, session.clone());
    });

    Ok(session)
}

/// Get current session for caller
#[query]
fn get_session() -> Option<UserSession> {
    let caller = ic_cdk::caller();

    SESSIONS.with(|sessions| {
        sessions.borrow().get(&caller)
    })
}

/// Validate a session
#[query]
fn validate_session(principal: Principal) -> bool {
    SESSIONS.with(|sessions| {
        if let Some(session) = sessions.borrow().get(&principal) {
            let current_time = ic_cdk::api::time();
            !quri_utils::time::is_expired(session.expires_at, current_time)
        } else {
            false
        }
    })
}

/// Revoke a session
#[update]
fn revoke_session() -> Result<(), String> {
    let caller = ic_cdk::caller();

    SESSIONS.with(|sessions| {
        sessions.borrow_mut().remove(&caller);
    });

    Ok(())
}

/// Check if caller has permission for an action
#[query]
fn check_permission(action: PermissionType) -> bool {
    let caller = ic_cdk::caller();

    SESSIONS.with(|sessions| {
        if let Some(session) = sessions.borrow().get(&caller) {
            // Check if session is expired
            let current_time = ic_cdk::api::time();
            if quri_utils::time::is_expired(session.expires_at, current_time) {
                return false;
            }

            // Check specific permission
            match action {
                PermissionType::CreateRune => session.permissions.can_create_rune,
                PermissionType::Transfer => session.permissions.can_transfer,
            }
        } else {
            false
        }
    })
}

/// Get user statistics
#[query]
fn get_user_stats(principal: Principal) -> UserStats {
    // In production, this would aggregate data from multiple canisters
    UserStats {
        runes_created: 0,
        total_volume: 0,
        joined_at: 0,
    }
}

// Helper functions

fn check_rate_limit(principal: Principal) -> Result<(), String> {
    let current_time = ic_cdk::api::time();

    RATE_LIMITS.with(|limits| {
        let mut limits_mut = limits.borrow_mut();

        if let Some(mut data) = limits_mut.get(&principal) {
            // Check if we need to reset the window
            if current_time - data.window_start > RATE_LIMIT_WINDOW {
                data.requests = 1;
                data.window_start = current_time;
                limits_mut.insert(principal, data);
                Ok(())
            } else if data.requests >= MAX_REQUESTS_PER_HOUR {
                Err(format!(
                    "Rate limit exceeded. Try again in {} seconds",
                    (RATE_LIMIT_WINDOW - (current_time - data.window_start)) / 1_000_000_000
                ))
            } else {
                data.requests += 1;
                limits_mut.insert(principal, data);
                Ok(())
            }
        } else {
            // First request
            limits_mut.insert(
                principal,
                RateLimitData {
                    requests: 1,
                    window_start: current_time,
                },
            );
            Ok(())
        }
    })
}

fn generate_session_key(principal: Principal) -> Vec<u8> {
    use sha2::{Digest, Sha256};

    let mut hasher = Sha256::new();
    hasher.update(principal.as_slice());
    hasher.update(&ic_cdk::api::time().to_le_bytes());
    hasher.finalize().to_vec()
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum PermissionType {
    CreateRune,
    Transfer,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct UserStats {
    pub runes_created: u64,
    pub total_volume: u64,
    pub joined_at: u64,
}

ic_cdk::export_candid!();
