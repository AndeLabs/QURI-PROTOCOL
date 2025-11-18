#!/bin/bash

# ============================================================================
# QURI Protocol - Production Deployment Script
# ============================================================================
#
# Este script despliega QURI Protocol con todas las mejoras de producción:
# - RBAC (Role-Based Access Control)
# - Bitcoin confirmation tracking
# - Dynamic fee management
# - Pagination optimizations
#
# USO:
#   ./scripts/deploy-production.sh [NETWORK]
#
# NETWORK: ic (mainnet) o ic-testnet (testnet)
#
# IMPORTANTE: Ejecutar con identidad segura (NO default)
#
# ============================================================================

set -e

# Colors para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
NETWORK="${1:-ic}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           QURI Protocol - Production Deployment             ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# Pre-flight Checks
# ============================================================================

echo -e "${YELLOW}[1/7] Pre-flight checks...${NC}"

# Check dfx instalado
if ! command -v dfx &> /dev/null; then
    echo -e "${RED}ERROR: dfx no está instalado${NC}"
    echo "Instala dfx desde: https://internetcomputer.org/docs/current/developer-docs/setup/install"
    exit 1
fi

echo -e "${GREEN}✓ dfx instalado: $(dfx --version)${NC}"

# Check identidad
IDENTITY=$(dfx identity whoami)
echo -e "Identidad actual: ${YELLOW}$IDENTITY${NC}"

if [ "$IDENTITY" == "default" ] && [ "$NETWORK" == "ic" ]; then
    echo -e "${RED}ERROR: No uses la identidad 'default' para mainnet${NC}"
    echo "Crea una identidad segura:"
    echo "  dfx identity new production --storage-mode=keyring"
    echo "  dfx identity use production"
    exit 1
fi

# Warning para mainnet
if [ "$NETWORK" == "ic" ]; then
    echo -e "${RED}"
    echo "⚠️  ADVERTENCIA: Vas a deployar a MAINNET"
    echo "   - Esto consumirá cycles reales"
    echo "   - El deployer se convertirá en Owner del canister"
    echo "   - Asegúrate de tener cycles suficientes (>1T recomendado)"
    echo -e "${NC}"
    read -p "¿Continuar? (escribe 'SI' para confirmar): " confirm
    if [ "$confirm" != "SI" ]; then
        echo "Deployment cancelado"
        exit 0
    fi
fi

echo -e "${GREEN}✓ Pre-flight checks completados${NC}\n"

# ============================================================================
# Build Canisters
# ============================================================================

echo -e "${YELLOW}[2/7] Building canisters...${NC}"

cd "$PROJECT_ROOT"

dfx build --network "$NETWORK" rune-engine
dfx build --network "$NETWORK" registry
dfx build --network "$NETWORK" identity-manager
dfx build --network "$NETWORK" bitcoin-integration

echo -e "${GREEN}✓ Build completado${NC}\n"

# ============================================================================
# Deploy Bitcoin Integration (primero, lo necesitan los demás)
# ============================================================================

echo -e "${YELLOW}[3/7] Deploying Bitcoin Integration canister...${NC}"

# Para testnet usa Testnet, para mainnet usa Mainnet
if [ "$NETWORK" == "ic" ]; then
    BTC_NETWORK="variant { Mainnet }"
else
    BTC_NETWORK="variant { Testnet }"
fi

# Deploy bitcoin-integration
dfx deploy bitcoin-integration \
    --network "$NETWORK" \
    --argument "(${BTC_NETWORK}, principal \"aaaaa-aa\")"

BITCOIN_ID=$(dfx canister id bitcoin-integration --network "$NETWORK")
echo -e "${GREEN}✓ Bitcoin Integration deployed: $BITCOIN_ID${NC}\n"

# ============================================================================
# Deploy Registry
# ============================================================================

echo -e "${YELLOW}[4/7] Deploying Registry canister...${NC}"

dfx deploy registry --network "$NETWORK"

REGISTRY_ID=$(dfx canister id registry --network "$NETWORK")
echo -e "${GREEN}✓ Registry deployed: $REGISTRY_ID${NC}\n"

# ============================================================================
# Deploy Identity Manager
# ============================================================================

echo -e "${YELLOW}[5/7] Deploying Identity Manager canister...${NC}"

dfx deploy identity-manager --network "$NETWORK"

IDENTITY_MANAGER_ID=$(dfx canister id identity-manager --network "$NETWORK")
echo -e "${GREEN}✓ Identity Manager deployed: $IDENTITY_MANAGER_ID${NC}\n"

# ============================================================================
# Deploy Rune Engine (orchestrator principal)
# ============================================================================

echo -e "${YELLOW}[6/7] Deploying Rune Engine canister...${NC}"

# El deployer se convierte automáticamente en Owner
dfx deploy rune-engine --network "$NETWORK"

RUNE_ENGINE_ID=$(dfx canister id rune-engine --network "$NETWORK")
echo -e "${GREEN}✓ Rune Engine deployed: $RUNE_ENGINE_ID${NC}"

DEPLOYER_PRINCIPAL=$(dfx identity get-principal)
echo -e "${GREEN}✓ Owner configurado: $DEPLOYER_PRINCIPAL${NC}\n"

# ============================================================================
# Post-Deployment Configuration
# ============================================================================

echo -e "${YELLOW}[7/7] Post-deployment configuration...${NC}"

# Configurar canister IDs en rune-engine
echo "Configurando canister IDs..."
dfx canister call rune-engine configure_canisters \
    "(principal \"$BITCOIN_ID\", principal \"$REGISTRY_ID\")" \
    --network "$NETWORK"

echo -e "${GREEN}✓ Canister IDs configurados${NC}"

# Health check
echo "Verificando health check..."
HEALTH=$(dfx canister call rune-engine health_check --network "$NETWORK")
echo "$HEALTH"

if echo "$HEALTH" | grep -q "healthy = true"; then
    echo -e "${GREEN}✓ Health check PASSED${NC}"
else
    echo -e "${RED}⚠️  Health check mostró warnings${NC}"
fi

echo -e "${GREEN}✓ Post-deployment configuration completada${NC}\n"

# ============================================================================
# Deployment Summary
# ============================================================================

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║                  Deployment Completado ✓                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${GREEN}Canister IDs:${NC}"
echo "  Rune Engine:         $RUNE_ENGINE_ID"
echo "  Bitcoin Integration: $BITCOIN_ID"
echo "  Registry:            $REGISTRY_ID"
echo "  Identity Manager:    $IDENTITY_MANAGER_ID"
echo ""
echo -e "${GREEN}Owner Principal:${NC}"
echo "  $DEPLOYER_PRINCIPAL"
echo ""
echo -e "${GREEN}Network:${NC}"
echo "  $NETWORK"
echo ""

# URLs útiles
if [ "$NETWORK" == "ic" ]; then
    echo -e "${YELLOW}Dashboard URLs:${NC}"
    echo "  https://dashboard.internetcomputer.org/canister/$RUNE_ENGINE_ID"
    echo ""
fi

echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Verificar que los timers están corriendo:"
echo "     dfx canister logs rune-engine --network $NETWORK"
echo ""
echo "  2. Verificar fee estimates:"
echo "     dfx canister call rune-engine get_current_fee_estimates --network $NETWORK"
echo ""
echo "  3. (Opcional) Añadir admin adicional:"
echo "     dfx canister call rune-engine grant_role \\"
echo "       '(principal \"<admin-id>\", variant { Admin })' \\"
echo "       --network $NETWORK"
echo ""
echo "  4. Test completo end-to-end:"
echo "     ./scripts/test-deployment.sh $NETWORK"
echo ""

echo -e "${GREEN}¡Deployment exitoso! 🚀${NC}"
