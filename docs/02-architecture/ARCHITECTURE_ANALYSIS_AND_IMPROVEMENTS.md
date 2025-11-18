# 🏗️ QURI Protocol - Architecture Analysis & Improvement Proposal

**Date**: 2025-01-17
**Status**: Architecture Review & Redesign Proposal

---

## 📊 Current State Analysis

### Project Overview
```
Total Rust Code: ~11,083 lines (canisters)
Total TS/TSX Files: 5,371 files
Documentation: 100+ MD files
Canisters: 6 (registry, rune-engine, bitcoin-integration, identity-manager, marketplace, ordinals-engine)
Frontend: Next.js 14 (App Router)
Libraries: 5 shared libs
```

### Current Directory Structure
```
QURI-PROTOCOL/                    # Monorepo (GOOD ✅)
├── canisters/                    # 6 canisters
│   ├── registry/                 # ✅ Live on mainnet
│   ├── rune-engine/              # ✅ Live on mainnet
│   ├── bitcoin-integration/      # ✅ Live on mainnet
│   ├── identity-manager/         # ✅ Live on mainnet
│   ├── marketplace/              # ⚠️ Not deployed
│   └── ordinals-engine/          # ⚠️ Not deployed
├── libs/                         # Shared Rust libraries
│   ├── quri-types/               # ✅ Well structured
│   ├── quri-utils/
│   ├── bitcoin-utils/
│   ├── runes-utils/
│   └── schnorr-signatures/
├── frontend/                     # Next.js monolith
│   ├── app/                      # ⚠️ Growing fast
│   ├── components/               # ⚠️ 100+ components
│   ├── hooks/
│   ├── lib/
│   └── types/
├── docs/                         # ⚠️ 100+ scattered docs
├── scripts/                      # ✅ Deployment scripts
└── [100+ MD files in root]       # ❌ ROOT POLLUTION
```

---

## ⚠️ Problems Identified

### 1. **Root Directory Pollution** ❌
```bash
# 100+ files in root directory
ARCHITECTURAL_ANALYSIS_2025.md
DEEP_DIVE_ANALYSIS_2025.md
DEPLOYMENT_SUCCESS_REPORT.md
ECOSYSTEM_POTENTIAL.md
FASE_1_COMPLETADA.md
FASE_1_Y_2_COMPLETADAS.md
... (95+ more)
```

**Impact:**
- Hard to navigate
- Confusing for new contributors
- Git history noise
- No clear organization

### 2. **Frontend Monolith** ⚠️
```
frontend/
├── components/ (100+ components, no structure)
├── app/ (growing pages, mixed concerns)
└── lib/ (utilities, ICP integration, all mixed)
```

**Problems:**
- No clear separation of concerns
- Hard to find components
- Duplicate code
- Tight coupling
- Difficult to test

### 3. **Documentation Chaos** ⚠️
```
100+ markdown files scattered:
- Root directory: 95+ files
- docs/: 6 files
- docs/phase2/: Some files
- No clear organization
- Duplicate information
- Outdated docs mixed with current
```

### 4. **Canister Coupling** ⚠️
```rust
// registry depends on types from rune-engine
// rune-engine depends on bitcoin-integration
// Circular dependencies possible
```

### 5. **No Clear Module Boundaries** ❌

**Current:**
```
Everything in one repo
No versioning for libraries
No independent deployment
Frontend knows too much about canisters
```

---

## ✅ Proposed Architecture Improvements

### Strategy: **Modular Monorepo with Clear Boundaries**

We keep the monorepo (good for coordination) but add:
1. Clear module boundaries
2. Independent versioning
3. Better organization
4. Workspace structure

---

## 🎯 Proposed Structure

### Option A: Enhanced Monorepo (RECOMMENDED)

```
quri-protocol/                          # Root monorepo
│
├── .github/                            # CI/CD workflows
├── .vscode/                            # Workspace settings
│
├── packages/                           # 📦 All packages
│   ├── core/                          # Core business logic
│   │   ├── registry/                  # Registry canister
│   │   ├── rune-engine/               # Rune Engine canister
│   │   ├── bitcoin-integration/       # Bitcoin Integration
│   │   └── identity-manager/          # Identity Manager
│   │
│   ├── features/                      # Feature canisters
│   │   ├── marketplace/               # NFT Marketplace
│   │   ├── ordinals-engine/           # Ordinals support
│   │   ├── dex/                       # Future: DEX canister
│   │   └── staking/                   # Future: Staking canister
│   │
│   ├── libs/                          # Shared libraries
│   │   ├── quri-types/                # Type definitions
│   │   ├── quri-utils/                # Common utilities
│   │   ├── bitcoin-utils/             # Bitcoin helpers
│   │   ├── runes-utils/               # Runes helpers
│   │   └── schnorr-signatures/        # Crypto utilities
│   │
│   ├── frontend/                      # Frontend packages
│   │   ├── web/                       # Main web app
│   │   ├── mobile/                    # Future: Mobile app
│   │   └── admin/                     # Future: Admin dashboard
│   │
│   └── sdk/                           # Developer SDKs
│       ├── typescript/                # TypeScript SDK
│       ├── rust/                      # Rust SDK
│       └── python/                    # Future: Python SDK
│
├── apps/                              # Deployable applications
│   ├── web/                           # Main website (symlink to packages/frontend/web)
│   └── docs/                          # Documentation site (Docusaurus/VitePress)
│
├── tools/                             # Development tools
│   ├── cli/                           # CLI tool for developers
│   ├── deployment/                    # Deployment scripts
│   └── testing-suite/                 # Integration tests
│
├── docs/                              # 📚 ORGANIZED DOCUMENTATION
│   ├── architecture/                  # Architecture docs
│   │   ├── overview.md
│   │   ├── canisters.md
│   │   └── data-flow.md
│   │
│   ├── guides/                        # User & developer guides
│   │   ├── getting-started.md
│   │   ├── deployment.md
│   │   └── api-reference.md
│   │
│   ├── roadmap/                       # Product roadmap
│   │   ├── current-phase.md
│   │   ├── business-model.md
│   │   └── ecosystem-potential.md
│   │
│   ├── decisions/                     # Architecture Decision Records (ADR)
│   │   ├── 001-monorepo-structure.md
│   │   ├── 002-pagination-design.md
│   │   └── 003-security-model.md
│   │
│   └── archive/                       # Old/deprecated docs
│       └── fase-1-completada.md
│
├── scripts/                           # Repository scripts
│   ├── setup.sh
│   ├── deploy-all.sh
│   └── clean.sh
│
├── Cargo.toml                         # Workspace configuration
├── package.json                       # Root package.json (workspaces)
├── pnpm-workspace.yaml                # PNPM workspaces
├── README.md                          # Main README (concise)
├── CONTRIBUTING.md
├── LICENSE
└── .gitignore
```

**Benefits:**
- ✅ Clear separation of concerns
- ✅ Easy to navigate
- ✅ Independent versioning possible
- ✅ Better for new contributors
- ✅ Scalable to 100+ packages
- ✅ Modern monorepo practices

---

### Option B: Multi-Repository (NOT RECOMMENDED)

**Split into:**
```
quri-protocol-core/          # Core canisters
quri-protocol-web/           # Frontend
quri-protocol-sdk/           # SDKs
quri-protocol-docs/          # Documentation
```

**Problems:**
- ❌ Harder to coordinate changes
- ❌ Version synchronization hell
- ❌ CI/CD complexity
- ❌ Duplicate tooling
- ❌ Slower development

**When to use:**
- Only if team is 50+ people
- Need independent release cycles
- Different languages/stacks

---

## 🎨 Frontend Architecture Improvements

### Current Problems
```typescript
// ❌ Current: Everything mixed
frontend/
├── components/
│   ├── EnhancedEtchingForm.tsx
│   ├── Hero.tsx
│   ├── RuneCard.tsx
│   ├── ModernRuneGallery.tsx
│   ├── ... (100+ more)
```

### Proposed: Feature-Based Architecture

```typescript
packages/frontend/web/
├── src/
│   ├── features/                      # Feature modules
│   │   ├── runes/                     # Runes feature
│   │   │   ├── components/
│   │   │   │   ├── RuneCard.tsx
│   │   │   │   ├── RuneGallery.tsx
│   │   │   │   └── RuneDetails.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useRunes.ts
│   │   │   │   └── useRuneDetails.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── etching/                   # Etching feature
│   │   │   ├── components/
│   │   │   │   ├── EtchingForm.tsx
│   │   │   │   └── EtchingProgress.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useEtching.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── marketplace/               # Marketplace feature
│   │   ├── staking/                   # Staking feature
│   │   └── analytics/                 # Analytics feature
│   │
│   ├── shared/                        # Shared across features
│   │   ├── components/
│   │   │   ├── ui/                    # UI primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   └── Modal.tsx
│   │   │   └── layout/                # Layout components
│   │   │       ├── Header.tsx
│   │   │       ├── Footer.tsx
│   │   │       └── Sidebar.tsx
│   │   │
│   │   ├── hooks/                     # Shared hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useToast.ts
│   │   │
│   │   └── utils/                     # Shared utilities
│   │
│   ├── lib/                           # Core libraries
│   │   ├── icp/                       # ICP integration
│   │   │   ├── actors.ts
│   │   │   ├── auth.ts
│   │   │   └── idl/
│   │   ├── api/                       # API clients
│   │   └── config/                    # Configuration
│   │
│   └── app/                           # Next.js App Router
│       ├── (public)/                  # Public routes
│       │   ├── page.tsx
│       │   ├── explore/
│       │   └── roadmap/
│       │
│       └── (authenticated)/           # Protected routes
│           ├── dashboard/
│           └── portfolio/
│
├── package.json
└── tsconfig.json
```

**Benefits:**
- ✅ Clear feature boundaries
- ✅ Easy to find code
- ✅ Easy to test
- ✅ Reusable components
- ✅ Lazy loading features
- ✅ Team can own features

---

## 📦 Package Management Strategy

### Rust Workspace (Cargo.toml)

```toml
[workspace]
resolver = "2"

members = [
    # Core canisters
    "packages/core/registry",
    "packages/core/rune-engine",
    "packages/core/bitcoin-integration",
    "packages/core/identity-manager",

    # Feature canisters
    "packages/features/marketplace",
    "packages/features/ordinals-engine",

    # Libraries
    "packages/libs/quri-types",
    "packages/libs/quri-utils",
    "packages/libs/bitcoin-utils",
    "packages/libs/runes-utils",
    "packages/libs/schnorr-signatures",
]

[workspace.package]
version = "0.2.0"
edition = "2021"
license = "MIT"

[workspace.dependencies]
candid = "0.10"
ic-cdk = "0.13"
serde = "1.0"
```

### TypeScript/JavaScript (pnpm-workspace.yaml)

```yaml
packages:
  - 'packages/frontend/*'
  - 'packages/sdk/*'
  - 'apps/*'
  - 'tools/*'
```

---

## 🔐 Module Boundaries & Dependencies

### Dependency Rules

```
┌─────────────────────────────────────────────┐
│             Applications Layer               │
│  (web, mobile, admin, docs)                 │
└─────────────────────────────────────────────┘
                    ↓ depends on
┌─────────────────────────────────────────────┐
│             Features Layer                   │
│  (marketplace, staking, dex)                │
└─────────────────────────────────────────────┘
                    ↓ depends on
┌─────────────────────────────────────────────┐
│             Core Layer                       │
│  (registry, rune-engine, bitcoin-int)       │
└─────────────────────────────────────────────┘
                    ↓ depends on
┌─────────────────────────────────────────────┐
│             Libraries Layer                  │
│  (quri-types, quri-utils, bitcoin-utils)    │
└─────────────────────────────────────────────┘
```

**Rules:**
- ✅ Apps can depend on Features, Core, Libraries
- ✅ Features can depend on Core, Libraries
- ✅ Core can depend on Libraries
- ❌ Libraries CANNOT depend on Core or Features
- ❌ Core CANNOT depend on Features
- ❌ No circular dependencies

---

## 📚 Documentation Reorganization

### Before (Current)
```
100+ MD files scattered everywhere
Hard to find anything
Duplicate information
Mix of English/Spanish
```

### After (Proposed)

```
docs/
├── README.md                          # Docs index
│
├── 01-getting-started/
│   ├── installation.md
│   ├── quick-start.md
│   └── first-rune.md
│
├── 02-architecture/
│   ├── overview.md
│   ├── canisters.md
│   ├── data-flow.md
│   └── security-model.md
│
├── 03-api-reference/
│   ├── registry.md
│   ├── rune-engine.md
│   ├── bitcoin-integration.md
│   └── typescript-sdk.md
│
├── 04-guides/
│   ├── deployment/
│   │   ├── local.md
│   │   ├── testnet.md
│   │   └── mainnet.md
│   ├── integration/
│   │   ├── frontend.md
│   │   └── backend.md
│   └── best-practices/
│       ├── security.md
│       └── performance.md
│
├── 05-roadmap/
│   ├── current-status.md
│   ├── phases.md
│   ├── business-model.md
│   └── ecosystem-potential.md
│
├── 06-adr/                            # Architecture Decision Records
│   ├── template.md
│   ├── 001-monorepo-structure.md
│   ├── 002-pagination-design.md
│   └── 003-security-model.md
│
└── 99-archive/
    └── old-docs/
```

---

## 🚀 Migration Plan

### Phase 1: Documentation Cleanup (Week 1)
- [ ] Create new docs/ structure
- [ ] Categorize existing 100+ MD files
- [ ] Move to appropriate locations
- [ ] Archive outdated docs
- [ ] Update README with new structure

### Phase 2: Package Restructuring (Week 2)
- [ ] Create packages/ directory
- [ ] Move canisters to packages/core/
- [ ] Move libs to packages/libs/
- [ ] Update Cargo.toml workspace
- [ ] Verify builds

### Phase 3: Frontend Refactoring (Weeks 3-4)
- [ ] Create feature modules
- [ ] Extract shared components
- [ ] Reorganize by feature
- [ ] Update imports
- [ ] Add barrel exports

### Phase 4: SDK Creation (Week 5)
- [ ] Extract TypeScript SDK
- [ ] Extract Rust SDK
- [ ] Create packages/sdk/
- [ ] Publish to npm/crates.io
- [ ] Update frontend to use SDK

### Phase 5: CI/CD Updates (Week 6)
- [ ] Update build scripts
- [ ] Update deployment scripts
- [ ] Test all workflows
- [ ] Update documentation

---

## 💡 Implementation Recommendations

### Start with Quick Wins

1. **Documentation Cleanup** (1-2 days)
   ```bash
   mkdir -p docs/{architecture,guides,roadmap,adr,archive}
   # Move files to appropriate locations
   # Update README
   ```

2. **Add Navigation Component** (1 day)
   ```bash
   # Create packages/frontend/web/src/shared/components/layout/
   # Add Header, Footer, Navigation
   ```

3. **Extract UI Components** (2-3 days)
   ```bash
   # Create packages/frontend/web/src/shared/components/ui/
   # Extract Button, Card, Modal, etc.
   ```

### Medium-Term Improvements

4. **Feature-Based Frontend** (1-2 weeks)
   - Reorganize by feature
   - Add barrel exports
   - Update imports

5. **Package Restructuring** (1 week)
   - Move to packages/
   - Update workspace config
   - Verify builds

### Long-Term Goals

6. **SDK Creation** (2-3 weeks)
   - Extract to independent packages
   - Publish to registries
   - Create documentation

7. **Multi-App Support** (1 month)
   - Admin dashboard
   - Mobile app
   - Analytics platform

---

## 📏 Metrics to Track

### Code Organization
- [ ] Max 20 files in root directory
- [ ] Max 10 components per feature
- [ ] Max 3 levels of nesting
- [ ] 100% barrel exports

### Documentation
- [ ] All docs categorized
- [ ] Max 10 files per category
- [ ] Clear navigation
- [ ] Search functionality

### Performance
- [ ] Bundle size < 500KB
- [ ] First load < 2s
- [ ] Code splitting by feature

---

## 🎯 Conclusion

**Recommended Approach: Enhanced Monorepo (Option A)**

**Benefits:**
- ✅ Better organization
- ✅ Easier to navigate
- ✅ Scalable structure
- ✅ Clear boundaries
- ✅ Independent packages
- ✅ Modern best practices

**Next Steps:**
1. Start with documentation cleanup
2. Create navigation component
3. Extract UI components
4. Gradually refactor frontend by feature
5. Restructure into packages/

**Timeline: 6 weeks total**
**Effort: Medium (can be done incrementally)**
**Risk: Low (backward compatible)**

---

Built with ❤️ for scalability and maintainability
