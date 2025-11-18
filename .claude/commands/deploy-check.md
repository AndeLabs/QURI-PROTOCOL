Run pre-deployment checklist for QURI Protocol.

Execute the following checks in order:

1. **Backend Tests**: Run `cargo test --workspace` and verify all tests pass
2. **Frontend Tests**: Run `cd frontend && npm test` and verify all tests pass
3. **Type Check**: Run `cd frontend && npm run type-check` to ensure no TypeScript errors
4. **Git Status**: Check `git status` to ensure working directory is clean or changes are committed
5. **Canister Cycles**: Check cycles balance for all canisters:
   - Run `dfx canister status --network ic rune-engine`
   - Run `dfx canister status --network ic bitcoin-integration`
   - Run `dfx canister status --network ic registry`
   - Run `dfx canister status --network ic identity-manager`
   - Warn if any canister has less than 100B cycles
6. **Build Verification**: Run `cargo build --target wasm32-unknown-unknown --release` to ensure clean build
7. **Deployment Target Confirmation**: Ask user to confirm deployment target (local/testnet/mainnet)

Provide a final GO/NO-GO recommendation based on the results.
