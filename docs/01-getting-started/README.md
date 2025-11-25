# Quick Start

This guide provides the essential steps to get the QURI Protocol running on your local machine.

## Prerequisites

- Rust 1.78.0 or higher
- dfx 0.15.0 or higher
- Node.js 18+ (for frontend and tooling)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/AndeLabs/QURI-PROTOCOL.git
    cd QURI-PROTOCOL
    ```

2.  **Install Rust toolchain:**
    ```bash
    rustup target add wasm32-unknown-unknown
    ```

3.  **Install dfx (ICP SDK):**
    ```bash
    sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"
    ```

4.  **Build all canisters:**
    ```bash
    cargo build --target wasm32-unknown-unknown --release
    ```

## Local Development

1.  **Start local ICP replica:**
    ```bash
    dfx start --background --clean
    ```

2.  **Build backend canisters:**
    ```bash
    cd backend
    ./scripts/build-wasm.sh
    ```

3.  **Deploy canisters:**
    ```bash
    ./scripts/deploy-local.sh
    ```

4.  **Run backend tests:**
    ```bash
    cargo test --workspace
    ```

5.  **Test complete flow:**
    ```bash
    ./scripts/test-etching.sh
    ```

6.  **Start frontend development server:**
    ```bash
    cd frontend
    npm install
    cp .env.example .env.local
    # Update .env.local with canister IDs
    npm run dev
    # Visit: http://localhost:3002
    ```

7.  **Stop local replica:**
    ```bash
    dfx stop
    ```
