/*!
 * Validation Module - Input validation para todos los tipos
 * 
 * Este módulo centraliza TODA la validación de inputs para prevenir:
 * - Datos inválidos en stable memory
 * - Transacciones Bitcoin inválidas
 * - Ataques de injection
 * - Estado inconsistente
 */

use thiserror::Error;

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

#[derive(Error, Debug, Clone, PartialEq)]
pub enum ValidationError {
    #[error("Rune name must be 1-26 uppercase letters or bullets (•), got: '{0}'")]
    InvalidRuneName(String),
    
    #[error("Rune name too short (min 1 char)")]
    RuneNameTooShort,
    
    #[error("Rune name too long (max 26 chars), got {0} chars")]
    RuneNameTooLong(usize),
    
    #[error("Rune symbol must be 1-10 uppercase letters, got: '{0}'")]
    InvalidSymbol(String),
    
    #[error("Divisibility must be 0-38, got: {0}")]
    DivisibilityOutOfRange(u8),
    
    #[error("Total supply must be greater than 0")]
    ZeroTotalSupply,
    
    #[error("Premine ({0}) cannot exceed total supply ({1})")]
    PremineExceedsSupply(u128, u128),
    
    #[error("Amount ({0}) exceeds max safe value ({1})")]
    AmountOverflow(u128, u128),
    
    #[error("Invalid mint terms: {0}")]
    InvalidMintTerms(String),
    
    #[error("Height start ({0}) must be less than height end ({1})")]
    InvalidHeightRange(u64, u64),
    
    #[error("Cap must be greater than 0")]
    ZeroCap,
    
    #[error("Mint amount must be greater than 0")]
    ZeroMintAmount,
}

// ============================================================================
// RUNE NAME VALIDATION
// ============================================================================

/// Valida un nombre de Rune según el protocolo oficial
///
/// ## Reglas del Protocolo Runes
///
/// 1. Longitud: 1-26 caracteres
/// 2. Solo letras MAYÚSCULAS (A-Z)
/// 3. Permite bullets (•) como separadores (spacers)
/// 4. Sin números, símbolos especiales, o espacios
///
/// ## Ejemplos Válidos
///
/// - "BITCOIN"
/// - "UNCOMMON•GOODS"
/// - "THE•BEST•RUNE"
/// - "A" (mínimo 1 char)
/// - "ABCDEFGHIJKLMNOPQRSTUVWXYZ" (máximo 26 chars)
///
/// ## Ejemplos Inválidos
///
/// - "bitcoin" (minúsculas)
/// - "Bitcoin" (mixed case)
/// - "BITCOIN123" (números)
/// - "BITCOIN CASH" (espacios)
/// - "BITCOIN_CASH" (underscores)
/// - "" (vacío)
/// - "TOOLONGNAMEWITHMORETHAN26CHARS" (>26 chars)
pub fn validate_rune_name(name: &str) -> Result<(), ValidationError> {
    // Check length
    if name.is_empty() {
        return Err(ValidationError::RuneNameTooShort);
    }
    
    let char_count = name.chars().count();
    if char_count > 26 {
        return Err(ValidationError::RuneNameTooLong(char_count));
    }
    
    // Check characters
    for c in name.chars() {
        if !c.is_ascii_uppercase() && c != '•' {
            return Err(ValidationError::InvalidRuneName(name.to_string()));
        }
    }
    
    Ok(())
}

/// Valida un símbolo de Rune (ticker)
///
/// ## Reglas
///
/// 1. Longitud: 1-10 caracteres
/// 2. Solo letras MAYÚSCULAS (A-Z)
/// 3. Sin espacios ni símbolos especiales
///
/// ## Ejemplos
///
/// - "BTC" ✅
/// - "RUNE" ✅
/// - "QURI" ✅
/// - "btc" ❌ (minúsculas)
/// - "BTC•SYMBOL" ❌ (bullets no permitidos en símbolos)
pub fn validate_symbol(symbol: &str) -> Result<(), ValidationError> {
    if symbol.is_empty() || symbol.len() > 10 {
        return Err(ValidationError::InvalidSymbol(symbol.to_string()));
    }
    
    for c in symbol.chars() {
        if !c.is_ascii_uppercase() {
            return Err(ValidationError::InvalidSymbol(symbol.to_string()));
        }
    }
    
    Ok(())
}

// ============================================================================
// DIVISIBILITY VALIDATION
// ============================================================================

/// Valida divisibilidad según el protocolo Runes
///
/// ## Límites
///
/// - Mínimo: 0 (enteros, como satoshis)
/// - Máximo: 38 (límite del protocolo Runes)
///
/// ## Ejemplos
///
/// - 0 = enteros (1 rune = 1 unidad)
/// - 8 = como Bitcoin (1 BTC = 100,000,000 satoshis)
/// - 18 = como Ethereum (1 ETH = 1,000,000,000,000,000,000 wei)
/// - 38 = máximo permitido
/// - 39 = INVÁLIDO ❌
pub fn validate_divisibility(divisibility: u8) -> Result<(), ValidationError> {
    if divisibility > 38 {
        return Err(ValidationError::DivisibilityOutOfRange(divisibility));
    }
    Ok(())
}

// ============================================================================
// SUPPLY VALIDATION
// ============================================================================

/// Valida total supply y premine
///
/// ## Invariantes
///
/// 1. total_supply > 0
/// 2. premine <= total_supply
/// 3. No overflow (max u128)
///
/// ## Ejemplo
///
/// ```rust
/// validate_supply(21_000_000, 1_000_000)?; // ✅ OK
/// validate_supply(21_000_000, 22_000_000)?; // ❌ ERROR: premine > supply
/// validate_supply(0, 0)?; // ❌ ERROR: zero supply
/// ```
pub fn validate_supply(total_supply: u128, premine: u128) -> Result<(), ValidationError> {
    // Total supply must be > 0
    if total_supply == 0 {
        return Err(ValidationError::ZeroTotalSupply);
    }
    
    // Premine cannot exceed total supply
    if premine > total_supply {
        return Err(ValidationError::PremineExceedsSupply(premine, total_supply));
    }
    
    Ok(())
}

/// Valida que un amount no cause overflow
///
/// ## Max Safe Value
///
/// Usamos u128::MAX / 2 como límite seguro para prevenir:
/// - Overflow en operaciones aritméticas
/// - Problemas al multiplicar por divisibility
pub fn validate_amount(amount: u128) -> Result<(), ValidationError> {
    const MAX_SAFE: u128 = u128::MAX / 2;
    
    if amount > MAX_SAFE {
        return Err(ValidationError::AmountOverflow(amount, MAX_SAFE));
    }
    
    Ok(())
}

// ============================================================================
// MINT TERMS VALIDATION
// ============================================================================

use crate::MintTerms;

/// Valida mint terms para open minting
///
/// ## Invariantes
///
/// 1. amount > 0
/// 2. cap > 0
/// 3. Si hay height_start y height_end: start < end
/// 4. Si hay offset_start y offset_end: start < end
pub fn validate_mint_terms(terms: &MintTerms) -> Result<(), ValidationError> {
    // Amount must be > 0
    if terms.amount == 0 {
        return Err(ValidationError::ZeroMintAmount);
    }
    
    // Cap must be > 0
    if terms.cap == 0 {
        return Err(ValidationError::ZeroCap);
    }
    
    // Validate height range
    if let (Some(start), Some(end)) = (terms.height_start, terms.height_end) {
        if start >= end {
            return Err(ValidationError::InvalidHeightRange(start, end));
        }
    }
    
    // Validate offset range
    if let (Some(start), Some(end)) = (terms.offset_start, terms.offset_end) {
        if start >= end {
            return Err(ValidationError::InvalidMintTerms(
                format!("Offset start ({}) must be less than offset end ({})", start, end)
            ));
        }
    }
    
    Ok(())
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_valid_rune_names() {
        assert!(validate_rune_name("BITCOIN").is_ok());
        assert!(validate_rune_name("UNCOMMON•GOODS").is_ok());
        assert!(validate_rune_name("THE•BEST•RUNE").is_ok());
        assert!(validate_rune_name("A").is_ok());
        assert!(validate_rune_name("ABCDEFGHIJKLMNOPQRSTUVWXYZ").is_ok());
    }
    
    #[test]
    fn test_invalid_rune_names() {
        assert!(validate_rune_name("").is_err());
        assert!(validate_rune_name("bitcoin").is_err()); // lowercase
        assert!(validate_rune_name("Bitcoin").is_err()); // mixed case
        assert!(validate_rune_name("BITCOIN123").is_err()); // numbers
        assert!(validate_rune_name("BITCOIN CASH").is_err()); // spaces
        assert!(validate_rune_name("BITCOIN_CASH").is_err()); // underscore
        assert!(validate_rune_name("TOOLONGNAMEWITHMORETHAN26CHARS").is_err());
    }
    
    #[test]
    fn test_valid_symbols() {
        assert!(validate_symbol("BTC").is_ok());
        assert!(validate_symbol("RUNE").is_ok());
        assert!(validate_symbol("A").is_ok());
        assert!(validate_symbol("ABCDEFGHIJ").is_ok()); // 10 chars max
    }
    
    #[test]
    fn test_invalid_symbols() {
        assert!(validate_symbol("").is_err());
        assert!(validate_symbol("btc").is_err());
        assert!(validate_symbol("BTC•SYMBOL").is_err());
        assert!(validate_symbol("TOOLONGSYMBOL").is_err()); // >10 chars
    }
    
    #[test]
    fn test_divisibility() {
        assert!(validate_divisibility(0).is_ok());
        assert!(validate_divisibility(8).is_ok());
        assert!(validate_divisibility(18).is_ok());
        assert!(validate_divisibility(38).is_ok());
        assert!(validate_divisibility(39).is_err());
        assert!(validate_divisibility(255).is_err());
    }
    
    #[test]
    fn test_supply() {
        assert!(validate_supply(21_000_000, 1_000_000).is_ok());
        assert!(validate_supply(100, 100).is_ok()); // premine = supply OK
        assert!(validate_supply(0, 0).is_err()); // zero supply
        assert!(validate_supply(100, 101).is_err()); // premine > supply
    }
    
    #[test]
    fn test_amount_overflow() {
        assert!(validate_amount(1_000_000).is_ok());
        assert!(validate_amount(u128::MAX / 2).is_ok());
        assert!(validate_amount(u128::MAX / 2 + 1).is_err());
        assert!(validate_amount(u128::MAX).is_err());
    }
}
