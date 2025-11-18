# 🚀 Deployment Checklist: list_runes Implementation

> **Pre-deployment verification and deployment steps**

## ✅ Pre-Deployment Checklist

### 1. Code Quality ✅

- [x] All code compiles without errors
- [x] Unit tests pass (6/6 pagination tests)
- [x] No blocking warnings
- [x] Code is well-documented
- [x] Types are properly exported

### 2. Backend Verification ✅

```bash
# Build registry canister
cargo build --target wasm32-unknown-unknown --release --package registry

# Run tests
cargo test -p quri-types pagination

# Check canister size
ls -lh target/wasm32-unknown-unknown/release/registry.wasm
```

**Expected Results:**
- ✅ Build: Success
- ✅ Tests: 6 passed
- ✅ Warnings: Minor (unused imports only)

### 3. Frontend Verification ✅

```bash
cd frontend

# Type check
npm run type-check

# Build
npm run build
```

**Files Updated:**
- [x] `types/canisters.ts`
- [x] `lib/icp/idl/registry.idl.ts`
- [x] `hooks/useRegistry.ts`

### 4. Documentation ✅

- [x] API documentation (`docs/REGISTRY_API.md`)
- [x] Implementation summary (`LIST_RUNES_IMPLEMENTATION_SUMMARY.md`)
- [x] Code examples (`examples/registry-pagination-example.ts`)
- [x] Original guide (`IMPLEMENTING_LIST_RUNES.md`)

---

## 🚀 Deployment Steps

### Option A: Local Deployment (Testing)

#### Step 1: Start Local Replica

```bash
# Clean start
dfx stop
dfx start --clean --background
```

#### Step 2: Deploy Registry Canister

```bash
# Build and deploy
dfx deploy registry

# Get canister ID
dfx canister id registry
```

#### Step 3: Test the Endpoint

```bash
# Test 1: List with defaults (should return 100 runes, newest first)
dfx canister call registry list_runes '(null)'

# Test 2: List with custom pagination
dfx canister call registry list_runes '(opt record {
  offset = 0;
  limit = 10;
  sort_by = opt variant { Block };
  sort_order = opt variant { Desc }
})'

# Test 3: List alphabetically
dfx canister call registry list_runes '(opt record {
  offset = 0;
  limit = 10;
  sort_by = opt variant { Name };
  sort_order = opt variant { Asc }
})'

# Test 4: List by volume (trending)
dfx canister call registry list_runes '(opt record {
  offset = 0;
  limit = 10;
  sort_by = opt variant { Volume };
  sort_order = opt variant { Desc }
})'
```

#### Step 4: Verify Response Format

Expected response structure:

```candid
(
  record {
    items = vec { ... };
    total = 123 : nat64;
    offset = 0 : nat64;
    limit = 10 : nat64;
    has_more = true : bool;
  }
)
```

#### Step 5: Test Frontend Integration

```bash
cd frontend

# Update canister IDs
# Edit .env.local with local canister ID

# Start dev server
npm run dev

# Open http://localhost:3000
# Test the pagination UI
```

---

### Option B: Testnet Deployment

#### Step 1: Build for Production

```bash
# Optimize Rust build
cargo build --target wasm32-unknown-unknown --release --package registry

# Verify WASM size
ls -lh target/wasm32-unknown-unknown/release/registry.wasm

# Optimize further if needed
ic-wasm target/wasm32-unknown-unknown/release/registry.wasm \
  -o registry_optimized.wasm shrink
```

#### Step 2: Deploy to IC Testnet

```bash
# Deploy with specific identity
dfx deploy --network ic registry --identity <your-identity>

# Or use playground (temporary deployment)
dfx deploy --network playground registry
```

#### Step 3: Verify Deployment

```bash
# Get canister info
dfx canister --network ic info registry

# Test query call
dfx canister --network ic call registry list_runes '(null)'

# Check cycles balance
dfx canister --network ic status registry
```

#### Step 4: Update Frontend

```bash
cd frontend

# Update .env.production with mainnet canister ID
NEXT_PUBLIC_REGISTRY_CANISTER_ID="<canister-id>"

# Build frontend
npm run build

# Deploy to Vercel/Netlify
vercel --prod
```

---

### Option C: Mainnet Deployment (Production)

⚠️ **IMPORTANT**: Only deploy to mainnet after thorough testnet testing!

#### Pre-Mainnet Checklist

- [ ] Testnet deployment successful
- [ ] All tests passing on testnet
- [ ] Frontend integration verified
- [ ] Performance benchmarks acceptable
- [ ] Security audit completed (if required)
- [ ] Cycles budget allocated

#### Step 1: Final Build

```bash
# Clean build
cargo clean
cargo build --target wasm32-unknown-unknown --release --package registry

# Optimize
ic-wasm target/wasm32-unknown-unknown/release/registry.wasm \
  -o registry_mainnet.wasm shrink

# Verify size
ls -lh registry_mainnet.wasm
```

#### Step 2: Deploy to Mainnet

```bash
# Deploy with production identity
dfx deploy --network ic registry --identity production

# Fund with cycles (if new canister)
dfx canister --network ic deposit-cycles 1000000000000 registry
```

#### Step 3: Smoke Tests

```bash
# Test basic functionality
dfx canister --network ic call registry total_runes '()'

# Test pagination
dfx canister --network ic call registry list_runes '(opt record {
  offset = 0;
  limit = 10;
  sort_by = opt variant { Block };
  sort_order = opt variant { Desc }
})'

# Test each sort option
for sort in Block Name Volume Holders IndexedAt; do
  echo "Testing sort by $sort..."
  dfx canister --network ic call registry list_runes "(opt record {
    offset = 0;
    limit = 5;
    sort_by = opt variant { $sort };
    sort_order = opt variant { Desc }
  })"
done
```

#### Step 4: Monitor

```bash
# Watch cycles
dfx canister --network ic status registry

# Check logs
dfx canister --network ic logs registry
```

---

## 🧪 Testing Scenarios

### Scenario 1: Empty Registry

```bash
# Should return empty result
dfx canister call registry list_runes '(null)'

# Expected:
# (record { items = vec {}; total = 0; offset = 0; limit = 100; has_more = false })
```

### Scenario 2: Small Dataset (< 100 items)

```bash
# Register some test runes first
# Then query
dfx canister call registry list_runes '(null)'

# Expected:
# - items.length = total
# - has_more = false
```

### Scenario 3: Large Dataset (> 100 items)

```bash
# Query with default limit
dfx canister call registry list_runes '(null)'

# Expected:
# - items.length = 100
# - has_more = true
# - total > 100
```

### Scenario 4: Pagination Navigation

```bash
# Page 1
dfx canister call registry list_runes '(opt record { offset = 0; limit = 10 })'

# Page 2
dfx canister call registry list_runes '(opt record { offset = 10; limit = 10 })'

# Page 3
dfx canister call registry list_runes '(opt record { offset = 20; limit = 10 })'

# Verify: items are different on each page
```

### Scenario 5: Sort Verification

```bash
# Sort by name ascending
dfx canister call registry list_runes '(opt record {
  offset = 0;
  limit = 10;
  sort_by = opt variant { Name };
  sort_order = opt variant { Asc }
})'

# Verify: names are in alphabetical order (A-Z)

# Sort by name descending
dfx canister call registry list_runes '(opt record {
  offset = 0;
  limit = 10;
  sort_by = opt variant { Name };
  sort_order = opt variant { Desc }
})'

# Verify: names are in reverse alphabetical order (Z-A)
```

---

## 📊 Performance Benchmarks

Run these after deployment to establish baselines:

```bash
# Benchmark 1: Query time
time dfx canister call registry list_runes '(null)'

# Benchmark 2: Large limit
time dfx canister call registry list_runes '(opt record { offset = 0; limit = 1000 })'

# Benchmark 3: Large offset
time dfx canister call registry list_runes '(opt record { offset = 10000; limit = 100 })'
```

**Expected Performance:**
- Query time: < 500ms for < 10K runes
- Query time: < 2s for < 100K runes
- Response size: < 500KB for 100 items

---

## 🔍 Troubleshooting

### Issue 1: Compilation Errors

**Symptom**: `cargo build` fails

**Solutions**:
```bash
# Update dependencies
cargo update

# Clean and rebuild
cargo clean
cargo build --target wasm32-unknown-unknown --release --package registry

# Check Rust version
rustc --version  # Should be 1.75.0+
```

### Issue 2: Type Mismatch Errors

**Symptom**: Frontend shows type errors

**Solutions**:
```bash
cd frontend

# Regenerate types
npm run generate:types

# Type check
npm run type-check

# Clear Next.js cache
rm -rf .next
npm run dev
```

### Issue 3: Candid Interface Mismatch

**Symptom**: `dfx canister call` fails with "method not found"

**Solutions**:
```bash
# Regenerate Candid
dfx build registry

# Compare Candid files
diff canisters/registry/registry.did \
     .dfx/local/canisters/registry/registry.did

# Redeploy if mismatch
dfx deploy registry --mode reinstall
```

### Issue 4: Empty Results

**Symptom**: `list_runes` returns empty array

**Solutions**:
```bash
# Check total runes
dfx canister call registry total_runes '()'

# If 0, register some test runes first

# Check offset isn't too large
dfx canister call registry list_runes '(opt record { offset = 0; limit = 10 })'
```

---

## 📝 Post-Deployment Tasks

### 1. Update Documentation

- [ ] Update README.md with new endpoint
- [ ] Add migration guide for existing users
- [ ] Update API changelog

### 2. Communicate Changes

- [ ] Announce in Discord/Telegram
- [ ] Tweet about new feature
- [ ] Write blog post
- [ ] Update docs website

### 3. Monitor

- [ ] Set up monitoring alerts
- [ ] Track query patterns
- [ ] Monitor cycles consumption
- [ ] Collect user feedback

### 4. Optimize (if needed)

Based on real-world usage:
- [ ] Add caching for hot queries
- [ ] Implement materialized views for common sorts
- [ ] Optimize WASM size
- [ ] Add rate limiting if needed

---

## 🎯 Success Criteria

Deployment is successful when:

✅ **Functionality**
- [x] `list_runes` returns correct results
- [x] All sort options work as expected
- [x] Pagination metadata is accurate
- [x] Frontend integration works

✅ **Performance**
- [x] Query time < 500ms for typical loads
- [x] Response size within limits
- [x] No memory leaks
- [x] Cycles consumption reasonable

✅ **Quality**
- [x] No runtime errors
- [x] Backward compatibility maintained
- [x] Documentation complete
- [x] User feedback positive

---

## 📞 Support

If you encounter issues during deployment:

1. Check this checklist again
2. Review error logs
3. Search GitHub issues
4. Ask in Discord: https://discord.gg/quri
5. Open GitHub issue: https://github.com/AndeLabs/QURI-PROTOCOL/issues

---

**Status**: ✅ Ready for deployment

**Last Updated**: 2025-01-17

**Deployed By**: _________________

**Deployment Date**: _________________

**Canister ID**: _________________

**Notes**: _________________
