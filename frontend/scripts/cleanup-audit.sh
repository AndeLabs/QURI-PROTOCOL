#!/bin/bash

# QURI Protocol Frontend Cleanup Script
# Basado en AUDIT_REPORT.md
# Fecha: 2025-11-24

set -e  # Exit on error

echo "🔍 QURI Protocol Frontend Cleanup"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backup directory
BACKUP_DIR=".backup-$(date +%Y%m%d-%H%M%S)"

# Function to create backup
backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        mkdir -p "$BACKUP_DIR/$(dirname $file)"
        cp "$file" "$BACKUP_DIR/$file"
        echo -e "${GREEN}✓${NC} Backed up: $file"
    fi
}

# Function to remove file safely
remove_file() {
    local file=$1
    if [ -f "$file" ]; then
        backup_file "$file"
        rm "$file"
        echo -e "${GREEN}✓${NC} Removed: $file"
    else
        echo -e "${YELLOW}⚠${NC} File not found: $file"
    fi
}

echo "Step 1: Creating backup directory..."
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓${NC} Backup directory created: $BACKUP_DIR"
echo ""

# ============================================================================
# STEP 2: Remove duplicate RuneCard components
# ============================================================================
echo "Step 2: Removing duplicate RuneCard components..."

# Legacy RuneCard (uses RuneData interface, not RegistryEntry)
if [ -f "components/RuneCard.tsx" ]; then
    echo -e "${YELLOW}⚠${NC} Found legacy RuneCard.tsx"
    echo "   This file uses custom RuneData interface instead of RegistryEntry"
    echo "   It should be migrated to RuneCardSimple before deletion"

    # Check for imports
    IMPORTS=$(grep -r "from '@/components/RuneCard'" . --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
    echo "   Found $IMPORTS imports of legacy RuneCard"

    if [ "$IMPORTS" -gt 0 ]; then
        echo -e "${RED}✗${NC} Cannot remove: File is still imported"
        echo "   Run migration first: npm run migrate:rune-card"
    else
        remove_file "components/RuneCard.tsx"
    fi
fi

# Duplicate RuneCard in runes/ folder
if [ -f "components/runes/RuneCard.tsx" ]; then
    echo -e "${YELLOW}⚠${NC} Found components/runes/RuneCard.tsx"
    echo "   This is a duplicate of RuneCardSimple functionality"

    IMPORTS=$(grep -r "from '@/components/runes/RuneCard'" . --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
    echo "   Found $IMPORTS imports"

    if [ "$IMPORTS" -gt 0 ]; then
        echo -e "${RED}✗${NC} Cannot remove: File is still imported"
        echo "   Migrate imports to RuneCardSimple first"
    else
        remove_file "components/runes/RuneCard.tsx"
    fi
fi

echo ""

# ============================================================================
# STEP 3: Remove unused hooks
# ============================================================================
echo "Step 3: Removing unused hooks..."

# Check useOrdinalsV2
if [ -f "hooks/useOrdinalsV2.ts" ]; then
    IMPORTS=$(grep -r "from '@/hooks/useOrdinalsV2'" . --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
    echo "useOrdinalsV2: $IMPORTS imports found"

    if [ "$IMPORTS" -eq 0 ]; then
        remove_file "hooks/useOrdinalsV2.ts"
    else
        echo -e "${RED}✗${NC} Cannot remove: Still imported in $IMPORTS files"
    fi
fi

# Check useRunesV2
if [ -f "hooks/useRunesV2.ts" ]; then
    IMPORTS=$(grep -r "from '@/hooks/useRunesV2'" . --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
    echo "useRunesV2: $IMPORTS imports found"

    if [ "$IMPORTS" -eq 0 ]; then
        remove_file "hooks/useRunesV2.ts"
    else
        echo -e "${RED}✗${NC} Cannot remove: Still imported in $IMPORTS files"
    fi
fi

# Check useInfiniteRunes (has 1 usage, may be legacy)
if [ -f "hooks/useInfiniteRunes.ts" ]; then
    IMPORTS=$(grep -r "from '@/hooks/useInfiniteRunes'" . --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
    echo "useInfiniteRunes: $IMPORTS imports found"

    if [ "$IMPORTS" -le 1 ]; then
        echo -e "${YELLOW}⚠${NC} Low usage ($IMPORTS), consider migrating to useRuneExplorer"
    fi
fi

echo ""

# ============================================================================
# STEP 4: Remove backup files
# ============================================================================
echo "Step 4: Removing old backup files..."

remove_file "lib/storage/nft-storage.ts.old"

# Check for other .old or .backup files
OLD_FILES=$(find . -name "*.old" -o -name "*.backup" -o -name "*.bak" | grep -v node_modules | grep -v .next)
if [ -n "$OLD_FILES" ]; then
    echo -e "${YELLOW}⚠${NC} Found additional old files:"
    echo "$OLD_FILES"
fi

echo ""

# ============================================================================
# STEP 5: Update ESLint config
# ============================================================================
echo "Step 5: Updating ESLint configuration..."

if [ -f ".eslintrc.json" ]; then
    backup_file ".eslintrc.json"

    # Check if no-explicit-any is already error
    if grep -q '"@typescript-eslint/no-explicit-any": "error"' .eslintrc.json; then
        echo -e "${GREEN}✓${NC} ESLint already configured correctly"
    else
        echo -e "${YELLOW}⚠${NC} Updating ESLint to enforce no-explicit-any"
        # Note: This is a simple sed replacement, adjust as needed
        sed -i.bak 's/"@typescript-eslint\/no-explicit-any": "warn"/"@typescript-eslint\/no-explicit-any": "error"/' .eslintrc.json
        rm .eslintrc.json.bak
        echo -e "${GREEN}✓${NC} ESLint config updated"
    fi
fi

echo ""

# ============================================================================
# STEP 6: Generate report
# ============================================================================
echo "Step 6: Generating cleanup report..."

REPORT_FILE="CLEANUP_REPORT_$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Frontend Cleanup Report
**Date:** $(date)
**Backup Location:** $BACKUP_DIR

## Files Removed

EOF

# Count removed files
REMOVED_COUNT=$(find "$BACKUP_DIR" -type f 2>/dev/null | wc -l)

if [ -d "$BACKUP_DIR" ]; then
    echo "### Backed Up Files ($REMOVED_COUNT)" >> "$REPORT_FILE"
    find "$BACKUP_DIR" -type f | sed 's/^/- /' >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" << EOF
## Next Steps

### 1. Verify Build
\`\`\`bash
npm run build
\`\`\`

### 2. Run Type Check
\`\`\`bash
npm run type-check
\`\`\`

### 3. Run Tests
\`\`\`bash
npm run test
\`\`\`

### 4. Commit Changes
\`\`\`bash
git add .
git commit -m "chore: cleanup frontend based on audit report"
\`\`\`

## Rollback Instructions

If anything breaks, restore from backup:
\`\`\`bash
cp -r $BACKUP_DIR/* .
\`\`\`

## Manual Tasks Remaining

- [ ] Migrate RuneCard imports to RuneCardSimple
- [ ] Fix TypeScript errors (run type-check)
- [ ] Write tests for critical components
- [ ] Optimize Server/Client component split
- [ ] Reduce bundle size
EOF

echo -e "${GREEN}✓${NC} Cleanup report generated: $REPORT_FILE"
echo ""

# ============================================================================
# FINAL SUMMARY
# ============================================================================
echo "=========================================="
echo "Cleanup Summary"
echo "=========================================="
echo ""
echo -e "${GREEN}Backup created:${NC} $BACKUP_DIR"
echo -e "${GREEN}Report generated:${NC} $REPORT_FILE"
echo ""

if [ "$REMOVED_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Removed $REMOVED_COUNT files"
else
    echo -e "${YELLOW}⚠${NC} No files were removed (might be already cleaned or still in use)"
fi

echo ""
echo "Next steps:"
echo "1. Review cleanup report: cat $REPORT_FILE"
echo "2. Run build: npm run build"
echo "3. Run tests: npm run test"
echo "4. Commit changes if all passes"
echo ""
echo -e "${YELLOW}Note:${NC} Some files may require manual migration before deletion"
echo "      Check the audit report for migration guides"
echo ""
