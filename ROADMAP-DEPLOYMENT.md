# 🗺️ QURI Protocol - Roadmap de Deployment a Producción

## 📅 Cronograma Estimado: 2-3 Semanas

Este roadmap detalla los pasos para llevar QURI Protocol desde el código actual (100% implementado) hasta mainnet production-ready.

---

## 🎯 Fase 1: Preparación Pre-Deployment (Días 1-3)

### ✅ Completado
- [x] Implementar RBAC
- [x] Implementar session keys seguros
- [x] Implementar paginación
- [x] Implementar confirmation tracking (con placeholder)
- [x] Implementar dynamic fees
- [x] Crear scripts de deployment
- [x] Crear documentación completa

### 🔨 Pendiente

#### Día 1: Completar Confirmation Tracking
**Prioridad**: 🔴 CRÍTICA

**Tarea**: Reemplazar placeholder en `confirmation_tracker.rs`

**Opciones de implementación**:

**Opción A: HTTPS Outcalls a Blockstream API** (Recomendado para MVP)
```rust
async fn get_transaction_confirmations(
    txid: &str, 
    network: BitcoinNetwork
) -> Result<u32, String> {
    let base_url = match network {
        BitcoinNetwork::Mainnet => "https://blockstream.info/api",
        BitcoinNetwork::Testnet => "https://blockstream.info/testnet/api",
        _ => return Err("Unsupported network".to_string()),
    };

    let url = format!("{}/tx/{}", base_url, txid);
    
    let request = CanisterHttpRequestArgument {
        url,
        max_response_bytes: Some(1024),
        method: HttpMethod::GET,
        headers: vec![],
        body: None,
        transform: None,
    };

    let response = http_request(request)
        .await
        .map_err(|e| format!("HTTP request failed: {:?}", e))?;

    // Parse JSON response
    let body = String::from_utf8(response.body)
        .map_err(|e| format!("Invalid UTF-8: {}", e))?;
    
    // Extract confirmations from JSON
    // {"confirmations": 6, "block_height": 850000, ...}
    parse_confirmations_from_json(&body)
}

fn parse_confirmations_from_json(json: &str) -> Result<u32, String> {
    // Implementar JSON parsing
    // Puede usar serde_json o parsing manual
    // Buscar "confirmations": NUMBER en el JSON
}
```

**Pros**:
- ✅ Simple de implementar
- ✅ No requiere infraestructura adicional
- ✅ APIs públicas gratuitas

**Contras**:
- ❌ Dependencia externa (Blockstream)
- ❌ Consume cycles por HTTPS outcall (~3B cycles/request)
- ❌ Rate limits posibles

**Costo estimado**: ~3B cycles/confirmation check × 144 checks/día = ~432B cycles/día (~13T/mes) = **~$17 USD/mes**

---

**Opción B: Bitcoin Integration get_utxos()** (Más nativo ICP)
```rust
async fn get_transaction_confirmations(
    txid: &str,
    network: BitcoinNetwork
) -> Result<u32, String> {
    let bitcoin_canister = crate::get_bitcoin_integration_id()?;
    
    // Necesitas conocer algún address del output de la tx
    // Esto requiere parsear la tx primero
    
    let ic_network = convert_network(network);
    
    let request = GetUtxosRequest {
        address: tx_output_address, // ← Necesitas obtener esto
        network: ic_network,
        filter: Some(UtxoFilter::MinConfirmations(0)),
    };
    
    let result: Result<(GetUtxosResponse,), _> = ic_cdk::call(
        bitcoin_canister,
        "bitcoin_get_utxos",
        (request,)
    ).await;
    
    match result {
        Ok((response,)) => {
            // Buscar la UTXO que corresponde a esta tx
            for utxo in response.utxos {
                if utxo.outpoint.txid == decode_txid(txid)? {
                    return Ok(utxo.confirmations);
                }
            }
            Err("UTXO not found".to_string())
        }
        Err(e) => Err(format!("Bitcoin API error: {:?}", e)),
    }
}
```

**Pros**:
- ✅ Nativo de ICP
- ✅ No dependencias externas
- ✅ Más confiable

**Contras**:
- ❌ Más complejo de implementar
- ❌ Requiere conocer el output address de la tx
- ❌ Consume más cycles

---

**Opción C: Custom Indexer Canister** (Mejor para escala)
```rust
// Deploy un canister separado que indexa bloques Bitcoin
// y mantiene un cache de confirmaciones

// indexer canister
async fn index_bitcoin_blocks() {
    // Periódicamente fetch nuevos bloques
    // Store tx confirmations en StableBTreeMap
}

// En confirmation_tracker.rs
async fn get_transaction_confirmations(
    txid: &str,
    network: BitcoinNetwork
) -> Result<u32, String> {
    let indexer_canister = get_indexer_id()?;
    
    let result: Result<(u32,), _> = ic_cdk::call(
        indexer_canister,
        "get_confirmations",
        (txid.to_string(),)
    ).await;
    
    result.map(|(confirmations,)| confirmations)
        .map_err(|e| format!("Indexer error: {:?}", e))
}
```

**Pros**:
- ✅ Más eficiente para muchas txs
- ✅ Cache local rápido
- ✅ Escalable

**Contras**:
- ❌ Requiere canister adicional
- ❌ Más complejo de mantener
- ❌ Costo inicial de desarrollo

---

**🎯 RECOMENDACIÓN: Opción A (HTTPS Outcalls) para MVP**

**Estimación de tiempo**: 4-6 horas de desarrollo + testing

**Pasos**:
1. Implementar `get_transaction_confirmations()` con HTTPS outcalls
2. Añadir dependency `ic-http-request` en Cargo.toml
3. Implementar JSON parsing para extraer confirmations
4. Testing con txids reales en testnet
5. Añadir error handling robusto

#### Día 2: Testing Local y Preparación

**Tareas**:
- [ ] Build todo el proyecto: `dfx build --all`
- [ ] Fix cualquier warning o error de compilación
- [ ] Ejecutar tests unitarios (si existen)
- [ ] Verificar que todos los .did files están actualizados
- [ ] Preparar identidad de deployment segura

**Comandos**:
```bash
# Build
cargo build --target wasm32-unknown-unknown --release

# Check warnings
cargo clippy --all-targets

# Generate .did files
dfx build --all

# Verificar .did updated
git diff canisters/*/src/*.did
```

#### Día 3: Preparación de Identidades

**Tareas**:
- [ ] Crear identidad de producción con keyring
- [ ] Documentar principals para Owner/Admin
- [ ] Conseguir cycles para deployment (>5T recomendado)
- [ ] Configurar cycle wallet

**Comandos**:
```bash
# Crear identidad segura
dfx identity new production --storage-mode=keyring

# Get principal
dfx identity use production
dfx identity get-principal

# Configurar wallet con cycles
dfx wallet --network ic balance
```

---

## 🧪 Fase 2: Deployment a Testnet (Días 4-7)

### Día 4: Deploy a IC Testnet

**Objetivo**: Verificar que todo funciona en un entorno real de ICP

**Pasos**:
```bash
# 1. Switch a identidad de producción
dfx identity use production

# 2. Deploy a testnet
./scripts/deploy-production.sh ic-testnet

# 3. Verificar deployment exitoso
./scripts/test-deployment.sh ic-testnet

# 4. Verificar timers en logs
dfx canister logs rune-engine --network ic-testnet
```

**Checklist**:
- [ ] Health check retorna healthy=true
- [ ] Bitcoin Integration configurado
- [ ] Registry configurado
- [ ] Owner principal correcto
- [ ] Fee estimates cacheados (después de 10 min)
- [ ] Timers visibles en logs

### Día 5: Testing End-to-End en Testnet

**Objetivo**: Crear un Rune completo de inicio a fin

**Pasos**:
```bash
# 1. Crear un Rune de prueba
dfx canister call rune-engine create_rune \
  '(record {
    rune_name = "TEST•RUNE•2025";
    symbol = "TEST";
    divisibility = 8;
    premine = 21000000;
    terms = null;
  })' \
  --network ic-testnet

# 2. Obtener process ID del resultado
PROCESS_ID="<id-retornado>"

# 3. Monitorear estado cada 5 minutos
watch -n 300 'dfx canister call rune-engine get_etching_status \
  "(\"$PROCESS_ID\")" --network ic-testnet'

# 4. Verificar confirmations tracking
dfx canister call rune-engine get_confirmation_status \
  '("<txid>")' --network ic-testnet
```

**Validaciones**:
- [ ] Process creado exitosamente
- [ ] TX broadcast a Bitcoin testnet
- [ ] Confirmation tracking iniciado
- [ ] Después de N confirmaciones → estado CONFIRMED
- [ ] Rune aparece en registry

### Día 6: Testing de RBAC y Permisos

**Objetivo**: Verificar que RBAC funciona correctamente

**Pasos**:
```bash
# 1. Crear identidad de test sin permisos
dfx identity new test-user
dfx identity use test-user
TEST_USER_PRINCIPAL=$(dfx identity get-principal)

# 2. Intentar acción admin (debe fallar)
dfx canister call rune-engine update_etching_config \
  '(record {...})' --network ic-testnet
# Esperar: Error "Admin privileges required"

# 3. Volver a owner
dfx identity use production

# 4. Otorgar rol Admin a test-user
dfx canister call rune-engine grant_role \
  "(principal \"$TEST_USER_PRINCIPAL\", variant { Admin })" \
  --network ic-testnet

# 5. Verificar que test-user ahora puede
dfx identity use test-user
dfx canister call rune-engine update_etching_config \
  '(record {...})' --network ic-testnet
# Esperar: Ok

# 6. Intentar revocar owner (debe fallar)
dfx canister call rune-engine revoke_role \
  "(principal \"<owner-principal>\")" --network ic-testnet
# Esperar: Error "Cannot revoke Owner role"

# 7. Listar todos los roles
dfx canister call rune-engine list_roles --network ic-testnet
```

**Validaciones**:
- [ ] User sin rol no puede ejecutar funciones admin
- [ ] Admin puede ejecutar funciones admin
- [ ] Owner no puede ser revocado
- [ ] Admin puede otorgar Operator
- [ ] Admin NO puede otorgar Admin (solo Owner puede)
- [ ] list_roles retorna audit trail correcto

### Día 7: Performance y Load Testing

**Objetivo**: Verificar comportamiento bajo carga

**Tareas**:
- [ ] Crear múltiples Runes en paralelo (10+)
- [ ] Queries de búsqueda con pagination
- [ ] Verificar memory usage no crece indefinidamente
- [ ] Monitorear cycle consumption

**Scripts de load testing**:
```bash
# Crear 10 Runes en paralelo
for i in {1..10}; do
  dfx canister call rune-engine create_rune \
    "(record {
      rune_name = \"TEST•RUNE•$i\";
      symbol = \"TST$i\";
      divisibility = 8;
      premine = 1000000;
      terms = null;
    })" \
    --network ic-testnet &
done
wait

# Búsquedas paginadas
for offset in {0..100..20}; do
  dfx canister call registry search_runes \
    '("TEST", '$offset', 20)' --network ic-testnet
done
```

**Métricas a monitorear**:
- Response time < 2s para creates
- Response time < 500ms para queries
- Memory usage estable
- Cycle cost por operación

---

## 🚀 Fase 3: Pre-Mainnet (Días 8-14)

### Día 8-9: Security Review

**Objetivo**: Verificar seguridad antes de mainnet

**Checklist de seguridad**:

**RBAC**:
- [ ] Owner está configurado correctamente
- [ ] Al menos 2 Admins configurados (redundancia)
- [ ] Funciones críticas requieren Admin
- [ ] No hay hardcoded principals en código
- [ ] Audit trail funciona

**Session Keys**:
- [ ] `raw_rand()` funciona correctamente
- [ ] Session keys no son predecibles
- [ ] Rate limiting funciona

**Access Control**:
- [ ] Anonymous principal bloqueado en funciones críticas
- [ ] No hay backdoors o funciones sin protección
- [ ] Logs no exponen información sensible

**Bitcoin Integration**:
- [ ] Confirmations tracking real implementado
- [ ] Timeouts configurados apropiadamente
- [ ] No hay hardcoded addresses o keys

**Code Review**:
- [ ] No `unwrap()` en paths críticos
- [ ] Todos los `TODO` resueltos o documentados
- [ ] Error handling robusto
- [ ] No hay debug prints con información sensible

### Día 10-11: Documentation Review

**Objetivo**: Documentación completa para usuarios y devs

**Checklist**:
- [ ] README.md actualizado
- [ ] API documentation (Candid .did files)
- [ ] Deployment guide (PRODUCCION-READY-IMPLEMENTADO.md)
- [ ] User guide para crear Runes
- [ ] Admin guide para RBAC
- [ ] Troubleshooting guide
- [ ] Changelog con todas las mejoras

### Día 12-13: Dry-Run de Mainnet Deployment

**Objetivo**: Simular deployment a mainnet en testnet

**Pasos**:
```bash
# 1. Limpiar testnet
dfx canister install rune-engine --mode reinstall --network ic-testnet
dfx canister install registry --mode reinstall --network ic-testnet
dfx canister install identity-manager --mode reinstall --network ic-testnet
dfx canister install bitcoin-integration --mode reinstall --network ic-testnet

# 2. Execute deployment script (mismo que usarás en mainnet)
./scripts/deploy-production.sh ic-testnet

# 3. Execute post-deployment verification
./scripts/test-deployment.sh ic-testnet

# 4. Verificar que TODOS los tests pasan
# 5. Documentar cualquier issue encontrado
# 6. Fix issues y repetir
```

### Día 14: Pre-Launch Checklist Final

**Objetivo**: Verificación final antes de mainnet

**Infraestructura**:
- [ ] Cycles wallet con >10T cycles (buffer)
- [ ] Monitoring dashboard configurado
- [ ] Alert system (Telegram/Discord/Email)
- [ ] Backup de identidades críticas
- [ ] Disaster recovery plan documentado

**Canisters**:
- [ ] Todos los canisters buildeados sin warnings
- [ ] Todos los tests passing
- [ ] Health checks passing
- [ ] Timers funcionando correctamente
- [ ] Confirmation tracking con implementación real (NO placeholder)

**Configuración**:
- [ ] Bitcoin network = Mainnet
- [ ] ckBTC ledger ID correcto (mainnet)
- [ ] Canister IDs documentados
- [ ] Owner/Admin principals documentados
- [ ] Emergency contacts documentados

**Comunicación**:
- [ ] Anuncio de launch preparado
- [ ] Canales de soporte configurados
- [ ] FAQs preparadas
- [ ] Known issues documentadas

---

## 🎯 Fase 4: Mainnet Launch (Días 15-16)

### Día 15: Deployment a Mainnet

**⚠️ MOMENTO CRÍTICO - Seguir pasos EXACTAMENTE**

#### Paso 1: Verificación Pre-Launch (9:00 AM)
```bash
# Verify identity
dfx identity use production
dfx identity whoami

# Verify cycles
dfx wallet --network ic balance
# Debe mostrar >10T cycles

# Verify network
echo "Deploying to MAINNET - Double check this is correct"
```

#### Paso 2: Deploy (9:30 AM)
```bash
# Execute deployment script
./scripts/deploy-production.sh ic

# Capturar TODOS los canister IDs
# DOCUMENTAR INMEDIATAMENTE en archivo seguro
```

**📋 Canister IDs (llenar durante deployment)**:
```
Rune Engine:         _____________________
Bitcoin Integration: _____________________
Registry:            _____________________
Identity Manager:    _____________________
Owner Principal:     _____________________
Deployment Time:     _____________________
```

#### Paso 3: Post-Deploy Verification (10:00 AM)
```bash
# Execute test suite
./scripts/test-deployment.sh ic

# TODOS los tests deben pasar
# Si alguno falla, evaluar si es blocker para launch
```

#### Paso 4: Configuration (10:30 AM)
```bash
# Añadir Admin secundario (backup)
dfx canister call rune-engine grant_role \
  '(principal "<backup-admin>", variant { Admin })' \
  --network ic

# Verificar configuración
dfx canister call rune-engine health_check --network ic
dfx canister call rune-engine list_roles --network ic
dfx canister call rune-engine get_current_fee_estimates --network ic
```

#### Paso 5: Monitoring Setup (11:00 AM)
```bash
# Start monitoring loops
# Terminal 1: Logs
while true; do
  dfx canister logs rune-engine --network ic
  sleep 300  # Every 5 min
done

# Terminal 2: Health checks
while true; do
  dfx canister call rune-engine health_check --network ic
  dfx canister call rune-engine pending_confirmation_count --network ic
  sleep 600  # Every 10 min
done

# Terminal 3: Cycle monitoring
while true; do
  dfx canister status rune-engine --network ic
  sleep 3600  # Every hour
done
```

### Día 16: Post-Launch Monitoring

**Primera 24h - Monitoreo Intensivo**

**Métricas a vigilar**:
- Cycle consumption rate
- Memory usage
- Timer execution (logs cada 10 min)
- Fee estimates updating
- Confirmations tracking working
- Error rates
- Response times

**Checklist horaria** (primeras 8 horas):
- [ ] Timers corriendo (verificar logs)
- [ ] Fee cache actualizado
- [ ] No memory leaks
- [ ] Cycle consumption dentro de esperado
- [ ] No errors críticos en logs

**Actions si algo falla**:
1. **Fee manager no actualiza**: Verificar Bitcoin Integration responde
2. **Confirmation tracker no funciona**: Revisar implementación HTTPS outcalls
3. **Memory leak**: Considerar cleanup_old_processes
4. **Cycles depletion rápido**: Identificar operación costosa, optimizar
5. **Errors críticos**: Evaluar si requiere hotfix o puede esperar

---

## 📊 Fase 5: Post-Launch (Días 17-21)

### Día 17-18: Primeras Transacciones Reales

**Launch gradual recomendado**:

**Día 17**: Allowlist (10 usuarios)
- Invitar 10 usuarios de confianza
- Crear primeros Runes en mainnet
- Monitorear end-to-end flow
- Recolectar feedback

**Día 18**: Beta abierta (100 usuarios)
- Abrir a comunidad beta testers
- Más volumen de transacciones
- Verificar escalabilidad
- Fix quick wins si hay issues menores

### Día 19-20: Monitoring Dashboard

**Crear dashboard con métricas clave**:

```bash
# scripts/dashboard.sh
#!/bin/bash

echo "=== QURI Production Dashboard ==="
echo "Last updated: $(date)"
echo ""

echo "🏥 HEALTH STATUS"
dfx canister call rune-engine health_check --network ic
echo ""

echo "💰 CYCLES STATUS"
dfx canister status rune-engine --network ic | grep -E "Balance|Memory"
echo ""

echo "⏳ PENDING OPERATIONS"
echo "Confirmations: $(dfx canister call rune-engine pending_confirmation_count --network ic)"
echo ""

echo "💸 FEE ESTIMATES"
dfx canister call rune-engine get_current_fee_estimates --network ic
echo ""

echo "👥 ROLES"
dfx canister call rune-engine list_roles --network ic | grep -c "principal"
echo "Total roles configured: $(dfx canister call rune-engine list_roles --network ic | grep -c "principal")"
echo ""

echo "📊 REGISTRY STATS"
dfx canister call registry get_stats --network ic
```

### Día 21: Launch Público

**Si todo está estable**:
- 🎉 Anuncio público
- 📢 Marketing push
- 📝 Blog post técnico
- 🐦 Social media
- 📚 User documentation
- 💬 Community support channels

---

## 🔄 Mantenimiento Continuo

### Weekly Tasks
- [ ] Review cycle consumption trends
- [ ] Monitor fee optimization savings
- [ ] Review security logs
- [ ] Backup configuration
- [ ] Update documentation si hay cambios

### Monthly Tasks
- [ ] Security review
- [ ] Performance optimization
- [ ] Cost analysis
- [ ] Upgrade planning
- [ ] User feedback review

### Quarterly Tasks
- [ ] Major version upgrade planning
- [ ] Security audit (externo)
- [ ] Infrastructure review
- [ ] Disaster recovery drill

---

## 📞 Emergency Contacts

**Documentar ANTES de mainnet launch**:

```
Owner Principal: _____________________
Backup Admin 1:  _____________________
Backup Admin 2:  _____________________

Emergency Contacts:
- Technical Lead: _____________________
- Security Lead:  _____________________
- Operations:     _____________________

Communication Channels:
- Telegram/Discord: _____________________
- Email:            _____________________
- Status Page:      _____________________
```

---

## ✅ Success Criteria

**Launch es exitoso si**:
- ✅ Todos los canisters deployed y healthy
- ✅ Primeros 10 Runes creados exitosamente
- ✅ Confirmations tracking funcionando
- ✅ Fee estimates actualizándose
- ✅ RBAC protegiendo funciones admin
- ✅ No critical errors en logs
- ✅ Cycle consumption dentro de estimado
- ✅ User feedback positivo

---

**🎉 ¡LISTO PARA LAUNCH!**

Con este roadmap, QURI Protocol estará en mainnet production-ready en 2-3 semanas.

**Próximo paso inmediato**: Día 1 - Implementar confirmations tracking real (reemplazar placeholder).
