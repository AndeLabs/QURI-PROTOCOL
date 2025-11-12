# 🏆 QURI PROTOCOL

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-1.75.0-orange.svg)](https://www.rust-lang.org/)
[![ICP](https://img.shields.io/badge/ICP-Mainnet-blue.svg)](https://internetcomputer.org/)

> Comprehensive Bitcoin Asset Platform powered by ICP's Chain Fusion

## 🎯 Overview

QURI Protocol is evolving into a comprehensive Bitcoin asset platform built on the Internet Computer Protocol (ICP). Starting with Runes, we're expanding to Ordinals (NFTs), BRC-20 tokens, a decentralized marketplace, and Bitcoin DeFi.

### Key Features

#### Phase 1 (Production Ready ✅)
- ⚡ **Runes Creation**: 2-second transaction confirmation via ICP canisters
- 💰 **Zero Platform Fees**: Users only pay Bitcoin network fees
- 🔒 **Self-Custody**: Non-custodial via Internet Identity
- 🔐 **Threshold Schnorr**: Direct Bitcoin signing from smart contracts

#### Phase 2 (Planned 🚀)
- 🖼️ **Ordinals & BRC-20**: Create and trade Bitcoin NFTs and tokens
- 🏪 **Marketplace**: Decentralized trading with escrow
- 💎 **DeFi**: Staking, DEX, lending for Bitcoin assets
- 🌐 **Open Source**: 100% transparent and auditable code

**Phase 2 Documentation:** [PHASE2_INDEX.md](./PHASE2_INDEX.md)

## 🏗️ Architecture

This monorepo contains the complete QURI Protocol implementation - backend canisters and professional frontend.

```
quri-protocol/
├── canisters/              # ICP Smart Contracts (Backend)
│   ├── rune-engine/        # Core Runes creation logic
│   ├── bitcoin-integration/ # Bitcoin/ckBTC integration
│   ├── registry/           # Runes registry & metadata
│   └── identity-manager/   # Authentication & access control
├── frontend/               # Next.js Frontend (Production-Ready)
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── lib/              # ICP integration & utilities
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript type definitions
├── libs/                   # Shared libraries
│   ├── quri-types/         # Common types & interfaces
│   ├── quri-utils/         # Utility functions
│   ├── bitcoin-utils/      # Bitcoin-specific utilities
│   ├── runes-utils/        # Runes protocol utilities
│   └── schnorr-signatures/ # Threshold signature utilities
└── scripts/                # Deployment & testing scripts
    ├── deploy-local.sh     # Local deployment automation
    └── test-etching.sh     # End-to-end testing
```

## 🚀 Quick Start

### Prerequisites

- Rust 1.78.0 or higher
- dfx 0.15.0 or higher
- Node.js 18+ (for frontend and tooling)

### Installation

```bash
# Clone the repository
git clone https://github.com/AndeLabs/QURI-PROTOCOL.git
cd QURI-PROTOCOL

# Install Rust toolchain
rustup target add wasm32-unknown-unknown

# Install dfx (ICP SDK)
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Build all canisters
cargo build --target wasm32-unknown-unknown --release
```

### Local Development

```bash
# Start local ICP replica
dfx start --background --clean

# Deploy canisters (automated script)
./scripts/deploy-local.sh

# Run backend tests
cargo test --workspace

# Test complete flow
./scripts/test-etching.sh

# Start frontend development server
cd frontend
npm install
npm run dev

# Stop local replica
dfx stop
```

## 🎨 Frontend

Professional Next.js 14 application with TypeScript, Tailwind CSS, and full ICP integration.

**Features:**
- Internet Identity authentication
- Professional Rune creation form with validation
- Real-time etching status tracking
- Responsive design with Tailwind CSS
- Production-ready for Vercel deployment
- Comprehensive type safety with TypeScript
- Zod schema validation

**Documentation:**
- [Frontend README](frontend/README.md)
- [Deployment Guide](FRONTEND_DEPLOYMENT.md)

**Quick Start:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Update .env.local with your canister IDs
npm run dev
```

## 📦 Canisters

### Rune Engine
Core business logic for Runes creation, including parameter validation, runestone construction, and metadata management.

**Main Features:**
- Runes parameter validation
- Runestone construction (OP_RETURN)
- IPFS metadata integration
- Fee estimation

### Bitcoin Integration
Handles all Bitcoin-related operations including UTXO management, transaction signing via threshold Schnorr, and ckBTC payments.

**Main Features:**
- Bitcoin UTXO tracking
- Threshold Schnorr signing
- ckBTC payment processing
- Transaction broadcasting

### Registry
Persistent storage and indexing of all created Runes with their metadata.

**Main Features:**
- Runes indexing
- Metadata storage
- Query interface
- Analytics

### Identity Manager
Manages authentication and authorization using Internet Identity.

**Main Features:**
- Internet Identity integration
- Access control
- Rate limiting
- User profiles

## 🧪 Testing

### Backend Tests

```bash
# Run all backend tests
cargo test --workspace

# Run specific canister tests
cargo test -p rune-engine

# Run with coverage
cargo tarpaulin --workspace --out Html

# End-to-end etching test
./scripts/test-etching.sh
```

### Frontend Tests

```bash
cd frontend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🔧 Development Tools

### Code Quality

```bash
# Format code
cargo fmt --all

# Lint code
cargo clippy --all-targets --all-features -- -D warnings

# Security audit
cargo audit
```

### Deployment

```bash
# Deploy backend to mainnet
dfx deploy --network ic

# Verify deployment
dfx canister --network ic status rune-engine

# Deploy frontend to Vercel
cd frontend
vercel --prod
```

For detailed deployment instructions, see:
- [Backend Deployment](DEPLOYMENT.md)
- [Frontend Deployment](FRONTEND_DEPLOYMENT.md)

## 📊 Project Status

### Phase 1: Runes Platform (✅ ~90% Complete)

**Backend:**
- [x] Production-grade etching orchestration
- [x] Threshold Schnorr signatures
- [x] UTXO selection & management
- [x] ckBTC integration (ICRC-1/ICRC-2)
- [x] State machine with error recovery
- [x] Comprehensive unit tests (62 tests passing)
- [x] CI/CD pipeline (Rustfmt, Clippy, Tests)

**Frontend:**
- [x] Next.js 14 with TypeScript
- [x] ICP agent integration
- [x] Internet Identity authentication
- [x] Professional UI components
- [x] Form validation with Zod
- [x] Production logging & monitoring
- [x] Vercel deployment ready

**Remaining:**
- [ ] Bitcoin mainnet testing
- [ ] Security audit
- [ ] Public mainnet launch

### Phase 2: Comprehensive Bitcoin Platform (🚧 Planned)

**Phase 2A: Ordinals & BRC-20** (Months 1-6, $300K)
- [ ] Ordinals inscription engine
- [ ] BRC-20 token standard support
- [ ] Bitcoin indexer infrastructure
- [ ] Multi-wallet integration (Xverse, Leather, Unisat)
- **Target:** 1,000+ inscriptions, 10+ BRC-20 tokens

**Phase 2B: Marketplace** (Months 7-12, $500K)
- [ ] Decentralized marketplace canister
- [ ] Order book & escrow system
- [ ] Collection management & verification
- [ ] Trading UI (buy, sell, offers, auctions)
- **Target:** $10M+ trading volume, 5,000+ users

**Phase 2C: DeFi Integration** (Months 13-18, $700K)
- [ ] DEX with AMM pools
- [ ] Staking & yield farming
- [ ] Lending protocol
- [ ] Launchpad & governance
- **Target:** $100M+ TVL, 50,000+ users

**Phase 2 Documentation:**
- [Research & Market Analysis](./PHASE2_RESEARCH.md)
- [Implementation Roadmap](./PHASE2_ROADMAP.md)
- [Master Index](./PHASE2_INDEX.md)

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://docs.quri.protocol)
- [Website](https://quri.protocol)
- [Twitter](https://twitter.com/quri_protocol)
- [Discord](https://discord.gg/quri)

## ⚠️ Security

For security concerns, please email security@quri.protocol

---

Built with ❤️ by the QURI Protocol Team
