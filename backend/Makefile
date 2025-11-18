.PHONY: help build test clean deploy fmt clippy audit

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install-deps: ## Install development dependencies
	@echo "Installing Rust toolchain..."
	rustup target add wasm32-unknown-unknown
	rustup component add rustfmt clippy
	@echo "Installing cargo tools..."
	cargo install cargo-audit cargo-tarpaulin

build: ## Build all canisters
	@echo "Building workspace..."
	cargo build --workspace
	@echo "Building WASM canisters..."
	cargo build --target wasm32-unknown-unknown --release -p rune-engine
	cargo build --target wasm32-unknown-unknown --release -p bitcoin-integration
	cargo build --target wasm32-unknown-unknown --release -p registry
	cargo build --target wasm32-unknown-unknown --release -p identity-manager

build-dev: ## Build in development mode
	cargo build --workspace

test: ## Run all tests
	cargo test --workspace --all-features

test-unit: ## Run unit tests only
	cargo test --workspace --lib

test-integration: ## Run integration tests
	cargo test --workspace --test integration

fmt: ## Format code
	cargo fmt --all

fmt-check: ## Check code formatting
	cargo fmt --all -- --check

clippy: ## Run clippy linter
	cargo clippy --workspace --all-targets --all-features -- -D warnings

audit: ## Run security audit
	cargo audit

clean: ## Clean build artifacts
	cargo clean
	rm -rf .dfx

check: fmt-check clippy test ## Run all checks (format, clippy, tests)

# DFX commands (requires dfx to be installed)
dfx-start: ## Start local ICP replica
	dfx start --background --clean

dfx-stop: ## Stop local ICP replica
	dfx stop

dfx-deploy: build ## Deploy canisters locally
	dfx deploy

dfx-deploy-mainnet: build ## Deploy to mainnet (requires authentication)
	dfx deploy --network ic

dfx-test: ## Run dfx canister tests
	dfx canister call rune-engine rune_count
	dfx canister call registry total_runes

# Deployment helpers
deploy-local: dfx-start dfx-deploy ## Start replica and deploy locally

deploy-testnet: ## Deploy to testnet
	@echo "Deploying to testnet..."
	dfx deploy --network testnet

# Development helpers
watch: ## Watch for changes and rebuild
	cargo watch -x "build --workspace"

coverage: ## Generate code coverage report
	cargo tarpaulin --workspace --out Html
	@echo "Coverage report generated at: tarpaulin-report.html"

docs: ## Generate documentation
	cargo doc --workspace --no-deps --open

# Git helpers
commit: check ## Run checks before committing
	@echo "All checks passed! Ready to commit."

# Installation verification
verify-install: ## Verify installation
	@echo "Checking Rust installation..."
	@rustc --version
	@cargo --version
	@echo "Checking wasm target..."
	@rustup target list | grep wasm32-unknown-unknown
	@echo "Checking dfx installation..."
	@dfx --version || echo "dfx not installed - install from https://internetcomputer.org/docs/current/developer-docs/setup/install/"
	@echo "✓ Setup verification complete"

# Quick start
quickstart: install-deps build dfx-start dfx-deploy ## Complete setup and deployment
	@echo "✓ QURI Protocol is ready!"
	@echo "Run 'make dfx-test' to test the deployment"
