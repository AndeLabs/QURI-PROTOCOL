#!/bin/bash

# Deploy QURI Protocol Canisters to ICP Playground
# This script deploys all canisters and saves their IDs for frontend configuration

set -e

echo "🚀 QURI Protocol - Playground Deployment Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}❌ Error: dfx is not installed${NC}"
    echo "Install dfx by running: sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi

echo -e "${GREEN}✓ dfx is installed${NC}"
echo ""

# Check dfx version
DFX_VERSION=$(dfx --version)
echo "dfx version: $DFX_VERSION"
echo ""

# Warning about playground expiration
echo -e "${YELLOW}⚠️  PLAYGROUND NOTICE:${NC}"
echo "Canisters deployed to playground will be automatically removed after 20 minutes"
echo "This is only for testing. For production, deploy to mainnet with 'dfx deploy --network ic'"
echo ""
read -p "Continue with playground deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Building canisters..."
echo "This may take several minutes..."
echo ""

# Build all canisters
dfx build

echo ""
echo -e "${GREEN}✓ Build completed${NC}"
echo ""
echo "Deploying to playground..."
echo ""

# Deploy to playground
# Note: dfx deploy --playground deploys all canisters at once
dfx deploy --playground

echo ""
echo -e "${GREEN}✓ Deployment completed!${NC}"
echo ""

# Get canister IDs
echo "📋 Canister IDs (save these for your .env file):"
echo "================================================"
echo ""

# Create .env content
ENV_CONTENT="# ICP Canister IDs - Generated $(date)
# These canisters are deployed to PLAYGROUND and will expire in 20 minutes
# Re-run this script to re-deploy and get new IDs

"

# Array of canisters to get IDs for
CANISTERS=("rune-engine" "bitcoin-integration" "registry" "identity-manager")

for CANISTER in "${CANISTERS[@]}"; do
    if dfx canister id "$CANISTER" --playground &> /dev/null; then
        CANISTER_ID=$(dfx canister id "$CANISTER" --playground)
        CANISTER_UPPER=$(echo "$CANISTER" | tr '[:lower:]' '[:upper:]' | tr '-' '_')

        echo -e "${GREEN}$CANISTER:${NC} $CANISTER_ID"
        echo "  URL: https://$CANISTER_ID.ic0.app"
        echo ""

        ENV_CONTENT+="NEXT_PUBLIC_${CANISTER_UPPER}_CANISTER_ID=$CANISTER_ID
"
    fi
done

# Add network configuration
ENV_CONTENT+="
# ICP Network Configuration
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_DFX_NETWORK=ic
"

# Save to .env file in frontend directory
ENV_FILE="frontend/.env.local"
echo "$ENV_CONTENT" > "$ENV_FILE"

echo ""
echo -e "${GREEN}✓ Canister IDs saved to $ENV_FILE${NC}"
echo ""

# Print instructions for Vercel
echo "📝 NEXT STEPS:"
echo "=============="
echo ""
echo "1. Add these environment variables to Vercel:"
echo "   - Go to your Vercel dashboard"
echo "   - Select your QURI-PROTOCOL project"
echo "   - Go to Settings → Environment Variables"
echo "   - Add each variable from $ENV_FILE"
echo ""
echo "2. Redeploy your frontend on Vercel:"
echo "   - Push changes to GitHub (if auto-deploy is enabled)"
echo "   - Or manually trigger a deployment"
echo ""
echo "3. Test your deployment:"
echo "   - Visit your Vercel URL"
echo "   - The frontend should now connect to these canisters"
echo ""
echo -e "${YELLOW}⚠️  REMINDER: Playground canisters expire in 20 minutes${NC}"
echo "   Re-run this script when canisters expire"
echo ""
echo "For permanent deployment, use: dfx deploy --network ic"
echo "(Requires cycles - see: https://internetcomputer.org/docs/current/developer-docs/getting-started/cycles/cycles-faucet)"
echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
