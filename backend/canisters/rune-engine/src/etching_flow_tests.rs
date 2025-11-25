#![cfg(test)]

//! Comprehensive tests for the etching_flow module
//!
//! This test suite covers:
//! - Unit tests for EtchingValidator
//! - State transition tests
//! - Error handling tests
//! - Rollback mechanism tests
//! - Retry logic tests
//! - End-to-end flow tests

use candid::Principal;
use quri_types::{RuneEtching, MintTerms, UtxoSelection, Utxo, OutPoint};

use crate::config::EtchingConfig;
use crate::errors::EtchingError;
use crate::etching_flow::EtchingOrchestrator;
use crate::process_id::ProcessId;
use crate::state::{EtchingProcess, EtchingState};
use crate::validators::EtchingValidator;

// ============================================================================
// Test Helpers
// ============================================================================

/// Create a valid test etching
fn create_test_etching() -> RuneEtching {
    RuneEtching {
        rune_name: "TEST•RUNE".to_string(),
        symbol: "TST".to_string(),
        divisibility: 8,
        premine: 1_000_000,
        terms: Some(MintTerms {
            amount: 100,
            cap: 10_000,
            height_start: None,
            height_end: None,
            offset_start: None,
            offset_end: None,
        }),
    }
}

/// Create a test principal
fn test_principal() -> Principal {
    Principal::from_text("aaaaa-aa").unwrap()
}

/// Create a test process
fn create_test_process() -> EtchingProcess {
    let id = ProcessId::from_seed(12345);
    let caller = test_principal();
    EtchingProcess::new_for_test(id, caller, "TEST•RUNE".to_string(), 1_000_000_000)
}

/// Create a test UTXO selection
fn create_test_utxo_selection() -> UtxoSelection {
    UtxoSelection {
        selected: vec![Utxo {
            outpoint: OutPoint {
                txid: vec![1, 2, 3, 4],
                vout: 0,
            },
            value: 50_000,
            height: 100,
        }],
        total_value: 50_000,
        estimated_fee: 5_000,
        change: 35_000,
    }
}

/// Create test config
fn test_config() -> EtchingConfig {
    EtchingConfig {
        network: quri_types::BitcoinNetwork::Testnet,
        fee_rate: 2,
        required_confirmations: 1,
        enable_retries: true,
    }
}

// ============================================================================
// Unit Tests - EtchingValidator
// ============================================================================

#[test]
fn test_validate_balance_success() {
    let result = EtchingValidator::validate_balance(100_000, 50_000);
    assert!(result.is_ok());
}

#[test]
fn test_validate_balance_insufficient() {
    let result = EtchingValidator::validate_balance(50_000, 100_000);
    assert!(result.is_err());

    if let Err(EtchingError::InsufficientBalance { have, need }) = result {
        assert_eq!(have, 50_000);
        assert_eq!(need, 100_000);
    } else {
        panic!("Expected InsufficientBalance error");
    }
}

#[test]
fn test_validate_balance_exact_match() {
    let result = EtchingValidator::validate_balance(100_000, 100_000);
    assert!(result.is_ok());
}

#[test]
fn test_validate_etching_success() {
    let etching = create_test_etching();
    let result = EtchingValidator::validate_etching(&etching);
    assert!(result.is_ok());
}

#[test]
fn test_validate_etching_invalid_name() {
    let mut etching = create_test_etching();
    etching.rune_name = "lowercase".to_string(); // Invalid: must be uppercase

    let result = EtchingValidator::validate_etching(&etching);
    assert!(result.is_err());
    assert!(matches!(result, Err(EtchingError::InvalidRuneName(_))));
}

#[test]
fn test_validate_etching_invalid_divisibility() {
    let mut etching = create_test_etching();
    etching.divisibility = 39; // Invalid: max is 38

    let result = EtchingValidator::validate_etching(&etching);
    assert!(result.is_err());
    assert!(matches!(result, Err(EtchingError::InvalidDivisibility(39))));
}

#[test]
fn test_validate_etching_zero_supply() {
    let etching = RuneEtching {
        rune_name: "TEST".to_string(),
        symbol: "TST".to_string(),
        divisibility: 8,
        premine: 0,
        terms: None,
    };

    let result = EtchingValidator::validate_etching(&etching);
    assert!(result.is_err());
    assert!(matches!(result, Err(EtchingError::InvalidSupply(_))));
}

#[test]
fn test_validate_etching_invalid_mint_terms() {
    let etching = RuneEtching {
        rune_name: "TEST".to_string(),
        symbol: "TST".to_string(),
        divisibility: 8,
        premine: 1000,
        terms: Some(MintTerms {
            amount: 0, // Invalid: must be > 0
            cap: 1000,
            height_start: None,
            height_end: None,
            offset_start: None,
            offset_end: None,
        }),
    };

    let result = EtchingValidator::validate_etching(&etching);
    assert!(result.is_err());
    assert!(matches!(result, Err(EtchingError::InvalidMintTerms(_))));
}

// ============================================================================
// State Transition Tests
// ============================================================================

#[test]
fn test_state_transition_validating_to_checking() {
    let mut process = create_test_process();
    assert_eq!(process.state, EtchingState::Validating);

    process.update_state_for_test(EtchingState::CheckingBalance, 2_000_000_000);
    assert_eq!(process.state, EtchingState::CheckingBalance);
    assert_eq!(process.updated_at, 2_000_000_000);
}

#[test]
fn test_state_transition_checking_to_selecting() {
    let mut process = create_test_process();
    process.update_state_for_test(EtchingState::CheckingBalance, 2_000_000_000);

    process.update_state_for_test(EtchingState::SelectingUtxos, 3_000_000_000);
    assert_eq!(process.state, EtchingState::SelectingUtxos);
}

#[test]
fn test_state_transition_complete_flow() {
    let mut process = create_test_process();
    let timestamps = vec![
        1_000_000_000, // Initial
        2_000_000_000,
        3_000_000_000,
        4_000_000_000,
        5_000_000_000,
        6_000_000_000,
        7_000_000_000,
        8_000_000_000,
        9_000_000_000,
    ];

    let states = vec![
        EtchingState::Validating,
        EtchingState::CheckingBalance,
        EtchingState::SelectingUtxos,
        EtchingState::BuildingTransaction,
        EtchingState::Signing,
        EtchingState::Broadcasting,
        EtchingState::Confirming { confirmations: 0 },
        EtchingState::Indexing,
        EtchingState::Completed {
            txid: "abc123".to_string(),
            block_height: 100,
        },
    ];

    for (i, state) in states.iter().enumerate() {
        process.update_state_for_test(state.clone(), timestamps[i]);
        assert_eq!(process.state, *state);
        assert_eq!(process.updated_at, timestamps[i]);
    }

    assert!(process.state.is_terminal());
    assert!(process.state.is_successful());
}

#[test]
fn test_state_is_terminal() {
    assert!(!EtchingState::Validating.is_terminal());
    assert!(!EtchingState::CheckingBalance.is_terminal());
    assert!(!EtchingState::SelectingUtxos.is_terminal());
    assert!(!EtchingState::BuildingTransaction.is_terminal());
    assert!(!EtchingState::Signing.is_terminal());
    assert!(!EtchingState::Broadcasting.is_terminal());
    assert!(!EtchingState::Confirming { confirmations: 0 }.is_terminal());
    assert!(!EtchingState::Indexing.is_terminal());

    assert!(EtchingState::Completed {
        txid: "abc".to_string(),
        block_height: 100
    }
    .is_terminal());
    assert!(EtchingState::Failed {
        reason: "error".to_string(),
        at_state: "Signing".to_string()
    }
    .is_terminal());
    assert!(EtchingState::RolledBack {
        reason: "error".to_string()
    }
    .is_terminal());
}

#[test]
fn test_state_is_successful() {
    assert!(!EtchingState::Validating.is_successful());
    assert!(!EtchingState::Failed {
        reason: "error".to_string(),
        at_state: "Signing".to_string()
    }
    .is_successful());

    assert!(EtchingState::Completed {
        txid: "abc".to_string(),
        block_height: 100
    }
    .is_successful());
}

#[test]
fn test_state_is_failed() {
    assert!(!EtchingState::Validating.is_failed());
    assert!(!EtchingState::Completed {
        txid: "abc".to_string(),
        block_height: 100
    }
    .is_failed());

    assert!(EtchingState::Failed {
        reason: "error".to_string(),
        at_state: "Signing".to_string()
    }
    .is_failed());
    assert!(EtchingState::RolledBack {
        reason: "error".to_string()
    }
    .is_failed());
}

#[test]
fn test_state_name() {
    assert_eq!(EtchingState::Validating.name(), "Validating");
    assert_eq!(EtchingState::CheckingBalance.name(), "CheckingBalance");
    assert_eq!(EtchingState::SelectingUtxos.name(), "SelectingUtxos");
    assert_eq!(EtchingState::BuildingTransaction.name(), "BuildingTransaction");
    assert_eq!(EtchingState::Signing.name(), "Signing");
    assert_eq!(EtchingState::Broadcasting.name(), "Broadcasting");
    assert_eq!(
        EtchingState::Confirming { confirmations: 0 }.name(),
        "Confirming"
    );
    assert_eq!(EtchingState::Indexing.name(), "Indexing");
    assert_eq!(
        EtchingState::Completed {
            txid: "abc".to_string(),
            block_height: 100
        }
        .name(),
        "Completed"
    );
    assert_eq!(
        EtchingState::Failed {
            reason: "error".to_string(),
            at_state: "Signing".to_string()
        }
        .name(),
        "Failed"
    );
    assert_eq!(
        EtchingState::RolledBack {
            reason: "error".to_string()
        }
        .name(),
        "RolledBack"
    );
}

// ============================================================================
// Error Handling Tests
// ============================================================================

#[test]
fn test_error_insufficient_balance() {
    let error = EtchingError::InsufficientBalance {
        have: 50_000,
        need: 100_000,
    };

    assert_eq!(
        error.user_message(),
        "Not enough ckBTC. You have 50000 sats but need 100000 sats"
    );
    assert!(!error.is_retryable());
}

#[test]
fn test_error_insufficient_utxos() {
    let error = EtchingError::InsufficientUtxos("No UTXOs available".to_string());

    assert!(error.to_string().contains("No UTXOs available"));
    assert!(!error.is_retryable());
}

#[test]
fn test_error_signing_failure() {
    let error = EtchingError::SigningFailed("Schnorr signature failed".to_string());

    assert!(error.to_string().contains("Schnorr signature failed"));
    assert!(!error.is_retryable());
}

#[test]
fn test_error_broadcast_failure() {
    let error = EtchingError::BroadcastFailed("Network unreachable".to_string());

    assert!(error.to_string().contains("Network unreachable"));
    assert!(!error.is_retryable());
}

#[test]
fn test_error_network_rejected() {
    let error = EtchingError::NetworkRejected("Invalid transaction".to_string());

    assert!(error.to_string().contains("Invalid transaction"));
    assert!(error.is_retryable()); // Network errors are retryable
}

#[test]
fn test_error_timeout() {
    let error = EtchingError::Timeout;

    assert!(error.is_retryable());
    assert_eq!(error.retry_delay(), Some(30)); // 30 seconds delay
}

#[test]
fn test_error_rate_limit() {
    let error = EtchingError::RateLimitExceeded(60);

    assert!(error.user_message().contains("60 seconds"));
    assert_eq!(error.retry_delay(), Some(60));
}

#[test]
fn test_error_is_retryable() {
    // Retryable errors
    assert!(EtchingError::Timeout.is_retryable());
    assert!(EtchingError::BitcoinApiError("test".to_string()).is_retryable());
    assert!(EtchingError::NetworkRejected("test".to_string()).is_retryable());
    assert!(EtchingError::InternalError("test".to_string()).is_retryable());

    // Non-retryable errors
    assert!(!EtchingError::InvalidRuneName("test".to_string()).is_retryable());
    assert!(!EtchingError::InsufficientBalance { have: 0, need: 100 }.is_retryable());
    assert!(!EtchingError::SigningFailed("test".to_string()).is_retryable());
}

// ============================================================================
// Rollback Tests
// ============================================================================

#[test]
fn test_should_rollback_on_broadcast_failure() {
    let orchestrator = EtchingOrchestrator::new(test_config());
    let error = EtchingError::BroadcastFailed("Network error".to_string());

    assert!(orchestrator.should_rollback(&error));
}

#[test]
fn test_should_rollback_on_network_rejected() {
    let orchestrator = EtchingOrchestrator::new(test_config());
    let error = EtchingError::NetworkRejected("Invalid tx".to_string());

    assert!(orchestrator.should_rollback(&error));
}

#[test]
fn test_should_rollback_on_internal_error() {
    let orchestrator = EtchingOrchestrator::new(test_config());
    let error = EtchingError::InternalError("System failure".to_string());

    assert!(orchestrator.should_rollback(&error));
}

#[test]
fn test_should_not_rollback_on_validation_error() {
    let orchestrator = EtchingOrchestrator::new(test_config());
    let error = EtchingError::InvalidRuneName("bad name".to_string());

    assert!(!orchestrator.should_rollback(&error));
}

#[test]
fn test_should_not_rollback_on_insufficient_balance() {
    let orchestrator = EtchingOrchestrator::new(test_config());
    let error = EtchingError::InsufficientBalance {
        have: 50_000,
        need: 100_000,
    };

    assert!(!orchestrator.should_rollback(&error));
}

// ============================================================================
// Retry Logic Tests
// ============================================================================

#[test]
fn test_process_retry_tracking() {
    let mut process = create_test_process();
    assert_eq!(process.retry_count, 0);
    assert!(!process.has_exceeded_retries(3));

    process.increment_retry_for_test(2_000_000_000);
    assert_eq!(process.retry_count, 1);
    assert!(!process.has_exceeded_retries(3));

    process.increment_retry_for_test(3_000_000_000);
    process.increment_retry_for_test(4_000_000_000);
    assert_eq!(process.retry_count, 3);
    assert!(process.has_exceeded_retries(3));
}

#[test]
fn test_max_retries_not_exceeded() {
    let mut process = create_test_process();

    for i in 0..2 {
        process.increment_retry_for_test(1_000_000_000 + (i * 1_000_000_000));
    }

    assert_eq!(process.retry_count, 2);
    assert!(!process.has_exceeded_retries(3));
}

#[test]
fn test_max_retries_exceeded() {
    let mut process = create_test_process();

    for i in 0..4 {
        process.increment_retry_for_test(1_000_000_000 + (i * 1_000_000_000));
    }

    assert_eq!(process.retry_count, 4);
    assert!(process.has_exceeded_retries(3));
}

// ============================================================================
// ProcessId Tests
// ============================================================================

#[test]
fn test_process_id_generation_deterministic() {
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

#[test]
fn test_process_id_to_string() {
    let id = EtchingOrchestrator::generate_process_id_for_test(42);
    let string = id.to_string();

    // UUID format: 8-4-4-4-12
    assert_eq!(string.len(), 36);
    assert_eq!(string.chars().filter(|&c| c == '-').count(), 4);
}

#[test]
fn test_process_id_roundtrip() {
    let id1 = EtchingOrchestrator::generate_process_id_for_test(99999);
    let string = id1.to_string();
    let id2 = ProcessId::from_string(&string).unwrap();

    assert_eq!(id1, id2);
}

// ============================================================================
// EtchingProcess Tests
// ============================================================================

#[test]
fn test_process_creation() {
    let id = ProcessId::from_seed(12345);
    let caller = test_principal();
    // Use new_for_test to avoid ic_cdk::api::time() call
    let process = EtchingProcess::new_for_test(
        id.clone(),
        caller,
        "TEST•RUNE".to_string(),
        1_000_000_000,
    );

    assert_eq!(process.id, id);
    assert_eq!(process.caller, caller);
    assert_eq!(process.rune_name, "TEST•RUNE");
    assert_eq!(process.state, EtchingState::Validating);
    assert_eq!(process.retry_count, 0);
    assert_eq!(process.fee_paid, None);
    assert_eq!(process.txid, None);
}

#[test]
fn test_process_state_update() {
    let mut process = create_test_process();
    let initial_time = process.updated_at;

    // Simulate time passing
    std::thread::sleep(std::time::Duration::from_millis(10));

    process.update_state_for_test(EtchingState::CheckingBalance, initial_time + 1_000_000_000);

    assert_eq!(process.state, EtchingState::CheckingBalance);
    assert!(process.updated_at > initial_time);
}

#[test]
fn test_process_fee_tracking() {
    let mut process = create_test_process();
    assert_eq!(process.fee_paid, None);

    process.fee_paid = Some(20_000);
    assert_eq!(process.fee_paid, Some(20_000));
}

#[test]
fn test_process_txid_tracking() {
    let mut process = create_test_process();
    assert_eq!(process.txid, None);

    process.txid = Some("abc123def456".to_string());
    assert_eq!(process.txid, Some("abc123def456".to_string()));
}

// ============================================================================
// Integration Tests (Mock-based)
// ============================================================================

#[test]
fn test_orchestrator_creation() {
    let config = test_config();
    let orchestrator = EtchingOrchestrator::new(config.clone());

    // Orchestrator should be created successfully
    // Note: We can't directly test internal state without making it public
    // but we can test that creation doesn't panic
}

#[test]
fn test_validation_step_success() {
    let etching = create_test_etching();
    let result = EtchingValidator::validate_etching(&etching);

    assert!(result.is_ok());
}

#[test]
fn test_validation_step_failure() {
    let mut etching = create_test_etching();
    etching.rune_name = "invalid_name".to_string(); // lowercase is invalid

    let result = EtchingValidator::validate_etching(&etching);

    assert!(result.is_err());
}

// ============================================================================
// Edge Cases and Boundary Tests
// ============================================================================

#[test]
fn test_edge_case_zero_confirmations() {
    let state = EtchingState::Confirming { confirmations: 0 };
    assert!(!state.is_terminal());
    assert_eq!(state.name(), "Confirming");
}

#[test]
fn test_edge_case_max_confirmations() {
    let state = EtchingState::Confirming {
        confirmations: u32::MAX,
    };
    assert!(!state.is_terminal());
}

#[test]
fn test_edge_case_empty_txid() {
    let state = EtchingState::Completed {
        txid: "".to_string(),
        block_height: 0,
    };
    assert!(state.is_terminal());
    assert!(state.is_successful());
}

#[test]
fn test_edge_case_very_large_block_height() {
    let state = EtchingState::Completed {
        txid: "abc".to_string(),
        block_height: u64::MAX,
    };
    assert!(state.is_terminal());
    assert!(state.is_successful());
}

#[test]
fn test_edge_case_long_error_message() {
    let long_message = "x".repeat(1000);
    let error = EtchingError::InternalError(long_message.clone());

    assert_eq!(error.to_string(), format!("Internal error: {}", long_message));
}

#[test]
fn test_edge_case_utxo_selection_empty_list() {
    let selection = UtxoSelection {
        selected: vec![],
        total_value: 0,
        estimated_fee: 0,
        change: 0,
    };

    assert_eq!(selection.selected.len(), 0);
    assert_eq!(selection.total_value, 0);
}

#[test]
fn test_edge_case_utxo_selection_exact_amount() {
    let selection = UtxoSelection {
        selected: vec![Utxo {
            outpoint: OutPoint {
                txid: vec![1, 2, 3, 4],
                vout: 0,
            },
            value: 50_000,
            height: 100,
        }],
        total_value: 50_000,
        estimated_fee: 5_000,
        change: 0, // Exact amount, no change
    };

    assert_eq!(selection.change, 0);
    assert_eq!(selection.total_value - selection.estimated_fee, 45_000);
}

// ============================================================================
// Concurrent Access Tests (State Management)
// ============================================================================

#[test]
fn test_multiple_processes_different_ids() {
    let id1 = ProcessId::from_seed(1);
    let id2 = ProcessId::from_seed(2);
    let caller = test_principal();

    // Use new_for_test to avoid ic_cdk::api::time() call
    let process1 = EtchingProcess::new_for_test(id1.clone(), caller, "RUNE1".to_string(), 1_000_000_000);
    let process2 = EtchingProcess::new_for_test(id2.clone(), caller, "RUNE2".to_string(), 1_000_000_000);

    assert_ne!(process1.id, process2.id);
    assert_eq!(process1.caller, process2.caller);
}

// ============================================================================
// Error Message Tests
// ============================================================================

#[test]
fn test_error_user_messages() {
    let errors = vec![
        (
            EtchingError::InsufficientBalance {
                have: 50_000,
                need: 100_000,
            },
            "Not enough ckBTC. You have 50000 sats but need 100000 sats",
        ),
        (
            EtchingError::RateLimitExceeded(60),
            "Too many requests. Please wait 60 seconds",
        ),
        (
            EtchingError::InvalidRuneName("too short".to_string()),
            "Invalid Rune name: too short",
        ),
    ];

    for (error, expected_message) in errors {
        assert_eq!(error.user_message(), expected_message);
    }
}

// ============================================================================
// Comprehensive Validation Tests
// ============================================================================

#[test]
fn test_comprehensive_etching_validation() {
    // Test 1: Valid etching with all fields
    let valid_etching = RuneEtching {
        rune_name: "SATOSHI•NAKAMOTO".to_string(),
        symbol: "SATS".to_string(),
        divisibility: 8,
        premine: 21_000_000,
        terms: Some(MintTerms {
            amount: 50,
            cap: 100_000,
            height_start: None,
            height_end: None,
            offset_start: None,
            offset_end: None,
        }),
    };
    assert!(EtchingValidator::validate_etching(&valid_etching).is_ok());

    // Test 2: Minimal valid etching (premine only, no terms)
    let minimal_etching = RuneEtching {
        rune_name: "AB".to_string(),
        symbol: "".to_string(), // Empty symbol is allowed
        divisibility: 0,
        premine: 1,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&minimal_etching).is_ok());

    // Test 3: Maximum divisibility
    let max_div_etching = RuneEtching {
        rune_name: "TEST".to_string(),
        symbol: "TST".to_string(),
        divisibility: 38, // Max allowed
        premine: 1000,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&max_div_etching).is_ok());

    // Test 4: Long name (26 chars - max)
    let long_name_etching = RuneEtching {
        rune_name: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".to_string(),
        symbol: "ABCD".to_string(),
        divisibility: 8,
        premine: 1000,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&long_name_etching).is_ok());
}

#[test]
fn test_comprehensive_etching_validation_failures() {
    // Test 1: Name too long (27 chars)
    let too_long = RuneEtching {
        rune_name: "ABCDEFGHIJKLMNOPQRSTUVWXYZA".to_string(),
        symbol: "TST".to_string(),
        divisibility: 8,
        premine: 1000,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&too_long).is_err());

    // Test 2: Invalid characters in name
    let invalid_chars = RuneEtching {
        rune_name: "TEST123".to_string(),
        symbol: "TST".to_string(),
        divisibility: 8,
        premine: 1000,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&invalid_chars).is_err());

    // Test 3: Symbol too long
    let symbol_too_long = RuneEtching {
        rune_name: "TEST".to_string(),
        symbol: "TOOLONG".to_string(),
        divisibility: 8,
        premine: 1000,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&symbol_too_long).is_err());

    // Test 4: Divisibility too high
    let div_too_high = RuneEtching {
        rune_name: "TEST".to_string(),
        symbol: "TST".to_string(),
        divisibility: 39,
        premine: 1000,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&div_too_high).is_err());

    // Test 5: Zero supply (no premine, no terms)
    let zero_supply = RuneEtching {
        rune_name: "TEST".to_string(),
        symbol: "TST".to_string(),
        divisibility: 8,
        premine: 0,
        terms: None,
    };
    assert!(EtchingValidator::validate_etching(&zero_supply).is_err());
}
