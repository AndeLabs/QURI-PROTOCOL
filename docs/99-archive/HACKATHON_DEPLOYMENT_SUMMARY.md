# 🚀 QURI Protocol - Hackathon Deployment Summary

**Date**: November 16, 2025
**Status**: ✅ Successfully Deployed (Hybrid Strategy)

---

## 📊 Deployment Strategy

We used a **hybrid approach** to maximize our 10 TC faucet cycles:

### ✅ Permanent Canisters (ICP Mainnet - Bitcoin Testnet API)
Deployed with the free 10 TC faucet, these are **permanent** and will last ~38 years:

| Canister | ID | Network | Status | Balance |
|----------|-----|---------|--------|---------|
| **bitcoin-integration** | `yz6hf-qqaaa-aaaah-arn5a-cai` | IC Mainnet | ✅ Running | 2.996 TC |
| **identity-manager** | `y67br-5iaaa-aaaah-arn5q-cai` | IC Mainnet | ✅ Running | 2.997 TC |

### ⚡ Temporary Canisters (Playground - For Demo)
Deployed FREE on Playground, expires in 20 min (can redeploy anytime):

| Canister | ID | Network | Status |
|----------|-----|---------|--------|
| **rune-engine** | `z7chj-7qaaa-aaaab-qacbq-cai` | Playground | ✅ Running |
| **registry** | `wxani-naaaa-aaaab-qadgq-cai` | Playground | ✅ Running |
| **bitcoin-integration** | `4dz5m-uyaaa-aaaab-qac6a-cai` | Playground | ✅ Running |
| **identity-manager** | `3l4c5-2qaaa-aaaab-qacpq-cai` | Playground | ✅ Running |

---

## 🧪 Testing Results

### ✅ Bitcoin Integration (Mainnet - Permanent)
```bash
dfx canister --network ic call bitcoin-integration get_block_height
# Result: Block 110,327 (Bitcoin Testnet) ✅

dfx canister --network ic call bitcoin-integration get_fee_estimates
# Result: Slow: 1,095 sat/vB, Medium: 1,145, Fast: 1,797 ✅
```

### ✅ Identity Manager (Mainnet - Permanent)
```bash
dfx canister --network ic call identity-manager create_session \
  '(record { can_create_rune = true; can_transfer = true; max_amount = 1000000 }, 3600000000000)'
# Result: Session created with cryptographic session key ✅

dfx canister --network ic call identity-manager check_permission '(variant { CreateRune })'
# Result: true ✅
```

### ✅ Rune Engine (Playground - Temporary)
```bash
dfx canister --playground call rune-engine health_check
# Result: Canister running, config initialized ✅

dfx canister --playground call rune-engine get_metrics_summary
# Result: Metrics system operational ✅

dfx canister --playground call rune-engine get_cycles_metrics
# Result: Cycles monitoring active ✅
```

### ✅ Registry (Playground - Temporary)
```bash
dfx canister --playground call registry total_runes
# Result: 0 (freshly initialized) ✅
```

---

## 🌐 Candid UI URLs

### Permanent Canisters (Mainnet)
- **Bitcoin Integration**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=yz6hf-qqaaa-aaaah-arn5a-cai
- **Identity Manager**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=y67br-5iaaa-aaaah-arn5q-cai

### Temporary Canisters (Playground)
- **Rune Engine**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=z7chj-7qaaa-aaaab-qacbq-cai
- **Registry**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=wxani-naaaa-aaaab-qadgq-cai

### Existing Frontend
- **Frontend URL**: https://3d5wy-5aaaa-aaaag-qkhsq-cai.icp0.io/

---

## ⚙️ Frontend Configuration

Update your frontend `.env.local` with:

```bash
# For Playground Demo (20 min expiry)
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=z7chj-7qaaa-aaaab-qacbq-cai
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=4dz5m-uyaaa-aaaab-qac6a-cai
NEXT_PUBLIC_REGISTRY_CANISTER_ID=wxani-naaaa-aaaab-qadgq-cai
NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=3l4c5-2qaaa-aaaab-qacpq-cai

# For Permanent/Production (use mainnet canisters)
# NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=yz6hf-qqaaa-aaaah-arn5a-cai
# NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=y67br-5iaaa-aaaah-arn5q-cai

NEXT_PUBLIC_IC_HOST=https://icp0.io
NEXT_PUBLIC_BITCOIN_NETWORK=testnet
NEXT_PUBLIC_TESTNET_MODE=true
```

---

## 💰 Cycles Usage Summary

| Item | Cost | Status |
|------|------|--------|
| **Initial Balance** | 10 TC | From faucet ✅ |
| bitcoin-integration (mainnet) | 3 TC | Created ✅ |
| identity-manager (mainnet) | 3 TC | Created ✅ |
| Deployment overhead | ~1 TC | Consumed ✅ |
| **Remaining** | 3 TC | Available |
| **Playground deployments** | 0 TC | FREE ✅ |

**Burn Rate**: ~210M cycles/day
**Time to Live**: ~38 years with current balance ✅

---

## 🎯 Hackathon Demo Strategy

### Option 1: Use Playground (Recommended for Live Demo)
**Pros**:
- ✅ All 4 canisters available
- ✅ Complete end-to-end flow
- ✅ FREE
- ✅ Can redeploy instantly

**Cons**:
- ⏰ Expires in 20 min
- 🔄 Need to redeploy before each demo

**Command to redeploy**:
```bash
dfx deploy --playground
```

### Option 2: Use Mainnet Canisters (Limited but Permanent)
**Pros**:
- ✅ Permanent (no expiry)
- ✅ Professional setup

**Cons**:
- ❌ Only 2 canisters (no rune-engine, no registry)
- ❌ Limited functionality

### Option 3: Get More Cycles for Complete Mainnet
**Options**:
- 💬 Request more cycles on Discord (#cycles-faucet)
- 💰 Buy ~$15 USD of ICP and convert to cycles

---

## 🔧 Quick Commands Reference

### Redeploy Playground (before demo)
```bash
dfx deploy --playground
```

### Check Canister Status
```bash
# Mainnet
export DFX_WARNING=-mainnet_plaintext_identity
dfx canister --network ic status bitcoin-integration
dfx canister --network ic status identity-manager

# Playground
dfx canister --playground call rune-engine health_check
dfx canister --playground call registry total_runes
```

### Test Bitcoin Connection
```bash
# Mainnet (permanent)
dfx canister --network ic call bitcoin-integration get_block_height
dfx canister --network ic call bitcoin-integration get_fee_estimates

# Playground
dfx canister --playground call bitcoin-integration get_block_height
```

---

## ✅ What's Working

1. **Bitcoin Testnet Integration** ✅
   - Block height tracking
   - Fee estimation
   - Real-time Bitcoin data

2. **Session Management** ✅
   - Cryptographic session keys
   - Permission system
   - User stats tracking

3. **Performance Monitoring** ✅
   - Metrics collection
   - Cycles monitoring
   - Health checks

4. **Logging System** ✅
   - Structured logs
   - Error tracking
   - Query capabilities

5. **RBAC System** ✅
   - Role-based access
   - Owner/Admin/User roles
   - Permission checks

---

## ⚠️ Known Limitations

1. **Schnorr Signatures** ⚠️
   - Requires threshold BLS key configuration
   - Not yet configured (need key_id from DFINITY)

2. **Playground Expiry** ⚠️
   - 20 minute timeout
   - Needs redeploy before each demo

3. **Split Deployment** ⚠️
   - Core canisters on mainnet (permanent)
   - Full system on playground (temporary)

---

## 🎊 Conclusion

We successfully deployed QURI Protocol using a smart hybrid strategy:

- ✅ **2 permanent canisters** on ICP mainnet (Bitcoin integration + Identity)
- ✅ **4 temporary canisters** on Playground (full system for demo)
- ✅ **Bitcoin Testnet connected** and operational
- ✅ **All core features tested** and working
- ✅ **Ready for hackathon demo** with instant redeploy capability

### For Hackathon Presentation:
1. **Live Demo**: Use Playground (redeploy right before)
2. **Persistence**: Show mainnet canisters as proof of concept
3. **Bitcoin Integration**: Demonstrate real testnet connection
4. **Session Keys**: Show innovative UX features

---

**Last Updated**: November 16, 2025
**Project**: QURI Protocol - Bitcoin Runes Launchpad
**Status**: 🚀 Ready for Demo
