/*!
 * Unit Tests para Validation Module - Simplified
 */

#[cfg(test)]
mod tests {
    use crate::validation::*;

    // ========================================================================
    // TESTS: validate_rune_name
    // ========================================================================

    #[test]
    fn test_validate_rune_name_valid() {
        assert!(validate_rune_name("BITCOIN").is_ok());
        assert!(validate_rune_name("A").is_ok());
        assert!(validate_rune_name("ABCDEFGHIJKLMNOPQRSTUVWXYZ").is_ok()); // 26 chars
    }

    #[test]
    fn test_validate_rune_name_with_bullet() {
        assert!(validate_rune_name("BITCOIN•CASH").is_ok());
        assert!(validate_rune_name("A•B•C").is_ok());
    }

    #[test]
    fn test_validate_rune_name_empty() {
        let result = validate_rune_name("");
        assert!(matches!(result, Err(ValidationError::RuneNameTooShort)));
    }

    #[test]
    fn test_validate_rune_name_too_long() {
        let name = "ABCDEFGHIJKLMNOPQRSTUVWXYZA"; // 27 chars
        let result = validate_rune_name(name);
        assert!(matches!(result, Err(ValidationError::RuneNameTooLong(_))));
    }

    #[test]
    fn test_validate_rune_name_lowercase() {
        let result = validate_rune_name("bitcoin");
        assert!(matches!(result, Err(ValidationError::InvalidRuneName(_))));
    }

    #[test]
    fn test_validate_rune_name_numbers() {
        let result = validate_rune_name("BITCOIN123");
        assert!(matches!(result, Err(ValidationError::InvalidRuneName(_))));
    }

    // ========================================================================
    // TESTS: validate_symbol  
    // ========================================================================

    #[test]
    fn test_validate_symbol_valid() {
        assert!(validate_symbol("BTC").is_ok());
        assert!(validate_symbol("A").is_ok());
        assert!(validate_symbol("ABCDEFGHIJ").is_ok()); // 10 chars
    }

    #[test]
    fn test_validate_symbol_empty() {
        let result = validate_symbol("");
        assert!(matches!(result, Err(ValidationError::InvalidSymbol(_))));
    }

    #[test]
    fn test_validate_symbol_too_long() {
        let result = validate_symbol("ABCDEFGHIJK"); // 11 chars
        assert!(matches!(result, Err(ValidationError::InvalidSymbol(_))));
    }

    #[test]
    fn test_validate_symbol_lowercase() {
        let result = validate_symbol("btc");
        assert!(matches!(result, Err(ValidationError::InvalidSymbol(_))));
    }

    // ========================================================================
    // TESTS: validate_divisibility
    // ========================================================================

    #[test]
    fn test_validate_divisibility_valid() {
        assert!(validate_divisibility(0).is_ok());
        assert!(validate_divisibility(8).is_ok());
        assert!(validate_divisibility(18).is_ok());
        assert!(validate_divisibility(38).is_ok()); // max
    }

    #[test]
    fn test_validate_divisibility_too_high() {
        let result = validate_divisibility(39);
        assert!(matches!(result, Err(ValidationError::DivisibilityOutOfRange(39))));
        
        let result = validate_divisibility(100);
        assert!(matches!(result, Err(ValidationError::DivisibilityOutOfRange(100))));
    }

    // ========================================================================
    // TESTS: validate_supply
    // ========================================================================

    #[test]
    fn test_validate_supply_valid() {
        assert!(validate_supply(100, 0).is_ok());
        assert!(validate_supply(100, 50).is_ok());
        assert!(validate_supply(100, 100).is_ok()); // premine = total is ok
        assert!(validate_supply(u128::MAX, 0).is_ok());
    }

    #[test]
    fn test_validate_supply_zero_total() {
        let result = validate_supply(0, 0);
        assert!(matches!(result, Err(ValidationError::ZeroTotalSupply)));
    }

    #[test]
    fn test_validate_supply_premine_exceeds() {
        let result = validate_supply(100, 101);
        assert!(matches!(result, Err(ValidationError::PremineExceedsSupply(101, 100))));
    }

    // ========================================================================
    // TESTS: validate_amount (if function exists - skip if not)
    // ========================================================================

    // Note: validate_amount may not exist in current version
    // Skipping for now

    // ========================================================================
    // TESTS: Edge Cases
    // ========================================================================

    #[test]
    fn test_rune_name_exactly_26_chars() {
        let name = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"; // Exactly 26
        assert_eq!(name.chars().count(), 26);
        assert!(validate_rune_name(name).is_ok());
    }

    #[test]
    fn test_max_supply_values() {
        assert!(validate_supply(u128::MAX, 0).is_ok());
        assert!(validate_supply(u128::MAX, u128::MAX).is_ok());
    }

    #[test]
    fn test_all_bullets() {
        assert!(validate_rune_name("•••").is_ok());
        assert!(validate_rune_name("A•B•C•D").is_ok());
    }

    #[test]
    fn test_mixed_case_fails() {
        assert!(validate_rune_name("Bitcoin").is_err());
        assert!(validate_rune_name("BitCoin").is_err());
        assert!(validate_rune_name("BITCOIN").is_ok());
    }
}

// ========================================================================
// INTEGRATION TESTS
// ========================================================================

#[cfg(test)]
mod integration_tests {
    use crate::validation::*;

    #[test]
    fn test_bitcoin_rune_parameters() {
        // Simular parámetros del rune BITCOIN real
        assert!(validate_rune_name("BITCOIN").is_ok());
        assert!(validate_symbol("BTC").is_ok());
        assert!(validate_divisibility(8).is_ok());
        assert!(validate_supply(21_000_000_000_000_000, 0).is_ok()); // 21M BTC con 8 decimales
    }

    #[test]
    fn test_typical_token_parameters() {
        assert!(validate_rune_name("MYTOKEN").is_ok());
        assert!(validate_symbol("MTK").is_ok());
        assert!(validate_divisibility(18).is_ok()); // ERC-20 style
        assert!(validate_supply(1_000_000_000_000_000_000_000_000, 0).is_ok()); // 1M tokens con 18 decimales
    }
}
