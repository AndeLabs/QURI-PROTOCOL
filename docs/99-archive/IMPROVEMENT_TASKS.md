# QURI Protocol - Improvement Tasks & Implementation Guide

## Quick Reference

- **Full Analysis Report:** [CODEBASE_ANALYSIS_REPORT.md](./CODEBASE_ANALYSIS_REPORT.md)
- **Analysis Date:** November 15, 2025
- **Current Production Readiness:** 40%
- **Estimated to 75% Readiness:** 9-11 weeks

---

## CRITICAL TASKS (Must Complete Before Mainnet)

### Task 1: Implement Real Confirmation Tracking
**Priority:** CRITICAL | **Effort:** 40-60 hours | **Risk:** HIGH

**File:** `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/confirmation_tracker.rs`

**Current State:**
- Lines 53-103: Timer setup works
- Lines 121+: Placeholder implementation
- Uses timeout-based logic instead of actual Bitcoin verification

**Required Changes:**
1. Replace placeholder `get_confirmations()` with actual Bitcoin API call
2. Query Bitcoin Integration canister for UTXO confirmation count
3. Implement blockchain reorganization detection
4. Update state only when required confirmations reached
5. Add tests for:
   - Confirmation state tracking (5+ tests)
   - Timeout handling (24-hour window)
   - Transaction state transitions
   - Pending transaction cleanup

**Success Criteria:**
- ✅ Transactions verified on Bitcoin blockchain
- ✅ No false positive confirmations
- ✅ Handles reorg detection
- ✅ 100% test coverage of this module

**Subtasks:**
- [ ] Design confirmation verification flow
- [ ] Implement Bitcoin API integration call
- [ ] Add reorg detection logic
- [ ] Write 10+ tests
- [ ] Document timeout behavior
- [ ] Test with Bitcoin testnet

---

### Task 2: Create Integration Test Framework
**Priority:** CRITICAL | **Effort:** 60-80 hours | **Risk:** HIGH

**Files to Create:**
- `/Users/munay/dev/QURI-PROTOCOL/canisters/tests/integration.rs` (new)
- `/Users/munay/dev/QURI-PROTOCOL/canisters/tests/fixtures.rs` (new)
- `/Users/munay/dev/QURI-PROTOCOL/canisters/tests/mocks.rs` (new)

**Required Test Coverage:**

1. **Rune Creation Flow (end-to-end)**
   - Create rune → Bitcoin tx → Confirmation → Registry
   - [x] Mock test function names
   - [ ] test_full_rune_creation_flow()
   - [ ] test_rune_creation_with_network_failure()
   - [ ] test_rune_creation_with_insufficient_balance()
   - [ ] test_rune_creation_idempotency()

2. **Bitcoin Integration**
   - UTXO selection → Fee calculation → Transaction signing
   - [ ] test_utxo_selection_with_real_amounts()
   - [ ] test_fee_calculation_accuracy()
   - [ ] test_transaction_signing_with_threshold_schnorr()
   - [ ] test_transaction_broadcast_failure_handling()

3. **Canister Communications**
   - Rune Engine ↔ Bitcoin Integration
   - Rune Engine ↔ Registry
   - Rune Engine ↔ Identity Manager
   - [ ] test_rune_engine_calls_bitcoin_integration()
   - [ ] test_rune_engine_registers_with_registry()
   - [ ] test_rate_limiting_via_identity_manager()
   - [ ] test_concurrent_etching_requests()

4. **Failure Scenarios**
   - Network failures
   - Invalid signatures
   - Timeout handling
   - [ ] test_network_timeout_recovery()
   - [ ] test_invalid_signature_detection()
   - [ ] test_transaction_timeout_handling()
   - [ ] test_state_recovery_after_failure()

**Success Criteria:**
- ✅ All integration tests pass on local testnet
- ✅ Covers all major code paths
- ✅ Tests failure scenarios
- ✅ Minimum 30 integration tests

---

### Task 3: Add Schnorr Signature Tests
**Priority:** CRITICAL | **Effort:** 20-30 hours | **Risk:** HIGH

**File:** `/Users/munay/dev/QURI-PROTOCOL/canisters/bitcoin-integration/src/schnorr.rs`

**Current State:**
- 72 lines of code
- ZERO tests
- Critical cryptographic operations

**Required Tests:**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    // [ ] test_sign_message_valid()
    // [ ] test_sign_message_invalid_input()
    // [ ] test_sign_message_empty_data()
    // [ ] test_sign_message_large_data()
    // [ ] test_sign_message_derivation_path()
    // [ ] test_signature_verification()
    // [ ] test_signature_deterministic()
    // [ ] test_threshold_schnorr_signing()
    // [ ] test_signature_length_64_bytes()
    // [ ] test_schnorr_vs_ecdsa_differences()
}
```

**Implementation Steps:**
1. Add test data fixtures (valid/invalid messages)
2. Test signature generation (10 tests)
3. Test signature validation
4. Test Taproot-specific behavior
5. Test threshold signing

**Success Criteria:**
- ✅ 15+ tests covering all functions
- ✅ 100% code coverage
- ✅ Tests pass with ICP SDK
- ✅ Signature validation documented

---

### Task 4: Migrate Configs to Stable Memory
**Priority:** CRITICAL | **Effort:** 15-20 hours | **Risk:** MEDIUM

**Files:** 
- `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/lib.rs` (lines 40-42)
- Create new: `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/config_storage.rs`

**Current Problem:**
```rust
// BEFORE: Lost on upgrade
thread_local! {
    static ETCHING_CONFIG: RefCell<Option<EtchingConfig>> = const { RefCell::new(None) };
    static CANISTER_CONFIG: RefCell<Option<CanisterConfig>> = const { RefCell::new(None) };
}
```

**Required Changes:**
```rust
// AFTER: Persisted in stable memory
impl Storable for EtchingConfig { ... }
impl Storable for CanisterConfig { ... }

type ConfigMap = StableBTreeMap<String, Vec<u8>, Memory>;

thread_local! {
    static CONFIG_STORAGE: RefCell<ConfigMap> = RefCell::new(
        StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(3)))
        )
    );
}
```

**Implementation Steps:**
1. Implement Storable for both config types
2. Create config storage module
3. Migrate get/set operations
4. Write migration logic for upgrade
5. Add tests for persistence through upgrade
6. Document memory layout

**Memory Layout Update:**
```
MemoryId::0: Runes storage (StableBTreeMap)
MemoryId::1: Etching state (StableBTreeMap)
MemoryId::2: RBAC roles (StableBTreeMap)
MemoryId::3: Configs (StableBTreeMap) ← NEW
MemoryId::4-9: Reserved for expansion
```

**Success Criteria:**
- ✅ Configs survive canister upgrade
- ✅ Memory layout documented
- ✅ Backward migration tested
- ✅ No data loss during upgrade

---

### Task 5: Implement Block Height Tracking
**Priority:** CRITICAL | **Effort:** 10-15 hours | **Risk:** LOW

**File:** `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/etching_flow.rs` (line 130)

**Current Code:**
```rust
process.update_state(EtchingState::Completed {
    txid: txid.clone(),
    block_height: 0,  // TODO: Get actual block height
});
```

**Required Implementation:**
1. Call Bitcoin Integration canister for current block height
2. Verify transaction is in that block or earlier
3. Store actual block height in completion record
4. Document why block height matters (re-orgs, SPV, etc.)

**Code Changes:**
```rust
// Get current block height from Bitcoin
let current_height = crate::get_bitcoin_integration_id()?;
let block_height = ic_cdk::call::<_, (u64,)>(
    bitcoin_canister,
    "get_block_height",
    (),
).await?.0;

// Verify transaction is in blockchain
let confirmations = verify_transaction_confirmations(&txid, network).await?;

// Store accurate completion data
process.update_state(EtchingState::Completed {
    txid: txid.clone(),
    block_height, // Actual height
});
```

**Success Criteria:**
- ✅ Block height accurately stored
- ✅ Used for confirmation verification
- ✅ Tests with different block heights
- ✅ Documented in completion record

---

## HIGH PRIORITY TASKS (Complete Within 1 Month)

### Task 6: Complete Identity Manager Testing
**Effort:** 25-35 hours | **Impact:** HIGH

**File:** `/Users/munay/dev/QURI-PROTOCOL/canisters/identity-manager/src/lib.rs`

**Current Status:** 0 tests, 214 lines

**Required Tests:**
- Rate limiting (5+ tests)
  - [ ] test_rate_limit_sliding_window()
  - [ ] test_rate_limit_reset_after_window()
  - [ ] test_rate_limit_concurrent_requests()
  - [ ] test_rate_limit_exact_boundary()
  
- Session management (5+ tests)
  - [ ] test_session_creation()
  - [ ] test_session_expiration()
  - [ ] test_session_permissions()
  - [ ] test_session_cleanup()
  
- User identification (3+ tests)
  - [ ] test_principal_tracking()
  - [ ] test_anonymous_rejection()

---

### Task 7: Document Memory Layout
**Effort:** 5-10 hours | **Impact:** MEDIUM

**Create:** `/Users/munay/dev/QURI-PROTOCOL/MEMORY_LAYOUT.md`

**Content Required:**
```markdown
# Memory Layout Documentation

## Canister: rune-engine

### MemoryId Allocation
- MemoryId::0: Runes storage (StableBTreeMap)
- MemoryId::1: Etching process state (StableBTreeMap)
- MemoryId::2: RBAC role assignments (StableBTreeMap)
- MemoryId::3: Configuration storage (StableBTreeMap)
- MemoryId::4-9: Reserved for expansion
- MemoryId::10+: Future use

### Growth Estimates
- Runes: ~500 bytes per rune
- State: ~1KB per active process
- RBAC: ~200 bytes per role assignment
- Config: ~1KB fixed

### Memory Layout Version
Version: 1.0
Last Updated: 2025-11-15
```

---

### Task 8: Add Canister Upgrade Tests
**Effort:** 30-40 hours | **Impact:** HIGH

**Create:** `/Users/munay/dev/QURI-PROTOCOL/canisters/tests/upgrade_safety.rs`

**Test Coverage:**
```rust
#[test]
fn test_pre_upgrade_timer_cleanup() { ... }

#[test]
fn test_post_upgrade_state_restoration() { ... }

#[test]
fn test_config_persistence_through_upgrade() { ... }

#[test]
fn test_rbac_preservation_through_upgrade() { ... }

#[test]
fn test_timer_restart_after_upgrade() { ... }

#[test]
fn test_in_flight_etchings_survive_upgrade() { ... }

#[test]
fn test_upgrade_with_empty_state() { ... }

#[test]
fn test_upgrade_with_full_state() { ... }
```

---

### Task 9: Implement Rollback Logic
**Effort:** 20-30 hours | **Impact:** MEDIUM

**File:** `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/etching_flow.rs` (line 267)

**Current Code:**
```rust
// TODO: Implement rollback logic
```

**Required Implementation:**
1. Identify rollback points (after each step)
2. Implement undo operations:
   - Revert state changes
   - Return fees to user
   - Cancel pending transactions
3. Add tests for rollback scenarios
4. Document rollback strategy

---

### Task 10: Enable Property-Based Testing
**Effort:** 15-20 hours | **Impact:** MEDIUM

**Fixes:**
1. Update rust-toolchain.toml to support rustc 1.82+
2. Enable proptest in Cargo.toml
3. Add property-based tests for:
   - Validator fuzz testing
   - State machine invariants
   - Fee calculation edge cases

---

## MEDIUM PRIORITY TASKS (Complete Within 2 Months)

### Task 11: Performance Benchmarks
**Effort:** 40-50 hours | **Impact:** MEDIUM

**Targets:**
- Etching throughput: 1000 requests/hour
- Confirmation check latency: <10 seconds
- Fee estimation accuracy: <5% variance
- Memory growth: <1MB/day

---

### Task 12: Security Audit
**Effort:** External engagement | **Impact:** HIGH

**Focus Areas:**
- RBAC enforcement
- Signature verification
- State machine invariants
- Memory safety
- Upgrade safety

---

### Task 13: Documentation
**Effort:** 20-30 hours | **Impact:** MEDIUM

**Create:**
- Architecture documentation
- API reference for each canister
- Deployment runbook
- Failure modes and recovery
- Monitoring and alerting guide

---

### Task 14: Increase Test Coverage to 75%
**Effort:** 40-50 hours | **Impact:** HIGH

**Current:** ~35%
**Target:** 75%

**Focus Areas:**
- Bitcoin integration edge cases
- Error recovery paths
- Concurrent operation scenarios
- State machine exhaustive testing

---

## Code Quality Fixes (Ongoing)

### Remove Dangerous Unwrap/Expect Calls

**Priority 1 - Production Code:**
1. [ ] state.rs:215 - encode_one().expect()
2. [ ] rbac.rs:77 - encode_one().expect()
3. [ ] rbac.rs:81 - decode_one().expect()
4. [ ] registry/lib.rs:33 - StableVec::init().expect()

**Priority 2 - Parser Code:**
5. [ ] registry/indexer.rs - decode_rune_key().unwrap()
6. [ ] registry/parser.rs - extract_runestone().unwrap()

**Priority 3 - Test Code:**
7. [ ] state.rs:241 - Principal::from_text().unwrap()

---

## Dependency Updates

- [ ] Update rustc requirement to 1.82+ (for proptest)
- [ ] Remove unused `anyhow` dependency
- [ ] Add test utilities library
- [ ] Consider adding time-mocking library for tests

---

## Monitoring & Observability

Add instrumentation for:
- [ ] Etching success rate
- [ ] Bitcoin confirmation latency
- [ ] Fee estimation accuracy
- [ ] Retry attempt distribution
- [ ] RBAC permission denials
- [ ] Canister memory usage
- [ ] Timer execution latency

---

## Success Metrics

### Week 1-2 (Critical)
- [ ] Confirmation tracking implemented
- [ ] 20+ integration tests passing
- [ ] Schnorr module 100% tested
- [ ] Configs in stable memory

### Week 3-4 (High Priority)
- [ ] Identity manager tests complete
- [ ] Upgrade safety tests passing
- [ ] Memory layout documented
- [ ] Block height tracking working

### Week 5+ (Medium Priority)
- [ ] 75% test coverage achieved
- [ ] Performance benchmarks meet targets
- [ ] Security audit completed
- [ ] Production documentation done

---

## Estimated Timeline

```
Week 1-2: Critical fixes (160-180 hours)
├─ Confirmation tracking: 40-60h
├─ Integration tests: 60-80h
├─ Schnorr tests: 20-30h
└─ Config migration: 15-20h

Week 3-4: High priority (120-150 hours)
├─ Identity tests: 25-35h
├─ Upgrade tests: 30-40h
├─ Rollback logic: 20-30h
└─ Property tests: 15-20h

Week 5+: Medium priority (80-100 hours)
├─ Performance: 40-50h
├─ Docs: 20-30h
└─ Remaining fixes: 20-20h

TOTAL: 360-430 hours (9-11 weeks)
```

---

## File References

### Critical Files to Review
- `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/confirmation_tracker.rs` (434 lines)
- `/Users/munay/dev/QURI-PROTOCOL/canisters/rune-engine/src/lib.rs` (426 lines)
- `/Users/munay/dev/QURI-PROTOCOL/canisters/bitcoin-integration/src/schnorr.rs` (72 lines)
- `/Users/munay/dev/QURI-PROTOCOL/canisters/identity-manager/src/lib.rs` (214 lines)

### See Also
- Full Analysis Report: `CODEBASE_ANALYSIS_REPORT.md`
- Architecture Documentation: `ARCHITECTURE.md`
- Deployment Guide: `DEPLOYMENT.md`

---

**Last Updated:** November 15, 2025
**Status:** Ready for implementation
**Review Frequency:** Weekly

