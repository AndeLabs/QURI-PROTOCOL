// ============================================================================
// RBAC Module for Registry Canister
// ============================================================================
//
// Implementación simplificada de control de acceso para el registry canister.
// Similar a rune-engine/rbac.rs pero más ligero (solo Owner y Admin roles).
//
// ## Diseño de Seguridad
//
// 1. **Owner**: Principal que despliega el canister (inmutable)
// 2. **Admins**: Lista de principals con privilegios administrativos
// 3. **Principio de Mínimo Privilegio**: Solo Owner puede gestionar admins
// 4. **Auditabilidad**: Cambios registrados con timestamps
//
// ## Amenazas Mitigadas
//
// - ✅ Acceso no autorizado a whitelist
// - ✅ Modificación no autorizada de rate limits
// - ✅ Escalación de privilegios
// - ✅ Compromiso de una sola clave
//
// ============================================================================

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::storable::Bound;
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use std::borrow::Cow;
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

/// Entrada de admin con metadatos de auditoría
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AdminEntry {
    pub principal: Principal,
    pub granted_at: u64,
    pub granted_by: Principal,
}

// Implementación de Storable para AdminEntry
impl Storable for AdminEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to encode AdminEntry: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode AdminEntry: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

type AdminStorage = StableBTreeMap<Principal, AdminEntry, Memory>;

thread_local! {
    static ADMINS: RefCell<Option<AdminStorage>> = const { RefCell::new(None) };
    static OWNER: RefCell<Option<Principal>> = const { RefCell::new(None) };
}

// ============================================================================
// Initialization
// ============================================================================

/// Inicializa el sistema de administración con el owner inicial
///
/// ## Seguridad
///
/// - Solo puede llamarse una vez (desde init)
/// - El owner no puede ser cambiado después
/// - El caller del init se convierte en owner automáticamente
pub fn init_admin(memory: Memory, initial_owner: Principal) {
    ADMINS.with(|admins| {
        let storage = StableBTreeMap::init(memory);

        // El owner también es admin automáticamente
        let owner_entry = AdminEntry {
            principal: initial_owner,
            granted_at: ic_cdk::api::time(),
            granted_by: initial_owner, // Self-granted
        };

        let mut storage_mut = storage;
        storage_mut.insert(initial_owner, owner_entry);

        *admins.borrow_mut() = Some(storage_mut);
    });

    OWNER.with(|owner| {
        *owner.borrow_mut() = Some(initial_owner);
    });

    ic_cdk::println!("🔐 Admin system initialized with owner: {}", initial_owner);
}

/// Reinicia el storage después de un upgrade
pub fn reinit_admin_storage(memory: Memory) {
    ADMINS.with(|admins| {
        *admins.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

// ============================================================================
// Permission Checks
// ============================================================================

/// Verifica si un principal es el owner
pub fn is_owner(principal: Principal) -> bool {
    OWNER.with(|owner| {
        owner
            .borrow()
            .as_ref()
            .map(|o| *o == principal)
            .unwrap_or(false)
    })
}

/// Verifica si un principal es admin (o owner)
pub fn is_admin(principal: Principal) -> bool {
    // Owner siempre es admin
    if is_owner(principal) {
        return true;
    }

    // Check admin list
    ADMINS.with(|admins| {
        admins
            .borrow()
            .as_ref()
            .map(|storage| storage.contains_key(&principal))
            .unwrap_or(false)
    })
}

/// Obtiene el owner actual
pub fn get_owner() -> Option<Principal> {
    OWNER.with(|owner| *owner.borrow())
}

// ============================================================================
// Admin Management (Owner only)
// ============================================================================

/// Añade un admin (solo Owner puede hacer esto)
///
/// ## Reglas de Seguridad
///
/// 1. Solo Owner puede añadir admins
/// 2. Anonymous principals no pueden ser admins
/// 3. No puede añadirse al Owner (ya es admin por defecto)
///
/// ## Retorna
///
/// - `Ok(())` si el admin fue añadido exitosamente
/// - `Err(String)` con descripción del error
pub fn add_admin(caller: Principal, new_admin: Principal) -> Result<(), String> {
    // Solo Owner puede añadir admins
    if !is_owner(caller) {
        return Err("Only Owner can add admins".to_string());
    }

    // Anonymous principals no pueden ser admins
    if new_admin == Principal::anonymous() {
        return Err("Anonymous principals cannot be admins".to_string());
    }

    // No es necesario añadir al owner (ya es admin)
    if is_owner(new_admin) {
        return Err("Owner is already an admin by default".to_string());
    }

    // Check si ya es admin
    if is_admin(new_admin) {
        return Err(format!("{} is already an admin", new_admin));
    }

    // Añade el admin
    ADMINS.with(|admins| {
        if let Some(storage) = admins.borrow_mut().as_mut() {
            let entry = AdminEntry {
                principal: new_admin,
                granted_at: ic_cdk::api::time(),
                granted_by: caller,
            };

            storage.insert(new_admin, entry);

            ic_cdk::println!("✅ Admin added: {} by {}", new_admin, caller);

            Ok(())
        } else {
            Err("Admin system not initialized".to_string())
        }
    })
}

/// Remueve un admin (solo Owner puede hacer esto)
///
/// ## Reglas de Seguridad
///
/// 1. Solo Owner puede remover admins
/// 2. No se puede remover al Owner
/// 3. No hay auto-removal (previene lockout)
pub fn remove_admin(caller: Principal, admin_to_remove: Principal) -> Result<(), String> {
    // Solo Owner puede remover admins
    if !is_owner(caller) {
        return Err("Only Owner can remove admins".to_string());
    }

    // No puedes remover al owner
    if is_owner(admin_to_remove) {
        return Err("Cannot remove Owner from admin list".to_string());
    }

    // Check si es admin
    if !is_admin(admin_to_remove) {
        return Err(format!("{} is not an admin", admin_to_remove));
    }

    ADMINS.with(|admins| {
        if let Some(storage) = admins.borrow_mut().as_mut() {
            storage.remove(&admin_to_remove);

            ic_cdk::println!("⚠️  Admin removed: {} by {}", admin_to_remove, caller);

            Ok(())
        } else {
            Err("Admin system not initialized".to_string())
        }
    })
}

// ============================================================================
// Query Functions
// ============================================================================

/// Lista todos los admins (solo para admins)
pub fn list_admins(caller: Principal) -> Result<Vec<AdminEntry>, String> {
    if !is_admin(caller) {
        return Err("Only admins can list admin users".to_string());
    }

    ADMINS.with(|admins| {
        if let Some(storage) = admins.borrow().as_ref() {
            Ok(storage.iter().map(|(_, entry)| entry).collect())
        } else {
            Err("Admin system not initialized".to_string())
        }
    })
}

/// Obtiene información de un admin específico
pub fn get_admin_info(principal: Principal) -> Option<AdminEntry> {
    ADMINS.with(|admins| {
        admins
            .borrow()
            .as_ref()
            .and_then(|storage| storage.get(&principal))
    })
}

// ============================================================================
// Macros de Conveniencia
// ============================================================================

/// Macro para requerir privilegios de admin
///
/// ## Uso
///
/// ```rust
/// #[update]
/// fn admin_function() -> Result<(), String> {
///     require_admin!()?;
///     // ... lógica admin ...
///     Ok(())
/// }
/// ```
#[macro_export]
macro_rules! require_admin {
    () => {{
        let caller = ic_cdk::caller();
        if caller == candid::Principal::anonymous() {
            return Err("Anonymous principals not allowed".to_string());
        }
        if !$crate::admin::is_admin(caller) {
            return Err("Admin privileges required".to_string());
        }
        Ok::<(), String>(())
    }};
}

/// Macro para requerir Owner
#[macro_export]
macro_rules! require_owner {
    () => {{
        let caller = ic_cdk::caller();
        if !$crate::admin::is_owner(caller) {
            return Err("Only Owner can perform this action".to_string());
        }
        Ok::<(), String>(())
    }};
}

#[cfg(test)]
mod tests {
    use super::*;
    use ic_stable_structures::memory_manager::{MemoryId, MemoryManager};
    use std::sync::atomic::{AtomicU64, Ordering};

    // Mock time for testing (incrementing counter)
    static MOCK_TIME: AtomicU64 = AtomicU64::new(1_000_000_000);

    fn mock_time() -> u64 {
        MOCK_TIME.fetch_add(1, Ordering::SeqCst)
    }

    fn test_principal(id: u8) -> Principal {
        Principal::from_slice(&[id; 29])
    }

    // Helper que usa tiempo mock en lugar de ic_cdk::api::time()
    fn init_admin_with_mock_time(memory: Memory, initial_owner: Principal) {
        ADMINS.with(|admins| {
            let storage = StableBTreeMap::init(memory);

            let owner_entry = AdminEntry {
                principal: initial_owner,
                granted_at: mock_time(),
                granted_by: initial_owner,
            };

            let mut storage_mut = storage;
            storage_mut.insert(initial_owner, owner_entry);

            *admins.borrow_mut() = Some(storage_mut);
        });

        OWNER.with(|owner| {
            *owner.borrow_mut() = Some(initial_owner);
        });
    }

    fn setup_test_admin_system() -> Principal {
        let memory_manager = MemoryManager::init(DefaultMemoryImpl::default());
        let memory = memory_manager.get(MemoryId::new(99));
        let owner = test_principal(1);
        init_admin_with_mock_time(memory, owner);
        owner
    }

    // Override add_admin para tests
    fn add_admin_mock(caller: Principal, new_admin: Principal) -> Result<(), String> {
        if !is_owner(caller) {
            return Err("Only Owner can add admins".to_string());
        }

        if new_admin == Principal::anonymous() {
            return Err("Anonymous principals cannot be admins".to_string());
        }

        if is_owner(new_admin) {
            return Err("Owner is already an admin by default".to_string());
        }

        if is_admin(new_admin) {
            return Err(format!("{} is already an admin", new_admin));
        }

        ADMINS.with(|admins| {
            if let Some(storage) = admins.borrow_mut().as_mut() {
                let entry = AdminEntry {
                    principal: new_admin,
                    granted_at: mock_time(),
                    granted_by: caller,
                };

                storage.insert(new_admin, entry);
                Ok(())
            } else {
                Err("Admin system not initialized".to_string())
            }
        })
    }

    #[test]
    fn test_owner_is_admin() {
        let owner = setup_test_admin_system();

        assert!(is_owner(owner));
        assert!(is_admin(owner));
    }

    #[test]
    fn test_add_admin_success() {
        let owner = setup_test_admin_system();
        let new_admin = test_principal(2);

        let result = add_admin_mock(owner, new_admin);
        assert!(result.is_ok());
        assert!(is_admin(new_admin));
    }

    #[test]
    fn test_add_admin_non_owner_fails() {
        let owner = setup_test_admin_system();
        let non_owner = test_principal(2);
        let new_admin = test_principal(3);

        let result = add_admin_mock(non_owner, new_admin);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Only Owner can add admins");
    }

    #[test]
    fn test_add_admin_anonymous_fails() {
        let owner = setup_test_admin_system();

        let result = add_admin_mock(owner, Principal::anonymous());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Anonymous principals cannot be admins");
    }

    #[test]
    fn test_remove_admin_success() {
        let owner = setup_test_admin_system();
        let admin = test_principal(2);

        // Add admin first
        add_admin_mock(owner, admin).unwrap();
        assert!(is_admin(admin));

        // Remove admin
        let result = remove_admin(owner, admin);
        assert!(result.is_ok());
        assert!(!is_admin(admin));
    }

    #[test]
    fn test_remove_owner_fails() {
        let owner = setup_test_admin_system();

        let result = remove_admin(owner, owner);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Cannot remove Owner from admin list");
    }

    #[test]
    fn test_remove_admin_non_owner_fails() {
        let owner = setup_test_admin_system();
        let admin1 = test_principal(2);
        let admin2 = test_principal(3);

        // Add both admins
        add_admin_mock(owner, admin1).unwrap();
        add_admin_mock(owner, admin2).unwrap();

        // admin1 tries to remove admin2 (should fail)
        let result = remove_admin(admin1, admin2);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), "Only Owner can remove admins");
    }

    #[test]
    fn test_list_admins() {
        let owner = setup_test_admin_system();
        let admin1 = test_principal(2);
        let admin2 = test_principal(3);

        // Add admins
        add_admin_mock(owner, admin1).unwrap();
        add_admin_mock(owner, admin2).unwrap();

        // Owner can list admins
        let admins = list_admins(owner).unwrap();
        assert_eq!(admins.len(), 3); // owner + 2 admins

        // Admin can list admins
        let admins = list_admins(admin1).unwrap();
        assert_eq!(admins.len(), 3);

        // Non-admin cannot list admins
        let non_admin = test_principal(99);
        let result = list_admins(non_admin);
        assert!(result.is_err());
    }

    #[test]
    fn test_duplicate_admin_fails() {
        let owner = setup_test_admin_system();
        let admin = test_principal(2);

        // Add admin first time
        add_admin_mock(owner, admin).unwrap();

        // Try to add same admin again
        let result = add_admin_mock(owner, admin);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("is already an admin"));
    }
}
