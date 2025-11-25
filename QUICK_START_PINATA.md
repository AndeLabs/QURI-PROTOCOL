# Quick Start: Pinata Secure Upload

## Para Desarrolladores (5 minutos)

### 1. Configurar Variables de Entorno

```bash
# Crear archivo .env.local si no existe
cd frontend
cp .env.example .env.local

# Editar y agregar tu Pinata JWT
nano .env.local
```

Agregar:
```bash
PINATA_JWT=tu-pinata-jwt-aqui
```

### 2. Usar en tu Componente React

```typescript
'use client';

import { usePinata } from '@/hooks/usePinata';

export function MyUploadComponent() {
  const { uploadFile, isUploading, error } = usePinata();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadFile(file);
      console.log('Uploaded to IPFS:', result.ipfsUrl);
      // ✅ Success! Use result.ipfsUrl or result.gatewayUrl
    } catch (err) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

### 3. Ejecutar el Proyecto

```bash
npm run dev
# Abre http://localhost:3000
```

¡Listo! Ya puedes subir archivos a IPFS de forma segura.

---

## Para DevOps (Deploy a Producción)

### Vercel

1. **Dashboard:** Ir a https://vercel.com/dashboard
2. **Settings:** Proyecto → Settings → Environment Variables
3. **Agregar:**
   - Name: `PINATA_JWT`
   - Value: Tu Pinata JWT
   - Environments: Production, Preview, Development
4. **Redeploy:** `vercel --prod`

### Docker

```dockerfile
ENV PINATA_JWT=${PINATA_JWT}
```

```bash
docker build --build-arg PINATA_JWT=tu-jwt .
```

---

## Ejemplos Rápidos

### Upload Simple
```typescript
const { uploadFile } = usePinata();
const result = await uploadFile(file);
console.log(result.ipfsUrl); // ipfs://Qm...
```

### Upload con Progreso
```typescript
const { uploadFile } = usePinata();
const result = await uploadFile(file, (progress) => {
  console.log(`${progress.percentage}% uploaded`);
});
```

### Upload Imagen + Metadata
```typescript
const { uploadRuneAssets } = usePinata();
const { imageUpload, metadataUpload } = await uploadRuneAssets(imageFile, {
  name: 'My NFT',
  symbol: 'NFT',
  description: 'Cool NFT',
});
```

---

## Verificar Instalación

```bash
./scripts/verify-pinata-security.sh
```

Debe mostrar: ✅ TODAS LAS VERIFICACIONES PASARON

---

## Troubleshooting

### "Configuración de IPFS inválida"
```bash
# Verifica que PINATA_JWT existe
echo $PINATA_JWT

# Si no existe, agrégalo a .env.local
echo "PINATA_JWT=tu-jwt" >> frontend/.env.local
```

### "Rate limit alcanzado"
Espera 60 segundos. Límites: 10 archivos/min, 20 JSON/min

---

## Documentación Completa

- **Técnica:** `/frontend/app/api/pinata/README.md`
- **Migración:** `/docs/MIGRATION_PINATA_SECURITY.md`
- **Implementación:** `/PINATA_SECURITY_IMPLEMENTATION.md`
- **Ejemplos:** `/frontend/app/api/pinata/EXAMPLE_USAGE.tsx`

---

## Obtener Pinata JWT

1. Ir a https://app.pinata.cloud/
2. Sign up / Login
3. API Keys → New Key
4. Permissions: `pinFileToIPFS`, `pinJSONToIPFS`
5. Create Key
6. Copiar el JWT (empieza con `eyJ...`)

---

**Listo para producción.** 🚀
