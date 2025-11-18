/// Encode a number as LEB128 (Little Endian Base 128)
/// Used in Runes protocol for efficient integer encoding
pub fn encode_leb128(mut value: u128) -> Vec<u8> {
    let mut bytes = Vec::new();

    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;

        if value != 0 {
            byte |= 0x80;
        }

        bytes.push(byte);

        if value == 0 {
            break;
        }
    }

    bytes
}

/// Decode LEB128 encoded bytes
pub fn decode_leb128(bytes: &[u8]) -> Result<u128, String> {
    let mut result: u128 = 0;
    let mut shift = 0;

    for &byte in bytes {
        if shift >= 128 {
            return Err("LEB128 value too large".to_string());
        }

        result |= ((byte & 0x7F) as u128) << shift;
        shift += 7;

        if byte & 0x80 == 0 {
            return Ok(result);
        }
    }

    Err("Incomplete LEB128 encoding".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_leb128() {
        let test_values = vec![0, 1, 127, 128, 255, 16384, 1_000_000];

        for value in test_values {
            let encoded = encode_leb128(value);
            let decoded = decode_leb128(&encoded).unwrap();
            assert_eq!(value, decoded);
        }
    }

    #[test]
    fn test_leb128_single_byte() {
        assert_eq!(encode_leb128(0), vec![0]);
        assert_eq!(encode_leb128(1), vec![1]);
        assert_eq!(encode_leb128(127), vec![127]);
    }

    #[test]
    fn test_leb128_multi_byte() {
        assert_eq!(encode_leb128(128), vec![0x80, 0x01]);
        assert_eq!(encode_leb128(255), vec![0xFF, 0x01]);
        assert_eq!(encode_leb128(16384), vec![0x80, 0x80, 0x01]);
    }
}
