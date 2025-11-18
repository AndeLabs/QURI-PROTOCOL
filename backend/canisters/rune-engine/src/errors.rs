use thiserror::Error;

/// Comprehensive error types for etching flow
#[derive(Error, Debug, Clone)]
pub enum EtchingError {
    // Validation Errors
    #[error("Invalid rune name: {0}")]
    InvalidRuneName(String),

    #[error("Invalid symbol: {0}")]
    InvalidSymbol(String),

    #[error("Invalid divisibility: {0} (must be 0-18)")]
    InvalidDivisibility(u8),

    #[error("Invalid supply: {0}")]
    InvalidSupply(String),

    #[error("Premine exceeds total supply")]
    PremineExceedsSupply,

    #[error("Invalid mint terms: {0}")]
    InvalidMintTerms(String),

    // Financial Errors
    #[error("Insufficient ckBTC balance: have {have}, need {need}")]
    InsufficientBalance { have: u64, need: u64 },

    #[error("Insufficient UTXOs: {0}")]
    InsufficientUtxos(String),

    #[error("Fee too high: {0} sats")]
    FeeTooHigh(u64),

    // Transaction Errors
    #[error("Failed to build transaction: {0}")]
    TransactionBuildFailed(String),

    #[error("Failed to construct transaction: {0}")]
    TxConstructionFailed(String),

    #[error("Failed to sign transaction: {0}")]
    SigningFailed(String),

    #[error("Failed to broadcast transaction: {0}")]
    BroadcastFailed(String),

    #[error("Transaction rejected by network: {0}")]
    NetworkRejected(String),

    // State Errors
    #[error("Invalid state transition: from {from} to {to}")]
    InvalidStateTransition { from: String, to: String },

    #[error("Etching already in progress: {0}")]
    EtchingInProgress(String),

    #[error("Etching not found: {0}")]
    EtchingNotFound(String),

    // System Errors
    #[error("Rate limit exceeded: retry after {0} seconds")]
    RateLimitExceeded(u64),

    #[error("Internal error: {0}")]
    InternalError(String),

    #[error("Timeout: operation took too long")]
    Timeout,

    // Integration Errors
    #[error("Bitcoin API error: {0}")]
    BitcoinApiError(String),

    #[error("ckBTC ledger error: {0}")]
    CkBtcError(String),

    #[error("Schnorr signature error: {0}")]
    SchnorrError(String),
}

impl EtchingError {
    /// Check if error is retryable
    pub fn is_retryable(&self) -> bool {
        matches!(
            self,
            EtchingError::Timeout
                | EtchingError::BitcoinApiError(_)
                | EtchingError::NetworkRejected(_)
                | EtchingError::InternalError(_)
        )
    }

    /// Get retry delay in seconds
    pub fn retry_delay(&self) -> Option<u64> {
        match self {
            EtchingError::RateLimitExceeded(delay) => Some(*delay),
            EtchingError::Timeout => Some(30),
            EtchingError::BitcoinApiError(_) => Some(10),
            _ => None,
        }
    }

    /// Convert to user-friendly message
    pub fn user_message(&self) -> String {
        match self {
            EtchingError::InsufficientBalance { have, need } => {
                format!(
                    "Not enough ckBTC. You have {} sats but need {} sats",
                    have, need
                )
            }
            EtchingError::RateLimitExceeded(secs) => {
                format!("Too many requests. Please wait {} seconds", secs)
            }
            EtchingError::InvalidRuneName(msg) => {
                format!("Invalid Rune name: {}", msg)
            }
            _ => self.to_string(),
        }
    }
}

/// Result type for etching operations
pub type EtchingResult<T> = Result<T, EtchingError>;
