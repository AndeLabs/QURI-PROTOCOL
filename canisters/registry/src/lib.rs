use candid::{CandidType, Deserialize};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, StableVec};
use std::cell::RefCell;

use quri_types::{RegistryEntry, RuneId, RuneMetadata};

mod bitcoin_client;
mod indexer;
mod parser;

pub use indexer::{IndexedRune, IndexerConfig, IndexerStats, RuneIdentifier};

// Type aliases
type Memory = VirtualMemory<DefaultMemoryImpl>;
type RegistryStorage = StableBTreeMap<RuneId, RegistryEntry, Memory>;
type IndexStorage = StableVec<RuneId, Memory>;

thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static REGISTRY: RefCell<RegistryStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );

    static INDEX: RefCell<IndexStorage> = RefCell::new(
        StableVec::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(1)))
        ).expect("Failed to initialize index")
    );
}

#[init]
fn init() {
    ic_cdk::println!("Registry canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing registry upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Registry upgrade completed");
}

/// Register a new Rune in the registry
#[update]
fn register_rune(metadata: RuneMetadata) -> Result<(), String> {
    let entry = RegistryEntry {
        rune_id: metadata.id.clone(),
        metadata: metadata.clone(),
        bonding_curve: None,
        trading_volume_24h: 0,
        holder_count: 1, // Creator
    };

    REGISTRY.with(|registry| {
        registry.borrow_mut().insert(metadata.id.clone(), entry);
    });

    INDEX.with(|index| {
        index
            .borrow_mut()
            .push(&metadata.id)
            .map_err(|e| format!("Failed to update index: {:?}", e))
    })?;

    Ok(())
}

/// Get a Rune's registry entry
#[query]
fn get_rune(rune_id: RuneId) -> Option<RegistryEntry> {
    REGISTRY.with(|registry| registry.borrow().get(&rune_id))
}

/// List all Runes with pagination
#[query]
fn list_runes(offset: u64, limit: u64) -> Vec<RegistryEntry> {
    REGISTRY.with(|registry| {
        registry
            .borrow()
            .iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, entry)| entry)
            .collect()
    })
}

/// Search Runes by name
#[query]
fn search_runes(query: String) -> Vec<RegistryEntry> {
    let query_upper = query.to_uppercase();

    REGISTRY.with(|registry| {
        registry
            .borrow()
            .iter()
            .filter(|(_, entry)| {
                entry.metadata.name.contains(&query_upper)
                    || entry.metadata.symbol.contains(&query_upper)
            })
            .take(100) // Limit results
            .map(|(_, entry)| entry)
            .collect()
    })
}

/// Get trending Runes (by 24h volume)
#[query]
fn get_trending(limit: u64) -> Vec<RegistryEntry> {
    REGISTRY.with(|registry| {
        let mut entries: Vec<RegistryEntry> =
            registry.borrow().iter().map(|(_, entry)| entry).collect();

        // Sort by 24h volume descending
        entries.sort_by(|a, b| b.trading_volume_24h.cmp(&a.trading_volume_24h));

        entries.into_iter().take(limit as usize).collect()
    })
}

/// Update trading volume for a Rune
#[update]
fn update_volume(rune_id: RuneId, volume_delta: u64) -> Result<(), String> {
    REGISTRY.with(|registry| {
        let mut reg = registry.borrow_mut();
        if let Some(mut entry) = reg.get(&rune_id) {
            entry.trading_volume_24h = entry.trading_volume_24h.saturating_add(volume_delta);
            reg.insert(rune_id, entry);
            Ok(())
        } else {
            Err("Rune not found".to_string())
        }
    })
}

/// Update holder count for a Rune
#[update]
fn update_holder_count(rune_id: RuneId, new_count: u64) -> Result<(), String> {
    REGISTRY.with(|registry| {
        let mut reg = registry.borrow_mut();
        if let Some(mut entry) = reg.get(&rune_id) {
            entry.holder_count = new_count;
            reg.insert(rune_id, entry);
            Ok(())
        } else {
            Err("Rune not found".to_string())
        }
    })
}

/// Get total count of registered Runes
#[query]
fn total_runes() -> u64 {
    REGISTRY.with(|registry| registry.borrow().len())
}

/// Get canister statistics
#[query]
fn get_stats() -> RegistryStats {
    let total = REGISTRY.with(|registry| registry.borrow().len());

    let total_volume: u64 = REGISTRY.with(|registry| {
        registry
            .borrow()
            .iter()
            .map(|(_, entry)| entry.trading_volume_24h)
            .sum()
    });

    RegistryStats {
        total_runes: total,
        total_volume_24h: total_volume,
    }
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RegistryStats {
    pub total_runes: u64,
    pub total_volume_24h: u64,
}

// ============================================================================
// Indexer APIs
// ============================================================================

/// Initialize the Bitcoin Runes indexer
#[update]
fn init_indexer(config: IndexerConfig) {
    indexer::init_indexer(config);
}

/// Get an indexed Rune by identifier
#[query]
fn get_indexed_rune(id: RuneIdentifier) -> Option<IndexedRune> {
    indexer::get_rune(&id)
}

/// List indexed Runes with pagination
#[query]
fn list_indexed_runes(offset: u64, limit: u64) -> Vec<IndexedRune> {
    indexer::list_runes(offset, limit)
}

/// Search indexed Runes by name or symbol
#[query]
fn search_indexed_runes(query: String) -> Vec<IndexedRune> {
    indexer::search_runes(query)
}

/// Get indexer statistics
#[query]
fn get_indexer_stats() -> IndexerStats {
    indexer::get_stats()
}

/// Manual indexing trigger (for testing/admin)
#[update]
async fn index_block_range(start: u64, end: u64) -> Result<u64, String> {
    let _config = indexer::get_config().ok_or("Indexer not initialized".to_string())?;

    let mut indexed_count = 0u64;

    for height in start..=end {
        // Fetch block transactions
        let txs = bitcoin_client::mock_fetch_transactions(height);

        // Parse for runestones
        let runes = parser::parse_block_for_runestones(txs, height, 0);

        // Store each found rune
        for rune in runes {
            indexer::store_rune(rune)?;
            indexed_count += 1;
        }
    }

    Ok(indexed_count)
}

ic_cdk::export_candid!();
