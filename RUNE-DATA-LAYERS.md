# Bitcoin Rune - Capas de Datos

## 🔴 CAPA 1: Bitcoin Blockchain (ON-CHAIN)

**Lo que se graba PERMANENTEMENTE en Bitcoin:**

```rust
RuneEtching {
    rune_name: "QUANTUM•LEAP",    // ✅ En blockchain
    symbol: "QLEP",               // ✅ En blockchain
    divisibility: 8,              // ✅ En blockchain
    premine: 1000000,             // ✅ En blockchain
    terms: {
        amount: 100,              // ✅ En blockchain
        cap: 10000000,            // ✅ En blockchain
        height_start: None,       // ✅ En blockchain
        height_end: None,         // ✅ En blockchain
    }
}
```

**Formato real en Bitcoin:** Runestone (OP_RETURN)
**Costo:** ~20,000 sats (fees de Bitcoin)
**Permanencia:** PARA SIEMPRE
**Validación:** Toda la red Bitcoin

---

## 🟠 CAPA 2: IPFS (OFF-CHAIN Descentralizado)

**Metadata adicional que QURI sube a IPFS:**

```json
{
  "name": "QUANTUM•LEAP",
  "symbol": "QLEP",
  "image": "ipfs://Qm...",           // ❌ NO en Bitcoin
  "description": "El primer...",    // ❌ NO en Bitcoin
  "external_url": "https://...",    // ❌ NO en Bitcoin
  "attributes": [                   // ❌ NO en Bitcoin
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    }
  ],
  "properties": {
    "supply": "1000000",
    "divisibility": 8,
    "creator": "0x..."
  }
}
```

**Formato:** JSON estándar (compatible con OpenSea/NFTs)
**Costo:** Gratis (Pinata free tier)
**Permanencia:** Mientras alguien lo "pinee" (IPFS)
**Validación:** Hash criptográfico (CID)

---

## 🟢 CAPA 3: Registry Canister (ON-CHAIN ICP)

**Índice que conecta ambas capas:**

```rust
RuneMetadata {
    rune_id: "840000:1",              // ID de Bitcoin
    name: "QUANTUM•LEAP",              // Duplicado para búsqueda
    symbol: "QLEP",                    // Duplicado para búsqueda
    
    // Link a metadata IPFS
    metadata_uri: "ipfs://Qm...",      // ← Conecta a CAPA 2
    
    // Data de Bitcoin
    divisibility: 8,
    total_supply: 11000000,
    premine: 1000000,
    mint_cap: 10000000,
    
    // Tracking
    creator: Principal,
    created_at: 1234567890,
    txid: "abc123...",                 // TX de Bitcoin
}
```

**Formato:** Rust struct en ICP stable memory
**Costo:** Casi gratis (cycles de ICP)
**Permanencia:** Mientras el canister exista
**Validación:** Canister smart contract

---

## 🎯 Flujo Completo de Creación

```
1. FRONTEND
   ├─ Usuario llena formulario
   ├─ Sube imagen
   └─ Click "Create Rune"
   
2. IPFS UPLOAD (Capa 2)
   ├─ Sube imagen → ipfs://QmImage...
   ├─ Genera metadata.json
   └─ Sube metadata → ipfs://QmMeta...
   
3. BITCOIN ETCHING (Capa 1)
   ├─ Construye Runestone con solo:
   │  ├─ name, symbol, divisibility
   │  ├─ premine, mint terms
   │  └─ (NO imagen, NO descripción)
   ├─ Firma con Threshold Schnorr
   └─ Broadcast a Bitcoin → TXID
   
4. REGISTRY INDEXING (Capa 3)
   ├─ Guarda en ICP canister:
   │  ├─ Datos de Bitcoin (CAPA 1)
   │  ├─ Link a IPFS (CAPA 2)
   │  └─ Metadata del creador
   └─ Ahora visible en QURI DEX/Explorer
```

---

## ❓ FAQ

### ¿Por qué no poner TODO en Bitcoin?

**Razón 1 - COSTO:**
- Subir 1 KB a Bitcoin ≈ 10,000 sats (~$5)
- Imagen 500KB ≈ 5,000,000 sats (~$2,500) 💸
- IPFS = GRATIS

**Razón 2 - ESPACIO:**
- Bitcoin blockchain debe ser liviana
- Nodos completos deben descargarlo todo
- OP_RETURN tiene límite de 80 bytes

**Razón 3 - FLEXIBILIDAD:**
- Bitcoin data es INMUTABLE (no se puede cambiar NUNCA)
- IPFS metadata puede actualizarse si es necesario
- Puedes agregar más info después

### ¿Es seguro usar IPFS?

**Sí, porque:**
1. Content-addressed (hash del contenido = dirección)
2. Si cambias 1 pixel, hash completamente diferente
3. Mismo sistema que OpenSea, Uniswap, etc.
4. Múltiples nodos pueden "pinear" (replicar)

### ¿Qué pasa si IPFS cae?

- El Rune en Bitcoin sigue funcionando 100%
- Solo pierdes la imagen/metadata visual
- Puedes re-subir con mismo contenido (mismo hash)
- El token es TOTALMENTE funcional sin metadata

### ¿Por qué atributos si no son NFTs?

**Marketing y branding:**
- Rarity: "Genesis Edition" → más valor percibido
- Utility: "Governance Token" → explica función
- Backed by: "Real Estate" → confianza
- Collection: "Serie 1 de 10" → exclusividad

Es **opcional** pero ayuda a posicionar tu token.

---

## 🏆 Ventajas del Sistema Híbrido

| Aspecto | Solo Bitcoin | Bitcoin + IPFS (QURI) |
|---------|--------------|------------------------|
| **Costo** | ~20k sats | ~20k sats (igual) |
| **Funcionalidad** | 100% | 100% |
| **Branding** | ❌ Ninguno | ✅ Logo, descripción |
| **Discoverable** | Solo by ID | ✅ Por nombre, imagen |
| **UX en DEX** | Solo texto | ✅ Visual atractivo |
| **Profesionalismo** | Básico | ✅ Enterprise-grade |

---

## 🎨 Ejemplo Visual

### Sin metadata IPFS:
```
DEX/Explorer muestra:
QUANTUM•LEAP
Symbol: QLEP
Supply: 11,000,000
[Fin]
```

### Con metadata IPFS (QURI):
```
DEX/Explorer muestra:
┌─────────────────┐
│  [LOGO IMAGEN]  │  QUANTUM•LEAP
│                 │  Symbol: QLEP
│    ⭐⭐⭐⭐⭐    │  Supply: 11,000,000
└─────────────────┘  
                     "El primer token de física cuántica..."
                     
                     🌐 Website: quantumleap.io
                     
                     Attributes:
                     • Rarity: Legendary
                     • Collection: Genesis
                     • Utility: Governance
```

**¿Cuál se ve más profesional?** 🎯

---

## ✅ Conclusión

**Los atributos/metadata NO son parte del protocolo Bitcoin Runes oficial.**

QURI los agregó como **capa de presentación** para:
1. Mejorar UX
2. Marketing más efectivo
3. Compatibilidad con estándares NFT (para futuros marketplaces)
4. Diferenciación competitiva

**El Rune funciona 100% sin ellos**, pero se ve y se vende mejor con ellos.

Es como tener una empresa:
- **Solo Bitcoin** = Registrar legalmente la empresa ✅
- **Bitcoin + IPFS** = Registrar la empresa + Logo + Website + Branding ✨
