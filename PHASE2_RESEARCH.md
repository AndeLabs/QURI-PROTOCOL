# 🚀 QURI Protocol - Phase 2 Research & Technology Stack

> **Research Date:** November 2025
> **Focus:** Ordinals, BRC-20, NFT Marketplaces, Bitcoin DeFi
> **Goal:** Expand QURI to become a comprehensive Bitcoin asset platform

---

## 📊 Executive Summary

Based on extensive research of 2025 Bitcoin ecosystem, this document outlines the technology stack, proven solutions, and implementation strategy for QURI Protocol Phase 2 expansion.

### Market Snapshot (2025)
- **55M+ Ordinals inscribed** on Bitcoin blockchain
- **$2.3B market cap** for leading BRC-20 token (ORDI)
- **25% of Bitcoin block space** used by inscriptions
- **Magic Eden leads** with 55% market share in Bitcoin NFTs
- **ICP Chain Fusion** enables native Bitcoin smart contracts

---

## 🎯 Phase 2 Scope

### 1. Ordinals & Inscriptions (NFTs)
### 2. BRC-20 Token Standard
### 3. Marketplace Infrastructure
### 4. DeFi Capabilities

---

## 📚 Technology Deep Dive

## 1. Bitcoin Ordinals & Inscriptions

### What Are They?
Ordinals are a protocol that assigns unique identifiers to individual satoshis (smallest Bitcoin unit), enabling NFT-like functionality on Bitcoin without needing a separate token or sidechain.

### Technical Foundation
- **Introduced:** January 2023 by Casey Rodarmor
- **Enabled by:** SegWit (2017) + Taproot (2021) upgrades
- **Method:** Data inscribed in transaction witness data
- **Tracking:** Ordinal Theory assigns order to each satoshi

### Key Characteristics
```
Traditional Bitcoin TX     Ordinals Inscription
├── Input                 ├── Input
├── Output                ├── Output
└── Signature             └── Witness Data
                              └── Inscribed Content (image, text, etc.)
```

### Inscription Process
1. **Commit Transaction:** Prepare satoshi for inscription
2. **Reveal Transaction:** Embed content in witness data
3. **Propagation:** Content stored permanently on-chain
4. **Tracking:** Ordinal number follows satoshi through transfers

### Content Types Supported
- Images (PNG, JPEG, SVG, GIF)
- Text & JSON
- HTML & JavaScript (interactive art)
- Audio & Video (smaller files)
- 3D models (GLB format)

### Current Challenges
- **Transaction fees:** Can reach $37+ during network congestion
- **Scalability:** Limited by Bitcoin block size (4MB)
- **Indexing:** Requires specialized infrastructure
- **Standards:** Still evolving, some fragmentation

### Success Stories
- **Taproot Wizards:** Top collection by volume
- **NodeMonkes:** Breaking into top 5 collections
- **55M+ inscriptions** demonstrating market demand

---

## 2. BRC-20 Token Standard

### Overview
BRC-20 is an experimental token standard for Bitcoin, inspired by Ethereum's ERC-20, enabling fungible tokens via Ordinals inscriptions.

### Technical Specification
- **Created:** March 2023 by @domodata
- **Method:** JSON data inscribed via Ordinals
- **No Smart Contracts:** Pure data-driven approach
- **Operations:** Deploy, Mint, Transfer

### JSON Structure Example
```json
{
  "p": "brc-20",
  "op": "deploy",
  "tick": "ordi",
  "max": "21000000",
  "lim": "1000"
}
```

### Key Differences from ERC-20

| Feature | ERC-20 (Ethereum) | BRC-20 (Bitcoin) |
|---------|-------------------|------------------|
| Smart Contracts | ✅ Yes | ❌ No |
| Programmability | ✅ High | ❌ Limited |
| Transfer Logic | On-chain execution | JSON inscription |
| Security Model | Contract security | Bitcoin network |
| Transaction Speed | ~12 seconds | ~10 minutes |
| Fees | Gas (variable) | Sat/vbyte |

### Operations

#### Deploy
```json
{
  "p": "brc-20",
  "op": "deploy",
  "tick": "TOKEN",
  "max": "1000000",
  "lim": "100"
}
```

#### Mint
```json
{
  "p": "brc-20",
  "op": "mint",
  "tick": "TOKEN",
  "amt": "100"
}
```

#### Transfer
```json
{
  "p": "brc-20",
  "op": "transfer",
  "tick": "TOKEN",
  "amt": "50"
}
```

### Limitations
- **No conditional logic** (no if/else statements)
- **No callbacks** or event listeners
- **No composability** between tokens natively
- **Indexer dependency** (off-chain services needed)

### Market Status (2025)
- **ORDI:** $2.3B market cap (leading BRC-20)
- **18M+ inscriptions** for BRC-20 tokens
- **Growing ecosystem** but still experimental
- **Primarily speculative** trading use case

### Alternative: Runes Protocol
Casey Rodarmor also created **Runes** as an improvement:
- Native UTXO-based (not inscriptions)
- More efficient on-chain footprint
- Direct integration with Bitcoin script
- **QURI already supports Runes** ✅

---

## 3. NFT Marketplace Infrastructure

### Market Leaders (2025)

#### Magic Eden
- **Market Share:** 55% of Bitcoin NFT volume
- **Overall NFT Market:** 29% across all chains
- **Monthly Volume:** $98M+ (October 2024)
- **Supported Chains:** Bitcoin, Solana, Ethereum, Polygon, Base, etc.
- **Wallet Support:** Xverse, Leather, Unisat

#### Unisat
- **Market Share:** 9% of Bitcoin NFT volume
- **Monthly Volume:** $13.49M
- **Focus:** Bitcoin Ordinals & BRC-20 specialized
- **Features:** Inscription tool, wallet, marketplace

#### OKX NFT
- **Market Share:** 35% of Bitcoin NFT volume
- **Integration:** Part of larger OKX exchange
- **Features:** Multi-chain support, CEX liquidity

### Technical Architecture for Marketplaces

```
┌─────────────────────────────────────────────────┐
│                 Frontend Layer                  │
│  (Next.js, React, Web3 Wallet Integration)      │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              ICP Canister Layer                 │
│  - Order Book Management                        │
│  - Escrow Logic                                 │
│  - Royalty Distribution                         │
│  - Collection Verification                      │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│           Bitcoin Integration Layer             │
│  - UTXO Tracking                                │
│  - Ordinal Inscription Reading                  │
│  - Transfer Construction                        │
│  - ckBTC Settlement                             │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│            Indexer Infrastructure               │
│  - Ordinals Database                            │
│  - Metadata Storage (IPFS/Arweave)              │
│  - Event Tracking                               │
│  - Price Oracle                                 │
└─────────────────────────────────────────────────┘
```

### Key Features Required

1. **Discovery & Browse**
   - Collection pages
   - Rarity rankings
   - Search & filtering
   - Trending collections

2. **Trading**
   - Listings (fixed price, auction)
   - Offers & bidding
   - Escrow via ICP canisters
   - Instant settlement with ckBTC

3. **Creator Tools**
   - Royalty enforcement
   - Collection verification
   - Analytics dashboard
   - Bulk inscription tools

4. **Security**
   - Wallet verification
   - Inscription authenticity checks
   - Scam detection
   - Safe transfer mechanisms

---

## 4. Bitcoin DeFi Ecosystem

### Layer 2 Solutions Overview

#### Lightning Network
- **Purpose:** Fast micropayments
- **Capacity:** 1M+ TPS theoretical
- **Use Case:** Payments, remittances
- **Status:** Most mature, widespread adoption
- **Features:** Keysend, Wumbo Channels, AMP

#### Stacks (STX)
- **Method:** Proof of Transfer (PoX)
- **Smart Contracts:** Clarity language
- **TVL:** Significant DeFi ecosystem
- **Use Cases:** DeFi (ALEX, Arkadiko), NFTs, dApps
- **Bitcoin Finality:** Inherits Bitcoin security

#### Rootstock (RSK)
- **Method:** Merge-mined sidechain
- **Smart Contracts:** EVM-compatible (Solidity)
- **TVL:** $245.4M
- **dApps:** 20+ (DEXes, lending, yield)
- **Bridge:** 2-way peg with Bitcoin

### ICP Chain Fusion - The QURI Advantage

#### Why ICP is Ideal for QURI

```
Traditional L2           ICP Chain Fusion
├── Bridge Required      ├── No Bridge Needed
├── Security Trade-off   ├── Native Integration
├── Wrapped Tokens       ├── 1:1 Twin Tokens (ckBTC)
└── Centralized Risk     └── Decentralized Canisters
```

#### Chain Fusion Capabilities
- **Direct Bitcoin Read/Write:** Canisters can interact with Bitcoin L1
- **ckBTC:** 1:1 Bitcoin twin with 1-2s finality
- **349 BTC locked** ($23.7M) as of 2025
- **No third-party bridges** required
- **Canister smart contracts** = Bitcoin gets programmability

#### ckBTC Technical Details
- **Standard:** ICRC-1 compliant
- **Finality:** 1-2 seconds (vs. 10 min Bitcoin)
- **Fees:** Negligible (~$0.01)
- **Redemption:** Always 1:1 with BTC
- **Security:** Threshold ECDSA signatures

#### Chain-Key Tokens Ecosystem
- **ckBTC:** Bitcoin twin
- **ckETH:** Ethereum twin
- **ckUSDT:** Tether twin
- **ckUSDC:** USDC twin

### DeFi Primitives for QURI Phase 2

#### 1. DEX (Decentralized Exchange)
```
Runes <-> ckBTC Trading Pairs
├── Order Book Model
├── AMM Pools (Uniswap-style)
├── Liquidity Mining
└── Fee Distribution to LPs
```

#### 2. Lending Protocol
```
Collateralized Loans
├── Deposit Runes/BRC-20 as collateral
├── Borrow ckBTC
├── Interest rates via governance
└── Liquidation mechanisms
```

#### 3. Staking
```
Rune Staking
├── Lock Runes for period
├── Earn yield in ckBTC
├── Governance participation
└── Slashing conditions
```

#### 4. Launchpad
```
Token Launch Platform
├── Fair launch mechanisms
├── Vesting schedules
├── Initial DEX offerings (IDO)
└── Anti-rug pull measures
```

---

## 🏆 Competitive Analysis

### Magic Eden (Market Leader)
**Strengths:**
- Dominant market position
- Multi-chain support
- Strong UX/UI
- High liquidity

**Weaknesses:**
- Centralized components
- High fees (2-2.5%)
- No native DeFi integration
- Limited to marketplace

### Unisat
**Strengths:**
- Bitcoin-native focus
- Integrated wallet
- Inscription tools
- Lower fees

**Weaknesses:**
- Smaller market share
- Limited chain support
- Basic DeFi features

### QURI's Unique Positioning

```
QURI = Runes + Ordinals + BRC-20 + Marketplace + DeFi
```

**Competitive Advantages:**
1. **ICP Chain Fusion:** Native Bitcoin integration without bridges
2. **Unified Platform:** Create, trade, stake all in one place
3. **True Decentralization:** Fully on-chain via canisters
4. **DeFi Integration:** Not just marketplace, but complete ecosystem
5. **Low Fees:** ICP's negligible transaction costs
6. **Speed:** 1-2s finality via ckBTC

---

## 🛠️ Technology Stack Recommendations

### Backend (ICP Canisters)

#### Language: Rust
- Industry standard for blockchain
- Memory safety
- High performance
- Strong typing

#### Frameworks & Libraries
```toml
[dependencies]
ic-cdk = "0.14"              # ICP Canister Development Kit
ic-stable-structures = "0.6" # State management
candid = "0.10"              # Interface definition
serde = "1.0"                # Serialization
bitcoin = "0.31"             # Bitcoin primitives
ordinals = "0.18"            # Ordinals protocol (if available)
```

### Frontend

#### Framework: Next.js 15
- Server components
- App router
- Optimized performance
- SEO friendly

#### Wallet Integration
- **Internet Identity** (ICP native)
- **Xverse** (Bitcoin Ordinals)
- **Leather** (Stacks + Bitcoin)
- **Unisat** (Bitcoin specialized)
- **Plug Wallet** (ICP)

#### State Management
- **Zustand** for global state
- **TanStack Query** for server state
- **Jotai** for atomic state (optional)

### Indexer Infrastructure

#### Database
- **PostgreSQL** for relational data
- **TimescaleDB** for time-series (price history)
- **Redis** for caching

#### Inscription Indexer
```rust
// Custom Rust indexer that monitors Bitcoin blocks
// Extracts Ordinal inscriptions and BRC-20 operations
// Stores in database for fast querying
```

#### IPFS/Arweave
- Metadata storage
- Image hosting
- Permanent data availability

---

## 📈 Market Opportunity

### Total Addressable Market (TAM)

| Segment | Annual Volume (2024-2025) | QURI Target Share |
|---------|---------------------------|-------------------|
| Bitcoin NFTs (Ordinals) | $1.2B | 10% = $120M |
| BRC-20 Trading | $800M | 15% = $120M |
| Runes Trading | $500M | 25% = $125M |
| Bitcoin DeFi TVL | $245M (RSK alone) | 20% = $49M |
| **Total Opportunity** | **$2.745B** | **$414M** |

### Growth Drivers
1. **Bitcoin price rally** (>$100K in 2025)
2. **Institutional adoption** of Bitcoin assets
3. **Layer 2 maturation** (Lightning, Stacks, ICP)
4. **NFT market recovery** led by Bitcoin Ordinals
5. **DeFi expansion** beyond Ethereum

---

## ⚠️ Risks & Challenges

### Technical Risks
1. **Bitcoin Network Congestion**
   - High fees during bull markets
   - Slow confirmation times
   - *Mitigation:* Use ckBTC for settlement, batch operations

2. **Indexer Reliability**
   - Critical dependency for Ordinals/BRC-20
   - Must be redundant and fast
   - *Mitigation:* Multiple indexer sources, caching layer

3. **Standards Evolution**
   - Ordinals/BRC-20 still experimental
   - Specification changes possible
   - *Mitigation:* Modular architecture, version support

### Market Risks
1. **Competition:** Magic Eden, Unisat have head start
2. **Regulatory:** Bitcoin asset classification unclear
3. **User Adoption:** Learning curve for Bitcoin DeFi

### Operational Risks
1. **Security:** Smart contract vulnerabilities
2. **Scalability:** ICP canister limits
3. **Liquidity:** Bootstrapping marketplace volume

---

## ✅ Success Criteria

### Phase 2A (6 months)
- [ ] 1,000+ Ordinals inscriptions created
- [ ] 10+ BRC-20 tokens launched
- [ ] $1M+ marketplace volume
- [ ] 500+ active users

### Phase 2B (12 months)
- [ ] 10,000+ inscriptions
- [ ] 100+ collections listed
- [ ] $10M+ marketplace volume
- [ ] Basic DeFi (staking, swaps)
- [ ] 5,000+ active users

### Phase 2C (18 months)
- [ ] Top 5 Bitcoin marketplace by volume
- [ ] Full DeFi suite operational
- [ ] $100M+ TVL
- [ ] 50,000+ active users

---

## 🎯 Next Steps

1. **Roadmap Creation** - Detailed implementation phases
2. **Architecture Design** - System design documents
3. **Team Expansion** - Hire specialized talent
4. **Prototype Development** - MVP for Ordinals inscription
5. **Community Building** - Beta testers, early adopters

---

## 📚 References & Resources

### Official Documentation
- [Ordinals Theory](https://docs.ordinals.com/) - Casey Rodarmor's protocol
- [BRC-20 Spec](https://domo-2.gitbook.io/brc-20-experiment/) - Original specification
- [ICP Chain Fusion](https://internetcomputer.org/chainfusion) - Bitcoin integration
- [Magic Eden Docs](https://docs.magiceden.io/) - Marketplace API

### Key Research Papers
- "Bitcoin reimagined: Ordinals and inscriptions protocols" (ScienceDirect, 2025)
- "BTC DeFi Landscape: Layer-2 Networks" (TheCryptoUpdates, 2025)

### Developer Tools
- [Ordinals Explorer](https://ordinals.com/) - View inscriptions
- [UniSat API](https://docs.unisat.io/) - Ordinals indexer
- [Hiro Platform](https://www.hiro.so/) - Stacks development
- [ICP SDK](https://internetcomputer.org/docs) - Canister development

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Next Review:** Q1 2026
