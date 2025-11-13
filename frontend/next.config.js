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

  // Security headers with CSP for NFT.Storage
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.ic0.app https://*.icp0.io https://api.nft.storage https://nftstorage.link https://ipfs.io https://cloudflare-ipfs.com https://dweb.link",
              "frame-src 'self' https://*.ic0.app https://identity.ic0.app",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
