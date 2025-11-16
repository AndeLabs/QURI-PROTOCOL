#!/bin/bash

# Script para actualizar automáticamente los canister IDs en el frontend
# Uso: ./scripts/update-frontend-env.sh [local|ic]

set -e

NETWORK=${1:-local}
FRONTEND_DIR="$(dirname "$0")/../frontend"

echo "🔄 Actualizando variables de entorno del frontend..."
echo "Red: $NETWORK"

# Obtener canister IDs
if [ "$NETWORK" = "ic" ]; then
    ENV_FILE="$FRONTEND_DIR/.env.production"
    IC_HOST="https://ic0.app"
else
    ENV_FILE="$FRONTEND_DIR/.env.development"
    IC_HOST="http://127.0.0.1:8000"
fi

# Verificar que dfx esté corriendo (solo para local)
if [ "$NETWORK" = "local" ]; then
    if ! dfx ping > /dev/null 2>&1; then
        echo "❌ Error: dfx no está corriendo"
        echo "Ejecuta: dfx start --background"
        exit 1
    fi
fi

# Obtener IDs
RUNE_ENGINE=$(dfx canister id rune-engine --network "$NETWORK" 2>/dev/null || echo "")
BITCOIN=$(dfx canister id bitcoin-integration --network "$NETWORK" 2>/dev/null || echo "")
REGISTRY=$(dfx canister id registry --network "$NETWORK" 2>/dev/null || echo "")
IDENTITY=$(dfx canister id identity-manager --network "$NETWORK" 2>/dev/null || echo "")

# Actualizar archivo
if [ -f "$ENV_FILE" ]; then
    # Actualizar IDs existentes
    if [ -n "$RUNE_ENGINE" ]; then
        sed -i.bak "s/NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=.*/NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE/" "$ENV_FILE"
    fi
    if [ -n "$BITCOIN" ]; then
        sed -i.bak "s/NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=.*/NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BITCOIN/" "$ENV_FILE"
    fi
    if [ -n "$REGISTRY" ]; then
        sed -i.bak "s/NEXT_PUBLIC_REGISTRY_CANISTER_ID=.*/NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY/" "$ENV_FILE"
    fi
    if [ -n "$IDENTITY" ]; then
        sed -i.bak "s/NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=.*/NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY/" "$ENV_FILE"
    fi
    
    # Actualizar IC_HOST
    sed -i.bak "s|NEXT_PUBLIC_IC_HOST=.*|NEXT_PUBLIC_IC_HOST=$IC_HOST|" "$ENV_FILE"
    
    # Limpiar backup
    rm -f "$ENV_FILE.bak"
    
    echo "✅ Variables actualizadas en: $ENV_FILE"
else
    echo "❌ No se encontró: $ENV_FILE"
    exit 1
fi

echo ""
echo "📋 Canister IDs configurados:"
echo "  Rune Engine:         $RUNE_ENGINE"
echo "  Bitcoin Integration: $BITCOIN"
echo "  Registry:            $REGISTRY"
echo "  Identity Manager:    $IDENTITY"
echo ""
echo "🔧 IC Host: $IC_HOST"
echo ""
echo "✨ ¡Listo! Reinicia el frontend para que tome los cambios:"
echo "   cd frontend && npm run dev"
