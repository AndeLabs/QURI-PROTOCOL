use candid::{CandidType, Deserialize, Principal};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use std::cell::RefCell;

use quri_types::{RuneConfig, RuneId, RuneMetadata};

// Type aliases for stable structures
type Memory = VirtualMemory<DefaultMemoryImpl>;
type RuneStorage = StableBTreeMap<RuneId, RuneMetadata, Memory>;

// Thread-local storage
thread_local! {
    static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static RUNES: RefCell<RuneStorage> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(0)))
        )
    );
}

#[init]
fn init() {
    ic_cdk::println!("Rune Engine canister initialized");
}

#[pre_upgrade]
fn pre_upgrade() {
    ic_cdk::println!("Preparing for upgrade");
}

#[post_upgrade]
fn post_upgrade() {
    ic_cdk::println!("Upgrade completed");
}

/// Creates a new Rune with the specified configuration
#[update]
async fn create_rune(config: RuneConfig) -> Result<RuneId, String> {
    // Validate caller
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Anonymous principals cannot create runes".to_string());
    }

    // Validate configuration
    validate_rune_config(&config)?;

    // Generate unique Rune ID
    let rune_id = generate_rune_id(&config);

    // Create metadata
    let metadata = RuneMetadata {
        id: rune_id.clone(),
        name: config.name.clone(),
        symbol: config.symbol.clone(),
        divisibility: config.divisibility,
        creator: caller,
        created_at: ic_cdk::api::time(),
        total_supply: config.total_supply,
        premine: config.premine,
    };

    // Store in stable memory
    RUNES.with(|runes| {
        runes.borrow_mut().insert(rune_id.clone(), metadata);
    });

    // TODO: Call bitcoin-integration canister to etch on Bitcoin L1

    Ok(rune_id)
}

/// Retrieves metadata for a specific Rune
#[query]
fn get_rune(rune_id: RuneId) -> Option<RuneMetadata> {
    RUNES.with(|runes| {
        runes.borrow().get(&rune_id)
    })
}

/// Lists all Runes with pagination
#[query]
fn list_runes(offset: u64, limit: u64) -> Vec<RuneMetadata> {
    RUNES.with(|runes| {
        runes
            .borrow()
            .iter()
            .skip(offset as usize)
            .take(limit as usize)
            .map(|(_, metadata)| metadata)
            .collect()
    })
}

/// Returns the total count of Runes
#[query]
fn rune_count() -> u64 {
    RUNES.with(|runes| runes.borrow().len())
}

// Helper functions

fn validate_rune_config(config: &RuneConfig) -> Result<(), String> {
    // Validate name (A-Z, 1-26 characters)
    if config.name.is_empty() || config.name.len() > 26 {
        return Err("Rune name must be 1-26 characters".to_string());
    }

    if !config.name.chars().all(|c| c.is_ascii_uppercase()) {
        return Err("Rune name must contain only A-Z characters".to_string());
    }

    // Validate divisibility (0-38)
    if config.divisibility > 38 {
        return Err("Divisibility must be between 0 and 38".to_string());
    }

    // Validate supply
    if config.total_supply == 0 {
        return Err("Total supply must be greater than 0".to_string());
    }

    if config.premine > config.total_supply {
        return Err("Premine cannot exceed total supply".to_string());
    }

    Ok(())
}

fn generate_rune_id(config: &RuneConfig) -> RuneId {
    // For now, use a simple hash of name and timestamp
    // In production, this should be the actual Bitcoin transaction ID
    let timestamp = ic_cdk::api::time();
    RuneId {
        block: 0, // Will be set after Bitcoin confirmation
        tx: 0,    // Will be set after Bitcoin confirmation
        name: config.name.clone(),
        timestamp,
    }
}

// Candid interface export
ic_cdk::export_candid!();
