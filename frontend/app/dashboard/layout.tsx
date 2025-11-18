'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { WalletButton } from '@/components/wallet';
import {
  Sparkles,
  Home,
  Repeat,
  Coins,
  ArrowLeftRight,
  Lock,
  Search,
  BarChart3,
  Settings,
  Menu,
  X,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  description: string;
}

const navigation: NavItem[] = [
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
    name: 'Create Rune',
    href: '/create',
    icon: Sparkles,
    description: 'Etch new Bitcoin Runes',
  },
  {
    name: 'Bridge',
    href: '/bridge',
    icon: ArrowLeftRight,
    description: 'Bitcoin ↔ ICP transfers',
  },
  {
    name: 'Explorer',
    href: '/explorer',
    icon: Search,
    description: 'Browse all Runes',
  },
  {
    name: 'Gallery',
    href: '/gallery',
    icon: Coins,
    description: 'View Runes collection',
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
    <div className="min-h-screen bg-museum-cream">
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
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-gold-500" />
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
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navigation.map((item) => {
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
        </nav>

        {/* User section */}
        <div className="border-t border-museum-light-gray p-4 overflow-hidden">
          <div className="w-full">
            <WalletButton variant="compact" />
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

          <div className="flex items-center gap-4 ml-auto">
            <Link href="/create">
              <Button size="sm" className="bg-gold-500 hover:bg-gold-600 text-white">
                <Sparkles className="h-4 w-4 mr-2" />
                Create Rune
              </Button>
            </Link>
            <WalletButton variant="compact" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
