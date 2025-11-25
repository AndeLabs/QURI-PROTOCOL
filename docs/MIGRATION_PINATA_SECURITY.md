# Migración de Seguridad: Pinata JWT Server-Side

## Resumen

Se movió el JWT de Pinata desde el lado del cliente (`NEXT_PUBLIC_PINATA_JWT`) al lado del servidor (`PINATA_JWT`) para mejorar la seguridad del proyecto QURI Protocol.

## Problema Original

```typescript
// ❌ INSEGURO: JWT expuesto en el navegador
const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;

const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  headers: {
    'Authorization': `Bearer ${jwt}`, // JWT visible en DevTools!
  },
  body: formData,
});
```

**Riesgos:**
- Cualquier usuario podía ver el JWT en las DevTools del navegador
- JWT visible en el código fuente del bundle JavaScript
- Posibilidad de abuso de la cuota de Pinata
- Sin control de rate limiting
- Sin autenticación del usuario

## Solución Implementada

```typescript
// ✅ SEGURO: JWT en servidor, cliente usa API routes
const { uploadFile } = usePinata();
const result = await uploadFile(file);

// Internamente:
// Browser -> /api/pinata/upload -> Pinata API
//                     ↑
//                 Usa PINATA_JWT
//                 (server-side only)
```

## Cambios Realizados

### 1. API Routes Server-Side

**Creados:**
- `/frontend/app/api/pinata/upload/route.ts` - Subida de archivos
- `/frontend/app/api/pinata/pin/route.ts` - Subida de JSON

**Características:**
- JWT guardado en `process.env.PINATA_JWT` (NO `NEXT_PUBLIC_*`)
- Rate limiting (10 req/min para archivos, 20 req/min para JSON)
- Validación de archivos (tamaño, tipo)
- Manejo de errores robusto
- Logging detallado

### 2. Hook React (usePinata)

**Creado:** `/frontend/hooks/usePinata.ts`

```typescript
const { uploadFile, uploadMetadata, uploadRuneAssets, isUploading, error } = usePinata();

// Subir imagen
const imageResult = await uploadFile(imageFile, (progress) => {
  console.log(`${progress.percentage}% uploaded`);
});

// Subir metadata
const metadataResult = await uploadMetadata({
  name: 'MyRune',
  symbol: 'RUNE',
  image: imageResult.ipfsUrl,
});

// O todo junto
const { imageUpload, metadataUpload } = await uploadRuneAssets(imageFile, metadata);
```

### 3. Variables de Entorno

**Antes (.env.production):**
```bash
NEXT_PUBLIC_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Después (.env.production):**
```bash
# SECURITY: Server-side only - NOT exposed to browser
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Actualización de pinata-storage.ts

El archivo `/frontend/lib/storage/pinata-storage.ts` ahora:
- Está marcado como **DEPRECATED**
- Usa los API routes internamente (backwards compatibility)
- Recomienda usar el hook `usePinata` en su lugar

## Guía de Migración

### Para Desarrolladores

#### Opción 1: Usar el Hook (Recomendado)

```typescript
// Antes
import { uploadToPinata, uploadMetadataToPinata } from '@/lib/storage/pinata-storage';

const imageResult = await uploadToPinata(file);
const metadataResult = await uploadMetadataToPinata(metadata);

// Después
import { usePinata } from '@/hooks/usePinata';

function MyComponent() {
  const { uploadFile, uploadMetadata, isUploading, error } = usePinata();

  const handleUpload = async () => {
    const imageResult = await uploadFile(file);
    const metadataResult = await uploadMetadata(metadata);
  };
}
```

#### Opción 2: Seguir Usando pinata-storage (Compatibilidad)

```typescript
// NO requiere cambios de código
import { uploadToPinata } from '@/lib/storage/pinata-storage';

// Sigue funcionando, pero ahora usa API routes internamente
const result = await uploadToPinata(file);
```

### Para DevOps/Deployment

#### 1. Variables de Entorno Locales

Actualizar `.env.local`:
```bash
# Eliminar
-NEXT_PUBLIC_PINATA_JWT=...

# Agregar
+PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. Vercel Deployment

1. Ir a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables

2. **Eliminar** (si existe):
   - `NEXT_PUBLIC_PINATA_JWT`

3. **Agregar**:
   - Name: `PINATA_JWT`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - Environments: Production, Preview, Development

4. Redeploy:
   ```bash
   vercel --prod
   ```

#### 3. Docker/Containers

Actualizar `Dockerfile` o `docker-compose.yml`:
```yaml
environment:
  - PINATA_JWT=${PINATA_JWT}
  # NO incluir NEXT_PUBLIC_PINATA_JWT
```

#### 4. CI/CD (GitHub Actions, etc.)

Actualizar secrets:
```yaml
# .github/workflows/deploy.yml
env:
  PINATA_JWT: ${{ secrets.PINATA_JWT }}
  # NO usar NEXT_PUBLIC_PINATA_JWT
```

## Verificación

### 1. Verificar Variables de Entorno

```bash
# En tu servidor/container
echo $PINATA_JWT | head -c 50
# Debería mostrar: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# NO debería existir
echo $NEXT_PUBLIC_PINATA_JWT
# Debería estar vacío
```

### 2. Verificar Bundle del Cliente

```bash
# Build de producción
cd frontend
npm run build

# Buscar JWT en el bundle (NO debería encontrar nada)
grep -r "eyJhbGci" .next/static/
# Resultado esperado: (vacío o error "no match")
```

### 3. Probar Upload

```bash
# Desde el navegador o curl
curl -X POST http://localhost:3000/api/pinata/upload \
  -F "file=@test-image.png"

# Respuesta esperada:
# {
#   "ipfsHash": "Qm...",
#   "ipfsUrl": "ipfs://Qm...",
#   "gatewayUrl": "https://gateway.pinata.cloud/ipfs/Qm...",
#   "size": 12345
# }
```

### 4. Verificar DevTools

1. Abre DevTools (F12)
2. Ve a Network tab
3. Sube un archivo
4. Inspecciona la request a `/api/pinata/upload`
5. **NO** deberías ver el JWT de Pinata en ningún lado
6. Solo verás la request al API route local

## Mejoras de Seguridad

### Antes ❌
- JWT expuesto en el cliente
- Sin rate limiting
- Sin autenticación de usuarios
- Sin validación de archivos
- Errores genéricos

### Después ✅
- JWT solo en servidor
- Rate limiting (IP-based)
- Preparado para autenticación ICP
- Validación completa (tamaño, tipo)
- Mensajes de error informativos
- Logging detallado
- Retry con exponential backoff

## Características Nuevas

### 1. Rate Limiting
- **Archivos:** 10 requests/minuto por IP
- **JSON:** 20 requests/minuto por IP
- Headers en respuesta:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `Retry-After` (cuando excede límite)

### 2. Validación Mejorada
- Tamaño máximo: 10MB (archivos), 1MB (JSON)
- Tipos permitidos: JPEG, PNG, GIF, WebP, SVG
- Validación de estructura JSON

### 3. Progress Tracking
```typescript
const { uploadFile } = usePinata();

await uploadFile(file, (progress) => {
  console.log(`${progress.percentage}% - ${progress.loaded}/${progress.total} bytes`);
  // Actualizar UI con barra de progreso
});
```

### 4. Error Handling
```typescript
const { uploadFile, error } = usePinata();

try {
  await uploadFile(file);
} catch (err) {
  // error contiene mensaje user-friendly
  console.error(error); // "Archivo muy grande. Máximo 10MB."
}
```

## Próximos Pasos

### Corto Plazo
- [ ] Implementar autenticación ICP real
- [ ] Migrar componentes existentes a `usePinata`
- [ ] Agregar tests unitarios para API routes

### Mediano Plazo
- [ ] Implementar rate limiting con Redis (Upstash)
- [ ] Agregar métricas y monitoring
- [ ] Implementar caché de IPFS hashes

### Largo Plazo
- [ ] Batch uploads (múltiples archivos)
- [ ] Optimización automática de imágenes
- [ ] Soporte para IPFS cluster
- [ ] Webhooks para notificaciones

## Troubleshooting

### Error: "Configuración de IPFS inválida"
**Causa:** `PINATA_JWT` no está configurado o es inválido

**Solución:**
```bash
# Verificar que existe
echo $PINATA_JWT

# Si no existe, agregar a .env.local
echo "PINATA_JWT=tu-jwt-aqui" >> .env.local

# Reiniciar dev server
npm run dev
```

### Error: "Rate limit alcanzado"
**Causa:** Demasiadas requests en 1 minuto

**Solución:**
- Espera 60 segundos
- Verifica headers: `X-RateLimit-Remaining`
- Para desarrollo: aumenta límites en `route.ts`

### Error: Build falla con "PINATA_JWT is not defined"
**Causa:** Variable no disponible en build time

**Solución:**
```bash
# .env.local debe existir
echo "PINATA_JWT=..." > .env.local

# O pasar en comando
PINATA_JWT=... npm run build
```

### Uploads fallan después del deploy
**Causa:** Variable no configurada en Vercel/hosting

**Solución:**
1. Vercel Dashboard → Settings → Environment Variables
2. Agregar `PINATA_JWT`
3. Redeploy

## Recursos

- [Documentación API Routes](./frontend/app/api/pinata/README.md)
- [Hook usePinata](./frontend/hooks/usePinata.ts)
- [Pinata Documentation](https://docs.pinata.cloud/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

## Contacto

Para preguntas o problemas:
1. Revisar esta documentación
2. Verificar logs del servidor
3. Abrir issue en el repositorio
4. Contactar al equipo de desarrollo

---

**Fecha de Migración:** 2025-11-24
**Versión:** 1.0.0
**Estado:** ✅ Completado
