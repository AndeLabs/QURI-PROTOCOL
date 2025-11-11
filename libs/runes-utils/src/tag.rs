/*!
 * 🎓 LECCIÓN 2: Enum Representation y Type Casting en Rust
 *
 * Este módulo maneja los "tags" del protocolo Runes.
 *
 * ## ¿Qué son los Tags en Runes?
 *
 * Los tags son identificadores numéricos que marcan diferentes campos
 * en un runestone. Son como "etiquetas" que dicen:
 * "El siguiente valor es la divisibilidad" o "El siguiente es el símbolo"
 *
 * ## El Problema de repr(u128)
 *
 * ### ¿Qué es repr en Rust?
 *
 * `repr` (representation) controla cómo Rust almacena un enum en memoria:
 *
 * ```rust
 * // SIN repr: Rust elige la mejor representación
 * enum Color {
 *     Red,    // Internamente: 0
 *     Green,  // Internamente: 1
 *     Blue,   // Internamente: 2
 * }
 *
 * // CON repr(u8): Forzamos que use u8
 * #[repr(u8)]
 * enum Color {
 *     Red = 0,
 *     Green = 1,
 *     Blue = 2,
 * }
 * ```
 *
 * ### El Problema
 *
 * `repr(u128)` está **unstable** (experimental) en Rust.
 * Significa que solo funciona en Rust nightly, no en stable.
 *
 * ### La Solución
 *
 * En lugar de:
 * ```rust
 * #[repr(u128)]  // ❌ Unstable!
 * enum Tag { ... }
 * ```
 *
 * Hacemos:
 * ```rust
 * enum Tag { ... }  // ✅ Rust elige
 *
 * impl Tag {
 *     const fn as_u128(self) -> u128 {
 *         self as u128
 *     }
 * }
 * ```
 *
 * ## Casting Explicado
 *
 * El operador `as` en Rust convierte entre tipos numéricos:
 *
 * ```rust
 * let x: u8 = 5;
 * let y: u64 = x as u64;  // 5 as u64
 * let z: u128 = y as u128;  // 5 as u128
 * ```
 *
 * Para enums, el cast toma el "discriminante" (valor interno):
 *
 * ```rust
 * enum Tag {
 *     Body = 0,      // discriminante = 0
 *     Rune = 13,     // discriminante = 13
 * }
 *
 * let tag = Tag::Rune;
 * let value = tag as u128;  // value = 13
 * ```
 *
 * ## Mejores Prácticas 2025
 *
 * 1. **Evita repr inestables**: Usa repr(u8), repr(u32), repr(u64)
 * 2. **Prefiere métodos sobre casts directos**: Más legible y type-safe
 * 3. **Documenta valores**: Especifica explícitamente cada discriminante
 * 4. **Usa const fn**: Para optimización compile-time
 */

/// Tags del protocolo Runes según la especificación
///
/// Cada tag identifica un campo específico en el runestone.
/// Estos valores son parte del protocolo Runes y NO deben cambiar.
///
/// ## Especificación
///
/// Ver: https://docs.ordinals.com/runes.html
///
/// ## Valores de Tags
///
/// - **Body (0)**: Marca el inicio de edicts (transferencias)
/// - **Divisibility (1)**: Cuántos decimales tiene el rune
/// - **Spacers (2)**: Espaciadores visuales en el nombre
/// - **Symbol (3)**: Símbolo Unicode del rune (ej: ₿, $)
/// - **Premine (4)**: Cantidad pre-minada para el creador
/// - **Amount (5)**: Cantidad por mint
/// - **Cap (6)**: Número máximo de mints
/// - **HeightStart (7)**: Bloque de inicio para minting
/// - **HeightEnd (8)**: Bloque de fin para minting
/// - **OffsetStart (9)**: Offset de inicio
/// - **OffsetEnd (10)**: Offset de fin
/// - **Mint (11)**: Mint a ejecutar
/// - **Pointer (12)**: Apunta a output específico
/// - **Rune (13)**: Nombre del rune (encoded)
///
/// ## Por Qué Estos Valores?
///
/// Los números fueron elegidos por el creador del protocolo (Casey Rodarmor)
/// para ser:
/// - Compactos (LEB128 encoding eficiente)
/// - Ordenados lógicamente
/// - Extensibles (valores futuros)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tag {
    /// Marca el inicio de edicts (transferencias)
    Body = 0,

    /// Divisibilidad del rune (0-38)
    /// Ej: 8 significa 8 decimales (como Bitcoin)
    Divisibility = 1,

    /// Espaciadores para formateo del nombre
    /// Ej: UNCOMMON•GOODS (• es el spacer)
    Spacers = 2,

    /// Símbolo Unicode del rune
    /// Ej: ₿, $, ⧉
    Symbol = 3,

    /// Cantidad pre-minada (para el creador)
    Premine = 4,

    /// Cantidad de runes por mint
    Amount = 5,

    /// Número máximo de mints permitidos
    Cap = 6,

    /// Bloque de Bitcoin donde empieza el minting
    HeightStart = 7,

    /// Bloque de Bitcoin donde termina el minting
    HeightEnd = 8,

    /// Offset de inicio (relativo al etching)
    OffsetStart = 9,

    /// Offset de fin (relativo al etching)
    OffsetEnd = 10,

    /// ID del rune a mintear
    Mint = 11,

    /// Apuntador al output de la transacción
    Pointer = 12,

    /// Nombre del rune (encoded como integer)
    Rune = 13,
}

impl Tag {
    /// Convierte el tag a u128 para encoding
    ///
    /// ## Por Qué u128?
    ///
    /// El protocolo Runes usa LEB128 encoding, que puede manejar
    /// integers de hasta 128 bits. Aunque los tags actuales son pequeños,
    /// usar u128 permite:
    /// - Compatibilidad con todos los valores LEB128
    /// - Extensibilidad futura
    /// - Uniformidad en el encoding
    ///
    /// ## const fn Explicado
    ///
    /// `const fn` significa que esta función puede ejecutarse en
    /// compile-time (en tiempo de compilación).
    ///
    /// Beneficios:
    /// - ✅ Zero runtime cost
    /// - ✅ Valores pueden usarse en const contexts
    /// - ✅ Optimización del compilador
    ///
    /// Ejemplo:
    /// ```rust
    /// const RUNE_TAG: u128 = Tag::Rune.as_u128();  // Calculado en compile-time!
    /// ```
    #[inline(always)]  // 🎯 Hint al compilador: siempre inline esto
    pub const fn as_u128(self) -> u128 {
        self as u128
    }

    /// Intenta convertir un u128 a Tag
    ///
    /// ## Por Qué Option?
    ///
    /// No todos los u128 son tags válidos.
    /// Solo 0-13 son válidos actualmente.
    ///
    /// Retornar `Option<Tag>` es más seguro que panic:
    /// ```rust
    /// let tag = Tag::from_u128(1);  // Some(Tag::Divisibility)
    /// let invalid = Tag::from_u128(99);  // None
    /// ```
    pub const fn from_u128(value: u128) -> Option<Self> {
        match value {
            0 => Some(Tag::Body),
            1 => Some(Tag::Divisibility),
            2 => Some(Tag::Spacers),
            3 => Some(Tag::Symbol),
            4 => Some(Tag::Premine),
            5 => Some(Tag::Amount),
            6 => Some(Tag::Cap),
            7 => Some(Tag::HeightStart),
            8 => Some(Tag::HeightEnd),
            9 => Some(Tag::OffsetStart),
            10 => Some(Tag::OffsetEnd),
            11 => Some(Tag::Mint),
            12 => Some(Tag::Pointer),
            13 => Some(Tag::Rune),
            _ => None,  // Valor inválido
        }
    }

    /// Verifica si un tag es válido
    ///
    /// ## Uso
    ///
    /// Útil antes de parsear para evitar errores:
    /// ```rust
    /// if Tag::is_valid(value) {
    ///     let tag = Tag::from_u128(value).unwrap();
    ///     // ... procesar tag
    /// }
    /// ```
    #[inline]
    pub const fn is_valid(value: u128) -> bool {
        value <= 13  // Tags actuales: 0-13
    }
}

// ========================================================================
// 🎓 TESTS EDUCATIVOS
// ========================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tag_values() {
        // Verificar que los valores son correctos
        assert_eq!(Tag::Body as u128, 0);
        assert_eq!(Tag::Divisibility as u128, 1);
        assert_eq!(Tag::Rune as u128, 13);
    }

    #[test]
    fn test_tag_conversion() {
        // Test as_u128
        assert_eq!(Tag::Body.as_u128(), 0);
        assert_eq!(Tag::Rune.as_u128(), 13);

        // Test from_u128 (válidos)
        assert_eq!(Tag::from_u128(0), Some(Tag::Body));
        assert_eq!(Tag::from_u128(13), Some(Tag::Rune));

        // Test from_u128 (inválidos)
        assert_eq!(Tag::from_u128(14), None);
        assert_eq!(Tag::from_u128(999), None);
    }

    #[test]
    fn test_tag_is_valid() {
        assert!(Tag::is_valid(0));
        assert!(Tag::is_valid(13));
        assert!(!Tag::is_valid(14));
        assert!(!Tag::is_valid(100));
    }

    /// Test que const fn realmente funciona en compile-time
    #[test]
    fn test_const_fn() {
        // Esto se calcula en compile-time, no runtime!
        const BODY_VALUE: u128 = Tag::Body.as_u128();
        const RUNE_VALUE: u128 = Tag::Rune.as_u128();

        assert_eq!(BODY_VALUE, 0);
        assert_eq!(RUNE_VALUE, 13);
    }
}

// ========================================================================
// 📝 RESUMEN DE CONCEPTOS APRENDIDOS
// ========================================================================
//
// 1. ✅ repr(uN) controla representación en memoria
// 2. ✅ repr(u128) es unstable, evitarlo
// 3. ✅ Usar métodos (as_u128) en lugar de repr
// 4. ✅ const fn permite cálculos en compile-time
// 5. ✅ #[inline(always)] sugiere inlining agresivo
// 6. ✅ Option<T> es mejor que panic para validación
//
// ========================================================================
