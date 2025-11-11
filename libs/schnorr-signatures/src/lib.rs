use secp256k1::{Secp256k1, XOnlyPublicKey};
use sha2::{Digest, Sha256};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SchnorrError {
    #[error("Invalid public key: {0}")]
    InvalidPublicKey(String),

    #[error("Invalid signature: {0}")]
    InvalidSignature(String),

    #[error("Verification failed")]
    VerificationFailed,
}

pub type Result<T> = std::result::Result<T, SchnorrError>;

/// Verify a Schnorr signature
pub fn verify_schnorr_signature(
    public_key: &[u8],
    message: &[u8],
    signature: &[u8],
) -> Result<bool> {
    if public_key.len() != 32 {
        return Err(SchnorrError::InvalidPublicKey(
            "Public key must be 32 bytes".to_string(),
        ));
    }

    if signature.len() != 64 {
        return Err(SchnorrError::InvalidSignature(
            "Signature must be 64 bytes".to_string(),
        ));
    }

    let secp = Secp256k1::new();

    let x_only_pubkey = XOnlyPublicKey::from_slice(public_key)
        .map_err(|e| SchnorrError::InvalidPublicKey(e.to_string()))?;

    let sig = secp256k1::schnorr::Signature::from_slice(signature)
        .map_err(|e| SchnorrError::InvalidSignature(e.to_string()))?;

    // Create message hash
    let msg_hash = Sha256::digest(message);
    let msg = secp256k1::Message::from_digest_slice(&msg_hash)
        .map_err(|e| SchnorrError::InvalidSignature(e.to_string()))?;

    match secp.verify_schnorr(&sig, &msg, &x_only_pubkey) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    }
}

/// Create a BIP340 tagged hash
pub fn tagged_hash(tag: &str, data: &[u8]) -> [u8; 32] {
    let tag_hash = Sha256::digest(tag.as_bytes());
    let mut hasher = Sha256::new();
    hasher.update(&tag_hash);
    hasher.update(&tag_hash);
    hasher.update(data);
    hasher.finalize().into()
}

/// Create a Taproot sighash (simplified)
pub fn create_taproot_sighash(tx: &[u8], input_index: usize) -> [u8; 32] {
    // This is a simplified version
    // In production, implement full BIP341 sighash algorithm

    let mut data = Vec::new();
    data.extend_from_slice(tx);
    data.extend_from_slice(&input_index.to_le_bytes());

    tagged_hash("TapSighash", &data)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tagged_hash() {
        let hash1 = tagged_hash("test", b"data");
        let hash2 = tagged_hash("test", b"data");
        assert_eq!(hash1, hash2);

        let hash3 = tagged_hash("different", b"data");
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_invalid_signature_length() {
        let pubkey = vec![0u8; 32];
        let message = b"test message";
        let sig = vec![0u8; 63]; // Wrong length

        assert!(verify_schnorr_signature(&pubkey, message, &sig).is_err());
    }
}
