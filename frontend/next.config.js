/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',

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
