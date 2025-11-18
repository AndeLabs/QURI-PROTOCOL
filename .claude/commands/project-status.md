Get comprehensive QURI Protocol project status.

Gather and report on all key project metrics:

**1. Codebase Health:**
- Run `cargo test --workspace` - report pass/fail count
- Run `cd frontend && npm test` - report pass/fail count
- Run `cargo clippy --workspace` - report warnings count
- Check `git status` - report uncommitted changes

**2. Deployment Status:**
- List all deployed canisters with IDs and networks
- For each mainnet canister, show:
  - Canister ID
  - Cycles balance
  - Memory usage
  - Last upgrade timestamp (if available)

**3. Git Status:**
- Current branch
- Commits ahead/behind main
- Recent commits (last 5)
- Open PRs (if GitHub MCP is available)

**4. Dependencies:**
- Check for outdated Rust crates: `cargo outdated` (if installed)
- Check for outdated npm packages: `cd frontend && npm outdated`
- Security audits: `cargo audit`

**5. Build Status:**
- Backend WASM build: `cargo build --target wasm32-unknown-unknown --release`
- Frontend build: `cd frontend && npm run build`
- Report build sizes

**6. Documentation:**
- Check if key docs exist and are up to date:
  - README.md
  - docs/01-getting-started/
  - docs/02-architecture/
  - docs/03-api-reference/

Present results in organized sections with pass/fail indicators and actionable recommendations.
