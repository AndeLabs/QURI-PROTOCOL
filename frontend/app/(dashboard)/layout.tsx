'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { WalletButton } from '@/components/wallet';
import { GlobalSearchProvider } from '@/components/explorer';
import {
  Sparkles,
  Home,
  Coins,
  ArrowLeftRight,
  Search,
  Menu,
  X,
  Wallet,
  ArrowDownUp,
  Command,
  Image as ImageIcon,
  PenTool,
  Layers,
  CircleDollarSign,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    items: [
      {
        name: 'Overview',
        href: '/dashboard',
        icon: Home,
        description: 'Dashboard home',
      },
      {
        name: 'My Wallet',
        href: '/wallet',
        icon: Wallet,
        description: 'Manage assets',
      },
      {
        name: 'Swap',
        href: '/swap',
        icon: ArrowDownUp,
        description: 'Exchange tokens',
      },
      {
        name: 'Bridge',
        href: '/bridge',
        icon: ArrowLeftRight,
        description: 'BTC ↔ ICP transfers',
      },
    ],
  },
  {
    title: 'Runes',
    items: [
      {
        name: 'Create Rune',
        href: '/create',
        icon: Sparkles,
        description: 'Etch new Rune',
      },
      {
        name: 'Explorer',
        href: '/explorer',
        icon: Search,
        description: 'Browse all Runes',
      },
    ],
  },
  {
    title: 'Ordinals',
    items: [
      {
        name: 'Inscribe',
        href: '/inscribe',
        icon: PenTool,
        description: 'Create inscription',
      },
      {
        name: 'Gallery',
        href: '/gallery',
        icon: ImageIcon,
        description: 'Browse Ordinals',
      },
    ],
  },
  {
    title: 'BRC-20',
    items: [
      {
        name: 'BRC-20 Explorer',
        href: '/brc20',
        icon: CircleDollarSign,
        description: 'Browse BRC-20 tokens',
      },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <GlobalSearchProvider>
      <div className="min-h-screen bg-museum-cream relative">
        {/* Decorative background images for dashboard */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-20 right-10 opacity-10 hidden lg:block">
            <Image src="/images/brand/inti.png" alt="" width={120} height={120} className="w-28 h-28" />
          </div>
          <div className="absolute bottom-20 right-20 opacity-10 hidden lg:block">
            <Image src="/images/brand/serpiente.png" alt="" width={140} height={140} className="w-32 h-32" />
          </div>
          <div className="absolute top-1/2 right-5 -translate-y-1/2 opacity-10 hidden xl:block">
            <Image src="/images/brand/ave.png" alt="" width={100} height={100} className="w-24 h-24" />
          </div>
          <div className="absolute bottom-1/3 left-[280px] opacity-10 hidden lg:block">
            <Image src="/images/brand/ojo.png" alt="" width={60} height={60} className="w-14 h-14" />
          </div>
        </div>

        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-museum-white border-r border-museum-light-gray transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-museum-light-gray px-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/images/brand/logo.png"
                alt="QURI Protocol"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="font-serif text-xl font-bold text-museum-black">
                QURI
              </span>
            </Link>
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5 text-museum-dark-gray" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            {navigationSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-6' : ''}>
                {section.title && (
                  <div className="px-3 mb-2">
                    <h3 className="text-xs font-semibold text-museum-dark-gray uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-gold-50 text-gold-700 border border-gold-200'
                            : 'text-museum-dark-gray hover:bg-museum-cream hover:text-museum-black'
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 flex-shrink-0 ${
                            isActive ? 'text-gold-600' : 'text-museum-charcoal'
                          }`}
                        />
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span
                            className={`text-xs ${
                              isActive ? 'text-gold-600' : 'text-museum-dark-gray'
                            }`}
                          >
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-museum-light-gray p-4">
            <div className="flex items-center gap-2 text-xs text-museum-dark-gray">
              <Image
                src="/images/brand/logo.png"
                alt="QURI"
                width={16}
                height={16}
                className="w-4 h-4 opacity-60"
              />
              <span>QURI Protocol v1.0</span>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:pl-64">
          {/* Top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-museum-light-gray bg-museum-white px-4 lg:px-8">
            <button
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6 text-museum-dark-gray" />
            </button>

            {/* Search Trigger - Desktop */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
              className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-museum-cream border border-museum-light-gray
                        rounded-lg hover:border-gold-300 transition-colors text-sm"
            >
              <Search className="h-4 w-4 text-museum-dark-gray" />
              <span className="text-museum-dark-gray">Search...</span>
              <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-museum-white rounded
                            text-xs text-museum-dark-gray font-mono border border-museum-light-gray">
                <Command className="h-3 w-3" />K
              </kbd>
            </button>

            <div className="flex items-center gap-4 ml-auto">
              <Link href="/create">
                <Button size="sm" className="bg-gold-500 hover:bg-gold-600 text-white">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create
                </Button>
              </Link>
              <WalletButton variant="compact" />
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </GlobalSearchProvider>
  );
}
