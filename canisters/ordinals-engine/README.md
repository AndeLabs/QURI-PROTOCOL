# Ordinals Engine Canister

> **Phase:** 2A
> **Status:** 🚧 Planned
> **Language:** Rust
> **Dependencies:** bitcoin-utils, quri-types

## Overview

The Ordinals Engine canister handles Bitcoin Ordinals (NFT inscriptions) on the Internet Computer. It provides functionality to create, read, and transfer Ordinal inscriptions by integrating with Bitcoin L1 through ICP's Chain Fusion technology.

## Features

- 📝 **Inscription Creation**: Create Ordinal inscriptions with various content types
- 🔍 **Inscription Reading**: Parse and retrieve inscription data from Bitcoin
- 👤 **Ownership Tracking**: Track inscription ownership via UTXO monitoring
- ✅ **Validation**: Verify inscription authenticity and format
- 💾 **Metadata Storage**: Store inscription metadata in stable memory

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Frontend (Next.js)                    │
│  - Inscription form                             │
│  - Content preview                              │
│  - Fee estimation                               │
└──────────────────┬──────────────────────────────┘
                   │ Candid API
┌──────────────────┴──────────────────────────────┐
│        Ordinals Engine Canister (ICP)           │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Public Methods                        │    │
│  │  - create_inscription()                │    │
│  │  - get_inscription()                   │    │
│  │  - get_inscriptions_by_owner()         │    │
│  │  - transfer_inscription()              │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  Core Logic                            │    │
│  │  - Inscription parser                  │    │
│  │  - Content type handler                │    │
│  │  - UTXO tracker                        │    │
│  │  - Validation engine                   │    │
│  └────────────────────────────────────────┘    │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │  State Management                      │    │
│  │  - Stable storage (ic-stable-structures)│   │
│  │  - Inscription registry                │    │
│  │  - Ownership index                     │    │
│  └────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────┘
                   │ Bitcoin RPC
┌──────────────────┴──────────────────────────────┐
│              Bitcoin Network                     │
│  - Reads inscriptions from witness data         │
│  - Tracks UTXOs for ownership                   │
│  - Broadcasts inscription transactions          │
└──────────────────────────────────────────────────┘
```

## Content Types Supported

| Type | Max Size | Format | Example |
|------|----------|--------|---------|
| Text | 400 KB | Plain text | "Hello Bitcoin" |
| JSON | 400 KB | JSON | `{"p":"brc-20",...}` |
| Image | 400 KB | PNG, JPEG, SVG, GIF | Binary data |
| HTML | 400 KB | HTML | `<html>...</html>` |
| JavaScript | 100 KB | JS | Interactive art |

## File Structure

```
src/
├── lib.rs                 # Main entry point, Candid exports
├── inscription.rs         # Inscription parsing logic
├── content.rs             # Content type handling
├── ownership.rs           # UTXO tracking for ownership
├── validation.rs          # Inscription validation
└── state.rs               # Stable storage management
```

## Data Models

### Inscription
```rust
pub struct Inscription {
    pub id: String,                    // Inscription ID (txid:vout)
    pub owner: String,                 // Bitcoin address
    pub content_type: ContentType,
    pub content: Vec<u8>,              // Raw content bytes
    pub content_length: u64,
    pub created_at: u64,               // Block height
    pub genesis_height: u64,
    pub genesis_fee: u64,
}
```

### ContentType
```rust
pub enum ContentType {
    Text,
    Json,
    Image { mime_type: String },
    Html,
    JavaScript,
    Other { mime_type: String },
}
```

## API Methods

### `create_inscription`
```rust
#[update]
async fn create_inscription(
    content: Vec<u8>,
    content_type: String,
    recipient: Option<String>,
) -> Result<String, String>
```
Creates a new Ordinal inscription.

**Parameters:**
- `content`: The content to inscribe (max 400 KB)
- `content_type`: MIME type (e.g., "text/plain", "image/png")
- `recipient`: Optional Bitcoin address to receive the inscription

**Returns:** Inscription ID (txid:vout)

### `get_inscription`
```rust
#[query]
fn get_inscription(inscription_id: String) -> Option<Inscription>
```
Retrieves an inscription by ID.

### `get_inscriptions_by_owner`
```rust
#[query]
fn get_inscriptions_by_owner(
    owner: String,
    offset: u64,
    limit: u64,
) -> Vec<Inscription>
```
Gets all inscriptions owned by a Bitcoin address.

## Development

### Prerequisites
- Rust 1.82+
- IC SDK (dfx)
- Bitcoin testnet node access

### Build
```bash
cargo build --target wasm32-unknown-unknown --release -p ordinals-engine
```

### Test
```bash
cargo test -p ordinals-engine
```

### Deploy
```bash
dfx deploy ordinals-engine --network ic
```

## Security Considerations

1. **Content Validation**: All content is validated before inscription
2. **Size Limits**: Enforced to prevent DoS attacks
3. **Fee Estimation**: Accurate fee calculation to prevent stuck transactions
4. **UTXO Tracking**: Real-time monitoring to ensure ownership accuracy

## Future Enhancements

- [ ] Batch inscriptions
- [ ] Recursive inscriptions
- [ ] Inscription collections
- [ ] Metadata standards (e.g., Ordinals JSON)
- [ ] Cross-chain bridges

## References

- [Ordinals Theory](https://docs.ordinals.com/)
- [BIP 340: Schnorr Signatures](https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki)
- [BIP 341: Taproot](https://github.com/bitcoin/bips/blob/master/bip-0341.mediawiki)
- [ICP Chain Fusion](https://internetcomputer.org/chainfusion)

---

**Status:** Not yet implemented. See [PHASE2_ROADMAP.md](../../PHASE2_ROADMAP.md) for timeline.
