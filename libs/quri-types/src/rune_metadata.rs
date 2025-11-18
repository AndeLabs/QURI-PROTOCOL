/*!
 * RuneMetadata - Metadata completa con Builder Pattern
 * 
 * Implementa el patrón Builder con validación en compile-time
 */

use candid::{CandidType, Deserialize, Principal};
use serde::Serialize;
use crate::{RuneKey, MintTerms, ValidationError};
use crate::validation::*;

/// Metadata completa de un Rune
///
/// ## Diseño
///
/// - `key`: RuneKey bounded (block:tx) - identificador único
/// - `name`: Nombre del Rune (1-26 chars, uppercase + bullets)
/// - `symbol`: Ticker (1-10 chars, uppercase)
/// - `divisibility`: Decimales (0-38)
/// - `total_supply`: Supply total (> 0)
/// - `premine`: Cantidad pre-minada (<= total_supply)
/// - `creator`: Principal que creó el Rune
/// - `created_at`: Timestamp de creación (nanosegundos)
/// - `terms`: Términos de mint opcional (open minting)
#[derive(CandidType, Deserialize, Serialize, Clone, Debug)]
pub struct RuneMetadata {
    pub key: RuneKey,
    pub name: String,
    pub symbol: String,
    pub divisibility: u8,
    pub total_supply: u128,
    pub premine: u128,
    pub creator: Principal,
    pub created_at: u64,
    pub terms: Option<MintTerms>,
}

impl RuneMetadata {
    /// Crea un builder para construir RuneMetadata con validación
    ///
    /// ## Ejemplo
    ///
    /// ```rust
    /// use quri_types::{RuneKey, RuneMetadata};
    /// use candid::Principal;
    ///
    /// let key = RuneKey::new(840000, 1);
    /// let creator = Principal::from_text("aaaaa-aa").unwrap();
    ///
    /// let metadata = RuneMetadata::builder(key, "BITCOIN")
    ///     .symbol("BTC")
    ///     .divisibility(8)?
    ///     .total_supply(21_000_000)?
    ///     .premine(1_000_000)
    ///     .build(creator)?;
    /// ```
    pub fn builder(key: RuneKey, name: impl Into<String>) -> RuneMetadataBuilder {
        RuneMetadataBuilder::new(key, name)
    }
}

// ============================================================================
// BUILDER PATTERN
// ============================================================================

/// Builder para RuneMetadata con validación
///
/// ## Pattern
///
/// El Builder Pattern permite:
/// 1. **API Ergonómica**: Encadenar métodos (.symbol().divisibility()...)
/// 2. **Validación Incremental**: Cada setter valida su input
/// 3. **Valores por Defecto**: Campos opcionales con defaults razonables
/// 4. **Error Handling**: build() retorna Result con todos los errores
///
/// ## Ventajas sobre Constructor
///
/// ```rust
/// // ❌ Constructor tradicional: propenso a errores
/// RuneMetadata {
///     key,
///     name: "bitcoin".to_string(), // ❌ Minúsculas - error en runtime
///     divisibility: 50, // ❌ Fuera de rango - error en runtime
///     // ... 8 campos más
/// }
///
/// // ✅ Builder: errores en compile-time + validación
/// RuneMetadata::builder(key, "BITCOIN")
///     .divisibility(50)? // ❌ Error aquí mismo, inmediato
///     .build(creator)?
/// ```
#[derive(Debug)]
pub struct RuneMetadataBuilder {
    key: RuneKey,
    name: String,
    symbol: Option<String>,
    divisibility: u8,
    total_supply: u128,
    premine: u128,
    terms: Option<MintTerms>,
}

impl RuneMetadataBuilder {
    /// Crea un nuevo builder
    ///
    /// ## Validación Inmediata
    ///
    /// El nombre se valida al crear el builder, no al final.
    /// Esto da feedback inmediato al desarrollador.
    pub fn new(key: RuneKey, name: impl Into<String>) -> Self {
        Self {
            key,
            name: name.into(),
            symbol: None,
            divisibility: 0,        // Default: no decimals
            total_supply: 0,        // Will be validated in build()
            premine: 0,
            terms: None,
        }
    }
    
    /// Set symbol (ticker)
    ///
    /// Si no se especifica, usará el name como symbol
    pub fn symbol(mut self, symbol: impl Into<String>) -> Self {
        self.symbol = Some(symbol.into());
        self
    }
    
    /// Set divisibility con validación
    ///
    /// ## Validación
    ///
    /// - Debe ser 0-38 (límite del protocolo Runes)
    /// - Retorna error inmediatamente si fuera de rango
    ///
    /// ## Ejemplos
    ///
    /// - 0 = enteros (como satoshis sin decimales)
    /// - 8 = como Bitcoin (1 BTC = 100,000,000 sats)
    /// - 18 = como Ethereum (1 ETH = 10^18 wei)
    pub fn divisibility(mut self, div: u8) -> Result<Self, ValidationError> {
        validate_divisibility(div)?;
        self.divisibility = div;
        Ok(self)
    }
    
    /// Set total supply con validación
    ///
    /// ## Validación
    ///
    /// - Debe ser > 0
    /// - No debe causar overflow
    pub fn total_supply(mut self, supply: u128) -> Result<Self, ValidationError> {
        validate_amount(supply)?;
        if supply == 0 {
            return Err(ValidationError::ZeroTotalSupply);
        }
        self.total_supply = supply;
        Ok(self)
    }
    
    /// Set premine amount
    ///
    /// ## Nota
    ///
    /// La validación de premine <= total_supply se hace en build()
    /// porque necesitamos ambos valores
    pub fn premine(mut self, amount: u128) -> Self {
        self.premine = amount;
        self
    }
    
    /// Set mint terms para open minting
    ///
    /// ## Validación
    ///
    /// Valida que los términos sean coherentes:
    /// - amount > 0
    /// - cap > 0
    /// - height_start < height_end
    /// - offset_start < offset_end
    pub fn mint_terms(mut self, terms: MintTerms) -> Result<Self, ValidationError> {
        validate_mint_terms(&terms)?;
        self.terms = Some(terms);
        Ok(self)
    }
    
    /// Construye RuneMetadata con validación final
    ///
    /// ## Validaciones Finales
    ///
    /// 1. Valida nombre (1-26 chars, uppercase + bullets)
    /// 2. Valida símbolo (1-10 chars, uppercase)
    /// 3. Valida invariante: premine <= total_supply
    /// 4. Genera timestamp actual
    ///
    /// ## Errores
    ///
    /// Retorna el PRIMER error encontrado.
    /// Los errores son descriptivos y fáciles de debuggear.
    pub fn build(self, creator: Principal) -> Result<RuneMetadata, ValidationError> {
        // Validar nombre
        validate_rune_name(&self.name)?;
        
        // Validar o generar símbolo
        let symbol = if let Some(sym) = self.symbol {
            validate_symbol(&sym)?;
            sym
        } else {
            // Default: usar name como symbol (truncado a 10 chars)
            let sym = self.name.chars().take(10).collect::<String>();
            validate_symbol(&sym)?;
            sym
        };
        
        // Validar invariante: premine <= total_supply
        validate_supply(self.total_supply, self.premine)?;
        
        // Timestamp actual
        let created_at = ic_cdk::api::time();
        
        Ok(RuneMetadata {
            key: self.key,
            name: self.name,
            symbol,
            divisibility: self.divisibility,
            total_supply: self.total_supply,
            premine: self.premine,
            creator,
            created_at,
            terms: self.terms,
        })
    }
    
    /// Build con timestamp específico (para testing)
    #[cfg(test)]
    pub fn build_with_timestamp(
        self,
        creator: Principal,
        timestamp: u64,
    ) -> Result<RuneMetadata, ValidationError> {
        validate_rune_name(&self.name)?;
        
        let symbol = if let Some(sym) = self.symbol {
            validate_symbol(&sym)?;
            sym
        } else {
            let sym = self.name.chars().take(10).collect::<String>();
            validate_symbol(&sym)?;
            sym
        };
        
        validate_supply(self.total_supply, self.premine)?;
        
        Ok(RuneMetadata {
            key: self.key,
            name: self.name,
            symbol,
            divisibility: self.divisibility,
            total_supply: self.total_supply,
            premine: self.premine,
            creator,
            created_at: timestamp,
            terms: self.terms,
        })
    }
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    fn test_principal() -> Principal {
        Principal::from_text("aaaaa-aa").unwrap()
    }
    
    fn test_key() -> RuneKey {
        RuneKey::new(840000, 1)
    }
    
    #[test]
    fn test_builder_basic() {
        let metadata = RuneMetadata::builder(test_key(), "BITCOIN")
            .symbol("BTC")
            .divisibility(8).unwrap()
            .total_supply(21_000_000).unwrap()
            .premine(1_000_000)
            .build_with_timestamp(test_principal(), 1234567890)
            .unwrap();
        
        assert_eq!(metadata.name, "BITCOIN");
        assert_eq!(metadata.symbol, "BTC");
        assert_eq!(metadata.divisibility, 8);
        assert_eq!(metadata.total_supply, 21_000_000);
        assert_eq!(metadata.premine, 1_000_000);
    }
    
    #[test]
    fn test_builder_with_defaults() {
        let metadata = RuneMetadata::builder(test_key(), "QURI")
            .total_supply(1_000_000).unwrap()
            .build_with_timestamp(test_principal(), 1234567890)
            .unwrap();
        
        // Symbol defaults to name
        assert_eq!(metadata.symbol, "QURI");
        // Divisibility defaults to 0
        assert_eq!(metadata.divisibility, 0);
        // Premine defaults to 0
        assert_eq!(metadata.premine, 0);
    }
    
    #[test]
    fn test_builder_invalid_name() {
        let result = RuneMetadata::builder(test_key(), "bitcoin") // lowercase
            .total_supply(1_000_000).unwrap()
            .build(test_principal());
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ValidationError::InvalidRuneName(_)));
    }
    
    #[test]
    fn test_builder_invalid_divisibility() {
        let result = RuneMetadata::builder(test_key(), "BITCOIN")
            .divisibility(50); // > 38
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ValidationError::DivisibilityOutOfRange(50)));
    }
    
    #[test]
    fn test_builder_premine_exceeds_supply() {
        let result = RuneMetadata::builder(test_key(), "BITCOIN")
            .total_supply(1_000_000).unwrap()
            .premine(2_000_000) // > total_supply
            .build(test_principal());
        
        assert!(result.is_err());
        assert!(matches!(
            result.unwrap_err(),
            ValidationError::PremineExceedsSupply(2_000_000, 1_000_000)
        ));
    }
    
    #[test]
    fn test_builder_zero_supply() {
        let result = RuneMetadata::builder(test_key(), "BITCOIN")
            .total_supply(0);
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ValidationError::ZeroTotalSupply));
    }
    
    #[test]
    fn test_builder_with_mint_terms() {
        let terms = MintTerms {
            amount: 100,
            cap: 1000,
            height_start: Some(840000),
            height_end: Some(850000),
            offset_start: None,
            offset_end: None,
        };
        
        let metadata = RuneMetadata::builder(test_key(), "BITCOIN")
            .total_supply(100_000).unwrap()
            .mint_terms(terms.clone()).unwrap()
            .build_with_timestamp(test_principal(), 1234567890)
            .unwrap();
        
        assert!(metadata.terms.is_some());
        assert_eq!(metadata.terms.unwrap().amount, 100);
    }
    
    #[test]
    fn test_builder_invalid_mint_terms() {
        let invalid_terms = MintTerms {
            amount: 0, // ❌ Invalid: must be > 0
            cap: 1000,
            height_start: None,
            height_end: None,
            offset_start: None,
            offset_end: None,
        };
        
        let result = RuneMetadata::builder(test_key(), "BITCOIN")
            .total_supply(100_000).unwrap()
            .mint_terms(invalid_terms);
        
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), ValidationError::ZeroMintAmount));
    }
}
