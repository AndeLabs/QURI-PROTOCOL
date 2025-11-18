#!/bin/bash

# Script para deploy rápido a Playground con auto-configuración
# Uso: ./scripts/deploy-playground.sh

set -e

echo "🎮 QURI Protocol - Playground Deployment"
echo "=========================================="
echo ""

# 1. Deploy a Playground
echo "📦 Desplegando canisters a Playground..."
dfx deploy --playground

# 2. Obtener IDs
echo ""
echo "📋 Obteniendo Canister IDs..."
RUNE_ENGINE=$(dfx canister id rune-engine --playground)
BITCOIN=$(dfx canister id bitcoin-integration --playground)
REGISTRY=$(dfx canister id registry --playground)
IDENTITY=$(dfx canister id identity-manager --playground)

echo "  Rune Engine:         $RUNE_ENGINE"
echo "  Bitcoin Integration: $BITCOIN"
echo "  Registry:            $REGISTRY"
echo "  Identity Manager:    $IDENTITY"

# 3. Auto-configurar rune-engine
echo ""
echo "⚙️  Auto-configurando Rune Engine..."
dfx canister --playground call "$RUNE_ENGINE" auto_configure_canisters "(principal \"$BITCOIN\", principal \"$REGISTRY\")"

# 4. Verificar health
echo ""
echo "🏥 Verificando salud del sistema..."
dfx canister --playground call "$RUNE_ENGINE" health_check

# 5. Actualizar .env.local del frontend
echo ""
echo "📝 Actualizando frontend/.env.local..."
ENV_FILE="frontend/.env.local"

cat > "$ENV_FILE" <<EOF
# ICP Configuration
NEXT_PUBLIC_IC_HOST=https://icp0.io
NEXT_PUBLIC_DFX_NETWORK=playground

# Playground Canister IDs (Auto-generados: $(date))
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=$RUNE_ENGINE
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=$BITCOIN
NEXT_PUBLIC_REGISTRY_CANISTER_ID=$REGISTRY
NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=$IDENTITY

# Mainnet Canister IDs (BACKUP - deployed with 10T cycles)
# NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=yz6hf-qqaaa-aaaah-arn5a-cai
# NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=y67br-5iaaa-aaaah-arn5q-cai

# Internet Identity (mainnet)
NEXT_PUBLIC_INTERNET_IDENTITY_CANISTER_ID=rdmx6-jaaaa-aaaaa-aaadq-cai

# Bitcoin Network
NEXT_PUBLIC_BITCOIN_NETWORK=testnet

# Feature Flags
NEXT_PUBLIC_TESTNET_MODE=true
NEXT_PUBLIC_SHOW_DEBUG_INFO=true

# NFT.Storage API Key
NEXT_PUBLIC_NFT_STORAGE_API_KEY=your-nft-storage-api-key
EOF

echo "✅ .env.local actualizado"

# 6. Resumen
echo ""
echo "✨ ¡Deployment completado exitosamente!"
echo ""
echo "📚 Candid UIs:"
echo "  Rune Engine: https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$RUNE_ENGINE"
echo "  Bitcoin:     https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$BITCOIN"
echo "  Registry:    https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=$REGISTRY"
echo ""
echo "🚀 Siguiente paso:"
echo "   cd frontend && npm run dev"
echo "   Luego abre: http://localhost:3000"
echo ""
echo "⚠️  IMPORTANTE: Los canisters de Playground expiran en ~20 minutos"
echo "   Para re-deployar: ./scripts/deploy-playground.sh"
