# QURI Protocol - Frontend

Professional Bitcoin Runes Launchpad on Internet Computer Protocol.

## 🚀 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS
- **@dfinity/agent** - ICP integration
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Lucide React** - Icons

## 📋 Prerequisites

- Node.js 18+ and npm
- Local ICP replica running (for development)
- Deployed canisters with their IDs

## 🛠️ Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and update with your canister IDs:

```bash
cp .env.local.example .env.local
```

Update `.env.local` with your deployed canister IDs:

```env
NEXT_PUBLIC_IC_HOST=http://localhost:4943
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=your-canister-id
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=your-canister-id
NEXT_PUBLIC_REGISTRY_CANISTER_ID=your-canister-id
NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=your-canister-id
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Project Structure

```
frontend/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── providers.tsx      # Context providers
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Card.tsx
│   ├── Hero.tsx          # Landing hero
│   ├── Features.tsx      # Features section
│   └── EtchingForm.tsx   # Main Rune creation form
├── lib/                   # Utilities and libraries
│   ├── icp/              # ICP integration
│   │   ├── agent.ts      # Agent management
│   │   ├── actors.ts     # Canister actors
│   │   ├── ICPProvider.tsx  # Auth context
│   │   └── idl/          # Candid IDL definitions
│   └── utils.ts          # Utility functions
├── hooks/                 # Custom React hooks
│   └── useRuneEngine.ts  # Rune Engine hook
├── types/                 # TypeScript types
│   └── canisters.ts      # Canister type definitions
└── public/               # Static assets
```

## 🔑 Key Features

### Authentication

The app uses Internet Identity for authentication:

```typescript
import { useICP } from '@/lib/icp/ICPProvider';

const { isConnected, principal, connect, disconnect } = useICP();
```

### Rune Creation

Create Runes through the main form:

```typescript
import { useRuneEngine } from '@/hooks/useRuneEngine';

const { createRune, getEtchingStatus, getMyEtchings } = useRuneEngine();
```

### Form Validation

Professional validation with Zod schemas:

- Rune name: 1-26 uppercase letters + spacers (•)
- Symbol: 1-4 alphanumeric characters
- Divisibility: 0-18
- Supply validation with overflow protection

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🚀 Deploy to Vercel

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Import repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Environment Variables (Production)

Set these in your Vercel project settings:

```
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=<mainnet-canister-id>
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=<mainnet-canister-id>
NEXT_PUBLIC_REGISTRY_CANISTER_ID=<mainnet-canister-id>
NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=<mainnet-canister-id>
```

## 🧪 Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## 📝 Adding New Canister Methods

1. Update types in `types/canisters.ts`
2. Update IDL in `lib/icp/idl/*.idl.ts`
3. Add actor factory in `lib/icp/actors.ts`
4. Create hook in `hooks/` if needed

## 🔒 Security

- HTTPS only in production
- Content Security Policy headers
- Input validation with Zod
- XSS protection
- CSRF protection via Internet Identity

## 📄 License

Proprietary - QURI Protocol
