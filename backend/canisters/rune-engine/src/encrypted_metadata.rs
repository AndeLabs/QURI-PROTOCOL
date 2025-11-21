//! Encrypted Metadata Module (vetKeys)
//!
//! Provides encrypted storage for Rune metadata using ICP's vetKeys system.
//! Metadata can be time-locked for reveals.
//!
//! Key feature for ICP Bitcoin DeFi Hackathon.

use candid::{CandidType, Deserialize, Principal};
use ic_cdk::api::time;
use std::cell::RefCell;
use std::collections::BTreeMap;

use quri_types::{EncryptedRuneMetadata, StoreEncryptedMetadataParams};

use crate::errors::EngineError;

// vetKD API types (not yet in stable ic-cdk)
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VetKDPublicKeyRequest {
    pub canister_id: Option<Principal>,
    pub derivation_path: Vec<Vec<u8>>,
    pub key_id: VetKDKeyId,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VetKDPublicKeyResponse {
    pub public_key: Vec<u8>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VetKDDeriveEncryptedKeyRequest {
    pub derivation_id: Vec<u8>,
    pub derivation_path: Vec<Vec<u8>>,
    pub encryption_public_key: Vec<u8>,
    pub key_id: VetKDKeyId,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VetKDDeriveEncryptedKeyResponse {
    pub encrypted_key: Vec<u8>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct VetKDKeyId {
    pub curve: VetKDCurve,
    pub name: String,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum VetKDCurve {
    #[serde(rename = "bls12_381_g2")]
    Bls12_381_G2,
}

// Thread-local storage for encrypted metadata
thread_local! {
    static ENCRYPTED_METADATA: RefCell<BTreeMap<String, EncryptedRuneMetadata>> = RefCell::new(BTreeMap::new());
}

// vetKD key configuration
const VETKD_KEY_NAME: &str = "quri_metadata_key";

/// Store encrypted metadata for a Rune
pub fn store_metadata(params: StoreEncryptedMetadataParams) -> Result<(), EngineError> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err(EngineError::Unauthorized(
            "Anonymous principals cannot store metadata".to_string()
        ));
    }

    if params.encrypted_data.is_empty() {
        return Err(EngineError::InvalidInput(
            "Encrypted data cannot be empty".to_string()
        ));
    }

    let metadata = EncryptedRuneMetadata {
        rune_id: params.rune_id.clone(),
        encrypted_data: params.encrypted_data,
        nonce: params.nonce,
        reveal_time: params.reveal_time,
        owner: caller,
        created_at: time(),
    };

    ENCRYPTED_METADATA.with(|m| {
        m.borrow_mut().insert(params.rune_id, metadata);
    });

    Ok(())
}

/// Get encrypted metadata (returns encrypted data, not decrypted)
pub fn get_metadata(rune_id: &str) -> Option<EncryptedRuneMetadata> {
    ENCRYPTED_METADATA.with(|m| {
        m.borrow().get(rune_id).cloned()
    })
}

/// Check if caller can decrypt metadata
/// - Owner can always decrypt
/// - Others can decrypt after reveal_time
pub fn can_decrypt(rune_id: &str) -> Result<bool, EngineError> {
    let caller = ic_cdk::caller();
    let now = time();

    ENCRYPTED_METADATA.with(|m| {
        let metadata = m.borrow()
            .get(rune_id)
            .cloned()
            .ok_or(EngineError::NotFound("Metadata not found".to_string()))?;

        // Owner can always decrypt
        if metadata.owner == caller {
            return Ok(true);
        }

        // Others can decrypt after reveal time
        if let Some(reveal_time) = metadata.reveal_time {
            if now >= reveal_time {
                return Ok(true);
            }
        }

        Ok(false)
    })
}

/// Get the vetKD public key for encryption
/// This calls the management canister's vetKD API
pub async fn get_public_key() -> Result<Vec<u8>, EngineError> {
    let key_id = VetKDKeyId {
        curve: VetKDCurve::Bls12_381_G2,
        name: VETKD_KEY_NAME.to_string(),
    };

    let request = VetKDPublicKeyRequest {
        canister_id: None,
        derivation_path: vec![b"quri_rune_metadata".to_vec()],
        key_id,
    };

    let management_canister = Principal::management_canister();

    match ic_cdk::call::<_, (VetKDPublicKeyResponse,)>(
        management_canister,
        "vetkd_public_key",
        (request,),
    )
    .await
    {
        Ok((response,)) => Ok(response.public_key),
        Err((code, msg)) => Err(EngineError::ExternalCall(format!(
            "vetKD public key failed: {:?} - {}",
            code, msg
        ))),
    }
}

/// Get encrypted decryption key for authorized caller
/// The caller must be authorized to decrypt
pub async fn get_encrypted_decryption_key(
    rune_id: String,
    encryption_public_key: Vec<u8>,
) -> Result<Vec<u8>, EngineError> {
    // Check authorization
    if !can_decrypt(&rune_id)? {
        return Err(EngineError::Unauthorized(
            "Not authorized to decrypt this metadata".to_string(),
        ));
    }

    let key_id = VetKDKeyId {
        curve: VetKDCurve::Bls12_381_G2,
        name: VETKD_KEY_NAME.to_string(),
    };

    let request = VetKDDeriveEncryptedKeyRequest {
        derivation_id: rune_id.as_bytes().to_vec(),
        derivation_path: vec![b"quri_rune_metadata".to_vec()],
        key_id,
        encryption_public_key,
    };

    let management_canister = Principal::management_canister();

    match ic_cdk::call::<_, (VetKDDeriveEncryptedKeyResponse,)>(
        management_canister,
        "vetkd_derive_encrypted_key",
        (request,),
    )
    .await
    {
        Ok((response,)) => Ok(response.encrypted_key),
        Err((code, msg)) => Err(EngineError::ExternalCall(format!(
            "vetKD derive key failed: {:?} - {}",
            code, msg
        ))),
    }
}

/// Delete encrypted metadata (owner only)
pub fn delete_metadata(rune_id: &str) -> Result<(), EngineError> {
    let caller = ic_cdk::caller();

    ENCRYPTED_METADATA.with(|m| {
        let mut metadata_map = m.borrow_mut();

        let metadata = metadata_map.get(rune_id)
            .ok_or(EngineError::NotFound("Metadata not found".to_string()))?;

        if metadata.owner != caller {
            return Err(EngineError::Unauthorized(
                "Only owner can delete metadata".to_string()
            ));
        }

        metadata_map.remove(rune_id);
        Ok(())
    })
}

/// Get all metadata for caller
pub fn get_my_metadata() -> Vec<EncryptedRuneMetadata> {
    let caller = ic_cdk::caller();

    ENCRYPTED_METADATA.with(|m| {
        m.borrow()
            .values()
            .filter(|meta| meta.owner == caller)
            .cloned()
            .collect()
    })
}

/// Check if metadata exists for a Rune
pub fn has_metadata(rune_id: &str) -> bool {
    ENCRYPTED_METADATA.with(|m| {
        m.borrow().contains_key(rune_id)
    })
}

/// Get metadata reveal status
pub fn get_reveal_status(rune_id: &str) -> Option<(bool, Option<u64>)> {
    let now = time();

    ENCRYPTED_METADATA.with(|m| {
        m.borrow().get(rune_id).map(|meta| {
            let is_revealed = meta.reveal_time
                .map(|t| now >= t)
                .unwrap_or(false);
            (is_revealed, meta.reveal_time)
        })
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_store_and_retrieve_metadata() {
        let params = StoreEncryptedMetadataParams {
            rune_id: "TEST".to_string(),
            encrypted_data: vec![1, 2, 3, 4],
            nonce: vec![5, 6, 7, 8],
            reveal_time: None,
        };

        // Note: This test won't work in unit tests because ic_cdk::caller()
        // requires canister context. This is just for structure verification.
    }
}
