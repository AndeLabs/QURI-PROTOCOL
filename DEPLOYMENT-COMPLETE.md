# QURI Protocol - Complete Deployment Guide

Production-ready deployment guide for QURI Protocol on Internet Computer.

## Quick Start

```bash
# Testnet (recommended first)
./scripts/deploy-testnet.sh

# Mainnet (production)
./scripts/deploy-mainnet-complete.sh
```

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Testnet Deployment](#testnet-deployment)
3. [Mainnet Deployment](#mainnet-deployment)
4. [Monitoring](#monitoring)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Tools

- `dfx` (IC SDK): `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`
- Rust + wasm32 target
- Cycles wallet with 20T+ cycles

### Configuration

Create `.env.mainnet`:
```
BITCOIN_INTEGRATION_CANISTER=ghsi2-tqaaa-aaaan-aaaca-cai
```

---

## Testnet Deployment

```bash
./scripts/deploy-testnet.sh
```

Manual steps:
```bash
dfx build --network ic --all
dfx deploy --network ic --all
dfx canister --network ic call rune-engine configure_canisters "(principal \"ghsi2-tqaaa-aaaan-aaaca-cai\", principal \"$(dfx canister --network ic id registry)\")"
```

---

## Mainnet Deployment

```bash
./scripts/deploy-mainnet-complete.sh
```

This automated script handles:
- ✅ Building canisters
- ✅ Deploying Registry + Rune Engine
- ✅ Configuration
- ✅ Cycles funding (2T + 10T)
- ✅ Verification
- ✅ Documentation generation

---

## Monitoring

### Cycles

```bash
dfx canister --network ic call rune-engine get_cycles_metrics
```

Returns: balance, status (Critical/Warning/Low/Healthy), burn rate, ETA

### Performance

```bash
dfx canister --network ic call rune-engine get_metrics_summary
```

Returns: runes created, errors, success rate, latency

### Logs

```bash
dfx canister --network ic call rune-engine get_recent_errors '(50 : nat64)'
```

---

## Troubleshooting

### Out of Cycles

```bash
dfx canister --network ic deposit-cycles 5000000000000 rune-engine
```

### Configuration Issues

```bash
dfx canister --network ic call rune-engine health_check
```

Should return `healthy = true`

---

## Upgrade

```bash
dfx build --network ic rune-engine
dfx canister --network ic install rune-engine --mode upgrade
dfx canister --network ic call rune-engine health_check
```

Data persists in stable memory across upgrades.

---

## Emergency

If canister frozen:
```bash
dfx canister --network ic deposit-cycles 5000000000000 rune-engine
dfx canister --network ic start rune-engine
```

---

For full documentation, see DEPLOYMENT.md
