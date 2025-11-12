#!/bin/bash

# ============================================================================
# QURI Protocol - Testnet Deployment Script
# ============================================================================
# Deploys all canisters to ICP mainnet configured for Bitcoin TESTNET
#
# Prerequisites:
# - dfx CLI installed (>= 0.15.1)
# - Sufficient cycles in your wallet (>= 5T recommended)
# - Rust 1.82.0 installed
#
# Usage:
#   ./deploy-testnet.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CKBTC_TESTNET_LEDGER="mc6ru-gyaaa-aaaar-qaaaq-cai"
NETWORK="ic"  # Deploy to ICP mainnet
BITCOIN_NETWORK="Testnet"  # But use Bitcoin testnet

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        QURI Protocol - Testnet Deployment                ║${NC}"
echo -e "${BLUE}║  Deploying to: ICP Mainnet with Bitcoin Testnet          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# Step 1: Pre-flight checks
# ============================================================================
echo -e "${YELLOW}[1/7] Running pre-flight checks...${NC}"

# Check dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}❌ dfx CLI not found. Please install from: https://internetcomputer.org/install.sh${NC}"
    exit 1
fi

# Check dfx version
DFX_VERSION=$(dfx --version | grep -oP '(?<=dfx )\d+\.\d+\.\d+')
echo -e "${GREEN}✓ dfx version: $DFX_VERSION${NC}"

# Check identity
IDENTITY=$(dfx identity whoami)
PRINCIPAL=$(dfx identity get-principal)
echo -e "${GREEN}✓ Identity: $IDENTITY${NC}"
echo -e "${GREEN}✓ Principal: $PRINCIPAL${NC}"

# Check wallet balance (cycles)
echo -e "\n${YELLOW}Checking cycles balance...${NC}"
WALLET_CANISTER=$(dfx identity --network ic get-wallet 2>/dev/null || echo "none")
if [ "$WALLET_CANISTER" != "none" ]; then
    echo -e "${GREEN}✓ Wallet canister: $WALLET_CANISTER${NC}"
    # Try to get balance (may fail if no cycles)
    dfx wallet --network ic balance 2>/dev/null || echo -e "${YELLOW}⚠ Could not check wallet balance (you may need to add cycles)${NC}"
else
    echo -e "${YELLOW}⚠ No wallet canister found. You'll need cycles to deploy.${NC}"
    echo -e "${YELLOW}  Get free cycles from: https://faucet.dfinity.org${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Rust/Cargo not found. Please install from: https://rustup.rs${NC}"
    exit 1
fi

# Check rust version
RUST_VERSION=$(rustc --version)
echo -e "${GREEN}✓ Rust: $RUST_VERSION${NC}"

echo -e "${GREEN}✅ Pre-flight checks passed${NC}\n"

# ============================================================================
# Step 2: Build all canisters
# ============================================================================
echo -e "${YELLOW}[2/7] Building all canisters...${NC}"
echo -e "${BLUE}This may take 3-5 minutes...${NC}"

# Build all canisters in release mode
cargo build --target wasm32-unknown-unknown --release --workspace

# Verify all WASM files exist
REQUIRED_WASMS=(
    "rune_engine.wasm"
    "bitcoin_integration.wasm"
    "registry.wasm"
    "identity_manager.wasm"
)

for wasm in "${REQUIRED_WASMS[@]}"; do
    if [ ! -f "target/wasm32-unknown-unknown/release/$wasm" ]; then
        echo -e "${RED}❌ Missing WASM file: $wasm${NC}"
        exit 1
    fi
    SIZE=$(du -h "target/wasm32-unknown-unknown/release/$wasm" | cut -f1)
    echo -e "${GREEN}✓ $wasm ($SIZE)${NC}"
done

echo -e "${GREEN}✅ All canisters built successfully${NC}\n"

# ============================================================================
# Step 3: Confirm deployment
# ============================================================================
echo -e "${YELLOW}[3/7] Deployment configuration:${NC}"
echo -e "  Network: ${GREEN}$NETWORK${NC} (ICP Mainnet)"
echo -e "  Bitcoin Network: ${GREEN}$BITCOIN_NETWORK${NC}"
echo -e "  ckBTC Ledger: ${GREEN}$CKBTC_TESTNET_LEDGER${NC} (ckTESTBTC)"
echo -e "  Identity: ${GREEN}$IDENTITY${NC}"
echo -e "  Principal: ${GREEN}$PRINCIPAL${NC}"
echo ""
echo -e "${BLUE}This will deploy 4 canisters and consume ~2-5 Trillion cycles.${NC}"
echo ""
read -p "Continue with deployment? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# ============================================================================
# Step 4: Deploy bitcoin-integration canister
# ============================================================================
echo -e "\n${YELLOW}[4/7] Deploying bitcoin-integration canister...${NC}"

# Create canister
echo "Creating canister..."
dfx canister --network $NETWORK create bitcoin-integration || true

# Get canister ID
BITCOIN_INTEGRATION_ID=$(dfx canister --network $NETWORK id bitcoin-integration)
echo -e "${GREEN}✓ Canister ID: $BITCOIN_INTEGRATION_ID${NC}"

# Install with init args: (BitcoinNetwork, ckBTC_ledger_principal)
echo "Installing code with Bitcoin Testnet config..."
dfx canister --network $NETWORK install bitcoin-integration \
    --mode reinstall \
    --argument "(variant { $BITCOIN_NETWORK }, principal \"$CKBTC_TESTNET_LEDGER\")"

echo -e "${GREEN}✅ bitcoin-integration deployed${NC}"

# ============================================================================
# Step 5: Deploy registry canister
# ============================================================================
echo -e "\n${YELLOW}[5/7] Deploying registry canister...${NC}"

dfx canister --network $NETWORK create registry || true
REGISTRY_ID=$(dfx canister --network $NETWORK id registry)
echo -e "${GREEN}✓ Canister ID: $REGISTRY_ID${NC}"

dfx canister --network $NETWORK install registry --mode reinstall

echo -e "${GREEN}✅ registry deployed${NC}"

# ============================================================================
# Step 6: Deploy identity-manager canister
# ============================================================================
echo -e "\n${YELLOW}[6/7] Deploying identity-manager canister...${NC}"

dfx canister --network $NETWORK create identity-manager || true
IDENTITY_MANAGER_ID=$(dfx canister --network $NETWORK id identity-manager)
echo -e "${GREEN}✓ Canister ID: $IDENTITY_MANAGER_ID${NC}"

dfx canister --network $NETWORK install identity-manager --mode reinstall

echo -e "${GREEN}✅ identity-manager deployed${NC}"

# ============================================================================
# Step 7: Deploy rune-engine canister
# ============================================================================
echo -e "\n${YELLOW}[7/7] Deploying rune-engine canister...${NC}"

dfx canister --network $NETWORK create rune-engine || true
RUNE_ENGINE_ID=$(dfx canister --network $NETWORK id rune-engine)
echo -e "${GREEN}✓ Canister ID: $RUNE_ENGINE_ID${NC}"

# Install (uses default config which is already Testnet)
dfx canister --network $NETWORK install rune-engine --mode reinstall

# Configure the rune-engine with other canister IDs
echo "Configuring canister connections..."
dfx canister --network $NETWORK call rune-engine configure_canisters \
    "(principal \"$BITCOIN_INTEGRATION_ID\", principal \"$REGISTRY_ID\")"

# Double-check the etching config is set to Testnet
echo "Ensuring Bitcoin Testnet configuration..."
dfx canister --network $NETWORK call rune-engine update_etching_config \
    "(record {
        network = variant { Testnet };
        fee_rate = 2 : nat64;
        required_confirmations = 1 : nat32;
        enable_retries = true
    })"

echo -e "${GREEN}✅ rune-engine deployed and configured${NC}"

# ============================================================================
# Deployment Complete!
# ============================================================================
echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           🎉 DEPLOYMENT SUCCESSFUL! 🎉                   ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Canister IDs:${NC}"
echo -e "  rune-engine:          ${GREEN}$RUNE_ENGINE_ID${NC}"
echo -e "  bitcoin-integration:  ${GREEN}$BITCOIN_INTEGRATION_ID${NC}"
echo -e "  registry:             ${GREEN}$REGISTRY_ID${NC}"
echo -e "  identity-manager:     ${GREEN}$IDENTITY_MANAGER_ID${NC}"
echo ""
echo -e "${BLUE}Candid UIs:${NC}"
echo -e "  rune-engine:          ${GREEN}https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=$RUNE_ENGINE_ID${NC}"
echo -e "  bitcoin-integration:  ${GREEN}https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=$BITCOIN_INTEGRATION_ID${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo -e "  Bitcoin Network:      ${GREEN}Testnet ✓${NC}"
echo -e "  ckBTC Ledger:         ${GREEN}$CKBTC_TESTNET_LEDGER${NC} (ckTESTBTC)"
echo ""

# Save canister IDs to file
echo "# QURI Protocol - Testnet Canister IDs" > .canister_ids_testnet
echo "# Deployed on: $(date)" >> .canister_ids_testnet
echo "" >> .canister_ids_testnet
echo "RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE_ID" >> .canister_ids_testnet
echo "BITCOIN_INTEGRATION_CANISTER_ID=$BITCOIN_INTEGRATION_ID" >> .canister_ids_testnet
echo "REGISTRY_CANISTER_ID=$REGISTRY_ID" >> .canister_ids_testnet
echo "IDENTITY_MANAGER_CANISTER_ID=$IDENTITY_MANAGER_ID" >> .canister_ids_testnet
echo "CKBTC_TESTNET_LEDGER=$CKBTC_TESTNET_LEDGER" >> .canister_ids_testnet
echo "" >> .canister_ids_testnet
echo "# Candid UI URLs" >> .canister_ids_testnet
echo "RUNE_ENGINE_UI=https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=$RUNE_ENGINE_ID" >> .canister_ids_testnet
echo "BITCOIN_INTEGRATION_UI=https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=$BITCOIN_INTEGRATION_ID" >> .canister_ids_testnet

echo -e "${YELLOW}💾 Canister IDs saved to: .canister_ids_testnet${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Get testnet Bitcoin from faucet: ${GREEN}https://coinfaucet.eu/en/btc-testnet/${NC}"
echo -e "  2. Test creating a Rune via Candid UI (click link above)"
echo -e "  3. Monitor transactions: ${GREEN}https://blockstream.info/testnet/${NC}"
echo -e "  4. Check canister logs: ${GREEN}dfx canister --network ic logs rune-engine${NC}"
echo ""
echo -e "${YELLOW}📚 For detailed testing guide, see: TESTNET_DEPLOYMENT.md${NC}"
echo -e "${YELLOW}🚀 For quick start, see: TESTNET_QUICKSTART.md${NC}"
echo ""
