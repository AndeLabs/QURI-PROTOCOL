use crate::{validate_divisibility, validate_rune_name};
use quri_types::{QuriError, RuneConfig};

/// Comprehensive validation for Rune configuration
pub fn validate_rune_config(config: &RuneConfig) -> Result<(), QuriError> {
    // Validate name
    validate_rune_name(&config.name)?;

    // Validate divisibility
    validate_divisibility(config.divisibility)?;

    // Validate supply
    if config.total_supply == 0 {
        return Err(QuriError::InvalidRuneName(
            "Total supply must be greater than 0".to_string(),
        ));
    }

    if config.premine > config.total_supply {
        return Err(QuriError::InvalidRuneName(
            "Premine cannot exceed total supply".to_string(),
        ));
    }

    // Validate mint terms if present
    if let Some(terms) = &config.terms {
        validate_mint_terms(terms, config.total_supply - config.premine)?;
    }

    Ok(())
}

/// Validate mint terms
fn validate_mint_terms(
    terms: &quri_types::MintTerms,
    remaining_supply: u64,
) -> Result<(), QuriError> {
    if terms.amount == 0 {
        return Err(QuriError::InvalidRuneName(
            "Mint amount must be greater than 0".to_string(),
        ));
    }

    if terms.cap == 0 {
        return Err(QuriError::InvalidRuneName(
            "Mint cap must be greater than 0".to_string(),
        ));
    }

    // Total mintable amount should not exceed remaining supply
    let total_mintable = terms.amount.saturating_mul(terms.cap);
    if total_mintable > remaining_supply {
        return Err(QuriError::InvalidRuneName(
            "Total mintable amount exceeds remaining supply".to_string(),
        ));
    }

    // Validate height ranges
    if let (Some(start), Some(end)) = (terms.height_start, terms.height_end) {
        if start >= end {
            return Err(QuriError::InvalidRuneName(
                "Height start must be less than height end".to_string(),
            ));
        }
    }

    // Validate offset ranges
    if let (Some(start), Some(end)) = (terms.offset_start, terms.offset_end) {
        if start >= end {
            return Err(QuriError::InvalidRuneName(
                "Offset start must be less than offset end".to_string(),
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use quri_types::{MintTerms, RuneConfig};

    #[test]
    fn test_valid_rune_config() {
        let config = RuneConfig {
            name: "TESTCOIN".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            total_supply: 1_000_000,
            premine: 100_000,
            terms: None,
        };

        assert!(validate_rune_config(&config).is_ok());
    }

    #[test]
    fn test_invalid_premine() {
        let config = RuneConfig {
            name: "TESTCOIN".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            total_supply: 1_000_000,
            premine: 2_000_000, // Exceeds total supply
            terms: None,
        };

        assert!(validate_rune_config(&config).is_err());
    }

    #[test]
    fn test_valid_mint_terms() {
        let config = RuneConfig {
            name: "TESTCOIN".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            total_supply: 1_000_000,
            premine: 100_000,
            terms: Some(MintTerms {
                amount: 1000,
                cap: 900,
                height_start: Some(100),
                height_end: Some(200),
                offset_start: None,
                offset_end: None,
            }),
        };

        assert!(validate_rune_config(&config).is_ok());
    }
}
