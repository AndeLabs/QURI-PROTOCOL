/*!
 * Unit Tests para RuneKey
 * 
 * Cobertura completa de:
 * - Creación y validación
 * - Serialización/Deserialización
 * - Storable implementation
 * - Ordenamiento
 * - Edge cases
 */

#[cfg(test)]
mod tests {
    use crate::RuneKey;
    use ic_stable_structures::Storable;
    use std::cmp::Ordering;

    // ========================================================================
    // TESTS BÁSICOS
    // ========================================================================

    #[test]
    fn test_rune_key_creation() {
        let key = RuneKey::new(840000, 1);
        assert_eq!(key.block, 840000);
        assert_eq!(key.tx, 1);
    }

    #[test]
    fn test_rune_key_clone() {
        let key1 = RuneKey::new(840000, 1);
        let key2 = key1.clone();
        assert_eq!(key1, key2);
    }

    #[test]
    fn test_rune_key_debug() {
        let key = RuneKey::new(840000, 1);
        let debug_str = format!("{:?}", key);
        assert!(debug_str.contains("840000"));
        assert!(debug_str.contains("1"));
    }

    #[test]
    fn test_rune_key_display() {
        let key = RuneKey::new(840000, 1);
        assert_eq!(format!("{}", key), "840000:1");
    }

    // ========================================================================
    // TESTS DE STORABLE
    // ========================================================================

    #[test]
    fn test_storable_to_bytes() {
        let key = RuneKey::new(840000, 1);
        let bytes = key.to_bytes();
        
        // Debe ser exactamente 12 bytes
        assert_eq!(bytes.len(), 12);
        
        // Primeros 8 bytes son block (little-endian)
        let block_bytes = &bytes[0..8];
        let block = u64::from_le_bytes(block_bytes.try_into().unwrap());
        assert_eq!(block, 840000);
        
        // Siguientes 4 bytes son tx (little-endian)
        let tx_bytes = &bytes[8..12];
        let tx = u32::from_le_bytes(tx_bytes.try_into().unwrap());
        assert_eq!(tx, 1);
    }

    #[test]
    fn test_storable_from_bytes() {
        let original = RuneKey::new(840000, 1);
        let bytes = original.to_bytes();
        let recovered = RuneKey::from_bytes(bytes);
        
        assert_eq!(original, recovered);
    }

    #[test]
    fn test_storable_roundtrip() {
        let keys = vec![
            RuneKey::new(0, 0),
            RuneKey::new(840000, 1),
            RuneKey::new(u64::MAX, u32::MAX),
            RuneKey::new(123456, 789),
        ];
        
        for original in keys {
            let bytes = original.to_bytes();
            let recovered = RuneKey::from_bytes(bytes);
            assert_eq!(original, recovered);
        }
    }

    #[test]
    fn test_storable_bound() {
        use ic_stable_structures::storable::Bound;
        
        assert_eq!(
            RuneKey::BOUND,
            Bound::Bounded {
                max_size: 12,
                is_fixed_size: true
            }
        );
    }

    // ========================================================================
    // TESTS DE ORDENAMIENTO
    // ========================================================================

    #[test]
    fn test_ordering_by_block() {
        let key1 = RuneKey::new(840000, 1);
        let key2 = RuneKey::new(840001, 1);
        
        assert!(key1 < key2);
        assert!(key2 > key1);
    }

    #[test]
    fn test_ordering_by_tx() {
        let key1 = RuneKey::new(840000, 1);
        let key2 = RuneKey::new(840000, 2);
        
        assert!(key1 < key2);
        assert!(key2 > key1);
    }

    #[test]
    fn test_ordering_equal() {
        let key1 = RuneKey::new(840000, 1);
        let key2 = RuneKey::new(840000, 1);
        
        assert_eq!(key1.cmp(&key2), Ordering::Equal);
    }

    #[test]
    fn test_ordering_block_precedence() {
        // Block tiene precedencia sobre tx
        let key1 = RuneKey::new(840000, 999);
        let key2 = RuneKey::new(840001, 1);
        
        assert!(key1 < key2);
    }

    #[test]
    fn test_btreemap_ordering() {
        use std::collections::BTreeMap;
        
        let mut map = BTreeMap::new();
        map.insert(RuneKey::new(840002, 1), "C");
        map.insert(RuneKey::new(840000, 1), "A");
        map.insert(RuneKey::new(840001, 1), "B");
        
        let values: Vec<_> = map.values().collect();
        assert_eq!(values, vec![&"A", &"B", &"C"]);
    }

    // ========================================================================
    // TESTS DE HASH
    // ========================================================================

    #[test]
    fn test_hash_consistency() {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let key = RuneKey::new(840000, 1);
        
        let mut hasher1 = DefaultHasher::new();
        key.hash(&mut hasher1);
        let hash1 = hasher1.finish();
        
        let mut hasher2 = DefaultHasher::new();
        key.hash(&mut hasher2);
        let hash2 = hasher2.finish();
        
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_hash_uniqueness() {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        
        let key1 = RuneKey::new(840000, 1);
        let key2 = RuneKey::new(840000, 2);
        
        let mut hasher1 = DefaultHasher::new();
        key1.hash(&mut hasher1);
        let hash1 = hasher1.finish();
        
        let mut hasher2 = DefaultHasher::new();
        key2.hash(&mut hasher2);
        let hash2 = hasher2.finish();
        
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_hashmap_usage() {
        use std::collections::HashMap;
        
        let mut map = HashMap::new();
        map.insert(RuneKey::new(840000, 1), "First");
        map.insert(RuneKey::new(840000, 2), "Second");
        
        assert_eq!(map.get(&RuneKey::new(840000, 1)), Some(&"First"));
        assert_eq!(map.get(&RuneKey::new(840000, 2)), Some(&"Second"));
    }

    // ========================================================================
    // TESTS DE EDGE CASES
    // ========================================================================

    #[test]
    fn test_zero_values() {
        let key = RuneKey::new(0, 0);
        assert_eq!(key.block, 0);
        assert_eq!(key.tx, 0);
        
        // Debe serializar correctamente
        let bytes = key.to_bytes();
        assert_eq!(bytes.len(), 12);
        
        let recovered = RuneKey::from_bytes(bytes);
        assert_eq!(key, recovered);
    }

    #[test]
    fn test_max_values() {
        let key = RuneKey::new(u64::MAX, u32::MAX);
        assert_eq!(key.block, u64::MAX);
        assert_eq!(key.tx, u32::MAX);
        
        // Debe serializar correctamente
        let bytes = key.to_bytes();
        assert_eq!(bytes.len(), 12);
        
        let recovered = RuneKey::from_bytes(bytes);
        assert_eq!(key, recovered);
    }

    #[test]
    fn test_bitcoin_genesis_block() {
        // Bitcoin genesis block = 0
        let key = RuneKey::new(0, 0);
        assert_eq!(format!("{}", key), "0:0");
    }

    #[test]
    fn test_runes_genesis_block() {
        // Runes activó en block 840000 (aproximado)
        let key = RuneKey::new(840000, 0);
        assert_eq!(key.block, 840000);
        assert_eq!(format!("{}", key), "840000:0");
    }

    // ========================================================================
    // TESTS DE PARSING (String conversion)
    // ========================================================================

    #[test]
    fn test_from_str_valid() {
        let key: RuneKey = "840000:1".parse().unwrap();
        assert_eq!(key.block, 840000);
        assert_eq!(key.tx, 1);
    }

    #[test]
    fn test_from_str_zero() {
        let key: RuneKey = "0:0".parse().unwrap();
        assert_eq!(key.block, 0);
        assert_eq!(key.tx, 0);
    }

    #[test]
    fn test_from_str_max() {
        let key: RuneKey = format!("{}:{}", u64::MAX, u32::MAX).parse().unwrap();
        assert_eq!(key.block, u64::MAX);
        assert_eq!(key.tx, u32::MAX);
    }

    #[test]
    fn test_from_str_invalid_format() {
        let result: Result<RuneKey, _> = "invalid".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_from_str_missing_colon() {
        let result: Result<RuneKey, _> = "840000".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_from_str_too_many_parts() {
        let result: Result<RuneKey, _> = "840000:1:extra".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_from_str_invalid_block() {
        let result: Result<RuneKey, _> = "not_a_number:1".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_from_str_invalid_tx() {
        let result: Result<RuneKey, _> = "840000:not_a_number".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_from_str_block_overflow() {
        // u64::MAX + 1 debe fallar
        let result: Result<RuneKey, _> = "18446744073709551616:1".parse();
        assert!(result.is_err());
    }

    #[test]
    fn test_from_str_tx_overflow() {
        // u32::MAX + 1 debe fallar
        let result: Result<RuneKey, _> = "840000:4294967296".parse();
        assert!(result.is_err());
    }

    // ========================================================================
    // TESTS DE CONVERSION BIDIRECCIONAL
    // ========================================================================

    #[test]
    fn test_display_parse_roundtrip() {
        let keys = vec![
            RuneKey::new(0, 0),
            RuneKey::new(840000, 1),
            RuneKey::new(u64::MAX, u32::MAX),
            RuneKey::new(123456, 789),
        ];
        
        for original in keys {
            let string = format!("{}", original);
            let parsed: RuneKey = string.parse().unwrap();
            assert_eq!(original, parsed);
        }
    }

    // ========================================================================
    // TESTS DE CANDID SERIALIZATION
    // ========================================================================

    #[test]
    fn test_candid_encode_decode() {
        use candid::{encode_one, decode_one};
        
        let original = RuneKey::new(840000, 1);
        let bytes = encode_one(&original).unwrap();
        let recovered: RuneKey = decode_one(&bytes).unwrap();
        
        assert_eq!(original, recovered);
    }

    #[test]
    fn test_candid_roundtrip_multiple() {
        use candid::{encode_one, decode_one};
        
        let keys = vec![
            RuneKey::new(0, 0),
            RuneKey::new(840000, 1),
            RuneKey::new(u64::MAX, u32::MAX),
        ];
        
        for original in keys {
            let bytes = encode_one(&original).unwrap();
            let recovered: RuneKey = decode_one(&bytes).unwrap();
            assert_eq!(original, recovered);
        }
    }

    // ========================================================================
    // PERFORMANCE BENCHMARKS (informational)
    // ========================================================================

    #[test]
    fn test_serialization_size() {
        let key = RuneKey::new(840000, 1);
        let bytes = key.to_bytes();
        
        // Debe ser exactamente 12 bytes (muy compacto)
        assert_eq!(bytes.len(), 12);
        
        // Comparado con Candid encoding (más overhead)
        let candid_bytes = candid::encode_one(&key).unwrap();
        assert!(candid_bytes.len() > 12);
        
        println!("Storable size: {} bytes", bytes.len());
        println!("Candid size: {} bytes", candid_bytes.len());
    }

    #[test]
    fn test_many_keys_sorting() {
        let mut keys = [RuneKey::new(840002, 5),
            RuneKey::new(840000, 1),
            RuneKey::new(840001, 3),
            RuneKey::new(840000, 2),
            RuneKey::new(840002, 4)];
        
        keys.sort();
        
        assert_eq!(keys[0], RuneKey::new(840000, 1));
        assert_eq!(keys[1], RuneKey::new(840000, 2));
        assert_eq!(keys[2], RuneKey::new(840001, 3));
        assert_eq!(keys[3], RuneKey::new(840002, 4));
        assert_eq!(keys[4], RuneKey::new(840002, 5));
    }
}
