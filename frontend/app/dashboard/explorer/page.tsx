'use client';

import { Search } from 'lucide-react';

// This will redirect to the actual explorer page
export default function ExplorerRedirect() {
  if (typeof window !== 'undefined') {
    window.location.href = '/explorer';
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <Search className="h-16 w-16 mx-auto mb-4 text-museum-charcoal animate-pulse" />
        <p className="text-museum-dark-gray">Redirecting to Explorer...</p>
      </div>
    </div>
  );
}
