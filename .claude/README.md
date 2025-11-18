# QURI Protocol - Claude Code Configuration

Este directorio contiene la configuración personalizada de Claude Code para el proyecto QURI Protocol.

## 📋 Estructura

```
.claude/
├── agents/          # Subagentes especializados
│   ├── rust-icp-backend.md
│   ├── frontend-react.md
│   ├── bitcoin-runes.md
│   ├── devops-deploy.md
│   ├── testing-qa.md
│   └── security-audit.md
├── commands/        # Slash commands personalizados
│   ├── test-canister.md
│   ├── deploy-check.md
│   ├── analyze-cycles.md
│   ├── icp-docs.md
│   ├── quick-deploy.md
│   ├── debug-etching.md
│   └── project-status.md
└── README.md       # Este archivo
```

---

## 🤖 Subagentes Especializados

### 1. **@rust-icp-backend** 🦀 (Orange)
**Especialidad:** Desarrollo de canisters en Rust e ICP

**Úsalo para:**
- Implementar nuevos endpoints de canisters
- Optimizar WASM binary size
- Trabajar con stable structures
- Debugging de upgrades
- Implementar threshold signatures
- Optimización de cycles

**Ejemplo:**
```
@rust-icp-backend ayúdame a optimizar el tamaño del WASM del canister rune-engine
```

---

### 2. **@frontend-react** ⚛️ (Blue)
**Especialidad:** Next.js 14, React 18, TypeScript, Tailwind

**Úsalo para:**
- Crear nuevos componentes UI
- Implementar formularios con validación
- Integrar nuevos endpoints de canisters
- Optimizar bundle size
- Trabajar con TanStack Query
- Implementar autenticación con Internet Identity

**Ejemplo:**
```
@frontend-react crea un componente para mostrar el historial de transacciones
```

---

### 3. **@bitcoin-runes** ₿ (Yellow)
**Especialidad:** Protocolo Bitcoin, Runes, UTXO, Cryptography

**Úsalo para:**
- Implementar lógica de Runestone
- Debuggear transacciones Bitcoin
- Optimizar selección de UTXO
- Trabajar con threshold signatures
- Validar encoding de Runes
- Gestión de fees

**Ejemplo:**
```
@bitcoin-runes ayúdame a debuggear por qué el Runestone no se está encodando correctamente
```

---

### 4. **@devops-deploy** 🚀 (Green)
**Especialidad:** Deployment, CI/CD, Infrastructure, Monitoring

**Úsalo para:**
- Deployar canisters (local/testnet/mainnet)
- Gestionar cycles
- Configurar CI/CD
- Monitoring de canisters
- Troubleshooting de deployments
- Gestión de Vercel

**Ejemplo:**
```
@devops-deploy necesito deployar a mainnet, ayúdame con el checklist
```

---

### 5. **@testing-qa** 🧪 (Purple)
**Especialidad:** Testing, QA, Coverage, E2E

**Úsalo para:**
- Escribir tests unitarios (Rust y TypeScript)
- Crear tests de integración
- Implementar E2E tests
- Mejorar code coverage
- Debugging de tests fallidos
- Performance benchmarking

**Ejemplo:**
```
@testing-qa escribe tests para el confirmation_tracker module
```

---

### 6. **@security-audit** 🔒 (Red)
**Especialidad:** Security, Vulnerability Assessment, Auditing

**Úsalo para:**
- Auditoría de código para vulnerabilidades
- Revisar access control
- Validar input sanitization
- Analizar cryptographic implementations
- Security checklist pre-deployment
- Threat modeling

**Ejemplo:**
```
@security-audit revisa el código de signature verification en busca de vulnerabilidades
```

---

## 💻 Slash Commands Personalizados

### `/test-canister [nombre]`
Ejecuta tests comprehensivos para un canister específico
- Corre cargo test, clippy, y build
- Verifica tamaño de WASM
- Reporta pass/fail status

**Ejemplo:**
```
/test-canister rune-engine
```

---

### `/deploy-check`
Ejecuta checklist completo pre-deployment
- Tests backend y frontend
- Type check
- Git status
- Canister cycles balance
- Build verification

**Ejemplo:**
```
/deploy-check
```

---

### `/analyze-cycles`
Analiza consumo de cycles de todos los canisters
- Extrae métricas de cada canister
- Calcula burn rate
- Estima runway
- Recomienda top-ups

**Ejemplo:**
```
/analyze-cycles
```

---

### `/icp-docs [topic]`
Busca documentación de ICP usando Brave Search/Context7
- Busca en internetcomputer.org
- Busca ejemplos en GitHub
- Encuentra forum discussions

**Ejemplo:**
```
/icp-docs threshold schnorr signatures
```

---

### `/quick-deploy`
Helper rápido para deployment
- Selecciona environment (local/testnet/mainnet)
- Ejecuta deployment apropiado
- Verifica post-deployment

**Ejemplo:**
```
/quick-deploy
```

---

### `/debug-etching`
Debug del proceso de Rune etching
- Verifica canister health
- Chequea logs recientes
- Verifica Bitcoin integration
- Tests E2E
- Chequea issues comunes

**Ejemplo:**
```
/debug-etching
```

---

### `/project-status`
Estado completo del proyecto QURI
- Codebase health (tests, linting)
- Deployment status (canisters)
- Git status
- Dependencies
- Build status
- Documentation

**Ejemplo:**
```
/project-status
```

---

## 🎯 Workflows Recomendados

### Desarrollo de Nueva Feature (Backend)
```
1. @rust-icp-backend implementa feature X
2. @testing-qa escribe tests para feature X
3. @security-audit revisa seguridad de feature X
4. /test-canister rune-engine
5. @devops-deploy ayuda con deployment
```

### Desarrollo de Nueva Feature (Frontend)
```
1. @frontend-react crea componente Y
2. @testing-qa escribe tests para componente Y
3. /deploy-check
4. @devops-deploy deploy a Vercel
```

### Pre-Deployment
```
1. /project-status
2. /deploy-check
3. /analyze-cycles
4. @security-audit final security review
5. @devops-deploy ejecuta deployment
```

### Debugging Issue
```
1. /debug-etching (si es related a etching)
2. @[agente-apropiado] analiza el issue
3. @testing-qa crea regression test
4. @security-audit verifica si hay implicaciones de seguridad
```

---

## 🔍 MCPs Configurados

Los siguientes MCPs están configurados para este proyecto:

1. **GitHub** - Gestión de repos, PRs, issues
2. **Brave Search** - Búsqueda de documentación
3. **Memory** - Contexto persistente
4. **Filesystem** - Navegación optimizada
5. **Sequential Thinking** - Razonamiento profundo

### Configurar Tokens (Opcional)

Para aprovechar al máximo los MCPs:

```bash
# GitHub Token
claude mcp configure github
# Agregar: GITHUB_PERSONAL_ACCESS_TOKEN=ghp_xxx

# Brave Search API Key
claude mcp configure brave-search
# Agregar: BRAVE_API_KEY=BSA_xxx
```

---

## 📚 Context7 Integration

Usa Context7 para documentación actualizada:

```
use context7 [technology] [query]
```

**Ejemplos:**
- `use context7 ic-cdk latest documentation`
- `use context7 Next.js 14 app router`
- `use context7 Bitcoin Runes protocol specification`
- `use context7 TanStack Query v5 usage guide`

---

## 🎨 Colores de Agentes

Los agentes usan colores para fácil identificación:

- 🦀 **Orange** - Rust/ICP Backend
- ⚛️ **Blue** - Frontend/React
- ₿ **Yellow** - Bitcoin/Runes
- 🚀 **Green** - DevOps/Deploy
- 🧪 **Purple** - Testing/QA
- 🔒 **Red** - Security Audit

---

## 💡 Tips

1. **Combina agentes**: Puedes mencionar múltiples agentes en un mismo prompt
2. **Slash commands en secuencia**: Usa múltiples slash commands para workflows completos
3. **Context7**: Úsalo para obtener docs actualizadas antes de implementar
4. **Memory MCP**: Guarda información importante del proyecto para futuras sesiones

---

## 🆘 Ayuda

Para más información:
- `/help` - Ver todos los comandos disponibles
- `claude mcp list` - Ver MCPs instalados
- Ver documentación oficial: https://docs.claude.com/

---

**Última actualización:** 2025-11-18
**Versión:** 1.0.0
