# QURI Protocol PocketIC Integration Tests

This directory contains integration tests for the QURI Protocol using PocketIC, ICP's official testing framework.

## Prerequisites

1. **Install dfx** (v0.26.0 or higher)
   ```bash
   sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
   ```

2. **Download PocketIC binary** (if not already available)
   ```bash
   # PocketIC is automatically downloaded by dfx >= 0.26.0
   # Manual installation (if needed):
   dfx cache install
   ```

3. **Build the canisters**
   ```bash
   cd backend
   cargo build --target wasm32-unknown-unknown --release
   ```

## Running Tests

### Run all integration tests
```bash
cd backend
cargo test --package quri-integration-tests
```

### Run a specific test
```bash
cargo test --package quri-integration-tests test_dead_man_switch_creation
```

### Run with output
```bash
cargo test --package quri-integration-tests -- --nocapture
```

### Run ignored tests (like vetKeys tests)
```bash
cargo test --package quri-integration-tests -- --ignored
```

## Test Coverage

### ✅ Implemented Tests

1. **Dead Man's Switch**
   - `test_dead_man_switch_creation` - Creating a new switch
   - `test_dead_man_switch_checkin` - Checking in to reset timer
   - `test_dead_man_switch_expiration` - Verifying expiration logic
   - `test_dead_man_switch_stats` - Getting aggregate statistics

### 🚧 Planned Tests

2. **Encrypted Metadata (vetKeys)**
   - Storage and retrieval
   - Access control verification
   - Time-locked reveals

3. **Rune Etching Flow**
   - End-to-end etching
   - UTXO selection
   - Transaction signing
   - Broadcasting

4. **Bitcoin Integration**
   - Address generation
   - UTXO management
   - Fee estimation
   - Threshold Schnorr signing

## Test Architecture

```
backend/
├── tests/
│   ├── Cargo.toml           # Test dependencies
│   ├── README.md            # This file
│   └── integration_test.rs  # Main test file
├── canisters/               # Canister source code
│   ├── rune-engine/
│   ├── bitcoin-integration/
│   └── registry/
└── target/                  # Build artifacts
    └── wasm32-unknown-unknown/
        └── release/
            ├── rune_engine.wasm
            ├── bitcoin_integration.wasm
            └── registry.wasm
```

## PocketIC Overview

PocketIC is the official testing framework for ICP canisters (dfx >= v0.26.0). It provides:

- **Isolated Testing**: Each test gets a fresh IC instance
- **Time Control**: Advance time for testing timeouts and deadlines
- **Full IC API**: Access to all management canister APIs
- **Fast Execution**: Runs locally without network calls
- **Deterministic**: Tests are reproducible

### Key Features Used

```rust
// Create isolated IC instance
let pic = PocketIc::new();

// Deploy canister
let canister_id = pic.create_canister();
pic.add_cycles(canister_id, 2_000_000_000_000);
pic.install_canister(canister_id, wasm_bytes, init_args, None);

// Call canister methods
pic.update_call(canister_id, caller, "method_name", args);
pic.query_call(canister_id, caller, "method_name", args);

// Time travel
pic.advance_time(Duration::from_secs(86400)); // +1 day
pic.tick(); // Process pending timers
```

## Debugging Tests

### View detailed test output
```bash
cargo test --package quri-integration-tests -- --nocapture --test-threads=1
```

### Check for compilation errors
```bash
cargo check --package quri-integration-tests
```

### Run tests with RUST_LOG
```bash
RUST_LOG=debug cargo test --package quri-integration-tests
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run PocketIC Tests
  run: |
    cd backend
    cargo build --target wasm32-unknown-unknown --release
    cargo test --package quri-integration-tests
```

## Test Data

Test principals are generated using:
```rust
fn test_user(id: u8) -> Principal {
    Principal::from_slice(&[id; 29])
}
```

Example addresses:
- Alice: `test_user(1)`
- Bob: `test_user(2)`
- Charlie: `test_user(3)`

## Resources

- [PocketIC Documentation](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/test/pocket-ic)
- [ICP Testing Guide](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/test/)
- [QURI Protocol Docs](../../README.md)

## Troubleshooting

### "Failed to read WASM file"
```bash
# Build the canisters first
cargo build --target wasm32-unknown-unknown --release
```

### "PocketIC binary not found"
```bash
# Ensure dfx is installed and up to date
dfx upgrade
dfx cache install
```

### Tests hang or timeout
- Check that timers are being triggered with `pic.tick()`
- Reduce timeout durations for faster tests
- Use `--test-threads=1` to run tests sequentially

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names (`test_feature_behavior`)
3. Add assertions with clear error messages
4. Document complex test scenarios
5. Update this README with new test coverage
