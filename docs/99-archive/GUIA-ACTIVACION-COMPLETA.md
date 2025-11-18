# 🚀 Guía de Activación Completa - QURI Protocol

Guía paso a paso para activar todo el sistema QURI Protocol desde terminal.

---

## 📋 Pre-requisitos

Antes de comenzar, asegúrate de tener instalado:

```bash
# Verificar instalaciones
node --version          # v18+ requerido
npm --version           # v9+ recomendado
dfx --version          # v0.15+ recomendado
cargo --version        # Rust toolchain
```

Si falta algo:
- **Node/npm**: https://nodejs.org/
- **dfx**: `sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"`
- **Rust**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`

---

## 🎯 Opción 1: Deployment Local (Desarrollo)

### Paso 1: Preparar el entorno

```bash
cd /Users/munay/dev/QURI-PROTOCOL

# Cargar variables de entorno
source .env.mainnet

# Iniciar dfx en background
dfx start --clean --background
```

### Paso 2: Compilar canisters

```bash
# Build de todos los canisters Rust
dfx build
```

### Paso 3: Deploy local

```bash
# Usar el script de deployment local
./scripts/deploy-local.sh
```

O manualmente:

```bash
# Deploy cada canister
dfx deploy bitcoin-integration --argument '(variant { Testnet }, principal "aaaaa-aa")'
dfx deploy registry
dfx deploy identity-manager
dfx deploy rune-engine

# Obtener IDs
dfx canister id rune-engine
dfx canister id bitcoin-integration
dfx canister id registry
```

### Paso 4: Configurar rune-engine

```bash
# Configurar canister dependencies
BITCOIN_ID=$(dfx canister id bitcoin-integration)
REGISTRY_ID=$(dfx canister id registry)

dfx canister call rune-engine configure_canisters "(principal \"$BITCOIN_ID\", principal \"$REGISTRY_ID\")"
```

### Paso 5: Verificar health

```bash
# Health check
dfx canister call rune-engine health_check
```

### Paso 6: Iniciar frontend

```bash
cd frontend

# Instalar dependencias (solo primera vez)
npm install

# Generar tipos Candid
npm run generate:types

# Iniciar desarrollo
npm run dev
```

Abre: http://localhost:3000

---

## 🌐 Opción 2: Deployment a Mainnet (Producción)

### Paso 1: Configurar identidad segura

```bash
# NO usar identidad 'default' en mainnet
# Crear nueva identidad para producción
dfx identity new production --storage-mode=keyring

# Usar la nueva identidad
dfx identity use production

# Verificar
dfx identity whoami
dfx identity get-principal

# Guardar tu principal (lo necesitarás)
echo "Mi principal: $(dfx identity get-principal)" > my-principal.txt
```

### Paso 2: Verificar cycles

```bash
# Necesitas ~2-5 Trillion cycles para deployment completo
# Verificar balance
dfx wallet balance

# Si necesitas cycles, obtén de:
# https://faucet.dfinity.org (testnet)
# https://cycles.top (mainnet - compra con ICP)
```

### Paso 3: Deploy a mainnet

```bash
cd /Users/munay/dev/QURI-PROTOCOL

# Cargar variables de entorno
source .env.mainnet

# Ejecutar script de producción
./scripts/deploy-production.sh ic
```

El script hará:
1. Pre-flight checks (identidad, cycles, etc.)
2. Build de todos los canisters optimizados
3. Deploy de Bitcoin Integration
4. Deploy de Registry
5. Deploy de Identity Manager  
6. Deploy de Rune Engine
7. Configuración post-deployment
8. Health checks
9. Mostrar resumen con canister IDs

### Paso 4: Guardar canister IDs

```bash
# Guardar IDs para frontend
echo "NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$(dfx canister id rune-engine --network ic)" >> .env.production
echo "NEXT_PUBLIC_BITCOIN_CANISTER_ID=$(dfx canister id bitcoin-integration --network ic)" >> .env.production
echo "NEXT_PUBLIC_REGISTRY_CANISTER_ID=$(dfx canister id registry --network ic)" >> .env.production
echo "NEXT_PUBLIC_IC_HOST=https://ic0.app" >> .env.production
```

### Paso 5: Deploy frontend a Vercel

```bash
cd frontend

# Instalar Vercel CLI si no lo tienes
npm install -g vercel

# Login a Vercel
vercel login

# Deploy
vercel --prod

# Durante el deploy, configurar:
# - Framework: Next.js
# - Build command: npm run build
# - Output directory: .next
# - Install command: npm install
```

Configurar variables de entorno en Vercel:
```bash
# En el dashboard de Vercel, añadir:
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=<tu-canister-id>
NEXT_PUBLIC_BITCOIN_CANISTER_ID=<tu-canister-id>
NEXT_PUBLIC_REGISTRY_CANISTER_ID=<tu-canister-id>
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_NFT_STORAGE_API_KEY=<tu-api-key>
```

---

## 🧪 Testing del Sistema

### Test automatizado completo

```bash
# Test end-to-end del deployment
./scripts/test-deployment.sh

# O especificar red
./scripts/test-deployment.sh ic        # mainnet
./scripts/test-deployment.sh local     # local
```

### Tests manuales

```bash
# 1. Verificar health
dfx canister call rune-engine health_check

# 2. Verificar fees
dfx canister call rune-engine get_current_fee_estimates

# 3. Verificar Bitcoin height
dfx canister call bitcoin-integration get_current_bitcoin_height

# 4. Test de etching (requiere Bitcoin confirmado)
./scripts/test-etching.sh
```

---

## 🔧 Configuración Post-Deployment

### Añadir administradores adicionales

```bash
# Dar rol de Admin a otro principal
dfx canister call rune-engine grant_role \
  '(principal "<admin-principal-id>", variant { Admin })' \
  --network ic
```

### Configurar fees personalizados

```bash
# Ajustar fee multiplier (default: 1.2x)
dfx canister call rune-engine update_fee_multiplier '(1.5)' --network ic
```

### Configurar Bitcoin confirmations

```bash
# Requiere N confirmaciones para etching (default: 3)
# Esto está hardcoded en el canister, editar si necesario
```

---

## 📊 Monitoreo

### Ver logs

```bash
# Logs de rune-engine
dfx canister logs rune-engine --network ic

# Logs de bitcoin-integration
dfx canister logs bitcoin-integration --network ic
```

### Dashboard de ICP

Visita el dashboard oficial:
```
https://dashboard.internetcomputer.org/canister/<CANISTER_ID>
```

Puedes ver:
- Cycles balance
- Memory usage
- Llamadas por segundo
- Logs en tiempo real

### Métricas del sistema

```bash
# Ver estado general
dfx canister call rune-engine get_stats

# Ver etching específico
dfx canister call rune-engine get_etching '("<etching-id>")'
```

---

## 🔄 Actualizaciones

### Actualizar canister existente

```bash
# Build nueva versión
dfx build rune-engine --network ic

# Upgrade (preserva estado)
dfx canister install rune-engine --mode upgrade --network ic

# Verificar health después del upgrade
dfx canister call rune-engine health_check --network ic
```

### Backup de estado

```bash
# Antes de upgrade importante, hacer snapshot
dfx canister call rune-engine export_state --network ic > backup-$(date +%Y%m%d).json
```

---

## 🆘 Troubleshooting

### Error: "Insufficient cycles"

```bash
# Añadir cycles al canister
dfx canister deposit-cycles <amount> <canister-name> --network ic

# Ejemplo: 1 Trillion cycles
dfx canister deposit-cycles 1000000000000 rune-engine --network ic
```

### Error: "Replica returned an error: code 5"

El canister se quedó sin cycles. Deposita más cycles inmediatamente.

### Frontend no conecta a canisters

```bash
# Verificar variables de entorno
cat frontend/.env.local
cat frontend/.env.production

# Regenerar tipos Candid
cd frontend
npm run generate:types
```

### Bitcoin integration no responde

```bash
# Verificar que el management canister está disponible
dfx canister call bitcoin-integration health_check --network ic

# Ver si hay timeouts en los logs
dfx canister logs bitcoin-integration --network ic
```

---

## 📝 Comandos Útiles de Referencia Rápida

```bash
# === IDENTIDAD ===
dfx identity whoami                    # Ver identidad actual
dfx identity list                      # Listar identidades
dfx identity use <name>               # Cambiar identidad
dfx identity get-principal            # Ver tu principal ID

# === CANISTERS ===
dfx canister status <name>            # Estado del canister
dfx canister id <name>                # Obtener canister ID
dfx canister delete <name>            # Eliminar canister
dfx canister info <canister-id>       # Info de un canister

# === CYCLES ===
dfx wallet balance                     # Ver balance de cycles
dfx canister status <name>            # Ver cycles de un canister
dfx canister deposit-cycles <amount> <name>  # Depositar cycles

# === LOGS ===
dfx canister logs <name>              # Ver logs
dfx canister logs <name> --network ic # Logs de mainnet

# === BUILD & DEPLOY ===
dfx build                             # Build todos los canisters
dfx build <name>                      # Build canister específico
dfx deploy                            # Deploy todos
dfx deploy <name>                     # Deploy específico
dfx deploy --network ic               # Deploy a mainnet
```

---

## 🎯 Checklist de Deployment Exitoso

Deployment Local:
- [ ] dfx start corriendo
- [ ] Todos los canisters deployed
- [ ] Health check verde
- [ ] Frontend corriendo en localhost:3000
- [ ] Puede conectar con Internet Identity local

Deployment Mainnet:
- [ ] Identidad segura configurada (NO default)
- [ ] Cycles suficientes (>2T recomendado)
- [ ] Todos los canisters deployed a `--network ic`
- [ ] Canister IDs guardados
- [ ] Health check verde
- [ ] Frontend deployed a Vercel
- [ ] Variables de entorno configuradas en Vercel
- [ ] Puede conectar con Internet Identity mainnet
- [ ] NFT Storage API key configurada
- [ ] Dashboard de ICP accesible

---

## 🚀 Quick Start (TL;DR)

### Local Development (1 comando):
```bash
./scripts/deploy-local.sh && cd frontend && npm run dev
```

### Mainnet Production (3 comandos):
```bash
# 1. Setup identidad
dfx identity new production --storage-mode=keyring && dfx identity use production

# 2. Deploy backend
./scripts/deploy-production.sh ic

# 3. Deploy frontend
cd frontend && vercel --prod
```

---

¡El sistema está listo! 🎉

Para más detalles:
- Documentación de ICP: https://internetcomputer.org/docs
- Repo del proyecto: https://github.com/AndeLabs/QURI-PROTOCOL
- Issues: https://github.com/AndeLabs/QURI-PROTOCOL/issues
