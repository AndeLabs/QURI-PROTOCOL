import type { Metadata } from 'next';
import './globals.css';
import '../styles/dex.css';
import { Providers } from './providers';
import { getNonce } from '@/lib/security/csp';

/**
 * Production-ready font configuration using system fonts
 * This approach is faster, more reliable, and doesn't depend on external services
 */

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'QURI Protocol - Bitcoin Runes Launchpad',
  description: 'Professional Bitcoin Runes launchpad on Internet Computer Protocol',
  keywords: ['Bitcoin', 'Runes', 'ICP', 'Internet Computer', 'Launchpad', 'DeFi'],
  authors: [{ name: 'QURI Protocol' }],
  icons: {
    icon: [
      { url: '/images/brand/logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/brand/logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/images/brand/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/images/brand/logo.png',
  },
  openGraph: {
    title: 'QURI Protocol - Bitcoin Runes Launchpad',
    description: 'Professional Bitcoin Runes launchpad on Internet Computer Protocol',
    type: 'website',
    images: [
      {
        url: '/images/brand/logo.png',
        width: 512,
        height: 512,
        alt: 'QURI Protocol Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'QURI Protocol - Bitcoin Runes Launchpad',
    description: 'Professional Bitcoin Runes launchpad on Internet Computer Protocol',
    images: ['/images/brand/logo.png'],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Get the nonce for CSP script execution
  const nonce = getNonce();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* CSP nonce is automatically applied to Next.js scripts */}
        {nonce && <meta name="csp-nonce" content={nonce} />}
      </head>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
