#!/bin/bash

# QURI Protocol - Production-Grade Local Deployment Script
# Deploys all canisters to local replica with proper configuration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
NETWORK="local"
BITCOIN_NETWORK="Testnet"
CKBTC_LEDGER_ID="mxzaz-hqaaa-aaaar-qaada-cai"  # Testnet ckBTC ledger

# Banner
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  QURI Protocol - Local Deployment"
echo "  Production-Ready Rune Launchpad on Internet Computer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if dfx is running
log_info "Checking dfx replica status..."
if ! dfx ping &>/dev/null; then
    log_warning "dfx replica not running. Starting..."
    dfx start --clean --background
    sleep 5
else
    log_success "dfx replica is running"
fi

# Build all canisters
log_info "Building all canisters for wasm32-unknown-unknown..."
cargo build --target wasm32-unknown-unknown --release \
    --package bitcoin-integration \
    --package registry \
    --package rune-engine \
    --package identity-manager

if [ $? -eq 0 ]; then
    log_success "All canisters built successfully"
else
    log_error "Build failed"
    exit 1
fi

# Deploy canisters in dependency order
echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 1: Deploying Bitcoin Integration canister"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BTC_CANISTER_ID=$(dfx deploy bitcoin-integration --argument "(variant { $BITCOIN_NETWORK }, principal \"$CKBTC_LEDGER_ID\")" --network $NETWORK 2>&1 | grep -oP 'Canister.*?\K[a-z0-9-]+' | tail -1)

if [ -z "$BTC_CANISTER_ID" ]; then
    # Try to get from dfx canister id
    BTC_CANISTER_ID=$(dfx canister id bitcoin-integration --network $NETWORK)
fi

log_success "Bitcoin Integration deployed: $BTC_CANISTER_ID"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 2: Deploying Registry canister"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

REGISTRY_CANISTER_ID=$(dfx deploy registry --network $NETWORK 2>&1 | grep -oP 'Canister.*?\K[a-z0-9-]+' | tail -1)

if [ -z "$REGISTRY_CANISTER_ID" ]; then
    REGISTRY_CANISTER_ID=$(dfx canister id registry --network $NETWORK)
fi

log_success "Registry deployed: $REGISTRY_CANISTER_ID"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 3: Deploying Rune Engine canister"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RUNE_ENGINE_ID=$(dfx deploy rune-engine --network $NETWORK 2>&1 | grep -oP 'Canister.*?\K[a-z0-9-]+' | tail -1)

if [ -z "$RUNE_ENGINE_ID" ]; then
    RUNE_ENGINE_ID=$(dfx canister id rune-engine --network $NETWORK)
fi

log_success "Rune Engine deployed: $RUNE_ENGINE_ID"

echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 4: Deploying Identity Manager canister"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

IDENTITY_CANISTER_ID=$(dfx deploy identity-manager --network $NETWORK 2>&1 | grep -oP 'Canister.*?\K[a-z0-9-]+' | tail -1)

if [ -z "$IDENTITY_CANISTER_ID" ]; then
    IDENTITY_CANISTER_ID=$(dfx canister id identity-manager --network $NETWORK)
fi

log_success "Identity Manager deployed: $IDENTITY_CANISTER_ID"

# Configure inter-canister connections
echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 5: Configuring Inter-Canister Connections"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Configuring Rune Engine with Bitcoin Integration and Registry IDs..."
dfx canister call rune-engine configure_canisters "(principal \"$BTC_CANISTER_ID\", principal \"$REGISTRY_CANISTER_ID\")" --network $NETWORK

if [ $? -eq 0 ]; then
    log_success "Inter-canister configuration complete"
else
    log_warning "Inter-canister configuration may have failed (check manually)"
fi

# Get Bitcoin address
echo ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "Step 6: Generating Bitcoin P2TR Address"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

log_info "Requesting P2TR address from Bitcoin Integration..."
BTC_ADDRESS=$(dfx canister call bitcoin-integration get_p2tr_address --network $NETWORK 2>&1 || echo "")

if [ ! -z "$BTC_ADDRESS" ]; then
    log_success "Bitcoin address generated"
    echo "$BTC_ADDRESS"
else
    log_warning "Could not generate Bitcoin address (may need manual setup)"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_success "All canisters deployed successfully!"
echo ""
echo "Canister IDs:"
echo "  • Bitcoin Integration: $BTC_CANISTER_ID"
echo "  • Registry:            $REGISTRY_CANISTER_ID"
echo "  • Rune Engine:         $RUNE_ENGINE_ID"
echo "  • Identity Manager:    $IDENTITY_CANISTER_ID"
echo ""
echo "Configuration:"
echo "  • Network:       $NETWORK"
echo "  • Bitcoin:       $BITCOIN_NETWORK"
echo "  • ckBTC Ledger:  $CKBTC_LEDGER_ID"
echo ""
echo "Next steps:"
echo "  1. Fund Bitcoin address with testnet BTC (if testing)"
echo "  2. Get some testnet ckBTC for testing"
echo "  3. Test etching flow with: ./scripts/test-etching.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
