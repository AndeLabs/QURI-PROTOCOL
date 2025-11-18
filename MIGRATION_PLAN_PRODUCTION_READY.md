# 🚀 Production-Ready Migration Plan - Backend/Frontend Separation

**Project**: QURI Protocol Architecture Restructuring
**Target**: Top-Level Separation (Hybrid Monorepo)
**Date**: 2025-01-17
**Status**: PRE-PRODUCTION REVIEW

---

## ⚠️ CRITICAL - READ FIRST

### This is PRODUCTION CODE
- ✅ 4 canisters live on mainnet
- ✅ ~$5.2M in cycles deployed
- ✅ Real users could be affected
- ❌ **NO ROOM FOR ERRORS**

### Safety First Approach
1. **Full backup** before any changes
2. **Git branch** for all migration work
3. **Verification steps** after each phase
4. **Rollback plan** ready
5. **Testing** at every step

---

## 📋 Pre-Migration Checklist

### ✅ Before Starting (MANDATORY)
- [ ] **Create full backup** of current state
- [ ] **Create migration branch** from main
- [ ] **Document current state** (file counts, structure)
- [ ] **Verify all tests pass** in current state
- [ ] **Commit all pending changes** to main
- [ ] **Tag current version** (v0.2.0-pre-migration)
- [ ] **Team notification** - no commits during migration
- [ ] **Set up rollback procedure**

---

## 🎯 Migration Strategy

### Approach: **Incremental with Verification**

**NOT doing**:
- ❌ Moving everything at once blindly
- ❌ Breaking builds in the middle
- ❌ Committing untested changes

**Doing instead**:
- ✅ Small, verified steps
- ✅ Testing after each step
- ✅ Rollback points at each phase
- ✅ Documentation of every change

---

## 📊 Current State Analysis

### Before Migration - Exact State
```bash
# Document exact file structure
find . -type f -name "*.rs" | wc -l     # Count Rust files
find . -type f -name "*.ts" | wc -l     # Count TS files
find . -type f -name "*.tsx" | wc -l    # Count TSX files
find . -type f -name "*.md" | wc -l     # Count MD files

# List all directories
tree -L 2 -d > MIGRATION_BEFORE_STATE.txt

# Git status
git status > MIGRATION_GIT_STATUS.txt

# Cargo check
cd canisters/registry && cargo check 2>&1 | tee MIGRATION_CARGO_CHECK.txt
```

**Save this output** - we'll compare after migration

---

## 🔄 Migration Phases

### Phase 0: Preparation & Backup (1-2 hours)

#### Step 0.1: Create Backup Branch
```bash
# Current branch
git checkout main
git pull origin main

# Create backup tag
git tag v0.2.0-pre-migration
git push origin v0.2.0-pre-migration

# Create migration branch
git checkout -b migration/backend-frontend-separation
```

#### Step 0.2: Document Current State
```bash
# Save current structure
tree -L 3 -I 'node_modules|target|.git' > docs/migration/BEFORE_STRUCTURE.txt

# Save file counts
find . -type f | wc -l > docs/migration/BEFORE_FILE_COUNT.txt

# Save Cargo.toml
cp Cargo.toml docs/migration/BEFORE_Cargo.toml

# Test current state
./scripts/test-all.sh > docs/migration/BEFORE_TESTS.txt
```

#### Step 0.3: Create Rollback Script
```bash
#!/bin/bash
# scripts/rollback-migration.sh

echo "🔄 Rolling back migration..."
git checkout main
git branch -D migration/backend-frontend-separation
git checkout -b migration/backend-frontend-separation v0.2.0-pre-migration
echo "✅ Rolled back to pre-migration state"
```

---

### Phase 1: Create New Structure (2-3 hours)

#### Step 1.1: Create Directories (SAFE - No deletions yet)
```bash
# Create new structure WITHOUT moving files yet
mkdir -p backend/canisters
mkdir -p backend/libs
mkdir -p frontend/apps/web
mkdir -p frontend/packages/ui
mkdir -p frontend/packages/hooks
mkdir -p frontend/packages/utils
mkdir -p sdk/typescript
mkdir -p docs/01-getting-started
mkdir -p docs/02-architecture
mkdir -p docs/03-api-reference
mkdir -p docs/04-guides/deployment
mkdir -p docs/04-guides/integration
mkdir -p docs/04-guides/best-practices
mkdir -p docs/05-roadmap
mkdir -p docs/06-adr
mkdir -p docs/99-archive

# Verify created
tree -L 2 -d
```

**Verification**:
```bash
# Should see both old and new structure
ls -la | grep -E "canisters|backend|frontend"
# Both should exist - we haven't moved anything yet
```

---

#### Step 1.2: Copy (NOT move) Backend Files
```bash
# COPY first, move later after verification
cp -r canisters/* backend/canisters/
cp -r libs/* backend/libs/

# Verify copy worked
diff -r canisters backend/canisters
diff -r libs backend/libs

# Should show NO differences
```

**Verification**:
```bash
# Files should exist in BOTH locations
ls canisters/registry/src/lib.rs
ls backend/canisters/registry/src/lib.rs
# Both should exist
```

---

#### Step 1.3: Create Backend Cargo.toml
```bash
# Create new workspace config
cat > backend/Cargo.toml << 'EOF'
[workspace]
resolver = "2"

members = [
    "canisters/registry",
    "canisters/rune-engine",
    "canisters/bitcoin-integration",
    "canisters/identity-manager",
    "canisters/marketplace",
    "canisters/ordinals-engine",
    "libs/quri-types",
    "libs/quri-utils",
    "libs/bitcoin-utils",
    "libs/runes-utils",
    "libs/schnorr-signatures",
]

[workspace.package]
version = "0.2.0"
edition = "2021"
license = "MIT"

[workspace.dependencies]
candid = "0.10"
ic-cdk = "0.13"
ic-cdk-macros = "0.13"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
EOF
```

**Verification**:
```bash
cd backend
cargo check --workspace
# Should compile successfully
cd ..
```

---

#### Step 1.4: Copy Frontend Files
```bash
# Copy frontend app
cp -r frontend/* frontend/apps/web/

# Verify
diff -r frontend frontend/apps/web
# Some differences expected (we're restructuring)
```

---

#### Step 1.5: Create Frontend package.json
```bash
# Create workspace config
cat > frontend/package.json << 'EOF'
{
  "name": "quri-protocol-frontend",
  "version": "0.2.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build",
    "test": "pnpm --recursive test",
    "lint": "pnpm --recursive lint"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
EOF

# Create pnpm workspace
cat > frontend/pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF
```

---

### Phase 2: Verification & Testing (2-3 hours)

#### Step 2.1: Test Backend Compilation
```bash
cd backend

# Test each canister individually
for canister in canisters/*/; do
    echo "Testing $(basename $canister)..."
    cd "$canister"
    cargo check
    cargo test
    cd ../..
done

# Test full workspace
cargo check --workspace
cargo test --workspace

cd ..
```

**Success Criteria**:
- ✅ All canisters compile
- ✅ All tests pass
- ✅ No errors or warnings

---

#### Step 2.2: Test Frontend Build
```bash
cd frontend/apps/web

# Install dependencies
pnpm install

# Type check
pnpm type-check

# Build
pnpm build

# Test
pnpm test

cd ../../..
```

**Success Criteria**:
- ✅ Dependencies install correctly
- ✅ TypeScript compiles
- ✅ Build succeeds
- ✅ Tests pass

---

#### Step 2.3: Test Deployments (Dry Run)
```bash
# Test backend deployment (don't actually deploy)
cd backend
cargo build --target wasm32-unknown-unknown --release --package registry
cargo build --target wasm32-unknown-unknown --release --package rune-engine

# Check WASM size
ls -lh target/wasm32-unknown-unknown/release/*.wasm

cd ..
```

**Success Criteria**:
- ✅ WASMs compile
- ✅ Sizes are reasonable (< 2MB)
- ✅ No errors

---

### Phase 3: Update Configurations (1-2 hours)

#### Step 3.1: Update dfx.json
```bash
# Backup original
cp dfx.json dfx.json.backup

# Update paths to point to backend/
# This needs manual editing based on current dfx.json
```

**Example**:
```json
{
  "canisters": {
    "registry": {
      "type": "rust",
      "candid": "backend/canisters/registry/registry.did",
      "package": "registry",
      "main": "backend/canisters/registry/src/lib.rs"
    }
  }
}
```

---

#### Step 3.2: Update Root Cargo.toml
```bash
# Update root Cargo.toml to point to backend workspace
cat > Cargo.toml << 'EOF'
[workspace]
resolver = "2"

members = [
    "backend/canisters/registry",
    "backend/canisters/rune-engine",
    "backend/canisters/bitcoin-integration",
    "backend/canisters/identity-manager",
    "backend/libs/quri-types",
    "backend/libs/quri-utils",
]

[workspace.package]
version = "0.2.0"
edition = "2021"
license = "MIT"
EOF
```

---

#### Step 3.3: Update .gitignore
```bash
# Add to .gitignore
cat >> .gitignore << 'EOF'

# Migration artifacts
docs/migration/
MIGRATION_*.txt

# Backend
backend/target/
backend/Cargo.lock

# Frontend
frontend/node_modules/
frontend/.next/
frontend/apps/*/node_modules/
frontend/apps/*/.next/
frontend/packages/*/node_modules/
EOF
```

---

### Phase 4: Clean Up Old Structure (1 hour)

#### Step 4.1: Create Verification Script
```bash
#!/bin/bash
# scripts/verify-migration.sh

echo "🔍 Verifying migration..."

# Check backend compiles
cd backend && cargo check --workspace
if [ $? -ne 0 ]; then
    echo "❌ Backend compilation failed!"
    exit 1
fi
cd ..

# Check frontend builds
cd frontend/apps/web && pnpm build
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi
cd ../../..

echo "✅ All verifications passed!"
```

---

#### Step 4.2: Remove Old Structure (DANGEROUS - Last step only)
```bash
# ONLY after ALL tests pass and verification succeeds

# Create one more backup before deletion
git add .
git commit -m "chore: migration verified, about to remove old structure"

# Remove old directories
rm -rf canisters/
rm -rf libs/
# Keep frontend/ for now, we'll clean it up manually

# Verify old structure is gone
ls -la | grep canisters  # Should return nothing
ls -la | grep libs       # Should return nothing
```

**⚠️ STOP HERE and verify everything still works**

---

### Phase 5: Documentation Update (2-3 hours)

#### Step 5.1: Move Documentation Files
```bash
# Move architecture docs
mv ECOSYSTEM_POTENTIAL.md docs/05-roadmap/ecosystem-potential.md
mv ARCHITECTURE_*.md docs/02-architecture/
mv DEPLOYMENT_*.md docs/04-guides/deployment/
mv *_COMPLETADA.md docs/99-archive/

# Update README references
```

---

#### Step 5.2: Create New READMEs
```bash
# backend/README.md
cat > backend/README.md << 'EOF'
# QURI Protocol - Backend

This directory contains all Rust code for QURI Protocol canisters.

## Structure

- `canisters/` - Internet Computer canisters
- `libs/` - Shared Rust libraries

## Development

```bash
# Build all canisters
cargo build --workspace

# Run tests
cargo test --workspace

# Deploy
dfx deploy
```

See [main README](../README.md) for more details.
EOF

# frontend/README.md
cat > frontend/README.md << 'EOF'
# QURI Protocol - Frontend

This directory contains all TypeScript/React code for QURI Protocol.

## Structure

- `apps/` - Deployable applications
  - `web/` - Main web application
- `packages/` - Shared packages
  - `ui/` - UI components
  - `hooks/` - React hooks
  - `utils/` - Utilities

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build
pnpm build

# Test
pnpm test
```

See [main README](../README.md) for more details.
EOF
```

---

### Phase 6: CI/CD Updates (2 hours)

#### Step 6.1: Split GitHub Workflows
```yaml
# .github/workflows/backend.yml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
      - '.github/workflows/backend.yml'
  pull_request:
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown

      - name: Cache cargo
        uses: actions/cache@v3
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            backend/target
          key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}

      - name: Check
        run: cd backend && cargo check --workspace

      - name: Test
        run: cd backend && cargo test --workspace

      - name: Build WASMs
        run: cd backend && cargo build --target wasm32-unknown-unknown --release
```

```yaml
# .github/workflows/frontend.yml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend.yml'
  pull_request:
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: cd frontend && pnpm install

      - name: Type check
        run: cd frontend && pnpm type-check

      - name: Lint
        run: cd frontend && pnpm lint

      - name: Test
        run: cd frontend && pnpm test

      - name: Build
        run: cd frontend && pnpm build
```

---

## 🧪 Testing Checklist

### After Each Phase
- [ ] Git status clean (or expected changes only)
- [ ] No compilation errors
- [ ] No type errors
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Commit with descriptive message

### Before Moving to Next Phase
- [ ] Run full test suite
- [ ] Verify builds locally
- [ ] Check file structure is correct
- [ ] Review changes in Git
- [ ] Create checkpoint commit

---

## 🔙 Rollback Procedures

### If Something Goes Wrong

#### During Phase 1-2 (Structure creation)
```bash
# Just delete new directories, nothing lost
rm -rf backend/
rm -rf frontend/apps/ frontend/packages/
git checkout .
```

#### During Phase 3-4 (After moving files)
```bash
# Rollback to pre-migration tag
git reset --hard v0.2.0-pre-migration

# Or use rollback script
./scripts/rollback-migration.sh
```

#### After Completion (If issues found)
```bash
# Revert the migration commit
git revert <migration-commit-hash>

# Or reset to pre-migration
git reset --hard v0.2.0-pre-migration
git push --force origin migration/backend-frontend-separation
```

---

## ✅ Success Criteria

Migration is successful when:

### Functional
- [ ] All canisters compile
- [ ] All canister tests pass
- [ ] Frontend builds successfully
- [ ] Frontend tests pass
- [ ] Can deploy to local dfx
- [ ] Can deploy to testnet
- [ ] Mainnet canisters unaffected

### Structure
- [ ] Clear backend/ and frontend/ separation
- [ ] No files in old locations
- [ ] Documentation organized in docs/
- [ ] All READMEs updated

### Quality
- [ ] No new compiler warnings
- [ ] No breaking changes to APIs
- [ ] Git history is clean
- [ ] CI/CD pipelines pass

---

## 📊 Verification Commands

### Run These After Migration
```bash
# Backend
cd backend && cargo check --workspace
cd backend && cargo test --workspace
cd backend && cargo build --target wasm32-unknown-unknown --release

# Frontend
cd frontend && pnpm install
cd frontend && pnpm type-check
cd frontend && pnpm lint
cd frontend && pnpm test
cd frontend && pnpm build

# Deployment test
dfx start --background --clean
dfx deploy registry
dfx deploy rune-engine
dfx stop
```

---

## 📝 Migration Log Template

```markdown
## Migration Log

**Start Time**: ___________
**End Time**: ___________
**Performed By**: ___________

### Phase 0: Preparation
- [ ] Backup created
- [ ] Branch created
- [ ] State documented
- **Issues**: ___________

### Phase 1: Structure Creation
- [ ] Directories created
- [ ] Files copied
- [ ] Configs created
- **Issues**: ___________

### Phase 2: Verification
- [ ] Backend tests pass
- [ ] Frontend tests pass
- [ ] Builds succeed
- **Issues**: ___________

### Phase 3: Configuration
- [ ] dfx.json updated
- [ ] Cargo.toml updated
- [ ] package.json updated
- **Issues**: ___________

### Phase 4: Cleanup
- [ ] Old structure removed
- [ ] Verification passed
- **Issues**: ___________

### Phase 5: Documentation
- [ ] Docs moved
- [ ] READMEs created
- [ ] References updated
- **Issues**: ___________

### Phase 6: CI/CD
- [ ] Workflows updated
- [ ] Tests pass in CI
- **Issues**: ___________

### Final Verification
- [ ] All tests passing
- [ ] Deployments work
- [ ] Documentation complete
- **Issues**: ___________

### Notes
___________
```

---

## 🚨 Common Issues & Solutions

### Issue: "Cargo can't find canisters"
**Solution**: Update paths in Cargo.toml and dfx.json

### Issue: "Frontend imports broken"
**Solution**: Update tsconfig.json paths

### Issue: "CI/CD failing"
**Solution**: Update workflow paths

### Issue: "Deployment fails"
**Solution**: Verify dfx.json paths match new structure

---

## 📞 Next Steps After Migration

1. **Test everything** locally
2. **Deploy to testnet** for verification
3. **Run full integration tests**
4. **Update team documentation**
5. **Merge to main** only after full verification
6. **Tag new version** (v0.3.0)
7. **Update CHANGELOG**

---

## 🎯 Estimated Timeline

| Phase | Time | Risk |
|-------|------|------|
| 0. Preparation | 1-2h | None |
| 1. Structure | 2-3h | Low |
| 2. Verification | 2-3h | Low |
| 3. Configuration | 1-2h | Medium |
| 4. Cleanup | 1h | High |
| 5. Documentation | 2-3h | Low |
| 6. CI/CD | 2h | Medium |
| **Total** | **11-16h** | **~2 days** |

---

**Status**: ✅ READY TO BEGIN
**Approval Required**: YES
**Production Impact**: None (during migration), Low (after merge)

**Let's do this safely and professionally! 🚀**
