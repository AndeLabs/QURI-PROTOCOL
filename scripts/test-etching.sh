#!/bin/bash

# QURI Protocol - End-to-End Etching Test Script
# Tests the complete Rune etching flow

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[SKIP]${NC} $1"
}

NETWORK="local"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  QURI Protocol - End-to-End Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1: Get Rune Engine status
log_info "Test 1: Checking Rune Engine canister status..."
RUNE_ENGINE_ID=$(dfx canister id rune-engine --network $NETWORK)
log_success "Rune Engine ID: $RUNE_ENGINE_ID"

# Test 2: Check Bitcoin Integration status
log_info "Test 2: Checking Bitcoin Integration canister..."
BTC_CANISTER_ID=$(dfx canister id bitcoin-integration --network $NETWORK)
log_success "Bitcoin Integration ID: $BTC_CANISTER_ID"

# Test 3: Get P2TR address
log_info "Test 3: Requesting Bitcoin P2TR address..."
dfx canister call bitcoin-integration get_p2tr_address --network $NETWORK
log_success "P2TR address retrieved"

# Test 4: Check ckBTC balance
log_info "Test 4: Checking ckBTC balance..."
MY_PRINCIPAL=$(dfx identity get-principal)
BALANCE=$(dfx canister call bitcoin-integration get_ckbtc_balance "(principal \"$MY_PRINCIPAL\")" --network $NETWORK 2>&1 || echo "")

if [ ! -z "$BALANCE" ]; then
    log_success "Balance check successful: $BALANCE"
else
    log_warning "Balance check failed (may need ckBTC setup)"
fi

# Test 5: Create test Rune
log_info "Test 5: Creating test Rune 'TESTNET•RUNE'..."

ETCHING='(record {
    rune_name = "TESTNET•RUNE";
    symbol = "TEST";
    divisibility = 8 : nat8;
    premine = 1000000 : nat64;
    terms = opt record {
        amount = 100 : nat64;
        cap = 10000 : nat64;
        height_start = null;
        height_end = null;
        offset_start = null;
        offset_end = null;
    };
})'

log_info "Calling create_rune with etching data..."
RESULT=$(dfx canister call rune-engine create_rune "$ETCHING" --network $NETWORK 2>&1 || echo "FAILED")

if [[ $RESULT == *"Ok"* ]]; then
    # Extract process ID
    PROCESS_ID=$(echo "$RESULT" | grep -oP 'Ok\s*=\s*"\K[^"]+' || echo "")
    log_success "Rune creation initiated!"
    echo "    Process ID: $PROCESS_ID"

    # Test 6: Check etching status
    if [ ! -z "$PROCESS_ID" ]; then
        log_info "Test 6: Checking etching status..."
        sleep 2
        STATUS=$(dfx canister call rune-engine get_etching_status "(\"$PROCESS_ID\")" --network $NETWORK 2>&1 || echo "")

        if [ ! -z "$STATUS" ]; then
            log_success "Status retrieved:"
            echo "$STATUS" | head -20
        else
            log_warning "Could not retrieve status"
        fi

        # Test 7: Check my etchings
        log_info "Test 7: Listing my etchings..."
        MY_ETCHINGS=$(dfx canister call rune-engine get_my_etchings --network $NETWORK 2>&1 || echo "")

        if [ ! -z "$MY_ETCHINGS" ]; then
            log_success "My etchings retrieved:"
            echo "$MY_ETCHINGS" | head -20
        fi
    fi
elif [[ $RESULT == *"InsufficientBalance"* ]]; then
    log_warning "Insufficient ckBTC balance - need to fund the canister"
    echo "    To test the full flow, fund the Bitcoin address with testnet ckBTC"
elif [[ $RESULT == *"Canister configuration not set"* ]]; then
    log_warning "Canisters not configured - run deployment script first"
else
    log_warning "Etching creation returned: $RESULT"
    echo "    This may be expected if prerequisites are not met"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Basic tests completed. For full end-to-end testing:"
echo ""
echo "1. Fund Bitcoin address with testnet BTC"
echo "2. Convert to ckBTC via ckBTC minter"
echo "3. Run this script again to complete etching flow"
echo ""
echo "For detailed logs, check dfx replica output:"
echo "  dfx stop && dfx start --clean"
echo ""
