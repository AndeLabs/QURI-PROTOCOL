# Comandos Útiles para Auditoría Frontend

## VERIFICACIÓN RÁPIDA

### 1. Type Checking
```bash
# Verificar errores de TypeScript
npm run type-check

# Ver errores específicos
npx tsc --noEmit --pretty

# Contar errores
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

### 2. Buscar Código Muerto

#### Encontrar componentes no importados
```bash
# Buscar archivos .tsx que exportan componentes
find . -name "*.tsx" -type f ! -path "*/node_modules/*" -exec grep -l "export" {} \;

# Verificar si un componente está importado
grep -r "from '@/components/RuneCard'" . --include="*.tsx" --include="*.ts"
```

#### Encontrar hooks no usados
```bash
# Listar todos los hooks
ls -la hooks/

# Verificar uso de un hook específico
grep -r "useOrdinalsV2" . --include="*.tsx" --include="*.ts"
```

### 3. Análisis de Imports

#### Encontrar imports muertos (no usados)
```bash
# ESLint puede detectar imports no usados
npx eslint . --ext .ts,.tsx --format compact | grep "is defined but never used"
```

#### Buscar any en el código
```bash
# Buscar todas las ocurrencias de : any
grep -rn ": any" . --include="*.ts" --include="*.tsx" | grep -v node_modules

# Contar usos de any
grep -r ": any" . --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

### 4. TODOs y FIXMEs

```bash
# Buscar todos los TODOs
grep -rn "TODO" . --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules

# Buscar FIXMEs
grep -rn "FIXME" . --include="*.ts" --include="*.tsx" | grep -v node_modules

# Buscar @ts-ignore (code smells)
grep -rn "@ts-ignore\|@ts-expect-error" . --include="*.ts" --include="*.tsx" | grep -v node_modules
```

---

## ANÁLISIS DE BUNDLE

### 1. Analizar tamaño del bundle

```bash
# Instalar analizador
npm install --save-dev @next/bundle-analyzer

# Agregar a next.config.js:
# const withBundleAnalyzer = require('@next/bundle-analyzer')({
#   enabled: process.env.ANALYZE === 'true',
# })
# module.exports = withBundleAnalyzer(nextConfig)

# Analizar
ANALYZE=true npm run build
```

### 2. Ver dependencias más pesadas

```bash
# Listar tamaño de node_modules
du -sh node_modules/* | sort -hr | head -20

# Analizar package.json
npx depcheck

# Encontrar dependencias no usadas
npx depcheck --json | jq '.dependencies'
```

---

## CLIENT VS SERVER COMPONENTS

### 1. Contar Client Components

```bash
# Total de archivos en app/
find app -name "*.tsx" | wc -l

# Client components (con 'use client')
grep -r "use client" app --include="*.tsx" | wc -l

# Listar todos los Client Components
grep -l "use client" app/**/*.tsx
```

### 2. Verificar uso correcto

```bash
# Buscar componentes que usan hooks (deben ser Client)
grep -r "useState\|useEffect\|useCallback" app --include="*.tsx" | grep -v "use client"

# Esto mostrará archivos que usan hooks pero no tienen 'use client'
```

---

## TESTING

### 1. Ejecutar tests

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# UI mode
npm run test:ui
```

### 2. Verificar cobertura

```bash
# Generar reporte de coverage
npm run test:coverage

# Ver reporte HTML
open coverage/index.html
```

### 3. Encontrar archivos sin tests

```bash
# Listar componentes
ls components/*.tsx

# Listar tests
ls __tests__/*.test.tsx

# Comparar para encontrar faltantes (manual)
```

---

## PERFORMANCE

### 1. Lighthouse Audit

```bash
# Build production
npm run build
npm run start

# En otra terminal, ejecutar Lighthouse
npx lighthouse http://localhost:3000 --view
```

### 2. Bundle Size Analysis

```bash
# Ver tamaño de archivos compilados
ls -lh .next/static/chunks/

# Buscar archivos grandes (>100KB)
find .next/static/chunks -size +100k -ls
```

---

## LIMPIEZA AUTOMATIZADA

### 1. Ejecutar script de cleanup

```bash
# Ejecutar cleanup automático (HACE BACKUP)
./scripts/cleanup-audit.sh

# Verificar backup
ls -la .backup-*
```

### 2. Limpiar manualmente

```bash
# Limpiar .next
rm -rf .next

# Limpiar node_modules
rm -rf node_modules package-lock.json
npm install

# Limpiar cache
rm -rf .next/cache
```

---

## BÚSQUEDA DE PATRONES ESPECÍFICOS

### 1. Encontrar state management

```bash
# Encontrar useState
grep -rn "useState" . --include="*.tsx" | grep -v node_modules | wc -l

# Encontrar Zustand stores
grep -rn "create<" . --include="*.ts" | grep -v node_modules

# Encontrar TanStack Query
grep -rn "useQuery\|useMutation" . --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

### 2. Encontrar props no usadas

```bash
# Buscar destructuring de props
grep -rn "^export.*{.*}.*Props" . --include="*.tsx"

# Esto es manual, necesitas revisar cada componente
```

### 3. Encontrar console.logs (code smell)

```bash
# Buscar console.log (deben usar logger)
grep -rn "console.log\|console.error" . --include="*.ts" --include="*.tsx" | grep -v node_modules
```

---

## MIGRATION HELPERS

### 1. Migrar RuneCard a RuneCardSimple

```bash
# Buscar todos los archivos que importan RuneCard legacy
grep -rl "from '@/components/RuneCard'" . --include="*.tsx" --include="*.ts"

# Reemplazar automáticamente (PRECAUCIÓN: revisar después)
find . -name "*.tsx" -type f -exec sed -i '' 's/from '\''@\/components\/RuneCard'\''/from '\''@\/components\/runes\/RuneCardSimple'\''/g' {} \;
```

### 2. Reemplazar any por unknown

```bash
# Buscar funciones con any
grep -rn "function.*any\|const.*any" . --include="*.ts" --include="*.tsx"

# Manual replacement con verificación
```

---

## VALIDACIÓN FINAL

### 1. Checklist antes de commit

```bash
#!/bin/bash

echo "Running pre-commit checks..."

# 1. Type check
echo "1. Type checking..."
npm run type-check || exit 1

# 2. Lint
echo "2. Linting..."
npm run lint || exit 1

# 3. Tests
echo "3. Running tests..."
npm run test || exit 1

# 4. Build
echo "4. Building..."
npm run build || exit 1

echo "✓ All checks passed!"
```

### 2. Verificar no hay regresiones

```bash
# Antes de merge, verificar:
git diff --stat main...HEAD

# Ver archivos cambiados
git diff --name-only main...HEAD

# Revisar cambios en package.json
git diff main...HEAD -- package.json
```

---

## DEBUGGING

### 1. Problemas de build

```bash
# Clean build
rm -rf .next
npm run build

# Ver errores detallados
DEBUG=* npm run build

# Build en modo desarrollo
npm run dev
```

### 2. Problemas de types

```bash
# Regenerar types de Candid
npm run generate:types

# Verificar paths de TypeScript
npx tsc --showConfig
```

---

## MONITOREO CONTINUO

### 1. Git hooks

Agregar a `.husky/pre-commit`:
```bash
#!/bin/sh
npm run type-check
npm run lint
npm run test
```

### 2. CI/CD checks

GitHub Actions workflow:
```yaml
- name: Type Check
  run: npm run type-check

- name: Lint
  run: npm run lint

- name: Test
  run: npm run test

- name: Build
  run: npm run build
```

---

## REFERENCIAS RÁPIDAS

### Archivos clave de configuración

```bash
# TypeScript
cat tsconfig.json

# ESLint
cat .eslintrc.json

# Next.js
cat next.config.js

# Vitest
cat vitest.config.ts

# Package.json
cat package.json | jq '.scripts'
```

### Estadísticas del proyecto

```bash
# Contar líneas de código
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l | tail -1

# Contar archivos
find . -name "*.ts" -o -name "*.tsx" | wc -l

# Tamaño total
du -sh .
```

---

## TIPS FINALES

1. **Antes de eliminar:** Siempre hacer backup o crear branch
2. **Búsqueda global:** Usar grep/ripgrep para verificar imports
3. **Type checking:** Ejecutar frecuentemente durante refactor
4. **Tests:** Escribir tests antes de refactorizar
5. **Commits pequeños:** Hacer commits atómicos para fácil rollback

---

**Generado por:** Auditoría Frontend QURI Protocol
**Fecha:** 2025-11-24
