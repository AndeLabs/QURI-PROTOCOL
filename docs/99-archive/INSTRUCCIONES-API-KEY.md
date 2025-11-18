# 🔑 Cómo Obtener tu API Key de NFT.Storage

## ⚠️ PROBLEMA ACTUAL

El archivo `API Key NFT Storage.txt` que descargaste contiene solo una parte del token:
```
1d199458.cbab6bb9d2cf4dc0856ad8660ef74b3d  ❌ INCOMPLETO
```

Necesitas el token **COMPLETO** que se ve así:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOi...200+ caracteres...w5c  ✅ COMPLETO
```

---

## 📱 PASO A PASO (con capturas)

### 1️⃣ Acceder a NFT.Storage

1. Abre tu navegador
2. Ve a: **https://nft.storage**
3. Click en **"Sign In"** (esquina superior derecha)
4. Inicia sesión con tu cuenta

### 2️⃣ Ir a API Keys

1. Una vez dentro, busca tu **perfil/avatar** (esquina superior derecha)
2. Click en **"Account"** o **"API Keys"**
3. Verás una lista de tus API keys

### 3️⃣ Encontrar el Key "QURI"

Basado en el análisis del token, tu API key se llama **"QURI"**.

Busca en la lista un key con ese nombre:
```
┌─────────────────────────────────────────┐
│ API Keys                                │
├─────────────────────────────────────────┤
│ Name: QURI                         ← ESTE│
│ Created: Nov 13, 2024                   │
│ [View] [Copy] [Delete]                  │
└─────────────────────────────────────────┘
```

### 4️⃣ Copiar el Token COMPLETO

**IMPORTANTE:** El token completo solo se muestra **UNA VEZ** cuando lo creas.

#### Opción A: Si puedes ver el token
1. Click en **"View"** o **"Show Token"**
2. Verás un string MUY LARGO (200-300 caracteres)
3. Click en **"Copy"** o selecciona todo el texto y copia
4. **Pégalo en un lugar seguro** (TextEdit, Notes, etc.)

#### Opción B: Si NO puedes verlo (lo más probable)
El token solo se mostró cuando lo creaste. Si ya no lo tienes:

1. **Crear un NUEVO API key:**
   - Click en **"New API Key"** o **"Create Key"**
   - Dale un nombre: `QURI-Production`
   - Click en **"Create"**

2. **IMPORTANTE:** Se mostrará el token **UNA SOLA VEZ**
   ```
   ┌──────────────────────────────────────────────────────┐
   │ ⚠️  SAVE THIS KEY NOW!                               │
   │                                                       │
   │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWI...    │
   │ ...muy largo...w5c                                   │
   │                                                       │
   │ [Copy to Clipboard]                                  │
   └──────────────────────────────────────────────────────┘
   ```

3. **Click en "Copy to Clipboard"**
4. **Guárdalo INMEDIATAMENTE** en un lugar seguro

---

## ✅ VALIDAR EL TOKEN

Antes de configurarlo, **verifica que funcione**:

```bash
# En la terminal, dentro del proyecto:
./validate-nft-storage-key.sh 'pega-tu-token-aqui'
```

Debes ver:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ ¡API KEY VÁLIDO!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Si ves ❌, el token está mal. Repite los pasos.

---

## 🔧 CONFIGURAR EN EL PROYECTO

Una vez validado:

### 1. Abrir el archivo de configuración
```bash
# Desde la terminal:
nano frontend/.env.local

# O desde VS Code:
code frontend/.env.local
```

### 2. Reemplazar la línea del API key
Busca la línea:
```bash
NEXT_PUBLIC_NFT_STORAGE_API_KEY=eyJhbGci...actual-token-incompleto
```

Reemplázala con:
```bash
NEXT_PUBLIC_NFT_STORAGE_API_KEY=eyJhbGci...TU-TOKEN-COMPLETO-AQUI
```

### 3. Guardar y cerrar
- En nano: `Ctrl+O` → Enter → `Ctrl+X`
- En VS Code: `Cmd+S` (Mac) o `Ctrl+S` (Windows/Linux)

### 4. Reiniciar el servidor
```bash
# Detener el servidor (si está corriendo)
# Presiona: Ctrl+C

# Iniciar nuevamente
cd frontend
npm run dev
```

---

## 🎉 PROBAR QUE FUNCIONA

1. Abre el navegador: http://localhost:3000
2. Ve a la sección de crear Rune
3. Llena todos los campos
4. Sube una imagen
5. Click en el botón **"🚀 CREATE RUNE ON BITCOIN"**

Si todo está bien:
- ✅ Verás el progress bar subiendo
- ✅ La imagen se subirá a IPFS
- ✅ El metadata se guardará en blockchain
- ✅ ¡Tu Rune será creado!

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "API Key is malformed"
- ❌ El token está incompleto o corrupto
- ✅ Crea un NUEVO API key en NFT.Storage
- ✅ Valida con `./validate-nft-storage-key.sh`

### Error: "401 Unauthorized"
- ❌ El token expiró o fue revocado
- ✅ Crea un nuevo token
- ✅ Copia TODO el token (no solo una parte)

### El script dice "4 partes" en lugar de 3
- ❌ Pegaste mal el token o tiene caracteres extra
- ✅ Copia solo el token, sin espacios ni saltos de línea
- ✅ Debe empezar con `eyJ` y tener 3 partes separadas por `.`

---

## 📞 CONTACTO DE SOPORTE

Si después de seguir todos los pasos aún tienes problemas:

1. Lee: `NFT-STORAGE-SETUP.md` (documentación técnica completa)
2. Revisa los logs: Abre la consola del navegador (F12)
3. Comparte el error EXACTO que ves

---

## 🎯 RESUMEN RÁPIDO

```bash
# 1. Obtener token de NFT.Storage
https://nft.storage → API Keys → Create New → Copy

# 2. Validar
./validate-nft-storage-key.sh 'tu-token'

# 3. Configurar
echo 'NEXT_PUBLIC_NFT_STORAGE_API_KEY=tu-token' >> frontend/.env.local

# 4. Reiniciar
cd frontend && npm run dev

# 5. ¡Crear Rune!
http://localhost:3000
```

---

**Una vez tengas el token correcto, TODO funcionará perfectamente.** El código está listo para producción. 🚀
