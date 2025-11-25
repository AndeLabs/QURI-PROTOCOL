# Sistema de Escrow y Rollback con Refunds

## Resumen

Este documento describe el sistema de escrow y rollback implementado en el `rune-engine` canister para manejar refunds automáticos de ckBTC cuando un proceso de etching falla.

## Arquitectura

### 1. Módulo Escrow (`src/escrow.rs`)

El módulo escrow gestiona el tracking de fees cobrados durante el proceso de etching.

#### Estructuras Principales

- **`EscrowEntry`**: Representa una entrada de escrow que rastrea un fee cobrado
  - `process_id`: ID del proceso de etching
  - `payer`: Principal del usuario que pagó el fee
  - `amount`: Cantidad en satoshis
  - `status`: Estado actual del escrow
  - `rune_name`: Nombre del rune para referencia

- **`EscrowStatus`**: Estados posibles de un escrow
  - `Held`: Fee está retenido en escrow
  - `Consumed`: Fee fue consumido (etching exitoso)
  - `Refunded`: Fee fue devuelto al usuario
  - `RefundFailed`: Intento de refund falló (requiere intervención manual)

#### Almacenamiento

- Usa `StableBTreeMap` para persistencia (MemoryId 12)
- Soporta upgrades de canister sin pérdida de datos
- Indexado por `ProcessId` para acceso eficiente

### 2. Integración con Etching Flow

#### Paso 1: Cobro de Fee (`step_check_balance`)

Cuando se valida el balance del usuario:

1. Se verifica que el usuario tiene suficiente ckBTC
2. Se cobra el fee estimado (20,000 sats)
3. Se crea una entrada `EscrowEntry` con estado `Held`
4. Se almacena en stable storage

```rust
let escrow_entry = EscrowEntry::new(
    process_id.clone(),
    caller,
    estimated_fee,
    process.rune_name.clone(),
);
escrow::store_escrow(&escrow_entry)?;
```

#### Paso 2: Consumo o Rollback

**En caso de éxito:**
- El fee permanece en el canister (estado `Consumed`)
- Se puede marcar manualmente con `mark_consumed()`

**En caso de fallo:**
- Se activa automáticamente el rollback
- Se intenta refund del fee al usuario
- Se actualiza el estado del escrow

### 3. Proceso de Rollback (`rollback`)

El rollback se ejecuta automáticamente cuando un etching falla:

1. **Verificación**: Comprueba si existe escrow y si está en estado `Held`
2. **Refund**: Intenta transferir ckBTC de vuelta al usuario
   ```rust
   let (transfer_result,): (Result<u64, String>,) = ic_cdk::call(
       btc_canister_id,
       "transfer_ckbtc",
       (escrow.payer, escrow.amount, memo),
   ).await?;
   ```
3. **Actualización de Estado**:
   - **Éxito**: Marca escrow como `Refunded` con block index
   - **Fallo**: Marca como `RefundFailed` para intervención manual
4. **Logging**: Registra todos los eventos para auditoría

### 4. Manejo de Errores

El sistema maneja gracefully varios casos de error:

- **Refund exitoso**: Se registra el block index de la transacción
- **Refund fallido**:
  - Se marca el escrow como `RefundFailed`
  - Se registra el error en los logs
  - Se puede intentar refund manual vía `admin_manual_refund`

### 5. APIs Públicas

#### Queries (usuarios)

- **`get_escrow_status(process_id)`**: Ver estado de escrow para un proceso
- **`get_my_escrows()`**: Ver todos los escrows del caller

#### Queries (admin)

- **`get_escrow_stats()`**: Estadísticas de todos los escrows
  - Total held, consumed, refunded, failed
  - Cantidades totales por estado

#### Updates (admin)

- **`cleanup_old_escrows(age_days)`**: Limpiar escrows antiguos
- **`admin_manual_refund(process_id)`**: Refund manual cuando falla automático

### 6. Integración con Bitcoin-Integration Canister

Se agregó el endpoint `transfer_ckbtc` en el canister de bitcoin-integration:

```rust
#[update]
async fn transfer_ckbtc(
    to: Principal,
    amount: u64,
    memo: Option<Vec<u8>>,
) -> Result<u64, String>
```

Este endpoint:
- Transfiere ckBTC usando ICRC-1 standard
- Retorna el block index de la transacción
- Incluye memo opcional para tracking

## Flujo Completo de Ejemplo

### Escenario 1: Etching Exitoso

1. Usuario inicia etching con 100,000 sats de ckBTC
2. Se cobra fee de 20,000 sats → Escrow `Held`
3. Proceso completa exitosamente
4. Escrow queda en estado `Consumed` (fee retenido)

### Escenario 2: Etching Fallido con Refund Exitoso

1. Usuario inicia etching con 100,000 sats de ckBTC
2. Se cobra fee de 20,000 sats → Escrow `Held`
3. Falla en paso de broadcast → Rollback automático
4. Refund exitoso → Escrow `Refunded` (block: 12345)
5. Usuario recibe de vuelta sus 20,000 sats

### Escenario 3: Etching Fallido con Refund Fallido

1. Usuario inicia etching con 100,000 sats de ckBTC
2. Se cobra fee de 20,000 sats → Escrow `Held`
3. Falla en paso de signing → Rollback automático
4. Refund falla (red caída) → Escrow `RefundFailed`
5. Admin usa `admin_manual_refund` para completar refund
6. Usuario recibe de vuelta sus 20,000 sats

## Seguridad y Auditoría

### Tracking Completo

- Todas las operaciones de escrow se registran en stable storage
- Los logs incluyen:
  - Timestamp de creación y actualización
  - Payer y cantidad
  - Estado actual y transiciones
  - Block indices de refunds exitosos
  - Razones de fallo

### Prevención de Double-Refund

- Estado `Held` solo permite un refund
- Una vez `Refunded`, no se puede refundar de nuevo
- Validación con `can_refund()` antes de cada intento

### Recuperación de Fallos

- Escrows en `RefundFailed` requieren intervención manual
- Admin puede revisar logs y ejecutar refund manual
- Sistema mantiene trazabilidad completa

## Testing

Los tests incluidos verifican:

- ✅ Ciclo de vida de escrow (held → refunded)
- ✅ Marcado como consumed
- ✅ Marcado como refund_failed
- ✅ Prevención de refunds duplicados
- ✅ Compilación sin errores

## Notas Técnicas

### Memoria Estable

- **MemoryId 12**: Almacenamiento de escrow entries
- Sobrevive upgrades de canister
- Usa serialización Candid para eficiencia

### Performance

- Acceso O(log n) por ProcessId
- Cleanup periódico de escrows antiguos
- Sin límite artificial en número de escrows

### Limitaciones Actuales

1. **Cobro de Fee**: Por ahora es simulado, no hay transferencia real desde usuario
   - TODO: Implementar `charge_etching_fee` con ICRC-2 approve/transferFrom
2. **Fee Estático**: 20,000 sats fijos
   - TODO: Calcular dinámicamente basado en fee rate de red

## Próximos Pasos

1. Implementar cobro real de fee con ICRC-2
2. Agregar fee dinámico basado en condiciones de red
3. Implementar retry automático para refunds fallidos
4. Agregar notificaciones a usuarios sobre refunds
5. Dashboard de admin para monitoreo de escrows

## Referencias

- `backend/canisters/rune-engine/src/escrow.rs` - Módulo principal
- `backend/canisters/rune-engine/src/etching_flow.rs` - Integración con flow
- `backend/canisters/rune-engine/src/lib.rs` - APIs públicas
- `backend/canisters/bitcoin-integration/src/lib.rs` - Endpoint transfer_ckbtc
