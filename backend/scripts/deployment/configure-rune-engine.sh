#!/bin/bash
set -e

# QURI Protocol - Rune Engine Configuration Script
# This script configures the rune-engine canister with required dependencies

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Parse arguments
NETWORK=${1:-"ic"}

log_info "Configuring rune-engine canister on network: $NETWORK"
echo ""

# Get canister IDs from .env.local
if [ -f "$PROJECT_ROOT/frontend/.env.local" ]; then
    source "$PROJECT_ROOT/frontend/.env.local"
else
    log_error ".env.local not found. Please run deployment script first."
    exit 1
fi

# Verify required canister IDs
if [ -z "$NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID" ]; then
    log_error "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID" ]; then
    log_error "NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID not set"
    exit 1
fi

if [ -z "$NEXT_PUBLIC_REGISTRY_CANISTER_ID" ]; then
    log_error "NEXT_PUBLIC_REGISTRY_CANISTER_ID not set"
    exit 1
fi

log_info "Rune Engine: $NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID"
log_info "Bitcoin Integration: $NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID"
log_info "Registry: $NEXT_PUBLIC_REGISTRY_CANISTER_ID"
echo ""

# Configure canisters
log_info "Configuring canister dependencies..."

dfx canister call "$NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID" configure_canisters \
    "(principal \"$NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID\", principal \"$NEXT_PUBLIC_REGISTRY_CANISTER_ID\")" \
    --network "$NETWORK" 2>&1

if [ $? -eq 0 ]; then
    log_success "Canister dependencies configured"
else
    log_error "Failed to configure canister dependencies"
    exit 1
fi

# Update etching config (optional - defaults are usually fine)
log_info "Setting default etching configuration..."

dfx canister call "$NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID" update_etching_config \
    '(record {
        network = variant { Testnet };
        fee_rate = 2 : nat64;
        required_confirmations = 1 : nat32;
        enable_retries = true;
    })' \
    --network "$NETWORK" 2>&1

if [ $? -eq 0 ]; then
    log_success "Etching configuration updated"
else
    log_warn "Failed to update etching config (may already be set)"
fi

# Health check
log_info "Running health check..."

HEALTH=$(dfx canister call "$NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID" health_check --network "$NETWORK" 2>&1)

echo "$HEALTH"
echo ""

if echo "$HEALTH" | grep -q "healthy = true"; then
    log_success "Canister is healthy and ready!"
else
    log_warn "Canister health check shows issues - check configuration"
fi

echo ""
log_success "Configuration complete!"
