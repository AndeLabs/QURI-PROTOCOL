use crate::{EtchingSpec, Runestone, RunesError, Result, Terms, Edict, RuneId};
use quri_types::RuneEtching;
use quri_utils::encoding::{encode_leb128, decode_leb128};

/// Runestone field tags
#[repr(u128)]
enum Tag {
    Body = 0,
    Divisibility = 1,
    Spacers = 2,
    Symbol = 3,
    Premine = 4,
    Amount = 5,
    Cap = 6,
    HeightStart = 7,
    HeightEnd = 8,
    OffsetStart = 9,
    OffsetEnd = 10,
    Mint = 11,
    Pointer = 12,
    Rune = 13,
}

/// Build runestone for etching
pub fn build_etching_runestone(etching: &RuneEtching) -> Result<Vec<u8>> {
    let mut integers: Vec<u128> = Vec::new();

    // Add divisibility
    if etching.divisibility > 0 {
        integers.push(Tag::Divisibility as u128);
        integers.push(etching.divisibility as u128);
    }

    // Add symbol
    if !etching.symbol.is_empty() {
        integers.push(Tag::Symbol as u128);
        // Take first character as symbol
        if let Some(c) = etching.symbol.chars().next() {
            integers.push(c as u128);
        }
    }

    // Add premine
    if etching.premine > 0 {
        integers.push(Tag::Premine as u128);
        integers.push(etching.premine as u128);
    }

    // Add rune name
    integers.push(Tag::Rune as u128);
    integers.push(encode_rune_name(&etching.rune_name)?);

    // Add mint terms if present
    if let Some(terms) = &etching.terms {
        if terms.amount > 0 {
            integers.push(Tag::Amount as u128);
            integers.push(terms.amount as u128);
        }

        if terms.cap > 0 {
            integers.push(Tag::Cap as u128);
            integers.push(terms.cap as u128);
        }

        if let Some(height_start) = terms.height_start {
            integers.push(Tag::HeightStart as u128);
            integers.push(height_start as u128);
        }

        if let Some(height_end) = terms.height_end {
            integers.push(Tag::HeightEnd as u128);
            integers.push(height_end as u128);
        }

        if let Some(offset_start) = terms.offset_start {
            integers.push(Tag::OffsetStart as u128);
            integers.push(offset_start as u128);
        }

        if let Some(offset_end) = terms.offset_end {
            integers.push(Tag::OffsetEnd as u128);
            integers.push(offset_end as u128);
        }
    }

    // Encode all integers as LEB128
    let mut bytes = Vec::new();
    for integer in integers {
        bytes.extend_from_slice(&encode_leb128(integer));
    }

    Ok(bytes)
}

/// Encode a rune name as an integer
fn encode_rune_name(name: &str) -> Result<u128> {
    let mut value: u128 = 0;

    for c in name.chars() {
        if !c.is_ascii_uppercase() {
            return Err(RunesError::InvalidName(
                "Name must contain only A-Z".to_string(),
            ));
        }

        value = value * 26 + (c as u128 - 'A' as u128 + 1);
    }

    Ok(value - 1)
}

/// Decode a rune name from an integer
fn decode_rune_name(mut value: u128) -> String {
    value += 1;
    let mut name = String::new();

    while value > 0 {
        let remainder = ((value - 1) % 26) as u8;
        name.insert(0, (b'A' + remainder) as char);
        value = (value - 1) / 26;
    }

    name
}

/// Parse a runestone from bytes
pub fn parse_runestone(data: &[u8]) -> Result<Runestone> {
    // Parse LEB128 integers from data
    let integers = parse_leb128_sequence(data)?;

    let mut runestone = Runestone {
        edicts: Vec::new(),
        etching: None,
        mint: None,
        pointer: None,
    };

    // Parse fields
    let mut i = 0;
    while i < integers.len() {
        let tag = integers[i];

        if tag == Tag::Body as u128 {
            // Parse edicts
            break;
        }

        if i + 1 >= integers.len() {
            break;
        }

        let value = integers[i + 1];

        match tag {
            t if t == Tag::Divisibility as u128 => {
                // Handle divisibility
            }
            t if t == Tag::Symbol as u128 => {
                // Handle symbol
            }
            t if t == Tag::Premine as u128 => {
                // Handle premine
            }
            _ => {}
        }

        i += 2;
    }

    Ok(runestone)
}

fn parse_leb128_sequence(data: &[u8]) -> Result<Vec<u128>> {
    let mut integers = Vec::new();
    let mut offset = 0;

    while offset < data.len() {
        let mut value: u128 = 0;
        let mut shift = 0;
        let mut consumed = 0;

        while offset + consumed < data.len() {
            let byte = data[offset + consumed];
            consumed += 1;

            value |= ((byte & 0x7F) as u128) << shift;
            shift += 7;

            if byte & 0x80 == 0 {
                break;
            }
        }

        integers.push(value);
        offset += consumed;
    }

    Ok(integers)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_rune_name() {
        assert_eq!(encode_rune_name("A").unwrap(), 0);
        assert_eq!(encode_rune_name("Z").unwrap(), 25);
        assert_eq!(decode_rune_name(0), "A");
        assert_eq!(decode_rune_name(25), "Z");
    }

    #[test]
    fn test_encode_decode_rune_name() {
        let names = vec!["A", "Z", "AA", "BITCOIN", "UNCOMMONGOODS"];
        for name in names {
            let encoded = encode_rune_name(name).unwrap();
            let decoded = decode_rune_name(encoded);
            assert_eq!(name, decoded);
        }
    }
}
