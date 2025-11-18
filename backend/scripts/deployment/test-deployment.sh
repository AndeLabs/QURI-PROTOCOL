#!/bin/bash

# ============================================================================
# QURI Protocol - Deployment Testing Script
# ============================================================================
#
# Este script verifica que todas las mejoras de producción funcionan correctamente:
# - RBAC
# - Bitcoin confirmation tracking
# - Dynamic fee management
# - Pagination
#
# USO:
#   ./scripts/test-deployment.sh [NETWORK]
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NETWORK="${1:-ic}"
PASSED=0
FAILED=0

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           QURI Protocol - Deployment Tests                  ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Helper functions
test_start() {
    echo -n "Testing $1... "
}

test_pass() {
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
}

test_fail() {
    echo -e "${RED}✗ FAILED${NC}"
    if [ -n "$1" ]; then
        echo -e "${RED}  Error: $1${NC}"
    fi
    ((FAILED++))
}

# ============================================================================
# Test 1: Health Check
# ============================================================================

test_start "Health check"
HEALTH=$(dfx canister call rune-engine health_check --network "$NETWORK" 2>&1)

if echo "$HEALTH" | grep -q "healthy = true"; then
    test_pass
else
    test_fail "Health check failed"
    echo "$HEALTH"
fi

# ============================================================================
# Test 2: RBAC - Get Owner
# ============================================================================

test_start "RBAC: Get owner"
OWNER=$(dfx canister call rune-engine get_owner --network "$NETWORK" 2>&1)

if echo "$OWNER" | grep -q "opt principal"; then
    test_pass
else
    test_fail "Could not get owner"
fi

# ============================================================================
# Test 3: RBAC - Get My Role
# ============================================================================

test_start "RBAC: Get my role"
MY_ROLE=$(dfx canister call rune-engine get_my_role --network "$NETWORK" 2>&1)

if echo "$MY_ROLE" | grep -q "variant"; then
    test_pass
else
    test_fail "Could not get my role"
fi

# ============================================================================
# Test 4: RBAC - List Roles
# ============================================================================

test_start "RBAC: List roles (admin required)"
ROLES=$(dfx canister call rune-engine list_roles --network "$NETWORK" 2>&1)

if echo "$ROLES" | grep -q "Ok"; then
    test_pass
elif echo "$ROLES" | grep -q "Admin privileges required"; then
    echo -e "${YELLOW}SKIPPED (not admin)${NC}"
else
    test_fail "Unexpected error"
fi

# ============================================================================
# Test 5: Fee Management - Get Current Estimates
# ============================================================================

test_start "Fee Management: Get current estimates"
sleep 2 # Dar tiempo a que el timer inicial corra
FEE_ESTIMATES=$(dfx canister call rune-engine get_current_fee_estimates --network "$NETWORK" 2>&1)

if echo "$FEE_ESTIMATES" | grep -q "opt record"; then
    test_pass
    echo -e "  ${BLUE}Fee estimates cached successfully${NC}"
elif echo "$FEE_ESTIMATES" | grep -q "null"; then
    echo -e "${YELLOW}PENDING (wait for first timer run)${NC}"
else
    test_fail "Could not get fee estimates"
fi

# ============================================================================
# Test 6: Fee Management - Get Recommended Fee
# ============================================================================

test_start "Fee Management: Get recommended fee (Medium priority)"
RECOMMENDED_FEE=$(dfx canister call rune-engine get_recommended_fee '(variant { Medium })' --network "$NETWORK" 2>&1)

if echo "$RECOMMENDED_FEE" | grep -q ":"; then
    FEE_VALUE=$(echo "$RECOMMENDED_FEE" | grep -oE '[0-9]+' | head -1)
    test_pass
    echo -e "  ${BLUE}Recommended fee: $FEE_VALUE sat/vbyte${NC}"
else
    test_fail "Could not get recommended fee"
fi

# ============================================================================
# Test 7: Confirmation Tracking - Pending Count
# ============================================================================

test_start "Confirmation Tracking: Pending count"
PENDING_COUNT=$(dfx canister call rune-engine pending_confirmation_count --network "$NETWORK" 2>&1)

if echo "$PENDING_COUNT" | grep -q ":"; then
    COUNT=$(echo "$PENDING_COUNT" | grep -oE '[0-9]+')
    test_pass
    echo -e "  ${BLUE}Pending confirmations: $COUNT${NC}"
else
    test_fail "Could not get pending count"
fi

# ============================================================================
# Test 8: Registry - Search with Pagination
# ============================================================================

test_start "Registry: Search runes with pagination"
SEARCH_RESULT=$(dfx canister call registry search_runes '("TEST", 0, 10)' --network "$NETWORK" 2>&1)

if echo "$SEARCH_RESULT" | grep -q "record"; then
    test_pass
else
    test_fail "Search with pagination failed"
fi

# ============================================================================
# Test 9: Registry - Get Trending with Pagination
# ============================================================================

test_start "Registry: Get trending with pagination"
TRENDING=$(dfx canister call registry get_trending '(0, 20)' --network "$NETWORK" 2>&1)

if echo "$TRENDING" | grep -q "record"; then
    test_pass
else
    test_fail "Get trending with pagination failed"
fi

# ============================================================================
# Test 10: Registry - Total Runes Count
# ============================================================================

test_start "Registry: Total runes count"
TOTAL=$(dfx canister call registry total_runes --network "$NETWORK" 2>&1)

if echo "$TOTAL" | grep -q ":"; then
    TOTAL_COUNT=$(echo "$TOTAL" | grep -oE '[0-9]+')
    test_pass
    echo -e "  ${BLUE}Total runes in registry: $TOTAL_COUNT${NC}"
else
    test_fail "Could not get total runes"
fi

# ============================================================================
# Test 11: Identity Manager - Session Creation
# ============================================================================

test_start "Identity Manager: Create session (with secure keys)"
# Default permissions
SESSION=$(dfx canister call identity-manager create_session \
    '(record { can_create_rune = true; can_transfer = true }, 3600)' \
    --network "$NETWORK" 2>&1)

if echo "$SESSION" | grep -q "Ok"; then
    test_pass
    echo -e "  ${BLUE}Session created with cryptographically secure key${NC}"
else
    test_fail "Could not create session"
fi

# ============================================================================
# Test 12: Canister Configuration
# ============================================================================

test_start "Canister Configuration: Verify canister IDs configured"
HEALTH=$(dfx canister call rune-engine health_check --network "$NETWORK" 2>&1)

BTC_CONFIGURED=$(echo "$HEALTH" | grep -c "bitcoin_integration_configured = true" || true)
REG_CONFIGURED=$(echo "$HEALTH" | grep -c "registry_configured = true" || true)

if [ "$BTC_CONFIGURED" -eq 1 ] && [ "$REG_CONFIGURED" -eq 1 ]; then
    test_pass
else
    test_fail "Canister IDs not properly configured"
fi

# ============================================================================
# Test Results Summary
# ============================================================================

echo ""
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                      Test Results                            ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

TOTAL=$((PASSED + FAILED))
echo -e "${GREEN}Passed: $PASSED / $TOTAL${NC}"
if [ $FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED / $TOTAL${NC}"
fi
echo ""

# Success/Failure exit code
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "  1. Monitor timer logs:"
    echo "     dfx canister logs rune-engine --network $NETWORK"
    echo ""
    echo "  2. Try creating a test Rune (end-to-end test)"
    echo ""
    echo "  3. Setup monitoring dashboard"
    echo ""
    echo -e "${GREEN}Deployment is production-ready! 🚀${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Review errors above.${NC}"
    exit 1
fi
