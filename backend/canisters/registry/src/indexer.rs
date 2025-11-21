use candid::{CandidType, Deserialize};
use std::cell::RefCell;
use std::collections::BTreeMap;

// Simple in-memory storage for indexed runes
// This avoids the complexity of StableBTreeMap initialization
type IndexedRuneStorage = RefCell<BTreeMap<Vec<u8>, Vec<u8>>>;

// Secondary indexes for fast search - O(log n) instead of O(n)
type NameIndex = RefCell<BTreeMap<String, Vec<RuneIdentifier>>>;  // name_normalized -> [ids]
type SymbolIndex = RefCell<BTreeMap<String, Vec<RuneIdentifier>>>; // symbol -> [ids]

// Keep for legacy compatibility but unused
type RuneStorage = RefCell<Option<()>>;

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
    static RUNES: RuneStorage = const { RefCell::new(None) };
    static INDEXED_RUNES: IndexedRuneStorage = RefCell::new(BTreeMap::new());
    // Secondary indexes for O(log n) search
    static NAME_INDEX: NameIndex = RefCell::new(BTreeMap::new());
    static SYMBOL_INDEX: SymbolIndex = RefCell::new(BTreeMap::new());
    static STATS: RefCell<IndexerStats> = RefCell::new(IndexerStats::default());
    static CONFIG: RefCell<Option<IndexerConfig>> = const { RefCell::new(None) };
    static INITIALIZED: RefCell<bool> = const { RefCell::new(false) };
}

/// Initialize the indexer with configuration
pub fn init_indexer(config: IndexerConfig) {
    CONFIG.with(|c| {
        *c.borrow_mut() = Some(config);
    });
}

/// Ensure runes storage is initialized
/// This creates a simple in-memory BTreeMap since we don't have VirtualMemory here
fn ensure_initialized() {
    INITIALIZED.with(|init| {
        if !*init.borrow() {
            // Storage will be initialized lazily
            *init.borrow_mut() = true;
        }
    });
}

/// Normalize name for indexing (remove dots, spaces, lowercase)
fn normalize_name(name: &str) -> String {
    name.to_uppercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

/// Store a newly indexed Rune
pub fn store_rune(rune: IndexedRune) -> Result<(), String> {
    ensure_initialized();

    let key = encode_rune_key(&rune.id);
    let value = candid::encode_one(&rune).map_err(|e| format!("Failed to encode rune: {}", e))?;

    // Store in main storage
    INDEXED_RUNES.with(|runes| {
        runes.borrow_mut().insert(key, value);
    });

    // Add to name index (normalized for search)
    let normalized_name = normalize_name(&rune.name);
    NAME_INDEX.with(|index| {
        let mut idx = index.borrow_mut();
        idx.entry(normalized_name)
            .or_insert_with(Vec::new)
            .push(rune.id.clone());
    });

    // Add to symbol index
    let symbol_upper = rune.symbol.to_uppercase();
    SYMBOL_INDEX.with(|index| {
        let mut idx = index.borrow_mut();
        idx.entry(symbol_upper)
            .or_insert_with(Vec::new)
            .push(rune.id.clone());
    });

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

    INDEXED_RUNES.with(|runes| {
        runes.borrow()
            .get(&key)
            .and_then(|bytes| candid::decode_one(bytes).ok())
    })
}

/// List all Runes with pagination
pub fn list_runes(offset: u64, limit: u64) -> Vec<IndexedRune> {
    let mut result = Vec::new();

    INDEXED_RUNES.with(|runes| {
        let map = runes.borrow();
        for (i, (_key, value)) in map.iter().enumerate() {
            if (i as u64) < offset {
                continue;
            }

            if result.len() as u64 >= limit {
                break;
            }

            if let Ok(rune) = candid::decode_one::<IndexedRune>(value) {
                result.push(rune);
            }
        }
    });

    result
}

/// Search Runes by name or symbol - O(log n) using indexes
pub fn search_runes(query: String) -> Vec<IndexedRune> {
    let normalized_query = normalize_name(&query);
    let mut matching_ids: Vec<RuneIdentifier> = Vec::new();
    let mut seen_ids = std::collections::HashSet::new();

    // Search by name prefix using BTreeMap range - O(log n)
    NAME_INDEX.with(|index| {
        let idx = index.borrow();

        // Find all names that start with the query (prefix search)
        let range_start = normalized_query.clone();
        let range_end = {
            let mut end = normalized_query.clone();
            end.push(char::MAX);
            end
        };

        for (_name, ids) in idx.range(range_start..range_end) {
            for id in ids {
                if seen_ids.insert((id.block, id.tx_index)) {
                    matching_ids.push(id.clone());
                }
            }
        }

        // Also search for exact matches and contains (for short queries)
        if normalized_query.len() >= 2 {
            for (name, ids) in idx.iter() {
                if name.contains(&normalized_query) && !name.starts_with(&normalized_query) {
                    for id in ids {
                        if seen_ids.insert((id.block, id.tx_index)) {
                            matching_ids.push(id.clone());
                        }
                    }
                }
            }
        }
    });

    // Search by symbol - O(log n)
    let symbol_query = query.to_uppercase();
    SYMBOL_INDEX.with(|index| {
        let idx = index.borrow();

        // Exact symbol match
        if let Some(ids) = idx.get(&symbol_query) {
            for id in ids {
                if seen_ids.insert((id.block, id.tx_index)) {
                    matching_ids.push(id.clone());
                }
            }
        }
    });

    // Fetch the actual runes from storage
    let mut results = Vec::new();
    for id in matching_ids.iter().take(100) {  // Limit results
        if let Some(rune) = get_rune(id) {
            results.push(rune);
        }
    }

    // Sort by relevance (exact matches first, then by name)
    results.sort_by(|a, b| {
        let a_norm = normalize_name(&a.name);
        let b_norm = normalize_name(&b.name);

        // Exact match first
        let a_exact = a_norm == normalized_query;
        let b_exact = b_norm == normalized_query;
        if a_exact && !b_exact {
            return std::cmp::Ordering::Less;
        }
        if b_exact && !a_exact {
            return std::cmp::Ordering::Greater;
        }

        // Then by starts with
        let a_starts = a_norm.starts_with(&normalized_query);
        let b_starts = b_norm.starts_with(&normalized_query);
        if a_starts && !b_starts {
            return std::cmp::Ordering::Less;
        }
        if b_starts && !a_starts {
            return std::cmp::Ordering::Greater;
        }

        // Then alphabetically
        a_norm.cmp(&b_norm)
    });

    results
}

/// Get indexer statistics
pub fn get_stats() -> IndexerStats {
    STATS.with(|stats| stats.borrow().clone())
}

/// Get index statistics for debugging
pub fn get_index_stats() -> (usize, usize, usize) {
    let runes_count = INDEXED_RUNES.with(|r| r.borrow().len());
    let name_index_count = NAME_INDEX.with(|i| i.borrow().len());
    let symbol_index_count = SYMBOL_INDEX.with(|i| i.borrow().len());
    (runes_count, name_index_count, symbol_index_count)
}

/// Rebuild indexes from existing data (one-time migration)
/// Call this after upgrading canister to populate the new indexes
pub fn rebuild_indexes() -> u64 {
    let mut indexed_count: u64 = 0;

    // Clear existing indexes
    NAME_INDEX.with(|idx| idx.borrow_mut().clear());
    SYMBOL_INDEX.with(|idx| idx.borrow_mut().clear());

    // Rebuild from stored runes
    INDEXED_RUNES.with(|runes| {
        let map = runes.borrow();
        for (_key, value) in map.iter() {
            if let Ok(rune) = candid::decode_one::<IndexedRune>(value) {
                // Add to name index
                let normalized = normalize_name(&rune.name);
                NAME_INDEX.with(|idx| {
                    idx.borrow_mut()
                        .entry(normalized)
                        .or_insert_with(Vec::new)
                        .push(rune.id.clone());
                });

                // Add to symbol index
                let symbol_upper = rune.symbol.to_uppercase();
                SYMBOL_INDEX.with(|idx| {
                    idx.borrow_mut()
                        .entry(symbol_upper)
                        .or_insert_with(Vec::new)
                        .push(rune.id);
                });

                indexed_count += 1;
            }
        }
    });

    indexed_count
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
