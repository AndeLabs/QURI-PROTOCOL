'use client';

/**
 * Breadcrumb Component
 * Clear navigation breadcrumb with back to dashboard functionality
 */

import Link from 'next/link';
import { ChevronRight, LayoutDashboard } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showDashboardHome?: boolean;
}

export function Breadcrumb({ items, showDashboardHome = true }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm mb-6" aria-label="Breadcrumb">
      {/* Always show Dashboard home if enabled */}
      {showDashboardHome && (
        <>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-museum-dark-gray hover:text-museum-black transition-colors group"
          >
            <LayoutDashboard className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-medium">Dashboard</span>
          </Link>
          <ChevronRight className="h-4 w-4 text-museum-light-gray" />
        </>
      )}

      {/* Breadcrumb items */}
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast) {
          return (
            <span
              key={index}
              className="text-museum-black font-semibold"
              aria-current="page"
            >
              {item.label}
            </span>
          );
        }

        return (
          <div key={index} className="flex items-center space-x-2">
            {item.href ? (
              <Link
                href={item.href}
                className="text-museum-dark-gray hover:text-museum-black transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-museum-dark-gray">{item.label}</span>
            )}
            <ChevronRight className="h-4 w-4 text-museum-light-gray" />
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Quick breadcrumb presets
 */
export const BreadcrumbPresets = {
  wallet: [{ label: 'My Wallet' }],
  create: [{ label: 'Create Rune' }],
  bridge: [{ label: 'Bridge' }],
  explorer: [{ label: 'Explorer' }],
  gallery: [{ label: 'Gallery' }],
  admin: [{ label: 'Admin Panel' }],
};
