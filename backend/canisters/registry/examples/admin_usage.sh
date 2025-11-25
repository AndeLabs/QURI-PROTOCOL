#!/bin/bash
# Admin Guards Usage Examples for Registry Canister
#
# This script demonstrates how to use the admin management system

CANISTER_ID="registry"  # Replace with actual canister ID

echo "====================================="
echo "Registry Admin Guards - Usage Examples"
echo "====================================="
echo ""

# ============================================================================
# 1. Check Initial State
# ============================================================================

echo "1. Checking owner and initial admin state..."
echo ""

# Get the owner
echo "→ Getting owner:"
dfx canister call $CANISTER_ID get_owner
echo ""

# Check if deployer is admin (should be true)
DEPLOYER=$(dfx identity get-principal)
echo "→ Checking if deployer ($DEPLOYER) is admin:"
dfx canister call $CANISTER_ID is_admin "(principal \"$DEPLOYER\")"
echo ""

# List all admins (should show only owner initially)
echo "→ Listing all admins:"
dfx canister call $CANISTER_ID list_admins
echo ""

# ============================================================================
# 2. Add New Admin (Owner Only)
# ============================================================================

echo "2. Adding a new admin..."
echo ""

# Create a new identity for testing
dfx identity new admin1 --storage-mode plaintext || true
dfx identity use admin1
ADMIN1=$(dfx identity get-principal)
dfx identity use default

echo "→ Admin1 principal: $ADMIN1"
echo ""

# Owner adds admin1
echo "→ Owner adding admin1:"
dfx canister call $CANISTER_ID add_admin "(principal \"$ADMIN1\")"
echo ""

# Verify admin1 is now an admin
echo "→ Verifying admin1 is admin:"
dfx canister call $CANISTER_ID is_admin "(principal \"$ADMIN1\")"
echo ""

# List admins (should show owner + admin1)
echo "→ Listing all admins (should show 2):"
dfx canister call $CANISTER_ID list_admins
echo ""

# ============================================================================
# 3. Test Admin Permissions
# ============================================================================

echo "3. Testing admin permissions..."
echo ""

# Create test principal for whitelist
dfx identity new user1 --storage-mode plaintext || true
dfx identity use user1
USER1=$(dfx identity get-principal)
dfx identity use default

echo "→ User1 principal: $USER1"
echo ""

# Admin can add to whitelist
echo "→ Admin1 adding user1 to whitelist:"
dfx identity use admin1
dfx canister call $CANISTER_ID add_to_whitelist "(principal \"$USER1\")"
dfx identity use default
echo ""

# Verify user1 is whitelisted
echo "→ Checking if user1 is whitelisted:"
dfx canister call $CANISTER_ID is_whitelisted "(principal \"$USER1\")"
echo ""

# ============================================================================
# 4. Test Non-Admin Cannot Perform Admin Actions
# ============================================================================

echo "4. Testing that non-admin cannot perform admin actions..."
echo ""

# Create non-admin user
dfx identity new user2 --storage-mode plaintext || true
dfx identity use user2
USER2=$(dfx identity get-principal)

echo "→ User2 principal (not admin): $USER2"
echo ""

# Try to add to whitelist (should fail)
echo "→ User2 trying to add to whitelist (should fail):"
dfx canister call $CANISTER_ID add_to_whitelist "(principal \"$USER2\")" || echo "❌ Failed as expected - Admin privileges required"
echo ""

# Try to add admin (should fail)
echo "→ User2 trying to add new admin (should fail):"
dfx canister call $CANISTER_ID add_admin "(principal \"$USER2\")" || echo "❌ Failed as expected - Only Owner can add admins"
echo ""

dfx identity use default

# ============================================================================
# 5. Test Owner-Only Functions
# ============================================================================

echo "5. Testing owner-only functions..."
echo ""

# Admin1 tries to add another admin (should fail)
echo "→ Admin1 (not owner) trying to add admin (should fail):"
dfx identity use admin1
dfx canister call $CANISTER_ID add_admin "(principal \"$USER2\")" || echo "❌ Failed as expected - Only Owner can add admins"
echo ""
dfx identity use default

# Owner successfully adds admin
echo "→ Owner adding user2 as admin:"
dfx canister call $CANISTER_ID add_admin "(principal \"$USER2\")"
echo ""

# List admins (should show 3 now)
echo "→ Listing all admins (should show 3):"
dfx canister call $CANISTER_ID list_admins
echo ""

# ============================================================================
# 6. Remove Admin (Owner Only)
# ============================================================================

echo "6. Testing admin removal..."
echo ""

# Owner removes admin
echo "→ Owner removing user2 from admins:"
dfx canister call $CANISTER_ID remove_admin "(principal \"$USER2\")"
echo ""

# Verify user2 is no longer admin
echo "→ Checking if user2 is still admin (should be false):"
dfx canister call $CANISTER_ID is_admin "(principal \"$USER2\")"
echo ""

# Try to remove owner (should fail)
echo "→ Trying to remove owner (should fail):"
dfx canister call $CANISTER_ID remove_admin "(principal \"$DEPLOYER\")" || echo "❌ Failed as expected - Cannot remove Owner"
echo ""

# ============================================================================
# 7. Test Rate Limit Functions
# ============================================================================

echo "7. Testing rate limit admin functions..."
echo ""

# Admin removes from whitelist
echo "→ Admin1 removing user1 from whitelist:"
dfx identity use admin1
dfx canister call $CANISTER_ID remove_from_whitelist "(principal \"$USER1\")"
echo ""

# Verify user1 is no longer whitelisted
dfx identity use default
echo "→ Checking if user1 is still whitelisted (should be false):"
dfx canister call $CANISTER_ID is_whitelisted "(principal \"$USER1\")"
echo ""

# Admin resets rate limit
echo "→ Admin1 resetting rate limit for user1:"
dfx identity use admin1
dfx canister call $CANISTER_ID reset_rate_limit "(principal \"$USER1\")"
dfx identity use default
echo ""

# ============================================================================
# Summary
# ============================================================================

echo "====================================="
echo "Summary"
echo "====================================="
echo ""
echo "✅ Owner-only functions:"
echo "   - add_admin"
echo "   - remove_admin"
echo ""
echo "✅ Admin functions:"
echo "   - add_to_whitelist"
echo "   - remove_from_whitelist"
echo "   - reset_rate_limit"
echo "   - update_staking_pool_apy"
echo "   - list_admins"
echo ""
echo "✅ Public queries:"
echo "   - is_admin"
echo "   - get_owner"
echo "   - is_whitelisted"
echo ""
echo "🔐 Security features:"
echo "   - Owner is immutable (set at init)"
echo "   - Only owner can manage admins"
echo "   - Admins cannot add other admins"
echo "   - Anonymous principals blocked"
echo "   - Audit trail with timestamps"
echo ""

# Cleanup test identities
echo "Cleaning up test identities..."
dfx identity use default
dfx identity remove admin1 --drop-wallets || true
dfx identity remove user1 --drop-wallets || true
dfx identity remove user2 --drop-wallets || true

echo "✅ Done!"
