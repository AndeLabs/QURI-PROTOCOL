use quri_types::QuriError;

pub mod encoding;
pub mod time;
pub mod validation;

/// Validates a Rune name according to the Runes protocol specification
/// Names must be 1-26 characters, only A-Z
pub fn validate_rune_name(name: &str) -> Result<(), QuriError> {
    if name.is_empty() || name.len() > 26 {
        return Err(QuriError::InvalidRuneName(
            "Name must be 1-26 characters".to_string(),
        ));
    }

    if !name.chars().all(|c| c.is_ascii_uppercase()) {
        return Err(QuriError::InvalidRuneName(
            "Name must contain only A-Z characters".to_string(),
        ));
    }

    Ok(())
}

/// Validates divisibility (0-38)
pub fn validate_divisibility(divisibility: u8) -> Result<(), QuriError> {
    if divisibility > 38 {
        return Err(QuriError::InvalidDivisibility);
    }
    Ok(())
}

/// Calculate fee for a Bitcoin transaction based on vsize
pub fn calculate_fee(vsize: u64, fee_rate: u64) -> u64 {
    vsize * fee_rate
}

/// Encode amount with divisibility for display
pub fn format_rune_amount(amount: u64, divisibility: u8) -> String {
    if divisibility == 0 {
        return amount.to_string();
    }

    let divisor = 10u64.pow(divisibility as u32);
    let whole = amount / divisor;
    let fractional = amount % divisor;

    if fractional == 0 {
        whole.to_string()
    } else {
        format!(
            "{}.{:0width$}",
            whole,
            fractional,
            width = divisibility as usize
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_rune_name() {
        assert!(validate_rune_name("BITCOIN").is_ok());
        assert!(validate_rune_name("A").is_ok());
        assert!(validate_rune_name("ABCDEFGHIJKLMNOPQRSTUVWXYZ").is_ok());

        assert!(validate_rune_name("").is_err());
        assert!(validate_rune_name("bitcoin").is_err());
        assert!(validate_rune_name("BITCOIN123").is_err());
        assert!(validate_rune_name("ABCDEFGHIJKLMNOPQRSTUVWXYZA").is_err()); // 27 chars
    }

    #[test]
    fn test_validate_divisibility() {
        assert!(validate_divisibility(0).is_ok());
        assert!(validate_divisibility(8).is_ok());
        assert!(validate_divisibility(38).is_ok());
        assert!(validate_divisibility(39).is_err());
    }

    #[test]
    fn test_format_rune_amount() {
        assert_eq!(format_rune_amount(100, 0), "100");
        assert_eq!(format_rune_amount(100, 2), "1"); // No fractional part, so no decimals shown
        assert_eq!(format_rune_amount(12345, 2), "123.45");
        assert_eq!(format_rune_amount(100000000, 8), "1"); // No fractional part
        assert_eq!(format_rune_amount(100000001, 8), "1.00000001"); // With fractional part
    }

    #[test]
    fn test_calculate_fee() {
        assert_eq!(calculate_fee(250, 10), 2500);
        assert_eq!(calculate_fee(150, 5), 750);
    }
}
