# Changelog

All notable changes to QURI Protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo structure with Cargo workspace
- Four core canisters: rune-engine, bitcoin-integration, registry, identity-manager
- Five shared libraries: quri-types, quri-utils, bitcoin-utils, runes-utils, schnorr-signatures
- Comprehensive CI/CD pipeline with GitHub Actions
- Development tooling: Makefile, formatting, linting
- Session keys feature for improved UX (inspired by Odin.fun)
- Rate limiting for API protection
- Full Runes protocol implementation
- Threshold Schnorr signature integration
- ckBTC payment processing
- Stable structures for upgrade-safe storage
- Comprehensive test suite
- Documentation: README, ARCHITECTURE, CONTRIBUTING
- Security audit workflow

### Infrastructure
- GitHub Actions CI/CD
- Automated testing and code coverage
- Security auditing with cargo-audit
- WASM size optimization
- Code formatting and linting

## [0.1.0] - 2025-01-XX (Planned)

### Phase 1: MVP Launch

- [ ] Mainnet deployment on ICP
- [ ] Zero-fee Runes launchpad
- [ ] Instant finality (2 seconds)
- [ ] Self-custody via Internet Identity
- [ ] 5-10 successful test Runes created
- [ ] Full ckBTC integration
- [ ] Professional demo video
- [ ] Technical documentation

## [0.2.0] - TBD (Planned)

### Phase 2: L2 Development

- [ ] Sovereign rollup testnet on Celestia
- [ ] Base AMM for Runes/ckBTC pairs
- [ ] ICP ↔ L2 Bridge implementation
- [ ] Beta program launch
- [ ] DAO whitepaper

## Future Versions

### Phase 3: Ecosystem Expansion
- $QURI governance token
- Lending/borrowing protocols
- NFT marketplace integration
- Advanced analytics dashboard

### Phase 4: Multi-Modular Interoperability
- On-chain voting systems
- Integration with other Bitcoin L2s
- Cross-rollup liquidity pools

---

## Release Notes Template

```markdown
## [Version] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security improvements
```
