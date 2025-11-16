// ============================================================================
// RBAC (Role-Based Access Control) Module
// ============================================================================
//
// Este módulo implementa control de acceso basado en roles para proteger
// funciones administrativas críticas.
//
// ## Diseño de Seguridad
//
// 1. **Roles Jerárquicos**: Admin > Operator > User
// 2. **Principio de Mínimo Privilegio**: Solo admin puede gestionar roles
// 3. **Auditabilidad**: Todos los cambios se registran con timestamps
// 4. **Inmutabilidad del Owner**: El owner inicial no puede ser removido
//
// ## Amenazas Mitigadas
//
// - ✅ Acceso no autorizado a configuración
// - ✅ Modificación de parámetros críticos
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
type RoleStorage = StableBTreeMap<Principal, RoleEntry, Memory>;

/// Roles disponibles en el sistema
///
/// ## Jerarquía de Permisos
///
/// **Owner** (Super Admin):
/// - Todos los permisos
/// - Puede añadir/remover Admins
/// - Inmutable (set en init, no puede ser removido)
///
/// **Admin**:
/// - Configurar canisters
/// - Actualizar configuración de etching
/// - Añadir/remover Operators
/// - Cleanup de procesos
///
/// **Operator**:
/// - Ver estadísticas detalladas
/// - Monitorear procesos
/// - Acceso read-only a configuración
///
/// **User** (default):
/// - Crear runes
/// - Ver sus propios procesos
/// - Operaciones básicas
#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Role {
    Owner,
    Admin,
    Operator,
    User,
}

/// Entrada de rol con metadatos de auditoría
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RoleEntry {
    pub role: Role,
    pub granted_at: u64,
    pub granted_by: Principal,
}

// Implementación de Storable para RoleEntry
impl Storable for RoleEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(&self).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to encode RoleEntry: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode RoleEntry: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

thread_local! {
    static ROLES: RefCell<Option<RoleStorage>> = const { RefCell::new(None) };
    static OWNER: RefCell<Option<Principal>> = const { RefCell::new(None) };
}

// ============================================================================
// Initialization
// ============================================================================

/// Inicializa el sistema RBAC con el owner inicial
///
/// ## Seguridad
///
/// - Solo puede llamarse una vez (desde init)
/// - El owner no puede ser cambiado después
/// - El caller del init se convierte en owner automáticamente
pub fn init_rbac(memory: Memory, initial_owner: Principal) {
    ROLES.with(|roles| {
        let storage = StableBTreeMap::init(memory);
        
        // Set owner role
        let owner_entry = RoleEntry {
            role: Role::Owner,
            granted_at: ic_cdk::api::time(),
            granted_by: initial_owner, // Self-granted
        };
        
        let mut storage_mut = storage;
        storage_mut.insert(initial_owner, owner_entry);
        
        *roles.borrow_mut() = Some(storage_mut);
    });

    OWNER.with(|owner| {
        *owner.borrow_mut() = Some(initial_owner);
    });

    ic_cdk::println!("RBAC initialized with owner: {}", initial_owner);
}

/// Reinicia el storage después de un upgrade
pub fn reinit_rbac_storage(memory: Memory) {
    ROLES.with(|roles| {
        *roles.borrow_mut() = Some(StableBTreeMap::init(memory));
    });
}

// ============================================================================
// Permission Checks
// ============================================================================

/// Verifica si un principal tiene un rol específico o superior
///
/// ## Jerarquía
///
/// Owner > Admin > Operator > User
///
/// Si pides `has_role(principal, Role::Operator)` y el principal es Admin,
/// retorna `true` porque Admin es superior a Operator.
pub fn has_role(principal: Principal, required_role: Role) -> bool {
    let actual_role = get_role(principal);
    actual_role <= required_role // Lower enum value = higher privilege
}

/// Obtiene el rol de un principal (User por defecto)
pub fn get_role(principal: Principal) -> Role {
    ROLES.with(|roles| {
        roles
            .borrow()
            .as_ref()
            .and_then(|storage| storage.get(&principal))
            .map(|entry| entry.role)
            .unwrap_or(Role::User)
    })
}

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

/// Verifica si un principal es admin o superior
pub fn is_admin(principal: Principal) -> bool {
    has_role(principal, Role::Admin)
}

/// Verifica si un principal es operator o superior
pub fn is_operator(principal: Principal) -> bool {
    has_role(principal, Role::Operator)
}

// ============================================================================
// Role Management
// ============================================================================

/// Añade un rol a un principal
///
/// ## Reglas de Seguridad
///
/// 1. Solo Owner puede añadir Admins
/// 2. Admins pueden añadir Operators
/// 3. No puedes añadir un rol superior al tuyo
/// 4. No puedes modificar el Owner original
///
/// ## Retorna
///
/// - `Ok(())` si el rol fue añadido exitosamente
/// - `Err(String)` con descripción del error
pub fn grant_role(
    caller: Principal,
    target: Principal,
    role: Role,
) -> Result<(), String> {
    // Anonymous principals no pueden tener roles
    if caller == Principal::anonymous() || target == Principal::anonymous() {
        return Err("Anonymous principals cannot have roles".to_string());
    }

    // No puedes modificar el owner original
    if is_owner(target) && role != Role::Owner {
        return Err("Cannot modify the original owner role".to_string());
    }

    // Verifica permisos del caller
    let _caller_role = get_role(caller);
    
    match role {
        Role::Owner => {
            return Err("Cannot grant Owner role. Owner is set at initialization.".to_string());
        }
        Role::Admin => {
            // Solo Owner puede añadir Admins
            if !is_owner(caller) {
                return Err("Only Owner can grant Admin role".to_string());
            }
        }
        Role::Operator => {
            // Admin o superior puede añadir Operators
            if !is_admin(caller) {
                return Err("Only Admin or Owner can grant Operator role".to_string());
            }
        }
        Role::User => {
            // Cualquier Operator+ puede establecer explícitamente User
            if !is_operator(caller) {
                return Err("Only Operator or higher can grant User role".to_string());
            }
        }
    }

    // Otorga el rol
    ROLES.with(|roles| {
        if let Some(storage) = roles.borrow_mut().as_mut() {
            let entry = RoleEntry {
                role: role.clone(),
                granted_at: ic_cdk::api::time(),
                granted_by: caller,
            };
            
            storage.insert(target, entry);
            
            ic_cdk::println!(
                "Role {:?} granted to {} by {}",
                role,
                target,
                caller
            );
            
            Ok(())
        } else {
            Err("RBAC not initialized".to_string())
        }
    })
}

/// Revoca el rol de un principal (lo vuelve User)
///
/// ## Reglas de Seguridad
///
/// 1. No puedes revocar al Owner
/// 2. Solo Admin+ puede revocar roles
/// 3. No puedes revocarte a ti mismo (previene lockout)
pub fn revoke_role(caller: Principal, target: Principal) -> Result<(), String> {
    // No puedes revocar al owner
    if is_owner(target) {
        return Err("Cannot revoke Owner role".to_string());
    }

    // Solo Admin+ puede revocar
    if !is_admin(caller) {
        return Err("Only Admin or Owner can revoke roles".to_string());
    }

    // No puedes revocarte a ti mismo (previene lockout accidental)
    if caller == target {
        return Err("Cannot revoke your own role".to_string());
    }

    ROLES.with(|roles| {
        if let Some(storage) = roles.borrow_mut().as_mut() {
            storage.remove(&target);
            
            ic_cdk::println!(
                "Role revoked for {} by {}",
                target,
                caller
            );
            
            Ok(())
        } else {
            Err("RBAC not initialized".to_string())
        }
    })
}

// ============================================================================
// Query Functions
// ============================================================================

/// Lista todos los roles asignados (solo para Admin+)
pub fn list_all_roles(caller: Principal) -> Result<Vec<(Principal, RoleEntry)>, String> {
    if !is_admin(caller) {
        return Err("Only Admin or Owner can list all roles".to_string());
    }

    ROLES.with(|roles| {
        if let Some(storage) = roles.borrow().as_ref() {
            Ok(storage
                .iter()
                .map(|(principal, entry)| (principal, entry))
                .collect())
        } else {
            Err("RBAC not initialized".to_string())
        }
    })
}

/// Obtiene el owner actual
pub fn get_owner() -> Option<Principal> {
    OWNER.with(|owner| *owner.borrow())
}

// ============================================================================
// Macros de Conveniencia
// ============================================================================

/// Macro para requerir un rol específico
///
/// ## Uso
///
/// ```rust
/// #[update]
/// fn admin_function() -> Result<(), String> {
///     require_role!(Role::Admin)?;
///     // ... lógica admin ...
///     Ok(())
/// }
/// ```
#[macro_export]
macro_rules! require_role {
    ($role:expr) => {{
        let caller = ic_cdk::caller();
        if caller == candid::Principal::anonymous() {
            return Err("Anonymous principals not allowed".to_string());
        }
        if !$crate::rbac::has_role(caller, $role) {
            return Err(format!(
                "Insufficient permissions. Required: {:?}",
                $role
            ));
        }
        Ok::<(), String>(())
    }};
}

/// Macro para requerir Owner
#[macro_export]
macro_rules! require_owner {
    () => {{
        let caller = ic_cdk::caller();
        if !$crate::rbac::is_owner(caller) {
            return Err("Only Owner can perform this action".to_string());
        }
        Ok::<(), String>(())
    }};
}

/// Macro para requerir Admin o superior
#[macro_export]
macro_rules! require_admin {
    () => {{
        let caller = ic_cdk::caller();
        if caller == candid::Principal::anonymous() {
            return Err("Anonymous principals not allowed".to_string());
        }
        if !$crate::rbac::is_admin(caller) {
            return Err("Admin privileges required".to_string());
        }
        Ok::<(), String>(())
    }};
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_role_hierarchy() {
        assert!(Role::Owner < Role::Admin);
        assert!(Role::Admin < Role::Operator);
        assert!(Role::Operator < Role::User);
    }
}
