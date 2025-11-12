import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

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
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
