# QURI Protocol - Quick Reference

## 🚀 Quick Start

### Invocar Agentes
```
@rust-icp-backend [tu pregunta]
@frontend-react [tu pregunta]
@bitcoin-runes [tu pregunta]
@devops-deploy [tu pregunta]
@testing-qa [tu pregunta]
@security-audit [tu pregunta]
```

### Slash Commands
```
/test-canister [nombre]     # Test específico de canister
/deploy-check               # Checklist pre-deployment
/analyze-cycles             # Análisis de cycles
/icp-docs [topic]          # Buscar docs de ICP
/quick-deploy              # Deploy helper
/debug-etching             # Debug etching flow
/project-status            # Estado del proyecto
```

---

## 📋 Canister IDs (Mainnet)

```
rune-engine:         pkrpq-5qaaa-aaaah-aroda-cai
bitcoin-integration: yz6hf-qqaaa-aaaah-arn5a-cai
registry:            pnqje-qiaaa-aaaah-arodq-cai
identity-manager:    y67br-5iaaa-aaaah-arn5q-cai
```

---

## 🔧 Common Commands

### Backend
```bash
# Tests
cargo test --workspace
cargo test -p rune-engine
cargo clippy --workspace

# Build WASM
cargo build --target wasm32-unknown-unknown --release

# Security
cargo audit
```

### Frontend
```bash
# Tests
npm test
npm run test:coverage

# Build
npm run build
npm run type-check

# Dev
npm run dev
```

### Deployment
```bash
# Local
dfx start --background --clean
./scripts/deploy-local.sh

# Status
dfx canister status --network ic <canister-id>

# Cycles
dfx cycles top-up --network ic <canister-id> <amount>
```

---

## 🎯 Typical Workflows

### New Backend Feature
```
1. @rust-icp-backend implement feature
2. @testing-qa write tests
3. @security-audit review
4. /test-canister [name]
5. @devops-deploy help with deployment
```

### New Frontend Feature
```
1. @frontend-react create component
2. @testing-qa write tests
3. /deploy-check
4. @devops-deploy deploy
```

### Pre-Deployment
```
1. /project-status
2. /deploy-check
3. /analyze-cycles
4. @security-audit final review
5. @devops-deploy execute
```

---

## 🆘 Emergency

### Canister Out of Cycles
```bash
dfx cycles top-up --network ic <canister-id> 10000000000000
```

### Deployment Failed
```
1. Check dfx logs
2. @devops-deploy help troubleshoot
3. Verify cycles balance
```

### Bug Found
```
1. @[relevant-agent] analyze
2. @testing-qa create regression test
3. @security-audit check security impact
```

---

## 📊 Targets

- Query response: <200ms
- WASM size: <2MB per canister
- Cycles minimum: >100B per canister
- Test coverage: >80%
- Code quality: cargo clippy passing

---

## 🔐 Security Checklist

- [ ] `cargo audit` passing
- [ ] `npm audit` passing
- [ ] All tests passing
- [ ] Input validation on all inputs
- [ ] Access control on sensitive operations
- [ ] No hardcoded secrets
- [ ] Security headers configured

---

## 💡 Pro Tips

1. Use `use context7 [tech] [query]` for latest docs
2. Combine multiple agents in one prompt
3. Chain slash commands for complete workflows
4. Save important info with Memory MCP
5. Use `/project-status` before starting work

---

## 🔗 Links

- Docs: https://docs.claude.com/
- ICP Docs: https://internetcomputer.org/docs
- GitHub: [your-repo-url]
- Vercel: [your-vercel-url]

---

**Need Help?** Type `/help` or check `.claude/README.md`
