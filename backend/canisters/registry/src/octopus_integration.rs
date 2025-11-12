/**
 * Octopus Runes Indexer Integration
 * Provides inter-canister communication with the Octopus Network Runes Indexer
 * Mainnet Canister: kzrva-ziaaa-aaaar-qamyq-cai
 */

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::call::CallResult;

/// Octopus Indexer Mainnet Canister ID
pub const OCTOPUS_INDEXER_MAINNET: &str = "kzrva-ziaaa-aaaar-qamyq-cai";
pub const OCTOPUS_INDEXER_TESTNET: &str = "f2dwm-caaaa-aaaao-qjxlq-cai";

/// Rune ID in the format "block:tx_index"
pub type RuneId = String;

/// Block information from the indexer
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct BlockInfo {
    pub height: u64,
    pub hash: String,
}

/// Minting terms for a Rune
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Terms {
    pub amount: u128,
    pub cap: u128,
    pub height_start: Option<u64>,
    pub height_end: Option<u64>,
    pub offset_start: Option<u64>,
    pub offset_end: Option<u64>,
}

/// Complete Rune entry from Octopus Indexer
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OctopusRuneEntry {
    pub confirmations: u32,
    pub rune_id: RuneId,
    pub mints: u128,
    pub terms: Option<Terms>,
    pub etching: String,          // Transaction ID
    pub turbo: bool,
    pub premine: u128,
    pub divisibility: u8,
    pub spaced_rune: String,
    pub sequence: u32,
    pub timestamp: u64,
    pub block: u64,
    pub burned: u128,
    pub symbol: Option<String>,
}

/// Rune balance for a specific output
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct RuneBalance {
    pub rune_id: RuneId,
    pub amount: u128,
}

/// Bitcoin UTXO identifier
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct OutPoint {
    pub txid: String,
    pub vout: u32,
}

/// Octopus Indexer Client
pub struct OctopusIndexerClient {
    canister_id: Principal,
}

impl OctopusIndexerClient {
    /// Create a new client for the mainnet indexer
    pub fn mainnet() -> Self {
        let canister_id = Principal::from_text(OCTOPUS_INDEXER_MAINNET)
            .expect("Invalid Octopus Indexer canister ID");

        Self { canister_id }
    }

    /// Create a new client for the testnet indexer
    pub fn testnet() -> Self {
        let canister_id = Principal::from_text(OCTOPUS_INDEXER_TESTNET)
            .expect("Invalid Octopus Indexer testnet canister ID");

        Self { canister_id }
    }

    /// Get the latest Bitcoin block indexed
    pub async fn get_latest_block(&self) -> CallResult<BlockInfo> {
        let result: CallResult<(BlockInfo,)> =
            ic_cdk::call(self.canister_id, "get_latest_block", ()).await;

        result.map(|(block_info,)| block_info)
    }

    /// Get Rune ID from an etching transaction
    pub async fn get_etching(&self, txid: String) -> CallResult<Option<RuneId>> {
        let result: CallResult<(Option<RuneId>,)> =
            ic_cdk::call(self.canister_id, "get_etching", (txid,)).await;

        result.map(|(rune_id,)| rune_id)
    }

    /// Get Rune entry by spaced name (e.g., "QUANTUM•LEAP")
    pub async fn get_rune(&self, spaced_name: String) -> CallResult<Option<OctopusRuneEntry>> {
        let result: CallResult<(Option<OctopusRuneEntry>,)> =
            ic_cdk::call(self.canister_id, "get_rune", (spaced_name,)).await;

        result.map(|(entry,)| entry)
    }

    /// Get Rune entry by Rune ID
    pub async fn get_rune_by_id(&self, rune_id: RuneId) -> CallResult<Option<OctopusRuneEntry>> {
        let result: CallResult<(Option<OctopusRuneEntry>,)> =
            ic_cdk::call(self.canister_id, "get_rune_by_id", (rune_id,)).await;

        result.map(|(entry,)| entry)
    }

    /// Get Rune balances for multiple outputs (UTXOs)
    pub async fn get_rune_balances_for_outputs(
        &self,
        outputs: Vec<OutPoint>,
    ) -> CallResult<Vec<Vec<RuneBalance>>> {
        let result: CallResult<(Vec<Vec<RuneBalance>>,)> =
            ic_cdk::call(
                self.canister_id,
                "get_rune_balances_for_outputs",
                (outputs,),
            )
            .await;

        result.map(|(balances,)| balances)
    }
}

/// Verification helpers
pub mod verification {
    use super::*;

    /// Minimum confirmations before considering a Rune as confirmed
    pub const MIN_CONFIRMATIONS: u32 = 6;

    /// Verify that a Rune is properly confirmed on-chain
    pub fn is_confirmed(rune_entry: &OctopusRuneEntry) -> bool {
        rune_entry.confirmations >= MIN_CONFIRMATIONS
    }

    /// Check if a Rune matches our expected data
    pub fn verify_rune_data(
        octopus_entry: &OctopusRuneEntry,
        expected_name: &str,
        expected_symbol: Option<&str>,
        expected_divisibility: u8,
        expected_premine: u128,
    ) -> Result<(), String> {
        if octopus_entry.spaced_rune != expected_name {
            return Err(format!(
                "Name mismatch: expected {}, got {}",
                expected_name, octopus_entry.spaced_rune
            ));
        }

        if let Some(expected_sym) = expected_symbol {
            match &octopus_entry.symbol {
                Some(actual_sym) if actual_sym != expected_sym => {
                    return Err(format!(
                        "Symbol mismatch: expected {}, got {}",
                        expected_sym, actual_sym
                    ));
                }
                None => {
                    return Err("Symbol missing in indexer data".to_string());
                }
                _ => {}
            }
        }

        if octopus_entry.divisibility != expected_divisibility {
            return Err(format!(
                "Divisibility mismatch: expected {}, got {}",
                expected_divisibility, octopus_entry.divisibility
            ));
        }

        if octopus_entry.premine != expected_premine {
            return Err(format!(
                "Premine mismatch: expected {}, got {}",
                expected_premine, octopus_entry.premine
            ));
        }

        Ok(())
    }

    /// Estimate time until confirmation based on current confirmations
    pub fn estimate_confirmation_time(current_confirmations: u32) -> Option<u64> {
        if current_confirmations >= MIN_CONFIRMATIONS {
            return None; // Already confirmed
        }

        let remaining = MIN_CONFIRMATIONS - current_confirmations;
        let avg_block_time = 600; // 10 minutes in seconds

        Some(remaining as u64 * avg_block_time)
    }
}

/// Cache management for reducing inter-canister calls
pub mod cache {
    use super::*;
    use std::collections::HashMap;

    #[derive(Default)]
    pub struct RuneCache {
        entries: HashMap<RuneId, (OctopusRuneEntry, u64)>, // (entry, timestamp)
        cache_duration: u64, // seconds
    }

    impl RuneCache {
        pub fn new(cache_duration_seconds: u64) -> Self {
            Self {
                entries: HashMap::new(),
                cache_duration: cache_duration_seconds,
            }
        }

        pub fn get(&self, rune_id: &RuneId, current_time: u64) -> Option<&OctopusRuneEntry> {
            self.entries.get(rune_id).and_then(|(entry, timestamp)| {
                if current_time - timestamp < self.cache_duration {
                    Some(entry)
                } else {
                    None
                }
            })
        }

        pub fn insert(&mut self, rune_id: RuneId, entry: OctopusRuneEntry, current_time: u64) {
            self.entries.insert(rune_id, (entry, current_time));
        }

        pub fn clear_expired(&mut self, current_time: u64) {
            self.entries
                .retain(|_, (_, timestamp)| current_time - timestamp < self.cache_duration);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_canister_id_parsing() {
        let client = OctopusIndexerClient::mainnet();
        assert_eq!(
            client.canister_id.to_text(),
            OCTOPUS_INDEXER_MAINNET
        );
    }

    #[test]
    fn test_confirmation_verification() {
        let rune_entry = OctopusRuneEntry {
            confirmations: 10,
            rune_id: "840000:5".to_string(),
            mints: 0,
            terms: None,
            etching: "abc123".to_string(),
            turbo: false,
            premine: 1000000,
            divisibility: 8,
            spaced_rune: "TEST•RUNE".to_string(),
            sequence: 1,
            timestamp: 1700000000,
            block: 840000,
            burned: 0,
            symbol: Some("⚡".to_string()),
        };

        assert!(verification::is_confirmed(&rune_entry));
    }

    #[test]
    fn test_data_verification() {
        let rune_entry = OctopusRuneEntry {
            confirmations: 10,
            rune_id: "840000:5".to_string(),
            mints: 0,
            terms: None,
            etching: "abc123".to_string(),
            turbo: false,
            premine: 1000000,
            divisibility: 8,
            spaced_rune: "TEST•RUNE".to_string(),
            sequence: 1,
            timestamp: 1700000000,
            block: 840000,
            burned: 0,
            symbol: Some("⚡".to_string()),
        };

        let result = verification::verify_rune_data(
            &rune_entry,
            "TEST•RUNE",
            Some("⚡"),
            8,
            1000000,
        );

        assert!(result.is_ok());
    }

    #[test]
    fn test_cache_expiration() {
        let mut cache = cache::RuneCache::new(3600); // 1 hour

        let rune_entry = OctopusRuneEntry {
            confirmations: 10,
            rune_id: "840000:5".to_string(),
            mints: 0,
            terms: None,
            etching: "abc123".to_string(),
            turbo: false,
            premine: 1000000,
            divisibility: 8,
            spaced_rune: "TEST•RUNE".to_string(),
            sequence: 1,
            timestamp: 1700000000,
            block: 840000,
            burned: 0,
            symbol: Some("⚡".to_string()),
        };

        let rune_id = "840000:5".to_string();
        let current_time = 1000000;

        cache.insert(rune_id.clone(), rune_entry, current_time);

        // Should exist
        assert!(cache.get(&rune_id, current_time + 1000).is_some());

        // Should be expired
        assert!(cache.get(&rune_id, current_time + 4000).is_none());
    }
}
