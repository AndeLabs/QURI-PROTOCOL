# Recursos ICP Relevantes para QURI Protocol

Este documento contiene recursos específicos del ICP Hackathon Cheat Sheet que son directamente relevantes para el desarrollo de QURI Protocol.

## 🎯 Recursos Críticos para QURI

### 1. **Bitcoin Integration** (Core de QURI)

QURI usa la integración nativa de Bitcoin para crear Runes. Recursos clave:

**Documentación:**
- 📖 [Build on Bitcoin](https://internetcomputer.org/bitcoin) - Overview
- 📖 [Build on Bitcoin Docs](https://internetcomputer.org/docs/build-on-btc/)
- 📖 [Bitcoin Integration - How it Works](https://internetcomputer.org/how-it-works/bitcoin-integration/)
- 📖 [Bitcoin Integration FAQ](https://internetcomputer.org/bitcoin-integration/faq/)

**Videos Educativos:**
- 🎥 [Bitcoin Integration Series](https://youtube.com/playlist?list=PLfEHHr3qexv_L0t6KrCyJ-l2ZaHaO-m85) - Threshold Schnorr & on-chain Bitcoin headers
- 🎥 [Code Native Bitcoin Part 1](https://www.youtube.com/watch?v=LGegOFqP5x0)
- 🎥 [Code Native Bitcoin Part 2](https://www.youtube.com/watch?v=H6Wu9n9Qwa8)

**Ejemplos Relevantes:**
- ⭐ [Basic Bitcoin (Rust)](https://github.com/dfinity/examples/tree/master/rust/basic_bitcoin) - Enviar/recibir BTC + crear Runes/Ordinals/BRC-20
- ⭐ [t-Schnorr (Rust)](https://github.com/dfinity/examples/tree/master/rust/threshold-schnorr) - API de firmas Schnorr (necesario para Runes)
- ⭐ [runes-indexer](https://github.com/octopus-network/runes-indexer) - Indexador on-chain de Runes en ICP

**Herramientas Community:**
- 🛠️ [IC Bitcoin Library](https://github.com/Benjamin-Loison/Internet-Computer-Bitcoin-Library) - Utilidades Rust para Bitcoin Integration
- 🛠️ [Ordinals Canister](https://github.com/sardariuss/ordinals_canister) - Retrieve BTC ordinals
- 🛠️ [Inscription Canister](https://github.com/domwoe/inscription_canister) - Crear Ordinal inscriptions

### 2. **IPFS & Storage** (Metadata de Runes)

QURI almacena metadata de Runes en IPFS via Pinata.

**HTTPS Outcalls (para Pinata API):**
- 📖 [HTTPS Outcalls Docs](https://internetcomputer.org/docs/current/references/https-outcalls-how-it-works)
- 📖 [HTTPS Outcalls Overview](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/advanced-features/https-outcalls/https-outcalls-overview)
- 🎥 [The End of Oracles](https://www.notion.so/12ed413292e740f7b542459b88f31a96) - Lecture
- 💻 [Exchange Rate Canister](https://github.com/dfinity/exchange-rate-canister) - Ejemplo de HTTPS Outcalls
- 💻 [ic-emailer](https://github.com/ArgonStudiosXYZ/ic-emailer) - Ejemplo de API calls

**Storage en ICP:**
- 400 GiB de memoria por canister
- $5 por GiB al año
- [Storage Best Practices](https://internetcomputer.org/docs/current/developer-docs/smart-contracts/best-practices/storage/)

### 3. **Rust CDK** (Backend de QURI)

**Documentación:**
- 📖 [Rust CDK](https://internetcomputer.org/docs/current/developer-docs/backend/rust/)
- 📖 [Effective Rust Canisters](https://mmapped.blog/posts/01-effective-rust-canisters)
- 📖 [Rust CDK API Docs](https://docs.rs/ic-cdk/latest/ic_cdk/)
- 🎥 [Building Rust Canisters](https://www.youtube.com/watch?v=tSI4zHVaetY&list=PLuhDt1vhGcrepqUIM3NjktD6gdMPWUi_i&index=10)
- 🎥 [Best Practices for Rust Canisters](https://www.youtube.com/watch?v=36L33S_DYHY)

**Cursos:**
- 📚 [Rust Canister Bootcamp](https://www.risein.com/courses/build-on-internet-computer-with-icp-rust-cdk)
- 📚 [Rust Smart Contract 101](https://dacade.org/communities/icp/courses/rust-smart-contract-101/learning-modules/3709d471-cd65-495d-b580-c0dbc2f1f5d8)

### 4. **Frontend Integration** (React + agent-js)

**Agent Libraries:**
- 🔧 [agent-js](https://github.com/dfinity/agent-js) - JavaScript Agent
- 🔧 [ic-js](https://github.com/dfinity/ic-js/tree/main) - Colección de librerías para ICP
- 🔧 [Chrome IC Inspector](https://github.com/jorgenbuilder/ic-inspector) - Debuggear mensajes a canisters

**Autenticación:**
- 🔐 [Internet Identity](https://github.com/dfinity/internet-identity/tree/main)
- 🔐 [identity-kit](https://www.identitykit.xyz/) - Integración rápida de wallets
- 🔐 [Integrate Internet Identity](https://internetcomputer.org/docs/current/developer-docs/identity/internet-identity/integrate-internet-identity)

**Templates React:**
- 💻 [Vite React Motoko](https://github.com/rvanasa/vite-react-motoko)
- 💻 [Vite SvelteKit Motoko](https://github.com/letmejustputthishere/vite-sveltekit-motoko-ii)

### 5. **Chain Fusion** (Interoperabilidad)

Si QURI necesita interactuar con Ethereum u otras chains:

**Documentación:**
- 📖 [Chain Fusion](https://internetcomputer.org/chainfusion)
- 🎥 [Chain Fusion Educate Series](https://youtube.com/playlist?list=PLfEHHr3qexv9bjbFNp3ItK7yBZ5IQVXjf) - 7 workshops

**EVM Integration:**
- 🔧 [ic-alloy](https://o7kje-7yaaa-aaaal-qnaua-cai.icp0.io/) - Rust library para EVMs
- 🔧 [EVM RPC Canister](https://internetcomputer.org/docs/current/developer-docs/multi-chain/ethereum/evm-rpc/overview)
- 💻 [Chain Fusion Starter](https://github.com/letmejustputthishere/chain-fusion-starter)

## 🛠️ Herramientas de Desarrollo

### Essentials
- 📦 [dfx](https://internetcomputer.org/docs/current/developer-docs/developer-tools/dev-tools-overview/#dfx) - CLI principal
- 🖥️ [ICP Ninja](https://icp.ninja/) - Dev environment online (sin instalación local)
- 📊 [ICP Dashboard](https://dashboard.internetcomputer.org/)
- 💰 [ICP Pricing Calculator](https://3d5wy-5aaaa-aaaag-qkhsq-cai.icp0.io/)
- 🔍 [Candid UI](https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/) - Test canisters

### Cycle Management
- 💳 [CycleOps](https://cycleops.dev/)
- 💳 [ICP Top Up](https://www.icptopup.com/)
- 💳 [Cycle Express](https://cycle.express/#)
- 💳 [CanisterGeek](https://canistergeek.app/)

### Explorers
- 🔍 [ICP Dashboard](https://dashboard.internetcomputer.org/)
- 🔍 [IC Explorer](https://www.icexplorer.io/)
- 🔍 [Bitcorn Explorer](https://suemn-5aaaa-aaaap-qb62q-cai.icp0.io/)

## 📚 Tutoriales Recomendados

### Para comenzar:
1. 📖 [Hackathon Prep Course](https://internetcomputer.org/docs/tutorials/hackathon-prep-course)
2. 📖 [Developer Journey](https://internetcomputer.org/docs/current/tutorials/developer-journey/)
3. 🎥 [Developer Journey Videos](https://www.youtube.com/playlist?list=PLuhDt1vhGcrdR2h6nPNylXKS4u8L-efvD)
4. 🎥 [Zero to dApp Series](https://youtube.com/playlist?list=PLfEHHr3qexv8hKOJBV1XR10XhUKkyPIBp)

### Específicos de Bitcoin:
1. Ver los videos de "Code Native Bitcoin" (arriba)
2. Estudiar el ejemplo `basic_bitcoin` en Rust
3. Leer sobre t-Schnorr signatures

## 🆘 Soporte y Comunidad

### Canales Principales:
- 💬 [DFINITY Developer Forum](https://forum.dfinity.org/)
- 💬 [ICP Discord](http://discord.internetcomputer.org) - Canal "ask-kapa-ai"
- 📅 [DFINITY Dev Office Hours](https://calendar.google.com/calendar/u/0?cid=Y19jZ29lcTkxN3JwZWFwN3ZzZTNpczFobDMxMEBncm91cC5jYWxlbmRhci5nb29nbGUuY29t) (Miércoles 9AM & 5PM GMT+2)

### AI Helpers:
- 🤖 [AI DevRel](https://icp-ai-chat-frontend.vercel.app/)
- 🤖 "Ask AI" en [Developer Docs](https://docs.internetcomputer.org/) (abajo derecha)

## 💰 Funding Post-Hackathon

### Grants DFINITY:
- 💵 **$5K** - First-time grants
- 💵 **$25K** - First-time grants (proyectos más grandes)
- 💵 **$100K** - Para recipients que ya tuvieron grants previos exitosos

**Aplicar:** [Developer Grants Program](https://dfinity.org/grants/)

📖 **Guía importante:** [Writing Effective Grant Milestones](https://www.notion.so/d46d68a5185c446a95d64aa9fc69a3b9)

## 🎯 Recursos Específicos para Debugging

### Para tu error actual:
1. **Canister Lifecycle:** https://internetcomputer.org/how-it-works/canister-lifecycle/#canisters
2. **Resource Limits:** https://internetcomputer.org/docs/current/developer-docs/backend/resource-limits
3. **Computation & Storage Costs:** https://internetcomputer.org/docs/current/developer-docs/gas-cost/

### Testing:
- No hay testnet pública (como Sepolia en Ethereum)
- Usa `dfx` para correr una replica local
- [Docker Image for ICP dev](https://github.com/dfinity/icp-dev-env)

## 📋 Quick Reference: ICP vs Ethereum

| Concepto | Ethereum | ICP |
|----------|----------|-----|
| Smart Contract | Contract | Canister |
| Address | Address | Principal |
| Gas | Gas (ETH) | Cycles |
| Native Token | ETH | ICP |
| Libraries | web3.js/ethers.js | agent-js |
| Language | Solidity | Motoko/Rust/TS/Python |
| Interface | ABI | Candid |
| Fungible Token | ERC-20 | ICRC-1/ICRC-2 |
| NFT | ERC-721 | ICRC-7 |
| Finality | ~15s | 1-2s |

## 🔥 Características Únicas de ICP (vs otros L1s)

1. **Sirve Web directamente** - No necesitas servidor separado para frontend
2. **400 GiB memoria** - Almacena datos masivos on-chain
3. **HTTPS Outcalls** - Llama APIs externas sin oracles
4. **Reverse Gas Model** - Usuarios NO pagan gas
5. **Bitcoin Integration nativa** - Firma y envía txs de Bitcoin
6. **Multi-block transactions** - Operaciones complejas, incluso AI inference
7. **Unbiasable Randomness** - VRF nativo via BLS threshold signatures
8. **Timers** - Ejecución automática de tareas

## 📖 Lectura Adicional

### Whitepaper & Specs:
- 📄 [The Internet Computer for Geeks](https://eprint.iacr.org/2022/087)
- 📄 [IC Interface Specification](https://khsfq-wqaaa-aaaak-qckvq-cai.icp0.io/docs/)
- 📕 [Constellation Book](https://neutronstardao.github.io/constellation.github.io/) - Componentes del protocolo

### Wikis:
- 📖 [Introduction to ICP](https://wiki.internetcomputer.org/wiki/Introduction_to_ICP)
- 📖 [L1 Comparison](https://wiki.internetcomputer.org/wiki/L1_comparison)
- 📖 [ICP for Ethereum Developers](https://wiki.internetcomputer.org/wiki/The_Internet_Computer_for_Ethereum_Developers)

## 🚀 Next Steps para QURI

1. ✅ **Arreglar error actual** - Ya implementado, solo falta redesplegar
2. 📚 **Estudiar `basic_bitcoin` example** - Para mejorar la integración de Runes
3. 🔐 **Mejorar security** - Estudiar threshold signatures
4. 📊 **Optimizar storage** - Revisar best practices
5. 🎨 **UI/UX** - Estudiar otros proyectos Bitcoin en ICP
6. 💰 **Aplicar a Grant** - Una vez tengas MVP funcional

---

**Pro Tip:** Guarda estos links en tus bookmarks. La documentación de ICP es excelente y está en constante mejora.
