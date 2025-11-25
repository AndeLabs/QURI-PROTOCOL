# QURI Protocol

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-1.78.0-orange.svg)](https://www.rust-lang.org/)
[![ICP](https://img.shields.io/badge/ICP-Mainnet-blue.svg)](https://internetcomputer.org/)
[![Live](https://img.shields.io/badge/Status-Live-success.svg)](https://quri-protocol.com)

**Bitcoin Runes Infrastructure on Internet Computer**

QURI Protocol is a comprehensive Bitcoin Runes infrastructure built on the Internet Computer (ICP). It enables users to create, index, and manage Runes affordably, with 2-second finality thanks to ICP's fast execution layer. All operations run securely and natively, without centralized bridges.

## Features

- **Threshold Schnorr Signatures** - Secure Taproot transactions signed directly from ICP canisters
- **Dead Man's Switch** - Bitcoin inheritance with automatic Rune transfers to beneficiaries
- **vetKeys** - Private and encrypted metadata management with time-locked reveals
- **2-Second Finality** - Fast transaction confirmation via ICP's consensus
- **Self-Custody** - Non-custodial architecture with Internet Identity authentication

## Architecture

```
quri-protocol/
├── backend/canisters/          # Rust canisters (ICP smart contracts)
│   ├── rune-engine/            # Core Runes creation logic
│   ├── bitcoin-integration/    # Bitcoin & ckBTC integration
│   ├── registry/               # Runes indexing & metadata
│   └── identity-manager/       # Authentication & access control
├── frontend/                   # Next.js 14 application
│   ├── app/                    # App Router pages
│   ├── components/             # React components
│   └── hooks/                  # Custom React hooks
├── libs/                       # Shared Rust libraries
│   ├── quri-types/             # Common types
│   ├── bitcoin-utils/          # Bitcoin utilities
│   ├── runes-utils/            # Runes protocol utilities
│   └── schnorr-signatures/     # Threshold signature utilities
└── scripts/                    # Deployment & operations
```

## Quick Start

### Prerequisites

- Rust 1.78.0+
- dfx 0.24.0+
- Node.js 18+

### Installation

```bash
# Clone repository
git clone https://github.com/AndeLabs/QURI-PROTOCOL.git
cd QURI-PROTOCOL

# Install Rust target
rustup target add wasm32-unknown-unknown

# Install dfx
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Build canisters
cd backend && cargo build --target wasm32-unknown-unknown --release
```

### Local Development

```bash
# Start local replica
dfx start --background --clean

# Deploy canisters
cd backend && dfx deploy

# Start frontend
cd frontend && npm install && npm run dev
```

### Production Deployment

```bash
# Deploy to mainnet
./scripts/deploy.sh mainnet

# Monitor cycles
./scripts/monitor-cycles.sh
```

## Canister IDs (Mainnet)

| Canister | ID | Description |
|----------|-----|-------------|
| Rune Engine | `pkrpq-5qaaa-aaaah-aroda-cai` | Core Runes creation, trading & DMS |
| Registry | `pnqje-qiaaa-aaaah-arodq-cai` | Runes indexing & metadata |
| Identity Manager | `y67br-5iaaa-aaaah-arn5q-cai` | Authentication & access control |
| Bitcoin Integration | `ghsi2-tqaaa-aaaan-aaaca-cai` | Public ICP Bitcoin service |
| Internet Identity | `rdmx6-jaaaa-aaaaa-aaadq-cai` | Public ICP auth service |

> **Note:** Last updated: November 25, 2024

## Virtual Rune Trading

QURI Protocol includes a bonding curve AMM for trading Virtual Runes before they settle to Bitcoin:

```bash
# Get trading pool count
dfx canister --network ic call pkrpq-5qaaa-aaaah-aroda-cai get_trading_pool_count '()'

# List all virtual runes
dfx canister --network ic call pkrpq-5qaaa-aaaah-aroda-cai list_all_virtual_runes '(0, 10)'

# Get buy quote (rune_id, amount, slippage_bps)
dfx canister --network ic call pkrpq-5qaaa-aaaah-aroda-cai get_buy_quote '("rune-id", 1000, 100)'
```

## API Examples

```bash
# List indexed Runes
dfx canister --network ic call registry list_indexed_runes '(0 : nat64, 24 : nat64)'

# Search Runes
dfx canister --network ic call registry search_indexed_runes '("DOG", 0 : nat64, 30 : nat64)'

# Get stats
dfx canister --network ic call registry get_indexer_stats '()'
```

## Testing

```bash
# Backend tests
cd backend && cargo test --workspace

# Frontend tests
cd frontend && npm test

# Type checking
cd frontend && npm run type-check
```

## Tech Stack

**Backend:**
- Rust with `ic-cdk`
- StableBTreeMap for persistent storage
- Threshold Schnorr (BIP-340)
- ckBTC integration (ICRC-1/ICRC-2)

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Zustand + TanStack Query
- Internet Identity

## Security

- All admin functions require authorization
- Rate limiting on all endpoints
- Content Security Policy with nonces
- Input validation with Zod schemas
- No exposed API keys

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built by [Ande Labs](https://github.com/AndeLabs)
