use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// 🎓 MÓDULOS
mod rune_key;
mod rune_metadata;
mod validation;
mod storable_impl;
mod pagination;

#[cfg(test)]
mod rune_key_tests;
#[cfg(test)]
mod validation_tests;
#[cfg(test)]
mod rune_metadata_tests;

// Re-exports públicos
pub use rune_key::{RuneKey, ParseError as RuneKeyParseError};
pub use rune_metadata::{RuneMetadata, RuneMetadataBuilder};
pub use validation::*;
pub use pagination::*;

/// Bitcoin network types
#[derive(CandidType, Deserialize, Serialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum BitcoinNetwork {
    Mainnet,
    Testnet,
    Regtest,
}

/// DEPRECATED: Use RuneKey instead
/// 
/// Este tipo queda por compatibilidad temporal pero NO debe usarse
/// como key en StableBTreeMap porque tiene String (unbounded)
#[deprecated(since = "0.2.0", note = "Use RuneKey for StableBTreeMap keys")]
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub struct RuneId {
    pub block: u64,
    pub tx: u64,
    pub name: String,
    pub timestamp: u64,
}

/// Configuration for creating a new Rune
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneConfig {
    pub name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub total_supply: u64,
    pub premine: u64,
    pub terms: Option<MintTerms>,
}

/// Mint terms for open minting
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct MintTerms {
    pub amount: u64,
    pub cap: u64,
    pub height_start: Option<u64>,
    pub height_end: Option<u64>,
    pub offset_start: Option<u64>,
    pub offset_end: Option<u64>,
}

// NOTA: RuneMetadata ahora se define en rune_metadata.rs
// y se re-exporta arriba para mantener la API pública igual

/// Bitcoin address with derivation path
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BitcoinAddress {
    pub address: String,
    pub derivation_path: Vec<Vec<u8>>,
}

/// Rune etching parameters for Bitcoin L1
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneEtching {
    pub rune_name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub premine: u64,
    pub terms: Option<MintTerms>,
}

/// Bitcoin transaction wrapper
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Transaction {
    pub txid: String,
    pub raw_tx: Vec<u8>,
    pub confirmations: u32,
}

/// UTXO (Unspent Transaction Output)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct Utxo {
    pub outpoint: OutPoint,
    pub value: u64,
    pub height: u32,
}

/// Transaction outpoint
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct OutPoint {
    pub txid: Vec<u8>,
    pub vout: u32,
}

/// Result of UTXO selection for transaction building
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UtxoSelection {
    pub selected: Vec<Utxo>,
    pub total_value: u64,
    pub estimated_fee: u64,
    pub change: u64,
}

/// Fee estimates from Bitcoin network
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct FeeEstimates {
    pub slow: u64,   // sat/vbyte
    pub medium: u64, // sat/vbyte
    pub fast: u64,   // sat/vbyte
}

/// User session for session keys feature (inspired by Odin.fun)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct UserSession {
    pub principal: Principal,
    pub session_key: Vec<u8>,
    pub expires_at: u64,
    pub permissions: SessionPermissions,
}

/// Permissions for session keys
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct SessionPermissions {
    pub can_create_rune: bool,
    pub can_transfer: bool,
    pub max_amount: u64,
}

/// Bonding curve parameters (inspired by Odin.fun)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct BondingCurve {
    pub initial_price: u64,
    pub target_market_cap: u64, // e.g., 1 BTC
    pub current_supply: u64,
    pub graduated_to_amm: bool,
}

/// Registry entry for tracking Runes
#[deprecated(since = "0.2.0", note = "Use RegistryEntry with RuneKey")]
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RegistryEntryLegacy {
    pub rune_id: RuneId,
    pub metadata: RuneMetadata,
    pub bonding_curve: Option<BondingCurve>,
    pub trading_volume_24h: u64,
    pub holder_count: u64,
}

/// NEW: RegistryEntry con RuneKey (embedded in metadata)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RegistryEntry {
    pub metadata: RuneMetadata,
    pub bonding_curve: Option<BondingCurve>,
    pub trading_volume_24h: u64,
    pub holder_count: u64,
    pub indexed_at: u64,
}

/// Error types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub enum QuriError {
    InvalidRuneName(String),
    InvalidDivisibility,
    InsufficientBalance,
    TransactionFailed(String),
    UnauthorizedAccess,
    SessionExpired,
    InvalidSignature,
}

impl std::fmt::Display for QuriError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            QuriError::InvalidRuneName(name) => write!(f, "Invalid rune name: {}", name),
            QuriError::InvalidDivisibility => write!(f, "Divisibility must be 0-38"),
            QuriError::InsufficientBalance => write!(f, "Insufficient balance"),
            QuriError::TransactionFailed(msg) => write!(f, "Transaction failed: {}", msg),
            QuriError::UnauthorizedAccess => write!(f, "Unauthorized access"),
            QuriError::SessionExpired => write!(f, "Session expired"),
            QuriError::InvalidSignature => write!(f, "Invalid signature"),
        }
    }
}

impl std::error::Error for QuriError {}

// ============================================
// Dead Man's Switch Types
// ============================================

/// Dead Man's Switch configuration
/// Automatically transfers Runes to beneficiary if owner doesn't check in
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DeadManSwitch {
    /// Unique identifier
    pub id: u64,
    /// Owner's principal
    pub owner: Principal,
    /// Beneficiary Bitcoin address (receives Runes on trigger)
    pub beneficiary: String,
    /// Rune identifier to transfer
    pub rune_id: String,
    /// Amount of Runes to transfer
    pub amount: u128,
    /// Last check-in timestamp (nanoseconds since epoch)
    pub last_checkin: u64,
    /// Timeout period in nanoseconds
    pub timeout_ns: u64,
    /// Whether the switch has been triggered
    pub triggered: bool,
    /// Creation timestamp
    pub created_at: u64,
    /// Optional message for beneficiary
    pub message: Option<String>,
}

/// Parameters for creating a Dead Man's Switch
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct CreateDeadManSwitchParams {
    /// Beneficiary Bitcoin address
    pub beneficiary: String,
    /// Rune to transfer
    pub rune_id: String,
    /// Amount to transfer
    pub amount: u128,
    /// Timeout in days (1-365)
    pub timeout_days: u64,
    /// Optional message for beneficiary
    pub message: Option<String>,
}

/// Status of a Dead Man's Switch
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub enum SwitchStatus {
    /// Switch is active and owner has checked in recently
    Active,
    /// Switch timeout has expired (owner hasn't checked in)
    Expired,
    /// Switch has been triggered and transfer executed
    Triggered,
    /// Switch was cancelled by owner
    Cancelled,
}

/// Response for Dead Man's Switch queries
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DeadManSwitchInfo {
    pub switch: DeadManSwitch,
    pub status: SwitchStatus,
    /// Time remaining until expiration (nanoseconds)
    pub time_remaining_ns: u64,
    /// Percentage of time elapsed
    pub elapsed_percentage: u8,
}

/// Summary statistics for Dead Man's Switches
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct DeadManSwitchStats {
    pub total_switches: u64,
    pub active_switches: u64,
    pub triggered_switches: u64,
    pub total_value_protected: u128,
}

// ============================================
// vetKeys Encrypted Metadata Types
// ============================================

/// Encrypted metadata for a Rune (using vetKeys)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct EncryptedRuneMetadata {
    /// Rune identifier
    pub rune_id: String,
    /// Encrypted data blob
    pub encrypted_data: Vec<u8>,
    /// Nonce used for encryption
    pub nonce: Vec<u8>,
    /// Optional time-based reveal (nanoseconds since epoch)
    pub reveal_time: Option<u64>,
    /// Owner who can decrypt before reveal time
    pub owner: Principal,
    /// Creation timestamp
    pub created_at: u64,
}

/// Parameters for storing encrypted metadata
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct StoreEncryptedMetadataParams {
    pub rune_id: String,
    pub encrypted_data: Vec<u8>,
    pub nonce: Vec<u8>,
    pub reveal_time: Option<u64>,
}
