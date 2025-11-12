'use client';

import { ReactNode } from 'react';
import { ICPProvider } from '@/lib/icp/ICPProvider';

export function Providers({ children }: { children: ReactNode }) {
  return <ICPProvider>{children}</ICPProvider>;
}
