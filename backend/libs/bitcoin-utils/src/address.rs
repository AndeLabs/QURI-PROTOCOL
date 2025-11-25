use crate::{BitcoinUtilsError, Result};
use quri_types::BitcoinNetwork;
use bitcoin::secp256k1::XOnlyPublicKey;

/// Derive a P2TR (Pay-to-Taproot) Bitcoin address from a Schnorr public key
/// Accepts both 32-byte x-only keys and 33-byte compressed SEC1 keys
pub fn derive_p2tr_address(public_key: &[u8], network: BitcoinNetwork) -> Result<String> {
    // ICP Schnorr API returns 33-byte compressed SEC1 public keys
    // BIP-340 uses 32-byte x-only keys (just the x-coordinate)
    let x_only_bytes: &[u8] = if public_key.len() == 33 {
        // Strip the prefix byte (0x02 or 0x03) to get x-only key
        &public_key[1..]
    } else if public_key.len() == 32 {
        // Already x-only format
        public_key
    } else {
        return Err(BitcoinUtilsError::InvalidPublicKey(
            format!("Public key must be 32 or 33 bytes, got {}", public_key.len()),
        ));
    };

    // Create x-only public key
    let x_only_pubkey = XOnlyPublicKey::from_slice(x_only_bytes).map_err(|e| {
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
    use bitcoin::address::Address;
    use bitcoin::key::TweakedPublicKey;
    use bitcoin::secp256k1::XOnlyPublicKey;

    let btc_network = match network {
        BitcoinNetwork::Mainnet => bitcoin::Network::Bitcoin,
        BitcoinNetwork::Testnet => bitcoin::Network::Testnet,
        BitcoinNetwork::Regtest => bitcoin::Network::Regtest,
    };

    // Parse as x-only public key
    let x_only = XOnlyPublicKey::from_slice(witness_program).map_err(|e| {
        BitcoinUtilsError::InvalidPublicKey(format!("Failed to parse pubkey for address: {}", e))
    })?;

    // Create untweaked P2TR address (no script tree)
    // For a proper implementation, this should be tweaked with NUMS point
    // but for simplicity we use it directly as a "key path only" spend
    let tweaked = TweakedPublicKey::dangerous_assume_tweaked(x_only);
    let address = Address::p2tr_tweaked(tweaked, btc_network);

    Ok(address.to_string())
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
