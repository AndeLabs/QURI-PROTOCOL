# QURI Protocol - ICP Bitcoin DeFi Hackathon Features

## Overview

QURI Protocol is a next-generation Bitcoin Runes platform built on the Internet Computer Protocol (ICP). This document details the innovative features implemented for the ICP Bitcoin DeFi Hackathon.

## Table of Contents

1. [Sign In With Bitcoin (SIWB)](#1-sign-in-with-bitcoin-siwb)
2. [Dead Man's Switch (DMS)](#2-dead-mans-switch-dms)
3. [vetKeys Encrypted Metadata](#3-vetkeys-encrypted-metadata)
4. [Technical Architecture](#4-technical-architecture)

---

## 1. Sign In With Bitcoin (SIWB)

### Description
SIWB enables users to authenticate using their Bitcoin wallets (UniSat, Xverse) alongside Internet Identity. This creates a seamless dual-chain authentication experience.

### How It Works
1. User connects their Bitcoin wallet
2. Signs a message proving ownership
3. ICP canister verifies the signature
4. Session is established with both ICP and Bitcoin identity

### Technical Implementation

**Backend (Rust):**
```rust
// Signature verification using Schnorr
pub async fn verify_siwb_signature(
    address: String,
    message: String,
    signature: String,
) -> Result<bool, String>
```

**Frontend (React):**
```typescript
// useDualAuth hook manages both identities
const { isConnected, principal, btcAddress, signWithBitcoin } = useDualAuth();
```

### Key Files
- `backend/canisters/identity-manager/src/siwb.rs`
- `frontend/lib/auth/useDualAuth.ts`
- `frontend/components/wallet/ConnectWalletModal.tsx`

### Use Cases
- Prove Bitcoin ownership for Rune operations
- Cross-chain identity verification
- Unified wallet management

---

## 2. Dead Man's Switch (DMS)

### Description
A crypto-native inheritance solution that automatically transfers Runes to a beneficiary if the owner doesn't check in within a specified timeout period.

### How It Works
1. User creates a switch with:
   - Beneficiary Bitcoin address
   - Rune ID and amount
   - Timeout period (7-365 days)
   - Optional message
2. User must periodically "check in" to reset the timer
3. If timeout expires, Runes are automatically transferred

### Technical Implementation

**Backend (Rust):**
```rust
pub struct DeadManSwitch {
    pub id: u64,
    pub owner: Principal,
    pub beneficiary: String,      // Bitcoin address
    pub rune_id: String,
    pub amount: u128,
    pub last_checkin: u64,        // Nanoseconds
    pub timeout_ns: u64,
    pub triggered: bool,
    pub message: Option<String>,
}

// Timer-based automatic processing
#[ic_cdk::update]
pub fn process_dead_man_switches() -> Result<String, String>
```

**Frontend Hook:**
```typescript
const {
  mySwitches,
  createSwitch,
  checkin,
  cancelSwitch,
  stats,
} = useDeadManSwitch();
```

### Key Files
- `backend/canisters/rune-engine/src/dead_man_switch.rs`
- `frontend/hooks/useDeadManSwitch.ts`
- `frontend/components/deadman/DeadManSwitchPanel.tsx`

### Use Cases
- Crypto inheritance planning
- Emergency fund distribution
- Asset protection for travelers
- Business continuity planning

### Security Features
- Bitcoin address validation (P2PKH, P2SH, P2WPKH, P2TR)
- RBAC permission control
- Canister timer-based automatic execution

---

## 3. vetKeys Encrypted Metadata

### Description
Uses ICP's vetKeys (Verifiable Encrypted Threshold Keys) for Identity-Based Encryption (IBE) of Rune metadata with optional time-locked reveals.

### How It Works
1. User encrypts metadata using vetKeys public key
2. Data stored on-chain in encrypted form
3. Only owner (or anyone after reveal time) can decrypt
4. Decryption key derived through threshold cryptography

### Technical Implementation

**Backend (Rust):**
```rust
pub struct EncryptedRuneMetadata {
    pub rune_id: String,
    pub encrypted_data: Vec<u8>,
    pub nonce: Vec<u8>,
    pub reveal_time: Option<u64>,   // Optional time-lock
    pub owner: Principal,
    pub created_at: u64,
}

// vetKD management canister calls
pub async fn get_public_key() -> Result<Vec<u8>, EngineError>
pub async fn get_decryption_key(
    rune_id: &str,
    transport_public_key: Vec<u8>
) -> Result<Vec<u8>, EngineError>
```

**Frontend Hook:**
```typescript
const {
  encrypt,
  decrypt,
  storeMetadata,
  decryptMetadata,
  getRevealStatus,
} = useEncryptedMetadata();
```

### Key Files
- `backend/canisters/rune-engine/src/encrypted_metadata.rs`
- `frontend/hooks/useEncryptedMetadata.ts`
- `frontend/components/encryption/EncryptedMetadataPanel.tsx`

### Use Cases
- Time-locked NFT reveals
- Private sale metadata
- Embargoed content distribution
- Confidential Rune properties
- Fair launch mechanisms

### Security Features
- Threshold cryptography (no single point of failure)
- Time-based access control
- Owner-only decryption by default
- Secure key transport protocol

---

## 4. Technical Architecture

### Canister Structure

```
QURI Protocol
├── rune-engine (Main canister)
│   ├── Virtual Rune creation
│   ├── Dead Man's Switch
│   ├── Encrypted Metadata
│   └── RBAC system
├── registry (Indexer)
│   ├── Rune indexing
│   ├── Hiro API sync
│   └── Search/query
├── bitcoin-integration
│   ├── UTXO management
│   ├── Schnorr signing
│   └── Transaction building
└── identity-manager
    ├── Session management
    └── SIWB verification
```

### ICP Features Used

| Feature | Usage |
|---------|-------|
| vetKeys | Encrypted metadata with IBE |
| Timers | DMS automatic execution |
| ECDSA/Schnorr | Bitcoin transaction signing |
| HTTPS Outcalls | Hiro API integration |
| Stable Memory | Persistent data storage |

### Frontend Stack

- **Framework:** Next.js 14 (App Router)
- **State:** Zustand + React Query
- **Styling:** Tailwind CSS (Museum theme)
- **ICP:** @dfinity/agent, @dfinity/auth-client
- **Bitcoin:** @scure/btc-signer

### API Endpoints

#### Dead Man's Switch
```candid
create_dead_man_switch : (CreateDeadManSwitchParams) -> (Result<nat64>);
dms_checkin : (nat64) -> (Result);
cancel_dead_man_switch : (nat64) -> (Result);
get_my_dead_man_switches : () -> (vec DeadManSwitchInfo) query;
get_dead_man_switch_stats : () -> (DeadManSwitchStats) query;
```

#### Encrypted Metadata
```candid
store_encrypted_metadata : (StoreEncryptedMetadataParams) -> (Result);
get_encrypted_metadata : (text) -> (opt EncryptedRuneMetadata) query;
get_my_encrypted_metadata : () -> (vec EncryptedRuneMetadata) query;
get_vetkd_public_key : () -> (Result<vec nat8>);
get_encrypted_decryption_key : (text, vec nat8) -> (Result<vec nat8>);
can_decrypt_metadata : (text) -> (Result<bool>) query;
```

---

## Getting Started

### Prerequisites
- dfx CLI
- Node.js 18+
- Rust toolchain

### Local Development

```bash
# Start local ICP replica
dfx start --background

# Deploy canisters
dfx deploy

# Start frontend
cd frontend && npm run dev
```

### Testing Features

1. **SIWB:** Connect both wallets in the UI
2. **DMS:** Navigate to Dashboard > Dead Man's Switch
3. **vetKeys:** Navigate to Dashboard > Encrypted Metadata

---

## Demo Video

[Link to demo video will be added]

---

## Team

**Ande Labs**
- Building the future of Bitcoin DeFi on ICP

---

## License

MIT License - See LICENSE file for details

---

## Links

- [QURI Protocol](https://quri.network)
- [GitHub Repository](https://github.com/AndeanLabs/QURI-PROTOCOL)
- [ICP Developer Docs](https://internetcomputer.org/docs)
