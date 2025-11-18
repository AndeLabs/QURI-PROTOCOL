use crate::{Result, RunesError};
use quri_types::RuneEtching;

/// Validate an etching configuration
pub fn validate_etching(etching: &RuneEtching) -> Result<()> {
    // Validate name
    if etching.rune_name.is_empty() || etching.rune_name.len() > 26 {
        return Err(RunesError::InvalidName(
            "Name must be 1-26 characters".to_string(),
        ));
    }

    if !etching.rune_name.chars().all(|c| c.is_ascii_uppercase()) {
        return Err(RunesError::InvalidName(
            "Name must contain only A-Z".to_string(),
        ));
    }

    // Validate divisibility
    if etching.divisibility > 38 {
        return Err(RunesError::InvalidName(
            "Divisibility must be 0-38".to_string(),
        ));
    }

    Ok(())
}

/// Estimate the size of an etching transaction
pub fn estimate_etching_size(etching: &RuneEtching) -> usize {
    // Base transaction size
    let mut size = 10; // Version, locktime, etc.

    // Input size (assume 1 P2TR input)
    size += 68;

    // OP_RETURN output with runestone
    let runestone_size = estimate_runestone_size(etching);
    size += 8 + runestone_size; // Amount + script

    // Change output (P2TR)
    size += 43;

    size
}

fn estimate_runestone_size(etching: &RuneEtching) -> usize {
    let mut size = 3; // OP_RETURN + OP_13 + length

    // Divisibility (if > 0): tag + value
    if etching.divisibility > 0 {
        size += 2;
    }

    // Symbol (if present): tag + value
    if !etching.symbol.is_empty() {
        size += 2;
    }

    // Premine (if > 0): tag + value (variable)
    if etching.premine > 0 {
        size += 1 + leb128_size(etching.premine as u128);
    }

    // Rune name: tag + encoded value
    size += 1 + leb128_size(encode_name_estimate(&etching.rune_name));

    // Mint terms
    if etching.terms.is_some() {
        size += 20; // Rough estimate for all term fields
    }

    size
}

fn leb128_size(value: u128) -> usize {
    if value == 0 {
        return 1;
    }

    let mut size = 0;
    let mut v = value;
    while v > 0 {
        size += 1;
        v >>= 7;
    }
    size
}

fn encode_name_estimate(name: &str) -> u128 {
    // Rough estimate
    name.len() as u128 * 26
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_etching() {
        let valid = RuneEtching {
            rune_name: "TESTCOIN".to_string(),
            symbol: "T".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: None,
        };

        assert!(validate_etching(&valid).is_ok());

        let invalid_name = RuneEtching {
            rune_name: "testcoin".to_string(),
            symbol: "T".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: None,
        };

        assert!(validate_etching(&invalid_name).is_err());
    }

    #[test]
    fn test_estimate_etching_size() {
        let etching = RuneEtching {
            rune_name: "TEST".to_string(),
            symbol: "T".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: None,
        };

        let size = estimate_etching_size(&etching);
        assert!(size > 0);
        assert!(size < 1000); // Reasonable upper bound
    }
}
