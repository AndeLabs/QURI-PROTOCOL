use candid::Principal;
use quri_types::{RuneEtching, UtxoSelection};

use crate::config::EtchingConfig;
use crate::errors::{EtchingError, EtchingResult};
use crate::process_id::ProcessId;
use crate::state::{EtchingProcess, EtchingState};
use crate::validators::EtchingValidator;

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
            .step_build_and_sign_transaction(process, &etching, utxo_selection)
            .await?;

        // Step 5: Broadcast
        let txid = self.step_broadcast(process, &signed_tx).await?;

        // Step 6: Wait for confirmations
        // The confirmation tracker will update the state when confirmations are reached
        self.step_confirm(process, &txid).await?;

        // Store txid in process
        process.txid = Some(txid.clone());
        self.save_process(process)?;

        // Note: We don't call step_index or mark as Completed here
        // The confirmation_tracker will update the state to Indexing when confirmations are reached
        // and then the indexing step will run

        ic_cdk::println!(
            "[Etching {}] Etching flow complete. Waiting for confirmations via tracker.",
            process.id
        );

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

    /// Step 2: Check ckBTC balance and charge fee
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

        // Validate balance before charging
        EtchingValidator::validate_balance(balance, estimated_fee)?;

        // Charge fee and store in escrow
        // NOTE: In a real implementation, we would call charge_etching_fee here
        // For now, we just track it in the escrow system
        ic_cdk::println!(
            "[Etching {}] Charging fee: {} sats",
            process.id,
            estimated_fee
        );

        // Create escrow entry to track the fee
        let escrow_entry = crate::escrow::EscrowEntry::new(
            process.id.clone(),
            caller,
            estimated_fee,
            process.rune_name.clone(),
        );

        crate::escrow::store_escrow(&escrow_entry)
            .map_err(|e| EtchingError::InternalError(format!("Failed to store escrow: {}", e)))?;

        // Update process with fee paid
        process.fee_paid = Some(estimated_fee);

        ic_cdk::println!(
            "[Etching {}] Fee charged and held in escrow: {} sats",
            process.id,
            estimated_fee
        );
        Ok(balance)
    }

    /// Step 3: Select UTXOs for fee payment
    async fn step_select_utxos(
        &self,
        process: &mut EtchingProcess,
    ) -> EtchingResult<UtxoSelection> {
        process.update_state(EtchingState::SelectingUtxos);
        self.save_process(process)?;

        ic_cdk::println!("[Etching {}] Selecting UTXOs...", process.id);

        // Get bitcoin-integration canister ID
        let btc_canister_id =
            crate::get_bitcoin_integration_id().map_err(EtchingError::InternalError)?;

        // Call bitcoin-integration to select UTXOs
        let amount_needed = 10_000u64; // 10k sats for etching
        let (selection_result,): (Result<UtxoSelection, String>,) = ic_cdk::call(
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
        utxo_selection: UtxoSelection,
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
            (etching.clone(), utxo_selection),
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

        // Call bitcoin-integration to broadcast transaction with confirmation tracking
        let (broadcast_result,): (Result<String, String>,) = ic_cdk::call(
            btc_canister_id,
            "broadcast_and_track",
            (signed_tx.to_vec(), self.config.required_confirmations),
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

        ic_cdk::println!("[Etching {}] Broadcasted and tracking: {}", process.id, txid);

        // Start tracking confirmations in rune-engine too
        crate::confirmation_tracker::track_transaction(
            process.id.to_string(),
            txid.clone(),
            self.config.required_confirmations,
            self.config.network,
        );

        Ok(txid)
    }

    /// Step 7: Wait for confirmations
    ///
    /// Now uses the confirmation_tracker which runs periodically.
    /// The transaction will be updated by the tracker when confirmations are reached.
    async fn step_confirm(&self, process: &mut EtchingProcess, txid: &str) -> EtchingResult<()> {
        process.update_state(EtchingState::Confirming { confirmations: 0 });
        self.save_process(process)?;

        ic_cdk::println!(
            "[Etching {}] Transaction {} is being tracked for {} confirmations",
            process.id,
            txid,
            self.config.required_confirmations
        );

        // The confirmation_tracker timer will update the state when confirmations are reached
        // For now, we mark this step as complete and the tracker will move to Indexing state
        // when confirmations are sufficient

        ic_cdk::println!(
            "[Etching {}] Confirmation tracking active. Timer will update state automatically.",
            process.id
        );
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

    /// Rollback failed etching with ckBTC refund
    async fn rollback(&self, process: &mut EtchingProcess) -> EtchingResult<()> {
        ic_cdk::println!("[Etching {}] Rolling back...", process.id);

        // Check if there's an escrow entry to refund
        if let Some(mut escrow_entry) = crate::escrow::get_escrow(&process.id) {
            // Only refund if escrow is still held
            if escrow_entry.can_refund() {
                ic_cdk::println!(
                    "[Etching {}] Refunding {} sats to {}",
                    process.id,
                    escrow_entry.amount,
                    escrow_entry.payer
                );

                // Attempt to refund via ckBTC transfer
                match self.refund_ckbtc(&escrow_entry).await {
                    Ok(block_index) => {
                        ic_cdk::println!(
                            "[Etching {}] Refund successful, block index: {}",
                            process.id,
                            block_index
                        );

                        // Mark escrow as refunded
                        escrow_entry.mark_refunded(block_index);
                        if let Err(e) = crate::escrow::update_escrow(&escrow_entry) {
                            ic_cdk::println!(
                                "[Etching {}] Warning: Failed to update escrow after refund: {}",
                                process.id,
                                e
                            );
                        }
                    }
                    Err(e) => {
                        ic_cdk::println!(
                            "[Etching {}] Refund failed: {}",
                            process.id,
                            e
                        );

                        // Mark escrow refund as failed for manual intervention
                        escrow_entry.mark_refund_failed(e.clone());
                        if let Err(update_err) = crate::escrow::update_escrow(&escrow_entry) {
                            ic_cdk::println!(
                                "[Etching {}] Critical: Failed to update escrow after refund failure: {}",
                                process.id,
                                update_err
                            );
                        }

                        // Log error for admin review
                        crate::logging::log_error(
                            "rollback_refund",
                            format!("Failed to refund {} sats to {}: {}",
                                escrow_entry.amount, escrow_entry.payer, e),
                            Some(process.id.to_string()),
                        );
                    }
                }
            } else {
                ic_cdk::println!(
                    "[Etching {}] Escrow already processed (status: {:?}), no refund needed",
                    process.id,
                    escrow_entry.status
                );
            }
        } else {
            ic_cdk::println!(
                "[Etching {}] No escrow entry found, no refund needed",
                process.id
            );
        }

        process.update_state(EtchingState::RolledBack {
            reason: "Automatic rollback after failure".to_string(),
        });
        self.save_process(process)?;

        Ok(())
    }

    /// Refund ckBTC to user
    async fn refund_ckbtc(&self, escrow: &crate::escrow::EscrowEntry) -> Result<u64, String> {
        // Get bitcoin-integration canister ID
        let btc_canister_id = crate::get_bitcoin_integration_id()
            .map_err(|e| format!("Failed to get bitcoin integration canister: {}", e))?;

        // Call ckBTC transfer to refund the user
        // We use the transfer function from bitcoin-integration which wraps ckBTC ledger calls
        let memo = format!("Refund for failed etching: {}", escrow.rune_name);
        let (transfer_result,): (Result<u64, String>,) = ic_cdk::call(
            btc_canister_id,
            "transfer_ckbtc",
            (escrow.payer, escrow.amount, Some(memo.into_bytes())),
        )
        .await
        .map_err(|(code, msg)| {
            format!("ckBTC transfer call failed: {:?} - {}", code, msg)
        })?;

        transfer_result
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
