use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;

// 🎓 MÓDULO: Implementaciones de Storable trait
// Este módulo contiene las implementaciones del trait Storable
// para permitir que nuestros tipos se guarden en Stable Memory
mod storable_impl;

/// Bitcoin network types
#[derive(CandidType, Deserialize, Serialize, Clone, Debug, PartialEq, Eq)]
pub enum BitcoinNetwork {
    Mainnet,
    Testnet,
    Regtest,
}

/// Unique identifier for a Rune
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

/// Metadata stored for each Rune
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneMetadata {
    pub id: RuneId,
    pub name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub creator: Principal,
    pub created_at: u64,
    pub total_supply: u64,
    pub premine: u64,
}

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
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RegistryEntry {
    pub rune_id: RuneId,
    pub metadata: RuneMetadata,
    pub bonding_curve: Option<BondingCurve>,
    pub trading_volume_24h: u64,
    pub holder_count: u64,
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
