Run comprehensive tests for a specific canister.

Please specify which canister to test (rune-engine, bitcoin-integration, registry, or identity-manager), then:

1. Run `cargo test -p <canister_name>` to test the specified canister
2. Run `cargo clippy -p <canister_name>` to check for linting issues
3. Build the canister WASM with `cargo build --target wasm32-unknown-unknown --release -p <canister_name>`
4. Check the WASM file size and report if it's unusually large (>2MB warning)
5. Report all results with clear pass/fail status

If no canister is specified, run tests for the entire workspace with `cargo test --workspace`.
