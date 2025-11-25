/*!
 * 🎓 LECCIÓN 4: Threshold Schnorr Signatures en ICP
 *
 * Este módulo maneja las firmas Schnorr usando threshold cryptography de ICP.
 *
 * ## ¿Qué es Threshold Cryptography?
 *
 * En sistemas tradicionales, una sola private key firma transacciones:
 * ```
 * Private Key → Signature
 * ❌ Si la key se compromete = fondos perdidos
 * ❌ Single point of failure
 * ```
 *
 * Con threshold cryptography, la key está distribuida entre múltiples nodos:
 * ```
 * Node 1 (shard 1) ─┐
 * Node 2 (shard 2) ─┤→ Threshold Signature (2/3 required)
 * Node 3 (shard 3) ─┘
 *
 * ✅ No single point of failure
 * ✅ Key nunca existe completa en un solo lugar
 * ✅ Requiere consenso (ej: 2 de 3 nodos)
 * ```
 *
 * ## Por Qué Usamos Schnorr para Runes?
 *
 * 1. **Taproot**: Runes usan Taproot (P2TR addresses)
 * 2. **Eficiencia**: Firmas más compactas (64 bytes)
 * 3. **Estándar**: BIP-340 es el estándar Bitcoin moderno
 */

use candid::Principal;
use crate::config::{get_schnorr_key_id, get_schnorr_cycles_cost};

/// Schnorr algorithm variant - must match ICP management canister API
#[derive(candid::CandidType, Clone, serde::Deserialize)]
enum SchnorrAlgorithm {
    #[serde(rename = "bip340secp256k1")]
    Bip340Secp256k1,
    #[serde(rename = "ed25519")]
    Ed25519,
}

/// Obtiene la public key Schnorr del canister
pub async fn get_schnorr_public_key(derivation_path: Vec<Vec<u8>>) -> Result<Vec<u8>, String> {
    #[derive(candid::CandidType)]
    struct SchnorrPublicKeyArgs {
        canister_id: Option<Principal>,
        derivation_path: Vec<Vec<u8>>,
        key_id: SchnorrKeyId,
    }

    #[derive(candid::CandidType)]
    struct SchnorrKeyId {
        algorithm: SchnorrAlgorithm,
        name: String,
    }

    #[derive(candid::CandidType, candid::Deserialize)]
    struct SchnorrPublicKeyResult {
        public_key: Vec<u8>,
        chain_code: Vec<u8>,
    }

    let args = SchnorrPublicKeyArgs {
        canister_id: None,
        derivation_path,
        key_id: SchnorrKeyId {
            algorithm: SchnorrAlgorithm::Bip340Secp256k1,
            name: get_schnorr_key_id().to_string(),
        },
    };

    // Call with cycle payment
    let (result,): (SchnorrPublicKeyResult,) = ic_cdk::api::call::call_with_payment128(
        Principal::management_canister(),
        "schnorr_public_key",
        (args,),
        get_schnorr_cycles_cost(),
    )
    .await
    .map_err(|(code, msg)| format!("Failed to get Schnorr public key: {:?} - {}", code, msg))?;

    Ok(result.public_key)
}

/// Firma un mensaje con la private key Schnorr del canister
pub async fn sign_message(
    message: Vec<u8>,
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    #[derive(candid::CandidType)]
    struct SignWithSchnorrArgs {
        message: Vec<u8>,
        derivation_path: Vec<Vec<u8>>,
        key_id: SignSchnorrKeyId,
    }

    #[derive(candid::CandidType)]
    struct SignSchnorrKeyId {
        algorithm: SchnorrAlgorithm,
        name: String,
    }

    #[derive(candid::CandidType, candid::Deserialize)]
    struct SignWithSchnorrResult {
        signature: Vec<u8>,
    }

    let args = SignWithSchnorrArgs {
        message,
        derivation_path,
        key_id: SignSchnorrKeyId {
            algorithm: SchnorrAlgorithm::Bip340Secp256k1,
            name: get_schnorr_key_id().to_string(),
        },
    };

    // Call with cycle payment
    let (result,): (SignWithSchnorrResult,) = ic_cdk::api::call::call_with_payment128(
        Principal::management_canister(),
        "sign_with_schnorr",
        (args,),
        get_schnorr_cycles_cost(),
    )
    .await
    .map_err(|(code, msg)| format!("Failed to sign with Schnorr: {:?} - {}", code, msg))?;

    Ok(result.signature)
}

