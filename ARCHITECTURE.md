# QURI Protocol - Technical Architecture

## Overview

QURI is a decentralized Bitcoin Runes launchpad built on the Internet Computer Protocol (ICP), enabling zero-fee, instant-finality Runes creation through threshold Schnorr signatures.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     QURI PROTOCOL                           │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │              FRONTEND (External)                       │ │
│  │  • React + TypeScript                                  │ │
│  │  • Internet Identity Integration                       │ │
│  │  • Runes Creation Wizard                              │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │ Candid API                          │
│  ┌────────────────────▼──────────────────────────────────┐ │
│  │              CANISTER LAYER                            │ │
│  │                                                        │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │Rune Engine  │  │  Bitcoin     │  │  Registry   │  │ │
│  │  │             │  │  Integration │  │             │  │ │
│  │  │• Validation │  │• Schnorr     │  │• Indexing   │  │ │
│  │  │• Metadata   │  │• UTXO Mgmt   │  │• Search     │  │ │
│  │  │• Orchestr.  │  │• ckBTC       │  │• Analytics  │  │ │
│  │  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  │ │
│  │         │                 │                  │         │ │
│  │         │        ┌────────▼────────┐         │         │ │
│  │         │        │  Identity Mgr   │         │         │ │
│  │         │        │• Sessions       │         │         │ │
│  │         │        │• Rate Limiting  │         │         │ │
│  │         │        │• Permissions    │         │         │ │
│  │         │        └─────────────────┘         │         │ │
│  │         └────────────────┬────────────────────┘         │ │
│  └──────────────────────────┼──────────────────────────────┘ │
│                             │                                │
│  ┌──────────────────────────▼──────────────────────────────┐ │
│  │            SHARED LIBRARIES LAYER                        │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐            │ │
│  │  │quri-types│  │quri-utils │  │bitcoin-  │            │ │
│  │  │          │  │           │  │utils     │            │ │
│  │  └──────────┘  └───────────┘  └──────────┘            │ │
│  │                                                          │ │
│  │  ┌──────────┐  ┌───────────┐                           │ │
│  │  │runes-    │  │schnorr-   │                           │ │
│  │  │utils     │  │signatures │                           │ │
│  │  └──────────┘  └───────────┘                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Bitcoin API
                          ▼
            ┌──────────────────────────┐
            │   BITCOIN L1 NETWORK     │
            │   • Runes Protocol       │
            │   • Threshold Schnorr    │
            │   • UTXO Model           │
            └──────────────────────────┘
```

## Core Components

### 1. Rune Engine Canister

**Purpose**: Core business logic for Runes creation

**Responsibilities**:
- Validate Rune parameters (name, divisibility, supply)
- Generate Rune IDs
- Manage Rune metadata
- Orchestrate creation flow
- Store persistent state in stable memory

**Key Features**:
- Stable structures for upgrade-safe storage
- LRU caching for performance
- Event emission for indexing

**State Management**:
```rust
StableBTreeMap<RuneId, RuneMetadata>  // Primary storage
StableVec<RuneId>                      // Index for iteration
```

### 2. Bitcoin Integration Canister

**Purpose**: Handle all Bitcoin-related operations

**Responsibilities**:
- Manage threshold Schnorr signing
- Track Bitcoin UTXOs
- Construct and broadcast transactions
- Process ckBTC payments
- Monitor transaction confirmations

**ICP Bitcoin Integration**:
- Uses ICP's native Bitcoin API
- Threshold Schnorr signing (no centralized keys)
- Direct Bitcoin L1 interaction

**Key APIs Used**:
- `bitcoin_get_utxos`: Fetch UTXOs for addresses
- `bitcoin_get_balance`: Check address balances
- `bitcoin_send_transaction`: Broadcast signed transactions
- `schnorr_public_key`: Get canister's Schnorr public key
- `sign_with_schnorr`: Sign Bitcoin transactions

### 3. Registry Canister

**Purpose**: Index and query all created Runes

**Responsibilities**:
- Store Rune registry entries
- Provide search functionality
- Track trading volume and analytics
- Maintain holder counts
- Generate trending lists

**Features**:
- Full-text search on Rune names
- Pagination for large result sets
- Real-time statistics
- Bonding curve data (Phase 2)

### 4. Identity Manager Canister

**Purpose**: Authentication, authorization, and session management

**Responsibilities**:
- Manage user sessions (inspired by Odin.fun)
- Enforce rate limiting
- Validate permissions
- Track user statistics

**Session Keys Feature**:
- Eliminates need to approve every transaction
- Configurable permissions and expiry
- Improved UX for frequent operations

**Rate Limiting**:
- 100 requests per hour per principal
- Sliding window implementation
- Protection against abuse

## Shared Libraries

### quri-types
Common types and interfaces used across all canisters:
- `RuneConfig`, `RuneMetadata`
- `BitcoinAddress`, `Transaction`
- `UserSession`, `SessionPermissions`
- `BondingCurve` (Phase 2)

### quri-utils
Utility functions for common operations:
- Rune name validation
- Amount formatting with divisibility
- Fee calculation
- Time conversion helpers
- LEB128 encoding/decoding

### bitcoin-utils
Bitcoin-specific utilities:
- P2TR address derivation
- Transaction building
- Script creation (OP_RETURN, P2TR)
- Fee estimation
- TXID calculation

### runes-utils
Runes protocol implementation:
- Runestone construction (OP_RETURN + OP_13)
- Rune name encoding/decoding
- Etching validation
- Size estimation

### schnorr-signatures
Threshold Schnorr signature utilities:
- BIP340 signature verification
- Tagged hash implementation
- Taproot sighash (BIP341)

## Data Flow

### Rune Creation Flow

```
1. User submits Rune configuration
   ↓
2. Identity Manager validates session & rate limit
   ↓
3. Rune Engine validates parameters
   ↓
4. Rune Engine generates Rune ID & metadata
   ↓
5. Bitcoin Integration:
   a. Gets UTXOs for fee payment
   b. Builds etching transaction with runestone
   c. Signs transaction with threshold Schnorr
   d. Broadcasts to Bitcoin network
   ↓
6. Registry stores Rune entry
   ↓
7. Return Rune ID + Bitcoin TXID to user
```

### Transaction Signing Flow

```
1. Build unsigned Bitcoin transaction
   ↓
2. Calculate sighash for each input (BIP341)
   ↓
3. Call ICP's schnorr_public_key API
   ↓
4. Call sign_with_schnorr for each sighash
   ↓
5. Construct witness with signatures
   ↓
6. Serialize final signed transaction
   ↓
7. Broadcast via bitcoin_send_transaction
```

## Security Considerations

### Threshold Cryptography
- No single point of failure
- Keys are distributed across subnet nodes
- Signing requires threshold agreement (2/3+)
- Cannot be extracted or compromised

### Access Control
- Internet Identity integration (no passwords)
- Session-based permissions
- Rate limiting per principal
- Anonymous principals blocked

### Input Validation
- Strict Rune name validation (A-Z, 1-26 chars)
- Divisibility limits (0-38)
- Supply overflow checks
- Script size limits

### Stable Storage
- Upgrade-safe data structures
- No data loss during canister upgrades
- Backup and recovery procedures

## Performance Optimization

### Caching Strategy
- In-memory cache for frequently accessed Runes
- LRU eviction policy
- Cache invalidation on updates

### Batch Operations
- Batch UTXO queries
- Bulk metadata updates
- Efficient pagination

### WASM Optimization
- Release builds with LTO
- Dead code elimination
- Size optimization (`opt-level = 'z'`)

## Monitoring and Observability

### Metrics Tracked
- Runes created per day
- Transaction success rate
- Average confirmation time
- ckBTC volume
- Active sessions

### Error Handling
- Comprehensive error types
- Detailed error messages
- Automatic retries for transient failures
- Fallback mechanisms

## Upgrade Strategy

### Canister Upgrades
- Pre-upgrade hooks save state
- Post-upgrade hooks restore state
- Stable structures for persistence
- Version compatibility checks

### Migration Path
- Backward-compatible data formats
- Gradual rollout of new features
- Canister version tracking

## Future Enhancements (Phase 2)

### Sovereign Rollup on Celestia
- EVM-compatible execution layer
- Data availability on Celestia
- ICP bridge for L1 ↔ L2
- High-throughput trading

### AMM Implementation
- Bonding curve for price discovery
- Graduation to AMM at 1 BTC market cap
- Deep liquidity pools
- Low-cost swaps (<$0.001)

### Advanced Features
- Lending/borrowing protocols
- NFT marketplace (Ordinals)
- Cross-chain bridges
- Governance ($QURI token)

## Development Workflow

### Local Development
```bash
# Start local replica
dfx start --background

# Deploy canisters
dfx deploy

# Run tests
cargo test --workspace
```

### CI/CD
- Automated testing on every PR
- Security audits
- WASM size checks
- Code coverage reporting

### Deployment
- Testnet deployment for validation
- Gradual mainnet rollout
- Monitoring and rollback procedures

## Conclusion

QURI's architecture is designed for:
- **Scalability**: Modular design allows independent scaling
- **Security**: Threshold cryptography and strict validation
- **Performance**: ICP's 2-second finality and optimized code
- **Maintainability**: Clean separation of concerns and comprehensive testing
- **Extensibility**: Clear path to Phase 2 features

The monorepo structure with shared libraries ensures code reuse and consistency across all canisters while maintaining clear boundaries and responsibilities.
