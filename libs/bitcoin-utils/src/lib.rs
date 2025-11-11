pub mod address;
pub mod transaction;
pub mod script;

use thiserror::Error;

#[derive(Error, Debug)]
pub enum BitcoinUtilsError {
    #[error("Invalid address: {0}")]
    InvalidAddress(String),

    #[error("Invalid public key: {0}")]
    InvalidPublicKey(String),

    #[error("Transaction error: {0}")]
    TransactionError(String),

    #[error("Script error: {0}")]
    ScriptError(String),

    #[error("Encoding error: {0}")]
    EncodingError(String),
}

pub type Result<T> = std::result::Result<T, BitcoinUtilsError>;
