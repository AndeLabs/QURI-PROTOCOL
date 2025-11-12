'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useFavorites } from '@/lib/hooks/useFavorites';

/**
 * Favorites Context Provider
 * Global state management for user's favorite runes collection
 */

interface FavoritesContextType {
  favorites: string[];
  favoriteRunes: Array<{ id: string; name: string; symbol: string; timestamp: number }>;
  isLoaded: boolean;
  count: number;
  addFavorite: (rune: { id: string; name: string; symbol: string }) => void;
  removeFavorite: (runeId: string) => void;
  toggleFavorite: (rune: { id: string; name: string; symbol: string }) => void;
  isFavorited: (runeId: string) => boolean;
  clearFavorites: () => void;
  exportFavorites: () => void;
  importFavorites: (file: File) => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const favoritesData = useFavorites();

  return (
    <FavoritesContext.Provider value={favoritesData}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavoritesContext must be used within a FavoritesProvider');
  }
  return context;
}
