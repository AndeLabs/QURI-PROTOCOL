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

const SCHNORR_ALGORITHM: &str = "bip340secp256k1";
const SCHNORR_KEY_ID: &str = "dfx_test_key";

/// Obtiene la public key Schnorr del canister
pub async fn get_schnorr_public_key(
    derivation_path: Vec<Vec<u8>>,
) -> Result<Vec<u8>, String> {
    #[derive(candid::CandidType)]
    struct SchnorrPublicKeyArgs {
        canister_id: Option<Principal>,
        derivation_path: Vec<Vec<u8>>,
        key_id: SchnorrKeyId,
    }

    #[derive(candid::CandidType)]
    struct SchnorrKeyId {
        algorithm: String,
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
            algorithm: SCHNORR_ALGORITHM.to_string(),
            name: SCHNORR_KEY_ID.to_string(),
        },
    };

    let (result,): (SchnorrPublicKeyResult,) = ic_cdk::call(
        Principal::management_canister(),
        "schnorr_public_key",
        (args,),
    )
    .await
    .map_err(|(code, msg)| {
        format!(
            "Failed to get Schnorr public key: {:?} - {}",
            code, msg
        )
    })?;

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
        key_id: SchnorrKeyId,
    }

    #[derive(candid::CandidType)]
    struct SchnorrKeyId {
        algorithm: String,
        name: String,
    }

    #[derive(candid::CandidType, candid::Deserialize)]
    struct SignWithSchnorrResult {
        signature: Vec<u8>,
    }

    let args = SignWithSchnorrArgs {
        message,
        derivation_path,
        key_id: SchnorrKeyId {
            algorithm: SCHNORR_ALGORITHM.to_string(),
            name: SCHNORR_KEY_ID.to_string(),
        },
    };

    let (result,): (SignWithSchnorrResult,) = ic_cdk::call(
        Principal::management_canister(),
        "sign_with_schnorr",
        (args,),
    )
    .await
    .map_err(|(code, msg)| {
        format!("Failed to sign with Schnorr: {:?} - {}", code, msg)
    })?;

    Ok(result.signature)
}

/// Firma una transacción Bitcoin (placeholder)
pub async fn sign_transaction(tx: Vec<u8>) -> Result<Vec<u8>, String> {
    let derivation_path = vec![ic_cdk::api::id().as_slice().to_vec()];
    let _ = sign_message(tx.clone(), derivation_path).await?;
    Ok(tx)
}
