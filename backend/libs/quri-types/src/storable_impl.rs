/*!
 * 🎓 LECCIÓN: Implementaciones del Trait Storable
 *
 * Este módulo implementa el trait `Storable` para nuestros tipos personalizados.
 *
 * ## ¿Qué es Storable?
 *
 * Storable es un trait de ic-stable-structures que define cómo serializar
 * y deserializar nuestros tipos para guardarlos en Stable Memory.
 *
 * ## Conceptos Clave:
 *
 * ### 1. Serialización
 * - Convertir datos de Rust a bytes (to_bytes)
 * - Usar Candid encoding para compatibilidad entre upgrades
 *
 * ### 2. Deserialización
 * - Convertir bytes de vuelta a tipos Rust (from_bytes)
 * - Manejar errores si los datos están corruptos
 *
 * ### 3. Bounded vs Unbounded
 * - **Bounded**: Tamaño fijo conocido (ej: u64 siempre son 8 bytes)
 *   - Más eficiente
 *   - Usa `Bound::Bounded { max_size: N, is_fixed_size: true }`
 *
 * - **Unbounded**: Tamaño variable (ej: String, Vec)
 *   - Más flexible pero menos eficiente
 *   - Usa `Bound::Unbounded`
 *
 * ## Por Qué Usar Candid?
 *
 * Candid es el formato de serialización oficial de ICP:
 * - ✅ Compatible entre diferentes versiones del código
 * - ✅ Permite agregar campos sin romper compatibilidad
 * - ✅ Type-safe: detecta errores en compile-time
 * - ✅ Interoperable con otros lenguajes (Motoko, TypeScript)
 *
 * ## Mejores Prácticas 2025:
 *
 * 1. **Siempre usa Candid para encoding**
 *    - encode_one() para serializar
 *    - decode_one() para deserializar
 *
 * 2. **Maneja errores gracefully**
 *    - unwrap() solo en inicialización
 *    - En producción, usa expect() con mensajes claros
 *
 * 3. **Considera el tamaño**
 *    - Tipos grandes (>1KB): usa Unbounded
 *    - Tipos pequeños (<100 bytes): considera Bounded si es fijo
 *
 * 4. **Versiona tus estructuras**
 *    - Agrega campos con `Option<T>` para compatibilidad
 *    - Nunca elimines campos, márcalos como deprecated
 */

use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use std::borrow::Cow;

use crate::{RegistryEntry, RuneId, RuneMetadata, UserSession};

// ========================================================================
// 🎓 IMPLEMENTACIÓN 1: RuneId
// ========================================================================
//
// RuneId es relativamente pequeño (3 campos simples + 1 string)
// Pero el string puede variar en longitud (1-26 chars)
// Por lo tanto, usamos Unbounded para flexibilidad
//
impl Storable for RuneId {
    /// Convierte RuneId a bytes usando Candid encoding
    ///
    /// 💡 TIP: Candid maneja automáticamente:
    /// - Strings de longitud variable
    /// - Integers de diferentes tamaños
    /// - Tipos opcionales
    fn to_bytes(&self) -> Cow<[u8]> {
        // encode_one() es la forma recomendada de serializar un solo valor
        // unwrap() es aceptable aquí porque RuneId siempre es válido
        Cow::Owned(candid::encode_one(self).expect("Failed to encode RuneId"))
    }

    /// Convierte bytes de vuelta a RuneId
    ///
    /// ⚠️ IMPORTANTE: Este método puede fallar si:
    /// - Los bytes están corruptos
    /// - El formato cambió entre versiones
    /// - La memoria fue sobrescrita
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode RuneId")
    }

    /// Define el límite de tamaño
    ///
    /// 🤔 ¿Bounded o Unbounded?
    /// - RuneId tiene un string (name) que varía de 1-26 chars
    /// - Aunque podríamos calcular max_size = 26 + overhead
    /// - Usamos Unbounded por simplicidad y compatibilidad futura
    const BOUND: Bound = Bound::Unbounded;
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 2: RuneMetadata
// ========================================================================
//
// RuneMetadata contiene RuneId + otros datos
// Es más grande que RuneId, definitivamente Unbounded
//
impl Storable for RuneMetadata {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode RuneMetadata"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode RuneMetadata")
    }

    // Unbounded porque contiene strings y tipos variables
    const BOUND: Bound = Bound::Unbounded;
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 3: RegistryEntry (NEW - con RuneKey)
// ========================================================================
//
// RegistryEntry es la estructura más grande
// Contiene RuneMetadata + BondingCurve opcional + stats + indexed_at
//
// NUEVA VERSIÓN: No contiene rune_id separado, usa metadata.key
//
impl Storable for RegistryEntry {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode RegistryEntry"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode RegistryEntry")
    }

    // Definitivamente Unbounded por su complejidad
    const BOUND: Bound = Bound::Unbounded;
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 3b: RegistryEntryLegacy (DEPRECATED)
// ========================================================================
//
// Mantenemos para compatibilidad durante migración
//
#[allow(deprecated)]
impl Storable for crate::RegistryEntryLegacy {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode RegistryEntryLegacy"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode RegistryEntryLegacy")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 4: UserSession
// ========================================================================
//
// UserSession contiene:
// - Principal (29 bytes fijos)
// - session_key (Vec<u8> variable)
// - expires_at (u64 fijo)
// - permissions (struct pequeña)
//
// Aunque podríamos estimar un max_size, usamos Unbounded
// para permitir cambios futuros (ej: agregar más permisos)
//
impl Storable for UserSession {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).expect("Failed to encode UserSession"))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).expect("Failed to decode UserSession")
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ========================================================================
// 🎓 EJEMPLO EDUCATIVO: Bounded Type
// ========================================================================
//
// Para demostrar cómo se vería un tipo Bounded, aquí hay un ejemplo:
//
// ```rust
// #[derive(CandidType, Deserialize)]
// struct FixedSizeCounter {
//     value: u64,  // 8 bytes
//     last_updated: u64,  // 8 bytes
// }
//
// impl Storable for FixedSizeCounter {
//     fn to_bytes(&self) -> Cow<[u8]> {
//         let mut bytes = Vec::with_capacity(16);
//         bytes.extend_from_slice(&self.value.to_le_bytes());
//         bytes.extend_from_slice(&self.last_updated.to_le_bytes());
//         Cow::Owned(bytes)
//     }
//
//     fn from_bytes(bytes: Cow<[u8]>) -> Self {
//         Self {
//             value: u64::from_le_bytes(bytes[0..8].try_into().unwrap()),
//             last_updated: u64::from_le_bytes(bytes[8..16].try_into().unwrap()),
//         }
//     }
//
//     // 🎯 BOUNDED: Sabemos exactamente el tamaño
//     const BOUND: Bound = Bound::Bounded {
//         max_size: 16,  // 8 + 8 bytes
//         is_fixed_size: true,  // Siempre 16 bytes
//     };
// }
// ```
//
// ========================================================================

// ========================================================================
// 🎓 NOTE: Vec<RuneKey> Storable
// ========================================================================
//
// No podemos implementar Storable para Vec<RuneKey> directamente debido al
// orphan rule (E0117). En su lugar, el Registry usará un diseño diferente
// para el CreatorIndex.
//
// Solución: Usar composite keys (Principal, RuneKey) -> () en lugar de
// Principal -> Vec<RuneKey>
//

// ========================================================================
// 🎓 TESTS EDUCATIVOS
// ========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    /// Test básico: serialización y deserialización
    #[test]
    fn test_rune_id_storable() {
        let original = RuneId {
            block: 840000,
            tx: 1,
            name: "BITCOIN".to_string(),
            timestamp: 1234567890,
        };

        // Serializar
        let bytes = original.to_bytes();

        // Deserializar
        let recovered = RuneId::from_bytes(bytes);

        // Verificar que son iguales
        assert_eq!(original.block, recovered.block);
        assert_eq!(original.name, recovered.name);
    }

    /// Test avanzado: verificar overhead de Candid
    #[test]
    fn test_serialization_overhead() {
        let rune_id = RuneId {
            block: 1,
            tx: 1,
            name: "A".to_string(),
            timestamp: 1,
        };

        let bytes = rune_id.to_bytes();

        // Candid agrega overhead para type information
        // Típicamente 10-30 bytes extra
        println!("RuneId serialized size: {} bytes", bytes.len());

        // Esto es normal y esperado
        assert!(bytes.len() < 100); // Razonable para esta estructura
    }
}

// ========================================================================
// 📝 RESUMEN DE CONCEPTOS APRENDIDOS
// ========================================================================
//
// 1. ✅ Trait Storable es el "contrato" para stable memory
// 2. ✅ Candid encoding es el estándar de ICP
// 3. ✅ Bounded vs Unbounded: trade-off eficiencia vs flexibilidad
// 4. ✅ expect() vs unwrap(): claridad en mensajes de error
// 5. ✅ Cow<[u8]>: evita copias innecesarias (optimización)
//
// ========================================================================
