// 🎓 MÓDULOS PÚBLICOS
pub mod etching;
pub mod runestone;
pub mod tag; // Módulo Tag exportado públicamente

// Re-exportar Tag para fácil acceso
pub use tag::Tag;

use quri_types::RuneEtching;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum RunesError {
    #[error("Invalid rune name: {0}")]
    InvalidName(String),

    #[error("Invalid runestone: {0}")]
    InvalidRunestone(String),

    #[error("Encoding error: {0}")]
    EncodingError(String),
}

pub type Result<T> = std::result::Result<T, RunesError>;

/// Build a runestone for a Rune etching
pub fn build_runestone(etching: &RuneEtching) -> Result<Vec<u8>> {
    runestone::build_etching_runestone(etching)
}

/// Parse a runestone from bytes
pub fn parse_runestone(data: &[u8]) -> Result<Runestone> {
    runestone::parse_runestone(data)
}

/// Runestone structure
#[derive(Debug, Clone)]
pub struct Runestone {
    pub edicts: Vec<Edict>,
    pub etching: Option<EtchingSpec>,
    pub mint: Option<RuneId>,
    pub pointer: Option<u32>,
}

/// Edict (transfer instruction)
#[derive(Debug, Clone)]
pub struct Edict {
    pub id: RuneId,
    pub amount: u128,
    pub output: u32,
}

/// Etching specification
#[derive(Debug, Clone)]
pub struct EtchingSpec {
    pub divisibility: u8,
    pub premine: u128,
    pub rune: Option<String>,
    pub spacers: u32,
    pub symbol: Option<char>,
    pub terms: Option<Terms>,
}

/// Mint terms
#[derive(Debug, Clone)]
pub struct Terms {
    pub amount: u128,
    pub cap: u128,
    pub height: Option<(u64, u64)>,
    pub offset: Option<(u64, u64)>,
}

/// Rune ID (block:tx)
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuneId {
    pub block: u64,
    pub tx: u32,
}

impl RuneId {
    pub fn new(block: u64, tx: u32) -> Self {
        Self { block, tx }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use quri_types::RuneEtching;

    #[test]
    fn test_build_runestone() {
        let etching = RuneEtching {
            rune_name: "TESTCOIN".to_string(),
            symbol: "TST".to_string(),
            divisibility: 8,
            premine: 1000,
            terms: None,
        };

        let runestone = build_runestone(&etching);
        assert!(runestone.is_ok());
    }
}
