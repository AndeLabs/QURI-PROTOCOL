/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

  // Image optimization for Vercel
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [
      'localhost',
      // Add your image domains here (IPFS gateways, ICP domains, etc)
      'gateway.pinata.cloud',
      'ipfs.io',
      'cloudflare-ipfs.com',
      'ic0.app',
      'raw.githubusercontent.com',
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.ic0.app',
      },
      {
        protocol: 'https',
        hostname: '**.icp0.io',
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
};

module.exports = nextConfig;
