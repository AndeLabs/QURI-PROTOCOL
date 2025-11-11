use candid::{CandidType, Deserialize};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

type Memory = VirtualMemory<DefaultMemoryImpl>;

/// Indexed Rune with full metadata
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct IndexedRune {
    pub id: RuneIdentifier,
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub total_supply: u128,
    pub premine: u128,
    pub block_height: u64,
    pub txid: String,
    pub timestamp: u64,
    pub etcher: String, // Bitcoin address that created it
    pub terms: Option<MintTerms>,
}

#[derive(CandidType, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct RuneIdentifier {
    pub block: u64,
    pub tx_index: u32,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct MintTerms {
    pub amount: u128,
    pub cap: u128,
    pub height_start: Option<u64>,
    pub height_end: Option<u64>,
}

/// Indexer statistics
#[derive(CandidType, Deserialize, Clone, Debug, Default)]
pub struct IndexerStats {
    pub total_runes: u64,
    pub last_indexed_block: u64,
    pub total_etchings: u64,
    pub indexing_errors: u64,
}

/// Configuration for the indexer
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct IndexerConfig {
    pub start_block: u64,
    pub batch_size: u64,
    pub network: quri_types::BitcoinNetwork,
}

thread_local! {
    static RUNES: RefCell<Option<StableBTreeMap<Vec<u8>, Vec<u8>, Memory>>> = RefCell::new(None);
    static STATS: RefCell<IndexerStats> = RefCell::new(IndexerStats::default());
    static CONFIG: RefCell<Option<IndexerConfig>> = RefCell::new(None);
}

/// Initialize the indexer with configuration
pub fn init_indexer(config: IndexerConfig) {
    CONFIG.with(|c| {
        *c.borrow_mut() = Some(config);
    });
}

/// Store a newly indexed Rune
pub fn store_rune(rune: IndexedRune) -> Result<(), String> {
    let key = encode_rune_key(&rune.id);
    let value = candid::encode_one(&rune)
        .map_err(|e| format!("Failed to encode rune: {}", e))?;

    RUNES.with(|runes| {
        if let Some(ref mut map) = *runes.borrow_mut() {
            map.insert(key, value);
            Ok(())
        } else {
            Err("Runes storage not initialized".to_string())
        }
    })?;

    // Update stats
    STATS.with(|stats| {
        let mut s = stats.borrow_mut();
        s.total_runes += 1;
        s.total_etchings += 1;
        if rune.block_height > s.last_indexed_block {
            s.last_indexed_block = rune.block_height;
        }
    });

    Ok(())
}

/// Get a Rune by its identifier
pub fn get_rune(id: &RuneIdentifier) -> Option<IndexedRune> {
    let key = encode_rune_key(id);

    RUNES.with(|runes| {
        if let Some(ref map) = *runes.borrow() {
            map.get(&key).and_then(|bytes| {
                candid::decode_one(&bytes).ok()
            })
        } else {
            None
        }
    })
}

/// List all Runes with pagination
pub fn list_runes(offset: u64, limit: u64) -> Vec<IndexedRune> {
    let mut result = Vec::new();
    let mut count = 0u64;
    let mut skipped = 0u64;

    RUNES.with(|runes| {
        if let Some(ref map) = *runes.borrow() {
            for (_key, value) in map.iter() {
                if skipped < offset {
                    skipped += 1;
                    continue;
                }

                if count >= limit {
                    break;
                }

                if let Ok(rune) = candid::decode_one::<IndexedRune>(&value) {
                    result.push(rune);
                    count += 1;
                }
            }
        }
    });

    result
}

/// Search Runes by name or symbol
pub fn search_runes(query: String) -> Vec<IndexedRune> {
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    RUNES.with(|runes| {
        if let Some(ref map) = *runes.borrow() {
            for (_key, value) in map.iter() {
                if let Ok(rune) = candid::decode_one::<IndexedRune>(&value) {
                    if rune.name.to_lowercase().contains(&query_lower)
                        || rune.symbol.to_lowercase().contains(&query_lower)
                    {
                        results.push(rune);
                    }
                }
            }
        }
    });

    results
}

/// Get indexer statistics
pub fn get_stats() -> IndexerStats {
    STATS.with(|stats| stats.borrow().clone())
}

/// Update indexer statistics
pub fn update_stats<F>(updater: F)
where
    F: FnOnce(&mut IndexerStats),
{
    STATS.with(|stats| {
        let mut s = stats.borrow_mut();
        updater(&mut s);
    });
}

/// Get indexer configuration
pub fn get_config() -> Option<IndexerConfig> {
    CONFIG.with(|c| c.borrow().clone())
}

/// Encode RuneIdentifier as storage key
fn encode_rune_key(id: &RuneIdentifier) -> Vec<u8> {
    let mut key = Vec::with_capacity(12);
    key.extend_from_slice(&id.block.to_be_bytes());
    key.extend_from_slice(&id.tx_index.to_be_bytes());
    key
}

/// Decode storage key to RuneIdentifier
fn decode_rune_key(key: &[u8]) -> Option<RuneIdentifier> {
    if key.len() != 12 {
        return None;
    }

    let block = u64::from_be_bytes(key[0..8].try_into().ok()?);
    let tx_index = u32::from_be_bytes(key[8..12].try_into().ok()?);

    Some(RuneIdentifier { block, tx_index })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_decode_key() {
        let id = RuneIdentifier {
            block: 840000,
            tx_index: 42,
        };

        let key = encode_rune_key(&id);
        let decoded = decode_rune_key(&key).unwrap();

        assert_eq!(decoded, id);
    }

    #[test]
    fn test_key_ordering() {
        let id1 = RuneIdentifier {
            block: 100,
            tx_index: 1,
        };
        let id2 = RuneIdentifier {
            block: 100,
            tx_index: 2,
        };
        let id3 = RuneIdentifier {
            block: 101,
            tx_index: 1,
        };

        let key1 = encode_rune_key(&id1);
        let key2 = encode_rune_key(&id2);
        let key3 = encode_rune_key(&id3);

        assert!(key1 < key2);
        assert!(key2 < key3);
    }
}
