'use client';

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';

/**
 * Favorites/Bookmarks Hook with localStorage Persistence
 * Museum-grade collection management for premium art pieces
 */

const STORAGE_KEY = 'quri_favorites';

export interface FavoriteRune {
  id: string;
  name: string;
  symbol: string;
  timestamp: number;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteRunes, setFavoriteRunes] = useState<FavoriteRune[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as FavoriteRune[];
        setFavoriteRunes(data);
        setFavorites(new Set(data.map((r) => r.id)));
        logger.info('Loaded favorites from localStorage', { count: data.length });
      }
    } catch (error) {
      logger.error('Failed to load favorites', error instanceof Error ? error : undefined);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage whenever favorites change
  const saveFavorites = useCallback((newFavorites: FavoriteRune[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
      logger.info('Saved favorites to localStorage', { count: newFavorites.length });
    } catch (error) {
      logger.error('Failed to save favorites', error instanceof Error ? error : undefined);
    }
  }, []);

  // Add a rune to favorites
  const addFavorite = useCallback(
    (rune: { id: string; name: string; symbol: string }) => {
      if (favorites.has(rune.id)) {
        return; // Already favorited
      }

      const newFavorite: FavoriteRune = {
        id: rune.id,
        name: rune.name,
        symbol: rune.symbol,
        timestamp: Date.now(),
      };

      const newFavorites = [...favoriteRunes, newFavorite];
      setFavoriteRunes(newFavorites);
      setFavorites(new Set([...favorites, rune.id]));
      saveFavorites(newFavorites);

      logger.userAction('Add Favorite', { runeId: rune.id, runeName: rune.name });
    },
    [favorites, favoriteRunes, saveFavorites]
  );

  // Remove a rune from favorites
  const removeFavorite = useCallback(
    (runeId: string) => {
      if (!favorites.has(runeId)) {
        return; // Not favorited
      }

      const newFavorites = favoriteRunes.filter((r) => r.id !== runeId);
      const newFavoritesSet = new Set(favorites);
      newFavoritesSet.delete(runeId);

      setFavoriteRunes(newFavorites);
      setFavorites(newFavoritesSet);
      saveFavorites(newFavorites);

      logger.userAction('Remove Favorite', { runeId });
    },
    [favorites, favoriteRunes, saveFavorites]
  );

  // Toggle favorite status
  const toggleFavorite = useCallback(
    (rune: { id: string; name: string; symbol: string }) => {
      if (favorites.has(rune.id)) {
        removeFavorite(rune.id);
      } else {
        addFavorite(rune);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  // Check if a rune is favorited
  const isFavorited = useCallback(
    (runeId: string) => {
      return favorites.has(runeId);
    },
    [favorites]
  );

  // Clear all favorites
  const clearFavorites = useCallback(() => {
    setFavorites(new Set());
    setFavoriteRunes([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
      logger.userAction('Clear All Favorites');
    } catch (error) {
      logger.error('Failed to clear favorites', error instanceof Error ? error : undefined);
    }
  }, []);

  // Export favorites as JSON
  const exportFavorites = useCallback(() => {
    const data = JSON.stringify(favoriteRunes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quri-favorites-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logger.userAction('Export Favorites', { count: favoriteRunes.length });
  }, [favoriteRunes]);

  // Import favorites from JSON
  const importFavorites = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as FavoriteRune[];
          setFavoriteRunes(data);
          setFavorites(new Set(data.map((r) => r.id)));
          saveFavorites(data);
          logger.userAction('Import Favorites', { count: data.length });
        } catch (error) {
          logger.error('Failed to import favorites', error instanceof Error ? error : undefined);
        }
      };
      reader.readAsText(file);
    },
    [saveFavorites]
  );

  return {
    favorites: Array.from(favorites),
    favoriteRunes,
    isLoaded,
    count: favorites.size,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorited,
    clearFavorites,
    exportFavorites,
    importFavorites,
  };
}
