import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

/**
 * Production-ready font configuration using system fonts
 * This approach is faster, more reliable, and doesn't depend on external services
 */

export const metadata: Metadata = {
  title: 'QURI Protocol - Bitcoin Runes Launchpad',
  description: 'Professional Bitcoin Runes launchpad on Internet Computer Protocol',
  keywords: ['Bitcoin', 'Runes', 'ICP', 'Internet Computer', 'Launchpad', 'DeFi'],
  authors: [{ name: 'QURI Protocol' }],
  openGraph: {
    title: 'QURI Protocol - Bitcoin Runes Launchpad',
    description: 'Professional Bitcoin Runes launchpad on Internet Computer Protocol',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
