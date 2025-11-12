# Marketplace Canister

> **Phase:** 2B
> **Status:** 🚧 Planned
> **Language:** Rust
> **Dependencies:** ordinals-engine, brc20-engine, bitcoin-integration

## Overview

The Marketplace canister provides a decentralized trading platform for Bitcoin assets (Ordinals, Runes, BRC-20 tokens) on the Internet Computer. It implements order book management, escrow logic, fee distribution, and royalty enforcement.

## Features

- 📦 **Listings**: Fixed price and auction listings
- 💰 **Offers**: Make and accept offers
- 🔒 **Escrow**: Secure trustless escrow via ICP canisters
- 💸 **Fee Management**: Platform fees and creator royalties
- 📊 **Analytics**: Volume, floor price, and sales tracking
- ✅ **Verification**: Collection and inscription verification

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Frontend (Next.js)                  │
│  - Browse collections                            │
│  - View listings                                 │
│  - Buy/Sell interface                           │
│  - Make offers                                   │
└──────────────────┬──────────────────────────────┘
                   │ Candid API
┌──────────────────┴──────────────────────────────┐
│         Marketplace Canister (ICP)               │
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │  Order Book                            │     │
│  │  - Active listings                     │     │
│  │  - Pending offers                      │     │
│  │  - Auction bids                        │     │
│  └────────────────────────────────────────┘     │
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │  Escrow System                         │     │
│  │  - ckBTC deposits                      │     │
│  │  - Conditional releases                │     │
│  │  - Dispute resolution                  │     │
│  └────────────────────────────────────────┘     │
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │  Fee Distribution                      │     │
│  │  - Platform fees (2%)                  │     │
│  │  - Creator royalties (0-10%)           │     │
│  │  - Automatic distribution              │     │
│  └────────────────────────────────────────┘     │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴─────────────┐
        │                        │
┌───────┴──────┐       ┌─────────┴────────┐
│  Ordinals    │       │  Bitcoin         │
│  Engine      │       │  Integration     │
└──────────────┘       └──────────────────┘
```

## Trading Types

### Fixed Price Listings
User lists inscription for sale at fixed price in ckBTC.

```
Seller → List → Buyer sees → Buyer purchases → Instant settlement
```

### Auctions
Time-bound competitive bidding.

```
Seller → Create auction → Bidders compete → Auction ends → Winner pays
```

### Offers
Buyer makes offer on unlisted or listed item.

```
Buyer → Make offer → Seller reviews → Accept/Reject → Settlement
```

## File Structure

```
src/
├── lib.rs                 # Main entry point
├── order_book.rs          # Order management
├── listings.rs            # Listing creation and management
├── offers.rs              # Offer logic
├── auctions.rs            # Auction mechanisms
├── escrow.rs              # Escrow handling
├── fees.rs                # Fee calculation
├── royalties.rs           # Creator royalty logic
├── verification.rs        # Collection/item verification
└── state.rs               # Stable storage
```

## Data Models

### Listing
```rust
pub struct Listing {
    pub id: String,
    pub seller: Principal,
    pub inscription_id: String,
    pub listing_type: ListingType,
    pub price: u64,                    // In satoshis (ckBTC)
    pub status: ListingStatus,
    pub created_at: u64,
    pub expires_at: Option<u64>,
}

pub enum ListingType {
    FixedPrice,
    Auction { reserve_price: u64, end_time: u64 },
}

pub enum ListingStatus {
    Active,
    Sold,
    Cancelled,
    Expired,
}
```

### Offer
```rust
pub struct Offer {
    pub id: String,
    pub buyer: Principal,
    pub inscription_id: String,
    pub amount: u64,                   // In satoshis
    pub status: OfferStatus,
    pub created_at: u64,
    pub expires_at: u64,
}

pub enum OfferStatus {
    Pending,
    Accepted,
    Rejected,
    Expired,
}
```

### Trade
```rust
pub struct Trade {
    pub id: String,
    pub inscription_id: String,
    pub seller: Principal,
    pub buyer: Principal,
    pub price: u64,
    pub platform_fee: u64,
    pub creator_royalty: u64,
    pub timestamp: u64,
    pub block_height: u64,
}
```

## API Methods

### Listing Management

#### `create_listing`
```rust
#[update]
async fn create_listing(
    inscription_id: String,
    price: u64,
    listing_type: ListingType,
    expires_at: Option<u64>,
) -> Result<String, String>
```
Creates a new marketplace listing.

#### `cancel_listing`
```rust
#[update]
async fn cancel_listing(listing_id: String) -> Result<(), String>
```
Cancels an active listing.

#### `get_listing`
```rust
#[query]
fn get_listing(listing_id: String) -> Option<Listing>
```
Retrieves a listing by ID.

### Trading

#### `buy_now`
```rust
#[update]
async fn buy_now(listing_id: String) -> Result<String, String>
```
Purchases a fixed-price listing.

**Process:**
1. Verify buyer has sufficient ckBTC
2. Lock ckBTC in escrow
3. Transfer inscription to buyer
4. Distribute funds (seller, platform, creator)
5. Record trade

#### `make_offer`
```rust
#[update]
async fn make_offer(
    inscription_id: String,
    amount: u64,
    expires_at: u64,
) -> Result<String, String>
```
Makes an offer on an inscription.

#### `accept_offer`
```rust
#[update]
async fn accept_offer(offer_id: String) -> Result<String, String>
```
Seller accepts an offer.

### Auctions

#### `place_bid`
```rust
#[update]
async fn place_bid(auction_id: String, amount: u64) -> Result<(), String>
```
Places a bid on an auction.

#### `finalize_auction`
```rust
#[update]
async fn finalize_auction(auction_id: String) -> Result<String, String>
```
Finalizes auction and distributes funds.

### Analytics

#### `get_collection_stats`
```rust
#[query]
fn get_collection_stats(collection_id: String) -> CollectionStats
```
Returns floor price, volume, sales count.

```rust
pub struct CollectionStats {
    pub floor_price: Option<u64>,
    pub total_volume: u64,
    pub sales_count: u64,
    pub listed_count: u64,
    pub unique_owners: u64,
}
```

## Fee Structure

### Platform Fees
- **Standard:** 2% of sale price
- **Verified Collections:** 1.5%
- **Minimum:** 1,000 sats
- **Maximum:** 1,000,000 sats

### Creator Royalties
- **Configurable:** 0-10% per collection
- **Enforcement:** On-chain via canister logic
- **Distribution:** Automatic on each sale

### Example Calculation
```
Sale Price: 1,000,000 sats (0.01 BTC)
Platform Fee (2%): 20,000 sats
Creator Royalty (5%): 50,000 sats
Seller Receives: 930,000 sats
```

## Security Features

### Escrow Protection
- Funds locked until inscription transfer confirmed
- Dispute resolution via governance
- Automatic refunds for failed trades

### Verification System
- Collection verification badge
- Inscription authenticity check
- Scam/fake detection

### Anti-Rug Pull
- Creator royalty enforcement
- Transfer history tracking
- Suspicious activity monitoring

## Integration Example

```typescript
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from './marketplace.did.js';

// Initialize
const agent = new HttpAgent();
const marketplace = Actor.createActor(idlFactory, {
  agent,
  canisterId: 'marketplace-canister-id',
});

// Create listing
const listingId = await marketplace.create_listing(
  'inscription-id-123',
  1000000n, // 0.01 BTC
  { FixedPrice: null },
  null, // No expiry
);

// Buy inscription
const tradeId = await marketplace.buy_now(listingId);
```

## Future Enhancements

- [ ] Bulk listings
- [ ] Bundle sales (multiple items)
- [ ] Dutch auctions
- [ ] Trait-based offers
- [ ] Private sales
- [ ] Cross-collection bundles
- [ ] Lending/Renting (NFT-Fi)

## Performance Targets

| Metric | Target |
|--------|--------|
| Listing Creation | < 2s |
| Purchase Confirmation | < 3s |
| Query Response | < 100ms |
| Throughput | 1000+ tx/hour |
| Concurrent Users | 10,000+ |

## References

- [Magic Eden](https://magiceden.io/) - Leading marketplace
- [Unisat](https://unisat.io/) - Bitcoin NFT marketplace
- [ICP Canister SDK](https://internetcomputer.org/docs)

---

**Status:** Not yet implemented. See [PHASE2_ROADMAP.md](../../PHASE2_ROADMAP.md) for timeline.
