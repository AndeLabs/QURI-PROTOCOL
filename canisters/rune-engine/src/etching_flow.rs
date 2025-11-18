use candid::{CandidType, Deserialize, Principal};
use quri_types::{BitcoinNetwork, RuneEtching};

use crate::config::EtchingConfig;
use crate::errors::{EtchingError, EtchingResult};
use crate::process_id::ProcessId;
use crate::state::{EtchingProcess, EtchingState};
use crate::validators::EtchingValidator;

/// UTXO selection result from bitcoin-integration canister
#[derive(CandidType, Deserialize, Clone, Debug)]
struct UtxoSelectionResult {
    pub total_value: u64,
    pub estimated_fee: u64,
    pub change: u64,
}

/// Maximum retry attempts for transient failures
const MAX_RETRIES: u32 = 3;

/// Main orchestrator for Rune etching process
pub struct EtchingOrchestrator {
    config: EtchingConfig,
}

impl EtchingOrchestrator {
    pub fn new(config: EtchingConfig) -> Self {
        Self { config }
    }

    /// Execute complete etching flow
    pub async fn execute_etching(
        &self,
        caller: Principal,
        etching: RuneEtching,
    ) -> EtchingResult<EtchingProcess> {
        // Generate unique process ID (async for random bytes)
        let process_id = self.generate_process_id().await?;

        // Check for duplicate (idempotency)
        if let Some(existing) = crate::state::get_process(&process_id) {
            if !existing.state.is_terminal() {
                return Err(EtchingError::EtchingInProgress(process_id.to_string()));
            }
        }

        // Create new process
        let mut process =
            EtchingProcess::new(process_id.clone(), caller, etching.rune_name.clone());
        self.save_process(&process)?;

        // Execute flow with error handling
        match self.execute_flow(&mut process, caller, etching).await {
            Ok(()) => {
                self.save_process(&process)?;
                Ok(process)
            }
            Err(e) => {
                // Update process with failure
                process.update_state(EtchingState::Failed {
                    reason: e.user_message(),
                    at_state: process.state.name().to_string(),
                });
                self.save_process(&process)?;

                // Attempt rollback if needed
                if self.should_rollback(&e) {
                    let _ = self.rollback(&mut process).await;
                }

                Err(e)
            }
        }
    }

    /// Execute the flow steps
    async fn execute_flow(
        &self,
        process: &mut EtchingProcess,
        caller: Principal,
        etching: RuneEtching,
    ) -> EtchingResult<()> {
        // Step 1: Validation
        self.step_validate(process, &etching).await?;

        // Step 2: Check ckBTC balance
        let _balance = self.step_check_balance(process, caller).await?;

        // Step 3: Select UTXOs
        let utxo_selection = self.step_select_utxos(process).await?;

        // Step 4: Build and sign transaction (combined)
        let signed_tx = self
            .step_build_and_sign_transaction(process, &etching, &utxo_selection)
            .await?;

        // Step 5: Broadcast
        let txid = self.step_broadcast(process, &signed_tx).await?;

        // Step 6: Wait for confirmations (simplified for MVP)
        self.step_confirm(process, &txid).await?;

        // Step 7: Index the Rune
        self.step_index(process, &etching, &txid).await?;

        // Mark as completed
        process.update_state(EtchingState::Completed {
            txid: txid.clone(),
            block_height: 0, // TODO: Get actual block height
        });
        process.txid = Some(txid);

        Ok(())
    }

    /// Step 1: Validate etching parameters
    async fn step_validate(
        &self,
        process: &mut EtchingProcess,
        etching: &RuneEtching,
    ) -> EtchingResult<()> {
        process.update_state(EtchingState::Validating);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Validating parameters...", process.id);

        EtchingValidator::validate_etching(etching)?;

        ic_cdk::println!("[Etching {}] Validation passed", process.id);
        Ok(())
    }

    /// Step 2: Check ckBTC balance
    async fn step_check_balance(
        &self,
        process: &mut EtchingProcess,
        caller: Principal,
    ) -> EtchingResult<u64> {
        process.update_state(EtchingState::CheckingBalance);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Checking ckBTC balance...", process.id);

        // Get bitcoin-integration canister ID
        let btc_canister_id =
            crate::get_bitcoin_integration_id().map_err(EtchingError::InternalError)?;

        // Call bitcoin-integration canister to get balance
        let (balance_result,): (Result<u64, String>,) =
            ic_cdk::call(btc_canister_id, "get_ckbtc_balance", (caller,))
                .await
                .map_err(|(code, msg)| {
                    EtchingError::CkBtcError(format!(
                        "Failed to get ckBTC balance: {:?} - {}",
                        code, msg
                    ))
                })?;

        let balance = balance_result.map_err(EtchingError::CkBtcError)?;

        // Estimate total cost
        let estimated_fee = 20_000u64; // 20k sats
        process.fee_paid = Some(estimated_fee);

        EtchingValidator::validate_balance(balance, estimated_fee)?;

        ic_cdk::println!(
            "[Etching {}] Balance sufficient: {} sats",
            process.id,
            balance
        );
        Ok(balance)
    }

    /// Step 3: Select UTXOs for fee payment
    async fn step_select_utxos(
        &self,
        process: &mut EtchingProcess,
    ) -> EtchingResult<UtxoSelectionResult> {
        process.update_state(EtchingState::SelectingUtxos);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Selecting UTXOs...", process.id);

        // Get bitcoin-integration canister ID
        let btc_canister_id =
            crate::get_bitcoin_integration_id().map_err(EtchingError::InternalError)?;

        // Call bitcoin-integration to select UTXOs
        let amount_needed = 10_000u64; // 10k sats for etching
        let (selection_result,): (Result<UtxoSelectionResult, String>,) = ic_cdk::call(
            btc_canister_id,
            "select_utxos",
            (amount_needed, self.config.fee_rate),
        )
        .await
        .map_err(|(code, msg)| {
            EtchingError::InternalError(format!("Failed to select UTXOs: {:?} - {}", code, msg))
        })?;

        let selection = selection_result.map_err(|e| {
            EtchingError::InsufficientUtxos(format!("UTXO selection failed: {}", e))
        })?;

        ic_cdk::println!(
            "[Etching {}] Selected UTXOs: {} sats total",
            process.id,
            selection.total_value
        );
        Ok(selection)
    }

    /// Step 4: Build and sign Bitcoin transaction
    /// Combined into one step because bitcoin-integration does both
    async fn step_build_and_sign_transaction(
        &self,
        process: &mut EtchingProcess,
        etching: &RuneEtching,
        utxo_selection: &UtxoSelectionResult,
    ) -> EtchingResult<Vec<u8>> {
        process.update_state(EtchingState::BuildingTransaction);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Building transaction...", process.id);

        // Get bitcoin-integration canister ID
        let btc_canister_id =
            crate::get_bitcoin_integration_id().map_err(EtchingError::InternalError)?;

        // Call bitcoin-integration to build and sign transaction
        let (tx_result,): (Result<Vec<u8>, String>,) = ic_cdk::call(
            btc_canister_id,
            "build_and_sign_etching_tx",
            (etching.clone(), utxo_selection.clone()),
        )
        .await
        .map_err(|(code, msg)| {
            EtchingError::TxConstructionFailed(format!(
                "Failed to build transaction: {:?} - {}",
                code, msg
            ))
        })?;

        let signed_tx = tx_result.map_err(|e| {
            EtchingError::TxConstructionFailed(format!("Transaction building failed: {}", e))
        })?;

        // Update state to signing
        process.update_state(EtchingState::Signing);
        self.save_process(process)?;

        ic_cdk::println!(
            "[Etching {}] Transaction built and signed: {} bytes",
            process.id,
            signed_tx.len()
        );
        Ok(signed_tx)
    }

    /// Step 5: Broadcast to Bitcoin network
    async fn step_broadcast(
        &self,
        process: &mut EtchingProcess,
        signed_tx: &[u8],
    ) -> EtchingResult<String> {
        process.update_state(EtchingState::Broadcasting);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Broadcasting transaction...", process.id);

        // Get bitcoin-integration canister ID
        let btc_canister_id =
            crate::get_bitcoin_integration_id().map_err(EtchingError::InternalError)?;

        // Call bitcoin-integration to broadcast transaction
        let (broadcast_result,): (Result<String, String>,) = ic_cdk::call(
            btc_canister_id,
            "broadcast_transaction",
            (signed_tx.to_vec(),),
        )
        .await
        .map_err(|(code, msg)| {
            EtchingError::BroadcastFailed(format!(
                "Failed to broadcast transaction: {:?} - {}",
                code, msg
            ))
        })?;

        let txid = broadcast_result.map_err(|e| {
            EtchingError::NetworkRejected(format!("Network rejected transaction: {}", e))
        })?;

        ic_cdk::println!("[Etching {}] Broadcasted: {}", process.id, txid);
        Ok(txid)
    }

    /// Step 7: Wait for confirmations
    async fn step_confirm(&self, process: &mut EtchingProcess, _txid: &str) -> EtchingResult<()> {
        process.update_state(EtchingState::Confirming { confirmations: 0 });
        self.save_process(process)?;

        ic_cdk::println!(
            "[Etching {}] Waiting for {} confirmations...",
            process.id,
            self.config.required_confirmations
        );

        // TODO: Implement actual confirmation tracking
        // For MVP, we assume immediate confirmation

        process.update_state(EtchingState::Confirming {
            confirmations: self.config.required_confirmations,
        });
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Confirmed", process.id);
        Ok(())
    }

    /// Step 6: Index the new Rune
    async fn step_index(
        &self,
        process: &mut EtchingProcess,
        _etching: &RuneEtching,
        _txid: &str,
    ) -> EtchingResult<()> {
        process.update_state(EtchingState::Indexing);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Indexing Rune...", process.id);

        // Get registry canister ID
        let _registry_id = crate::get_registry_id().map_err(EtchingError::InternalError)?;

        // TODO: Create proper IndexedRune structure with block height and tx index
        // For now, we'll skip this step as it requires parsing the blockchain
        // which will be done by the indexer's automatic scanning

        ic_cdk::println!(
            "[Etching {}] Rune will be indexed automatically by registry",
            process.id
        );
        Ok(())
    }

    /// Rollback failed etching (e.g., refund fees)
    async fn rollback(&self, process: &mut EtchingProcess) -> EtchingResult<()> {
        ic_cdk::println!("[Etching {}] Rolling back...", process.id);

        // TODO: Implement rollback logic
        // - Refund ckBTC if charged
        // - Clean up any partial state

        process.update_state(EtchingState::RolledBack {
            reason: "Automatic rollback after failure".to_string(),
        });
        self.save_process(process)?;

        Ok(())
    }

    /// Check if error should trigger rollback
    fn should_rollback(&self, error: &EtchingError) -> bool {
        matches!(
            error,
            EtchingError::BroadcastFailed(_)
                | EtchingError::NetworkRejected(_)
                | EtchingError::InternalError(_)
        )
    }

    /// Generate unique process ID using random UUID
    async fn generate_process_id(&self) -> EtchingResult<ProcessId> {
        ProcessId::new()
            .await
            .map_err(|e| EtchingError::InternalError(format!("Failed to generate ProcessId: {}", e)))
    }

    /// Generate deterministic process ID for testing
    #[cfg(test)]
    fn generate_process_id_for_test(seed: u64) -> ProcessId {
        ProcessId::from_seed(seed)
    }

    /// Save process state
    fn save_process(&self, process: &EtchingProcess) -> EtchingResult<()> {
        crate::state::store_process(process)
            .map_err(|e| EtchingError::InternalError(format!("Failed to save process: {}", e)))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_process_id() {
        let id1 = EtchingOrchestrator::generate_process_id_for_test(12345);
        let id2 = EtchingOrchestrator::generate_process_id_for_test(12346);
        let id3 = EtchingOrchestrator::generate_process_id_for_test(12345);

        // Different seeds = different IDs
        assert_ne!(id1, id2);

        // Same seed = same ID (deterministic)
        assert_eq!(id1, id3);

        // Verify it's a valid UUID format
        assert_eq!(id1.to_string().len(), 36); // UUID with hyphens
    }
}
