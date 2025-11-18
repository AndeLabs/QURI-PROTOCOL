/// Convert nanoseconds (ICP time) to seconds
pub fn nanos_to_seconds(nanos: u64) -> u64 {
    nanos / 1_000_000_000
}

/// Convert seconds to nanoseconds (ICP time)
pub fn seconds_to_nanos(seconds: u64) -> u64 {
    seconds * 1_000_000_000
}

/// Check if a timestamp has expired
pub fn is_expired(expires_at: u64, current_time: u64) -> bool {
    current_time >= expires_at
}

/// Calculate expiry time from duration in seconds
pub fn calculate_expiry(current_time: u64, duration_seconds: u64) -> u64 {
    current_time + seconds_to_nanos(duration_seconds)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nanos_conversion() {
        assert_eq!(nanos_to_seconds(1_000_000_000), 1);
        assert_eq!(nanos_to_seconds(5_000_000_000), 5);
        assert_eq!(seconds_to_nanos(1), 1_000_000_000);
        assert_eq!(seconds_to_nanos(5), 5_000_000_000);
    }

    #[test]
    fn test_expiry() {
        let current = 1_000_000_000;
        let expiry = calculate_expiry(current, 3600); // 1 hour
        assert_eq!(expiry, current + 3_600_000_000_000);
        assert!(!is_expired(expiry, current));
        assert!(is_expired(expiry, expiry + 1));
    }
}
