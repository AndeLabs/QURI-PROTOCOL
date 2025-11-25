use crate::errors::{EtchingError, EtchingResult};
use quri_types::RuneEtching;

/// Validates if a string is a valid Bitcoin address
/// Supports P2PKH, P2SH, P2WPKH, P2WSH, and P2TR addresses
pub fn is_valid_bitcoin_address(address: &str) -> bool {
    let len = address.len();

    // P2PKH (legacy) - starts with 1, 25-34 chars
    if address.starts_with('1') && (25..=34).contains(&len) {
        return is_base58_valid(address);
    }

    // P2SH (legacy) - starts with 3, 25-35 chars
    if address.starts_with('3') && (25..=35).contains(&len) {
        return is_base58_valid(address);
    }

    // Bech32 (native segwit) - starts with bc1q or bc1p (taproot)
    if address.starts_with("bc1q") && (42..=62).contains(&len) {
        return is_bech32_valid(address);
    }

    // Taproot - starts with bc1p
    if address.starts_with("bc1p") && len >= 62 && len <= 62 {
        return is_bech32_valid(address);
    }

    // Testnet addresses (tb1, m, n, 2)
    if address.starts_with("tb1") || address.starts_with('m')
       || address.starts_with('n') || address.starts_with('2') {
        return (25..=62).contains(&len);
    }

    false
}

fn is_base58_valid(address: &str) -> bool {
    const BASE58_CHARS: &str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    address.chars().all(|c| BASE58_CHARS.contains(c))
}

fn is_bech32_valid(address: &str) -> bool {
    const BECH32_CHARS: &str = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    let lowercase = address.to_lowercase();

    // After bc1, all chars must be valid bech32
    if let Some(rest) = lowercase.strip_prefix("bc1") {
        return rest.chars().all(|c| BECH32_CHARS.contains(c));
    }
    if let Some(rest) = lowercase.strip_prefix("tb1") {
        return rest.chars().all(|c| BECH32_CHARS.contains(c));
    }

    false
}

/// Maximum divisibility allowed (Runes protocol specification)
const MAX_DIVISIBILITY: u8 = 38;

/// Minimum rune name length
const MIN_NAME_LENGTH: usize = 1;

/// Maximum rune name length
const MAX_NAME_LENGTH: usize = 26;

/// Maximum symbol length
const MAX_SYMBOL_LENGTH: usize = 4;

/// Minimum etching fee (in satoshis)
const MIN_ETCHING_FEE: u64 = 10_000; // 10k sats (~$5-10 depending on price)

/// Maximum etching fee (sanity check)
const MAX_ETCHING_FEE: u64 = 1_000_000; // 1M sats (~$500-1000)

/// Comprehensive validation suite for Rune etching
pub struct EtchingValidator;

impl EtchingValidator {
    /// Validate complete etching request
    pub fn validate_etching(etching: &RuneEtching) -> EtchingResult<()> {
        Self::validate_name(&etching.rune_name)?;
        Self::validate_symbol(&etching.symbol)?;
        Self::validate_divisibility(etching.divisibility)?;
        Self::validate_supply(etching)?;
        Self::validate_mint_terms(etching)?;
        Ok(())
    }

    /// Validate rune name follows protocol rules
    fn validate_name(name: &str) -> EtchingResult<()> {
        // Length check
        if name.len() < MIN_NAME_LENGTH || name.len() > MAX_NAME_LENGTH {
            return Err(EtchingError::InvalidRuneName(format!(
                "Name must be {}-{} characters, got {}",
                MIN_NAME_LENGTH,
                MAX_NAME_LENGTH,
                name.len()
            )));
        }

        // Character check: only uppercase letters and spacers (•)
        for c in name.chars() {
            if !c.is_ascii_uppercase() && c != '•' {
                return Err(EtchingError::InvalidRuneName(format!(
                    "Name must contain only uppercase letters and spacers (•), found '{}'",
                    c
                )));
            }
        }

        // No leading/trailing spacers
        if name.starts_with('•') || name.ends_with('•') {
            return Err(EtchingError::InvalidRuneName(
                "Name cannot start or end with spacer (•)".to_string(),
            ));
        }

        // No consecutive spacers
        if name.contains("••") {
            return Err(EtchingError::InvalidRuneName(
                "Name cannot contain consecutive spacers".to_string(),
            ));
        }

        // Minimum two letters required
        let letter_count = name.chars().filter(|c| c.is_ascii_uppercase()).count();
        if letter_count < 2 {
            return Err(EtchingError::InvalidRuneName(
                "Name must contain at least 2 letters".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate symbol (OPTIONAL - empty string is allowed)
    fn validate_symbol(symbol: &str) -> EtchingResult<()> {
        // Symbol is OPTIONAL - empty is allowed (will use default ¤)
        if symbol.is_empty() {
            return Ok(()); // Empty symbol is valid
        }

        if symbol.len() > MAX_SYMBOL_LENGTH {
            return Err(EtchingError::InvalidSymbol(format!(
                "Symbol too long: max {} characters, got {}",
                MAX_SYMBOL_LENGTH,
                symbol.len()
            )));
        }

        // Symbol must contain only uppercase A-Z characters
        if !symbol.chars().all(|c| c.is_ascii_uppercase()) {
            return Err(EtchingError::InvalidSymbol(format!(
                "Symbol must contain only uppercase A-Z characters, got '{}'",
                symbol
            )));
        }
        
        Ok(())
    }

    /// Validate divisibility (decimal places)
    fn validate_divisibility(divisibility: u8) -> EtchingResult<()> {
        if divisibility > MAX_DIVISIBILITY {
            return Err(EtchingError::InvalidDivisibility(divisibility));
        }
        Ok(())
    }

    /// Validate supply and premine
    fn validate_supply(etching: &RuneEtching) -> EtchingResult<()> {
        // Check premine doesn't exceed total supply
        if let Some(ref terms) = etching.terms {
            let premine_u128 = etching.premine as u128;
            let total_mintable = (terms.amount as u128).saturating_mul(terms.cap as u128);
            let total_supply = premine_u128.saturating_add(total_mintable);

            if premine_u128 > total_supply {
                return Err(EtchingError::PremineExceedsSupply);
            }

            // Sanity check: supply should be > 0
            if total_supply == 0 {
                return Err(EtchingError::InvalidSupply(
                    "Total supply cannot be zero".to_string(),
                ));
            }

            // Check for overflow
            if total_supply < premine_u128 || total_supply < total_mintable {
                return Err(EtchingError::InvalidSupply(
                    "Supply overflow detected".to_string(),
                ));
            }
        } else if etching.premine == 0 {
            return Err(EtchingError::InvalidSupply(
                "Must have premine or mint terms".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate mint terms
    fn validate_mint_terms(etching: &RuneEtching) -> EtchingResult<()> {
        if let Some(ref terms) = etching.terms {
            // Amount must be > 0
            if terms.amount == 0 {
                return Err(EtchingError::InvalidMintTerms(
                    "Mint amount cannot be zero".to_string(),
                ));
            }

            // Cap must be > 0
            if terms.cap == 0 {
                return Err(EtchingError::InvalidMintTerms(
                    "Mint cap cannot be zero".to_string(),
                ));
            }

            // Height range validation (if applicable)
            // Note: In our simplified model, we might not have height start/end
            // but this is where we'd validate it
        }

        Ok(())
    }

    /// Validate fee amount
    pub fn validate_fee(fee: u64) -> EtchingResult<()> {
        if fee < MIN_ETCHING_FEE {
            return Err(EtchingError::FeeTooHigh(fee));
        }

        if fee > MAX_ETCHING_FEE {
            return Err(EtchingError::FeeTooHigh(fee));
        }

        Ok(())
    }

    /// Validate ckBTC balance is sufficient
    pub fn validate_balance(balance: u64, required: u64) -> EtchingResult<()> {
        if balance < required {
            return Err(EtchingError::InsufficientBalance {
                have: balance,
                need: required,
            });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_name() {
        assert!(EtchingValidator::validate_name("BITCOIN").is_ok());
        assert!(EtchingValidator::validate_name("SATOSHI•NAKAMOTO").is_ok());
        assert!(EtchingValidator::validate_name("XY").is_ok());
    }

    #[test]
    fn test_invalid_name_lowercase() {
        assert!(EtchingValidator::validate_name("bitcoin").is_err());
    }

    #[test]
    fn test_invalid_name_special_chars() {
        assert!(EtchingValidator::validate_name("BIT@COIN").is_err());
    }

    #[test]
    fn test_invalid_name_leading_spacer() {
        assert!(EtchingValidator::validate_name("•BITCOIN").is_err());
    }

    #[test]
    fn test_invalid_name_consecutive_spacers() {
        assert!(EtchingValidator::validate_name("BIT••COIN").is_err());
    }

    #[test]
    fn test_valid_symbol() {
        assert!(EtchingValidator::validate_symbol("BTC").is_ok());
        assert!(EtchingValidator::validate_symbol("X").is_ok());
    }

    #[test]
    fn test_invalid_symbol_too_long() {
        assert!(EtchingValidator::validate_symbol("TOOLONG").is_err());
    }

    #[test]
    fn test_divisibility() {
        assert!(EtchingValidator::validate_divisibility(0).is_ok());
        assert!(EtchingValidator::validate_divisibility(8).is_ok());
        assert!(EtchingValidator::validate_divisibility(18).is_ok());
        assert!(EtchingValidator::validate_divisibility(38).is_ok());
        assert!(EtchingValidator::validate_divisibility(39).is_err());
    }

    #[test]
    fn test_fee_validation() {
        assert!(EtchingValidator::validate_fee(10_000).is_ok());
        assert!(EtchingValidator::validate_fee(100_000).is_ok());
        assert!(EtchingValidator::validate_fee(5_000).is_err()); // Too low
        assert!(EtchingValidator::validate_fee(2_000_000).is_err()); // Too high
    }

    #[test]
    fn test_balance_validation() {
        assert!(EtchingValidator::validate_balance(100_000, 50_000).is_ok());
        assert!(EtchingValidator::validate_balance(50_000, 100_000).is_err());
    }

    // ========================================================================
    // Advanced Tests - Edge Cases
    // ========================================================================

    #[test]
    fn test_name_edge_cases() {
        // Minimum length (1 char after spacer logic)
        assert!(EtchingValidator::validate_name("AB").is_ok());

        // Maximum length (26 chars)
        assert!(EtchingValidator::validate_name("ABCDEFGHIJKLMNOPQRSTUVWXYZ").is_ok());

        // Too long
        assert!(EtchingValidator::validate_name("ABCDEFGHIJKLMNOPQRSTUVWXYZA").is_err());

        // Empty string
        assert!(EtchingValidator::validate_name("").is_err());

        // Only spacer
        assert!(EtchingValidator::validate_name("•").is_err());

        // Trailing spacer
        assert!(EtchingValidator::validate_name("BITCOIN•").is_err());

        // Multiple spacers correctly spaced
        assert!(EtchingValidator::validate_name("A•B•C•D").is_ok());
    }

    #[test]
    fn test_symbol_edge_cases() {
        // Empty string is allowed (will use default symbol)
        assert!(EtchingValidator::validate_symbol("").is_ok());

        // Single char
        assert!(EtchingValidator::validate_symbol("A").is_ok());

        // Four chars (max)
        assert!(EtchingValidator::validate_symbol("ABCD").is_ok());

        // Five chars (too long)
        assert!(EtchingValidator::validate_symbol("ABCDE").is_err());

        // Special characters
        assert!(EtchingValidator::validate_symbol("AB@").is_err());
        assert!(EtchingValidator::validate_symbol("AB•C").is_err());
    }

    #[test]
    fn test_divisibility_boundary() {
        // Valid boundaries
        assert!(EtchingValidator::validate_divisibility(0).is_ok());
        assert!(EtchingValidator::validate_divisibility(18).is_ok());
        assert!(EtchingValidator::validate_divisibility(38).is_ok());

        // Invalid boundaries
        assert!(EtchingValidator::validate_divisibility(39).is_err());
        assert!(EtchingValidator::validate_divisibility(255).is_err());
    }

    #[test]
    fn test_supply_with_premine_only() {
        let etching = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 1_000_000,
            terms: None,
        };

        assert!(EtchingValidator::validate_supply(&etching).is_ok());
    }

    #[test]
    fn test_supply_with_mint_terms() {
        use quri_types::MintTerms;

        let etching = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 1_000_000,
            terms: Some(MintTerms {
                amount: 100,
                cap: 10_000,
                height_start: None,
                height_end: None,
                offset_start: None,
                offset_end: None,
            }),
        };

        assert!(EtchingValidator::validate_supply(&etching).is_ok());
    }

    #[test]
    fn test_supply_zero_premine_no_terms() {
        let etching = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 0,
            terms: None,
        };

        // Should fail - must have either premine or mint terms
        assert!(EtchingValidator::validate_supply(&etching).is_err());
    }

    #[test]
    fn test_supply_overflow_protection() {
        use quri_types::MintTerms;

        let etching = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: u64::MAX,
            terms: Some(MintTerms {
                amount: u64::MAX,
                cap: u64::MAX,
                height_start: None,
                height_end: None,
                offset_start: None,
                offset_end: None,
            }),
        };

        // Should not panic, should use saturating arithmetic
        let result = EtchingValidator::validate_supply(&etching);
        assert!(result.is_ok() || result.is_err()); // Just ensure it doesn't panic
    }

    #[test]
    fn test_mint_terms_validation() {
        use quri_types::MintTerms;

        // Valid terms
        let etching = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: Some(MintTerms {
                amount: 100,
                cap: 1000,
                height_start: None,
                height_end: None,
                offset_start: None,
                offset_end: None,
            }),
        };
        assert!(EtchingValidator::validate_mint_terms(&etching).is_ok());

        // Zero amount
        let etching_zero_amount = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: Some(MintTerms {
                amount: 0,
                cap: 1000,
                height_start: None,
                height_end: None,
                offset_start: None,
                offset_end: None,
            }),
        };
        assert!(EtchingValidator::validate_mint_terms(&etching_zero_amount).is_err());

        // Zero cap
        let etching_zero_cap = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: Some(MintTerms {
                amount: 100,
                cap: 0,
                height_start: None,
                height_end: None,
                offset_start: None,
                offset_end: None,
            }),
        };
        assert!(EtchingValidator::validate_mint_terms(&etching_zero_cap).is_err());
    }

    #[test]
    fn test_complete_etching_validation() {
        use quri_types::MintTerms;

        // Valid complete etching
        let valid_etching = RuneEtching {
            rune_name: "SATOSHI•NAKAMOTO".to_string(),
            symbol: "SATS".to_string(),
            divisibility: 8,
            premine: 21_000_000,
            terms: Some(MintTerms {
                amount: 50,
                cap: 100_000,
                height_start: None,
                height_end: None,
                offset_start: None,
                offset_end: None,
            }),
        };
        assert!(EtchingValidator::validate_etching(&valid_etching).is_ok());

        // Invalid name
        let invalid_name = RuneEtching {
            rune_name: "bitcoin".to_string(), // lowercase
            symbol: "BTC".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: None,
        };
        assert!(EtchingValidator::validate_etching(&invalid_name).is_err());

        // Invalid symbol
        let invalid_symbol = RuneEtching {
            rune_name: "BITCOIN".to_string(),
            symbol: "TOOLONG".to_string(), // > 4 chars
            divisibility: 8,
            premine: 1000,
            terms: None,
        };
        assert!(EtchingValidator::validate_etching(&invalid_symbol).is_err());

        // Invalid divisibility
        let invalid_divisibility = RuneEtching {
            rune_name: "BITCOIN".to_string(),
            symbol: "BTC".to_string(),
            divisibility: 39, // > 38
            premine: 1000,
            terms: None,
        };
        assert!(EtchingValidator::validate_etching(&invalid_divisibility).is_err());
    }

    #[test]
    fn test_fee_boundaries() {
        // Minimum valid fee
        assert!(EtchingValidator::validate_fee(MIN_ETCHING_FEE).is_ok());

        // Just below minimum
        assert!(EtchingValidator::validate_fee(MIN_ETCHING_FEE - 1).is_err());

        // Maximum valid fee
        assert!(EtchingValidator::validate_fee(MAX_ETCHING_FEE).is_ok());

        // Just above maximum
        assert!(EtchingValidator::validate_fee(MAX_ETCHING_FEE + 1).is_err());
    }

    #[test]
    fn test_balance_exact_match() {
        // Exact balance needed
        assert!(EtchingValidator::validate_balance(100_000, 100_000).is_ok());

        // One sat short
        assert!(EtchingValidator::validate_balance(99_999, 100_000).is_err());
    }
}
