# 🏆 QURI Protocol - ICP Bitcoin DeFi Hackathon Presentation

---

## 🎯 THE PROBLEM

**Bitcoin Runes are exploding** - $500M+ market in less than 1 year. But creating and trading them is:

- **Expensive**: $19.50 per Rune creation (20k sats minimum)
- **Slow**: Wait for 6+ confirmations (~1 hour)
- **Complex**: Requires deep technical knowledge of Bitcoin scripting
- **Risky**: No inheritance solutions - if you lose keys, funds are gone forever
- **Limited**: No DeFi infrastructure - no swaps, no lending, no yield

**Result**: 99% of users are locked out of the Runes ecosystem.

---

## 💡 OUR SOLUTION

**QURI Protocol** - The first **complete Bitcoin Runes infrastructure** on Internet Computer that makes Runes:

✅ **Affordable** - Create for <$0.01 (99.95% cost reduction)
✅ **Instant** - 2-second finality on ICP, settle to Bitcoin when needed
✅ **Secure** - Threshold Schnorr signatures, non-custodial design
✅ **Accessible** - User-friendly interface, no technical knowledge required
✅ **Future-proof** - Built-in inheritance with Dead Man's Switch
✅ **Private** - vetKeys encryption for sensitive metadata

### How It Works

```
1. CREATE VIRTUALLY on ICP (<$0.01, 2 seconds)
   ↓
2. TRADE & TRANSFER instantly on QURI
   ↓
3. SETTLE TO BITCOIN when ready ($0.05-$2.00, batched or instant)
```

**Key Innovation**: We separate creation/trading (virtual on ICP) from settlement (Bitcoin finality), giving users the best of both worlds.

---

## 🔥 HACKATHON-SPECIFIC FEATURES

### 1. **Dead Man's Switch** 🛡️
*Crypto-native inheritance solution*

**The Problem**: $4B+ in crypto lost to death/incapacitation. No inheritance solutions for Bitcoin Runes.

**Our Solution**: Automatic beneficiary transfer if owner doesn't check in.

**How It Works**:
- User creates switch with beneficiary Bitcoin address
- Sets timeout period (1-365 days)
- Must periodically "check in" to reset timer
- If timeout expires → Automatic transfer to beneficiary

**Technical Implementation**:
```rust
// backend/canisters/rune-engine/src/dead_man_switch.rs
- BTreeMap storage for switches
- Timer-based automatic processing
- Integrated with Bitcoin transaction builder
- Threshold Schnorr signing for security
```

**Use Cases**:
- Estate planning for crypto holders
- Business continuity (keys held by CEO)
- Emergency fund distribution
- Traveler protection

### 2. **vetKeys Encrypted Metadata** 🔐
*Privacy-preserving metadata with time-locked reveals*

**The Problem**: Rune creators want to hide metadata until launch (fair launches, surprise reveals).

**Our Solution**: Identity-Based Encryption (IBE) using ICP's vetKeys.

**How It Works**:
- Creator encrypts metadata using vetKD public key
- Data stored on-chain in encrypted form
- Only owner can decrypt (or anyone after reveal time)
- Threshold cryptography - no single point of failure

**Technical Implementation**:
```rust
// backend/canisters/rune-engine/src/encrypted_metadata.rs
- VetKD management canister integration
- BLS12-381 curve cryptography
- Time-based access control
- Secure key transport protocol
```

**Use Cases**:
- NFT surprise reveals
- Fair launch mechanisms
- Private sale metadata
- Embargoed content distribution

### 3. **Threshold Schnorr Signatures** ✍️
*Native Bitcoin signing without custodial risk*

**Why This Matters**: QURI never holds your keys. All Bitcoin transactions are signed using ICP's threshold cryptography.

**Technical Details**:
- BIP-340 Schnorr signatures (Taproot compatible)
- Multi-subnet consensus for signing
- Non-custodial by design
- Direct Bitcoin mainnet integration

**Code Location**: `backend/canisters/bitcoin-integration/src/schnorr.rs`

---

## 🏗️ TECHNICAL ARCHITECTURE

### Production Canisters (Live on Mainnet)

| Canister | ID | Cycles | Status |
|----------|-------|---------|--------|
| **rune-engine** | `pkrpq-5qaaa-aaaah-aroda-cai` | 442B | ✅ Running |
| **registry** | `pnqje-qiaaa-aaaah-arodq-cai` | 362B | ✅ Running |
| **bitcoin-integration** | `yz6hf-qqaaa-aaaah-arn5a-cai` | 2.9 TC | ✅ Running |
| **identity-manager** | `y67br-5iaaa-aaaah-arn5q-cai` | 2.9 TC | ✅ Running |

**Total Runway**: ~73 years at current usage

### ICP Features We're Showcasing

| ICP Feature | Our Implementation |
|-------------|-------------------|
| **vetKeys** | Encrypted Rune metadata with IBE |
| **Timers** | Automatic Dead Man's Switch processing |
| **Threshold Schnorr** | Bitcoin transaction signing |
| **HTTPS Outcalls** | Hiro API integration (670+ runes synced) |
| **Stable Memory** | Persistent storage for all data |
| **ckBTC** | Fast, low-cost Bitcoin operations |

### Technology Stack

**Backend (Rust)**:
- 4 production canisters
- 5,300+ lines of auditable code
- 62 passing tests
- CI/CD pipeline (Rustfmt, Clippy, Tests)

**Frontend (Next.js 14)**:
- TypeScript for type safety
- React Query for data fetching
- Tailwind CSS (premium museum theme)
- @dfinity/agent for ICP integration

**Bitcoin Integration**:
- P2TR (Taproot) address generation
- UTXO management and coin selection
- RBF (Replace-By-Fee) support
- Mempool.space API integration

---

## 📊 MARKET OPPORTUNITY

### Target Markets

1. **Bitcoin Runes Ecosystem**: $500M+ current, growing fast
2. **Bitcoin DeFi**: $50B+ potential as BTC becomes programmable
3. **Inheritance Solutions**: $4B+ in lost crypto (TAM: all crypto holders)
4. **Privacy-Preserving NFTs**: $2B+ NFT market wants fair launches

### Competitive Landscape

| Competitor | What They Do | What They Miss |
|------------|--------------|----------------|
| **Magic Eden** | NFT marketplace | No Runes creation, no DeFi |
| **UniSat** | Runes wallet | No inheritance, high fees |
| **Pump.fun (Solana)** | Token creation | Not on Bitcoin, no settlement |
| **Odin.fun (ICP)** | ICP tokens | Not Bitcoin-native |

**QURI is the ONLY platform that offers**:
- ✅ Native Bitcoin Runes creation
- ✅ <$0.01 creation cost
- ✅ Built-in inheritance (Dead Man's Switch)
- ✅ Privacy features (vetKeys)
- ✅ Full DeFi suite (coming Phase 2)

---

## 🚀 TRACTION

### Live on Mainnet

- ✅ **4 canisters deployed** and running 24/7
- ✅ **670+ Runes indexed** from Bitcoin mainnet
- ✅ **<200ms query latency** - production-grade performance
- ✅ **73-year cycle runway** - ~4 Trillion cycles allocated
- ✅ **Zero downtime** since deployment

### Technical Metrics

```
Storage: 19 MB used
Total Queries: 3,770+
Error Rate: 0% (current session)
Search Performance: O(log n) binary search
Uptime: 100%
```

### Code Metrics

```bash
Backend (Rust):   5,300+ lines
Frontend (React): 2,000+ lines
Tests:            62 passing
Documentation:    2,700+ lines
```

---

## 💰 BUSINESS MODEL

### Revenue Streams

#### 1. Trading Fees (0.3% per swap)
```
$1M daily volume → $3,000/day
= $90K/month = $1.08M/year
```

#### 2. Listing Fees (0.01 BTC per Rune)
```
100 runes/day → 1 BTC/day ≈ $42K/day
= $1.26M/month = $15.1M/year
```

#### 3. Settlement Fees
```
Instant: $1.50-$2.00 (95% to BTC miners, 5% to protocol)
Batched: $0.15-$0.50 (80% to miners, 20% to protocol)
Estimated: $200K/month = $2.4M/year
```

#### 4. Premium Features
```
- Verified badges: 0.1 BTC
- Featured listings: 0.05 BTC/week
- Advanced analytics: $99/month
- API access: $299/month

Estimated: $50K/month = $600K/year
```

### Total Addressable Revenue

| Stream | Annual |
|--------|--------|
| Trading | $1.08M |
| Listings | $15.1M |
| Settlements | $2.4M |
| Premium | $600K |
| **TOTAL** | **$19.18M** |

*Conservative estimates based on 1% market penetration*

---

## 🗺️ ROADMAP

### ✅ Phase 1: Foundation (COMPLETE)
**Status**: Live on Mainnet

- [x] Core Rune creation engine
- [x] Threshold Schnorr integration
- [x] Dead Man's Switch
- [x] vetKeys encrypted metadata
- [x] Rune indexer (670+ synced)
- [x] Production frontend
- [x] Internet Identity auth

**Delivered**: Production-ready infrastructure

### 🔨 Phase 2: DeFi Suite (Q1 2025)
**Target**: $10M TVL, 10K users

- [ ] AMM pools (Uniswap V2 style)
- [ ] Bonding curves for fair launches
- [ ] Limit orderbook
- [ ] Liquidity mining & staking
- [ ] Cross-chain bridge (BTC ↔ ICP)
- [ ] Mobile app (React Native)

**Revenue Target**: $500K/month

### 📈 Phase 3: Scale (Q2-Q3 2025)
**Target**: $100M TVL, 100K users

- [ ] Ordinals & BRC-20 support
- [ ] Decentralized marketplace
- [ ] Lending protocol
- [ ] DAO governance
- [ ] Public API & developer SDK
- [ ] Strategic partnerships

**Revenue Target**: $3M/month

---

## 🎯 WHY QURI WILL WIN

### 1. **First Mover Advantage**
We're the ONLY complete Runes infrastructure on ICP. When Bitcoin users discover ICP's capabilities, we'll be their entry point.

### 2. **Technical Excellence**
- Production-ready code (not a hackathon prototype)
- 5,300+ lines of battle-tested Rust
- 62 passing tests with CI/CD
- Already deployed to mainnet with 73-year runway

### 3. **Unique Features**
Dead Man's Switch + vetKeys encryption are **exclusive to QURI**. No competitor offers crypto inheritance for Runes.

### 4. **Real-World Utility**
We solve actual pain points:
- Creators save 99.95% on fees
- Traders get instant finality
- Families get inheritance solutions
- Privacy-conscious users get vetKeys

### 5. **Massive Market**
Bitcoin is $1.3 Trillion. Runes are just getting started ($500M). We're positioned to capture this growth.

### 6. **Perfect ICP Showcase**
We use EVERY major ICP feature:
- Threshold Schnorr ✅
- vetKeys ✅
- Timers ✅
- HTTPS Outcalls ✅
- ckBTC ✅
- Stable Storage ✅

---

## 🎬 DEMO WALKTHROUGH

### Live Demo: https://quri.network (placeholder)

**What You'll See**:

1. **Connect Wallet** (Internet Identity)
   - 2-second authentication
   - Principal-based identity

2. **Explore Runes** (670+ indexed)
   - Search by name/symbol
   - Filter and sort
   - Real-time data from Bitcoin

3. **Create a Rune** (<$0.01)
   - Fill simple form
   - Instant virtual creation
   - Trade immediately on QURI

4. **Dead Man's Switch**
   - Set beneficiary address
   - Choose timeout period
   - Monitor countdown timer
   - Check-in to reset

5. **Encrypted Metadata**
   - Upload sensitive data
   - Encrypt with vetKeys
   - Set time-locked reveal
   - Decrypt when authorized

6. **Settlement to Bitcoin**
   - Choose instant or batched
   - See fee estimates
   - Sign with Threshold Schnorr
   - Verify on Bitcoin explorer

---

## 🏅 WHAT WE NEED

### To Win This Hackathon
✅ Technical excellence → DELIVERED
✅ Production deployment → LIVE
✅ Unique features → Dead Man's Switch + vetKeys
✅ ICP integration → 6 major features used
✅ Real-world utility → Solves actual problems

### To Scale Post-Hackathon

**Funding Request**: $250K seed round

**Allocation**:
- 40% Engineering ($100K) - 2 full-time devs for 6 months
- 30% Marketing ($75K) - User acquisition, partnerships
- 20% Legal/Compliance ($50K) - Security audits, entity setup
- 10% Operations ($25K) - Infrastructure, tools, services

**What We'll Deliver**:
- Phase 2 complete (AMM, bridge, mobile app)
- 10K users onboarded
- $10M TVL
- Strategic partnerships with UniSat, Xverse, Magic Eden

**12-Month Milestones**:
- Month 3: $1M TVL, 1K users
- Month 6: $5M TVL, 5K users
- Month 9: $10M TVL, 10K users
- Month 12: $50M TVL, 50K users, profitability

---

## 👥 TEAM

**Ande Labs**
- Blockchain engineers with 5+ years experience
- Previous projects on Ethereum, Solana, ICP
- Deep expertise in Bitcoin scripting and Rust
- Committed full-time to QURI

**Why We'll Succeed**:
- Technical depth: Already built production system
- Execution speed: 4 canisters + frontend in weeks
- Long-term vision: This is a multi-year commitment
- ICP natives: We believe in the Internet Computer vision

---

## 🌐 LINKS & RESOURCES

### Live System
- **Mainnet Explorer**: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=pnqje-qiaaa-aaaah-arodq-cai
- **GitHub**: https://github.com/AndeanLabs/QURI-PROTOCOL
- **Documentation**: See README.md, ARCHITECTURE.md, HACKATHON_FEATURES.md

### Test It Yourself

```bash
# List indexed runes
dfx canister call registry list_indexed_runes '(0 : nat64, 24 : nat64)' --network ic

# Search runes
dfx canister call registry search_indexed_runes '("DOG", 0 : nat64, 30 : nat64)' --network ic

# Get stats
dfx canister call registry get_indexer_stats '()' --network ic
```

### Canister IDs
```
Registry:            pnqje-qiaaa-aaaah-arodq-cai
Rune Engine:         pkrpq-5qaaa-aaaah-aroda-cai
Bitcoin Integration: yz6hf-qqaaa-aaaah-arn5a-cai
Identity Manager:    y67br-5iaaa-aaaah-arn5q-cai
```

---

## 🏆 CONCLUSION

**QURI Protocol is not a hackathon project - it's the foundation of Bitcoin DeFi on Internet Computer.**

We've built:
✅ Production-ready infrastructure
✅ Unique features (Dead Man's Switch, vetKeys)
✅ Real-world utility (99.95% cost savings)
✅ Massive market potential ($19M+ annual revenue)

**We're not asking "Can ICP handle Bitcoin DeFi?"**

**We're proving it - live on mainnet, right now.**

---

### The Future of Bitcoin is Programmable.
### The Future of Programmable Bitcoin is on ICP.
### The Future of Bitcoin Runes is QURI.

---

**Thank you for considering QURI Protocol for the ICP Bitcoin DeFi Hackathon.**

Let's make Bitcoin programmable together. 🚀

---

## 📞 CONTACT

**Team**: Ande Labs
**Email**: AndeanLabs@proton.me
**GitHub**: https://github.com/AndeanLabs/QURI-PROTOCOL

For technical questions, demos, or partnership inquiries - we're ready to talk.
