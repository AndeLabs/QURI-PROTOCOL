use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse, TransformArgs,
    TransformContext, TransformFunc,
};
use num_bigint::BigUint;
use serde::{Deserialize, Serialize};

use crate::indexer::{IndexedRune, MintTerms, RuneIdentifier};

// ============================================================================
// HIRO API TYPES
// ============================================================================

/// Response from Hiro Runes API /etchings endpoint
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HiroEtchingsResponse {
    pub limit: u32,
    pub offset: u32,
    pub total: u64,
    pub results: Vec<HiroRune>,
}

/// Individual rune from Hiro API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HiroRune {
    pub id: String,
    pub name: String,
    pub spaced_name: String,
    pub number: u64,
    pub divisibility: u8,
    pub symbol: String,
    pub turbo: bool,
    pub mint_terms: Option<HiroMintTerms>,
    pub supply: HiroSupply,
    pub location: HiroLocation,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HiroMintTerms {
    #[serde(default)]
    pub amount: Option<String>,
    #[serde(default)]
    pub cap: Option<String>,
    pub height_start: Option<u64>,
    pub height_end: Option<u64>,
    pub offset_start: Option<u64>,
    pub offset_end: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HiroSupply {
    pub current: String,
    pub minted: String,
    pub total_mints: String,
    pub mint_percentage: String,
    pub mintable: bool,
    pub burned: String,
    pub total_burns: String,
    pub premine: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HiroLocation {
    pub block_hash: String,
    pub block_height: u64,
    pub tx_id: String,
    pub tx_index: u32,
    pub timestamp: u64,
}

// ============================================================================
// HTTP OUTCALL IMPLEMENTATION
// ============================================================================

/// Fetch runes from Hiro API with pagination
///
/// ## Example
///
/// ```rust
/// let runes = fetch_runes_from_hiro(0, 100).await?;
/// ```
pub async fn fetch_runes_from_hiro(
    offset: u32,
    limit: u32,
) -> Result<HiroEtchingsResponse, String> {
    let url = format!(
        "https://api.hiro.so/runes/v1/etchings?offset={}&limit={}",
        offset,
        limit.min(60) // Hiro API max limit
    );

    let request_headers = vec![
        HttpHeader {
            name: "Accept".to_string(),
            value: "application/json".to_string(),
        },
        HttpHeader {
            name: "User-Agent".to_string(),
            value: "QURI-Protocol/1.0".to_string(),
        },
    ];

    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(2_000_000), // 2MB max
        transform: Some(TransformContext {
            function: TransformFunc(candid::Func {
                principal: ic_cdk::api::id(),
                method: "transform_hiro_response".to_string(),
            }),
            context: vec![],
        }),
        headers: request_headers,
    };

    // Calculate cycles needed for HTTP outcalls
    // Real measurement: 20.849B cycles required for Hiro API
    // Using 25B for safety margin
    let cycles: u128 = 25_000_000_000; // 25B cycles

    match http_request(request, cycles).await {
        Ok((response,)) => {
            let status_200 = BigUint::from(200u32);
            let status_300 = BigUint::from(300u32);

            if response.status.0 >= status_200 && response.status.0 < status_300 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 response: {}", e))?;

                serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse Hiro response: {}", e))
            } else {
                Err(format!(
                    "Hiro API returned status {}: {}",
                    response.status.0,
                    String::from_utf8_lossy(&response.body)
                ))
            }
        }
        Err((code, msg)) => Err(format!("HTTP outcall failed: {:?} - {}", code, msg)),
    }
}

/// Fetch a single rune by name from Hiro API
pub async fn fetch_rune_by_name(name: &str) -> Result<Option<HiroRune>, String> {
    let url = format!("https://api.hiro.so/runes/v1/etchings/{}", name);

    let request_headers = vec![
        HttpHeader {
            name: "Accept".to_string(),
            value: "application/json".to_string(),
        },
        HttpHeader {
            name: "User-Agent".to_string(),
            value: "QURI-Protocol/1.0".to_string(),
        },
    ];

    let request = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(100_000), // 100KB for single rune
        transform: Some(TransformContext {
            function: TransformFunc(candid::Func {
                principal: ic_cdk::api::id(),
                method: "transform_hiro_response".to_string(),
            }),
            context: vec![],
        }),
        headers: request_headers,
    };

    let cycles: u128 = 25_000_000_000; // 25B cycles

    match http_request(request, cycles).await {
        Ok((response,)) => {
            let status_200 = BigUint::from(200u32);
            let status_404 = BigUint::from(404u32);

            if response.status.0 == status_200 {
                let body_str = String::from_utf8(response.body)
                    .map_err(|e| format!("Invalid UTF-8 response: {}", e))?;

                let rune: HiroRune = serde_json::from_str(&body_str)
                    .map_err(|e| format!("Failed to parse rune: {}", e))?;

                Ok(Some(rune))
            } else if response.status.0 == status_404 {
                Ok(None)
            } else {
                Err(format!(
                    "Hiro API returned status {}: {}",
                    response.status.0,
                    String::from_utf8_lossy(&response.body)
                ))
            }
        }
        Err((code, msg)) => Err(format!("HTTP outcall failed: {:?} - {}", code, msg)),
    }
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/// Convert Hiro API rune to our IndexedRune format
pub fn convert_hiro_rune(hiro: HiroRune) -> Result<IndexedRune, String> {
    // Parse the ID format "block:tx_index"
    let parts: Vec<&str> = hiro.id.split(':').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid rune ID format: {}", hiro.id));
    }

    let block: u64 = parts[0]
        .parse()
        .map_err(|_| format!("Invalid block number in ID: {}", hiro.id))?;
    let tx_index: u32 = parts[1]
        .parse()
        .map_err(|_| format!("Invalid tx index in ID: {}", hiro.id))?;

    // Parse supply - handle decimal strings
    let total_supply = parse_decimal_string(&hiro.supply.current, hiro.divisibility)?;
    let premine = parse_decimal_string(&hiro.supply.premine, hiro.divisibility)?;

    // Convert mint terms if present
    let terms = hiro.mint_terms.map(|mt| {
        let amount = mt
            .amount
            .as_ref()
            .map(|a| parse_decimal_string(a, hiro.divisibility).unwrap_or(0))
            .unwrap_or(0);

        let cap: u128 = mt
            .cap
            .as_ref()
            .map(|c| {
                let cap_str = c.trim_start_matches('0').trim_start_matches('.');
                if cap_str.is_empty() {
                    0
                } else {
                    cap_str.parse().unwrap_or(0)
                }
            })
            .unwrap_or(0);

        MintTerms {
            amount,
            cap,
            height_start: mt.height_start,
            height_end: mt.height_end,
        }
    });

    Ok(IndexedRune {
        id: RuneIdentifier { block, tx_index },
        name: hiro.name,
        symbol: hiro.symbol,
        decimals: hiro.divisibility,
        total_supply,
        premine,
        block_height: hiro.location.block_height,
        txid: hiro.location.tx_id,
        timestamp: hiro.location.timestamp,
        etcher: String::new(), // Hiro doesn't provide etcher address directly
        terms,
    })
}

/// Parse decimal string like "650000.000000000000000000" into u128
fn parse_decimal_string(s: &str, decimals: u8) -> Result<u128, String> {
    // Remove the decimal point and parse as integer
    let parts: Vec<&str> = s.split('.').collect();

    match parts.len() {
        1 => {
            // No decimal point
            let base: u128 = parts[0]
                .parse()
                .map_err(|_| format!("Invalid number: {}", s))?;
            // Scale up by decimals
            let multiplier = 10u128.pow(decimals as u32);
            Ok(base.saturating_mul(multiplier))
        }
        2 => {
            // Has decimal point
            let integer_part: u128 = if parts[0].is_empty() {
                0
            } else {
                parts[0]
                    .parse()
                    .map_err(|_| format!("Invalid integer part: {}", s))?
            };

            // Pad or truncate decimal part to match expected decimals
            let mut decimal_str = parts[1].to_string();
            let decimal_len = decimal_str.len();

            if decimal_len < decimals as usize {
                // Pad with zeros
                decimal_str.push_str(&"0".repeat(decimals as usize - decimal_len));
            } else if decimal_len > decimals as usize {
                // Truncate
                decimal_str.truncate(decimals as usize);
            }

            let decimal_part: u128 = if decimal_str.is_empty() {
                0
            } else {
                decimal_str
                    .parse()
                    .map_err(|_| format!("Invalid decimal part: {}", s))?
            };

            // Combine: integer * 10^decimals + decimal
            let multiplier = 10u128.pow(decimals as u32);
            Ok(integer_part
                .saturating_mul(multiplier)
                .saturating_add(decimal_part))
        }
        _ => Err(format!("Invalid decimal format: {}", s)),
    }
}

// ============================================================================
// TRANSFORM FUNCTION (Required for HTTP outcalls)
// ============================================================================

/// Transform function to strip non-deterministic headers from HTTP response
/// This is required for consensus among replicas
///
/// Only keeps content-type header and strips all others to ensure determinism
#[ic_cdk_macros::query]
fn transform_hiro_response(args: TransformArgs) -> HttpResponse {
    let mut response = args.response;

    // Remove ALL headers except content-type for maximum determinism
    // This prevents consensus failures due to varying timestamps, dates, etc.
    response.headers.retain(|h| {
            let name = h.name.to_lowercase();
            // Keep ONLY content-type
            name == "content-type"
        });

    response
}

// ============================================================================
// LEGACY COMPATIBILITY (Keep existing functions)
// ============================================================================

use quri_types::BitcoinNetwork;

use crate::parser::BitcoinTx;

/// TODO: Fetch block headers from Bitcoin network
///
/// Currently not implemented - ICP Bitcoin API doesn't expose block headers yet.
/// Future implementation should use HTTP outcalls to a Bitcoin explorer API
/// or wait for ICP to add native block header support.
///
/// ## Required for:
/// - SPV verification
/// - Block height tracking
/// - Chain reorganization detection
pub async fn fetch_block_headers(
    _network: BitcoinNetwork,
    _start_height: u64,
    _count: u32,
) -> Result<Vec<Vec<u8>>, String> {
    Err("TODO: Block headers API not available yet. Consider using HTTP outcalls to a Bitcoin explorer.".to_string())
}

/// TODO: Fetch transactions for a specific block
///
/// Currently not implemented - ICP Bitcoin API doesn't provide full block data yet.
/// Future implementation should use HTTP outcalls to Bitcoin explorer APIs like:
/// - Blockstream.info API
/// - Mempool.space API
/// - Hiro.so API
///
/// ## Required for:
/// - Full block indexing
/// - Runestone scanning
/// - Historical data synchronization
pub async fn fetch_block_transactions(
    _network: BitcoinNetwork,
    _block_height: u64,
) -> Result<Vec<BitcoinTx>, String> {
    Err("TODO: Block transactions API not available yet. Use Hiro API for specific Rune data instead.".to_string())
}

/// Mock transaction fetch - TESTING ONLY
///
/// Returns empty vector. Only used in index_block_range function.
/// Should be replaced with real implementation when available.
#[cfg(not(test))]
pub fn mock_fetch_transactions(_block_height: u64) -> Vec<BitcoinTx> {
    vec![]
}

#[cfg(test)]
pub fn mock_fetch_transactions(_block_height: u64) -> Vec<BitcoinTx> {
    vec![]
}

// convert_network - Removed (dead code)
// fetch_block_via_http - Removed (dead code)

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_conversion() {
        let mainnet = convert_network(BitcoinNetwork::Mainnet);
        assert!(matches!(mainnet, ICPBitcoinNetwork::Mainnet));

        let testnet = convert_network(BitcoinNetwork::Testnet);
        assert!(matches!(testnet, ICPBitcoinNetwork::Testnet));
    }

    #[test]
    fn test_parse_decimal_string() {
        // Test with 18 decimals
        let result = parse_decimal_string("650000.000000000000000000", 18).unwrap();
        assert_eq!(result, 650000_000000000000000000u128);

        // Test integer only
        let result = parse_decimal_string("100", 8).unwrap();
        assert_eq!(result, 10000000000u128);

        // Test with 0 decimals
        let result = parse_decimal_string("1000", 0).unwrap();
        assert_eq!(result, 1000u128);
    }

    #[test]
    fn test_convert_hiro_rune() {
        let hiro = HiroRune {
            id: "840000:1".to_string(),
            name: "BITCOIN".to_string(),
            spaced_name: "BITCOIN".to_string(),
            number: 1,
            divisibility: 8,
            symbol: "₿".to_string(),
            turbo: false,
            mint_terms: None,
            supply: HiroSupply {
                current: "21000000.00000000".to_string(),
                minted: "0.00000000".to_string(),
                total_mints: "0".to_string(),
                mint_percentage: "0".to_string(),
                mintable: false,
                burned: "0.00000000".to_string(),
                total_burns: "0".to_string(),
                premine: "21000000.00000000".to_string(),
            },
            location: HiroLocation {
                block_hash: "0000000000000000000".to_string(),
                block_height: 840000,
                tx_id: "abcd1234".to_string(),
                tx_index: 1,
                timestamp: 1713571200,
            },
        };

        let indexed = convert_hiro_rune(hiro).unwrap();
        assert_eq!(indexed.name, "BITCOIN");
        assert_eq!(indexed.id.block, 840000);
        assert_eq!(indexed.id.tx_index, 1);
        assert_eq!(indexed.decimals, 8);
    }
}
