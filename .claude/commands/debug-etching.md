Debug Rune etching process issues.

This command helps troubleshoot common issues in the Rune creation flow.

**Step-by-step debugging:**

1. **Check Canister Health**:
   - Verify rune-engine canister status
   - Verify bitcoin-integration canister status
   - Check cycles balances
   - Check memory usage

2. **Check Recent Logs**:
   - Look for errors in rune-engine logs
   - Check confirmation_tracker state
   - Verify etching_flow state machine

3. **Verify Bitcoin Integration**:
   - Check ckBTC balance in bitcoin-integration canister
   - Verify UTXO availability
   - Check Bitcoin API connectivity

4. **Test End-to-End Flow**:
   - Run `./scripts/test-etching.sh`
   - Monitor the etching process
   - Check registry for created Rune

5. **Common Issues to Check**:
   - Insufficient ckBTC balance
   - Bitcoin network congestion (high fees)
   - UTXO fragmentation
   - Validation errors (symbol, premine, etc.)
   - State machine stuck in intermediate state
   - Timer not running

6. **Recovery Actions**:
   - If state is stuck, check for idempotency issues
   - If UTXO issues, consolidate UTXOs
   - If timer issues, check canister controllers

Provide specific error messages and recommended fixes.
