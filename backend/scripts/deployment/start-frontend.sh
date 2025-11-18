#!/bin/bash

# QURI Protocol - Start Frontend
# Este script inicia el frontend con las variables de entorno correctas

cd "$(dirname "$0")/frontend"

echo "🚀 Iniciando QURI Protocol Frontend..."
echo ""
echo "Variables de entorno:"
echo "  IC_HOST: $(grep NEXT_PUBLIC_IC_HOST .env.local | cut -d= -f2)"
echo "  Network: $(grep NEXT_PUBLIC_IC_NETWORK .env.local | cut -d= -f2)"
echo ""
echo "Canister IDs:"
echo "  Rune Engine: $(grep NEXT_PUBLIC_RUNE_ENGINE .env.local | cut -d= -f2)"
echo "  Bitcoin:     $(grep NEXT_PUBLIC_BITCOIN .env.local | cut -d= -f2)"
echo "  Registry:    $(grep NEXT_PUBLIC_REGISTRY .env.local | cut -d= -f2)"
echo ""
echo "Frontend iniciando en http://localhost:3000"
echo "Presiona Ctrl+C para detener"
echo ""

npm run dev
