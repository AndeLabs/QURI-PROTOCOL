# QURI DEX Frontend Components

Professional React/TypeScript components for the complete Bitcoin Runes DEX on ICP.

## Overview

This frontend provides a complete user interface for:
- **Swap Interface** - Token swapping with smart routing
- **Liquidity Pools** - Add/remove liquidity, view positions
- **Orderbook Trading** - Limit/market orders, real-time order book
- **Bridge Interface** - Cross-chain Bitcoin ↔ ICP transfers
- **Farm/Staking** - Liquidity mining rewards

## Architecture

```
frontend/src/
├── components/dex/
│   ├── swap/
│   │   └── SwapInterface.tsx         # Token swap UI
│   ├── pools/
│   │   └── LiquidityPools.tsx        # Liquidity management
│   ├── orderbook/
│   │   └── OrderbookTrading.tsx      # Limit order trading
│   ├── bridge/
│   │   └── BridgeInterface.tsx       # Cross-chain bridge
│   └── farm/
│       └── FarmInterface.tsx         # Liquidity mining
├── types/
│   ├── dex.ts                        # DEX type definitions
│   ├── orderbook.ts                  # Orderbook types
│   └── bridge.ts                     # Bridge types
└── hooks/
    └── useActor.ts                   # ICP actor hook
```

## Components

### 1. SwapInterface

Token swapping with real-time quotes and slippage protection.

**Features:**
- Token selection with balances
- Real-time price quotes
- Slippage tolerance settings
- Price impact display
- Route visualization (direct/multi-hop)
- Minimum received calculation
- Transaction confirmation

**Usage:**
```tsx
import { SwapInterface } from './components/dex/swap/SwapInterface';

<SwapInterface
  poolId="optional-pool-id"
  onSwapComplete={(result) => console.log('Swap complete:', result)}
/>
```

**Props:**
- `poolId?: string` - Optional specific pool ID
- `onSwapComplete?: (result: SwapResult) => void` - Callback on successful swap

### 2. LiquidityPools

Liquidity pool management interface.

**Features:**
- Pool listing with TVL, APY, volume
- User position tracking
- Add liquidity form
- Remove liquidity
- Share percentage calculation
- USD value display

**Usage:**
```tsx
import { LiquidityPools } from './components/dex/pools/LiquidityPools';

<LiquidityPools />
```

### 3. OrderbookTrading

Professional orderbook trading interface.

**Features:**
- Real-time order book depth (bids/asks)
- Order placement (Limit/Market/Stop)
- Time-in-force options (GTC/IOC/FOK/GTT)
- Recent trades feed
- User order management
- Order cancellation
- Spread and mid-price display

**Usage:**
```tsx
import { OrderbookTrading } from './components/dex/orderbook/OrderbookTrading';

<OrderbookTrading poolId="pool-id-here" />
```

**Props:**
- `poolId: string` - Required pool ID for orderbook

### 4. BridgeInterface

Cross-chain bridge for Bitcoin Runes ↔ ICP.

**Features:**
- Bidirectional transfers (Deposit/Withdrawal)
- Supported runes selection
- Amount validation with limits
- Bitcoin address input
- Transaction tracking
- Status monitoring
- Fee display

**Usage:**
```tsx
import { BridgeInterface } from './components/dex/bridge/BridgeInterface';

<BridgeInterface />
```

## Type Definitions

### DEX Types (`types/dex.ts`)

```typescript
interface PoolInfo {
  id: string;
  token0: Principal;
  token1: Principal;
  reserve0: bigint;
  reserve1: bigint;
  total_lp_supply: bigint;
  price: number;
  tvl_usd: number;
  volume_24h_usd: number;
  apy: number;
}

interface SwapQuote {
  amount_in: bigint;
  amount_out: bigint;
  price_impact: number;
  fee: bigint;
  minimum_received: bigint;
  route: SwapRoute;
}
```

### Orderbook Types (`types/orderbook.ts`)

```typescript
type OrderType =
  | { Limit: null }
  | { Market: null }
  | { StopLimit: { stop_price: bigint } };

type OrderSide = { Buy: null } | { Sell: null };

type TimeInForce =
  | { GTC: null }  // Good Till Cancelled
  | { IOC: null }  // Immediate Or Cancel
  | { FOK: null }  // Fill Or Kill
  | { GTT: { expiry: bigint } };  // Good Till Time

interface Order {
  id: string;
  user: Principal;
  pool_id: string;
  side: OrderSide;
  order_type: OrderType;
  price: bigint;
  amount: bigint;
  filled_amount: bigint;
  status: OrderStatus;
  time_in_force: TimeInForce;
  created_at: bigint;
  updated_at: bigint;
}
```

### Bridge Types (`types/bridge.ts`)

```typescript
type BridgeStatus =
  | { Pending: null }
  | { ConfirmingBitcoin: { confirmations: number } }
  | { ProcessingICP: null }
  | { Completed: null }
  | { Failed: { reason: string } }
  | { Refunded: null };

interface BridgeTransaction {
  id: string;
  direction: BridgeDirection;
  status: BridgeStatus;
  user_icp: Principal;
  user_btc_address: string;
  rune_id: string;
  rune_name: string;
  amount: bigint;
  wrune_canister: Principal | null;
  btc_tx: BitcoinTxInfo | null;
  bridge_fee: bigint;
  network_fee: bigint;
  created_at: bigint;
  updated_at: bigint;
  completed_at: bigint | null;
}
```

## Hooks

### useActor

Custom hook for creating and managing ICP canister actors.

**Usage:**
```tsx
import { useActor } from '../hooks/useActor';

function MyComponent() {
  const { actor, loading, error } = useActor('dex');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // Use actor to call canister methods
  const handleAction = async () => {
    const result = await actor.get_all_pools();
    console.log(result);
  };

  return <button onClick={handleAction}>Load Pools</button>;
}
```

**Available Canisters:**
- `'dex'` - DEX canister
- `'bridge'` - Bridge canister
- `'wrunes_ledger'` - wRunes ledger canister

**Advanced Functions:**
```tsx
// Get authenticated actor with Internet Identity
const actor = await getAuthenticatedActor('dex', identity);

// Batch call multiple methods
const results = await batchCall(actor, [
  ['get_all_pools', []],
  ['get_global_stats', []],
]);

// Poll until condition is met
const result = await pollUntil(
  actor,
  'get_transaction',
  [txId],
  (tx) => tx.status === 'Completed',
  1000,  // Poll every 1 second
  30     // Max 30 attempts
);
```

## Dependencies

Required npm packages:

```json
{
  "dependencies": {
    "@dfinity/agent": "^0.20.0",
    "@dfinity/auth-client": "^0.20.0",
    "@dfinity/candid": "^0.20.0",
    "@dfinity/principal": "^0.20.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

## Environment Variables

Create `.env` file:

```env
REACT_APP_IC_HOST=https://ic0.app
REACT_APP_DEX_CANISTER_ID=your-dex-canister-id
REACT_APP_BRIDGE_CANISTER_ID=your-bridge-canister-id
REACT_APP_WRUNES_LEDGER_CANISTER_ID=your-wrunes-ledger-canister-id
```

For local development:
```env
REACT_APP_IC_HOST=http://localhost:8000
NODE_ENV=development
```

## Styling

Each component includes className props for styling. Recommended CSS structure:

```css
/* Swap Interface */
.swap-interface { }
.swap-header { }
.token-input { }
.swap-details { }
.swap-button { }

/* Liquidity Pools */
.liquidity-pools { }
.pool-list { }
.pools-table { }
.user-positions { }
.add-liquidity-form { }

/* Orderbook Trading */
.orderbook-trading { }
.orderbook-panel { }
.asks { }
.bids { }
.spread { }
.order-form-panel { }
.trades-panel { }

/* Bridge Interface */
.bridge-interface { }
.direction-selector { }
.bridge-form { }
.transaction-history { }
```

## Integration

### 1. Generate Candid Declarations

```bash
dfx generate
```

This generates TypeScript declarations from Candid files.

### 2. Update useActor Hook

Replace placeholder IDL factories with generated ones:

```typescript
import { idlFactory as dexIdlFactory } from '../declarations/dex';
import { idlFactory as bridgeIdlFactory } from '../declarations/bridge';

const IDL_FACTORIES = {
  dex: dexIdlFactory,
  bridge: bridgeIdlFactory,
  wrunes_ledger: wrunesIdlFactory,
};
```

### 3. Connect Internet Identity

```tsx
import { AuthClient } from '@dfinity/auth-client';

async function login() {
  const authClient = await AuthClient.create();
  await authClient.login({
    identityProvider: 'https://identity.ic0.app',
    onSuccess: () => {
      const identity = authClient.getIdentity();
      // Use identity with getAuthenticatedActor()
    },
  });
}
```

## Best Practices

1. **Error Handling**: All components include error states
2. **Loading States**: Show loading indicators during async operations
3. **Type Safety**: Full TypeScript coverage
4. **BigInt Handling**: Proper conversion between UI and canister formats
5. **Real-time Updates**: Polling for order book, trades, transactions
6. **Validation**: Client-side validation before canister calls
7. **Security**: Never expose private keys, use Internet Identity

## Testing

Example test setup:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { SwapInterface } from './SwapInterface';

test('renders swap interface', () => {
  render(<SwapInterface />);
  expect(screen.getByText('Swap Runes')).toBeInTheDocument();
});

test('handles token swap', async () => {
  render(<SwapInterface />);
  // ... test interaction
});
```

## Production Checklist

- [ ] Configure environment variables
- [ ] Generate Candid declarations
- [ ] Update useActor with real IDL factories
- [ ] Implement Internet Identity authentication
- [ ] Add proper error boundaries
- [ ] Implement analytics tracking
- [ ] Add loading skeletons
- [ ] Optimize bundle size
- [ ] Test on mainnet
- [ ] Security audit

## License

MIT

## Support

For issues or questions, please create an issue in the repository.
