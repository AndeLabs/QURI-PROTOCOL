// ============================================================================
// Configuration Module - Persistent Config in Stable Memory
// ============================================================================
//
// Manages canister configuration that persists across upgrades.
//
// Key Features:
// - EtchingConfig stored in StableCell
// - FeeConfig stored in StableCell
// - CanisterConfig (IDs) stored in StableCell
// - All configs survive upgrades
//
// ============================================================================

use candid::{CandidType, Deserialize, Principal};
use ic_stable_structures::{storable::Bound, StableCell, Storable};
use std::borrow::Cow;
use std::cell::RefCell;

use quri_types::BitcoinNetwork;

type Memory = ic_stable_structures::memory_manager::VirtualMemory<
    ic_stable_structures::DefaultMemoryImpl,
>;

// ============================================================================
// Configuration Structures
// ============================================================================

/// Etching flow configuration
#[derive(Clone, Debug, CandidType, Deserialize, PartialEq)]
pub struct EtchingConfig {
    pub network: BitcoinNetwork,
    pub fee_rate: u64,
    pub required_confirmations: u32,
    pub enable_retries: bool,
}

impl Default for EtchingConfig {
    fn default() -> Self {
        Self {
            network: BitcoinNetwork::Testnet,
            fee_rate: 2, // Default 2 sat/vbyte
            required_confirmations: 1,
            enable_retries: true,
        }
    }
}

impl Storable for EtchingConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to encode EtchingConfig: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode EtchingConfig: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

/// Canister IDs configuration
#[derive(Clone, Debug, CandidType, Deserialize, PartialEq)]
pub struct CanisterConfig {
    pub bitcoin_integration_id: Principal,
    pub registry_id: Principal,
}

impl Storable for CanisterConfig {
    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::encode_one(self).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to encode CanisterConfig: {}", e))
        }))
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::decode_one(&bytes).unwrap_or_else(|e| {
            ic_cdk::trap(&format!("CRITICAL: Failed to decode CanisterConfig: {}", e))
        })
    }

    const BOUND: Bound = Bound::Unbounded;
}

// ============================================================================
// Stable Storage
// ============================================================================

thread_local! {
    /// Etching config (MemoryId 4)
    static ETCHING_CONFIG: RefCell<Option<StableCell<EtchingConfig, Memory>>> =
        const { RefCell::new(None) };

    /// Canister config (MemoryId 5)
    static CANISTER_CONFIG: RefCell<Option<StableCell<CanisterConfig, Memory>>> =
        const { RefCell::new(None) };
}

// ============================================================================
// Initialization
// ============================================================================

/// Initialize config storage
pub fn init_config_storage(etching_memory: Memory, canister_memory: Memory) {
    ETCHING_CONFIG.with(|c| {
        *c.borrow_mut() = Some(
            StableCell::init(etching_memory, EtchingConfig::default())
                .unwrap_or_else(|e| ic_cdk::trap(&format!("Failed to initialize EtchingConfig storage: {:?}", e))),
        );
    });

    CANISTER_CONFIG.with(|c| {
        *c.borrow_mut() = Some(
            StableCell::init(canister_memory, CanisterConfig {
                bitcoin_integration_id: Principal::anonymous(),
                registry_id: Principal::anonymous(),
            })
            .unwrap_or_else(|e| ic_cdk::trap(&format!("Failed to initialize CanisterConfig storage: {:?}", e))),
        );
    });
}

/// Reinitialize after upgrade
pub fn reinit_config_storage(etching_memory: Memory, canister_memory: Memory) {
    ETCHING_CONFIG.with(|c| {
        *c.borrow_mut() = Some(
            StableCell::init(etching_memory, EtchingConfig::default())
                .unwrap_or_else(|e| ic_cdk::trap(&format!("Failed to reinitialize EtchingConfig storage: {:?}", e))),
        );
    });

    CANISTER_CONFIG.with(|c| {
        *c.borrow_mut() = Some(
            StableCell::init(canister_memory, CanisterConfig {
                bitcoin_integration_id: Principal::anonymous(),
                registry_id: Principal::anonymous(),
            })
            .unwrap_or_else(|e| ic_cdk::trap(&format!("Failed to reinitialize CanisterConfig storage: {:?}", e))),
        );
    });
}

// ============================================================================
// Etching Config APIs
// ============================================================================

/// Get current etching config
pub fn get_etching_config() -> EtchingConfig {
    ETCHING_CONFIG.with(|c| {
        c.borrow()
            .as_ref()
            .map(|cell| cell.get().clone())
            .unwrap_or_default()
    })
}

/// Update etching config (Admin only - call from lib.rs with RBAC check)
pub fn set_etching_config(config: EtchingConfig) -> Result<(), String> {
    ETCHING_CONFIG.with(|c| {
        let mut cell_ref = c.borrow_mut();
        if let Some(ref mut cell) = *cell_ref {
            cell.set(config)
                .map_err(|e| format!("Failed to set EtchingConfig: {:?}", e))?;
            Ok(())
        } else {
            Err("EtchingConfig storage not initialized".to_string())
        }
    })
}

// ============================================================================
// Canister Config APIs
// ============================================================================

/// Get current canister config
pub fn get_canister_config() -> Option<CanisterConfig> {
    CANISTER_CONFIG.with(|c| {
        c.borrow()
            .as_ref()
            .map(|cell| {
                let config = cell.get().clone();
                // Return None if not configured (anonymous principals)
                if config.bitcoin_integration_id == Principal::anonymous() {
                    None
                } else {
                    Some(config)
                }
            })
            .flatten()
    })
}

/// Update canister config (Admin only)
pub fn set_canister_config(config: CanisterConfig) -> Result<(), String> {
    CANISTER_CONFIG.with(|c| {
        let mut cell_ref = c.borrow_mut();
        if let Some(ref mut cell) = *cell_ref {
            cell.set(config)
                .map_err(|e| format!("Failed to set CanisterConfig: {:?}", e))?;
            Ok(())
        } else {
            Err("CanisterConfig storage not initialized".to_string())
        }
    })
}

/// Get Bitcoin Integration canister ID
pub fn get_bitcoin_integration_id() -> Result<Principal, String> {
    get_canister_config()
        .map(|c| c.bitcoin_integration_id)
        .ok_or_else(|| {
            "Bitcoin Integration canister not configured. Please call configure_canisters() first."
                .to_string()
        })
}

/// Get Registry canister ID
pub fn get_registry_id() -> Result<Principal, String> {
    get_canister_config()
        .map(|c| c.registry_id)
        .ok_or_else(|| {
            "Registry canister not configured. Please call configure_canisters() first."
                .to_string()
        })
}

// ============================================================================
// Health Check
// ============================================================================

/// Check if configs are properly initialized
pub fn configs_healthy() -> bool {
    let etching_ok = ETCHING_CONFIG.with(|c| c.borrow().is_some());
    let canister_ok = CANISTER_CONFIG.with(|c| c.borrow().is_some());
    etching_ok && canister_ok
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_etching_config_default() {
        let config = EtchingConfig::default();
        assert_eq!(config.network, BitcoinNetwork::Testnet);
        assert_eq!(config.fee_rate, 2);
        assert_eq!(config.required_confirmations, 1);
        assert!(config.enable_retries);
    }

    #[test]
    fn test_etching_config_storable() {
        let config = EtchingConfig {
            network: BitcoinNetwork::Mainnet,
            fee_rate: 10,
            required_confirmations: 6,
            enable_retries: false,
        };

        let bytes = config.to_bytes();
        let decoded = EtchingConfig::from_bytes(bytes);

        assert_eq!(config, decoded);
    }

    #[test]
    fn test_canister_config_storable() {
        let config = CanisterConfig {
            bitcoin_integration_id: Principal::from_text("rrkah-fqaaa-aaaaa-aaaaq-cai").unwrap(),
            registry_id: Principal::from_text("ryjl3-tyaaa-aaaaa-aaaba-cai").unwrap(),
        };

        let bytes = config.to_bytes();
        let decoded = CanisterConfig::from_bytes(bytes);

        assert_eq!(config, decoded);
    }
}
