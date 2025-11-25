# Admin Guards Implementation - Registry Canister

## Resumen

Se implementó un sistema robusto de control de acceso basado en roles (RBAC) simplificado para proteger funciones sensibles del registry canister.

## Arquitectura

### 1. Módulo Admin (`src/admin.rs`)

Sistema de administración con dos roles:

- **Owner**: Principal que despliega el canister (inmutable)
  - Puede agregar/remover admins
  - Tiene todos los permisos de admin
  - Se establece automáticamente en `init()`

- **Admin**: Principals con privilegios administrativos
  - Pueden modificar whitelist de rate limiting
  - Pueden resetear rate limits
  - Pueden actualizar configuración de staking pools
  - Pueden listar otros admins

### 2. Stable Storage

**MEMORIA 4**: Admin storage usando `StableBTreeMap<Principal, AdminEntry, Memory>`

```rust
pub struct AdminEntry {
    pub principal: Principal,
    pub granted_at: u64,      // Timestamp de auditoría
    pub granted_by: Principal, // Quién otorgó el rol
}
```

### 3. Funciones Protegidas

Las siguientes funciones ahora requieren permisos de admin:

1. `add_to_whitelist(principal)` - Agregar a whitelist de rate limiting
2. `remove_from_whitelist(principal)` - Remover de whitelist
3. `reset_rate_limit(principal)` - Resetear rate limit de un principal
4. `update_staking_pool_apy(rune_id, apy)` - Actualizar APY de pools

### 4. Endpoints de Gestión de Admins

```rust
// Owner only
add_admin(new_admin: Principal) -> Result<(), String>
remove_admin(admin: Principal) -> Result<(), String>

// Admin only
list_admins() -> Result<Vec<AdminEntry>, String>

// Public (query)
is_admin(principal: Principal) -> bool
get_owner() -> Option<Principal>
```

## Macros de Conveniencia

### `require_admin!`

Verifica que el caller sea admin o owner:

```rust
#[update]
fn protected_function() -> Result<(), String> {
    require_admin!()?;
    // ... lógica protegida ...
    Ok(())
}
```

### `require_owner!`

Verifica que el caller sea el owner:

```rust
#[update]
fn owner_only_function() -> Result<(), String> {
    require_owner!()?;
    // ... lógica del owner ...
    Ok(())
}
```

## Seguridad

### Amenazas Mitigadas

- ✅ Acceso no autorizado a whitelist de rate limiting
- ✅ Modificación no autorizada de parámetros críticos
- ✅ Escalación de privilegios no autorizada
- ✅ Compromiso de una sola clave (múltiples admins posibles)

### Reglas de Seguridad

1. **Inmutabilidad del Owner**: El owner no puede ser cambiado ni removido
2. **Principio de Mínimo Privilegio**: Solo owner puede gestionar admins
3. **No Auto-Removal**: Los admins no pueden removerse a sí mismos
4. **Anonymous Blocked**: Principals anónimos no pueden ser admins
5. **Auditabilidad**: Todos los cambios se registran con timestamps y caller

### Validaciones

```rust
// En add_to_whitelist, remove_from_whitelist, reset_rate_limit
if caller == Principal::anonymous() {
    return Err("Anonymous principals not allowed");
}
if !admin::is_admin(caller) {
    return Err("Admin privileges required");
}
```

## Lifecycle Hooks

### Inicialización (`init`)

```rust
#[init]
fn init() {
    let caller = ic_cdk::caller();
    let memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4)));
    admin::init_admin(memory, caller);
}
```

El deployer automáticamente se convierte en owner.

### Upgrade (`post_upgrade`)

```rust
#[post_upgrade]
fn post_upgrade() {
    let memory = MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4)));
    admin::reinit_admin_storage(memory);
}
```

El storage se re-conecta después de upgrades (datos persisten en stable memory).

## Tests

Suite completa de tests unitarios en `admin.rs`:

- ✅ `test_owner_is_admin` - Owner es admin por defecto
- ✅ `test_add_admin_success` - Agregar admin exitosamente
- ✅ `test_add_admin_non_owner_fails` - Solo owner puede agregar admins
- ✅ `test_add_admin_anonymous_fails` - Anonymous no puede ser admin
- ✅ `test_remove_admin_success` - Remover admin exitosamente
- ✅ `test_remove_owner_fails` - No se puede remover al owner
- ✅ `test_remove_admin_non_owner_fails` - Solo owner puede remover admins
- ✅ `test_list_admins` - Listar admins requiere permisos
- ✅ `test_duplicate_admin_fails` - No duplicados

**Resultado**: 9/9 tests pasando ✅

## Uso

### Después del Despliegue

1. El deployer es automáticamente el owner
2. El owner puede agregar admins:

```bash
dfx canister call registry add_admin '(principal "xxxxx-xxxxx-xxxxx")'
```

3. Los admins pueden gestionar whitelist y rate limits:

```bash
dfx canister call registry add_to_whitelist '(principal "yyyyy-yyyyy-yyyyy")'
dfx canister call registry reset_rate_limit '(principal "zzzzz-zzzzz-zzzzz")'
```

### Verificar Permisos

```bash
# Check si un principal es admin
dfx canister call registry is_admin '(principal "xxxxx-xxxxx-xxxxx")'

# Ver el owner
dfx canister call registry get_owner

# Listar todos los admins (requiere ser admin)
dfx canister call registry list_admins
```

## Migración desde Versión Anterior

**Antes** (sin guards apropiados):

```rust
fn add_to_whitelist(principal: Principal) -> Result<(), String> {
    if caller == Principal::anonymous() {
        return Err("Anonymous not allowed");
    }
    // ⚠️ CUALQUIER principal autenticado podía modificar whitelist
    rate_limit::add_to_whitelist(principal);
    Ok(())
}
```

**Después** (con guards de admin):

```rust
fn add_to_whitelist(principal: Principal) -> Result<(), String> {
    require_admin!()?; // ✅ Solo admins pueden modificar
    rate_limit::add_to_whitelist(principal);
    Ok(())
}
```

## Conclusión

El sistema de admin guards proporciona:

1. **Seguridad**: Control de acceso apropiado para funciones críticas
2. **Auditabilidad**: Logs de quién hizo qué y cuándo
3. **Flexibilidad**: Múltiples admins sin comprometer seguridad
4. **Simplicidad**: Macros fáciles de usar (`require_admin!`, `require_owner!`)
5. **Persistencia**: Datos en stable storage sobreviven upgrades
6. **Testing**: Suite completa de tests verificando todas las reglas

El patrón está basado en `rune-engine/rbac.rs` pero simplificado para las necesidades específicas del registry canister.
