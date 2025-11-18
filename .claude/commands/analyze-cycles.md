Analyze canister cycles usage and provide recommendations.

For each of the 4 QURI Protocol canisters:
- rune-engine (pkrpq-5qaaa-aaaah-aroda-cai)
- bitcoin-integration (yz6hf-qqaaa-aaaah-arn5a-cai)
- registry (pnqje-qiaaa-aaaah-arodq-cai)
- identity-manager (y67br-5iaaa-aaaah-arn5q-cai)

Execute:

1. **Check Current Status**: Run `dfx canister status --network ic <canister_id>` for each canister
2. **Extract Key Metrics**:
   - Current cycles balance
   - Memory size
   - Module hash
   - Controllers
3. **Calculate Burn Rate**: If historical data is available, estimate daily cycles consumption
4. **Estimate Runway**: Calculate how long current cycles will last at current burn rate
5. **Provide Recommendations**:
   - If cycles < 1T: CRITICAL - immediate top-up needed
   - If cycles < 100B: WARNING - plan top-up within 30 days
   - If cycles > 1T: HEALTHY - normal operation
6. **Top-up Command**: Provide the exact `dfx cycles top-up` command if top-up is recommended

Present results in a clear table format.
