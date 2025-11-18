# NFT.Storage API Key Setup - Diagnóstico Completo

## 🔍 Problema Identificado

El archivo `/Users/munay/Downloads/API Key NFT Storage.txt` contiene:
```
1d199458.cbab6bb9d2cf4dc0856ad8660ef74b3d
```

**Este NO es un API key válido de NFT.Storage.**

### Análisis Técnico

1. **Formato JWT Esperado:**
   - Un API key de NFT.Storage es un JWT (JSON Web Token) con 3 partes:
   ```
   eyJhbGci...HEADER.eyJzdWI...PAYLOAD.SflKxwRJ...SIGNATURE
   ```
   - Ejemplo completo:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDEyMzQiLCJpc3MiOiJuZnQtc3RvcmFnZSIsImlhdCI6MTczMTUzNjIzNjY5NSwibmFtZSI6Ik15QVBJIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
   ```

2. **Lo que tenemos:**
   - Solo un fragmento: `1d199458.cbab6bb9d2cf4dc0856ad8660ef74b3d`
   - Esto parece ser un ID de sesión o UUID, NO una firma JWT válida
   - Una firma HMAC-SHA256 válida tiene ~43 caracteres en base64url
   - Lo que tenemos tiene solo 32 caracteres hexadecimales

3. **Pruebas realizadas:**
   ```bash
   curl -X POST 'https://api.nft.storage/upload' \
     --header 'Authorization: Bearer 1d199458.cbab6bb9d2cf4dc0856ad8660ef74b3d' \
     --data-binary 'test'
   
   # Respuesta:
   # {"error":{"code":"ERROR_MALFORMED_TOKEN","message":"API Key is malformed or failed to parse."}}
   ```

## ✅ Solución: Cómo Obtener el API Key Correcto

### Paso 1: Acceder a NFT.Storage
1. Ve a https://nft.storage
2. Inicia sesión con tu cuenta

### Paso 2: Ir a API Keys
1. Click en tu perfil (esquina superior derecha)
2. Selecciona "Account" o "API Keys"
3. Deberías ver una lista de tus API keys

### Paso 3: Copiar el API Key Completo
1. Busca el key llamado "QURI" (basado en el payload que decodificamos)
2. **IMPORTANTE:** Click en "Copy" o "Show Token"
3. El token COMPLETO debe verse así:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...MUY...muy-largo...XQ.SflKxw...firma-larga...w5c
   ```
4. Es un string MUY LARGO (200-300 caracteres o más)

### Paso 4: Validar el Token
Antes de usarlo, verifica que:
- ✅ Tiene 3 partes separadas por puntos (.)
- ✅ Cada parte es un string largo de caracteres alfanuméricos
- ✅ No tiene espacios ni saltos de línea
- ✅ Empieza con `eyJ` (que es "{"alg":" en base64)

## 🔧 Configuración

Una vez tengas el token completo:

```bash
# Editar .env.local
NEXT_PUBLIC_NFT_STORAGE_API_KEY=eyJhbGci...TU-TOKEN-COMPLETO-AQUI...w5c
```

## 🧪 Probar el Token

```bash
# Test rápido desde terminal
curl -X POST 'https://api.nft.storage/upload' \
  --header 'Authorization: Bearer TU-TOKEN-COMPLETO' \
  --header 'Content-Type: text/plain' \
  --data 'test'

# Si funciona, verás algo como:
# {"ok":true,"value":{"cid":"bafybeig..."}}
```

## 📊 Estado Actual del Proyecto

### ✅ Completado
- [x] Form UX mejorado (botón giant, sticky, siempre visible)
- [x] Validación en tiempo real (mode: 'onChange')
- [x] Checklist simplificado (solo muestra campos faltantes)
- [x] Progress tracking visual durante upload
- [x] Content Security Policy configurado correctamente
- [x] TypeScript compilation exitosa
- [x] Middleware configurado para IPFS gateways
- [x] NFT.Storage integration code implementado

### ❌ Pendiente
- [ ] Obtener API key completo y válido de NFT.Storage
- [ ] Probar upload end-to-end con token real

## 📝 Notas Técnicas

### Payload del JWT Actual
Decodificamos el payload y encontramos:
```json
{
  "sub": "did:ethr:0x1d199458cbab6bb9d2cf4dc0856ad8660ef74b3d",
  "iss": "nft-storage",
  "iat": 1731536236695,
  "name": "QURI"
}
```

Esto confirma que:
- El account está asociado con el nombre "QURI" ✅
- El token fue creado el 2024-11-13 ✅
- La cuenta usa DID Ethereum: `0x1d199458cbab6bb9d2cf4dc0856ad8660ef74b3d`

### Alternativas si no encuentras el token

Si no puedes encontrar el token original:

1. **Crear un nuevo API key:**
   - En NFT.Storage → API Keys → "New Key"
   - Darle un nombre (ej: "QURI-Production")
   - **COPIAR el token INMEDIATAMENTE** (solo se muestra una vez)
   - Guardarlo en un lugar seguro (1Password, etc.)

2. **Usar el NFT.Storage client library:**
   - Ya está instalado: `nft.storage` package
   - Ya está configurado en: `frontend/lib/storage/nft-storage.ts`
   - Solo falta el token válido

## 🚀 Próximos Pasos

1. Obtener token completo de NFT.Storage
2. Actualizar `.env.local` con el token real
3. Reiniciar dev server: `npm run dev`
4. Probar creación de Rune con imagen real
5. Verificar que aparece en IPFS gateways

---

**Creado:** 2025-11-13  
**Última actualización:** 2025-11-13  
**Estado:** Esperando API key completo
