# QURI Protocol - Frontend Deployment Guide

Complete guide for deploying the QURI Protocol frontend to Vercel.

## 📋 Prerequisites

1. **Deployed Canisters**: Ensure all backend canisters are deployed
   - Run `./scripts/deploy-local.sh` for local testing
   - Deploy to IC mainnet for production

2. **Vercel Account**: Create account at [vercel.com](https://vercel.com)

3. **GitHub Repository**: Push your code to GitHub

## 🚀 Quick Deployment (Vercel)

### Step 1: Get Canister IDs

After deploying your canisters, extract the IDs:

```bash
# For local development
cd frontend
./scripts/get-canister-ids.sh local --write

# For mainnet
./scripts/get-canister-ids.sh ic
```

This creates a `.env.local` file with all required canister IDs.

### Step 2: Install Dependencies

```bash
cd frontend
npm install
```

### Step 3: Test Locally

```bash
# Start local ICP replica (in separate terminal)
cd ..
dfx start --clean --background

# Deploy canisters
./scripts/deploy-local.sh

# Start frontend dev server
cd frontend
npm run dev
```

Visit `http://localhost:3000` to test the application.

### Step 4: Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd frontend
vercel

# Follow prompts:
# - Set up and deploy: Yes
# - Which scope: Your account
# - Link to existing project: No
# - Project name: quri-protocol
# - Directory: ./
# - Override settings: No
```

#### Option B: GitHub Integration

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: Add production-grade frontend with Vercel deployment"
   git push
   ```

2. **Import in Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Root Directory: `frontend`
   - Framework Preset: Next.js
   - Click "Deploy"

### Step 5: Configure Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```bash
# For Production (IC Mainnet)
NEXT_PUBLIC_IC_HOST=https://ic0.app
NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID=<your-mainnet-canister-id>
NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID=<your-mainnet-canister-id>
NEXT_PUBLIC_REGISTRY_CANISTER_ID=<your-mainnet-canister-id>
NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID=<your-mainnet-canister-id>

# For Preview/Development (Local or Testnet)
NEXT_PUBLIC_IC_HOST=http://localhost:4943
# ... local canister IDs
```

### Step 6: Deploy

Vercel will automatically deploy on every push to main branch.

For manual deployment:

```bash
vercel --prod
```

## 🏗️ Monorepo Structure

The project is structured as a monorepo:

```
QURI-PROTOCOL/
├── canisters/              # ICP backend canisters
│   ├── bitcoin-integration/
│   ├── rune-engine/
│   ├── registry/
│   └── identity-manager/
├── frontend/               # Next.js frontend (THIS)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   └── types/
├── scripts/               # Deployment scripts
└── libs/                  # Shared libraries
```

## 🔧 Configuration Files

### vercel.json

Vercel deployment configuration with:
- Build settings
- Environment variables
- Security headers
- Framework preset

### next.config.js

Next.js configuration with:
- Webpack modifications for @dfinity/agent
- Environment variable exposure
- WASM support
- Standalone output

### tsconfig.json

TypeScript configuration with:
- Strict mode enabled
- Path aliases (@/components, @/lib, etc.)
- Next.js plugin

### tailwind.config.ts

Tailwind CSS with:
- Custom Bitcoin-themed colors
- Custom animations
- Form plugin

## 🌐 Custom Domain (Optional)

1. Go to Vercel Project Settings > Domains
2. Add your domain (e.g., `quri.io`)
3. Configure DNS records as shown
4. Wait for SSL certificate provisioning

## 🔒 Security Best Practices

### Headers

Already configured in `vercel.json`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

### Authentication

- Uses Internet Identity (decentralized auth)
- No passwords stored
- Principal-based access control

### Input Validation

- Client-side validation with Zod
- Server-side validation in canisters
- XSS protection via React

## 📊 Monitoring

### Vercel Analytics

Enable in Vercel Dashboard > Analytics:
- Page views
- Performance metrics
- User analytics

### Error Tracking

Consider adding Sentry:

```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## 🐛 Troubleshooting

### Build Fails

**Error**: "Cannot find module '@dfinity/agent'"
**Solution**: Ensure all dependencies are installed:
```bash
rm -rf node_modules package-lock.json
npm install
```

**Error**: "Module not found: Can't resolve 'fs'"
**Solution**: Already handled in next.config.js with fallback

### Runtime Errors

**Error**: "Agent not initialized"
**Solution**: Ensure environment variables are set correctly

**Error**: "Canister not found"
**Solution**: Verify canister IDs in environment variables match deployed canisters

### Connection Issues

**Error**: "Unable to fetch root key"
**Solution**: For local development, ensure dfx replica is running

**Error**: "Call failed: Canister does not exist"
**Solution**: Deploy canisters first, then update .env.local with correct IDs

## 📈 Performance Optimization

### Already Implemented

- ✅ Static page generation where possible
- ✅ Standalone output for smaller deployments
- ✅ Tailwind CSS purging
- ✅ Image optimization (Next.js Image component ready)
- ✅ Code splitting (automatic with Next.js)

### Recommended

1. **Add Image Optimization**:
   ```typescript
   import Image from 'next/image';
   ```

2. **Enable ISR** (Incremental Static Regeneration):
   ```typescript
   export const revalidate = 60; // Revalidate every 60 seconds
   ```

3. **Add Loading States**: Already implemented with Suspense-ready components

## 🚀 CI/CD Pipeline

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: ./frontend
        run: npm install

      - name: Type check
        working-directory: ./frontend
        run: npm run type-check

      - name: Lint
        working-directory: ./frontend
        run: npm run lint

      - name: Build
        working-directory: ./frontend
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
```

## 📝 Environment-Specific Deployments

### Development (Local)
```bash
NEXT_PUBLIC_IC_HOST=http://localhost:4943
```

### Staging (Testnet)
```bash
NEXT_PUBLIC_IC_HOST=https://icp-api.io
```

### Production (Mainnet)
```bash
NEXT_PUBLIC_IC_HOST=https://ic0.app
```

## ✅ Pre-Deployment Checklist

- [ ] All canisters deployed and tested
- [ ] Canister IDs updated in environment variables
- [ ] Local development tested successfully
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables set in Vercel
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Security headers verified
- [ ] Internet Identity integration tested
- [ ] Error handling tested

## 🎉 Post-Deployment

After successful deployment:

1. **Test Authentication**: Connect with Internet Identity
2. **Test Rune Creation**: Create a test Rune
3. **Check Console**: Verify no errors in browser console
4. **Verify Canister Calls**: Check network tab for successful calls
5. **Test on Mobile**: Ensure responsive design works
6. **Monitor Vercel Analytics**: Track performance metrics

## 📞 Support

For issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Check [Next.js Documentation](https://nextjs.org/docs)
- Check [DFINITY Documentation](https://internetcomputer.org/docs)

---

**Ready for Production** ✨
