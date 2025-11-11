use crate::errors::{EtchingError, EtchingResult};
use quri_types::RuneEtching;

/// Maximum divisibility allowed (same as Bitcoin's 8 decimals)
const MAX_DIVISIBILITY: u8 = 18;

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

    /// Validate symbol
    fn validate_symbol(symbol: &str) -> EtchingResult<()> {
        if symbol.is_empty() {
            return Err(EtchingError::InvalidSymbol(
                "Symbol cannot be empty".to_string(),
            ));
        }

        if symbol.len() > MAX_SYMBOL_LENGTH {
            return Err(EtchingError::InvalidSymbol(format!(
                "Symbol too long: max {} characters, got {}",
                MAX_SYMBOL_LENGTH,
                symbol.len()
            )));
        }

        // Symbol should be alphanumeric
        if !symbol.chars().all(|c| c.is_alphanumeric()) {
            return Err(EtchingError::InvalidSymbol(
                "Symbol must be alphanumeric".to_string(),
            ));
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
            let total_mintable = (terms.amount as u128)
                .saturating_mul(terms.cap as u128);
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
        assert!(EtchingValidator::validate_divisibility(19).is_err());
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
}
