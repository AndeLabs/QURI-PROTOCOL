# 🎨 Ordinals Engine - Detailed Technical Specification

> **Phase:** 2A
> **Component:** ordinals-engine canister
> **Language:** Rust
> **Complexity:** High
> **Est. Development Time:** 8-10 weeks

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [API Specification](#api-specification)
5. [Bitcoin Integration](#bitcoin-integration)
6. [State Management](#state-management)
7. [Security Considerations](#security-considerations)
8. [Performance Targets](#performance-targets)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Guide](#implementation-guide)

---

## 🎯 Overview

### What is the Ordinals Engine?

The Ordinals Engine is an ICP canister that enables users to create, read, and manage Bitcoin Ordinals (NFT inscriptions) through a simple API. It leverages ICP's Chain Fusion technology to interact directly with Bitcoin L1 without bridges.

### Key Responsibilities

1. **Inscription Creation**: Build and submit inscription transactions to Bitcoin
2. **Content Validation**: Ensure content meets size and format requirements
3. **Ownership Tracking**: Monitor UTXO transfers to track inscription ownership
4. **Metadata Storage**: Store inscription metadata in stable memory
5. **Query Interface**: Provide fast access to inscription data

### Technology Stack

```rust
// Core dependencies
ic-cdk = "0.14"              // ICP Canister Development Kit
ic-stable-structures = "0.6" // State persistence
candid = "0.10"              // Interface definition
serde = { version = "1.0", features = ["derive"] }
bitcoin = "0.31"             // Bitcoin primitives
sha2 = "0.10"                // Hashing

// Custom dependencies
quri-types = { path = "../../libs/quri-types" }
bitcoin-utils = { path = "../../libs/bitcoin-utils" }
ordinals-utils = { path = "../../libs/ordinals-utils" }  // NEW
```

---

## 🏗️ Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Ordinals Engine Canister                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Public API Layer (Candid)                  │    │
│  │  - create_inscription()                                 │    │
│  │  - get_inscription()                                    │    │
│  │  - get_inscriptions_by_owner()                          │    │
│  │  - transfer_inscription()                               │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │           Business Logic Layer                          │    │
│  │                                                          │    │
│  │  ┌─────────────────┐  ┌─────────────────┐            │    │
│  │  │  Inscription     │  │  Content        │            │    │
│  │  │  Parser          │  │  Validator      │            │    │
│  │  └─────────────────┘  └─────────────────┘            │    │
│  │                                                          │    │
│  │  ┌─────────────────┐  ┌─────────────────┐            │    │
│  │  │  Ownership      │  │  Fee            │            │    │
│  │  │  Tracker        │  │  Estimator      │            │    │
│  │  └─────────────────┘  └─────────────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Data Access Layer                          │    │
│  │                                                          │    │
│  │  ┌─────────────────┐  ┌─────────────────┐            │    │
│  │  │  Inscription     │  │  Owner          │            │    │
│  │  │  Registry        │  │  Index          │            │    │
│  │  │  (BTreeMap)      │  │  (BTreeMap)     │            │    │
│  │  └─────────────────┘  └─────────────────┘            │    │
│  │                                                          │    │
│  │  ┌─────────────────┐  ┌─────────────────┐            │    │
│  │  │  Content Store  │  │  Metadata       │            │    │
│  │  │  (IPFS refs)    │  │  Cache          │            │    │
│  │  └─────────────────┘  └─────────────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         Integration Layer                               │    │
│  │                                                          │    │
│  │  ┌─────────────────┐  ┌─────────────────┐            │    │
│  │  │  Bitcoin RPC    │  │  ckBTC          │            │    │
│  │  │  Client         │  │  Ledger         │            │    │
│  │  └─────────────────┘  └─────────────────┘            │    │
│  │                                                          │    │
│  │  ┌─────────────────┐  ┌─────────────────┐            │    │
│  │  │  IPFS/Arweave  │  │  Bitcoin        │            │    │
│  │  │  Storage        │  │  Canister       │            │    │
│  │  └─────────────────┘  └─────────────────┘            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Bitcoin Network │
                    └──────────────────┘
```

### Component Interaction Flow

```
User Request
    │
    ├──▶ create_inscription(content, content_type)
    │
    ▼
Validation Layer
    │
    ├──▶ Validate content size (<400KB)
    ├──▶ Validate content type (MIME)
    ├──▶ Check rate limits
    ├──▶ Verify caller identity
    │
    ▼
Content Processing
    │
    ├──▶ Parse content
    ├──▶ Generate content hash
    ├──▶ Upload to IPFS (if large)
    ├──▶ Create inscription metadata
    │
    ▼
Transaction Building
    │
    ├──▶ Fetch UTXOs (via Bitcoin Integration)
    ├──▶ Select UTXO for inscription
    ├──▶ Build commit transaction
    ├──▶ Build reveal transaction
    ├──▶ Estimate fees
    │
    ▼
Transaction Signing
    │
    ├──▶ Request signature (threshold ECDSA)
    ├──▶ Sign commit tx
    ├──▶ Sign reveal tx
    │
    ▼
Transaction Broadcasting
    │
    ├──▶ Broadcast commit tx
    ├──▶ Wait for confirmation (1 block)
    ├──▶ Broadcast reveal tx
    │
    ▼
State Update
    │
    ├──▶ Store inscription in registry
    ├──▶ Update owner index
    ├──▶ Emit event
    │
    ▼
Return Result
    └──▶ Return inscription ID to user
```

---

## 📦 Data Models

### Core Structs

```rust
use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

/// Unique identifier for an inscription
/// Format: "txid:vout" (e.g., "abc123...def:0")
pub type InscriptionId = String;

/// Bitcoin address (P2TR for Taproot)
pub type BitcoinAddress = String;

/// UNIX timestamp in nanoseconds
pub type Timestamp = u64;

/// Block height on Bitcoin
pub type BlockHeight = u64;

/// Satoshis (smallest Bitcoin unit)
pub type Satoshis = u64;
```

### Inscription Structure

```rust
/// Complete inscription data stored in canister
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Inscription {
    /// Unique ID (txid:vout)
    pub id: InscriptionId,

    /// Current owner's Bitcoin address
    pub owner: BitcoinAddress,

    /// Creator's Principal (ICP identity)
    pub creator: Principal,

    /// Content type (MIME type)
    pub content_type: ContentType,

    /// Content data or reference
    pub content: ContentStorage,

    /// Size of content in bytes
    pub content_length: u64,

    /// SHA-256 hash of content
    pub content_hash: String,

    /// Bitcoin block height when inscribed
    pub genesis_height: BlockHeight,

    /// Transaction fee paid (in sats)
    pub genesis_fee: Satoshis,

    /// Inscription number (global counter)
    pub inscription_number: u64,

    /// Creation timestamp
    pub created_at: Timestamp,

    /// Last update timestamp
    pub updated_at: Timestamp,

    /// Optional metadata
    pub metadata: Option<InscriptionMetadata>,
}
```

### Content Type Enum

```rust
/// Supported content types for inscriptions
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum ContentType {
    /// Plain text
    Text,

    /// JSON data
    Json,

    /// Image with specific MIME type
    Image {
        mime_type: String,  // "image/png", "image/jpeg", "image/svg+xml", "image/gif"
    },

    /// HTML content
    Html,

    /// JavaScript code
    JavaScript,

    /// CSS stylesheet
    Css,

    /// Audio file
    Audio {
        mime_type: String,  // "audio/mp3", "audio/wav"
    },

    /// Video file
    Video {
        mime_type: String,  // "video/mp4", "video/webm"
    },

    /// 3D model
    Model3D {
        mime_type: String,  // "model/gltf+json", "model/gltf-binary"
    },

    /// Generic binary data
    Binary {
        mime_type: String,
    },
}

impl ContentType {
    /// Parse from MIME type string
    pub fn from_mime_type(mime: &str) -> Result<Self, String> {
        match mime {
            "text/plain" => Ok(ContentType::Text),
            "application/json" => Ok(ContentType::Json),
            "text/html" => Ok(ContentType::Html),
            "text/javascript" | "application/javascript" => Ok(ContentType::JavaScript),
            "text/css" => Ok(ContentType::Css),
            _ if mime.starts_with("image/") => Ok(ContentType::Image {
                mime_type: mime.to_string(),
            }),
            _ if mime.starts_with("audio/") => Ok(ContentType::Audio {
                mime_type: mime.to_string(),
            }),
            _ if mime.starts_with("video/") => Ok(ContentType::Video {
                mime_type: mime.to_string(),
            }),
            _ if mime.starts_with("model/") => Ok(ContentType::Model3D {
                mime_type: mime.to_string(),
            }),
            _ => Ok(ContentType::Binary {
                mime_type: mime.to_string(),
            }),
        }
    }

    /// Convert to MIME type string
    pub fn to_mime_type(&self) -> String {
        match self {
            ContentType::Text => "text/plain".to_string(),
            ContentType::Json => "application/json".to_string(),
            ContentType::Html => "text/html".to_string(),
            ContentType::JavaScript => "application/javascript".to_string(),
            ContentType::Css => "text/css".to_string(),
            ContentType::Image { mime_type } => mime_type.clone(),
            ContentType::Audio { mime_type } => mime_type.clone(),
            ContentType::Video { mime_type } => mime_type.clone(),
            ContentType::Model3D { mime_type } => mime_type.clone(),
            ContentType::Binary { mime_type } => mime_type.clone(),
        }
    }
}
```

### Content Storage

```rust
/// How inscription content is stored
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum ContentStorage {
    /// Stored directly in canister (for small content <100KB)
    Inline {
        data: Vec<u8>,
    },

    /// Stored on IPFS with CID reference
    IPFS {
        cid: String,  // Content ID on IPFS
        gateway: String,  // Gateway URL
    },

    /// Stored on Arweave with transaction ID
    Arweave {
        tx_id: String,  // Arweave transaction ID
    },

    /// On-chain Bitcoin (parsed from witness data)
    OnChain {
        txid: String,
        witness_index: u32,
    },
}
```

### Inscription Metadata

```rust
/// Optional metadata for inscriptions
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct InscriptionMetadata {
    /// Collection name (if part of collection)
    pub collection: Option<String>,

    /// Traits/attributes (for NFTs)
    pub traits: Option<Vec<Trait>>,

    /// Description
    pub description: Option<String>,

    /// External URL
    pub external_url: Option<String>,

    /// Parent inscription (for child inscriptions)
    pub parent: Option<InscriptionId>,

    /// Delegate inscription (for delegation)
    pub delegate: Option<InscriptionId>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Trait {
    pub trait_type: String,
    pub value: String,
}
```

### Inscription Request

```rust
/// Request to create a new inscription
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateInscriptionRequest {
    /// Content to inscribe
    pub content: Vec<u8>,

    /// Content type (MIME)
    pub content_type: String,

    /// Optional: specific Bitcoin address to receive inscription
    /// If None, creates new address controlled by canister
    pub recipient: Option<BitcoinAddress>,

    /// Optional: parent inscription for child inscriptions
    pub parent: Option<InscriptionId>,

    /// Optional: metadata
    pub metadata: Option<InscriptionMetadata>,

    /// Fee rate (sats/vbyte)
    pub fee_rate: Option<u64>,
}
```

### Inscription Response

```rust
/// Response after creating inscription
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateInscriptionResponse {
    /// Inscription ID (will be available after reveal tx confirms)
    pub inscription_id: Option<InscriptionId>,

    /// Process ID for tracking status
    pub process_id: String,

    /// Commit transaction ID
    pub commit_txid: String,

    /// Estimated reveal transaction ID
    pub reveal_txid_estimate: Option<String>,

    /// Total fee paid (in sats)
    pub total_fee: Satoshis,

    /// Expected confirmation time (in seconds)
    pub estimated_confirmation: u64,
}
```

---

## 🔌 API Specification

### Candid Interface Definition

```candid
// ordinals-engine.did

type InscriptionId = text;
type BitcoinAddress = text;
type Satoshis = nat64;
type BlockHeight = nat64;
type Timestamp = nat64;

type ContentType = variant {
    Text;
    Json;
    Image : record { mime_type : text };
    Html;
    JavaScript;
    Css;
    Audio : record { mime_type : text };
    Video : record { mime_type : text };
    Model3D : record { mime_type : text };
    Binary : record { mime_type : text };
};

type ContentStorage = variant {
    Inline : record { data : vec nat8 };
    IPFS : record { cid : text; gateway : text };
    Arweave : record { tx_id : text };
    OnChain : record { txid : text; witness_index : nat32 };
};

type Trait = record {
    trait_type : text;
    value : text;
};

type InscriptionMetadata = record {
    collection : opt text;
    traits : opt vec Trait;
    description : opt text;
    external_url : opt text;
    parent : opt InscriptionId;
    delegate : opt InscriptionId;
};

type Inscription = record {
    id : InscriptionId;
    owner : BitcoinAddress;
    creator : principal;
    content_type : ContentType;
    content : ContentStorage;
    content_length : nat64;
    content_hash : text;
    genesis_height : BlockHeight;
    genesis_fee : Satoshis;
    inscription_number : nat64;
    created_at : Timestamp;
    updated_at : Timestamp;
    metadata : opt InscriptionMetadata;
};

type CreateInscriptionRequest = record {
    content : vec nat8;
    content_type : text;
    recipient : opt BitcoinAddress;
    parent : opt InscriptionId;
    metadata : opt InscriptionMetadata;
    fee_rate : opt nat64;
};

type CreateInscriptionResponse = record {
    inscription_id : opt InscriptionId;
    process_id : text;
    commit_txid : text;
    reveal_txid_estimate : opt text;
    total_fee : Satoshis;
    estimated_confirmation : nat64;
};

type InscriptionError = variant {
    InvalidContent : text;
    ContentTooLarge : record { size : nat64; max : nat64 };
    InvalidContentType : text;
    InsufficientFunds : record { required : nat64; available : nat64 };
    RateLimitExceeded : text;
    BitcoinError : text;
    InternalError : text;
};

type Result_Inscription = variant {
    Ok : Inscription;
    Err : InscriptionError;
};

type Result_CreateResponse = variant {
    Ok : CreateInscriptionResponse;
    Err : InscriptionError;
};

service : {
    // Create a new inscription
    "create_inscription" : (CreateInscriptionRequest) -> (Result_CreateResponse);

    // Get inscription by ID
    "get_inscription" : (InscriptionId) -> (opt Inscription) query;

    // Get inscriptions by owner
    "get_inscriptions_by_owner" : (BitcoinAddress, nat64, nat64) -> (vec Inscription) query;

    // Get inscriptions by creator
    "get_inscriptions_by_creator" : (principal, nat64, nat64) -> (vec Inscription) query;

    // Get inscription count
    "get_inscription_count" : () -> (nat64) query;

    // Transfer inscription to new owner
    "transfer_inscription" : (InscriptionId, BitcoinAddress) -> (Result_Inscription);

    // Get process status
    "get_process_status" : (text) -> (opt text) query;

    // Admin: Configure canister
    "configure" : (record {
        max_content_size : opt nat64;
        default_fee_rate : opt nat64;
        enable_ipfs : opt bool;
    }) -> ();
}
```

### Rust Method Implementations

#### 1. create_inscription

```rust
#[update]
async fn create_inscription(
    request: CreateInscriptionRequest,
) -> Result<CreateInscriptionResponse, InscriptionError> {
    // 1. Validate caller
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err(InscriptionError::InvalidContent(
            "Anonymous principal cannot create inscriptions".into(),
        ));
    }

    // 2. Validate content
    validate_content(&request.content, &request.content_type)?;

    // 3. Check rate limits
    check_rate_limit(caller)?;

    // 4. Parse content type
    let content_type = ContentType::from_mime_type(&request.content_type)
        .map_err(|e| InscriptionError::InvalidContentType(e))?;

    // 5. Calculate content hash
    let content_hash = calculate_sha256(&request.content);

    // 6. Determine storage method
    let content_storage = if request.content.len() < 100_000 {
        ContentStorage::Inline {
            data: request.content.clone(),
        }
    } else {
        // Upload to IPFS
        let cid = upload_to_ipfs(&request.content).await?;
        ContentStorage::IPFS {
            cid,
            gateway: "https://ipfs.io/ipfs/".to_string(),
        }
    };

    // 7. Build inscription transaction
    let (commit_tx, reveal_tx) = build_inscription_transactions(
        &request.content,
        &content_type,
        request.recipient.as_deref(),
        request.fee_rate.unwrap_or(DEFAULT_FEE_RATE),
    ).await?;

    // 8. Sign transactions
    let commit_txid = sign_and_broadcast(commit_tx).await?;

    // 9. Wait for commit confirmation (1 block)
    // This happens asynchronously, tracked by process_id

    // 10. Create process tracking
    let process_id = generate_process_id();
    create_inscription_process(process_id.clone(), InscriptionProcess {
        commit_txid: commit_txid.clone(),
        reveal_tx,
        request,
        content_hash: content_hash.clone(),
        content_storage,
        caller,
        status: ProcessStatus::AwaitingCommitConfirmation,
        created_at: ic_cdk::api::time(),
    });

    // 11. Return response
    Ok(CreateInscriptionResponse {
        inscription_id: None,  // Will be set after reveal
        process_id,
        commit_txid,
        reveal_txid_estimate: None,
        total_fee: estimate_total_fee(&request),
        estimated_confirmation: 600,  // ~10 minutes
    })
}

/// Validates inscription content
fn validate_content(
    content: &[u8],
    content_type: &str,
) -> Result<(), InscriptionError> {
    // Check size
    const MAX_CONTENT_SIZE: usize = 400_000;  // 400KB
    if content.is_empty() {
        return Err(InscriptionError::InvalidContent(
            "Content cannot be empty".into(),
        ));
    }
    if content.len() > MAX_CONTENT_SIZE {
        return Err(InscriptionError::ContentTooLarge {
            size: content.len() as u64,
            max: MAX_CONTENT_SIZE as u64,
        });
    }

    // Validate content type format
    if !content_type.contains('/') {
        return Err(InscriptionError::InvalidContentType(
            "Invalid MIME type format".into(),
        ));
    }

    // Check for malicious content (basic)
    if content_type.starts_with("text/html") || content_type.starts_with("application/javascript") {
        // Scan for dangerous patterns
        let content_str = String::from_utf8_lossy(content);
        if content_str.contains("<script") || content_str.contains("javascript:") {
            // Log but allow (Ordinals can have scripts)
            logger::warn("HTML/JS inscription detected", &hashmap! {
                "content_type" => content_type,
                "has_script" => true,
            });
        }
    }

    Ok(())
}
```

#### 2. get_inscription

```rust
#[query]
fn get_inscription(id: InscriptionId) -> Option<Inscription> {
    INSCRIPTIONS.with(|inscriptions| {
        inscriptions.borrow().get(&id)
    })
}
```

#### 3. get_inscriptions_by_owner

```rust
#[query]
fn get_inscriptions_by_owner(
    owner: BitcoinAddress,
    offset: u64,
    limit: u64,
) -> Vec<Inscription> {
    OWNER_INDEX.with(|index| {
        let index = index.borrow();
        if let Some(inscription_ids) = index.get(&owner) {
            inscription_ids
                .iter()
                .skip(offset as usize)
                .take(limit as usize)
                .filter_map(|id| INSCRIPTIONS.with(|ins| ins.borrow().get(id)))
                .collect()
        } else {
            vec![]
        }
    })
}
```

---

## ⛓️ Bitcoin Integration

### Inscription Transaction Structure

Ordinals use a two-step process:

1. **Commit Transaction**: Commits to the inscription
2. **Reveal Transaction**: Reveals the inscription content

```
┌────────────────────────────────────────────────────────────┐
│                 Commit Transaction                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Input:                                                     │
│  └─ UTXO from wallet (funding)                             │
│                                                             │
│  Output:                                                    │
│  ├─ P2TR output (commit to inscription)                    │
│  │  └─ TapLeaf with inscription script                     │
│  └─ Change output (back to wallet)                         │
│                                                             │
│  Fee: ~10-50 sats/vbyte                                    │
└────────────────────────────────────────────────────────────┘
               │
               │ Wait 1 confirmation
               ▼
┌────────────────────────────────────────────────────────────┐
│                Reveal Transaction                           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Input:                                                     │
│  └─ Commit tx output (with inscription script in witness)  │
│     Witness Data:                                           │
│     ├─ OP_FALSE                                            │
│     ├─ OP_IF                                               │
│     │  ├─ OP_PUSH "ord"                                    │
│     │  ├─ OP_PUSH 0x01 (separator)                        │
│     │  ├─ OP_PUSH "image/png" (content type)              │
│     │  ├─ OP_PUSH 0x00 (separator)                        │
│     │  └─ OP_PUSH <inscription content>                   │
│     └─ OP_ENDIF                                            │
│                                                             │
│  Output:                                                    │
│  └─ P2TR output (inscription recipient)                    │
│                                                             │
│  Fee: ~10-50 sats/vbyte                                    │
└────────────────────────────────────────────────────────────┘
```

### Implementation

```rust
use bitcoin::{Transaction, TxIn, TxOut, OutPoint, Script, Witness};

/// Build inscription transactions (commit + reveal)
async fn build_inscription_transactions(
    content: &[u8],
    content_type: &ContentType,
    recipient: Option<&str>,
    fee_rate: u64,
) -> Result<(Transaction, Transaction), InscriptionError> {
    // 1. Get UTXOs for funding
    let utxos = get_canister_utxos().await?;
    let selected_utxo = select_utxo_for_inscription(&utxos, content.len(), fee_rate)?;

    // 2. Build commit transaction
    let commit_tx = build_commit_transaction(
        &selected_utxo,
        content,
        content_type,
        fee_rate,
    )?;

    // 3. Build reveal transaction
    let reveal_tx = build_reveal_transaction(
        &commit_tx,
        content,
        content_type,
        recipient,
        fee_rate,
    )?;

    Ok((commit_tx, reveal_tx))
}

/// Build the commit transaction
fn build_commit_transaction(
    utxo: &Utxo,
    content: &[u8],
    content_type: &ContentType,
    fee_rate: u64,
) -> Result<Transaction, InscriptionError> {
    // Create Taproot script with inscription commitment
    let inscription_script = create_inscription_script(content, content_type)?;
    let taproot_spend_info = create_taproot_commitment(&inscription_script)?;

    // Build transaction
    let mut tx = Transaction {
        version: 2,
        lock_time: 0,
        input: vec![
            TxIn {
                previous_output: OutPoint {
                    txid: utxo.txid,
                    vout: utxo.vout,
                },
                script_sig: Script::new(),
                sequence: 0xFFFFFFFD,
                witness: Witness::default(),
            }
        ],
        output: vec![
            // Commit output
            TxOut {
                value: DUST_LIMIT + calculate_reveal_fee(content.len(), fee_rate),
                script_pubkey: taproot_spend_info.output_key().script_pubkey(),
            },
            // Change output
            TxOut {
                value: calculate_change(utxo, &tx, fee_rate)?,
                script_pubkey: get_canister_script_pubkey().await?,
            },
        ],
    };

    Ok(tx)
}

/// Build the reveal transaction
fn build_reveal_transaction(
    commit_tx: &Transaction,
    content: &[u8],
    content_type: &ContentType,
    recipient: Option<&str>,
    fee_rate: u64,
) -> Result<Transaction, InscriptionError> {
    let recipient_address = if let Some(addr) = recipient {
        parse_bitcoin_address(addr)?
    } else {
        generate_canister_address().await?
    };

    let mut tx = Transaction {
        version: 2,
        lock_time: 0,
        input: vec![
            TxIn {
                previous_output: OutPoint {
                    txid: commit_tx.txid(),
                    vout: 0,  // Commit output
                },
                script_sig: Script::new(),
                sequence: 0xFFFFFFFD,
                witness: create_reveal_witness(content, content_type)?,
            }
        ],
        output: vec![
            TxOut {
                value: DUST_LIMIT,
                script_pubkey: recipient_address.script_pubkey(),
            },
        ],
    };

    Ok(tx)
}

/// Create inscription script (Ordinals protocol)
fn create_inscription_script(
    content: &[u8],
    content_type: &ContentType,
) -> Result<Script, InscriptionError> {
    let mut script_bytes = Vec::new();

    // OP_FALSE
    script_bytes.push(0x00);

    // OP_IF
    script_bytes.push(0x63);

    // Push "ord" protocol marker
    script_bytes.extend_from_slice(&[0x03]); // length
    script_bytes.extend_from_slice(b"ord");

    // Push separator (0x01)
    script_bytes.push(0x01);
    script_bytes.push(0x01);  // separator value

    // Push content type
    let mime = content_type.to_mime_type();
    push_bytes(&mut script_bytes, mime.as_bytes());

    // Push separator (0x00)
    script_bytes.push(0x01);
    script_bytes.push(0x00);  // separator value

    // Push content (in chunks if large)
    if content.len() <= 520 {
        // Single push
        push_bytes(&mut script_bytes, content);
    } else {
        // Split into multiple pushes (max 520 bytes each)
        for chunk in content.chunks(520) {
            push_bytes(&mut script_bytes, chunk);
        }
    }

    // OP_ENDIF
    script_bytes.push(0x68);

    Ok(Script::from(script_bytes))
}

/// Helper to push bytes with length prefix
fn push_bytes(script: &mut Vec<u8>, data: &[u8]) {
    if data.len() <= 75 {
        script.push(data.len() as u8);
    } else if data.len() <= 255 {
        script.push(0x4c);  // OP_PUSHDATA1
        script.push(data.len() as u8);
    } else if data.len() <= 520 {
        script.push(0x4d);  // OP_PUSHDATA2
        script.extend_from_slice(&(data.len() as u16).to_le_bytes());
    } else {
        panic!("Data too large for single push");
    }
    script.extend_from_slice(data);
}
```

---

## 💾 State Management

### Storage Structure

```rust
use ic_stable_structures::{
    BTreeMap, StableBTreeMap, DefaultMemoryImpl, Memory,
};
use std::cell::RefCell;

thread_local! {
    // Inscription registry (id -> inscription)
    static INSCRIPTIONS: RefCell<StableBTreeMap<String, Inscription, Memory>> =
        RefCell::new(StableBTreeMap::init(Memory::default()));

    // Owner index (address -> [inscription_ids])
    static OWNER_INDEX: RefCell<StableBTreeMap<String, Vec<String>, Memory>> =
        RefCell::new(StableBTreeMap::init(Memory::default()));

    // Creator index (principal -> [inscription_ids])
    static CREATOR_INDEX: RefCell<StableBTreeMap<Principal, Vec<String>, Memory>> =
        RefCell::new(StableBTreeMap::init(Memory::default()));

    // Global inscription counter
    static INSCRIPTION_COUNTER: RefCell<u64> = RefCell::new(0);

    // Active inscription processes (process_id -> process)
    static PROCESSES: RefCell<BTreeMap<String, InscriptionProcess>> =
        RefCell::new(BTreeMap::new());
}
```

### Process Tracking

```rust
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct InscriptionProcess {
    pub process_id: String,
    pub caller: Principal,
    pub commit_txid: String,
    pub reveal_tx: Transaction,
    pub request: CreateInscriptionRequest,
    pub content_hash: String,
    pub content_storage: ContentStorage,
    pub status: ProcessStatus,
    pub created_at: Timestamp,
    pub updated_at: Timestamp,
    pub error: Option<String>,
}

#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq)]
pub enum ProcessStatus {
    AwaitingCommitConfirmation,
    RevealTransactionBroadcasted,
    AwaitingRevealConfirmation,
    Completed,
    Failed,
}

/// Background task to monitor inscription processes
#[heartbeat]
async fn monitor_inscription_processes() {
    let processes: Vec<(String, InscriptionProcess)> = PROCESSES.with(|p| {
        p.borrow()
            .iter()
            .filter(|(_, proc)| {
                proc.status != ProcessStatus::Completed
                && proc.status != ProcessStatus::Failed
            })
            .map(|(id, proc)| (id.clone(), proc.clone()))
            .collect()
    });

    for (process_id, mut process) in processes {
        match process.status {
            ProcessStatus::AwaitingCommitConfirmation => {
                // Check if commit tx confirmed
                if is_transaction_confirmed(&process.commit_txid).await {
                    // Broadcast reveal transaction
                    match broadcast_transaction(&process.reveal_tx).await {
                        Ok(reveal_txid) => {
                            process.status = ProcessStatus::RevealTransactionBroadcasted;
                            process.reveal_txid = Some(reveal_txid);
                            update_process(&process_id, process);
                        }
                        Err(e) => {
                            process.status = ProcessStatus::Failed;
                            process.error = Some(e.to_string());
                            update_process(&process_id, process);
                        }
                    }
                }
            }
            ProcessStatus::RevealTransactionBroadcasted => {
                if let Some(reveal_txid) = &process.reveal_txid {
                    if is_transaction_confirmed(reveal_txid).await {
                        // Inscription complete!
                        let inscription_id = format!("{}:0", reveal_txid);

                        // Create inscription record
                        let inscription = Inscription {
                            id: inscription_id.clone(),
                            owner: process.request.recipient.clone()
                                .unwrap_or_else(|| get_default_address()),
                            creator: process.caller,
                            content_type: ContentType::from_mime_type(
                                &process.request.content_type
                            ).unwrap(),
                            content: process.content_storage.clone(),
                            content_length: process.request.content.len() as u64,
                            content_hash: process.content_hash.clone(),
                            genesis_height: get_current_block_height().await,
                            genesis_fee: calculate_total_fee(&process.request),
                            inscription_number: increment_inscription_counter(),
                            created_at: process.created_at,
                            updated_at: ic_cdk::api::time(),
                            metadata: process.request.metadata.clone(),
                        };

                        // Store inscription
                        store_inscription(inscription);

                        // Update process
                        process.status = ProcessStatus::Completed;
                        update_process(&process_id, process);
                    }
                }
            }
            _ => {}
        }
    }
}
```

---

## 🔒 Security Considerations

### Input Validation

1. **Content Size Limits**: Max 400KB per inscription
2. **MIME Type Validation**: Only allow safe MIME types
3. **Malware Scanning**: Basic pattern matching for known threats
4. **Rate Limiting**: Max 10 inscriptions per user per hour

### Authentication & Authorization

1. **Internet Identity**: Required for all inscription operations
2. **Principal Verification**: Validate caller is not anonymous
3. **Ownership Checks**: Only owner can transfer inscriptions

### Bitcoin Security

1. **UTXO Management**: Never reuse UTXOs
2. **Fee Validation**: Prevent fee overpayment attacks
3. **Transaction Malleability**: Use SegWit/Taproot
4. **Signature Security**: Use threshold ECDSA

---

## ⚡ Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Inscription Creation Time | <5s | ICP-side processing |
| Bitcoin Confirmation Time | ~10min | Network dependent |
| Query Response Time | <100ms | Stable memory lookup |
| Concurrent Inscriptions | 100+/min | Limited by Bitcoin |
| Storage per Inscription | <10KB | Using IPFS for large content |

---

## 🧪 Testing Strategy

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_content_validation() {
        // Valid content
        let content = b"Hello Ordinals!";
        let content_type = "text/plain";
        assert!(validate_content(content, content_type).is_ok());

        // Empty content (invalid)
        let empty = b"";
        assert!(validate_content(empty, content_type).is_err());

        // Too large (invalid)
        let large = vec![0u8; 500_000];
        assert!(validate_content(&large, content_type).is_err());
    }

    #[test]
    fn test_content_type_parsing() {
        assert_eq!(
            ContentType::from_mime_type("text/plain").unwrap(),
            ContentType::Text
        );

        assert_eq!(
            ContentType::from_mime_type("image/png").unwrap(),
            ContentType::Image {
                mime_type: "image/png".to_string()
            }
        );
    }

    #[test]
    fn test_inscription_script_creation() {
        let content = b"Test inscription";
        let content_type = ContentType::Text;

        let script = create_inscription_script(content, &content_type)
            .expect("Failed to create script");

        // Verify script starts with OP_FALSE OP_IF
        assert_eq!(script.as_bytes()[0], 0x00);
        assert_eq!(script.as_bytes()[1], 0x63);

        // Verify "ord" marker
        assert_eq!(&script.as_bytes()[2..5], b"ord");
    }
}
```

---

## 📝 Implementation Guide

### Week 1-2: Foundation
1. Set up canister structure
2. Define data models
3. Implement state management
4. Write unit tests for models

### Week 3-4: Core Logic
1. Content validation
2. Inscription script building
3. Transaction construction
4. Testing transaction logic

### Week 5-6: Bitcoin Integration
1. UTXO selection
2. Transaction signing
3. Broadcasting
4. Confirmation monitoring

### Week 7-8: Process Management
1. Async process tracking
2. Heartbeat implementation
3. Error handling
4. Integration testing

### Week 9-10: Polish & Testing
1. Performance optimization
2. End-to-end testing
3. Documentation
4. Security review

---

**Document Version:** 1.0
**Last Updated:** November 2025
**Status:** 📘 Complete Technical Specification
