#!/bin/bash

# ==================================================
# QURI Protocol - Frontend Deployment Script
# Production-ready deployment automation
# ==================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}QURI Protocol - Frontend Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# ==================================================
# 1. Pre-flight Checks
# ==================================================

echo -e "${YELLOW}[1/7] Running pre-flight checks...${NC}"

# Check if we're in the right directory
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo -e "${RED}Error: Frontend directory not found!${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed!${NC}"
    exit 1
fi

# Check Node version (require 18+)
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}Error: Node.js 18 or higher is required (current: $NODE_VERSION)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Pre-flight checks passed${NC}"
echo

# ==================================================
# 2. Environment Check
# ==================================================

echo -e "${YELLOW}[2/7] Checking environment configuration...${NC}"

cd "$FRONTEND_DIR"

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Warning: .env.production not found${NC}"
    echo -e "${YELLOW}Checking .env.local...${NC}"

    if [ ! -f ".env.local" ]; then
        echo -e "${RED}Error: No environment file found!${NC}"
        echo -e "${YELLOW}Please create .env.production or .env.local${NC}"
        echo -e "${YELLOW}See .env.production.example for reference${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Environment configuration found${NC}"
echo

# ==================================================
# 3. Clean Previous Builds
# ==================================================

echo -e "${YELLOW}[3/7] Cleaning previous builds...${NC}"

# Remove old build artifacts
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

echo -e "${GREEN}✓ Previous builds cleaned${NC}"
echo

# ==================================================
# 4. Install Dependencies
# ==================================================

echo -e "${YELLOW}[4/7] Installing dependencies...${NC}"

npm ci --silent

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo

# ==================================================
# 5. Run Linting
# ==================================================

echo -e "${YELLOW}[5/7] Running linting...${NC}"

if ! npm run lint; then
    echo -e "${RED}Error: Linting failed!${NC}"
    echo -e "${YELLOW}Please fix linting errors before deploying${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Linting passed${NC}"
echo

# ==================================================
# 6. Build Production Bundle
# ==================================================

echo -e "${YELLOW}[6/7] Building production bundle...${NC}"

if ! npm run build; then
    echo -e "${RED}Error: Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Production bundle built successfully${NC}"
echo

# ==================================================
# 7. Deployment Options
# ==================================================

echo -e "${YELLOW}[7/7] Deployment options:${NC}"
echo
echo "Select deployment target:"
echo "  1) Vercel (Recommended)"
echo "  2) Local test (npm start)"
echo "  3) Static export (next export)"
echo "  4) Skip deployment (build only)"
echo

read -p "Enter choice [1-4]: " deployment_choice

case $deployment_choice in
    1)
        echo -e "${YELLOW}Deploying to Vercel...${NC}"

        # Check if Vercel CLI is installed
        if ! command -v vercel &> /dev/null; then
            echo -e "${RED}Error: Vercel CLI not installed${NC}"
            echo -e "${YELLOW}Install with: npm install -g vercel${NC}"
            exit 1
        fi

        # Deploy
        vercel --prod

        echo -e "${GREEN}✓ Deployed to Vercel${NC}"
        ;;

    2)
        echo -e "${YELLOW}Starting local production server...${NC}"
        echo -e "${GREEN}Server will be available at http://localhost:3000${NC}"
        npm start
        ;;

    3)
        echo -e "${YELLOW}Exporting static site...${NC}"
        npm run export
        echo -e "${GREEN}✓ Static site exported to ./out/${NC}"
        echo -e "${YELLOW}Deploy the ./out/ directory to your hosting provider${NC}"
        ;;

    4)
        echo -e "${GREEN}Build completed successfully${NC}"
        echo -e "${YELLOW}Deployment skipped${NC}"
        ;;

    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment process completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo

# ==================================================
# Post-Deployment Checklist
# ==================================================

echo -e "${YELLOW}Post-Deployment Checklist:${NC}"
echo "  [ ] Verify application loads correctly"
echo "  [ ] Test Internet Identity login"
echo "  [ ] Test Rune creation flow"
echo "  [ ] Check error boundaries work"
echo "  [ ] Verify logging is working"
echo "  [ ] Test on mobile devices"
echo "  [ ] Monitor error tracking service"
echo "  [ ] Check security headers"
echo

exit 0
