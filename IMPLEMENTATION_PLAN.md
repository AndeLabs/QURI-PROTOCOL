# Implementation Plan - QURI Protocol Hackathon

## Sprint 1: Core Functionality (Days 1-5)

### Day 1-2: ckBTC Integration ⚡ CRITICAL
**Files to create/modify**:
- `canisters/bitcoin-integration/src/ckbtc.rs` (complete implementation)
- `canisters/rune-engine/src/payments.rs` (new)

**Features**:
```rust
// ckbtc.rs
pub async fn deposit_btc(principal: Principal) -> Result<String, String> {
    // 1. Get BTC address for user
    // 2. Return address for deposit
}

pub async fn get_ckbtc_balance(principal: Principal) -> Result<u64, String> {
    // Query ckBTC ledger canister
}

pub async fn charge_etching_fee(principal: Principal, amount: u64) -> Result<(), String> {
    // Transfer ckBTC from user to canister
}
```

**Integration Points**:
- ckBTC Ledger: `mxzaz-hqaaa-aaaar-qaada-cai` (mainnet)
- BTC Minter: `mqygn-kiaaa-aaaar-qaadq-cai` (mainnet)

### Day 2-3: UTXO Selection & Broadcasting
**Files to modify**:
- `canisters/bitcoin-integration/src/utxo.rs`
- `canisters/bitcoin-integration/src/bitcoin_api.rs`

**Features**:
```rust
// utxo.rs
pub async fn select_utxos_for_etching(
    amount_needed: u64,
    fee_rate: u64
) -> Result<Vec<Utxo>, String> {
    // 1. Get all UTXOs
    // 2. Sort by value (largest first for efficiency)
    // 3. Select until amount_needed + fees covered
}

// bitcoin_api.rs
pub async fn broadcast_transaction(tx: Transaction) -> Result<String, String> {
    // Use ICP's bitcoin_send_transaction
    // Return txid
}

pub async fn wait_for_confirmations(txid: String, confs: u32) -> Result<(), String> {
    // Poll until N confirmations
}
```

### Day 3-4: Runes Indexer
**Files to create**:
- `canisters/registry/src/indexer.rs` (new)
- `canisters/registry/src/parser.rs` (new)

**Architecture**:
```rust
// indexer.rs
pub struct RuneIndexer {
    runes: StableBTreeMap<RuneId, IndexedRune>,
    last_indexed_block: u64,
}

pub async fn index_blocks(from: u64, to: u64) -> Result<u32, String> {
    // 1. Fetch blocks from Bitcoin
    // 2. Filter OP_RETURN transactions
    // 3. Parse runestones
    // 4. Store in stable memory
}

pub fn get_rune(id: RuneId) -> Option<IndexedRune> {
    // Query indexed rune
}

pub fn list_runes(offset: u64, limit: u64) -> Vec<IndexedRune> {
    // Paginated list
}
```

**Data Model**:
```rust
#[derive(CandidType, Deserialize, Clone)]
pub struct IndexedRune {
    pub id: RuneId,
    pub name: String,
    pub symbol: String,
    pub total_supply: u128,
    pub divisibility: u8,
    pub block_height: u64,
    pub txid: String,
    pub timestamp: u64,
    pub creator: String, // BTC address
}
```

### Day 4-5: End-to-End Etching Flow
**File to create**:
- `canisters/rune-engine/src/etching_flow.rs` (new)

**Complete Flow**:
```rust
pub async fn etch_rune(
    caller: Principal,
    etching: RuneEtching,
) -> Result<String, String> {
    // 1. Validate etching params
    // 2. Check ckBTC balance
    // 3. Charge fee
    // 4. Get UTXOs
    // 5. Build transaction
    // 6. Sign with Schnorr
    // 7. Broadcast
    // 8. Wait for confirmations
    // 9. Index the new rune
    // 10. Return txid
}
```

---

## Sprint 2: Differentiation Features (Days 6-8)

### Day 6: Bonding Curve
**Files to create**:
- `canisters/rune-engine/src/bonding_curve.rs` (new)
- `canisters/rune-engine/src/trading.rs` (new)

**Linear Bonding Curve**:
```rust
pub struct BondingCurve {
    pub base_price: u64,      // Starting price in sats
    pub slope: u64,           // Price increase per token
    pub tokens_sold: u128,
}

impl BondingCurve {
    pub fn get_buy_price(&self, amount: u128) -> u64 {
        // price = base + (sold + amount/2) * slope
        // Uses average price over the range
    }

    pub fn get_sell_price(&self, amount: u128) -> u64 {
        // Slightly lower than buy (small spread for canister)
    }

    pub fn execute_buy(&mut self, amount: u128, payment: u64) -> Result<(), String> {
        let required = self.get_buy_price(amount);
        if payment < required {
            return Err("Insufficient payment");
        }
        self.tokens_sold += amount;
        Ok(())
    }
}
```

### Day 7: Discovery & Search
**Files to modify**:
- `canisters/registry/src/lib.rs`

**Features**:
```rust
pub fn search_runes(query: String) -> Vec<IndexedRune> {
    // Search by name or symbol
}

pub fn get_trending_runes(limit: u64) -> Vec<IndexedRune> {
    // Sort by recent activity
}

pub fn get_rune_stats(id: RuneId) -> Option<RuneStats> {
    // Supply, volume, holders, etc.
}
```

### Day 8: Integration Testing
**Files to create**:
- `tests/integration_test.rs`

**Test Scenarios**:
1. Full etching flow on testnet
2. ckBTC deposit → pay fee → etch → index
3. Bonding curve buy/sell
4. Search and discovery

---

## Sprint 3: Frontend & Demo (Days 9-12)

### Day 9-10: Minimal Frontend
**Tech Stack**:
- React + Vite
- TailwindCSS
- @dfinity/agent (ICP connection)
- Plug Wallet

**Pages**:
1. **Home** (`/`)
   - Hero section
   - Stats (total Runes, volume)
   - CTA: Launch Rune

2. **Launch** (`/launch`)
   - Form: name, symbol, supply, divisibility
   - ckBTC balance display
   - Etching button

3. **Explorer** (`/explorer`)
   - List of all Runes
   - Search bar
   - Filters (new, trending)

4. **Rune Detail** (`/rune/:id`)
   - Metadata
   - Bonding curve chart
   - Buy/sell interface

### Day 11: Video Demo Script
**Storyboard** (3 minutes):

**0:00-0:30 - Problem**
- Screen record: Visit competitor launchpad
- Highlight: 5% fee, custodial wallet required
- Text overlay: "Current Runes launchpads are broken"

**0:30-1:00 - Solution**
- Show QURI landing page
- Highlight: Zero fees, Self-custody, Instant
- Text: "QURI: The future of Runes"

**1:00-2:00 - Live Demo**
- Connect Plug wallet
- Show ckBTC balance
- Fill etching form
- Click "Launch Rune"
- Show transaction progress
- Celebrate: Rune created!
- Navigate to explorer, see new Rune

**2:00-2:30 - Tech Deep Dive**
- Architecture diagram animation
- Highlight: Threshold Schnorr, ckBTC, Indexer
- Code snippet: BIP-341 sighash

**2:30-3:00 - Vision**
- Roadmap timeline
- Celestia rollup concept
- Final CTA: "Join the Runes revolution"

### Day 12: Polish & Submission
**Checklist**:
- [ ] Code cleanup (remove all TODO comments)
- [ ] README with screenshots
- [ ] Architecture diagram (draw.io)
- [ ] Deploy to ICP mainnet
- [ ] Fund demo wallet with testnet BTC/ckBTC
- [ ] Record video (4K, professional audio)
- [ ] Upload to YouTube (unlisted)
- [ ] Submit on Encode platform

---

## Technical Decisions

### Why ckBTC over native BTC?
- **Speed**: 1-2 sec vs 10 min
- **Cost**: $0.01 vs $1-5
- **UX**: No waiting for confirmations
- **Compatibility**: Native ICP integration

### Why linear bonding curve?
- **Simplicity**: Easy to understand/audit
- **Predictability**: Users know exact price
- **Gas efficiency**: Simple math = lower cycles cost

### Why monorepo?
- **Code sharing**: Types, utils reused
- **Atomic commits**: Changes across canisters
- **Testing**: Integration tests easier

---

## Code Style Guidelines (No More Educational Comments)

### Before (Too verbose):
```rust
// 🎓 LECCIÓN: Este código implementa BIP-341...
// ¿Qué es BIP-341? Es un estándar...
// ¿Por qué lo usamos? Porque...
pub fn compute_sighash() { }
```

### After (Professional):
```rust
/// Computes BIP-341 Taproot sighash for key-path spending
pub fn compute_sighash() { }
```

**Rules**:
- Function docs: 1-2 lines max
- Inline comments: Only for non-obvious logic
- Focus: Code readability over explanation

---

## Deployment Strategy

### Testnet First
```bash
# Deploy to local replica
dfx deploy --network local

# Test all flows
npm run test:integration

# Deploy to IC testnet
dfx deploy --network ic
```

### Mainnet (Demo Day)
```bash
# Deploy production
dfx deploy --network ic --mode production

# Verify canisters
dfx canister --network ic status rune-engine
```

---

## Risk Mitigation

### If Bitcoin testnet is slow:
- Use Bitcoin regtest (local)
- Pre-mine blocks for demo

### If ckBTC integration fails:
- Mock ledger for demo
- Show architecture diagram

### If indexer not ready:
- Hardcode 5-10 sample Runes
- Explain "live indexing coming soon"

### If frontend not polished:
- Focus on core flow only
- Use demo video instead of live demo

---

## Success Metrics

### Must Have (P0):
- ✅ Working ckBTC integration
- ✅ Complete etching flow (testnet)
- ✅ Transaction signed with threshold Schnorr
- ✅ Basic frontend

### Should Have (P1):
- ✅ Runes indexer
- ✅ Bonding curve
- ✅ Professional video

### Nice to Have (P2):
- ⚪ Advanced bonding curves
- ⚪ Multi-signature
- ⚪ Governance

---

## Next Steps (Right Now)

1. **ckBTC Integration** - Start immediately
2. **Clean up code** - Remove educational comments
3. **UTXO selection** - Complete implementation
4. **Indexer skeleton** - Basic structure

Let's execute! 🚀
