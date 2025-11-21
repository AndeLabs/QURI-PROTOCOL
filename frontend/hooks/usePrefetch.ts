/**
 * usePrefetch Hook
 * Provides prefetching capabilities for fluid navigation UX
 */

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  prefetchRune,
  prefetchRuneHolders,
  prefetchOrdinal,
  prefetchBRC20Token,
  prefetchRunesList,
  prefetchOrdinalsList,
  prefetchBRC20List,
  prefetchPortfolio,
} from '@/lib/query/prefetch';

export function usePrefetch() {
  const queryClient = useQueryClient();

  // Prefetch individual items
  const prefetchRuneData = useCallback(
    (runeId: string) => {
      prefetchRune(queryClient, runeId);
    },
    [queryClient]
  );

  const prefetchRuneHoldersData = useCallback(
    (runeId: string) => {
      prefetchRuneHolders(queryClient, runeId);
    },
    [queryClient]
  );

  const prefetchOrdinalData = useCallback(
    (inscriptionId: string) => {
      prefetchOrdinal(queryClient, inscriptionId);
    },
    [queryClient]
  );

  const prefetchBRC20TokenData = useCallback(
    (ticker: string) => {
      prefetchBRC20Token(queryClient, ticker);
    },
    [queryClient]
  );

  // Prefetch page data
  const prefetchExplorerPage = useCallback(() => {
    prefetchRunesList(queryClient);
  }, [queryClient]);

  const prefetchGalleryPage = useCallback(() => {
    prefetchOrdinalsList(queryClient);
  }, [queryClient]);

  const prefetchBRC20Page = useCallback(() => {
    prefetchBRC20List(queryClient);
  }, [queryClient]);

  // Prefetch portfolio
  const prefetchUserPortfolio = useCallback(
    (address: string) => {
      prefetchPortfolio(queryClient, address);
    },
    [queryClient]
  );

  // Event handlers for links
  const createHoverHandler = useCallback(
    (type: 'rune' | 'ordinal' | 'brc20', id: string) => {
      return {
        onMouseEnter: () => {
          switch (type) {
            case 'rune':
              prefetchRuneData(id);
              break;
            case 'ordinal':
              prefetchOrdinalData(id);
              break;
            case 'brc20':
              prefetchBRC20TokenData(id);
              break;
          }
        },
        onFocus: () => {
          switch (type) {
            case 'rune':
              prefetchRuneData(id);
              break;
            case 'ordinal':
              prefetchOrdinalData(id);
              break;
            case 'brc20':
              prefetchBRC20TokenData(id);
              break;
          }
        },
      };
    },
    [prefetchRuneData, prefetchOrdinalData, prefetchBRC20TokenData]
  );

  // Navigation prefetch handlers
  const createNavHandler = useCallback(
    (page: 'explorer' | 'gallery' | 'brc20' | 'wallet') => {
      return {
        onMouseEnter: () => {
          switch (page) {
            case 'explorer':
              prefetchExplorerPage();
              break;
            case 'gallery':
              prefetchGalleryPage();
              break;
            case 'brc20':
              prefetchBRC20Page();
              break;
          }
        },
        onFocus: () => {
          switch (page) {
            case 'explorer':
              prefetchExplorerPage();
              break;
            case 'gallery':
              prefetchGalleryPage();
              break;
            case 'brc20':
              prefetchBRC20Page();
              break;
          }
        },
      };
    },
    [prefetchExplorerPage, prefetchGalleryPage, prefetchBRC20Page]
  );

  return {
    // Individual prefetch functions
    prefetchRune: prefetchRuneData,
    prefetchRuneHolders: prefetchRuneHoldersData,
    prefetchOrdinal: prefetchOrdinalData,
    prefetchBRC20Token: prefetchBRC20TokenData,

    // Page prefetch functions
    prefetchExplorerPage,
    prefetchGalleryPage,
    prefetchBRC20Page,
    prefetchPortfolio: prefetchUserPortfolio,

    // Event handler creators
    createHoverHandler,
    createNavHandler,
  };
}

export default usePrefetch;
