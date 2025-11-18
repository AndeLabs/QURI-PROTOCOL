#!/bin/bash
# WASM Build Script for QURI Protocol
# Uses LLVM toolchain to compile canisters for ICP
#
# Usage:
#   ./scripts/build-wasm.sh [canister-name]
#   ./scripts/build-wasm.sh all  # builds all canisters

set -e  # Exit on error

# Configure LLVM toolchain (required for Mac)
export AR=/opt/homebrew/opt/llvm/bin/llvm-ar
export CC=/opt/homebrew/opt/llvm/bin/clang

echo "🔧 Using LLVM toolchain:"
echo "   AR: $AR"
echo "   CC: $CC"
echo ""

# Canister list
CANISTERS=("rune-engine" "bitcoin-integration" "registry" "identity-manager")

# Function to build a canister
build_canister() {
    local canister=$1
    echo "🏗️  Building $canister..."
    cargo build --target wasm32-unknown-unknown --release --package "$canister"
    echo "✅ $canister build complete"
    echo ""
}

# Parse command line argument
if [ $# -eq 0 ] || [ "$1" == "all" ]; then
    echo "🚀 Building ALL canisters..."
    echo ""
    for canister in "${CANISTERS[@]}"; do
        build_canister "$canister"
    done
    echo "🎉 All canisters built successfully!"
else
    build_canister "$1"
fi

echo ""
echo "📦 WASM files location: target/wasm32-unknown-unknown/release/"
ls -lh target/wasm32-unknown-unknown/release/*.wasm 2>/dev/null || true
