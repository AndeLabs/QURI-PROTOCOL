/*!
 * RuneKey - Bounded identifier for StableBTreeMap keys
 * 
 * Este módulo define el identificador único BOUNDED para Runes,
 * basado en el protocolo oficial: block:tx
 */

use candid::{CandidType, Deserialize};
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use serde::Serialize;
use std::borrow::Cow;
use std::fmt;
use std::str::FromStr;

/// RuneKey - Identificador único bounded para uso en StableBTreeMap keys
///
/// ## Por Qué Bounded?
///
/// StableBTreeMap REQUIERE que las keys sean Bounded (tamaño fijo) porque:
/// 1. Necesita calcular offsets en stable memory
/// 2. Permite optimizaciones de B-tree balancing
/// 3. Previene fragmentación de memoria
///
/// ## Protocolo Runes
///
/// Según el protocolo oficial de Runes (https://docs.ordinals.com/runes.html):
/// - Cada Rune se identifica ÚNICAMENTE por su block:tx
/// - El nombre es solo metadata (puede haber nombres duplicados teóricamente)
/// - block es el Bitcoin block height
/// - tx es el índice de la transacción en ese bloque
///
/// ## Ejemplo
///
/// ```rust
/// let key = RuneKey {
///     block: 840000,  // Block height
///     tx: 1,          // Transaction index
/// };
///
/// // String representation: "840000:1"
/// assert_eq!(key.to_string(), "840000:1");
/// ```
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct RuneKey {
    /// Bitcoin block height donde se creó el Rune
    pub block: u64,
    
    /// Índice de la transacción en el bloque (0-based)
    pub tx: u32,
}

impl RuneKey {
    /// Tamaño fijo en bytes: 8 (block) + 4 (tx) = 12 bytes
    pub const SIZE: u32 = 12;
    
    /// Crea un nuevo RuneKey
    pub const fn new(block: u64, tx: u32) -> Self {
        Self { block, tx }
    }
    
    /// Parse desde formato string "block:tx"
    ///
    /// ## Ejemplo
    ///
    /// ```rust
    /// let key = RuneKey::from_str("840000:1")?;
    /// assert_eq!(key.block, 840000);
    /// assert_eq!(key.tx, 1);
    /// ```
    pub fn from_str(s: &str) -> Result<Self, ParseError> {
        let parts: Vec<&str> = s.split(':').collect();
        
        if parts.len() != 2 {
            return Err(ParseError::InvalidFormat {
                input: s.to_string(),
                expected: "block:tx".to_string(),
            });
        }
        
        let block = parts[0]
            .parse::<u64>()
            .map_err(|e| ParseError::InvalidBlock {
                value: parts[0].to_string(),
                error: e.to_string(),
            })?;
        
        let tx = parts[1]
            .parse::<u32>()
            .map_err(|e| ParseError::InvalidTx {
                value: parts[1].to_string(),
                error: e.to_string(),
            })?;
        
        Ok(Self { block, tx })
    }
    
    /// Genera RuneKey desde bytes raw
    pub fn from_bytes_raw(bytes: &[u8]) -> Result<Self, ParseError> {
        if bytes.len() != 12 {
            return Err(ParseError::InvalidLength {
                expected: 12,
                got: bytes.len(),
            });
        }
        
        let block = u64::from_le_bytes(
            bytes[0..8]
                .try_into()
                .map_err(|_| ParseError::InvalidBlock {
                    value: format!("{:?}", &bytes[0..8]),
                    error: "Failed to parse block bytes".to_string(),
                })?,
        );
        
        let tx = u32::from_le_bytes(
            bytes[8..12]
                .try_into()
                .map_err(|_| ParseError::InvalidTx {
                    value: format!("{:?}", &bytes[8..12]),
                    error: "Failed to parse tx bytes".to_string(),
                })?,
        );
        
        Ok(Self { block, tx })
    }
}

// ============================================================================
// Storable Implementation - BOUNDED
// ============================================================================

impl Storable for RuneKey {
    /// Serializa RuneKey a bytes en formato little-endian
    ///
    /// ## Layout (12 bytes total)
    ///
    /// ```
    /// [0..8]   block (u64, little-endian)
    /// [8..12]  tx    (u32, little-endian)
    /// ```
    ///
    /// ## Por Qué Little-Endian?
    ///
    /// 1. Es el estándar en Bitcoin (consensus-critical)
    /// 2. Mayoría de sistemas modernos usan little-endian (x86, ARM)
    /// 3. Rust lo optimiza automáticamente en estas arquitecturas
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut bytes = Vec::with_capacity(12);
        
        // Serialize block (8 bytes)
        bytes.extend_from_slice(&self.block.to_le_bytes());
        
        // Serialize tx (4 bytes)
        bytes.extend_from_slice(&self.tx.to_le_bytes());
        
        Cow::Owned(bytes)
    }
    
    /// Deserializa bytes a RuneKey
    ///
    /// ## Garantías
    ///
    /// - SIEMPRE recibe exactamente 12 bytes (garantizado por Bound::Bounded)
    /// - Usa unwrap() porque sabemos que el slice es del tamaño correcto
    /// - Si falla = bug crítico que queremos detectar inmediatamente
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        debug_assert_eq!(bytes.len(), 12, "RuneKey must be exactly 12 bytes");
        
        let block = u64::from_le_bytes(
            bytes[0..8]
                .try_into()
                .expect("RuneKey: invalid block bytes (impossible if Bounded works)"),
        );
        
        let tx = u32::from_le_bytes(
            bytes[8..12]
                .try_into()
                .expect("RuneKey: invalid tx bytes (impossible if Bounded works)"),
        );
        
        Self { block, tx }
    }
    
    /// Define el límite como Bounded con tamaño fijo
    ///
    /// ## Bounded Configuration
    ///
    /// - `max_size`: 12 bytes (8 + 4)
    /// - `is_fixed_size`: true (SIEMPRE 12 bytes, nunca más ni menos)
    ///
    /// ## Beneficios para StableBTreeMap
    ///
    /// 1. **Preasignación**: Puede reservar espacio exacto
    /// 2. **Sin fragmentación**: Todos los nodos del mismo tamaño
    /// 3. **Acceso O(1)**: Offset calculable directamente
    /// 4. **Verificación**: Detecta corrupción de datos
    const BOUND: Bound = Bound::Bounded {
        max_size: Self::SIZE,
        is_fixed_size: true,
    };
}

// ============================================================================
// Display Implementation
// ============================================================================

impl fmt::Display for RuneKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}:{}", self.block, self.tx)
    }
}

// ============================================================================
// FromStr Implementation
// ============================================================================

impl FromStr for RuneKey {
    type Err = ParseError;
    
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let parts: Vec<&str> = s.split(':').collect();
        
        if parts.len() != 2 {
            return Err(ParseError::InvalidFormat {
                input: s.to_string(),
                expected: "block:tx".to_string(),
            });
        }
        
        let block = parts[0].parse::<u64>().map_err(|e| ParseError::InvalidBlock {
            value: parts[0].to_string(),
            error: e.to_string(),
        })?;
        
        let tx = parts[1].parse::<u32>().map_err(|e| ParseError::InvalidTx {
            value: parts[1].to_string(),
            error: e.to_string(),
        })?;
        
        Ok(RuneKey { block, tx })
    }
}

// ============================================================================
// Error Types
// ============================================================================

#[derive(Debug, Clone, PartialEq)]
pub enum ParseError {
    InvalidFormat {
        input: String,
        expected: String,
    },
    InvalidBlock {
        value: String,
        error: String,
    },
    InvalidTx {
        value: String,
        error: String,
    },
    InvalidLength {
        expected: usize,
        got: usize,
    },
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::InvalidFormat { input, expected } => {
                write!(f, "Invalid RuneKey format '{}'. Expected: {}", input, expected)
            }
            ParseError::InvalidBlock { value, error } => {
                write!(f, "Invalid block value '{}': {}", value, error)
            }
            ParseError::InvalidTx { value, error } => {
                write!(f, "Invalid tx value '{}': {}", value, error)
            }
            ParseError::InvalidLength { expected, got } => {
                write!(f, "Invalid byte length. Expected: {}, got: {}", expected, got)
            }
        }
    }
}

impl std::error::Error for ParseError {}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_rune_key_creation() {
        let key = RuneKey::new(840000, 1);
        assert_eq!(key.block, 840000);
        assert_eq!(key.tx, 1);
    }
    
    #[test]
    fn test_rune_key_to_string() {
        let key = RuneKey::new(840000, 1);
        // to_string() viene del trait Display
        assert_eq!(key.to_string(), "840000:1");
    }
    
    #[test]
    fn test_rune_key_from_str() {
        let key = RuneKey::from_str("840000:1").unwrap();
        assert_eq!(key.block, 840000);
        assert_eq!(key.tx, 1);
    }
    
    #[test]
    fn test_rune_key_from_str_invalid() {
        assert!(RuneKey::from_str("invalid").is_err());
        assert!(RuneKey::from_str("840000").is_err());
        assert!(RuneKey::from_str("840000:1:extra").is_err());
        assert!(RuneKey::from_str("abc:1").is_err());
        assert!(RuneKey::from_str("840000:abc").is_err());
    }
    
    #[test]
    fn test_storable_serialization() {
        let key = RuneKey::new(840000, 1);
        
        // Serialize
        let bytes = key.to_bytes();
        assert_eq!(bytes.len(), 12);
        
        // Deserialize
        let recovered = RuneKey::from_bytes(bytes);
        assert_eq!(recovered, key);
    }
    
    #[test]
    fn test_storable_bound() {
        assert_eq!(RuneKey::BOUND, Bound::Bounded {
            max_size: 12,
            is_fixed_size: true,
        });
    }
    
    #[test]
    fn test_ordering() {
        let key1 = RuneKey::new(840000, 1);
        let key2 = RuneKey::new(840000, 2);
        let key3 = RuneKey::new(840001, 1);
        
        assert!(key1 < key2);
        assert!(key2 < key3);
        assert!(key1 < key3);
    }
    
    #[test]
    fn test_display() {
        let key = RuneKey::new(840000, 1);
        assert_eq!(format!("{}", key), "840000:1");
    }
}
