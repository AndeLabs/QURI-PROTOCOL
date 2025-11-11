use crate::indexer::{IndexedRune, MintTerms, RuneIdentifier};
use runes_utils::{parse_runestone, Runestone};

/// Bitcoin transaction output
#[derive(Clone, Debug)]
pub struct TxOutput {
    pub value: u64,
    pub script_pubkey: Vec<u8>,
}

/// Bitcoin transaction
#[derive(Clone, Debug)]
pub struct BitcoinTx {
    pub txid: String,
    pub outputs: Vec<TxOutput>,
}

/// Parse a Bitcoin transaction for Runestone
pub fn parse_transaction_for_runestone(
    tx: &BitcoinTx,
    block_height: u64,
    tx_index: u32,
    timestamp: u64,
) -> Result<Option<IndexedRune>, String> {
    // Look for OP_RETURN output with runestone
    for output in &tx.outputs {
        if let Some(runestone_data) = extract_runestone_from_script(&output.script_pubkey) {
            // Parse runestone
            match parse_runestone(&runestone_data) {
                Ok(runestone) => {
                    // Convert to IndexedRune
                    if let Some(indexed) = convert_runestone_to_indexed(
                        runestone,
                        block_height,
                        tx_index,
                        &tx.txid,
                        timestamp,
                    ) {
                        return Ok(Some(indexed));
                    }
                }
                Err(e) => {
                    // Log error but don't fail
                    ic_cdk::println!("Failed to parse runestone: {}", e);
                }
            }
        }
    }

    Ok(None)
}

/// Extract runestone data from script
///
/// Format: OP_RETURN OP_13 <data>
fn extract_runestone_from_script(script: &[u8]) -> Option<Vec<u8>> {
    if script.len() < 3 {
        return None;
    }

    // Check for OP_RETURN (0x6a)
    if script[0] != 0x6a {
        return None;
    }

    // Check for OP_13 (0x5d)
    if script[1] != 0x5d {
        return None;
    }

    // Next byte should be push length
    let len = script[2] as usize;

    if script.len() < 3 + len {
        return None;
    }

    Some(script[3..3 + len].to_vec())
}

/// Convert parsed Runestone to IndexedRune
fn convert_runestone_to_indexed(
    runestone: Runestone,
    block_height: u64,
    tx_index: u32,
    txid: &str,
    timestamp: u64,
) -> Option<IndexedRune> {
    // Only process etchings
    let etching = runestone.etching?;

    let name = etching.rune.clone().unwrap_or_else(|| format!("RUNE_{}", block_height));
    let symbol = etching.symbol.map(|c| c.to_string()).unwrap_or_default();
    let total_supply = calculate_total_supply(&etching);

    Some(IndexedRune {
        id: RuneIdentifier {
            block: block_height,
            tx_index,
        },
        name,
        symbol,
        decimals: etching.divisibility,
        total_supply,
        premine: etching.premine,
        block_height,
        txid: txid.to_string(),
        timestamp,
        etcher: "unknown".to_string(),
        terms: etching.terms.map(|t| MintTerms {
            amount: t.amount,
            cap: t.cap,
            height_start: t.height.map(|(start, _)| start),
            height_end: t.height.map(|(_, end)| end),
        }),
    })
}

/// Calculate total supply from etching
fn calculate_total_supply(etching: &runes_utils::EtchingSpec) -> u128 {
    let mut supply = etching.premine;

    if let Some(ref terms) = etching.terms {
        supply = supply.saturating_add(terms.amount.saturating_mul(terms.cap));
    }

    supply
}

/// Parse block header to extract timestamp
pub fn parse_block_timestamp(header: &[u8]) -> Option<u64> {
    // Bitcoin block header is 80 bytes
    // Timestamp is at bytes 68-71 (little-endian u32)
    if header.len() < 80 {
        return None;
    }

    let timestamp_bytes = &header[68..72];
    let timestamp = u32::from_le_bytes(timestamp_bytes.try_into().ok()?);

    Some(timestamp as u64)
}

/// Batch parse multiple transactions
pub fn parse_block_for_runestones(
    transactions: Vec<BitcoinTx>,
    block_height: u64,
    block_timestamp: u64,
) -> Vec<IndexedRune> {
    let mut runes = Vec::new();

    for (tx_index, tx) in transactions.iter().enumerate() {
        match parse_transaction_for_runestone(tx, block_height, tx_index as u32, block_timestamp) {
            Ok(Some(rune)) => runes.push(rune),
            Ok(None) => {}
            Err(e) => {
                ic_cdk::println!("Error parsing tx {}: {}", tx.txid, e);
            }
        }
    }

    runes
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_runestone_from_script() {
        // OP_RETURN OP_13 <3 bytes of data>
        let script = vec![0x6a, 0x5d, 0x03, 0xAA, 0xBB, 0xCC];

        let data = extract_runestone_from_script(&script).unwrap();
        assert_eq!(data, vec![0xAA, 0xBB, 0xCC]);
    }

    #[test]
    fn test_extract_runestone_invalid() {
        // Not OP_RETURN
        let script1 = vec![0x00, 0x5d, 0x03, 0xAA, 0xBB, 0xCC];
        assert!(extract_runestone_from_script(&script1).is_none());

        // Not OP_13
        let script2 = vec![0x6a, 0x00, 0x03, 0xAA, 0xBB, 0xCC];
        assert!(extract_runestone_from_script(&script2).is_none());

        // Length mismatch
        let script3 = vec![0x6a, 0x5d, 0x10, 0xAA]; // Says 16 bytes but only 1
        assert!(extract_runestone_from_script(&script3).is_none());
    }

    #[test]
    fn test_parse_block_timestamp() {
        // Mock block header with timestamp = 1234567890 (0x499602D2 in hex)
        let mut header = vec![0u8; 80];
        header[68] = 0xD2;
        header[69] = 0x02;
        header[70] = 0x96;
        header[71] = 0x49;

        let timestamp = parse_block_timestamp(&header).unwrap();
        assert_eq!(timestamp, 1234567890);
    }
}
