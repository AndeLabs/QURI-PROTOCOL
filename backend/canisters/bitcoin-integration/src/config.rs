/*!
 * Configuration Module para Bitcoin Integration
 * 
 * Maneja configuraciones sensibles al entorno (testnet vs mainnet)
 */

/// Retorna el Schnorr key ID apropiado según el feature flag
/// 
/// ## Key IDs en ICP
/// 
/// - `dfx_test_key`: SOLO para desarrollo local con dfx
/// - `test_key_1`: Para testnet (playground)
/// - `key_1`: Para MAINNET (producción)
/// 
/// ## CRÍTICO ⚠️
/// 
/// Usar `dfx_test_key` en mainnet causará:
/// - ❌ Firmas inválidas
/// - ❌ Transacciones rechazadas
/// - ❌ Fondos potencialmente bloqueados
/// 
/// ## Feature Flags
/// 
/// ```toml
/// # Cargo.toml
/// [features]
/// mainnet = []
/// testnet = []
/// default = [] # local development
/// ```
/// 
/// ## Uso
/// 
/// ```rust
/// let key_id = get_schnorr_key_id();
/// // En local: "dfx_test_key"
/// // En testnet: "test_key_1"  
/// // En mainnet: "key_1"
/// ```
pub fn get_schnorr_key_id() -> &'static str {
    #[cfg(feature = "mainnet")]
    {
        "key_1"
    }
    
    #[cfg(all(feature = "testnet", not(feature = "mainnet")))]
    {
        "test_key_1"
    }
    
    #[cfg(not(any(feature = "mainnet", feature = "testnet")))]
    {
        "dfx_test_key"
    }
}

/// Retorna el cycle cost para operaciones Schnorr
/// 
/// ## Cycle Costs (ICP Management Canister)
/// 
/// - `schnorr_public_key`: 26_153_846_153 cycles
/// - `sign_with_schnorr`: 26_153_846_153 cycles
/// 
/// Fuente: https://internetcomputer.org/docs/current/developer-docs/gas-cost
pub fn get_schnorr_cycles_cost() -> u128 {
    26_153_846_153
}

/// Log de configuración al inicio
pub fn log_config() {
    let key_id = get_schnorr_key_id();
    let env = if cfg!(feature = "mainnet") {
        "MAINNET"
    } else if cfg!(feature = "testnet") {
        "TESTNET"
    } else {
        "LOCAL"
    };
    
    ic_cdk::println!("🔧 Bitcoin Integration Config:");
    ic_cdk::println!("   Environment: {}", env);
    ic_cdk::println!("   Schnorr Key ID: {}", key_id);
    ic_cdk::println!("   Schnorr Cycles: {} per call", get_schnorr_cycles_cost());
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_local_key_id() {
        // En tests sin features, debe ser dfx_test_key
        #[cfg(not(any(feature = "mainnet", feature = "testnet")))]
        {
            assert_eq!(get_schnorr_key_id(), "dfx_test_key");
        }
    }
    
    #[test]
    fn test_cycles_cost() {
        assert_eq!(get_schnorr_cycles_cost(), 26_153_846_153);
    }
}
