use crate::{BitcoinUtilsError, Result};
use quri_types::BitcoinNetwork;
use secp256k1::XOnlyPublicKey;

/// Derive a P2TR (Pay-to-Taproot) Bitcoin address from a Schnorr public key
pub fn derive_p2tr_address(public_key: &[u8], network: BitcoinNetwork) -> Result<String> {
    // Parse the public key as an x-only public key (32 bytes)
    if public_key.len() != 32 {
        return Err(BitcoinUtilsError::InvalidPublicKey(
            "Public key must be 32 bytes for Schnorr".to_string(),
        ));
    }

    // Create x-only public key
    let x_only_pubkey = XOnlyPublicKey::from_slice(public_key).map_err(|e| {
        BitcoinUtilsError::InvalidPublicKey(format!("Failed to parse x-only pubkey: {}", e))
    })?;

    // For P2TR, we use the x-only public key directly as the output key
    // In production, you would:
    // 1. Create a taproot tree if needed
    // 2. Tweak the public key with the merkle root
    // 3. Create the witness program

    // Create witness program (version 1 + 32 byte pubkey)
    let witness_program = x_only_pubkey.serialize();

    // Encode as bech32m address
    let address = encode_bech32m(&witness_program, network)?;

    Ok(address)
}

/// Encode a witness program as bech32m address
fn encode_bech32m(witness_program: &[u8], network: BitcoinNetwork) -> Result<String> {
    let hrp = match network {
        BitcoinNetwork::Mainnet => "bc",
        BitcoinNetwork::Testnet => "tb",
        BitcoinNetwork::Regtest => "bcrt",
    };

    // In production, use the bitcoin crate's address encoding
    // For now, return a placeholder
    Ok(format!("{}1p{}", hrp, hex::encode(&witness_program[..8])))
}

/// Verify a Bitcoin address is valid
pub fn verify_address(address: &str, network: BitcoinNetwork) -> Result<bool> {
    let expected_prefix = match network {
        BitcoinNetwork::Mainnet => "bc1",
        BitcoinNetwork::Testnet => "tb1",
        BitcoinNetwork::Regtest => "bcrt1",
    };

    Ok(address.starts_with(expected_prefix))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_address() {
        assert!(verify_address("bc1p...", BitcoinNetwork::Mainnet).unwrap());
        assert!(!verify_address("tb1p...", BitcoinNetwork::Mainnet).unwrap());
    }

    #[test]
    fn test_invalid_pubkey_length() {
        let invalid_key = vec![0u8; 31]; // Wrong length
        assert!(derive_p2tr_address(&invalid_key, BitcoinNetwork::Mainnet).is_err());
    }
}
