# 🏆 QURI PROTOCOL

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-1.75.0-orange.svg)](https://www.rust-lang.org/)
[![ICP](https://img.shields.io/badge/ICP-Mainnet-blue.svg)](https://internetcomputer.org/)

> Zero-fee Bitcoin Runes launchpad powered by ICP's threshold Schnorr signatures

## 🎯 Overview

QURI is a decentralized, zero-platform-fee Runes launchpad built on the Internet Computer Protocol (ICP). It democratizes the creation of Bitcoin Runes tokens with instant finality and self-custody.

### Key Features

- ⚡ **Instant Finality**: 2-second transaction confirmation via ICP canisters
- 💰 **Zero Platform Fees**: Users only pay Bitcoin network fees
- 🔒 **Self-Custody**: Non-custodial via Internet Identity
- 🔐 **Threshold Schnorr**: Direct Bitcoin signing from smart contracts
- 🌐 **Open Source**: 100% transparent and auditable code

## 🏗️ Architecture

This monorepo contains the complete QURI Protocol backend implementation.

```
quri-protocol/
├── canisters/              # ICP Smart Contracts
│   ├── rune-engine/        # Core Runes creation logic
│   ├── bitcoin-integration/ # Bitcoin/ckBTC integration
│   ├── registry/           # Runes registry & metadata
│   └── identity-manager/   # Authentication & access control
├── libs/                   # Shared libraries
│   ├── quri-types/         # Common types & interfaces
│   ├── quri-utils/         # Utility functions
│   ├── bitcoin-utils/      # Bitcoin-specific utilities
│   ├── runes-utils/        # Runes protocol utilities
│   └── schnorr-signatures/ # Threshold signature utilities
└── tools/                  # Development tools
    ├── deployment/         # Deployment scripts
    └── testing-suite/      # Integration tests
```

## 🚀 Quick Start

### Prerequisites

- Rust 1.75.0 or higher
- dfx 0.15.0 or higher
- Node.js 18+ (for tooling)

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

# Deploy canisters locally
dfx deploy

# Run tests
cargo test --workspace

# Stop local replica
dfx stop
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

```bash
# Run all tests
cargo test --workspace

# Run specific canister tests
cargo test -p rune-engine

# Run with coverage
cargo tarpaulin --workspace --out Html

# Integration tests
cargo test --test integration
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
# Deploy to mainnet
./tools/deployment/deploy.sh --network ic

# Verify deployment
dfx canister --network ic status rune-engine
```

## 📊 Project Status

- [x] Phase 1: MVP Development
- [ ] Bitcoin Integration Testing
- [ ] Mainnet Deployment
- [ ] Phase 2: L2 Development (Celestia)

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
