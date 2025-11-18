/**
 * QURI Protocol - Hooks Index
 * Export all hooks for easy importing
 */

// Canister-specific hooks (recommended approach)
export { useRuneEngine } from './useRuneEngine';
export { useBitcoinIntegration } from './useBitcoinIntegration';
export { useRegistry } from './useRegistry';
export { useIdentityManager } from './useIdentityManager';

// Generic actor hook (use specific hooks instead when possible)
export { useActor, useAllActors } from './useActor';
export type { CanisterName } from './useActor';

/**
 * Usage guide:
 *
 * ✅ RECOMMENDED: Use specific hooks for better type safety and DX
 * ```tsx
 * import { useRuneEngine, useRegistry } from '@/hooks';
 *
 * const { etchRune, loading, error } = useRuneEngine();
 * const { listRunes } = useRegistry();
 * ```
 *
 * ⚠️ ADVANCED: Use generic hooks only when needed
 * ```tsx
 * import { useActor, useAllActors } from '@/hooks';
 *
 * const actor = useActor('rune-engine');
 * const allActors = useAllActors();
 * ```
 */
