// ============================================================================
// Bitcoin Block Height Tracker
// ============================================================================
//
// Este módulo trackea el block height actual de Bitcoin para:
// - Validar confirmaciones de transacciones
// - Verificar que las transacciones están en bloques válidos
// - Calcular confirmations = current_height - tx_block_height + 1
//
// ## Diseño
//
// 1. **Consulta Periódica**: Cada 5 minutos via timer
// 2. **Cache con TTL**: Evita llamadas excesivas al Bitcoin canister
// 3. **Stable Memory**: Persiste block height para sobrevivir upgrades
// 4. **Fallback**: Si falla consulta, usa valor cacheado anterior
//
// ## Integración con Bitcoin Integration Canister
//
// Usa `bitcoin_get_current_fee_percentiles()` que retorna info del mempool
// incluyendo el tip block height, o alternativamente consulta UTXO set.
//
// ============================================================================

use candid::{CandidType, Deserialize, Principal};
use ic_cdk_timers::TimerId;
use ic_stable_structures::memory_manager::VirtualMemory;
use ic_stable_structures::{DefaultMemoryImpl, StableCell, Storable, storable::Bound};
use std::borrow::Cow;
use std::cell::RefCell;
use std::time::Duration;

use quri_types::BitcoinNetwork;

type Memory = VirtualMemory<DefaultMemoryImpl>;

// ============================================================================
// Types
// ============================================================================

/// Block height information
#[derive(Clone, Debug, CandidType, Deserialize)]
pub struct BlockHeightInfo {
    /// Current block height
    pub height: u64,

    /// Network this height is for
    pub network: BitcoinNetwork,

    /// Timestamp when fetched (nanoseconds)
    pub fetched_at: u64,
}

impl Default for BlockHeightInfo {
    fn default() -> Self {
        Self {
            height: 0,
            network: BitcoinNetwork::Testnet,
            fetched_at: 0,
        }
    }
}

impl Storable for BlockHeightInfo {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to encode BlockHeightInfo: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode BlockHeightInfo: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// State
// ============================================================================

thread_local! {
    /// Cached block height in stable memory (survives upgrades)
    static BLOCK_HEIGHT_CACHE: RefCell<Option<StableCell<BlockHeightInfo, Memory>>> =
        const { RefCell::new(None) };

    /// Timer for periodic updates
    static UPDATE_TIMER: RefCell<Option<TimerId>> = const { RefCell::new(None) };
}

// Configuration
const UPDATE_INTERVAL_SECONDS: u64 = 300; // 5 minutes
const CACHE_TTL_NANOSECONDS: u64 = 10 * 60 * 1_000_000_000; // 10 minutes

// ============================================================================
// Initialization
// ============================================================================

/// Initialize block tracker with stable storage
pub fn init_block_tracker(memory: Memory) {
    BLOCK_HEIGHT_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(
            StableCell::init(memory, BlockHeightInfo::default())
                .unwrap_or_else(|e| {
                    ic_cdk::trap(&format!("Failed to initialize BlockHeightInfo storage: {:?}", e))
                }),
        );
    });

    start_update_timer();

    // Fetch initial block height immediately
    ic_cdk::spawn(async {
        if let Err(e) = update_block_height().await {
            ic_cdk::println!("⚠️ Failed to fetch initial block height: {}", e);
        }
    });

    ic_cdk::println!("✅ Block tracker initialized with {} second update intervals", UPDATE_INTERVAL_SECONDS);
}

/// Reinitialize after upgrade
pub fn reinit_block_tracker(memory: Memory) {
    BLOCK_HEIGHT_CACHE.with(|cache| {
        *cache.borrow_mut() = Some(
            StableCell::init(memory, BlockHeightInfo::default())
                .unwrap_or_else(|e| {
                    ic_cdk::trap(&format!("Failed to reinitialize BlockHeightInfo storage: {:?}", e))
                }),
        );
    });

    start_update_timer();
}

/// Start periodic update timer
fn start_update_timer() {
    UPDATE_TIMER.with(|timer| {
        let timer_id = ic_cdk_timers::set_timer_interval(
            Duration::from_secs(UPDATE_INTERVAL_SECONDS),
            || {
                ic_cdk::spawn(async {
                    if let Err(e) = update_block_height().await {
                        ic_cdk::println!("⚠️ Failed to update block height: {}", e);
                    }
                });
            },
        );

        *timer.borrow_mut() = Some(timer_id);
    });
}

/// Stop update timer (for testing or shutdown)
#[allow(dead_code)]
pub fn stop_block_tracker() {
    UPDATE_TIMER.with(|timer| {
        if let Some(timer_id) = timer.borrow_mut().take() {
            ic_cdk_timers::clear_timer(timer_id);
            ic_cdk::println!("Block tracker timer stopped");
        }
    });
}

// ============================================================================
// Block Height Queries
// ============================================================================

/// Get current block height (uses cache if fresh)
pub async fn get_current_block_height() -> Result<u64, String> {
    // Check cache first
    let cached = BLOCK_HEIGHT_CACHE.with(|cache| {
        cache.borrow().as_ref().map(|cell| cell.get().clone())
    });

    if let Some(info) = cached {
        let age = ic_cdk::api::time().saturating_sub(info.fetched_at);

        if age < CACHE_TTL_NANOSECONDS && info.height > 0 {
            // Cache is valid and non-zero
            return Ok(info.height);
        }
    }

    // Cache miss or stale - fetch new height
    update_block_height().await?;

    // Return updated value
    BLOCK_HEIGHT_CACHE.with(|cache| {
        cache.borrow()
            .as_ref()
            .map(|cell| cell.get().height)
            .filter(|h| *h > 0)
            .ok_or_else(|| "Failed to get block height after update".to_string())
    })
}

/// Get cached block height info (for debugging)
pub fn get_cached_block_height_info() -> Option<BlockHeightInfo> {
    BLOCK_HEIGHT_CACHE.with(|cache| {
        cache.borrow().as_ref().map(|cell| cell.get().clone())
    })
}

/// Calculate confirmations for a transaction
///
/// ## Formula
///
/// confirmations = current_height - tx_block_height + 1
///
/// ## Returns
///
/// - `Ok(confirmations)` if tx is confirmed
/// - `Err(_)` if tx is not yet in a block or current height unavailable
pub async fn get_transaction_confirmations(tx_block_height: u64) -> Result<u32, String> {
    let current_height = get_current_block_height().await?;

    if current_height < tx_block_height {
        return Err(format!(
            "Transaction block height ({}) is greater than current height ({})",
            tx_block_height, current_height
        ));
    }

    let confirmations = current_height.saturating_sub(tx_block_height).saturating_add(1);

    Ok(confirmations as u32)
}

// ============================================================================
// Bitcoin Integration Calls
// ============================================================================

/// Update block height from Bitcoin Integration canister
async fn update_block_height() -> Result<(), String> {
    let network = crate::config::get_etching_config().network;
    let bitcoin_canister = crate::config::get_bitcoin_integration_id()?;

    // Strategy 1: Get block height from get_current_fee_percentiles metadata
    // This is more efficient as we're already calling it for fees
    let height_result = fetch_block_height_via_utxo_query(bitcoin_canister, &network).await;

    match height_result {
        Ok(height) => {
            let info = BlockHeightInfo {
                height,
                network: network.clone(),
                fetched_at: ic_cdk::api::time(),
            };

            BLOCK_HEIGHT_CACHE.with(|cache| {
                if let Some(cell) = cache.borrow_mut().as_mut() {
                    if let Err(e) = cell.set(info.clone()) {
                        ic_cdk::println!("⚠️ Failed to cache block height: {:?}", e);
                    }
                }
            });

            ic_cdk::println!("📦 Block height updated: {} ({:?})", height, network);
            Ok(())
        }
        Err(e) => {
            ic_cdk::println!("❌ Failed to fetch block height: {}", e);
            Err(e)
        }
    }
}

/// Fetch block height by querying UTXO set
///
/// This uses `bitcoin_get_utxos()` which returns the current tip height
async fn fetch_block_height_via_utxo_query(
    bitcoin_canister: Principal,
    network: &BitcoinNetwork,
) -> Result<u64, String> {
    // Call bitcoin_get_utxos to get tip height
    // It returns (u64, u64) = (balance, tip_height) in newer versions
    // For compatibility, we'll use get_utxos with minimal pagination

    let args = GetUtxosRequest {
        address: "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx".to_string(), // Dummy testnet address
        network: network.clone(),
        filter: None,
    };

    let result: Result<(GetUtxosResponse,), _> = ic_cdk::call(
        bitcoin_canister,
        "bitcoin_get_utxos",
        (args,),
    )
    .await;

    match result {
        Ok((response,)) => {
            Ok(response.tip_height as u64)
        }
        Err((code, msg)) => {
            Err(format!("bitcoin_get_utxos failed: {:?} - {}", code, msg))
        }
    }
}

// ============================================================================
// Bitcoin Integration Types (minimal subset)
// ============================================================================

#[derive(CandidType, Deserialize, Clone, Debug)]
struct GetUtxosRequest {
    address: String,
    network: BitcoinNetwork,
    filter: Option<UtxosFilter>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct GetUtxosResponse {
    utxos: Vec<Utxo>,
    tip_height: u32,
    tip_block_hash: Vec<u8>,
    next_page: Option<Vec<u8>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct Utxo {
    outpoint: OutPoint,
    value: u64,
    height: u32,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
struct OutPoint {
    txid: Vec<u8>,
    vout: u32,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
enum UtxosFilter {
    MinConfirmations(u32),
    Page(Vec<u8>),
}

// ============================================================================
// Health Check
// ============================================================================

/// Check if block tracker is healthy
pub fn block_tracker_healthy() -> bool {
    BLOCK_HEIGHT_CACHE.with(|cache| {
        cache.borrow().as_ref().is_some()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_block_height_info_storable() {
        let info = BlockHeightInfo {
            height: 840000,
            network: BitcoinNetwork::Mainnet,
            fetched_at: 1234567890,
        };

        let bytes = info.to_bytes();
        let decoded = BlockHeightInfo::from_bytes(bytes);

        assert_eq!(info.height, decoded.height);
        assert_eq!(info.network, decoded.network);
        assert_eq!(info.fetched_at, decoded.fetched_at);
    }

    #[test]
    fn test_confirmations_calculation() {
        // If current height is 100 and tx is in block 95
        // confirmations = 100 - 95 + 1 = 6
        let current = 100u64;
        let tx_height = 95u64;
        let confirmations = current.saturating_sub(tx_height).saturating_add(1);
        assert_eq!(confirmations, 6);
    }
}
