# QURI Protocol - Deployment Guide

Production-grade deployment guide for QURI Protocol Rune Launchpad on Internet Computer.

## 📋 Prerequisites

### Required Tools

```bash
# DFX (Internet Computer SDK)
dfx --version  # Should be >= 0.15.0

# Rust toolchain
rustc --version  # Should be >= 1.78.0
cargo --version

# WASM target
rustup target add wasm32-unknown-unknown
```

## 🚀 Quick Start - Local Deployment

### Step 1: Start DFX Replica

```bash
# Start local replica (clean state)
dfx start --clean --background
```

### Step 2: Deploy All Canisters

```bash
# Run automated deployment script
./scripts/deploy-local.sh
```

This script will:
1. ✅ Build all canisters for WASM
2. ✅ Deploy in dependency order
3. ✅ Configure inter-canister connections
4. ✅ Generate Bitcoin P2TR address
5. ✅ Display canister IDs and summary

### Step 3: Test the System

```bash
# Run end-to-end tests
./scripts/test-etching.sh
```

## 📦 Manual Deployment Steps

### 1. Build Canisters

```bash
cargo build --target wasm32-unknown-unknown --release \
    --package bitcoin-integration \
    --package registry \
    --package rune-engine \
    --package identity-manager
```

### 2. Deploy Bitcoin Integration

```bash
dfx deploy bitcoin-integration \
    --argument '(variant { Testnet }, principal "mxzaz-hqaaa-aaaar-qaada-cai")' \
    --network local
```

### 3. Configure Inter-Canister Connections

```bash
BTC_ID=$(dfx canister id bitcoin-integration --network local)
REGISTRY_ID=$(dfx canister id registry --network local)

dfx canister call rune-engine configure_canisters \
    "(principal \"$BTC_ID\", principal \"$REGISTRY_ID\")" \
    --network local
```

## 🧪 Testing

```bash
# Test creating a Rune
dfx canister call rune-engine create_rune '(record {
    rune_name = "TEST•RUNE";
    symbol = "TEST";
    divisibility = 8 : nat8;
    premine = 1000000 : nat64;
    terms = null;
})' --network local
```

## 🔧 Troubleshooting

### Issue: "Canister configuration not set"

Run configure_canisters command to link canisters.

### Issue: "Insufficient ckBTC balance"

Fund the Bitcoin address with testnet ckBTC.

---

For detailed documentation, see full deployment guide.
