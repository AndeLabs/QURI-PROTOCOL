/**
 * Design System - Shadow Tokens
 * Elevation system for depth and hierarchy
 */

export const shadows = {
  // Base shadow scale (Material Design inspired)
  none: 'none',

  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',

  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Elevation levels (semantic naming)
  elevation: {
    0: 'none',
    1: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    2: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    3: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    4: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    5: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  },

  // Colored shadows for special effects
  colored: {
    gold: '0 10px 25px -5px rgba(212, 175, 55, 0.3)',
    'gold-sm': '0 4px 10px -2px rgba(212, 175, 55, 0.2)',
    'gold-lg': '0 20px 40px -10px rgba(212, 175, 55, 0.4)',

    orange: '0 10px 25px -5px rgba(249, 115, 22, 0.3)',
    'orange-sm': '0 4px 10px -2px rgba(249, 115, 22, 0.2)',

    blue: '0 10px 25px -5px rgba(59, 130, 246, 0.3)',
    'blue-sm': '0 4px 10px -2px rgba(59, 130, 246, 0.2)',

    green: '0 10px 25px -5px rgba(34, 197, 94, 0.3)',
    'green-sm': '0 4px 10px -2px rgba(34, 197, 94, 0.2)',

    red: '0 10px 25px -5px rgba(239, 68, 68, 0.3)',
    'red-sm': '0 4px 10px -2px rgba(239, 68, 68, 0.2)',

    purple: '0 10px 25px -5px rgba(168, 85, 247, 0.3)',
    'purple-sm': '0 4px 10px -2px rgba(168, 85, 247, 0.2)',
  },

  // Component-specific shadows
  component: {
    button: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    'button-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    dropdown: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    modal: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    tooltip: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    'focus-ring': '0 0 0 3px rgba(212, 175, 55, 0.2)',
    'focus-ring-error': '0 0 0 3px rgba(239, 68, 68, 0.2)',
  },

  // Glow effects
  glow: {
    gold: '0 0 20px rgba(212, 175, 55, 0.5)',
    'gold-sm': '0 0 10px rgba(212, 175, 55, 0.3)',
    'gold-lg': '0 0 40px rgba(212, 175, 55, 0.6)',
    orange: '0 0 20px rgba(249, 115, 22, 0.5)',
    blue: '0 0 20px rgba(59, 130, 246, 0.5)',
    green: '0 0 20px rgba(34, 197, 94, 0.5)',
    purple: '0 0 20px rgba(168, 85, 247, 0.5)',
  },
} as const;

export type ShadowToken = keyof typeof shadows;
