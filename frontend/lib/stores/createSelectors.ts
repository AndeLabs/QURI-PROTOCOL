/**
 * Auto-generating Selectors for Zustand
 * Reduces boilerplate and improves type safety
 */

import { StoreApi, UseBoundStore } from 'zustand';

/**
 * Type for store with auto-generated selectors
 */
type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & { use: { [K in keyof T]: () => T[K] } }
  : never;

/**
 * Creates auto-generated selectors for a Zustand store
 *
 * @example
 * ```ts
 * const useBearStoreBase = create<BearState>()((set) => ({
 *   bears: 0,
 *   increase: (by) => set((state) => ({ bears: state.bears + by })),
 * }))
 *
 * const useBearStore = createSelectors(useBearStoreBase)
 *
 * // Usage:
 * const bears = useBearStore.use.bears()
 * const increase = useBearStore.use.increase()
 * ```
 */
export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  _store: S
): WithSelectors<S> {
  const store = _store as WithSelectors<typeof _store>;
  store.use = {} as { [K in keyof ReturnType<S['getState']>]: () => ReturnType<S['getState']>[K] };

  for (const k of Object.keys(store.getState())) {
    (store.use as Record<string, () => unknown>)[k] = () =>
      store((s) => s[k as keyof typeof s]);
  }

  return store;
}

export default createSelectors;
