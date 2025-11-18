/**
 * Design System Tokens
 * Centralized export of all design tokens
 */

export { colors, type ColorToken } from './colors';
export { typography, type TypographyToken, type TextStyle } from './typography';
export { spacing, type SpacingToken } from './spacing';
export { shadows, type ShadowToken } from './shadows';
export { animations, type AnimationToken } from './animations';

// Re-export all tokens as a single object for convenience
export const tokens = {
  colors: colors,
  typography: typography,
  spacing: spacing,
  shadows: shadows,
  animations: animations,
} as const;
