# 🎨 Sistema de Almacenamiento de Assets y Metadata

## Resumen Ejecutivo

QURI Protocol utiliza un sistema de almacenamiento descentralizado multi-capa para garantizar la permanencia y accesibilidad de las imágenes y metadata de los Runes.

## 🏗️ Arquitectura de Almacenamiento

```
Usuario → Frontend → IPFS (Pinata) → Blockchain (Bitcoin + ICP)
   ↓                      ↓                    ↓
[Imagen]            [Metadata]           [Referencia]
```

### Componentes

1. **IPFS (InterPlanetary File System)**
   - Sistema de archivos distribuido peer-to-peer
   - Almacenamiento permanente e inmutable
   - Content-addressed (direccionado por hash)
   - Gateway: Pinata Cloud

2. **ICP Canisters**
   - Almacenamiento de referencias y metadata on-chain
   - Registry de todos los Runes creados
   - Asset Canister (opcional) para imágenes críticas

3. **Bitcoin Blockchain**
   - Referencia al Rune etched
   - Proof of existence
   - Inmutable y permanente

## 📦 Tipos de Datos Soportados

### 1. Imágenes (Artwork)

**Formatos Soportados:**
- JPEG / JPG
- PNG (con transparencia)
- GIF (animado o estático)
- WebP (optimizado)
- SVG (vectorial)

**Especificaciones:**
- Tamaño máximo: 10 MB
- Resolución recomendada: 1000x1000px (1:1 ratio)
- Resolución mínima: 400x400px
- Resolución óptima: 2000x2000px para alta calidad

**Proceso de Upload:**
```
1. Usuario selecciona imagen
2. Validación en frontend (tipo, tamaño)
3. Upload a IPFS via Pinata API
4. Retorno de hash IPFS: QmXxx...
5. Generación de URLs:
   - IPFS: ipfs://QmXxx
   - Gateway: https://gateway.pinata.cloud/ipfs/QmXxx
```

### 2. Metadata (JSON)

**Estructura Estándar (Compatible con OpenSea/Foundation.app):**
```json
{
  "name": "QUANTUM•LEAP",
  "symbol": "QLEP",
  "description": "A unique Bitcoin Rune representing...",
  "image": "ipfs://QmXxx.../image.png",
  "external_url": "https://yourproject.com",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": "Legendary"
    },
    {
      "trait_type": "Collection",
      "value": "Genesis"
    },
    {
      "trait_type": "Edition",
      "value": 1,
      "max_value": 100
    }
  ],
  "properties": {
    "supply": "1000000",
    "divisibility": 8,
    "creator": "bc1q...",
    "blockHeight": 840000,
    "network": "bitcoin",
    "standard": "runes"
  }
}
```

### 3. Atributos Personalizados

Los atributos son **completamente personalizables**:

**Tipos de Atributos:**

1. **Text Attributes**
   ```json
   { "trait_type": "Element", "value": "Fire" }
   ```

2. **Numeric Attributes**
   ```json
   { "trait_type": "Power Level", "value": 9500 }
   ```

3. **Ranking Attributes**
   ```json
   {
     "trait_type": "Rarity Score",
     "value": 85,
     "max_value": 100
   }
   ```

4. **Date Attributes**
   ```json
   {
     "trait_type": "Birthday",
     "value": 1704067200,
     "display_type": "date"
   }
   ```

**Ejemplos de Atributos Populares:**
- Rarity: Common, Rare, Epic, Legendary
- Collection: Genesis, Series 2, Limited Edition
- Artist: Creator name
- Edition: 1/100, 5/1000
- Color Scheme: Monochrome, Vibrant, Pastel
- Style: Abstract, Realistic, Minimalist
- Background: Solid, Gradient, Pattern
- Special Effects: Animated, Interactive, 3D

## 🔄 Flujo Completo de Creación

### Paso 1: Usuario Crea el Rune

```typescript
// 1. Usuario completa formulario
const formData = {
  rune_name: "QUANTUM•LEAP",
  symbol: "QLEP",
  divisibility: 8,
  premine: 1000000,
  description: "A revolutionary Bitcoin Rune...",
  attributes: [
    { trait_type: "Rarity", value: "Legendary" },
    { trait_type: "Edition", value: "1/100" }
  ]
};

// 2. Usuario selecciona imagen
const imageFile: File = selectedFromDisk;
```

### Paso 2: Upload a IPFS

```typescript
// 1. Upload imagen primero
const imageUpload = await uploadToIPFS(imageFile);
// Returns: {
//   ipfsHash: "QmXxx...",
//   ipfsUrl: "ipfs://QmXxx...",
//   gatewayUrl: "https://gateway.pinata.cloud/ipfs/QmXxx..."
// }

// 2. Crear metadata completo
const metadata: RuneMetadata = {
  name: formData.rune_name,
  symbol: formData.symbol,
  description: formData.description,
  image: imageUpload.gatewayUrl, // URL de la imagen
  attributes: formData.attributes,
  properties: {
    supply: formData.premine.toString(),
    divisibility: formData.divisibility,
    creator: userWalletAddress,
    blockHeight: currentBlockHeight,
  }
};

// 3. Upload metadata
const metadataUpload = await uploadMetadataToIPFS(metadata);
// Returns: {
//   ipfsHash: "QmYyy...",
//   ipfsUrl: "ipfs://QmYyy...",
//   gatewayUrl: "https://gateway.pinata.cloud/ipfs/QmYyy..."
// }
```

### Paso 3: Creación en Blockchain

```typescript
// 1. Llamar al canister de ICP
const runeId = await runeEngineActor.create_rune({
  rune_name: formData.rune_name,
  symbol: formData.symbol,
  divisibility: formData.divisibility,
  premine: BigInt(formData.premine),
  metadata_uri: metadataUpload.ipfsUrl, // ← IPFS reference
  terms: [], // optional minting terms
});

// 2. El canister crea la transacción de Bitcoin
// 3. El Rune es etched on-chain
// 4. Metadata permanece en IPFS
// 5. Referencia guardada en ICP Registry
```

## 🌐 Dónde se Guarda Cada Cosa

| Dato | Ubicación | Permanencia | Costo |
|------|-----------|-------------|-------|
| **Imagen** | IPFS (Pinata) | Permanente* | ~$0.15/GB/mes |
| **Metadata JSON** | IPFS (Pinata) | Permanente* | ~$0.15/GB/mes |
| **Referencia IPFS** | ICP Canister | Permanente | Cycles (muy bajo) |
| **Rune Etching** | Bitcoin Blockchain | Permanente | ~$50-200 (network fee) |
| **Registry Data** | ICP Canister | Permanente | Cycles (muy bajo) |

*Permanente mientras el servicio de pinning esté activo. Se recomienda hacer pin en múltiples servicios.

## 🔐 Seguridad y Redundancia

### Content Addressing (IPFS)

```
Imagen → Hash SHA-256 → QmXxx... (inmutable)
```

Si el contenido cambia, el hash cambia. Esto garantiza:
- ✅ Inmutabilidad
- ✅ Verificación de integridad
- ✅ Deduplicación automática

### Multiple Gateways

```typescript
// Tu imagen está disponible en múltiples gateways:
const gateways = [
  'https://gateway.pinata.cloud/ipfs/QmXxx',
  'https://ipfs.io/ipfs/QmXxx',
  'https://cloudflare-ipfs.com/ipfs/QmXxx',
  'https://dweb.link/ipfs/QmXxx',
];
```

### Backup Strategy Recomendado

1. **Primary Storage:** Pinata (pago, confiable)
2. **Backup 1:** NFT.Storage (gratis, protocol labs)
3. **Backup 2:** Web3.Storage (gratis, protocol labs)
4. **Backup 3:** ICP Asset Canister (opcional, para imágenes críticas)

## 💰 Costos Estimados

### Por Rune Creado:

```
1 Imagen (2MB promedio):
  - IPFS Upload: Gratis
  - Pinata Storage: $0.0003/mes
  - Metadata JSON (5KB): Despreciable

Bitcoin Transaction:
  - Network Fee: $50-200 (variable)
  - Etching Fee: Incluido en network fee

ICP Storage:
  - Cycles: ~0.0001 ICP (~$0.0001)

Total One-Time: ~$50-200 (principalmente Bitcoin)
Total Monthly: ~$0.0003/Rune (solo storage)
```

### Para 1,000 Runes:

- Storage IPFS: ~$0.30/mes
- ICP Cycles: ~$0.10/mes
- **Total: ~$0.40/mes** para todo el sistema

## 🛠️ Implementación Técnica

### Componentes Creados

1. **`lib/storage/ipfs.ts`**
   - `uploadToIPFS()` - Upload archivos
   - `uploadMetadataToIPFS()` - Upload JSON
   - `uploadRuneAssets()` - Upload completo
   - `validateImageFile()` - Validación
   - `ipfsToGatewayUrl()` - Conversión URLs

2. **`components/ImageUpload.tsx`**
   - Drag & drop interface
   - Preview de imagen
   - Progress bar durante upload
   - Validación en tiempo real
   - Diseño museum-grade

3. **`components/EnhancedEtchingForm.tsx`**
   - Formulario con tabs (Basic, Metadata, Attributes)
   - Upload de imagen integrado
   - Campos dinámicos para atributos
   - Preview en tiempo real
   - Manejo de errores elegante

### Configuración Requerida

```bash
# 1. Crear cuenta en Pinata
https://app.pinata.cloud/register

# 2. Generar API keys
https://app.pinata.cloud/developers/api-keys

# 3. Agregar a .env.local
NEXT_PUBLIC_PINATA_API_KEY=your-key-here
NEXT_PUBLIC_PINATA_SECRET_KEY=your-secret-here

# 4. (Opcional) Configurar custom gateway
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud
```

## 📊 Metadata Estándar vs Custom

### Campos Estándar (Requeridos/Recomendados)

Compatibles con OpenSea, Rarible, Foundation.app:

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "image": "string (required)",
  "external_url": "string (optional)",
  "attributes": "array (optional)"
}
```

### Campos Custom (QURI Specific)

```json
{
  "properties": {
    "supply": "string",
    "divisibility": "number",
    "creator": "string",
    "blockHeight": "number",
    "network": "bitcoin",
    "standard": "runes",
    "inscriptionId": "string (optional)",
    "etching_txid": "string"
  }
}
```

## 🚀 Próximos Pasos

### Funcionalidades Planificadas

1. **Batch Upload**
   - Crear múltiples Runes de una vez
   - CSV import para metadata
   - Generative art integration

2. **Media Avanzados**
   - Video (MP4, WebM)
   - Audio (MP3, WAV)
   - 3D Models (GLB, GLTF)
   - HTML interactivo

3. **Storage Redundancy**
   - Auto-backup a múltiples IPFS providers
   - ICP Asset Canister integration
   - Arweave permanente storage option

4. **Metadata Editor**
   - Edit after creation
   - Version control
   - Metadata migration tools

## 📚 Referencias

- [IPFS Documentation](https://docs.ipfs.tech/)
- [Pinata Docs](https://docs.pinata.cloud/)
- [OpenSea Metadata Standards](https://docs.opensea.io/docs/metadata-standards)
- [ERC-721 Metadata](https://eips.ethereum.org/EIPS/eip-721)
- [Bitcoin Runes Protocol](https://docs.ordinals.com/runes.html)

## 🆘 Soporte y Troubleshooting

### Errores Comunes

**1. "File too large"**
- Solución: Comprimir imagen a < 10MB
- Usar herramientas: TinyPNG, Squoosh, ImageOptim

**2. "Failed to upload to IPFS"**
- Verificar API keys de Pinata
- Verificar límites de rate (500 uploads/mes en free tier)

**3. "Invalid metadata format"**
- Verificar JSON syntax
- Usar validator: jsonlint.com

### Testing sin Pinata

El sistema incluye un modo mock para desarrollo:
```typescript
// Sin API keys configuradas, usa mock data
const mockUpload = await uploadToIPFS(file);
// Returns fake hash: QmMockXxx...
```

## 📝 Conclusión

El sistema de almacenamiento de QURI Protocol es:

✅ **Descentralizado** - IPFS + ICP + Bitcoin
✅ **Permanente** - Content-addressed immutable storage
✅ **Económico** - ~$0.0003/mes por Rune
✅ **Estándar** - Compatible con marketplaces NFT
✅ **Flexible** - Soporta múltiples formatos y metadata custom
✅ **Redundante** - Múltiples gateways y backups
✅ **Museum-Grade** - Diseño premium y profesional

**Tu arte está seguro en la red descentralizada para siempre.** 🎨✨
