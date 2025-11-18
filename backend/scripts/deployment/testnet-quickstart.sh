#!/bin/bash

# ============================================================================
# QURI Protocol - Testnet Quick Start
# ============================================================================
#
# Este script te guía paso a paso para deployar en testnet (IC network).
#
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║         QURI Protocol - Testnet Deployment Quick Start          ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Suprimir warning de mainnet
export DFX_WARNING=-mainnet_plaintext_identity

# ============================================================================
# Paso 1: Verificar Pre-requisitos
# ============================================================================

echo -e "${YELLOW}Paso 1: Verificando pre-requisitos...${NC}\n"

# DFX version
DFX_VERSION=$(dfx --version 2>/dev/null || echo "NOT INSTALLED")
if [ "$DFX_VERSION" = "NOT INSTALLED" ]; then
    echo -e "${RED}❌ dfx no está instalado${NC}"
    echo "Instalar con: sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi
echo -e "${GREEN}✓ dfx version: $DFX_VERSION${NC}"

# Identity
IDENTITY=$(dfx identity whoami)
echo -e "${GREEN}✓ Identity: $IDENTITY${NC}"

# Wallet check
echo ""
echo -e "${YELLOW}Verificando wallet...${NC}"
WALLET_ID=$(dfx identity get-wallet --network ic 2>&1 || echo "NOT_CONFIGURED")

if echo "$WALLET_ID" | grep -q "No wallet configured"; then
    echo -e "${YELLOW}⚠ No hay wallet configurado para IC network${NC}"
    echo ""
    echo -e "${BLUE}Para continuar, necesitas cycles de testnet.${NC}"
    echo ""
    echo "Opciones:"
    echo ""
    echo "A) Obtener cycles GRATIS del faucet (RECOMENDADO):"
    echo "   1. Visita: ${GREEN}https://faucet.dfinity.org/${NC}"
    echo "   2. Conecta con Internet Identity o GitHub"
    echo "   3. Solicita cycles de testnet"
    echo "   4. Vuelve a ejecutar este script"
    echo ""
    echo "B) Si ya tienes ICP, convertir a cycles:"
    echo "   dfx cycles convert --amount 0.5 --network ic"
    echo ""
    exit 0
else
    echo -e "${GREEN}✓ Wallet configurado: $WALLET_ID${NC}"

    # Check balance
    BALANCE=$(dfx wallet balance --network ic 2>&1)
    echo -e "${GREEN}✓ Balance: $BALANCE${NC}"

    # Verificar que hay suficientes cycles
    if echo "$BALANCE" | grep -q "0 TC"; then
        echo -e "${RED}❌ Balance de cycles insuficiente${NC}"
        echo "Necesitas al menos 20T cycles para deployment completo"
        echo "Visita: https://faucet.dfinity.org/"
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}✓ Todos los pre-requisitos verificados${NC}"
echo ""

# ============================================================================
# Paso 2: Confirmar Deployment
# ============================================================================

echo -e "${YELLOW}Paso 2: Confirmar deployment...${NC}\n"
echo "Este script va a:"
echo "  1. Crear 4 canisters en IC testnet"
echo "  2. Build y deploy todos los canisters"
echo "  3. Configurar el sistema"
echo "  4. Ejecutar tests de verificación"
echo ""
echo "Costos aproximados: ~20T cycles (gratis con faucet)"
echo ""
read -p "¿Continuar con el deployment? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelado"
    exit 0
fi

# ============================================================================
# Paso 3: Crear Canisters
# ============================================================================

echo ""
echo -e "${YELLOW}Paso 3: Creando canisters en IC testnet...${NC}\n"

dfx canister create --all --network ic

echo -e "${GREEN}✓ Canisters creados${NC}"

# ============================================================================
# Paso 4: Build
# ============================================================================

echo ""
echo -e "${YELLOW}Paso 4: Building canisters...${NC}\n"

dfx build --network ic --all

echo -e "${GREEN}✓ Build completado${NC}"

# ============================================================================
# Paso 5: Deploy
# ============================================================================

echo ""
echo -e "${YELLOW}Paso 5: Deploying canisters...${NC}\n"

# Deploy registry
echo "Deploying registry..."
dfx deploy registry --network ic

# Deploy identity-manager
echo "Deploying identity-manager..."
dfx deploy identity-manager --network ic

# Deploy bitcoin-integration
echo "Deploying bitcoin-integration..."
dfx deploy bitcoin-integration --network ic

# Deploy rune-engine
echo "Deploying rune-engine..."
dfx deploy rune-engine --network ic

echo -e "${GREEN}✓ Todos los canisters deployados${NC}"

# ============================================================================
# Paso 6: Configuración
# ============================================================================

echo ""
echo -e "${YELLOW}Paso 6: Configurando sistema...${NC}\n"

# Get canister IDs
REGISTRY=$(dfx canister id registry --network ic)
RUNE_ENGINE=$(dfx canister id rune-engine --network ic)
BITCOIN_CANISTER="ghsi2-tqaaa-aaaan-aaaca-cai"

echo "Registry: $REGISTRY"
echo "Rune Engine: $RUNE_ENGINE"
echo ""

# Configure canisters
echo "Configurando canister IDs..."
dfx canister call rune-engine configure_canisters \
    "(principal \"$BITCOIN_CANISTER\", principal \"$REGISTRY\")" \
    --network ic

# Configure for testnet
echo "Configurando para testnet..."
dfx canister call rune-engine update_etching_config \
    '(record {
        network = variant { Testnet };
        fee_rate = 2 : nat64;
        required_confirmations = 1 : nat32;
        enable_retries = true;
    })' \
    --network ic

echo -e "${GREEN}✓ Configuración completada${NC}"

# ============================================================================
# Paso 7: Verificación
# ============================================================================

echo ""
echo -e "${YELLOW}Paso 7: Verificando deployment...${NC}\n"

# Health check
echo "Health check..."
HEALTH=$(dfx canister call rune-engine health_check --network ic)
echo "$HEALTH"

# Cycles check
echo ""
echo "Cycles balance..."
CYCLES=$(dfx canister call rune-engine get_cycles_metrics --network ic)
echo "$CYCLES"

echo ""
echo -e "${GREEN}✓ Verificación completada${NC}"

# ============================================================================
# Paso 8: Guardar Info
# ============================================================================

echo ""
echo -e "${YELLOW}Paso 8: Guardando información de deployment...${NC}\n"

mkdir -p deployments

DEPLOYMENT_FILE="deployments/testnet-$(date +%Y%m%d-%H%M%S).txt"

cat > "$DEPLOYMENT_FILE" <<EOF
QURI Protocol - Testnet Deployment
===================================

Fecha: $(date)
Network: IC (Testnet)
Identity: $IDENTITY

Canister IDs:
------------
Registry:            $REGISTRY
Rune Engine:         $RUNE_ENGINE
Identity Manager:    $(dfx canister id identity-manager --network ic)
Bitcoin Integration: $(dfx canister id bitcoin-integration --network ic)

Bitcoin Canister (IC): $BITCOIN_CANISTER

Configuración:
-------------
Network:          Testnet
Fee Rate:         2 sat/vbyte
Confirmations:    1
Retries:          Enabled

Dashboard URLs:
--------------
Registry:     https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$REGISTRY
Rune Engine:  https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$RUNE_ENGINE

Comandos Útiles:
---------------
# Health check
dfx canister call rune-engine health_check --network ic

# Ver cycles
dfx canister call rune-engine get_cycles_metrics --network ic

# Ver logs
dfx canister call rune-engine get_log_stats --network ic

# Ejecutar tests
./scripts/test-deployment.sh ic
EOF

echo -e "${GREEN}✓ Info guardada en: $DEPLOYMENT_FILE${NC}"

# ============================================================================
# Resumen Final
# ============================================================================

echo ""
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║                   DEPLOYMENT EXITOSO! 🎉                         ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

echo -e "${GREEN}Canister IDs:${NC}"
echo "  Registry:     $REGISTRY"
echo "  Rune Engine:  $RUNE_ENGINE"
echo ""

echo -e "${GREEN}Dashboards:${NC}"
echo "  Registry:     https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$REGISTRY"
echo "  Rune Engine:  https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$RUNE_ENGINE"
echo ""

echo -e "${YELLOW}Próximos pasos:${NC}"
echo "  1. Ejecutar tests: ${GREEN}./scripts/test-deployment.sh ic${NC}"
echo "  2. Probar crear un rune de testnet"
echo "  3. Monitorear cycles y logs"
echo ""

echo -e "${BLUE}Deployment info: $DEPLOYMENT_FILE${NC}"
echo ""
