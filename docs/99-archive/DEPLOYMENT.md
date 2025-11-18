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

## ⚡ Quick Start - Playground Deployment (Recommended for Testing)

**Perfect for demos and testing from your Vercel deployment!**

### Step 1: Deploy to ICP Playground

```bash
# Run automated playground deployment
./scripts/deploy-playground.sh
```

This script will:
1. ✅ Build all canisters for WASM
2. ✅ Deploy to ICP Playground (FREE, 20 min expiry)
3. ✅ Generate `frontend/.env.local` with Canister IDs
4. ✅ Display URLs to access canisters
5. ✅ Show instructions for Vercel configuration

### Step 2: Configure Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your **QURI-PROTOCOL** project
3. Go to **Settings** → **Environment Variables**
4. Add variables from `frontend/.env.local` (shown by script):
   ```
   NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID
   NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID
   NEXT_PUBLIC_REGISTRY_CANISTER_ID
   NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID
   NEXT_PUBLIC_IC_HOST=https://ic0.app
   NEXT_PUBLIC_DFX_NETWORK=ic
   ```
5. Choose environments: **Production**, **Preview**, **Development**
6. Redeploy: Push to GitHub or run `vercel --prod`

### Step 3: Test on Vercel

Visit your Vercel URL and verify canister connections work!

**⚠️ Important**: Playground canisters expire after 20 minutes. Re-run the script and update Vercel vars when they expire.

---

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
