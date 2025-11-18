#!/bin/bash

# QURI Protocol - Extract Canister IDs for Frontend Configuration
# Run this after deploying canisters to get the IDs for .env.local

set -e

NETWORK="${1:-local}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  QURI Protocol - Canister IDs for Frontend"
echo "  Network: $NETWORK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get canister IDs
RUNE_ENGINE_ID=$(dfx canister id rune-engine --network $NETWORK 2>/dev/null || echo "NOT_DEPLOYED")
BTC_ID=$(dfx canister id bitcoin-integration --network $NETWORK 2>/dev/null || echo "NOT_DEPLOYED")
REGISTRY_ID=$(dfx canister id registry --network $NETWORK 2>/dev/null || echo "NOT_DEPLOYED")
IDENTITY_ID=$(dfx canister id identity-manager --network $NETWORK 2>/dev/null || echo "NOT_DEPLOYED")

# Determine IC host
if [ "$NETWORK" = "local" ]; then
    IC_HOST="http://localhost:4943"
elif [ "$NETWORK" = "ic" ]; then
    IC_HOST="https://ic0.app"
else
    IC_HOST="https://icp-api.io"
fi

echo "Copy these values to your frontend/.env.local file:"
echo ""
echo "NEXT_PUBLIC_IC_HOST=$IC_HOST"
echo "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE_ID"
echo "NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BTC_ID"
echo "NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY_ID"
echo "NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY_ID"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Optionally write to .env.local
if [ "$2" = "--write" ]; then
    ENV_FILE="$(dirname "$0")/../.env.local"
    echo "NEXT_PUBLIC_IC_HOST=$IC_HOST" > "$ENV_FILE"
    echo "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE_ID" >> "$ENV_FILE"
    echo "NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BTC_ID" >> "$ENV_FILE"
    echo "NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY_ID" >> "$ENV_FILE"
    echo "NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY_ID" >> "$ENV_FILE"
    echo ""
    echo "✅ Written to $ENV_FILE"
fi
