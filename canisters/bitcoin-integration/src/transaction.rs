/*!
 * 🎓 LECCIÓN 7: Construcción de Transacciones Bitcoin con Taproot
 *
 * Este módulo implementa la construcción de transacciones Bitcoin siguiendo
 * BIP-341 (Taproot) y BIP-342 (Tapscript).
 *
 * ## ¿Qué es una Transacción Bitcoin?
 *
 * Una transacción Bitcoin es como un "cheque" que transfiere valor:
 * ```
 * Transacción = {
 *     version: 2,
 *     inputs: [UTXO1, UTXO2, ...],   // "De dónde viene el dinero"
 *     outputs: [Destino1, Destino2], // "A dónde va el dinero"
 *     locktime: 0,                   // "Cuándo es válida"
 * }
 * ```
 *
 * ## Anatomía de una Transacción para Runes
 *
 * Para hacer etching de un Rune, necesitamos una transacción con:
 *
 * ```
 * Input 0:  [UTXO con fondos] ────► Se firma con Schnorr (threshold)
 *           amount: 10,000 sats
 *           script: P2TR (nuestro canister)
 *
 * Output 0: [OP_RETURN]       ────► Runestone (protocolo Runes)
 *           amount: 0 sats
 *           script: OP_RETURN <runestone_data>
 *
 * Output 1: [Change]          ────► Vuelto al canister
 *           amount: 9,500 sats (menos fees)
 *           script: P2TR (nuestro canister)
 * ```
 *
 * ## BIP-341: Taproot Signature Hash
 *
 * ### Diferencias vs Pre-Taproot (SegWit v0)
 *
 * | Feature | Pre-Taproot (BIP-143) | Taproot (BIP-341) |
 * |---------|----------------------|-------------------|
 * | Hash Algo | Double SHA256 | Single SHA256 (tagged) |
 * | Commits to amounts | Solo current input | TODOS los inputs |
 * | Commits to scripts | Solo current script | TODOS los scriptPubKeys |
 * | Signature size | 71-72 bytes (DER) | 64 bytes (Schnorr) |
 * | Malleability | Posible (hash_type) | Previene (implicit SIGHASH_DEFAULT) |
 *
 * ### Ventajas de BIP-341
 *
 * 1. **Seguridad mejorada**: Commits to all input amounts
 *    - Previene "lying to hardware wallets"
 *    - Hardware wallet puede verificar que firma la cantidad correcta
 *
 * 2. **Firmas más compactas**: 64 bytes vs 71-72 bytes
 *    - Ahorra ~8 bytes por input
 *    - En transacciones multi-input, ahorro significativo
 *
 * 3. **Mejor privacidad**: P2TR looks like regular pubkey spend
 *    - No revela si hay script path
 *    - Uniformidad en blockchain
 *
 * ## Formato del Signature Hash Message (SigMsg)
 *
 * El mensaje que firmamos tiene este formato (máximo 206 bytes):
 *
 * ```
 * [hash_type]              1 byte    (0x00 = SIGHASH_DEFAULT)
 * [nVersion]               4 bytes   (version de la tx)
 * [nLockTime]              4 bytes   (locktime de la tx)
 * [sha_prevouts]          32 bytes   (hash de todos los prevouts)
 * [sha_amounts]           32 bytes   (hash de todos los amounts)
 * [sha_scriptpubkeys]     32 bytes   (hash de todos los scriptPubKeys)
 * [sha_sequences]         32 bytes   (hash de todos los sequences)
 * [sha_outputs]           32 bytes   (hash de todos los outputs)
 * [spend_type]             1 byte    (0x00 para key-path)
 * [input_index]            4 bytes   (índice del input actual)
 * ```
 *
 * Total típico: 142 bytes (sin ANYONECANPAY, sin annex)
 *
 * ## Tagged Hashing
 *
 * BIP-341 usa "tagged hashing" para domain separation:
 * ```
 * TapSighash = SHA256(SHA256("TapSighash") || SHA256("TapSighash") || msg)
 * ```
 *
 * Esto previene que un hash usado en un contexto (ej: merkle tree)
 * pueda ser reutilizado en otro contexto (ej: signature).
 */

use bitcoin::blockdata::opcodes;
use bitcoin::hashes::Hash;
use bitcoin::sighash::{Prevouts, SighashCache, TapSighashType};
use bitcoin::transaction::Version;
use bitcoin::{
    Address, Amount, Network, OutPoint, ScriptBuf, Sequence, Transaction, TxIn, TxOut,
    Witness,
};
use quri_types::{BitcoinNetwork, RuneEtching};
use runes_utils::build_runestone;

/// Resultado de construcción de transacción para etching
#[derive(Debug, Clone)]
pub struct EtchingTransaction {
    /// Transacción sin firmar
    pub unsigned_tx: Transaction,
    /// Sighash que debe firmarse con Schnorr
    pub sighash: Vec<u8>,
    /// Índice del input que debe firmarse
    pub input_index: usize,
}

/// Input previo (UTXO) que vamos a gastar
#[derive(Debug, Clone)]
pub struct PreviousOutput {
    /// OutPoint (txid + vout)
    pub outpoint: OutPoint,
    /// Amount en satoshis
    pub amount: u64,
    /// ScriptPubKey del UTXO
    pub script_pubkey: ScriptBuf,
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 1: Construir Transacción para Etching
// ========================================================================

/// Construye una transacción Bitcoin para hacer etching de un Rune
///
/// ## Flujo:
/// 1. Crea input desde UTXO provisto
/// 2. Crea output 0: OP_RETURN con runestone
/// 3. Crea output 1: Change devuelto al canister
/// 4. Calcula sighash según BIP-341
///
/// ## Parámetros:
/// - `etching`: Configuración del Rune a crear
/// - `utxo`: UTXO que gastamos (debe tener fondos suficientes)
/// - `change_address`: Dirección P2TR para recibir el change
/// - `fee_rate`: Fee en satoshis por vbyte
///
/// ## Retorna:
/// - `EtchingTransaction` con la tx sin firmar y el sighash
///
/// ## Ejemplo:
/// ```rust
/// let utxo = PreviousOutput {
///     outpoint: OutPoint { txid, vout: 0 },
///     amount: 10_000,
///     script_pubkey: p2tr_script,
/// };
///
/// let tx_data = build_etching_transaction(
///     &etching,
///     utxo,
///     &change_address,
///     2, // 2 sats/vbyte
/// )?;
///
/// // tx_data.sighash está listo para firmar con Schnorr
/// ```
pub fn build_etching_transaction(
    etching: &RuneEtching,
    utxo: PreviousOutput,
    change_address: &Address,
    fee_rate: u64,
) -> Result<EtchingTransaction, String> {
    // 🎓 PASO 1: Construir el runestone
    // El runestone es la "carga útil" que contiene la metadata del Rune
    let runestone_bytes = build_runestone(etching)
        .map_err(|e| format!("Failed to build runestone: {}", e))?;

    // 🎓 PASO 2: Crear script OP_RETURN
    // OP_RETURN marca el output como "unspendable" (pruneado por nodos)
    // Formato: OP_RETURN OP_13 <runestone_bytes>
    let runestone_script = create_runestone_script(&runestone_bytes)?;

    // 🎓 PASO 3: Crear input desde el UTXO
    let tx_in = TxIn {
        previous_output: utxo.outpoint,
        script_sig: ScriptBuf::new(), // Vacío para Taproot (witness-based)
        sequence: Sequence::ENABLE_RBF_NO_LOCKTIME, // Permite RBF (Replace-By-Fee)
        witness: Witness::new(), // Se llenará después de firmar
    };

    // 🎓 PASO 4: Calcular fee
    // Estimamos el tamaño de la transacción firmada
    let estimated_vsize = estimate_transaction_vsize(&runestone_bytes);
    let fee = estimated_vsize * fee_rate;

    // Verificar que tenemos fondos suficientes
    if utxo.amount < fee {
        return Err(format!(
            "Insufficient funds: have {} sats, need {} sats for fee",
            utxo.amount, fee
        ));
    }

    let change_amount = utxo.amount - fee;

    // 🎓 PASO 5: Crear outputs
    let outputs = vec![
        // Output 0: OP_RETURN con runestone (0 sats)
        TxOut {
            value: Amount::from_sat(0),
            script_pubkey: runestone_script,
        },
        // Output 1: Change de vuelta al canister
        TxOut {
            value: Amount::from_sat(change_amount),
            script_pubkey: change_address.script_pubkey(),
        },
    ];

    // 🎓 PASO 6: Construir transacción sin firmar
    let unsigned_tx = Transaction {
        version: Version::TWO, // BIP-68: permite relative time locks
        lock_time: bitcoin::absolute::LockTime::ZERO, // No locktime
        input: vec![tx_in],
        output: outputs,
    };

    // 🎓 PASO 7: Calcular sighash según BIP-341
    let sighash = compute_taproot_sighash(&unsigned_tx, 0, &utxo)?;

    Ok(EtchingTransaction {
        unsigned_tx,
        sighash,
        input_index: 0,
    })
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 2: Crear Script OP_RETURN para Runestone
// ========================================================================

/// Crea un script OP_RETURN que contiene el runestone
///
/// ## Formato:
/// ```
/// OP_RETURN OP_13 <runestone_bytes>
/// ```
///
/// ## ¿Por qué OP_13?
/// - Es el "magic number" del protocolo Runes
/// - Identifica que este OP_RETURN contiene un runestone
/// - OP_13 pushea el número 13 al stack (0x5D en hex)
///
/// ## ¿Por qué OP_RETURN?
/// - Marca el output como "provably unspendable"
/// - Nodos pueden prunear este output del UTXO set
/// - Más eficiente que usar outputs "spendable" para datos
fn create_runestone_script(runestone_bytes: &[u8]) -> Result<ScriptBuf, String> {
    // 🎓 Construcción del script:
    // 1. OP_RETURN: Marca como unspendable
    // 2. OP_13: Magic number de Runes (0x5D)
    // 3. Push data: Los bytes del runestone
    //
    // Note: Usamos approach manual porque bitcoin 0.31 requiere tipos específicos
    let mut script_bytes = vec![];
    script_bytes.push(opcodes::all::OP_RETURN.to_u8());
    script_bytes.push(opcodes::all::OP_PUSHNUM_13.to_u8()); // Magic: 13

    // Push data length y data
    if runestone_bytes.len() < 76 {
        // OP_PUSHBYTESn for n < 76
        script_bytes.push(runestone_bytes.len() as u8);
        script_bytes.extend_from_slice(runestone_bytes);
    } else {
        return Err("Runestone too large (>75 bytes not yet supported)".to_string());
    }

    Ok(ScriptBuf::from(script_bytes))
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 3: Calcular Taproot Sighash (BIP-341)
// ========================================================================

/// Calcula el signature hash según BIP-341 (Taproot)
///
/// ## BIP-341 Key Points:
/// 1. Usa single SHA256 (no double) con tagged hash
/// 2. Commits a TODOS los amounts de inputs
/// 3. Commits a TODOS los scriptPubKeys
/// 4. Usa SIGHASH_DEFAULT (0x00) para 64-byte signatures
///
/// ## Proceso:
/// ```
/// prevouts = [utxo.outpoint, ...]
/// amounts = [utxo.amount, ...]
/// scripts = [utxo.script_pubkey, ...]
///
/// sighash_cache = SighashCache::new(tx)
/// sighash = sighash_cache.taproot_key_spend_signature_hash(
///     input_index,
///     prevouts,
///     SIGHASH_DEFAULT
/// )
/// ```
fn compute_taproot_sighash(
    tx: &Transaction,
    input_index: usize,
    utxo: &PreviousOutput,
) -> Result<Vec<u8>, String> {
    // 🎓 PASO 1: Crear SighashCache
    // SighashCache optimiza el cálculo cacheando hashes compartidos
    let mut sighash_cache = SighashCache::new(tx);

    // 🎓 PASO 2: Preparar prevouts
    // Prevouts incluye: [outpoint, amount, scriptPubKey] para cada input
    let prevouts = vec![TxOut {
        value: Amount::from_sat(utxo.amount),
        script_pubkey: utxo.script_pubkey.clone(),
    }];

    let prevouts = Prevouts::All(&prevouts);

    // 🎓 PASO 3: Calcular sighash para key-path spending
    // SIGHASH_DEFAULT (0x00) = firma toda la transacción
    // Es equivalente a SIGHASH_ALL pero más eficiente
    let sighash = sighash_cache
        .taproot_key_spend_signature_hash(
            input_index,
            &prevouts,
            TapSighashType::Default, // 0x00
        )
        .map_err(|e| format!("Failed to compute taproot sighash: {}", e))?;

    // Retornar los 32 bytes del hash
    Ok(sighash.as_byte_array().to_vec())
}

// ========================================================================
// 🎓 IMPLEMENTACIÓN 4: Estimación de Transaction Size
// ========================================================================

/// Estima el tamaño virtual (vsize) de la transacción firmada
///
/// ## ¿Qué es vsize?
/// - Virtual size en "virtual bytes" (vbytes)
/// - SegWit usa "weight units": vsize = weight / 4
/// - Witness data cuenta con 1/4 del peso de otros datos
///
/// ## Cálculo para Taproot:
/// ```
/// base_size = tx sin witness (version + inputs + outputs + locktime)
/// witness_size = firmas y witness data
///
/// weight = base_size * 4 + witness_size
/// vsize = ceiling(weight / 4)
/// ```
///
/// ## Componentes:
/// - Version: 4 bytes
/// - Input count: 1 byte (compact int)
/// - Input: 41 bytes (outpoint 36 + script_sig 1 + sequence 4)
/// - Output count: 1 byte
/// - OP_RETURN output: ~40 bytes (variable según runestone)
/// - Change output: ~43 bytes (P2TR)
/// - Locktime: 4 bytes
/// - Witness (Schnorr): ~66 bytes (signature 64 + overhead)
fn estimate_transaction_vsize(runestone_bytes: &[u8]) -> u64 {
    // 🎓 Base transaction (non-witness)
    let base_size: u64 = 4 // version
        + 1 // input count
        + 41 // input
        + 1 // output count
        + 8 // OP_RETURN value
        + 1 // OP_RETURN script length
        + 2 // OP_RETURN + OP_13
        + runestone_bytes.len() as u64 // runestone data
        + 8 // change value
        + 1 // change script length
        + 34 // P2TR script (OP_1 + 32 bytes)
        + 4; // locktime

    // 🎓 Witness data (cuenta 1/4 del peso)
    let witness_size: u64 = 1 // witness stack items count
        + 1 // signature length
        + 64; // Schnorr signature

    // 🎓 Calculate weight y vsize
    let weight = base_size * 4 + witness_size;
    let vsize = (weight + 3) / 4; // Ceiling division

    vsize
}

// ========================================================================
// 🎓 HELPER: Agregar Signature a Transacción
// ========================================================================

/// Agrega la firma Schnorr a la transacción
///
/// Para Taproot key-path spending, el witness es simple:
/// ```
/// witness = [<signature>]
/// ```
///
/// No necesitamos el pubkey porque está implícito en el P2TR output.
pub fn finalize_transaction(
    mut tx: Transaction,
    input_index: usize,
    signature: &[u8],
) -> Result<Transaction, String> {
    if signature.len() != 64 {
        return Err(format!(
            "Invalid Schnorr signature length: {} (expected 64)",
            signature.len()
        ));
    }

    // 🎓 Para Taproot key-path:
    // - Signature de 64 bytes implica SIGHASH_DEFAULT (0x00)
    // - No necesitamos agregar hash_type al final
    // - Solo pusheamos la signature al witness stack
    let mut witness = Witness::new();
    witness.push(signature);

    // Agregar witness al input correspondiente
    if let Some(input) = tx.input.get_mut(input_index) {
        input.witness = witness;
    } else {
        return Err(format!("Input index {} out of bounds", input_index));
    }

    Ok(tx)
}

// ========================================================================
// 🎓 HELPER: Convertir BitcoinNetwork a bitcoin::Network
// ========================================================================

fn convert_network(network: BitcoinNetwork) -> Network {
    match network {
        BitcoinNetwork::Mainnet => Network::Bitcoin,
        BitcoinNetwork::Testnet => Network::Testnet,
        BitcoinNetwork::Regtest => Network::Regtest,
    }
}

// ========================================================================
// 🎓 TESTS EDUCATIVOS
// ========================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use bitcoin::{Transaction, TxIn, TxOut};

    /// Test básico: crear script OP_RETURN
    #[test]
    fn test_create_runestone_script() {
        let runestone = vec![0xAA, 0xBB, 0xCC];
        let script = create_runestone_script(&runestone).unwrap();

        // Verificar que empieza con OP_RETURN
        assert!(script.as_bytes().starts_with(&[0x6A])); // OP_RETURN

        // Verificar que contiene OP_13
        assert!(script.as_bytes().contains(&[0x5D])); // OP_13
    }

    /// Test: estimación de tamaño
    #[test]
    fn test_estimate_vsize() {
        let runestone = vec![0u8; 50]; // 50 bytes
        let vsize = estimate_transaction_vsize(&runestone);

        // Una transacción típica de etching debería ser ~150-200 vbytes
        assert!(vsize > 100 && vsize < 300);
    }
}

// ========================================================================
// 📝 RESUMEN DE CONCEPTOS APRENDIDOS
// ========================================================================
//
// 1. ✅ Transacciones Bitcoin tienen inputs (UTXOs) y outputs
// 2. ✅ Taproot (BIP-341) usa Schnorr signatures de 64 bytes
// 3. ✅ Sighash commits a todos los amounts y scripts (seguridad)
// 4. ✅ OP_RETURN permite embeder datos sin inflar el UTXO set
// 5. ✅ vsize = weight/4, witness data cuenta 1/4 del peso
// 6. ✅ SIGHASH_DEFAULT (0x00) es implícito en signatures de 64 bytes
// 7. ✅ SighashCache optimiza el cálculo de múltiples sighashes
//
// ========================================================================
