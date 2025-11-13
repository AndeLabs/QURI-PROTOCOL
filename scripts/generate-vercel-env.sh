#!/bin/bash

# QURI Protocol - Generate Vercel Environment Variables
# This script generates all environment variables ready to copy-paste into Vercel
# Usage: ./scripts/generate-vercel-env.sh [network]
#   network: local (default), playground, or ic

set -e

NETWORK="${1:-playground}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  🚀 QURI Protocol - Vercel Environment Variables${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Network: ${GREEN}${NETWORK}${NC}"
echo ""

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}❌ Error: dfx is not installed${NC}"
    echo "Install dfx by running:"
    echo "  sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi

# Determine network settings
case "$NETWORK" in
    local)
        IC_HOST="http://localhost:4943"
        IC_NETWORK="local"
        BTC_NETWORK="regtest"
        BTC_EXPLORER="http://localhost:8080"
        NETWORK_FLAG="--network local"
        ;;
    playground)
        IC_HOST="https://ic0.app"
        IC_NETWORK="ic"
        BTC_NETWORK="testnet"
        BTC_EXPLORER="https://mempool.space/testnet"
        NETWORK_FLAG="--playground"
        ;;
    ic)
        IC_HOST="https://ic0.app"
        IC_NETWORK="ic"
        BTC_NETWORK="mainnet"
        BTC_EXPLORER="https://mempool.space"
        NETWORK_FLAG="--network ic"
        ;;
    *)
        echo -e "${RED}❌ Invalid network: $NETWORK${NC}"
        echo "Valid options: local, playground, ic"
        exit 1
        ;;
esac

echo -e "${YELLOW}⏳ Fetching canister IDs...${NC}"
echo ""

# Get canister IDs
get_canister_id() {
    local canister_name=$1
    local id=$(dfx canister id "$canister_name" $NETWORK_FLAG 2>/dev/null || echo "")

    if [ -z "$id" ]; then
        echo -e "${RED}NOT_DEPLOYED${NC}"
        return 1
    fi
    echo "$id"
    return 0
}

# Fetch all canister IDs
RUNE_ENGINE_ID=$(get_canister_id "rune-engine")
RUNE_ENGINE_STATUS=$?

BITCOIN_INTEGRATION_ID=$(get_canister_id "bitcoin-integration")
BITCOIN_INTEGRATION_STATUS=$?

REGISTRY_ID=$(get_canister_id "registry")
REGISTRY_STATUS=$?

IDENTITY_MANAGER_ID=$(get_canister_id "identity-manager")
IDENTITY_MANAGER_STATUS=$?

# Internet Identity (standard canister ID for mainnet)
INTERNET_IDENTITY_ID="rdmx6-jaaaa-aaaaa-aaadq-cai"

# Check if all canisters are deployed
if [ $RUNE_ENGINE_STATUS -ne 0 ] || [ $BITCOIN_INTEGRATION_STATUS -ne 0 ] || [ $REGISTRY_STATUS -ne 0 ] || [ $IDENTITY_MANAGER_STATUS -ne 0 ]; then
    echo -e "${RED}❌ Error: Some canisters are not deployed${NC}"
    echo ""
    echo "Deploy canisters first:"
    if [ "$NETWORK" = "playground" ]; then
        echo "  ./scripts/deploy-playground.sh"
    elif [ "$NETWORK" = "local" ]; then
        echo "  ./scripts/deploy-local.sh"
    else
        echo "  dfx deploy --network ic --with-cycles 1000000000000"
    fi
    echo ""
    exit 1
fi

# Generate the environment variables
echo -e "${GREEN}✓ All canisters deployed successfully!${NC}"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📋 COPY THESE TO VERCEL${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}# ========================================${NC}"
echo -e "${BLUE}# ICP Canister IDs${NC}"
echo -e "${BLUE}# ========================================${NC}"
echo "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE_ID"
echo "NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BITCOIN_INTEGRATION_ID"
echo "NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY_ID"
echo "NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY_MANAGER_ID"
echo "NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID=$INTERNET_IDENTITY_ID"
echo ""
echo -e "${BLUE}# ========================================${NC}"
echo -e "${BLUE}# Network Configuration${NC}"
echo -e "${BLUE}# ========================================${NC}"
echo "NEXT_PUBLIC_IC_HOST=$IC_HOST"
echo "NEXT_PUBLIC_IC_NETWORK=$IC_NETWORK"
echo "NEXT_PUBLIC_DFX_NETWORK=$IC_NETWORK"
echo ""
echo -e "${BLUE}# ========================================${NC}"
echo -e "${BLUE}# Bitcoin Configuration${NC}"
echo -e "${BLUE}# ========================================${NC}"
echo "NEXT_PUBLIC_BITCOIN_NETWORK=$BTC_NETWORK"
echo "NEXT_PUBLIC_BTC_EXPLORER=$BTC_EXPLORER"
echo ""
echo -e "${BLUE}# ========================================${NC}"
echo -e "${BLUE}# Application Settings${NC}"
echo -e "${BLUE}# ========================================${NC}"
echo "NEXT_PUBLIC_APP_URL=https://your-app.vercel.app"
echo "NEXT_PUBLIC_SUPPORT_EMAIL=support@quri.protocol"
echo "NEXT_TELEMETRY_DISABLED=1"
echo "NODE_ENV=production"
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Save to file
OUTPUT_FILE="vercel-env-${NETWORK}.txt"
{
    echo "# ========================================"
    echo "# QURI Protocol - Vercel Environment Variables"
    echo "# Network: $NETWORK"
    echo "# Generated: $(date)"
    echo "# ========================================"
    echo ""
    echo "# ICP Canister IDs"
    echo "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE_ID"
    echo "NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BITCOIN_INTEGRATION_ID"
    echo "NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY_ID"
    echo "NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY_MANAGER_ID"
    echo "NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID=$INTERNET_IDENTITY_ID"
    echo ""
    echo "# Network Configuration"
    echo "NEXT_PUBLIC_IC_HOST=$IC_HOST"
    echo "NEXT_PUBLIC_IC_NETWORK=$IC_NETWORK"
    echo "NEXT_PUBLIC_DFX_NETWORK=$IC_NETWORK"
    echo ""
    echo "# Bitcoin Configuration"
    echo "NEXT_PUBLIC_BITCOIN_NETWORK=$BTC_NETWORK"
    echo "NEXT_PUBLIC_BTC_EXPLORER=$BTC_EXPLORER"
    echo ""
    echo "# Application Settings"
    echo "NEXT_PUBLIC_APP_URL=https://your-app.vercel.app"
    echo "NEXT_PUBLIC_SUPPORT_EMAIL=support@quri.protocol"
    echo "NEXT_TELEMETRY_DISABLED=1"
    echo "NODE_ENV=production"
} > "$OUTPUT_FILE"

echo -e "${GREEN}✓ Saved to file: ${BOLD}$OUTPUT_FILE${NC}"
echo ""

# Also save to frontend/.env.local
FRONTEND_ENV="frontend/.env.local"
{
    echo "# QURI Protocol - Local Environment"
    echo "# Generated: $(date)"
    echo ""
    echo "NEXT_PUBLIC_IC_HOST=$IC_HOST"
    echo "NEXT_PUBLIC_IC_NETWORK=$IC_NETWORK"
    echo "NEXT_PUBLIC_DFX_NETWORK=$IC_NETWORK"
    echo ""
    echo "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE_ID"
    echo "NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BITCOIN_INTEGRATION_ID"
    echo "NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY_ID"
    echo "NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY_MANAGER_ID"
    echo "NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID=$INTERNET_IDENTITY_ID"
    echo ""
    echo "NEXT_PUBLIC_BITCOIN_NETWORK=$BTC_NETWORK"
    echo "NEXT_PUBLIC_BTC_EXPLORER=$BTC_EXPLORER"
} > "$FRONTEND_ENV"

echo -e "${GREEN}✓ Saved to frontend: ${BOLD}$FRONTEND_ENV${NC}"
echo ""

# Print instructions
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  📝 NEXT STEPS${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}1. Copy variables to Vercel:${NC}"
echo "   • Go to: https://vercel.com/your-project/settings/environment-variables"
echo "   • Click 'Add New' for each variable above"
echo "   • Or import from: $OUTPUT_FILE"
echo ""
echo -e "${YELLOW}2. Redeploy your application:${NC}"
echo "   • Push to GitHub (auto-deploy)"
echo "   • Or run: vercel --prod"
echo ""
echo -e "${YELLOW}3. Test your deployment:${NC}"
echo "   • Visit your Vercel URL"
echo "   • Check browser console for environment variables"
echo "   • Test Internet Identity login"
echo ""

if [ "$NETWORK" = "playground" ]; then
    echo -e "${RED}⚠️  IMPORTANT: Playground canisters expire after 20 minutes${NC}"
    echo "   Re-run this script when canisters expire"
    echo ""
fi

echo -e "${GREEN}🎉 Ready to deploy to Vercel!${NC}"
echo ""

# Print canister URLs for reference
echo -e "${BOLD}📍 Canister URLs:${NC}"
echo ""
echo -e "Rune Engine:         ${BLUE}https://$RUNE_ENGINE_ID.ic0.app${NC}"
echo -e "Bitcoin Integration: ${BLUE}https://$BITCOIN_INTEGRATION_ID.ic0.app${NC}"
echo -e "Registry:            ${BLUE}https://$REGISTRY_ID.ic0.app${NC}"
echo -e "Identity Manager:    ${BLUE}https://$IDENTITY_MANAGER_ID.ic0.app${NC}"
echo ""
