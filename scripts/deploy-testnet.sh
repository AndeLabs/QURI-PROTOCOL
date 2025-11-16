#!/bin/bash

# ============================================================================
# QURI Protocol - Testnet Deployment Script
# ============================================================================
#
# Deployment rápido para testnet (testing y desarrollo).
#
# ============================================================================

set -e

echo "🧪 QURI Protocol - Testnet Deployment"
echo "======================================"
echo ""

NETWORK="ic"  # or "playground" if using playground
BITCOIN_CANISTER="ghsi2-tqaaa-aaaan-aaaca-cai"  # Bitcoin testnet integration

echo "📦 Building canisters..."
dfx build --network "$NETWORK" --all

echo ""
echo "📤 Deploying to testnet..."
dfx deploy --network "$NETWORK" --all

echo ""
echo "⚙️  Configuring..."

# Get canister IDs
REGISTRY=$(dfx canister --network "$NETWORK" id registry)
RUNE_ENGINE=$(dfx canister --network "$NETWORK" id rune-engine)

# Configure
dfx canister --network "$NETWORK" call rune-engine configure_canisters \
    "(principal \"$BITCOIN_CANISTER\", principal \"$REGISTRY\")"

dfx canister --network "$NETWORK" call rune-engine update_etching_config \
    '(record {
        network = variant { Testnet };
        fee_rate = 2 : nat64;
        required_confirmations = 1 : nat32;
        enable_retries = true;
    })'

echo ""
echo "✅ Testnet deployment complete!"
echo ""
echo "Canister IDs:"
echo "  Registry:    $REGISTRY"
echo "  Rune Engine: $RUNE_ENGINE"
echo ""
echo "Test with:"
echo "  dfx canister --network $NETWORK call $RUNE_ENGINE health_check"
