#!/bin/bash

# ============================================================================
# QURI Protocol - Master Deployment Script
# ============================================================================
#
# Script maestro para desplegar QURI Protocol en diferentes entornos.
# Consolida funcionalidad de múltiples scripts de deployment.
#
# USO:
#   ./scripts/deploy.sh [ENVIRONMENT] [OPTIONS]
#
# ENVIRONMENTS:
#   local      - Despliegue local (replica de dfx)
#   testnet    - Despliegue en testnet de ICP
#   mainnet    - Despliegue en mainnet de ICP (requiere confirmación)
#
# OPTIONS:
#   --skip-build       - No reconstruir canisters antes de desplegar
#   --upgrade          - Usar modo upgrade (preserva estado)
#   --reinstall        - Usar modo reinstall (borra estado)
#   --configure-only   - Solo configurar canisters existentes
#   --help             - Mostrar esta ayuda
#
# EXAMPLES:
#   ./scripts/deploy.sh local
#   ./scripts/deploy.sh testnet --upgrade
#   ./scripts/deploy.sh mainnet --configure-only
#
# ============================================================================

set -e

# ============================================================================
# Colors and Formatting
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# Functions
# ============================================================================

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║           QURI Protocol - Master Deployment Script              ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${CYAN}[$(date +'%H:%M:%S')] $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

show_help() {
    cat << EOF
QURI Protocol - Master Deployment Script

USO:
    ./scripts/deploy.sh [ENVIRONMENT] [OPTIONS]

ENVIRONMENTS:
    local      - Despliegue local (replica de dfx)
    testnet    - Despliegue en testnet de ICP
    mainnet    - Despliegue en mainnet de ICP (requiere confirmación)

OPTIONS:
    --skip-build       - No reconstruir canisters antes de desplegar
    --upgrade          - Usar modo upgrade (preserva estado)
    --reinstall        - Usar modo reinstall (borra estado)
    --configure-only   - Solo configurar canisters existentes
    --help, -h         - Mostrar esta ayuda

EXAMPLES:
    ./scripts/deploy.sh local
    ./scripts/deploy.sh testnet --upgrade
    ./scripts/deploy.sh mainnet --configure-only

NOTAS:
    - Para mainnet, se requiere confirmación explícita
    - El modo upgrade es recomendado para preservar estado
    - El modo reinstall borrará todos los datos
    - Configure-only no despliega, solo actualiza configuración

Para más información: https://github.com/yourusername/QURI-PROTOCOL
EOF
    exit 0
}

check_prerequisites() {
    print_step "Verificando prerequisitos..."

    # Check dfx
    if ! command -v dfx &> /dev/null; then
        print_error "dfx no está instalado"
        echo "Instala dfx desde: https://internetcomputer.org/docs/current/developer-docs/setup/install"
        exit 1
    fi
    print_success "dfx instalado: $(dfx --version)"

    # Check cargo for builds
    if [ "$SKIP_BUILD" = false ]; then
        if ! command -v cargo &> /dev/null; then
            print_error "cargo no está instalado"
            echo "Instala Rust desde: https://rustup.rs/"
            exit 1
        fi
        print_success "cargo instalado: $(cargo --version | head -n1)"
    fi

    # Check identity
    IDENTITY=$(dfx identity whoami)
    PRINCIPAL=$(dfx identity get-principal)
    print_success "Identidad: $IDENTITY ($PRINCIPAL)"

    # Warn if using default identity for mainnet
    if [ "$ENVIRONMENT" = "mainnet" ] && [ "$IDENTITY" = "default" ]; then
        print_warning "Usando identidad 'default' para mainnet"
        print_warning "Recomendado: crear identidad dedicada para producción"
        echo ""
        read -p "¿Continuar de todas formas? (y/N): " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo "Deployment cancelado"
            exit 0
        fi
    fi

    echo ""
}

confirm_mainnet_deployment() {
    if [ "$ENVIRONMENT" != "mainnet" ]; then
        return
    fi

    print_warning "ADVERTENCIA: Vas a desplegar a MAINNET"
    echo ""
    echo "  - Esto consumirá cycles reales"
    echo "  - Los canisters serán visibles públicamente"
    echo "  - El deployer se convertirá en controller"
    echo "  - Asegúrate de tener cycles suficientes"
    echo ""

    read -p "¿Estás SEGURO de continuar? (escribe 'YES' en mayúsculas): " confirm
    if [ "$confirm" != "YES" ]; then
        echo "Deployment cancelado"
        exit 0
    fi
    echo ""
}

build_canisters() {
    if [ "$SKIP_BUILD" = true ]; then
        print_step "Saltando build (--skip-build especificado)"
        return
    fi

    print_step "Construyendo canisters..."
    echo ""

    cd "$PROJECT_ROOT/backend"

    # Use Makefile for consistent builds
    make build

    print_success "Build completado"
    echo ""
}

deploy_canisters() {
    if [ "$CONFIGURE_ONLY" = true ]; then
        print_step "Saltando deployment (--configure-only especificado)"
        return
    fi

    print_step "Desplegando canisters a $ENVIRONMENT..."
    echo ""

    cd "$PROJECT_ROOT/backend"

    # Determine deploy mode
    DEPLOY_MODE=""
    if [ "$UPGRADE_MODE" = true ]; then
        DEPLOY_MODE="--mode upgrade"
        print_step "Modo: UPGRADE (preserva estado)"
    elif [ "$REINSTALL_MODE" = true ]; then
        DEPLOY_MODE="--mode reinstall"
        print_warning "Modo: REINSTALL (borra estado)"
    fi

    # Get Bitcoin network arg
    if [ "$ENVIRONMENT" = "mainnet" ]; then
        BTC_NETWORK="variant { Mainnet }"
    else
        BTC_NETWORK="variant { Testnet }"
    fi

    # Deploy bitcoin-integration first (needed by others)
    print_step "Desplegando bitcoin-integration..."
    dfx deploy bitcoin-integration --network "$NETWORK" $DEPLOY_MODE \
        --argument "(${BTC_NETWORK}, principal \"aaaaa-aa\")" || true

    BITCOIN_ID=$(dfx canister id bitcoin-integration --network "$NETWORK")
    print_success "bitcoin-integration: $BITCOIN_ID"

    # Deploy registry
    print_step "Desplegando registry..."
    dfx deploy registry --network "$NETWORK" $DEPLOY_MODE || true

    REGISTRY_ID=$(dfx canister id registry --network "$NETWORK")
    print_success "registry: $REGISTRY_ID"

    # Deploy identity-manager
    print_step "Desplegando identity-manager..."
    dfx deploy identity-manager --network "$NETWORK" $DEPLOY_MODE || true

    IDENTITY_MANAGER_ID=$(dfx canister id identity-manager --network "$NETWORK")
    print_success "identity-manager: $IDENTITY_MANAGER_ID"

    # Deploy rune-engine (main canister)
    print_step "Desplegando rune-engine..."
    dfx deploy rune-engine --network "$NETWORK" $DEPLOY_MODE || true

    RUNE_ENGINE_ID=$(dfx canister id rune-engine --network "$NETWORK")
    print_success "rune-engine: $RUNE_ENGINE_ID"

    echo ""
    print_success "Deployment completado"
    echo ""
}

configure_canisters() {
    print_step "Configurando canisters..."
    echo ""

    cd "$PROJECT_ROOT/backend"

    # Get canister IDs
    BITCOIN_ID=$(dfx canister id bitcoin-integration --network "$NETWORK" 2>/dev/null || echo "")
    REGISTRY_ID=$(dfx canister id registry --network "$NETWORK" 2>/dev/null || echo "")
    RUNE_ENGINE_ID=$(dfx canister id rune-engine --network "$NETWORK" 2>/dev/null || echo "")

    if [ -z "$RUNE_ENGINE_ID" ]; then
        print_error "rune-engine no desplegado, no se puede configurar"
        return 1
    fi

    # Configure canister IDs
    print_step "Configurando canister IDs..."
    dfx canister call rune-engine configure_canisters \
        "(principal \"$BITCOIN_ID\", principal \"$REGISTRY_ID\")" \
        --network "$NETWORK" || print_warning "Failed to configure canister IDs"

    # Configure etching settings based on environment
    print_step "Configurando settings de etching..."
    if [ "$ENVIRONMENT" = "mainnet" ]; then
        # Mainnet settings: higher fees, more confirmations
        dfx canister call rune-engine update_etching_config \
            '(record {
                network = variant { Mainnet };
                fee_rate = 10 : nat64;
                required_confirmations = 6 : nat32;
                enable_retries = true;
            })' \
            --network "$NETWORK" || print_warning "Failed to configure etching settings"
    else
        # Testnet/local settings: lower fees, fewer confirmations
        dfx canister call rune-engine update_etching_config \
            '(record {
                network = variant { Testnet };
                fee_rate = 2 : nat64;
                required_confirmations = 1 : nat32;
                enable_retries = true;
            })' \
            --network "$NETWORK" || print_warning "Failed to configure etching settings"
    fi

    print_success "Configuración completada"
    echo ""
}

verify_deployment() {
    print_step "Verificando deployment..."
    echo ""

    cd "$PROJECT_ROOT/backend"

    RUNE_ENGINE_ID=$(dfx canister id rune-engine --network "$NETWORK" 2>/dev/null || echo "")

    if [ -z "$RUNE_ENGINE_ID" ]; then
        print_warning "No se puede verificar: rune-engine no desplegado"
        return
    fi

    # Health check
    print_step "Ejecutando health check..."
    HEALTH=$(dfx canister call rune-engine health_check --network "$NETWORK" 2>&1 || echo "")

    if echo "$HEALTH" | grep -q "healthy = true"; then
        print_success "Health check PASSED"
    else
        print_warning "Health check mostró warnings o falló"
        echo "$HEALTH"
    fi

    # Check cycles (only for non-local)
    if [ "$ENVIRONMENT" != "local" ]; then
        print_step "Verificando cycles..."
        CYCLES=$(dfx canister status rune-engine --network "$NETWORK" 2>&1 | grep "Balance:" || echo "")
        if [ -n "$CYCLES" ]; then
            echo "  $CYCLES"
        fi
    fi

    echo ""
}

print_summary() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║                  Deployment Summary                              ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    echo -e "${GREEN}Environment:${NC} $ENVIRONMENT"
    echo -e "${GREEN}Network:${NC} $NETWORK"
    echo -e "${GREEN}Identity:${NC} $(dfx identity whoami)"
    echo ""

    cd "$PROJECT_ROOT/backend"

    RUNE_ENGINE_ID=$(dfx canister id rune-engine --network "$NETWORK" 2>/dev/null || echo "N/A")
    BITCOIN_ID=$(dfx canister id bitcoin-integration --network "$NETWORK" 2>/dev/null || echo "N/A")
    REGISTRY_ID=$(dfx canister id registry --network "$NETWORK" 2>/dev/null || echo "N/A")
    IDENTITY_MANAGER_ID=$(dfx canister id identity-manager --network "$NETWORK" 2>/dev/null || echo "N/A")

    echo -e "${GREEN}Canister IDs:${NC}"
    echo "  rune-engine:         $RUNE_ENGINE_ID"
    echo "  bitcoin-integration: $BITCOIN_ID"
    echo "  registry:            $REGISTRY_ID"
    echo "  identity-manager:    $IDENTITY_MANAGER_ID"
    echo ""

    if [ "$ENVIRONMENT" = "mainnet" ]; then
        echo -e "${YELLOW}Dashboard URLs:${NC}"
        echo "  https://dashboard.internetcomputer.org/canister/$RUNE_ENGINE_ID"
        echo ""
    fi

    echo -e "${YELLOW}Próximos pasos:${NC}"
    echo "  1. Verificar logs:"
    echo "     dfx canister logs rune-engine --network $NETWORK"
    echo ""
    echo "  2. Test health check:"
    echo "     dfx canister call rune-engine health_check --network $NETWORK"
    echo ""
    echo "  3. Monitorear cycles (mainnet/testnet):"
    echo "     ./scripts/monitor-cycles.sh"
    echo ""

    print_success "Deployment completado exitosamente!"
}

# ============================================================================
# Main Script
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Parse arguments
ENVIRONMENT="${1:-}"
SKIP_BUILD=false
UPGRADE_MODE=false
REINSTALL_MODE=false
CONFIGURE_ONLY=false

if [ -z "$ENVIRONMENT" ] || [ "$ENVIRONMENT" = "--help" ] || [ "$ENVIRONMENT" = "-h" ]; then
    show_help
fi

# Parse options
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --upgrade)
            UPGRADE_MODE=true
            shift
            ;;
        --reinstall)
            REINSTALL_MODE=true
            shift
            ;;
        --configure-only)
            CONFIGURE_ONLY=true
            shift
            ;;
        --help|-h)
            show_help
            ;;
        *)
            print_error "Opción desconocida: $1"
            echo "Usa --help para ver opciones disponibles"
            exit 1
            ;;
    esac
done

# Validate environment
case $ENVIRONMENT in
    local)
        NETWORK="local"
        ;;
    testnet)
        NETWORK="ic"  # Will add testnet network to dfx.json if needed
        ;;
    mainnet)
        NETWORK="ic"
        ;;
    *)
        print_error "Environment inválido: $ENVIRONMENT"
        echo "Valores válidos: local, testnet, mainnet"
        echo "Usa --help para más información"
        exit 1
        ;;
esac

# Cannot use both upgrade and reinstall
if [ "$UPGRADE_MODE" = true ] && [ "$REINSTALL_MODE" = true ]; then
    print_error "No puedes usar --upgrade y --reinstall simultáneamente"
    exit 1
fi

# Start deployment
print_header

# Execute deployment steps
check_prerequisites
confirm_mainnet_deployment
build_canisters
deploy_canisters
configure_canisters
verify_deployment
print_summary

echo ""
print_success "Script completado!"
