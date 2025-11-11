// 🎓 LECCIÓN: Imports y Módulos
// Importamos Tag desde crate (el root del package runes-utils)
// porque lo re-exportamos en lib.rs con `pub use tag::Tag;`
use crate::{Runestone, RunesError, Result, Tag};
use quri_types::RuneEtching;
use quri_utils::encoding::encode_leb128;

/// Build runestone for etching
pub fn build_etching_runestone(etching: &RuneEtching) -> Result<Vec<u8>> {
    let mut integers: Vec<u128> = Vec::new();

    // 🎓 CONCEPTO: Encoding de tags
    // Cada campo se codifica como: [tag, value]
    // Ejemplo: divisibility=8 → [1, 8]

    // Add divisibility
    if etching.divisibility > 0 {
        integers.push(Tag::Divisibility.as_u128());  // ✅ Usar método
        integers.push(etching.divisibility as u128);
    }

    // Add symbol
    if !etching.symbol.is_empty() {
        integers.push(Tag::Symbol.as_u128());
        // Take first character as symbol
        if let Some(c) = etching.symbol.chars().next() {
            integers.push(c as u128);
        }
    }

    // Add premine
    if etching.premine > 0 {
        integers.push(Tag::Premine.as_u128());
        integers.push(etching.premine as u128);
    }

    // Add rune name
    integers.push(Tag::Rune.as_u128());
    integers.push(encode_rune_name(&etching.rune_name)?);

    // Add mint terms if present
    if let Some(terms) = &etching.terms {
        if terms.amount > 0 {
            integers.push(Tag::Amount.as_u128());
            integers.push(terms.amount as u128);
        }

        if terms.cap > 0 {
            integers.push(Tag::Cap.as_u128());
            integers.push(terms.cap as u128);
        }

        if let Some(height_start) = terms.height_start {
            integers.push(Tag::HeightStart.as_u128());
            integers.push(height_start as u128);
        }

        if let Some(height_end) = terms.height_end {
            integers.push(Tag::HeightEnd.as_u128());
            integers.push(height_end as u128);
        }

        if let Some(offset_start) = terms.offset_start {
            integers.push(Tag::OffsetStart.as_u128());
            integers.push(offset_start as u128);
        }

        if let Some(offset_end) = terms.offset_end {
            integers.push(Tag::OffsetEnd.as_u128());
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
#[allow(dead_code)]
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

    let runestone = Runestone {
        edicts: Vec::new(),
        etching: None,
        mint: None,
        pointer: None,
    };

    // Parse fields
    let mut i = 0;
    // 🎓 CONCEPTO: Parsing de runestone
    // Leemos pares [tag, value] hasta encontrar Body (0)
    while i < integers.len() {
        let tag_value = integers[i];

        // Body marca el inicio de edicts (transferencias)
        if tag_value == Tag::Body.as_u128() {
            break;
        }

        if i + 1 >= integers.len() {
            break;
        }

        let _value = integers[i + 1];

        // Convertir el u128 a Tag si es válido
        if let Some(tag) = Tag::from_u128(tag_value) {
            match tag {
                Tag::Divisibility => {
                    // Handle divisibility
                }
                Tag::Symbol => {
                    // Handle symbol
                }
                Tag::Premine => {
                    // Handle premine
                }
                _ => {}
            }
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
