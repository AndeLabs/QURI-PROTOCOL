#!/bin/bash
# Script de verificación de seguridad Pinata
# Verifica que el JWT no esté expuesto en el cliente

set -e

echo "🔍 Verificando seguridad de Pinata JWT..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Verificar que PINATA_JWT existe en .env.production
echo "1️⃣  Verificando variables de entorno..."
if grep -q "^PINATA_JWT=" frontend/.env.production; then
    echo -e "${GREEN}✓ PINATA_JWT encontrado en .env.production${NC}"
else
    echo -e "${RED}✗ PINATA_JWT NO encontrado en .env.production${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 2. Verificar que NEXT_PUBLIC_PINATA_JWT NO existe en .env.production
if grep -q "^NEXT_PUBLIC_PINATA_JWT=" frontend/.env.production; then
    echo -e "${RED}✗ NEXT_PUBLIC_PINATA_JWT aún existe en .env.production (INSEGURO!)${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ NEXT_PUBLIC_PINATA_JWT no encontrado (correcto)${NC}"
fi

# 3. Verificar .env.example
echo ""
echo "2️⃣  Verificando .env.example..."
if grep -q "PINATA_JWT=" frontend/.env.example; then
    echo -e "${GREEN}✓ PINATA_JWT presente en .env.example${NC}"
else
    echo -e "${YELLOW}⚠ PINATA_JWT no documentado en .env.example${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 4. Verificar que existen los API routes
echo ""
echo "3️⃣  Verificando API routes..."
if [ -f "frontend/app/api/pinata/upload/route.ts" ]; then
    echo -e "${GREEN}✓ /api/pinata/upload/route.ts existe${NC}"
else
    echo -e "${RED}✗ /api/pinata/upload/route.ts NO existe${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "frontend/app/api/pinata/pin/route.ts" ]; then
    echo -e "${GREEN}✓ /api/pinata/pin/route.ts existe${NC}"
else
    echo -e "${RED}✗ /api/pinata/pin/route.ts NO existe${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 5. Verificar que existe el hook usePinata
echo ""
echo "4️⃣  Verificando hook usePinata..."
if [ -f "frontend/hooks/usePinata.ts" ]; then
    echo -e "${GREEN}✓ usePinata hook existe${NC}"
else
    echo -e "${RED}✗ usePinata hook NO existe${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 6. Verificar que los archivos antiguos usan los API routes
echo ""
echo "5️⃣  Verificando migración de archivos antiguos..."
if grep -q "'/api/pinata/" frontend/lib/storage/pinata-storage.ts; then
    echo -e "${GREEN}✓ pinata-storage.ts usa API routes${NC}"
else
    echo -e "${YELLOW}⚠ pinata-storage.ts podría no usar API routes${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if grep -q "'/api/pinata/" frontend/lib/storage/ipfs.ts; then
    echo -e "${GREEN}✓ ipfs.ts usa API routes${NC}"
else
    echo -e "${YELLOW}⚠ ipfs.ts podría no usar API routes${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 7. Buscar usos de NEXT_PUBLIC_PINATA_JWT en el código
echo ""
echo "6️⃣  Buscando usos de NEXT_PUBLIC_PINATA_JWT en el código..."
JWT_USAGE=$(grep -r "NEXT_PUBLIC_PINATA" frontend/lib frontend/components frontend/app --exclude-dir=node_modules --exclude-dir=.next --exclude="*.md" 2>/dev/null || true)

if [ -z "$JWT_USAGE" ]; then
    echo -e "${GREEN}✓ No se encontraron usos de NEXT_PUBLIC_PINATA_JWT${NC}"
else
    echo -e "${RED}✗ Se encontraron usos de NEXT_PUBLIC_PINATA_JWT:${NC}"
    echo "$JWT_USAGE"
    ERRORS=$((ERRORS + 1))
fi

# 8. Verificar que el JWT no está hardcoded en el código
echo ""
echo "7️⃣  Verificando que no hay JWTs hardcoded..."
HARDCODED_JWT=$(grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" frontend/lib frontend/components frontend/app --exclude-dir=node_modules --exclude-dir=.next --exclude="*.env*" --exclude="*.md" 2>/dev/null || true)

if [ -z "$HARDCODED_JWT" ]; then
    echo -e "${GREEN}✓ No se encontraron JWTs hardcoded en el código${NC}"
else
    echo -e "${RED}✗ Se encontraron JWTs hardcoded (CRÍTICO):${NC}"
    echo "$HARDCODED_JWT"
    ERRORS=$((ERRORS + 1))
fi

# 9. Verificar documentación
echo ""
echo "8️⃣  Verificando documentación..."
if [ -f "frontend/app/api/pinata/README.md" ]; then
    echo -e "${GREEN}✓ Documentación de API routes existe${NC}"
else
    echo -e "${YELLOW}⚠ Documentación de API routes no encontrada${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f "docs/MIGRATION_PINATA_SECURITY.md" ]; then
    echo -e "${GREEN}✓ Guía de migración existe${NC}"
else
    echo -e "${YELLOW}⚠ Guía de migración no encontrada${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 10. Verificar build (si node_modules existe)
echo ""
echo "9️⃣  Verificando configuración de build..."
if [ -d "frontend/node_modules" ]; then
    echo "Verificando que el build funcionará correctamente..."

    # Verificar que Next.js está instalado
    if [ -d "frontend/node_modules/next" ]; then
        echo -e "${GREEN}✓ Next.js está instalado${NC}"
    else
        echo -e "${RED}✗ Next.js NO está instalado${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ node_modules no encontrado, saltando verificación de build${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Resumen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 RESUMEN DE VERIFICACIÓN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ TODAS LAS VERIFICACIONES PASARON${NC}"
    echo ""
    echo "La migración de seguridad de Pinata está completa y correcta."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  VERIFICACIÓN COMPLETADA CON ADVERTENCIAS${NC}"
    echo ""
    echo "Errores: $ERRORS"
    echo "Advertencias: $WARNINGS"
    echo ""
    echo "La migración es funcional pero hay algunas advertencias menores."
    exit 0
else
    echo -e "${RED}❌ VERIFICACIÓN FALLÓ${NC}"
    echo ""
    echo "Errores: $ERRORS"
    echo "Advertencias: $WARNINGS"
    echo ""
    echo "Por favor corrige los errores antes de continuar."
    exit 1
fi
