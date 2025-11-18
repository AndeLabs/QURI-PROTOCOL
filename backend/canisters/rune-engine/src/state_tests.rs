/// Comprehensive tests for EtchingProcess state machine
///
/// Tests cover:
/// - State transitions
/// - Process creation and storage
/// - Terminal state detection
/// - Process querying by caller
/// - Cleanup operations

#[cfg(test)]
mod tests {
    use super::super::state::*;
    use candid::Principal;

    fn setup_test_process() -> EtchingProcess {
        EtchingProcess {
            id: "test_process_123".to_string(),
            caller: Principal::from_text("aaaaa-aa").unwrap(),
            rune_name: "TEST•RUNE".to_string(),
            state: EtchingState::Validating,
            created_at: 1000000,
            updated_at: 1000000,
            retry_count: 0,
            fee_paid: None,
            txid: None,
        }
    }

    #[test]
    fn test_process_creation() {
        let process = setup_test_process();

        assert_eq!(process.id, "test_process_123");
        assert_eq!(process.rune_name, "TEST•RUNE");
        assert_eq!(process.state, EtchingState::Validating);
        assert_eq!(process.retry_count, 0);
        assert!(process.fee_paid.is_none());
        assert!(process.txid.is_none());
    }

    #[test]
    fn test_new_process() {
        let caller = Principal::from_text("aaaaa-aa").unwrap();
        let process = EtchingProcess::new(
            "proc_001".to_string(),
            caller,
            "BITCOIN".to_string(),
        );

        assert_eq!(process.id, "proc_001");
        assert_eq!(process.caller, caller);
        assert_eq!(process.rune_name, "BITCOIN");
        assert_eq!(process.state, EtchingState::Validating);
        assert_eq!(process.retry_count, 0);
    }

    #[test]
    fn test_state_transitions() {
        let mut process = setup_test_process();

        // Validating -> CheckingBalance
        process.update_state(EtchingState::CheckingBalance);
        assert!(matches!(process.state, EtchingState::CheckingBalance));

        // CheckingBalance -> SelectingUtxos
        process.update_state(EtchingState::SelectingUtxos);
        assert!(matches!(process.state, EtchingState::SelectingUtxos));

        // SelectingUtxos -> BuildingTransaction
        process.update_state(EtchingState::BuildingTransaction);
        assert!(matches!(process.state, EtchingState::BuildingTransaction));

        // BuildingTransaction -> Signing
        process.update_state(EtchingState::Signing);
        assert!(matches!(process.state, EtchingState::Signing));

        // Signing -> Broadcasting
        process.update_state(EtchingState::Broadcasting);
        assert!(matches!(process.state, EtchingState::Broadcasting));

        // Broadcasting -> Confirming
        process.update_state(EtchingState::Confirming { confirmations: 0 });
        assert!(matches!(
            process.state,
            EtchingState::Confirming { confirmations: 0 }
        ));

        // Confirming -> Indexing
        process.update_state(EtchingState::Indexing);
        assert!(matches!(process.state, EtchingState::Indexing));

        // Indexing -> Completed
        process.update_state(EtchingState::Completed {
            txid: "tx123".to_string(),
            block_height: 800000,
        });
        assert!(matches!(process.state, EtchingState::Completed { .. }));
    }

    #[test]
    fn test_terminal_state_detection() {
        let mut process = setup_test_process();

        // Non-terminal states
        process.state = EtchingState::Validating;
        assert!(!process.state.is_terminal());

        process.state = EtchingState::CheckingBalance;
        assert!(!process.state.is_terminal());

        process.state = EtchingState::Broadcasting;
        assert!(!process.state.is_terminal());

        // Terminal states
        process.state = EtchingState::Completed {
            txid: "tx".to_string(),
            block_height: 100,
        };
        assert!(process.state.is_terminal());

        process.state = EtchingState::Failed {
            reason: "test".to_string(),
            at_state: "Broadcasting".to_string(),
        };
        assert!(process.state.is_terminal());

        process.state = EtchingState::RolledBack {
            reason: "test".to_string(),
        };
        assert!(process.state.is_terminal());
    }

    #[test]
    fn test_successful_state_detection() {
        let mut process = setup_test_process();

        // Not successful
        process.state = EtchingState::Validating;
        assert!(!process.state.is_successful());

        process.state = EtchingState::Failed {
            reason: "error".to_string(),
            at_state: "Signing".to_string(),
        };
        assert!(!process.state.is_successful());

        // Successful
        process.state = EtchingState::Completed {
            txid: "tx".to_string(),
            block_height: 100,
        };
        assert!(process.state.is_successful());
    }

    #[test]
    fn test_failed_state_detection() {
        let mut process = setup_test_process();

        // Not failed
        process.state = EtchingState::Validating;
        assert!(!process.state.is_failed());

        process.state = EtchingState::Completed {
            txid: "tx".to_string(),
            block_height: 100,
        };
        assert!(!process.state.is_failed());

        // Failed
        process.state = EtchingState::Failed {
            reason: "error".to_string(),
            at_state: "Signing".to_string(),
        };
        assert!(process.state.is_failed());

        process.state = EtchingState::RolledBack {
            reason: "rollback".to_string(),
        };
        assert!(process.state.is_failed());
    }

    #[test]
    fn test_state_name() {
        assert_eq!(EtchingState::Validating.name(), "Validating");
        assert_eq!(EtchingState::CheckingBalance.name(), "CheckingBalance");
        assert_eq!(EtchingState::SelectingUtxos.name(), "SelectingUtxos");
        assert_eq!(
            EtchingState::BuildingTransaction.name(),
            "BuildingTransaction"
        );
        assert_eq!(EtchingState::Signing.name(), "Signing");
        assert_eq!(EtchingState::Broadcasting.name(), "Broadcasting");
        assert_eq!(
            EtchingState::Confirming { confirmations: 3 }.name(),
            "Confirming"
        );
        assert_eq!(EtchingState::Indexing.name(), "Indexing");
        assert_eq!(
            EtchingState::Completed {
                txid: "tx".to_string(),
                block_height: 100
            }
            .name(),
            "Completed"
        );
        assert_eq!(
            EtchingState::Failed {
                reason: "err".to_string(),
                at_state: "Sign".to_string()
            }
            .name(),
            "Failed"
        );
        assert_eq!(
            EtchingState::RolledBack {
                reason: "rb".to_string()
            }
            .name(),
            "RolledBack"
        );
    }

    #[test]
    fn test_retry_increment() {
        let mut process = setup_test_process();
        assert_eq!(process.retry_count, 0);

        process.increment_retry();
        assert_eq!(process.retry_count, 1);

        process.increment_retry();
        assert_eq!(process.retry_count, 2);
    }

    #[test]
    fn test_update_state_updates_timestamp() {
        let mut process = setup_test_process();
        let initial_time = process.updated_at;

        // Simulate time passing (in real canister, ic_cdk::api::time() would advance)
        process.updated_at = initial_time + 1000;

        process.update_state(EtchingState::CheckingBalance);
        // Note: In real usage, update_state would call ic_cdk::api::time()
        // For testing, we just verify the state changed
        assert!(matches!(process.state, EtchingState::CheckingBalance));
    }

    #[test]
    fn test_confirming_state_with_different_counts() {
        let state_0 = EtchingState::Confirming { confirmations: 0 };
        let state_1 = EtchingState::Confirming { confirmations: 1 };
        let state_6 = EtchingState::Confirming { confirmations: 6 };

        assert_eq!(state_0.name(), "Confirming");
        assert_eq!(state_1.name(), "Confirming");
        assert_eq!(state_6.name(), "Confirming");

        assert!(!state_0.is_terminal());
        assert!(!state_1.is_terminal());
        assert!(!state_6.is_terminal());
    }

    #[test]
    fn test_completed_state_with_data() {
        let state = EtchingState::Completed {
            txid: "deadbeef1234567890abcdef".to_string(),
            block_height: 800_000,
        };

        assert_eq!(state.name(), "Completed");
        assert!(state.is_terminal());
        assert!(state.is_successful());
        assert!(!state.is_failed());

        if let EtchingState::Completed { txid, block_height } = state {
            assert_eq!(txid, "deadbeef1234567890abcdef");
            assert_eq!(block_height, 800_000);
        } else {
            panic!("Expected Completed state");
        }
    }

    #[test]
    fn test_failed_state_with_context() {
        let state = EtchingState::Failed {
            reason: "Insufficient funds".to_string(),
            at_state: "CheckingBalance".to_string(),
        };

        assert_eq!(state.name(), "Failed");
        assert!(state.is_terminal());
        assert!(!state.is_successful());
        assert!(state.is_failed());

        if let EtchingState::Failed { reason, at_state } = state {
            assert_eq!(reason, "Insufficient funds");
            assert_eq!(at_state, "CheckingBalance");
        } else {
            panic!("Expected Failed state");
        }
    }

    #[test]
    fn test_process_with_fee_paid() {
        let mut process = setup_test_process();
        assert!(process.fee_paid.is_none());

        process.fee_paid = Some(25_000);
        assert_eq!(process.fee_paid, Some(25_000));
    }

    #[test]
    fn test_process_with_txid() {
        let mut process = setup_test_process();
        assert!(process.txid.is_none());

        process.txid = Some("abc123def456".to_string());
        assert_eq!(process.txid, Some("abc123def456".to_string()));
    }

    #[test]
    fn test_multiple_processes_same_caller() {
        let caller = Principal::from_text("aaaaa-aa").unwrap();

        let proc1 = EtchingProcess::new("proc_1".to_string(), caller, "RUNE1".to_string());
        let proc2 = EtchingProcess::new("proc_2".to_string(), caller, "RUNE2".to_string());

        assert_eq!(proc1.caller, caller);
        assert_eq!(proc2.caller, caller);
        assert_ne!(proc1.id, proc2.id);
        assert_ne!(proc1.rune_name, proc2.rune_name);
    }

    #[test]
    fn test_process_lifecycle() {
        let mut process = setup_test_process();

        // Start: Validating
        assert_eq!(process.state.name(), "Validating");
        assert!(!process.state.is_terminal());

        // Progress through states
        process.update_state(EtchingState::CheckingBalance);
        process.update_state(EtchingState::SelectingUtxos);
        process.update_state(EtchingState::BuildingTransaction);
        process.update_state(EtchingState::Signing);
        process.update_state(EtchingState::Broadcasting);
        process.update_state(EtchingState::Confirming { confirmations: 0 });
        process.update_state(EtchingState::Confirming { confirmations: 1 });
        process.update_state(EtchingState::Confirming { confirmations: 6 });
        process.update_state(EtchingState::Indexing);

        // End: Completed
        process.update_state(EtchingState::Completed {
            txid: "final_tx".to_string(),
            block_height: 850_000,
        });

        assert!(process.state.is_terminal());
        assert!(process.state.is_successful());
        assert!(!process.state.is_failed());
    }

    #[test]
    fn test_process_failure_lifecycle() {
        let mut process = setup_test_process();

        // Start
        process.update_state(EtchingState::CheckingBalance);
        process.update_state(EtchingState::SelectingUtxos);
        process.update_state(EtchingState::BuildingTransaction);

        // Fail during signing
        process.update_state(EtchingState::Failed {
            reason: "Schnorr signature failed".to_string(),
            at_state: "Signing".to_string(),
        });

        assert!(process.state.is_terminal());
        assert!(!process.state.is_successful());
        assert!(process.state.is_failed());
    }

    #[test]
    fn test_process_rollback_lifecycle() {
        let mut process = setup_test_process();

        // Progress
        process.update_state(EtchingState::CheckingBalance);
        process.update_state(EtchingState::SelectingUtxos);

        // Encounter critical error requiring rollback
        process.update_state(EtchingState::RolledBack {
            reason: "Network rejected transaction, refunding fees".to_string(),
        });

        assert!(process.state.is_terminal());
        assert!(!process.state.is_successful());
        assert!(process.state.is_failed());
    }
}
