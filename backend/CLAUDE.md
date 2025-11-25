# QURI Protocol - Claude Development Guide

## IMPORTANT: Mainnet-Only Development

**All development for QURI Protocol is done directly on ICP mainnet. There is NO local development or testnet.**

### Why Mainnet?
- ICP doesn't have a persistent testnet
- The ICP playground expires after 20 minutes
- Best practice is to develop and test directly on mainnet

## Canister IDs (Mainnet)

| Canister | ID |
|----------|-----|
| Rune Engine | `pkrpq-5qaaa-aaaah-aroda-cai` |
| Registry | `pnqje-qiaaa-aaaah-arodq-cai` |
| Identity Manager | `y67br-5iaaa-aaaah-arn5q-cai` |
| Internet Identity | `rdmx6-jaaaa-aaaaa-aaadq-cai` |
| Bitcoin Integration (ICP Service) | `ghsi2-tqaaa-aaaan-aaaca-cai` |

## Development Commands

### Building
```bash
# Build a specific canister for mainnet
dfx build rune-engine --network ic

# Build all canisters
dfx build --network ic
```

### Deploying
```bash
# Deploy a new canister
dfx deploy rune-engine --network ic

# Upgrade an existing canister
dfx canister install rune-engine --mode upgrade --network ic
```

### Interacting with Canisters
```bash
# Call a method
dfx canister call rune-engine list_trading_pools_v2 '(0, 50)' --network ic

# Check canister status
dfx canister status rune-engine --network ic
```

## Trading V2 API

The trading system uses V2 methods with stable storage for persistence across upgrades:

### Methods
- `create_trading_pool_v2(rune_id, initial_icp, initial_runes)` - Create a new trading pool
- `list_trading_pools_v2(offset, limit)` - List all trading pools
- `get_trading_pool_v2(rune_id)` - Get a specific pool
- `get_buy_quote_v2(rune_id, icp_amount, slippage_bps)` - Get buy quote
- `get_sell_quote_v2(rune_id, rune_amount, slippage_bps)` - Get sell quote
- `buy_virtual_rune_v2(rune_id, icp_amount, min_runes_out)` - Execute buy
- `sell_virtual_rune_v2(rune_id, rune_amount, min_icp_out)` - Execute sell

### ICP Units
- ICP amounts are in e8s (1 ICP = 100,000,000 e8s)
- Slippage is in basis points (0.5% = 50 bps)
- Minimum pool liquidity: 0.001 ICP (100,000 e8s)

## Frontend Configuration

The frontend connects to mainnet canisters via `.env.local`:

```
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_IC_NETWORK=ic
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=pkrpq-5qaaa-aaaah-aroda-cai
NEXT_PUBLIC_REGISTRY_CANISTER_ID=pnqje-qiaaa-aaaah-arodq-cai
```

## Workflow for Changes

1. Make code changes in backend/canisters
2. Build: `dfx build <canister> --network ic`
3. Deploy: `dfx canister install <canister> --mode upgrade --network ic`
4. Verify: `dfx canister call <canister> <method> '()' --network ic`
5. Update frontend types if interface changed

## Architecture

```
backend/
├── canisters/
│   ├── rune-engine/     # Main canister for runes and trading
│   ├── registry/        # Rune registry and indexing
│   └── identity-manager/# User identity and sessions
└── Cargo.toml

frontend/
├── app/                 # Next.js 14 app router
├── hooks/               # React hooks (useTrading, useRuneEngine)
├── types/               # TypeScript types (canisters.ts)
└── lib/icp/             # ICP actor configuration
```

## Notes for AI Assistants

- Never suggest using local dfx replica
- Never suggest using testnet
- Always use `--network ic` flag for dfx commands
- Frontend `.env.local` should always point to mainnet
- ICP units must be converted: 1 ICP = 100,000,000 e8s
