//! PocketIC Integration Tests for QURI Protocol
//!
//! These tests use PocketIC to test the full canister integration including:
//! - Dead Man's Switch flow
//! - vetKeys encrypted metadata
//! - Rune etching and transfers
//!
//! ## Running Tests
//!
//! ```bash
//! # Install pocket-ic binary (first time only)
//! dfx deps pull
//! dfx deps init
//!
//! # Run all integration tests
//! cargo test --test integration_test
//!
//! # Run specific test
//! cargo test --test integration_test test_dead_man_switch_creation
//! ```

use candid::{decode_one, CandidType, Encode, Principal};
use pocket_ic::{PocketIc, WasmResult};
use serde::Deserialize;
use std::time::Duration;

// ============================================================================
// Test Types
// ============================================================================

#[derive(CandidType, Deserialize, Debug)]
struct CreateDeadManSwitchParams {
    rune_id: String,
    beneficiary: String,
    amount: u64,
    timeout_days: u64,
    message: Option<String>,
}

#[derive(CandidType, Deserialize, Debug)]
struct DeadManSwitchInfo {
    id: u64,
    owner: Principal,
    beneficiary: String,
    rune_id: String,
    amount: u64,
    status: String,
    time_remaining_seconds: u64,
    elapsed_percentage: u8,
    created_at: u64,
    message: Option<String>,
}

#[derive(CandidType, Deserialize, Debug)]
struct DeadManSwitchStats {
    total_switches: u64,
    active_switches: u64,
    triggered_switches: u64,
    total_value_protected: u64,
}

// ============================================================================
// Test Helpers
// ============================================================================

/// Setup PocketIC instance with all QURI canisters deployed
fn setup_quri_environment() -> (PocketIc, Principal, Principal, Principal) {
    let pic = PocketIc::new();

    // Load canister WASMs
    let rune_engine_wasm = std::fs::read("../target/wasm32-unknown-unknown/release/rune_engine.wasm")
        .expect("Failed to read rune-engine WASM");

    let bitcoin_integration_wasm = std::fs::read("../target/wasm32-unknown-unknown/release/bitcoin_integration.wasm")
        .expect("Failed to read bitcoin-integration WASM");

    let registry_wasm = std::fs::read("../target/wasm32-unknown-unknown/release/registry.wasm")
        .expect("Failed to read registry WASM");

    // Deploy canisters
    let registry_id = pic.create_canister();
    pic.add_cycles(registry_id, 2_000_000_000_000); // 2T cycles
    pic.install_canister(registry_id, registry_wasm, vec![], None);

    let bitcoin_integration_id = pic.create_canister();
    pic.add_cycles(bitcoin_integration_id, 2_000_000_000_000);
    // Init args: (variant { Testnet }, ckBTC ledger principal)
    let init_args = Encode!(&"Testnet", &Principal::anonymous()).unwrap();
    pic.install_canister(bitcoin_integration_id, bitcoin_integration_wasm, init_args, None);

    let rune_engine_id = pic.create_canister();
    pic.add_cycles(rune_engine_id, 2_000_000_000_000);
    pic.install_canister(rune_engine_id, rune_engine_wasm, vec![], None);

    // Configure rune-engine with canister IDs
    let config_args = Encode!(&bitcoin_integration_id, &registry_id).unwrap();
    let _ = pic.update_call(
        rune_engine_id,
        Principal::anonymous(),
        "auto_configure_canisters",
        config_args,
    );

    (pic, rune_engine_id, bitcoin_integration_id, registry_id)
}

/// Create a test user principal
fn test_user(id: u8) -> Principal {
    Principal::from_slice(&[id; 29])
}

// ============================================================================
// Dead Man's Switch Tests
// ============================================================================

#[test]
fn test_dead_man_switch_creation() {
    let (pic, rune_engine_id, _, _) = setup_quri_environment();
    let alice = test_user(1);

    // Create a Dead Man's Switch
    let params = CreateDeadManSwitchParams {
        rune_id: "TEST•RUNE".to_string(),
        beneficiary: "bc1q...beneficiary".to_string(),
        amount: 1000,
        timeout_days: 30,
        message: Some("Emergency transfer to family".to_string()),
    };

    let args = Encode!(&params).unwrap();
    let result = pic.update_call(
        rune_engine_id,
        alice,
        "create_dead_man_switch",
        args,
    ).expect("Failed to call create_dead_man_switch");

    let WasmResult::Reply(response) = result else {
        panic!("Expected reply from create_dead_man_switch");
    };
    let switch_id: Result<u64, String> = decode_one(&response).unwrap();
    assert!(switch_id.is_ok(), "Should create switch successfully");

    let id = switch_id.unwrap();
    println!("✅ Created Dead Man's Switch with ID: {}", id);

    // Verify the switch was created
    let get_args = Encode!(&id).unwrap();
    let get_result = pic.query_call(
        rune_engine_id,
        alice,
        "get_dead_man_switch",
        get_args,
    ).expect("Failed to call get_dead_man_switch");

    let WasmResult::Reply(get_response) = get_result else {
        panic!("Expected reply from get_dead_man_switch");
    };
    let switch_info: Option<DeadManSwitchInfo> = decode_one(&get_response).unwrap();
    assert!(switch_info.is_some(), "Switch should exist");

    let info = switch_info.unwrap();
    assert_eq!(info.amount, 1000);
    assert_eq!(info.beneficiary, "bc1q...beneficiary");
    assert_eq!(info.status, "Active");
    println!("✅ Verified switch: {:?}", info);
}

#[test]
fn test_dead_man_switch_checkin() {
    let (pic, rune_engine_id, _, _) = setup_quri_environment();
    let alice = test_user(1);

    // Create switch
    let params = CreateDeadManSwitchParams {
        rune_id: "TEST•RUNE".to_string(),
        beneficiary: "bc1q...beneficiary".to_string(),
        amount: 1000,
        timeout_days: 30,
        message: None,
    };

    let args = Encode!(&params).unwrap();
    let result = pic.update_call(rune_engine_id, alice, "create_dead_man_switch", args)
        .expect("Failed to create switch");

    let WasmResult::Reply(response) = result else {
        panic!("Expected reply from create_dead_man_switch");
    };
    let switch_id: u64 = decode_one::<Result<u64, String>>(&response).unwrap().unwrap();

    // Advance time by 15 days
    pic.advance_time(Duration::from_secs(15 * 24 * 60 * 60));
    pic.tick();

    // Check in to reset timer
    let checkin_args = Encode!(&switch_id).unwrap();
    let checkin_result = pic.update_call(
        rune_engine_id,
        alice,
        "dms_checkin",
        checkin_args,
    ).expect("Failed to check in");

    let WasmResult::Reply(checkin_response) = checkin_result else {
        panic!("Expected reply from dms_checkin");
    };
    let checkin_status: Result<(), String> = decode_one(&checkin_response).unwrap();
    assert!(checkin_status.is_ok(), "Check-in should succeed");
    println!("✅ Check-in successful, timer reset");

    // Verify timer was reset (elapsed should be close to 0)
    let get_args = Encode!(&switch_id).unwrap();
    let get_result = pic.query_call(rune_engine_id, alice, "get_dead_man_switch", get_args)
        .expect("Failed to get switch");

    let WasmResult::Reply(get_response) = get_result else {
        panic!("Expected reply from get_dead_man_switch");
    };
    let info: Option<DeadManSwitchInfo> = decode_one(&get_response).unwrap();
    let info = info.unwrap();

    assert!(info.elapsed_percentage < 5, "Timer should be reset (elapsed < 5%)");
    println!("✅ Timer reset verified. Elapsed: {}%", info.elapsed_percentage);
}

#[test]
fn test_dead_man_switch_expiration() {
    let (pic, rune_engine_id, _, _) = setup_quri_environment();
    let alice = test_user(1);

    // Create switch with 1 day timeout
    let params = CreateDeadManSwitchParams {
        rune_id: "TEST•RUNE".to_string(),
        beneficiary: "bc1q...beneficiary".to_string(),
        amount: 1000,
        timeout_days: 1, // 1 day for faster testing
        message: Some("Test expiration".to_string()),
    };

    let args = Encode!(&params).unwrap();
    let result = pic.update_call(rune_engine_id, alice, "create_dead_man_switch", args)
        .expect("Failed to create switch");

    let WasmResult::Reply(response) = result else {
        panic!("Expected reply from create_dead_man_switch");
    };
    let switch_id: u64 = decode_one::<Result<u64, String>>(&response).unwrap().unwrap();

    // Advance time past expiration (2 days)
    pic.advance_time(Duration::from_secs(2 * 24 * 60 * 60));
    pic.tick();

    // Verify switch shows as expired
    let get_args = Encode!(&switch_id).unwrap();
    let get_result = pic.query_call(rune_engine_id, alice, "get_dead_man_switch", get_args)
        .expect("Failed to get switch");

    let WasmResult::Reply(get_response) = get_result else {
        panic!("Expected reply from get_dead_man_switch");
    };
    let info: Option<DeadManSwitchInfo> = decode_one(&get_response).unwrap();
    let info = info.unwrap();

    assert_eq!(info.status, "Expired", "Switch should be expired");
    assert_eq!(info.elapsed_percentage, 100, "Should be 100% elapsed");
    println!("✅ Switch expired as expected: {:?}", info);
}

#[test]
fn test_dead_man_switch_stats() {
    let (pic, rune_engine_id, _, _) = setup_quri_environment();
    let alice = test_user(1);
    let bob = test_user(2);

    // Create multiple switches
    for user in [alice, bob] {
        for i in 0..3 {
            let params = CreateDeadManSwitchParams {
                rune_id: format!("RUNE{}", i),
                beneficiary: "bc1q...".to_string(),
                amount: 1000 * (i + 1),
                timeout_days: 30,
                message: None,
            };

            let args = Encode!(&params).unwrap();
            let _ = pic.update_call(rune_engine_id, user, "create_dead_man_switch", args);
        }
    }

    // Get stats
    let stats_result = pic.query_call(
        rune_engine_id,
        Principal::anonymous(),
        "get_dead_man_switch_stats",
        vec![],
    ).expect("Failed to get stats");

    let WasmResult::Reply(stats_response) = stats_result else {
        panic!("Expected reply from get_dead_man_switch_stats");
    };
    let stats: DeadManSwitchStats = decode_one(&stats_response).unwrap();

    assert_eq!(stats.total_switches, 6, "Should have 6 switches total");
    assert_eq!(stats.active_switches, 6, "All should be active");
    assert_eq!(stats.triggered_switches, 0, "None should be triggered yet");
    assert_eq!(stats.total_value_protected, 6000 + 12000, "Total value: 1000+2000+3000 per user");

    println!("✅ Stats verified: {:?}", stats);
}

// ============================================================================
// Encrypted Metadata Tests (vetKeys)
// ============================================================================

#[test]
#[ignore] // Ignore by default as vetKeys requires specific IC setup
fn test_encrypted_metadata_storage() {
    let (_pic, _rune_engine_id, _, _) = setup_quri_environment();
    let _alice = test_user(1);

    // This test demonstrates the vetKeys integration
    // In a full test environment, you would:
    // 1. Store encrypted metadata using store_encrypted_metadata
    // 2. Verify only authorized principals can decrypt
    // 3. Test time-locked reveals

    println!("⏭️  Skipped: vetKeys test requires full IC environment");
}

// ============================================================================
// Test Runner
// ============================================================================

#[test]
fn test_all_basic_flows() {
    println!("🧪 Running QURI Protocol PocketIC Integration Tests\n");

    test_dead_man_switch_creation();
    test_dead_man_switch_checkin();
    test_dead_man_switch_expiration();
    test_dead_man_switch_stats();

    println!("\n✅ All basic integration tests passed!");
}
