Quick deployment helper for QURI Protocol.

Ask the user which environment to deploy to:
1. **local** - Local dfx replica
2. **testnet** - ICP testnet
3. **mainnet** - ICP mainnet (requires confirmation)

Based on selection:

**For Local:**
```bash
dfx start --background --clean
./scripts/deploy-local.sh
```

**For Testnet:**
```bash
./scripts/deploy-testnet.sh
```

**For Mainnet:**
- STOP and ask for explicit confirmation
- Remind user to check:
  - All tests passing
  - Code reviewed
  - Cycles topped up
  - Backup of current canister state if needed
- If confirmed, run: `dfx deploy --network ic`

After deployment:
1. Verify canister IDs match expected values
2. Run a health check on deployed canisters
3. Test basic functionality (query a canister)
4. Report success or any errors
