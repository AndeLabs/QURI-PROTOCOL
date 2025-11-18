# 🧪 QURI Protocol - Bitcoin Testnet Testing Guide

> **Phase:** 1 - Production Testing
> **Network:** Bitcoin Testnet
> **Purpose:** Validate complete Runes creation flow before mainnet launch

---

## 🎯 Testing Objectives

### Primary Goals
1. ✅ **End-to-End Validation**: Complete Runes creation from UI to Bitcoin
2. ✅ **Bitcoin Integration**: Verify UTXO selection, signing, broadcasting
3. ✅ **ckBTC Integration**: Test payment flow and refunds
4. ✅ **Error Handling**: Validate all error scenarios
5. ✅ **Performance**: Measure latency and throughput
6. ✅ **Security**: Test rate limiting, input validation, auth

### Success Criteria
- [ ] 100+ successful Runes creations on testnet
- [ ] <30s average time from submission to confirmation
- [ ] 0 critical bugs
- [ ] All error scenarios handled gracefully
- [ ] Performance metrics within targets

---

## 🏗️ Testnet Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Test Environment                         │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Frontend   │       │  ICP Testnet │       │   Bitcoin    │
│   (Vercel    │  ───▶ │  Canisters   │  ───▶ │   Testnet    │
│   Preview)   │       │              │       │              │
└──────────────┘       └──────────────┘       └──────────────┘
       │                      │                       │
       │                      │                       │
       ▼                      ▼                       ▼
  Test Users            Monitoring              Mempool Watch
  (Manual QA)          (Logs/Metrics)         (Tx Confirmation)
```

---

## 📝 Pre-Deployment Checklist

### Environment Setup
- [ ] ICP testnet wallet configured
- [ ] Bitcoin testnet node access (or public API)
- [ ] ckBTC testnet tokens acquired
- [ ] Monitoring dashboard setup
- [ ] Error tracking configured (Sentry/similar)

### Canister Configuration
- [ ] Network set to `Testnet` (not Mainnet!)
- [ ] Fee parameters adjusted for testnet
- [ ] Rate limits configured (relaxed for testing)
- [ ] Logging level set to `DEBUG`
- [ ] Admin principals configured

### Frontend Configuration
- [ ] `.env` pointing to testnet canister IDs
- [ ] Bitcoin network set to `testnet`
- [ ] Test mode banner visible
- [ ] Analytics configured for test environment

---

## 🚀 Deployment Steps

### Step 1: Deploy Backend Canisters to ICP Testnet

```bash
# 1. Verify you're on the correct network
dfx identity whoami
dfx identity get-principal

# 2. Start local development (if testing locally first)
dfx start --background --clean

# 3. Build all canisters in release mode
cargo build --target wasm32-unknown-unknown --release --workspace

# 4. Deploy to ICP testnet
dfx deploy --network ic --mode reinstall

# Expected output:
# Deploying: rune-engine
# Canister ID: xxxxx-xxxxx-xxxxx-xxxxx-cai
# Deploying: bitcoin-integration
# Canister ID: yyyyy-yyyyy-yyyyy-yyyyy-cai
# ...

# 5. Save canister IDs
dfx canister --network ic id rune-engine > .canister_ids_testnet.txt
dfx canister --network ic id bitcoin-integration >> .canister_ids_testnet.txt
dfx canister --network ic id registry >> .canister_ids_testnet.txt
dfx canister --network ic id identity-manager >> .canister_ids_testnet.txt
```

### Step 2: Configure Canisters

```bash
# Configure Bitcoin network (TESTNET)
dfx canister --network ic call rune-engine configure_network '(variant { Testnet })'

# Configure ckBTC canister IDs (testnet versions)
CKBTC_LEDGER_TESTNET="mxzaz-hqaaa-aaaar-qaada-cai"  # ckBTC testnet ledger
BITCOIN_CANISTER_TESTNET="g4xu7-jiaaa-aaaan-aaaaq-cai"  # Bitcoin canister testnet

dfx canister --network ic call bitcoin-integration configure_canisters \
  "(principal \"$CKBTC_LEDGER_TESTNET\", principal \"$BITCOIN_CANISTER_TESTNET\")"

# Set fee parameters (lower for testnet)
dfx canister --network ic call rune-engine update_etching_config \
  '(record {
    network = variant { Testnet };
    fee_rate = 2;  # 2 sats/vbyte for testnet
    required_confirmations = 1;  # Faster for testing
    enable_retries = true;
  })'

# Verify configuration
dfx canister --network ic call rune-engine get_config
```

### Step 3: Deploy Frontend to Vercel (Testnet Preview)

```bash
cd frontend

# 1. Update environment variables for testnet
cat > .env.production.testnet <<EOF
NEXT_PUBLIC_DFX_NETWORK=ic
NEXT_PUBLIC_IC_HOST=https://ic0.app

# Canister IDs (from step 1)
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=xxxxx-xxxxx-xxxxx-xxxxx-cai
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=yyyyy-yyyyy-yyyyy-yyyyy-cai
NEXT_PUBLIC_REGISTRY_CANISTER_ID=zzzzz-zzzzz-zzzzz-zzzzz-cai
NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=aaaaa-aaaaa-aaaaa-aaaaa-cai

# Bitcoin network
NEXT_PUBLIC_BITCOIN_NETWORK=testnet

# Feature flags
NEXT_PUBLIC_TESTNET_MODE=true
NEXT_PUBLIC_SHOW_DEBUG_INFO=true
EOF

# 2. Deploy to Vercel preview
vercel --env-file .env.production.testnet

# 3. Note the preview URL
# Example: https://quri-testnet-xxxxx.vercel.app
```

### Step 4: Acquire Testnet Resources

```bash
# Get Bitcoin testnet coins
# Visit: https://testnet-faucet.mempool.co/
# Or: https://coinfaucet.eu/en/btc-testnet/

# Get ckBTC testnet tokens
# (Requires converting Bitcoin testnet coins to ckBTC)
# Visit: https://dashboard.internetcomputer.org/bitcoin/testnet

# Fund test principals with cycles (for canister operations)
dfx ledger --network ic top-up $(dfx canister --network ic id rune-engine) --amount 10
```

---

## 🧪 Testing Scenarios

### Test Case 1: Happy Path - Simple Runes Creation

**Objective**: Verify basic Runes creation works end-to-end

**Steps:**
1. Navigate to testnet frontend
2. Connect with Internet Identity
3. Fill Runes creation form:
   - Name: `TEST•RUNE•ONE`
   - Symbol: `TEST`
   - Divisibility: 8
   - Premine: 1000000
   - No mint terms
4. Approve ckBTC fee payment
5. Submit transaction
6. Wait for confirmation

**Expected Result:**
- Transaction submitted successfully
- Process ID returned
- Status updates in real-time
- Bitcoin transaction broadcasted
- Confirmation within 10-60 minutes (testnet block time)
- Rune visible in registry

**Pass Criteria:**
- ✅ No errors during submission
- ✅ Transaction appears in Bitcoin mempool
- ✅ Transaction confirms on-chain
- ✅ Rune data stored correctly in registry

---

### Test Case 2: Complex Runes with Mint Terms

**Objective**: Test advanced Runes features

**Steps:**
1. Create Rune with mint terms:
   - Name: `MINTABLE•RUNE`
   - Symbol: `MINT`
   - Divisibility: 2
   - Premine: 0
   - Mint terms:
     - Amount per mint: 100
     - Cap: 10000
     - Height start: Current block + 10
     - Height end: Current block + 1000
2. Submit and confirm

**Expected Result:**
- Runestone contains correct mint terms
- OP_RETURN data properly formatted
- Transaction confirms successfully

**Pass Criteria:**
- ✅ Mint terms encoded correctly
- ✅ Transaction size within limits (<400KB)
- ✅ Fees calculated accurately

---

### Test Case 3: Error Handling - Insufficient Funds

**Objective**: Verify graceful handling of insufficient ckBTC

**Steps:**
1. Create account with 0 ckBTC
2. Attempt to create Rune
3. Observe error handling

**Expected Result:**
- Clear error message: "Insufficient ckBTC balance"
- No transaction submitted
- No state changes
- User can retry after funding

**Pass Criteria:**
- ✅ Error caught before submission
- ✅ User-friendly error message
- ✅ No orphaned processes
- ✅ Logs contain diagnostic info

---

### Test Case 4: Error Handling - Invalid Input

**Objective**: Test input validation

**Test Inputs:**
- Invalid name: `123` (too short)
- Invalid symbol: `TOOLONGSYMBOL`
- Invalid divisibility: 39 (max is 38)
- Negative premine: -100

**Expected Result:**
- Validation errors shown in UI
- No backend calls made
- Helpful error messages

**Pass Criteria:**
- ✅ Frontend validation works
- ✅ Backend validation as fallback
- ✅ Clear error messages

---

### Test Case 5: Rate Limiting

**Objective**: Verify rate limiting prevents abuse

**Steps:**
1. Submit 10 Rune creations rapidly
2. Observe behavior after limit reached

**Expected Result:**
- First N requests succeed (based on rate limit)
- Subsequent requests receive 429 error
- Rate limit resets after time window

**Pass Criteria:**
- ✅ Rate limiting enforced
- ✅ Error message explains wait time
- ✅ No DoS on canisters

---

### Test Case 6: Concurrent Users

**Objective**: Test system under load

**Steps:**
1. Simulate 10 concurrent users
2. Each submits Rune creation
3. Monitor system performance

**Expected Result:**
- All submissions processed
- No deadlocks or race conditions
- Performance within targets (<30s per submission)

**Pass Criteria:**
- ✅ All transactions succeed
- ✅ No duplicate processes
- ✅ Logs show proper sequencing

---

### Test Case 7: Network Interruption

**Objective**: Test resilience to network issues

**Steps:**
1. Submit Rune creation
2. Simulate network disconnect during broadcast
3. Observe recovery behavior

**Expected Result:**
- System retries broadcast
- Eventually succeeds or fails gracefully
- State remains consistent

**Pass Criteria:**
- ✅ Retry logic works
- ✅ No stuck processes
- ✅ User notified of status

---

### Test Case 8: Bitcoin Mempool Congestion

**Objective**: Test behavior during high fees

**Steps:**
1. Wait for testnet mempool congestion
2. Submit Rune with low fee estimate
3. Observe confirmation time

**Expected Result:**
- Transaction submits but may delay
- Fee estimation adjusts
- User warned of potential delay

**Pass Criteria:**
- ✅ Transaction eventually confirms
- ✅ User informed of delay
- ✅ Can adjust fee if needed

---

## 📊 Performance Testing

### Load Test Specification

```bash
# Install load testing tool
npm install -g artillery

# Create load test config
cat > load-test.yml <<EOF
config:
  target: "https://quri-testnet.vercel.app"
  phases:
    - duration: 60
      arrivalRate: 5  # 5 users per second
      name: "Ramp up"
    - duration: 300
      arrivalRate: 10  # 10 users per second
      name: "Sustained load"

scenarios:
  - name: "Create Rune"
    flow:
      - post:
          url: "/api/runes/create"
          json:
            name: "LOAD•TEST•{{ \$randomString() }}"
            symbol: "LOAD"
            divisibility: 8
            premine: 1000
          capture:
            - json: "\$.processId"
              as: "processId"
      - get:
          url: "/api/runes/status/{{ processId }}"
EOF

# Run load test
artillery run load-test.yml
```

**Performance Targets:**
- Average response time: <2s
- 95th percentile: <5s
- 99th percentile: <10s
- Error rate: <1%
- Throughput: 10+ submissions/second

---

## 🔍 Monitoring & Debugging

### Canister Logs

```bash
# Tail logs in real-time
dfx canister --network ic logs rune-engine

# Filter for errors
dfx canister --network ic logs rune-engine | grep ERROR

# Search for specific process
dfx canister --network ic logs rune-engine | grep "process-id-123"
```

### Bitcoin Transaction Monitoring

```bash
# Watch testnet mempool
curl https://mempool.space/testnet/api/address/YOUR_ADDRESS/txs

# Check transaction status
curl https://mempool.space/testnet/api/tx/YOUR_TXID

# Monitor confirmation
watch -n 10 'curl -s https://mempool.space/testnet/api/tx/YOUR_TXID | jq .status.confirmed'
```

### Metrics Dashboard

Key metrics to monitor:
- **Submission Rate**: Runes/minute
- **Confirmation Time**: Average time to Bitcoin confirmation
- **Error Rate**: % of failed submissions
- **Gas Costs**: Average ckBTC fees paid
- **User Activity**: Active users, new users

---

## 🐛 Common Issues & Solutions

### Issue 1: Transaction Not Broadcasting

**Symptoms:**
- Process stuck in "Signing" state
- No transaction visible in mempool

**Diagnosis:**
```bash
# Check canister logs
dfx canister --network ic logs bitcoin-integration

# Look for Bitcoin RPC errors
# Common causes:
# - Invalid transaction format
# - Insufficient fees
# - RPC node issues
```

**Solution:**
- Verify Bitcoin RPC configuration
- Check transaction serialization
- Increase fee estimates
- Retry broadcast manually

---

### Issue 2: ckBTC Transfer Fails

**Symptoms:**
- Error: "Transfer failed: InsufficientFunds"
- User has balance but transfer rejected

**Diagnosis:**
```bash
# Check user balance
dfx canister --network ic call ckbtc-ledger icrc1_balance_of \
  '(record { owner = principal "USER_PRINCIPAL"; subaccount = null })'

# Check allowance
dfx canister --network ic call ckbtc-ledger icrc2_allowance \
  '(record {
    account = record { owner = principal "USER_PRINCIPAL"; subaccount = null };
    spender = record { owner = principal "CANISTER_PRINCIPAL"; subaccount = null }
  })'
```

**Solution:**
- User needs to approve canister first
- Implement approve step in UI
- Check ICRC-2 approval flow

---

### Issue 3: Slow Confirmations

**Symptoms:**
- Transactions taking >1 hour to confirm
- Multiple unconfirmed in mempool

**Diagnosis:**
```bash
# Check testnet mempool size
curl https://mempool.space/testnet/api/mempool

# Check fee rates
curl https://mempool.space/testnet/api/v1/fees/recommended
```

**Solution:**
- Increase fee rate estimate
- Use dynamic fee calculation
- Implement RBF (Replace-By-Fee) if needed

---

## 📋 Test Execution Checklist

### Pre-Test
- [ ] All canisters deployed to testnet
- [ ] Frontend deployed to Vercel preview
- [ ] Test accounts funded with ckBTC
- [ ] Monitoring dashboards accessible
- [ ] Team notified of test window

### During Test
- [ ] Execute all 8 test cases
- [ ] Record results in test report
- [ ] Capture screenshots/videos
- [ ] Monitor system metrics
- [ ] Log any anomalies

### Post-Test
- [ ] Analyze test results
- [ ] Document bugs found
- [ ] Update bug tracking system
- [ ] Review performance metrics
- [ ] Plan fixes for issues
- [ ] Schedule retest if needed

---

## 📈 Test Report Template

```markdown
# QURI Protocol Testnet Test Report

**Date:** YYYY-MM-DD
**Environment:** Bitcoin Testnet, ICP Testnet
**Tester:** [Name]

## Summary
- Total Tests: X
- Passed: Y
- Failed: Z
- Blocked: W

## Test Results

### Test Case 1: Happy Path
- **Status:** ✅ PASS / ❌ FAIL
- **Duration:** Xs
- **Notes:** [Any observations]
- **Evidence:** [Link to transaction/screenshot]

[Repeat for all test cases]

## Performance Metrics
- Average submission time: Xs
- Average confirmation time: Xm
- Error rate: X%
- Peak throughput: X tx/min

## Issues Found
1. **[Issue Title]**
   - Severity: Critical / High / Medium / Low
   - Description: ...
   - Steps to reproduce: ...
   - Expected: ...
   - Actual: ...

## Recommendations
1. [Action item 1]
2. [Action item 2]

## Sign-off
- [ ] Ready for mainnet
- [ ] Needs fixes before mainnet
- [ ] Requires additional testing
```

---

## 🎯 Definition of Done

Phase 1 is considered **COMPLETE** when:

### Functional Requirements
- [ ] All 8 test cases pass consistently
- [ ] 100+ successful Runes created on testnet
- [ ] 0 critical bugs
- [ ] All error scenarios handled

### Performance Requirements
- [ ] Average confirmation time <30s (ICP side)
- [ ] Bitcoin confirmation within normal block time
- [ ] System handles 10+ concurrent users
- [ ] Load test passes at 10 submissions/second

### Quality Requirements
- [ ] Code coverage >80%
- [ ] All Clippy warnings resolved
- [ ] Security audit completed (if applicable)
- [ ] Documentation complete

### Operational Requirements
- [ ] Monitoring in place
- [ ] Runbooks created
- [ ] Disaster recovery plan documented
- [ ] Team trained on operations

---

## 🚀 Next Steps After Testnet Success

Once testnet testing is complete and successful:

1. **Final Code Review** (1-2 days)
   - Security review
   - Performance optimization
   - Code cleanup

2. **Mainnet Deployment Plan** (1 week prep)
   - Mainnet canister IDs reserved
   - Production ckBTC tokens ready
   - Monitoring configured
   - Support team briefed

3. **Staged Mainnet Launch**
   - Beta launch (10 users)
   - Limited launch (100 users)
   - Public launch (unlimited)

4. **Post-Launch Monitoring** (2 weeks)
   - 24/7 monitoring
   - Rapid response team
   - Daily metrics review
   - User feedback collection

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Next Review:** After testnet completion
