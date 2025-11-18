# 🏆 QURI Protocol - Estrategia para Ganar el Hackathon

## 📊 Análisis de Requisitos del Hackathon

### Criterios de Evaluación (Prioridad)
1. **Advanced Transaction Signing** ⭐⭐⭐ (Nuestro fuerte)
   - ✅ Threshold Schnorr para Taproot
   - ✅ Runes etching con BIP-341
   - ⚠️ Necesitamos: Demo funcional end-to-end

2. **ckBTC Integration** ⭐⭐⭐ (CRÍTICO)
   - ❌ No implementado
   - 🎯 PRIORIDAD #1: Integrar para pagos

3. **Direct Bitcoin Access** ⭐⭐
   - ✅ Arquitectura lista
   - ⚠️ Necesitamos: Indexer para leer Runes

4. **Innovation & Utility** ⭐⭐⭐
   - ✅ Zero-fee launchpad (único)
   - ✅ Self-custody
   - 🎯 Agregar: Bonding curves + Discovery

---

## 🎯 Ventajas Competitivas vs Otros Proyectos

### Lo Que Nos Diferencia
1. **Zero Platform Fees** (vs competidores que cobran 2-5%)
2. **Threshold Schnorr** (seguridad superior)
3. **Instant Finality** (ICP 1-2 sec vs Ethereum 12 sec)
4. **Self-Custody** (no custodial, no wrapping)

### Competencia Directa
- **Luminex**: Runes trading (no launchpad)
- **Odin.fun**: Memecoins (no Runes nativos)
- **BRC-20 platforms**: Outdated tech (Ordinals, no Runes)

---

## 🚀 Plan de Implementación (12 días hasta deadline)

### FASE 1: Core Features (Días 1-5) ⚡ CRÍTICO
#### A. Completar Flujo de Etching End-to-End
- [x] Transaction construction (BIP-341) ✅
- [x] Schnorr signatures ✅
- [ ] **UTXO selection algorithm**
- [ ] **Broadcast a Bitcoin network**
- [ ] **Transaction confirmation tracking**

#### B. ckBTC Integration (PRIORIDAD #1)
- [ ] **ckBTC deposit (BTC → ckBTC)**
- [ ] **ckBTC payment for etching fees**
- [ ] **ckBTC balance tracking**
- [ ] **ckBTC withdraw (ckBTC → BTC)**

**Impacto**: Sin ckBTC, el jurado verá el proyecto como incompleto. **MUST HAVE**.

#### C. Runes Indexer
- [ ] **Parse Bitcoin blocks para Runes**
- [ ] **Indexar etchings existentes**
- [ ] **API para query Runes**
- [ ] **Cache en stable memory**

**Por qué**: Necesitamos mostrar Runes existentes + validar que nuestro etching funciona.

---

### FASE 2: Features Diferenciadores (Días 6-8) 🎨
#### A. Bonding Curve Launchpad
- [ ] **Linear bonding curve (MVP)**
- [ ] **Price discovery automático**
- [ ] **Instant trading post-etching**

**Por qué**: Esto es **GOLD** para el jurado. Combina DeFi + Runes de forma innovadora.

#### B. Discovery & Marketplace
- [ ] **List de Runes trending**
- [ ] **Search por nombre/symbol**
- [ ] **Rune details page (supply, holders, etc.)**

**Por qué**: UX superior = más puntos.

---

### FASE 3: Polish & Demo (Días 9-12) 🎬
#### A. Frontend Mínimo (NECESARIO para demo)
- [ ] **Landing page**
- [ ] **Etching form**
- [ ] **Runes explorer**
- [ ] **Wallet connect (Plug/NFID)**

**Por qué**: Video demo sin frontend = pérdida automática.

#### B. Documentation
- [ ] **Professional README**
- [ ] **Architecture diagram**
- [ ] **API docs**
- [ ] **Deployment guide**

#### C. Video Demo (3 minutos)
```
0:00-0:30  Problem: Current Runes launchpads have high fees, custodial risk
0:30-1:00  Solution: QURI = zero-fee, self-custody, ICP-powered
1:00-2:00  Demo: Live etching + bonding curve + trading
2:00-2:30  Tech: Threshold Schnorr, ckBTC, indexer
2:30-3:00  Future: Celestia rollup, cross-chain
```

---

## 🔧 Implementación Técnica Detallada

### 1. ckBTC Integration Architecture
```
User Deposits BTC
      ↓
  BTC Minter Canister (ICP native)
      ↓
  User receives ckBTC (1:1)
      ↓
  Pay etching fee (0.001 ckBTC)
      ↓
  Etching executed
      ↓
  Change returned in ckBTC
```

**APIs Necesarias**:
- `get_btc_address(principal)` → derivar BTC address para deposit
- `update_balance()` → sync ckBTC balance desde ledger
- `transfer_ckbtc()` → pagar fees

### 2. Runes Indexer Architecture
```
Bitcoin Block
      ↓
  Filter OP_RETURN outputs
      ↓
  Check for OP_13 (magic number)
      ↓
  Parse runestone (LEB128)
      ↓
  Store in StableBTreeMap
      ↓
  Expose via Candid API
```

**Data Model**:
```rust
struct IndexedRune {
    id: RuneId,           // block:tx
    name: String,
    symbol: String,
    supply: u128,
    divisibility: u8,
    etching_block: u64,
    etching_txid: String,
}
```

### 3. Bonding Curve (Linear MVP)
```rust
price = base_price + (supply_sold * slope)

// Example:
base_price = 0.0001 ckBTC
slope = 0.00001 ckBTC per token
supply_sold = 1000 tokens
→ current_price = 0.0001 + (1000 * 0.00001) = 0.011 ckBTC
```

**Por qué lineal**: Simple, predecible, fácil de auditar.

---

## 📈 Roadmap para Después del Hackathon

### Phase 1: Post-Hackathon (Weeks 1-4)
- Advanced bonding curves (exponential, sigmoid)
- Multi-sig vaults
- Governance token ($QURI)

### Phase 2: Celestia Integration (Months 2-3)
- Deploy sovereign rollup
- Cross-chain bridges (Ethereum, Solana)
- Runes liquidity pools

### Phase 3: Full DeFi Suite (Months 4-6)
- Lending/borrowing with Runes collateral
- Perpetuals trading
- Options/derivatives

---

## 🎯 Success Metrics for Demo Day

### Must Show
1. ✅ **Live etching** on Bitcoin testnet
2. ✅ **ckBTC payment** flow
3. ✅ **Indexer** showing existing Runes
4. ✅ **Bonding curve** price discovery
5. ✅ **Transaction signed** with threshold Schnorr

### Wow Factors
- **Real-time Bitcoin block monitoring**
- **Sub-second finality** (ICP vs Bitcoin 10 min)
- **Zero custody** (threshold signatures)
- **Comparison chart**: QURI vs Competitors (fees, speed, security)

---

## 💰 Pitch para los Jueces

### Opening Hook (10 sec)
> "Runes are the future of Bitcoin tokens. But current launchpads charge 5% fees and require custody. **QURI changes this.**"

### Problem (20 sec)
- Existing Runes launchpads: high fees (2-5%)
- Custodial risk (hold your BTC)
- Slow (10+ min confirmations)
- No price discovery mechanism

### Solution (30 sec)
- **Zero platform fees** (only Bitcoin network fees)
- **Self-custody** via threshold Schnorr
- **Instant finality** (ICP 1-2 sec)
- **Built-in bonding curves** for fair launch

### Tech Demo (60 sec)
[LIVE DEMO]

### Differentiation (30 sec)
- Only launchpad using **threshold Schnorr** (BIP-341)
- Only platform with **native ckBTC integration**
- Only solution with **instant price discovery**

### Future Vision (20 sec)
- Celestia sovereign rollup (Q1 2025)
- Cross-chain Runes (Ethereum, Solana)
- Full BTCFi suite (lending, perps, options)

---

## 📋 Checklist Final (Pre-Submission)

### Code Quality
- [ ] All features working end-to-end
- [ ] No TODOs in critical paths
- [ ] Unit tests for core functions
- [ ] Integration tests for flows

### Documentation
- [ ] README with clear setup instructions
- [ ] Architecture diagram (visual)
- [ ] API documentation (Candid)
- [ ] Video demo (3 min, high quality)

### Deployment
- [ ] Deployed to ICP mainnet or testnet
- [ ] Bitcoin testnet integration working
- [ ] Frontend accessible via URL
- [ ] Demo wallet funded with ckBTC

### Presentation
- [ ] Slides prepared (backup for demo failure)
- [ ] Practice demo 3+ times
- [ ] Q&A preparation (common objections)
- [ ] Team member roles assigned

---

## 🚨 Risk Mitigation

### Risk #1: ckBTC integration fails
**Mitigation**: Use mock ckBTC ledger for demo, show architecture

### Risk #2: Bitcoin testnet is slow
**Mitigation**: Pre-mine transactions, use regtest for demo

### Risk #3: Indexer not ready
**Mitigation**: Hardcode sample Runes for demo

### Risk #4: Frontend not polished
**Mitigation**: Focus on core flow, use minimal UI library (Tailwind)

---

## 🏁 Conclusión

**Para ganar necesitamos**:
1. ✅ Core tech sólido (ya tenemos base)
2. ⚡ ckBTC integration (PRIORIDAD)
3. 📊 Runes indexer (diferenciador)
4. 🎨 Bonding curves (innovación)
5. 🎬 Demo impecable (presentación)

**Timeline agresivo pero alcanzable**: 12 días, enfoque láser en features críticos.

**Ventaja competitiva**: Somos el único proyecto combinando Runes + Threshold Schnorr + ckBTC + Bonding Curves.

Let's win this! 🚀
