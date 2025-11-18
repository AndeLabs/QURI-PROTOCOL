use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork as ICPBitcoinNetwork;
use quri_types::BitcoinNetwork;

use crate::parser::BitcoinTx;

/// Fetch block headers from Bitcoin network
/// Note: ICP doesn't expose this API yet
pub async fn fetch_block_headers(
    _network: BitcoinNetwork,
    _start_height: u64,
    _count: u32,
) -> Result<Vec<Vec<u8>>, String> {
    Err("Block headers API not available yet".to_string())
}

/// Fetch transactions for a specific block
/// Note: ICP Bitcoin API doesn't provide full blocks yet
pub async fn fetch_block_transactions(
    _network: BitcoinNetwork,
    _block_height: u64,
) -> Result<Vec<BitcoinTx>, String> {
    Err("Block transactions API not available yet".to_string())
}

/// Mock transaction fetch for testing
pub fn mock_fetch_transactions(_block_height: u64) -> Vec<BitcoinTx> {
    vec![]
}

fn convert_network(network: BitcoinNetwork) -> ICPBitcoinNetwork {
    match network {
        BitcoinNetwork::Mainnet => ICPBitcoinNetwork::Mainnet,
        BitcoinNetwork::Testnet => ICPBitcoinNetwork::Testnet,
        BitcoinNetwork::Regtest => ICPBitcoinNetwork::Regtest,
    }
}

/// HTTP outcall to external Bitcoin explorer (future implementation)
pub async fn fetch_block_via_http(
    _block_height: u64,
    network: BitcoinNetwork,
) -> Result<Vec<BitcoinTx>, String> {
    match network {
        BitcoinNetwork::Regtest => Err("Regtest not supported via HTTP".to_string()),
        _ => Err("HTTP outcalls not yet implemented".to_string()),
    }
}

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
}
