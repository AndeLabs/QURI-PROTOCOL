#!/bin/bash

# ============================================================================
# QURI Protocol - Complete Mainnet Deployment Script
# ============================================================================
#
# Este script automatiza el deployment completo de QURI Protocol a mainnet.
#
# Pre-requisitos:
# - dfx instalado y configurado
# - Identidad con cycles suficientes
# - Bitcoin Integration canister desplegado en mainnet
# - Registry canister desplegado
#
# Uso:
#   ./scripts/deploy-mainnet-complete.sh
#
# ============================================================================

set -e  # Exit on error

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║       QURI Protocol - Mainnet Deployment Script                 ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# Configuration
# ============================================================================

NETWORK="ic"
BITCOIN_INTEGRATION_CANISTER="ghsi2-tqaaa-aaaan-aaaca-cai"  # IC mainnet Bitcoin Integration
REGISTRY_CANISTER=""  # Will be set after deployment
RUNE_ENGINE_CANISTER=""  # Will be set after deployment

# Check if .env.mainnet exists
if [ ! -f ".env.mainnet" ]; then
    echo "❌ Error: .env.mainnet file not found"
    echo "Please create .env.mainnet with required environment variables"
    exit 1
fi

# Load environment variables
source .env.mainnet

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo "🔍 Running pre-flight checks..."
echo ""

# Check dfx installation
if ! command -v dfx &> /dev/null; then
    echo "❌ Error: dfx is not installed"
    echo "Install dfx: sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi

echo "✅ dfx version: $(dfx --version)"

# Check current identity
CURRENT_IDENTITY=$(dfx identity whoami)
echo "✅ Current identity: $CURRENT_IDENTITY"

# Check cycles balance
CYCLES_BALANCE=$(dfx wallet --network "$NETWORK" balance 2>/dev/null || echo "0")
echo "✅ Cycles balance: $CYCLES_BALANCE"

echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 1: Build Canisters
# ============================================================================

echo "📦 Step 1/7: Building canisters..."
echo ""

# Clean previous builds
echo "  Cleaning previous builds..."
cargo clean
rm -rf .dfx/

# Build all canisters
echo "  Building canisters for mainnet..."
dfx build --network "$NETWORK" --all

echo "✅ Canisters built successfully"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 2: Deploy Registry Canister
# ============================================================================

echo "📤 Step 2/7: Deploying Registry canister..."
echo ""

# Deploy registry
REGISTRY_OUTPUT=$(dfx deploy --network "$NETWORK" registry)
REGISTRY_CANISTER=$(echo "$REGISTRY_OUTPUT" | grep -o 'canister_id: [a-z0-9-]*' | cut -d' ' -f2)

if [ -z "$REGISTRY_CANISTER" ]; then
    echo "❌ Error: Failed to extract Registry canister ID"
    exit 1
fi

echo "✅ Registry canister deployed: $REGISTRY_CANISTER"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 3: Deploy Rune Engine Canister
# ============================================================================

echo "📤 Step 3/7: Deploying Rune Engine canister..."
echo ""

# Deploy rune-engine
RUNE_ENGINE_OUTPUT=$(dfx deploy --network "$NETWORK" rune-engine)
RUNE_ENGINE_CANISTER=$(echo "$RUNE_ENGINE_OUTPUT" | grep -o 'canister_id: [a-z0-9-]*' | cut -d' ' -f2)

if [ -z "$RUNE_ENGINE_CANISTER" ]; then
    echo "❌ Error: Failed to extract Rune Engine canister ID"
    exit 1
fi

echo "✅ Rune Engine canister deployed: $RUNE_ENGINE_CANISTER"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 4: Configure Rune Engine
# ============================================================================

echo "⚙️  Step 4/7: Configuring Rune Engine..."
echo ""

# Configure canisters
echo "  Configuring canister IDs..."
dfx canister --network "$NETWORK" call rune-engine configure_canisters \
    "(principal \"$BITCOIN_INTEGRATION_CANISTER\", principal \"$REGISTRY_CANISTER\")"

echo "✅ Canister IDs configured"

# Configure etching settings
echo "  Configuring etching settings..."
dfx canister --network "$NETWORK" call rune-engine update_etching_config \
    '(record {
        network = variant { Mainnet };
        fee_rate = 10 : nat64;
        required_confirmations = 6 : nat32;
        enable_retries = true;
    })'

echo "✅ Etching config updated"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 5: Fund Canisters with Cycles
# ============================================================================

echo "💰 Step 5/7: Funding canisters with cycles..."
echo ""

# Fund Registry (2T cycles)
echo "  Funding Registry canister (2T cycles)..."
dfx canister --network "$NETWORK" deposit-cycles 2000000000000 registry

# Fund Rune Engine (10T cycles - needs more for Bitcoin operations)
echo "  Funding Rune Engine canister (10T cycles)..."
dfx canister --network "$NETWORK" deposit-cycles 10000000000000 rune-engine

echo "✅ Canisters funded"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 6: Verify Deployment
# ============================================================================

echo "✅ Step 6/7: Verifying deployment..."
echo ""

# Check health
echo "  Checking Rune Engine health..."
HEALTH=$(dfx canister --network "$NETWORK" call rune-engine health_check)
echo "  $HEALTH"

# Check cycles
echo ""
echo "  Checking cycles balance..."
RUNE_ENGINE_CYCLES=$(dfx canister --network "$NETWORK" call rune-engine get_cycles_metrics)
echo "  $RUNE_ENGINE_CYCLES"

echo ""
echo "✅ Deployment verified"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""

# ============================================================================
# Step 7: Save Deployment Info
# ============================================================================

echo "💾 Step 7/7: Saving deployment information..."
echo ""

# Create deployment info file
DEPLOYMENT_FILE="deployments/mainnet-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p deployments

cat > "$DEPLOYMENT_FILE" <<EOF
QURI Protocol - Mainnet Deployment
===================================

Deployment Date: $(date)
Network: $NETWORK
Deployer: $CURRENT_IDENTITY

Canister IDs:
------------
Registry:         $REGISTRY_CANISTER
Rune Engine:      $RUNE_ENGINE_CANISTER
Bitcoin Integration: $BITCOIN_INTEGRATION_CANISTER

Configuration:
-------------
Network:          Mainnet
Fee Rate:         10 sat/vbyte
Confirmations:    6
Retries Enabled:  true

Cycles Allocation:
-----------------
Registry:         2T cycles
Rune Engine:      10T cycles

URLs:
----
Registry Dashboard:    https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$REGISTRY_CANISTER
Rune Engine Dashboard: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$RUNE_ENGINE_CANISTER

Health Check:
dfx canister --network ic call $RUNE_ENGINE_CANISTER health_check

Next Steps:
----------
1. Test create_rune endpoint
2. Monitor cycles consumption
3. Configure frontend with canister IDs
4. Set up monitoring alerts
EOF

echo "✅ Deployment info saved to: $DEPLOYMENT_FILE"
echo ""

# ============================================================================
# Deployment Summary
# ============================================================================

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                    DEPLOYMENT SUCCESSFUL! 🎉                     ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Deployment Summary:"
echo "   Registry Canister:     $REGISTRY_CANISTER"
echo "   Rune Engine Canister:  $RUNE_ENGINE_CANISTER"
echo ""
echo "🔗 Dashboard URLs:"
echo "   Registry:    https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$REGISTRY_CANISTER"
echo "   Rune Engine: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$RUNE_ENGINE_CANISTER"
echo ""
echo "📝 Deployment details saved to: $DEPLOYMENT_FILE"
echo ""
echo "🚀 Next steps:"
echo "   1. Update frontend/.env.production with canister IDs"
echo "   2. Test rune creation: ./scripts/test-create-rune.sh"
echo "   3. Monitor cycles: dfx canister --network ic call $RUNE_ENGINE_CANISTER get_cycles_metrics"
echo ""
echo "════════════════════════════════════════════════════════════════════"
