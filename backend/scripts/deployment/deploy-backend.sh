#!/bin/bash

# ==================================================
# QURI Protocol - Backend Deployment Script
# ICP Canister deployment automation
# ==================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}QURI Protocol - Backend Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# ==================================================
# 1. Pre-flight Checks
# ==================================================

echo -e "${YELLOW}[1/6] Running pre-flight checks...${NC}"

cd "$PROJECT_ROOT"

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}Error: dfx (Internet Computer SDK) is not installed!${NC}"
    echo -e "${YELLOW}Install with: sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\"${NC}"
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: Rust is not installed!${NC}"
    echo -e "${YELLOW}Install with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh${NC}"
    exit 1
fi

# Check if wasm32-unknown-unknown target is installed
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    echo -e "${YELLOW}Installing wasm32-unknown-unknown target...${NC}"
    rustup target add wasm32-unknown-unknown
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo

# ==================================================
# 2. Network Selection
# ==================================================

echo -e "${YELLOW}[2/6] Select deployment network:${NC}"
echo "  1) Local (dfx start --clean)"
echo "  2) IC Mainnet"
echo "  3) IC Testnet"
echo

read -p "Enter choice [1-3]: " network_choice

case $network_choice in
    1)
        NETWORK="local"
        echo -e "${YELLOW}Deploying to local network...${NC}"

        # Check if local replica is running
        if ! dfx ping &> /dev/null; then
            echo -e "${YELLOW}Starting local replica...${NC}"
            dfx start --clean --background
            sleep 5
        fi
        ;;

    2)
        NETWORK="ic"
        echo -e "${YELLOW}Deploying to IC Mainnet...${NC}"
        echo -e "${RED}WARNING: This will deploy to mainnet and may cost cycles!${NC}"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            echo -e "${YELLOW}Deployment cancelled${NC}"
            exit 0
        fi
        ;;

    3)
        NETWORK="ic"
        echo -e "${YELLOW}Note: IC testnet uses same network as mainnet${NC}"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo

# ==================================================
# 3. Run Tests
# ==================================================

echo -e "${YELLOW}[3/6] Running tests...${NC}"

if ! cargo test --workspace --quiet; then
    echo -e "${RED}Error: Tests failed!${NC}"
    echo -e "${YELLOW}Please fix failing tests before deploying${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All tests passed${NC}"
echo

# ==================================================
# 4. Run Linting
# ==================================================

echo -e "${YELLOW}[4/6] Running linting...${NC}"

# Format check
if ! cargo fmt --all -- --check; then
    echo -e "${RED}Error: Code formatting issues detected!${NC}"
    echo -e "${YELLOW}Run: cargo fmt --all${NC}"
    exit 1
fi

# Clippy check
if ! cargo clippy --all-targets --all-features -- -D warnings; then
    echo -e "${RED}Error: Clippy warnings detected!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Linting passed${NC}"
echo

# ==================================================
# 5. Build Canisters
# ==================================================

echo -e "${YELLOW}[5/6] Building canisters...${NC}"

# Build all canisters for wasm32
if ! cargo build --target wasm32-unknown-unknown --release --workspace; then
    echo -e "${RED}Error: Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Canisters built successfully${NC}"
echo

# ==================================================
# 6. Deploy Canisters
# ==================================================

echo -e "${YELLOW}[6/6] Deploying canisters to $NETWORK...${NC}"

# Deploy based on network
if [ "$NETWORK" = "local" ]; then
    dfx deploy --network local
else
    # Mainnet deployment
    dfx deploy --network ic

    # Show canister IDs
    echo
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}Canister IDs (save these for frontend):${NC}"
    echo -e "${GREEN}========================================${NC}"
    dfx canister --network ic id rune-engine
    dfx canister --network ic id registry
    dfx canister --network ic id bitcoin-integration
    dfx canister --network ic id identity-manager
    echo
fi

echo -e "${GREEN}✓ Deployment completed successfully${NC}"
echo

# ==================================================
# Post-Deployment Steps
# ==================================================

echo -e "${YELLOW}Post-Deployment Checklist:${NC}"
echo "  [ ] Verify canister status: dfx canister --network $NETWORK status <canister-name>"
echo "  [ ] Check canister cycles: dfx canister --network $NETWORK status <canister-name>"
echo "  [ ] Update frontend .env with canister IDs"
echo "  [ ] Test canister endpoints"
echo "  [ ] Monitor canister logs"
echo "  [ ] Set up cycle monitoring alerts"
echo

# Show canister URLs
if [ "$NETWORK" = "local" ]; then
    echo -e "${YELLOW}Local Candid UI:${NC}"
    echo "  http://127.0.0.1:4943/?canisterId=$(dfx canister id rune-engine --network local)"
else
    echo -e "${YELLOW}Mainnet Candid UI:${NC}"
    RUNE_ENGINE_ID=$(dfx canister --network ic id rune-engine)
    echo "  https://$RUNE_ENGINE_ID.ic0.app"
fi

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backend deployment completed!${NC}"
echo -e "${GREEN}========================================${NC}"

exit 0
