# Deployment Scripts

Este directorio contiene scripts de deployment legacy. Para nuevos deployments, **usa el script maestro consolidado**.

## Script Maestro (Recomendado)

```bash
# Desde la raíz del proyecto
./scripts/deploy.sh [local|testnet|mainnet] [options]
```

**Ver documentación completa:** `/docs/SCRIPTS.md`

## Scripts en este directorio

### Scripts Activos

- `deploy-local.sh` - Deployment local rápido (legacy)
- `deploy-mainnet.sh` - Deployment mainnet (legacy, usa `/scripts/deploy.sh mainnet`)
- `deploy-testnet.sh` - Deployment testnet (legacy, usa `/scripts/deploy.sh testnet`)
- `configure-rune-engine.sh` - Configuración post-deployment
- `test-etching.sh` - Tests end-to-end
- `test-deployment.sh` - Validación de deployment

### Scripts de Utilidad

- `deploy-backend.sh` - Solo backend
- `deploy-frontend.sh` - Solo frontend
- `update-frontend-env.sh` - Actualizar variables de entorno
- `start-frontend.sh` - Iniciar frontend local
- `validate-nft-storage-key.sh` - Validar configuración NFT

### Scripts de Desarrollo

- `deploy-playground.sh` - Deployment a playground
- `quick-playground-deploy.sh` - Deployment rápido playground
- `testnet-quickstart.sh` - Quickstart testnet

## Scripts Eliminados (Consolidados)

Los siguientes scripts fueron eliminados y consolidados en `/scripts/deploy.sh`:

- `deploy-production.sh` → Usar `/scripts/deploy.sh mainnet`
- `deploy-mainnet-complete.sh` → Usar `/scripts/deploy.sh mainnet`
- `deploy-fix.sh` → Obsoleto
- `build-wasm.sh` → Usar `make build` en `/backend/Makefile`

## Migración

Si estabas usando scripts legacy, aquí están las equivalencias:

```bash
# Antes
./backend/scripts/deployment/deploy-production.sh ic

# Ahora
./scripts/deploy.sh mainnet --upgrade

# Antes
./backend/scripts/deployment/deploy-mainnet-complete.sh

# Ahora
./scripts/deploy.sh mainnet

# Antes
./backend/scripts/build-wasm.sh all

# Ahora
cd backend && make build
```

## Documentación

Ver documentación completa en: `/docs/SCRIPTS.md`

Para ayuda del script maestro:
```bash
./scripts/deploy.sh --help
```
