/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  // ESLint configuration
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    // TODO: Set back to false after cleaning up all warnings
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration
  typescript: {
    // Type checking is now enabled - all TypeScript errors have been fixed!
    ignoreBuildErrors: false,
  },

  // Image optimization for Vercel
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      // ICP domains
      {
        protocol: 'https',
        hostname: '**.ic0.app',
      },
      {
        protocol: 'https',
        hostname: 'ic0.app',
      },
      {
        protocol: 'https',
        hostname: '**.icp0.io',
      },
      // IPFS gateways
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
      // GitHub
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      // Local development
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_IC_HOST: process.env.NEXT_PUBLIC_IC_HOST || 'http://localhost:4943',
    NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID: process.env.NEXT_PUBLIC_RUNE_ENGINE_CANISTER_ID,
    NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID: process.env.NEXT_PUBLIC_BITCOIN_INTEGRATION_CANISTER_ID,
    NEXT_PUBLIC_REGISTRY_CANISTER_ID: process.env.NEXT_PUBLIC_REGISTRY_CANISTER_ID,
    NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID: process.env.NEXT_PUBLIC_IDENTITY_MANAGER_CANISTER_ID,
  },

  webpack: (config) => {
    // Handle .wasm files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Fix for @dfinity/agent in Next.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    return config;
  },

  // Security headers are now handled by middleware.ts
  // This provides better control over CSP with nonces
  // See: frontend/middleware.ts and frontend/lib/security/csp.ts
};

module.exports = nextConfig;
