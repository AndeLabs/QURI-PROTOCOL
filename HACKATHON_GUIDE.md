# QURI Protocol - ICP Bitcoin DeFi Hackathon Implementation Guide

> **Deadline:** November 24, 2025, 7:59 AM (GMT-04:00)
> **Days Remaining:** 5

---

## Overview

This guide covers the implementation of key features to maximize your hackathon submission score. Each feature aligns directly with the hackathon requirements.

---

## Day 1: Complete Sign-in with Bitcoin (SIWB)

### Why This Matters
- Hackathon has dedicated session on SIWB
- Shows you understand Bitcoin ecosystem, not just ICP
- Enables seamless UX for Bitcoin users

### Current Status
- ✅ `ic-siwb` library installed
- ✅ `BitcoinAuthProvider.ts` fully implemented
- ✅ `DualAuthProvider.tsx` integrated
- ✅ Supports: Unisat, Xverse, Leather, OKX, Phantom
- ❌ SIWB canister not deployed
- ❌ No `NEXT_PUBLIC_SIWB_CANISTER_ID`
- ❌ No wallet selection UI

### Implementation Steps

#### Step 1.1: Deploy SIWB Canister

Option A: Use existing ic-siwb canister (recommended for hackathon)
```bash
# The ic-siwb team has a public canister you can use
# Mainnet: https://github.com/AstroxNetwork/ic-siwb
```

Option B: Deploy your own
```bash
# Clone ic-siwb repository
git clone https://github.com/AstroxNetwork/ic-siwb.git
cd ic-siwb

# Deploy to mainnet
dfx deploy --network ic
```

#### Step 1.2: Configure Environment Variable

```bash
# In frontend/.env.local (development)
NEXT_PUBLIC_SIWB_CANISTER_ID=<your-canister-id>

# In frontend/.env.production (mainnet)
NEXT_PUBLIC_SIWB_CANISTER_ID=<your-canister-id>
```

#### Step 1.3: Create Bitcoin Wallet Selection UI

Create `frontend/components/wallet/BitcoinWalletSelector.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useBitcoinAuth } from '@/lib/auth';
import { BitcoinWalletType } from '@/lib/auth/types';
import { ButtonPremium } from '@/components/ui/ButtonPremium';

interface WalletOption {
  id: BitcoinWalletType;
  name: string;
  icon: string;
  description: string;
}

const WALLETS: WalletOption[] = [
  {
    id: 'xverse',
    name: 'Xverse',
    icon: '/images/wallets/xverse.svg',
    description: 'Popular Bitcoin wallet with Ordinals support',
  },
  {
    id: 'unisat',
    name: 'Unisat',
    icon: '/images/wallets/unisat.svg',
    description: 'Leading BRC-20 and Runes wallet',
  },
  {
    id: 'leather',
    name: 'Leather',
    icon: '/images/wallets/leather.svg',
    description: 'Formerly Hiro Wallet, STX & BTC',
  },
  {
    id: 'okx',
    name: 'OKX Wallet',
    icon: '/images/wallets/okx.svg',
    description: 'Multi-chain wallet by OKX',
  },
];

export function BitcoinWalletSelector() {
  const { connect, isLoading, isAuthenticated, address } = useBitcoinAuth();
  const [selectedWallet, setSelectedWallet] = useState<BitcoinWalletType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (walletId: BitcoinWalletType) => {
    setError(null);
    setSelectedWallet(walletId);

    try {
      const success = await connect(walletId);
      if (!success) {
        setError('Connection failed. Make sure the wallet is installed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  };

  if (isAuthenticated && address) {
    return (
      <div className="p-4 bg-museum-gold/10 rounded-lg border border-museum-gold/30">
        <p className="text-sm text-museum-charcoal/70">Connected with Bitcoin</p>
        <p className="font-mono text-sm truncate">{address}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-serif font-medium">Connect Bitcoin Wallet</h3>

      <div className="grid gap-3">
        {WALLETS.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => handleConnect(wallet.id)}
            disabled={isLoading}
            className={`
              flex items-center gap-3 p-4 rounded-lg border transition-all
              ${selectedWallet === wallet.id && isLoading
                ? 'border-museum-gold bg-museum-gold/5'
                : 'border-museum-charcoal/20 hover:border-museum-gold/50 hover:bg-museum-gold/5'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <img
              src={wallet.icon}
              alt={wallet.name}
              className="w-8 h-8"
              onError={(e) => {
                e.currentTarget.src = '/images/wallets/default.svg';
              }}
            />
            <div className="text-left">
              <p className="font-medium">{wallet.name}</p>
              <p className="text-xs text-museum-charcoal/60">{wallet.description}</p>
            </div>
            {selectedWallet === wallet.id && isLoading && (
              <div className="ml-auto">
                <div className="animate-spin h-5 w-5 border-2 border-museum-gold border-t-transparent rounded-full" />
              </div>
            )}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {error}
        </p>
      )}

      <p className="text-xs text-museum-charcoal/50">
        Sign in with your Bitcoin wallet to access all features.
        Your Bitcoin address becomes your identity on QURI Protocol.
      </p>
    </div>
  );
}
```

#### Step 1.4: Update WalletModal to Include Bitcoin

Update `frontend/components/wallet/WalletModal.tsx` to include tabs for ICP and Bitcoin authentication.

#### Step 1.5: Add Wallet Icons

Download wallet icons to `frontend/public/images/wallets/`:
- xverse.svg
- unisat.svg
- leather.svg
- okx.svg
- default.svg (fallback)

### Testing Checklist
- [ ] SIWB canister ID configured
- [ ] Can connect with Xverse
- [ ] Can connect with Unisat
- [ ] Bitcoin address displays correctly
- [ ] Can make canister calls with delegated identity
- [ ] Disconnect works properly
- [ ] Auth persists on page refresh

---

## Day 2: Implement Dead Man's Switch

### Why This Matters
- Hackathon brief SPECIFICALLY mentions this feature
- Unique value proposition
- Shows advanced Bitcoin scripting knowledge

### Feature Description
Automatically transfer Runes to a beneficiary if the owner doesn't check in within a specified period.

### Backend Implementation

#### Step 2.1: Add Types to quri-types

Add to `backend/libs/quri-types/src/lib.rs`:

```rust
/// Dead Man's Switch configuration
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DeadManSwitch {
    /// Unique identifier
    pub id: u64,
    /// Owner's principal
    pub owner: Principal,
    /// Beneficiary Bitcoin address
    pub beneficiary: String,
    /// Rune to transfer
    pub rune_id: String,
    /// Amount to transfer
    pub amount: u128,
    /// Last check-in timestamp (nanoseconds)
    pub last_checkin: u64,
    /// Timeout period (nanoseconds)
    pub timeout_ns: u64,
    /// Whether the switch has been triggered
    pub triggered: bool,
    /// Creation timestamp
    pub created_at: u64,
}

/// Dead Man's Switch creation parameters
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct CreateDeadManSwitchParams {
    pub beneficiary: String,
    pub rune_id: String,
    pub amount: u128,
    pub timeout_days: u64,
}

/// Dead Man's Switch status
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum SwitchStatus {
    Active,
    Expired,
    Triggered,
    Cancelled,
}
```

#### Step 2.2: Add to Rune Engine Canister

Add to `backend/canisters/rune-engine/src/lib.rs`:

```rust
use ic_cdk::api::time;
use std::collections::BTreeMap;

// State storage for dead man's switches
thread_local! {
    static DEAD_MAN_SWITCHES: RefCell<BTreeMap<u64, DeadManSwitch>> = RefCell::new(BTreeMap::new());
    static SWITCH_COUNTER: RefCell<u64> = RefCell::new(0);
}

/// Create a new dead man's switch
#[update]
pub fn create_dead_man_switch(params: CreateDeadManSwitchParams) -> Result<u64, String> {
    let caller = ic_cdk::caller();

    // Validate beneficiary address
    if !is_valid_bitcoin_address(&params.beneficiary) {
        return Err("Invalid beneficiary Bitcoin address".to_string());
    }

    // Validate timeout (1-365 days)
    if params.timeout_days < 1 || params.timeout_days > 365 {
        return Err("Timeout must be between 1 and 365 days".to_string());
    }

    let now = time();
    let timeout_ns = params.timeout_days * 24 * 60 * 60 * 1_000_000_000;

    let id = SWITCH_COUNTER.with(|counter| {
        let mut c = counter.borrow_mut();
        *c += 1;
        *c
    });

    let switch = DeadManSwitch {
        id,
        owner: caller,
        beneficiary: params.beneficiary,
        rune_id: params.rune_id,
        amount: params.amount,
        last_checkin: now,
        timeout_ns,
        triggered: false,
        created_at: now,
    };

    DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow_mut().insert(id, switch);
    });

    Ok(id)
}

/// Check in to reset the timer
#[update]
pub fn checkin(switch_id: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();

    DEAD_MAN_SWITCHES.with(|switches| {
        let mut switches = switches.borrow_mut();
        let switch = switches.get_mut(&switch_id)
            .ok_or("Switch not found")?;

        if switch.owner != caller {
            return Err("Not authorized".to_string());
        }

        if switch.triggered {
            return Err("Switch already triggered".to_string());
        }

        switch.last_checkin = time();
        Ok(())
    })
}

/// Check and trigger expired switches (called by timer or heartbeat)
#[update]
pub async fn process_expired_switches() -> Vec<u64> {
    let now = time();
    let mut triggered_ids = Vec::new();

    let expired_switches: Vec<DeadManSwitch> = DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow()
            .values()
            .filter(|s| !s.triggered && now > s.last_checkin + s.timeout_ns)
            .cloned()
            .collect()
    });

    for switch in expired_switches {
        // Trigger the transfer
        match execute_dead_man_transfer(&switch).await {
            Ok(_) => {
                // Mark as triggered
                DEAD_MAN_SWITCHES.with(|switches| {
                    if let Some(s) = switches.borrow_mut().get_mut(&switch.id) {
                        s.triggered = true;
                    }
                });
                triggered_ids.push(switch.id);
            }
            Err(e) => {
                ic_cdk::println!("Failed to trigger switch {}: {}", switch.id, e);
            }
        }
    }

    triggered_ids
}

/// Get user's switches
#[query]
pub fn get_my_switches() -> Vec<DeadManSwitch> {
    let caller = ic_cdk::caller();

    DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow()
            .values()
            .filter(|s| s.owner == caller)
            .cloned()
            .collect()
    })
}

/// Get switch status
#[query]
pub fn get_switch_status(switch_id: u64) -> Option<SwitchStatus> {
    let now = time();

    DEAD_MAN_SWITCHES.with(|switches| {
        switches.borrow().get(&switch_id).map(|s| {
            if s.triggered {
                SwitchStatus::Triggered
            } else if now > s.last_checkin + s.timeout_ns {
                SwitchStatus::Expired
            } else {
                SwitchStatus::Active
            }
        })
    })
}

/// Cancel a switch (only owner)
#[update]
pub fn cancel_switch(switch_id: u64) -> Result<(), String> {
    let caller = ic_cdk::caller();

    DEAD_MAN_SWITCHES.with(|switches| {
        let mut switches = switches.borrow_mut();
        let switch = switches.get(&switch_id)
            .ok_or("Switch not found")?;

        if switch.owner != caller {
            return Err("Not authorized".to_string());
        }

        if switch.triggered {
            return Err("Cannot cancel triggered switch".to_string());
        }

        switches.remove(&switch_id);
        Ok(())
    })
}

// Helper function to execute the transfer
async fn execute_dead_man_transfer(switch: &DeadManSwitch) -> Result<(), String> {
    // This would use your existing settlement/transfer logic
    // to send the Runes to the beneficiary address

    // 1. Build the transfer transaction
    // 2. Sign with threshold Schnorr
    // 3. Broadcast to Bitcoin network

    ic_cdk::println!(
        "Executing dead man's switch: {} Runes {} to {}",
        switch.amount,
        switch.rune_id,
        switch.beneficiary
    );

    // TODO: Integrate with your existing transaction building logic
    Ok(())
}
```

#### Step 2.3: Add Timer for Automatic Processing

```rust
// In init or post_upgrade
#[init]
fn init() {
    // Set up timer to check switches every hour
    ic_cdk_timers::set_timer_interval(
        std::time::Duration::from_secs(3600),
        || ic_cdk::spawn(async {
            let triggered = process_expired_switches().await;
            if !triggered.is_empty() {
                ic_cdk::println!("Triggered {} switches", triggered.len());
            }
        })
    );
}
```

### Frontend Implementation

Create `frontend/components/deadman/DeadManSwitchForm.tsx` and `frontend/components/deadman/SwitchList.tsx`.

### Testing Checklist
- [ ] Can create a switch
- [ ] Check-in resets timer
- [ ] Expired switches are detected
- [ ] Transfer executes correctly
- [ ] Can cancel before trigger
- [ ] UI shows countdown timer

---

## Day 3: Add vetKeys Encrypted Metadata

### Why This Matters
- Hackathon SPECIFICALLY mentions vetKeys
- Enables privacy-preserving features
- Shows advanced ICP capabilities

### Use Cases
1. **Private Rune metadata until reveal** - Creator sets metadata that's encrypted until launch
2. **Secure session keys** - For trading without signing each transaction
3. **Password-protected settlements** - Extra security layer

### Implementation Steps

#### Step 3.1: Add vetKeys Dependency

Update `backend/canisters/rune-engine/Cargo.toml`:

```toml
[dependencies]
# Add vetKeys support
ic-vetkd-utils = "0.1"
```

#### Step 3.2: Implement Encrypted Metadata

Add to `backend/canisters/rune-engine/src/lib.rs`:

```rust
use ic_vetkd_utils::{
    TransportSecretKey,
    DerivedPublicKey,
    EncryptedKey,
};

/// Encrypted metadata for a Rune
#[derive(CandidType, Deserialize, Serialize, Clone)]
pub struct EncryptedRuneMetadata {
    pub rune_id: String,
    pub encrypted_data: Vec<u8>,
    pub nonce: Vec<u8>,
    pub reveal_time: Option<u64>,  // Optional time-based reveal
    pub owner: Principal,
}

thread_local! {
    static ENCRYPTED_METADATA: RefCell<BTreeMap<String, EncryptedRuneMetadata>> = RefCell::new(BTreeMap::new());
}

/// Get the vetKD public key for encryption
#[update]
pub async fn get_vetkey_public_key() -> Result<Vec<u8>, String> {
    let request = VetKDPublicKeyRequest {
        canister_id: None,
        derivation_path: vec![b"quri_metadata".to_vec()],
        key_id: bls12_381_test_key_1(),
    };

    let (response,): (VetKDPublicKeyReply,) = ic_cdk::call(
        Principal::management_canister(),
        "vetkd_public_key",
        (request,)
    ).await.map_err(|e| format!("Failed to get public key: {:?}", e))?;

    Ok(response.public_key)
}

/// Store encrypted metadata for a Rune
#[update]
pub fn store_encrypted_metadata(
    rune_id: String,
    encrypted_data: Vec<u8>,
    nonce: Vec<u8>,
    reveal_time: Option<u64>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();

    let metadata = EncryptedRuneMetadata {
        rune_id: rune_id.clone(),
        encrypted_data,
        nonce,
        reveal_time,
        owner: caller,
    };

    ENCRYPTED_METADATA.with(|m| {
        m.borrow_mut().insert(rune_id, metadata);
    });

    Ok(())
}

/// Get decryption key for metadata (only owner or after reveal time)
#[update]
pub async fn get_decryption_key(rune_id: String) -> Result<Vec<u8>, String> {
    let caller = ic_cdk::caller();
    let now = time();

    let metadata = ENCRYPTED_METADATA.with(|m| {
        m.borrow().get(&rune_id).cloned()
    }).ok_or("Metadata not found")?;

    // Check authorization
    let authorized = metadata.owner == caller ||
        metadata.reveal_time.map(|t| now >= t).unwrap_or(false);

    if !authorized {
        return Err("Not authorized to decrypt".to_string());
    }

    // Get the decryption key from vetKD
    let request = VetKDEncryptedKeyRequest {
        derivation_id: rune_id.as_bytes().to_vec(),
        public_key_derivation_path: vec![b"quri_metadata".to_vec()],
        key_id: bls12_381_test_key_1(),
        encryption_public_key: caller.as_slice().to_vec(),
    };

    let (response,): (VetKDEncryptedKeyReply,) = ic_cdk::call(
        Principal::management_canister(),
        "vetkd_encrypted_key",
        (request,)
    ).await.map_err(|e| format!("Failed to get key: {:?}", e))?;

    Ok(response.encrypted_key)
}

fn bls12_381_test_key_1() -> VetKDKeyId {
    VetKDKeyId {
        curve: VetKDCurve::Bls12_381,
        name: "test_key_1".to_string(),
    }
}
```

### Frontend Implementation

Create utilities for encryption/decryption in `frontend/lib/crypto/vetkeys.ts`.

### Testing Checklist
- [ ] Can get public key
- [ ] Can encrypt metadata
- [ ] Owner can decrypt
- [ ] Time-based reveal works
- [ ] Non-owner cannot decrypt before reveal

---

## Day 4: Record Demo Video & Polish UI

### Video Structure (3 minutes max)

#### 0:00-0:30 - Hook & Problem Statement
```
"Bitcoin Runes are the future of fungible tokens on Bitcoin.
But creating them requires deep technical knowledge and costs $50+ in fees.

QURI Protocol changes that."
```

#### 0:30-1:30 - Live Demo
1. **Connect with Bitcoin wallet** (10s)
   - Show Xverse connection
   - Display Bitcoin address

2. **Create a Rune** (30s)
   - Fill out etching form
   - Show fee estimation
   - Submit and show instant virtual Rune

3. **Explore Registry** (15s)
   - Show indexed Runes
   - Search functionality

4. **Initiate Settlement** (20s)
   - Select Rune for settlement
   - Enter Bitcoin address
   - Show Schnorr signature generation

5. **Show Dead Man's Switch** (15s)
   - Create a switch
   - Show countdown timer

#### 1:30-2:15 - Technical Deep Dive
Show architecture diagram highlighting:
- 4 production canisters
- Threshold Schnorr (no custodial risk)
- ckBTC for sub-$0.01 fees
- <200ms query latency
- vetKeys for privacy

#### 2:15-2:45 - Differentiators & Roadmap
- "First complete Runes platform on ICP"
- "Live on mainnet with 73-year cycle runway"
- Phase 2: DEX, Bridge, Ordinals
- $92.4M revenue potential

#### 2:45-3:00 - Call to Action
```
"QURI Protocol: The Premier Bitcoin Runes Platform

Making Bitcoin programmable, one Rune at a time."
```

### Recording Tips
- Use OBS or Loom
- 1080p minimum, 60fps preferred
- Clear audio (use external mic)
- Show real transactions (testnet is fine)
- Include mainnet canister IDs
- Add subtle background music

### UI Polish Checklist
- [ ] All loading states work
- [ ] Error messages are clear
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Fast page transitions
- [ ] All buttons have hover states

---

## Day 5: Documentation & Submission

### GitHub Repository Checklist

#### README.md Updates
```markdown
# QURI Protocol

> The Premier Bitcoin Runes Platform on Internet Computer

## Live Demo
- **Frontend:** [your-url]
- **Video Demo:** [youtube-link]

## Mainnet Canisters
| Canister | ID | Cycles |
|----------|-------|--------|
| Registry | `pnqje-qiaaa-aaaah-arodq-cai` | 493B |
| Rune Engine | `pkrpq-5qaaa-aaaah-aroda-cai` | 492B |
| Bitcoin Integration | `yz6hf-qqaaa-aaaah-arn5a-cai` | 2.99T |
| Identity Manager | `y67br-5iaaa-aaaah-arn5q-cai` | TBD |

## Features
- ✅ Sign-in with Bitcoin (Xverse, Unisat, Leather)
- ✅ Native Runes creation (<$0.01)
- ✅ Threshold Schnorr signatures
- ✅ Dead Man's Switch for Runes
- ✅ vetKeys encrypted metadata
- ✅ ckBTC integration
- ✅ Non-custodial settlement

## Technology Stack
- **Backend:** Rust, ICP Canisters
- **Frontend:** Next.js 14, TypeScript
- **Signing:** Threshold Schnorr (BIP-340)
- **Bitcoin:** P2TR (Taproot)

## Quick Start
\`\`\`bash
# Clone repository
git clone https://github.com/your-username/quri-protocol

# Install dependencies
cd frontend && npm install

# Run locally
npm run dev
\`\`\`

## Architecture
[Include diagram]

## Security
- No private keys on servers
- Threshold signatures (multi-node)
- Non-custodial design
- RBAC access control

## License
MIT
```

### Submission Requirements
- [ ] Public GitHub repository
- [ ] 3-minute video demo
- [ ] Working deployment
- [ ] Clear documentation

### Final Checks
- [ ] All tests pass
- [ ] No hardcoded secrets
- [ ] License file exists
- [ ] Video is uploaded
- [ ] Submit before deadline

---

## Quick Reference: Key Files to Modify

### Backend
- `backend/libs/quri-types/src/lib.rs` - Add new types
- `backend/canisters/rune-engine/src/lib.rs` - Dead Man's Switch
- `backend/canisters/rune-engine/Cargo.toml` - vetKeys dependency

### Frontend
- `frontend/components/wallet/BitcoinWalletSelector.tsx` - NEW
- `frontend/components/deadman/DeadManSwitchForm.tsx` - NEW
- `frontend/components/wallet/WalletModal.tsx` - Update
- `frontend/.env.local` - Add SIWB canister ID

### Documentation
- `README.md` - Complete rewrite
- `ARCHITECTURE.md` - Update with new features

---

## Emergency Fallbacks

If running out of time, prioritize:

1. **Must Have** (Day 1-2)
   - SIWB working
   - Dead Man's Switch basic implementation

2. **Should Have** (Day 3)
   - vetKeys (can simplify to just encrypted storage)

3. **Nice to Have** (Day 4)
   - Polish animations
   - Advanced UI features

The video demo is CRITICAL - allocate at least 4 hours for recording and editing.

---

## Resources

- [ic-siwb Documentation](https://github.com/AstroxNetwork/ic-siwb)
- [vetKeys Developer Docs](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/encryption/vetkeys)
- [Threshold Signatures](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/signatures/t-schnorr)
- [ckBTC Documentation](https://internetcomputer.org/docs/current/developer-docs/defi/ckbtc/)

---

Good luck! You have a strong foundation. These features will make your submission stand out.
