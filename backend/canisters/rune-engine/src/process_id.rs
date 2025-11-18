/*!
 * ProcessId - Bounded identifier para etching process keys
 * 
 * UUID fijo de 16 bytes para uso eficiente en StableBTreeMap
 */

use candid::{CandidType, Deserialize};
use ic_stable_structures::storable::Bound;
use ic_stable_structures::Storable;
use serde::Serialize;
use std::borrow::Cow;
use std::fmt;

/// ProcessId - Identificador único bounded para etching processes
///
/// ## Diseño
///
/// - Usa UUID v4 (16 bytes random)
/// - Formato: 128 bits de entropía criptográfica
/// - Garantiza unicidad sin colisiones (probabilidad < 10^-15)
/// - Bounded para StableBTreeMap keys
///
/// ## Por Qué 16 Bytes?
///
/// UUID v4 estándar:
/// - 122 bits de randomness
/// - 6 bits de versión/variante
/// - Total: 128 bits = 16 bytes
///
/// ## Ejemplo
///
/// ```rust
/// let id = ProcessId::new();
/// // Formato string: "550e8400-e29b-41d4-a716-446655440000"
/// ```
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct ProcessId([u8; 16]);

impl ProcessId {
    /// Tamaño fijo en bytes
    pub const SIZE: u32 = 16;

    /// Crea un nuevo ProcessId aleatorio (UUID v4)
    ///
    /// ## Implementación
    ///
    /// Usa ic_cdk::api::management_canister::main::raw_rand() para
    /// obtener 16 bytes de entropía criptográfica de ICP.
    ///
    /// ## Nota
    ///
    /// Esta función es async porque raw_rand() requiere inter-canister call.
    /// Para contextos sync, usar `from_bytes()` con bytes pre-generados.
    pub async fn new() -> Result<Self, String> {
        // Get 16 bytes of cryptographic randomness from ICP
        let random_bytes = ic_cdk::api::management_canister::main::raw_rand()
            .await
            .map_err(|(code, msg)| format!("Failed to generate random bytes: {:?} - {}", code, msg))?
            .0;

        if random_bytes.len() < 16 {
            return Err(format!(
                "Insufficient random bytes: expected 16, got {}",
                random_bytes.len()
            ));
        }

        let mut bytes = [0u8; 16];
        bytes.copy_from_slice(&random_bytes[0..16]);

        // Set UUID version 4 bits (bits 48-51 = 0100)
        bytes[6] = (bytes[6] & 0x0F) | 0x40;

        // Set UUID variant bits (bits 64-65 = 10)
        bytes[8] = (bytes[8] & 0x3F) | 0x80;

        Ok(Self(bytes))
    }

    /// Crea ProcessId desde bytes exactos (16 bytes)
    pub fn from_bytes_array(bytes: [u8; 16]) -> Self {
        Self(bytes)
    }

    /// Crea ProcessId desde slice de bytes
    pub fn from_slice(bytes: &[u8]) -> Result<Self, String> {
        if bytes.len() != 16 {
            return Err(format!(
                "Invalid ProcessId length: expected 16 bytes, got {}",
                bytes.len()
            ));
        }

        let mut arr = [0u8; 16];
        arr.copy_from_slice(bytes);
        Ok(Self(arr))
    }

    /// Convierte a bytes array
    pub fn as_bytes(&self) -> &[u8; 16] {
        &self.0
    }

    /// Convierte a string en formato UUID
    ///
    /// Formato: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    ///
    /// ## Ejemplo
    ///
    /// ```rust
    /// let id = ProcessId::from_bytes_array([0x55, 0x0e, 0x84, 0x00, ...]);
    /// assert_eq!(id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    /// ```
    pub fn to_string(&self) -> String {
        format!(
            "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
            self.0[0], self.0[1], self.0[2], self.0[3],
            self.0[4], self.0[5],
            self.0[6], self.0[7],
            self.0[8], self.0[9],
            self.0[10], self.0[11], self.0[12], self.0[13], self.0[14], self.0[15]
        )
    }

    /// Parse desde formato string UUID
    ///
    /// Acepta formatos:
    /// - Con guiones: "550e8400-e29b-41d4-a716-446655440000"
    /// - Sin guiones: "550e8400e29b41d4a716446655440000"
    pub fn from_string(s: &str) -> Result<Self, String> {
        // Remove hyphens if present
        let clean = s.replace('-', "");

        if clean.len() != 32 {
            return Err(format!(
                "Invalid UUID string length: expected 32 hex chars, got {}",
                clean.len()
            ));
        }

        let mut bytes = [0u8; 16];
        for i in 0..16 {
            let byte_str = &clean[i * 2..i * 2 + 2];
            bytes[i] = u8::from_str_radix(byte_str, 16).map_err(|e| {
                format!("Invalid hex character at position {}: {}", i * 2, e)
            })?;
        }

        Ok(Self(bytes))
    }

    /// Genera ProcessId determinístico desde un seed (para testing)
    #[cfg(test)]
    pub fn from_seed(seed: u64) -> Self {
        let mut bytes = [0u8; 16];
        bytes[0..8].copy_from_slice(&seed.to_le_bytes());
        bytes[8..16].copy_from_slice(&seed.to_be_bytes());

        // Set UUID version 4 bits
        bytes[6] = (bytes[6] & 0x0F) | 0x40;
        bytes[8] = (bytes[8] & 0x3F) | 0x80;

        Self(bytes)
    }
}

// ============================================================================
// Storable Implementation - BOUNDED
// ============================================================================

impl Storable for ProcessId {
    /// Serializa ProcessId a bytes (identidad - ya son bytes)
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Borrowed(&self.0)
    }

    /// Deserializa bytes a ProcessId
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        debug_assert_eq!(bytes.len(), 16, "ProcessId must be exactly 16 bytes");

        let mut arr = [0u8; 16];
        arr.copy_from_slice(&bytes);
        Self(arr)
    }

    /// Define el límite como Bounded con tamaño fijo
    ///
    /// ## Bounded Configuration
    ///
    /// - `max_size`: 16 bytes (UUID size)
    /// - `is_fixed_size`: true (SIEMPRE 16 bytes)
    ///
    /// ## Beneficios
    ///
    /// - Preasignación exacta de memoria
    /// - Sin fragmentación
    /// - O(1) offset calculation
    const BOUND: Bound = Bound::Bounded {
        max_size: Self::SIZE,
        is_fixed_size: true,
    };
}

// ============================================================================
// Display Implementation
// ============================================================================

impl fmt::Display for ProcessId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.to_string())
    }
}

// ============================================================================
// From/Into Implementations
// ============================================================================

impl From<[u8; 16]> for ProcessId {
    fn from(bytes: [u8; 16]) -> Self {
        Self(bytes)
    }
}

impl From<ProcessId> for [u8; 16] {
    fn from(id: ProcessId) -> [u8; 16] {
        id.0
    }
}

impl AsRef<[u8]> for ProcessId {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_process_id_creation() {
        let id = ProcessId::from_seed(12345);
        assert_eq!(id.as_bytes().len(), 16);
    }

    #[test]
    fn test_process_id_to_string() {
        let bytes = [
            0x55, 0x0e, 0x84, 0x00, 0xe2, 0x9b, 0x41, 0xd4, 0xa7, 0x16, 0x44, 0x66, 0x55, 0x44,
            0x00, 0x00,
        ];
        let id = ProcessId::from_bytes_array(bytes);
        assert_eq!(id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_process_id_from_string() {
        let uuid_str = "550e8400-e29b-41d4-a716-446655440000";
        let id = ProcessId::from_string(uuid_str).unwrap();

        assert_eq!(id.0[0], 0x55);
        assert_eq!(id.0[1], 0x0e);
        assert_eq!(id.0[15], 0x00);
    }

    #[test]
    fn test_process_id_from_string_no_hyphens() {
        let uuid_str = "550e8400e29b41d4a716446655440000";
        let id = ProcessId::from_string(uuid_str).unwrap();

        assert_eq!(id.to_string(), "550e8400-e29b-41d4-a716-446655440000");
    }

    #[test]
    fn test_process_id_roundtrip() {
        let id1 = ProcessId::from_seed(99999);
        let string = id1.to_string();
        let id2 = ProcessId::from_string(&string).unwrap();

        assert_eq!(id1, id2);
    }

    #[test]
    fn test_storable_serialization() {
        let id = ProcessId::from_seed(54321);

        // Serialize
        let bytes = id.to_bytes();
        assert_eq!(bytes.len(), 16);

        // Deserialize
        let recovered = ProcessId::from_bytes(bytes);
        assert_eq!(recovered, id);
    }

    #[test]
    fn test_storable_bound() {
        assert_eq!(
            ProcessId::BOUND,
            Bound::Bounded {
                max_size: 16,
                is_fixed_size: true,
            }
        );
    }

    #[test]
    fn test_ordering() {
        let id1 = ProcessId::from_seed(1);
        let id2 = ProcessId::from_seed(2);
        let id3 = ProcessId::from_seed(3);

        assert!(id1 < id2);
        assert!(id2 < id3);
        assert!(id1 < id3);
    }

    #[test]
    fn test_display() {
        let id = ProcessId::from_seed(42);
        let display = format!("{}", id);
        assert_eq!(display.len(), 36); // UUID format with hyphens
    }

    #[test]
    fn test_invalid_string_length() {
        let result = ProcessId::from_string("too-short");
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_hex_chars() {
        let result = ProcessId::from_string("550e8400-e29b-41d4-a716-44665544000g"); // 'g' invalid
        assert!(result.is_err());
    }
}
