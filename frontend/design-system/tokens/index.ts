/**
 * Design System Tokens
 * Centralized export of all design tokens
 */

import { colors, type ColorToken } from './colors';
import { typography, type TypographyToken, type TextStyle } from './typography';
import { spacing, type SpacingToken } from './spacing';
import { shadows, type ShadowToken } from './shadows';
import { animations, type AnimationToken } from './animations';

// Re-export individual tokens
export { colors, typography, spacing, shadows, animations };

// Re-export types
export type { ColorToken, TypographyToken, TextStyle, SpacingToken, ShadowToken, AnimationToken };

// Re-export all tokens as a single object for convenience
export const tokens = {
  colors,
  typography,
  spacing,
  shadows,
  animations,
} as const;
