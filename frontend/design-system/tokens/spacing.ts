/**
 * Design System - Spacing Tokens
 * Consistent spacing scale based on 4px grid system
 */

export const spacing = {
  // Base spacing scale (4px increments)
  0: '0px',
  px: '1px',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px

  // Golden Ratio Spacing (φ = 1.618)
  // Based on mathematical perfection found in nature
  goldenRatio: {
    'gr-xs': '0.618rem', // 9.9px
    'gr-sm': '1rem', // 16px (base)
    'gr-base': '1.618rem', // 25.9px
    'gr-md': '2.618rem', // 41.9px
    'gr-lg': '4.236rem', // 67.8px
    'gr-xl': '6.854rem', // 109.7px
    'gr-2xl': '11.09rem', // 177.5px
    'gr-3xl': '17.944rem', // 287.2px
  },

  // Museum Spacing - Premium isolation for gallery feel
  // Generous white space creates luxury perception
  museum: {
    'card-padding': '2rem', // 32px - Premium card padding
    'card-gap': '3rem', // 48px - Space between cards
    'section-padding': '5rem', // 80px - Section isolation
    'hero-padding': '8rem', // 128px - Hero section breathing room
    'isolation-space': '4rem', // 64px - Object isolation
    'gallery-gap': '4.236rem', // 67.8px - Golden ratio gallery spacing
    'exhibit-margin': '6.854rem', // 109.7px - Major exhibit spacing
    'white-space-xs': '1.618rem', // Minimum premium spacing
    'white-space-sm': '2.618rem', // Small premium spacing
    'white-space-md': '4.236rem', // Medium premium spacing
    'white-space-lg': '6.854rem', // Large premium spacing
    'white-space-xl': '11.09rem', // Extra large premium spacing
  },

  // Semantic spacing
  semantic: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem', // 48px
    '4xl': '4rem', // 64px
    '5xl': '6rem', // 96px
    '6xl': '8rem', // 128px
  },

  // Component-specific spacing
  component: {
    // Padding
    'button-sm': '0.5rem 0.75rem', // 8px 12px
    'button-md': '0.625rem 1rem', // 10px 16px
    'button-lg': '0.75rem 1.5rem', // 12px 24px
    'input-sm': '0.5rem 0.75rem', // 8px 12px
    'input-md': '0.625rem 0.875rem', // 10px 14px
    'input-lg': '0.75rem 1rem', // 12px 16px
    'card-sm': '1rem', // 16px
    'card-md': '1.5rem', // 24px
    'card-lg': '2rem', // 32px

    // Gaps
    'stack-xs': '0.25rem', // 4px
    'stack-sm': '0.5rem', // 8px
    'stack-md': '1rem', // 16px
    'stack-lg': '1.5rem', // 24px
    'stack-xl': '2rem', // 32px
    'inline-xs': '0.25rem', // 4px
    'inline-sm': '0.5rem', // 8px
    'inline-md': '0.75rem', // 12px
    'inline-lg': '1rem', // 16px
    'inline-xl': '1.5rem', // 24px
  },

  // Layout spacing
  layout: {
    'section-sm': '2rem', // 32px
    'section-md': '4rem', // 64px
    'section-lg': '6rem', // 96px
    'section-xl': '8rem', // 128px
    'container-sm': '1rem', // 16px
    'container-md': '1.5rem', // 24px
    'container-lg': '2rem', // 32px
    'gutter-sm': '1rem', // 16px
    'gutter-md': '1.5rem', // 24px
    'gutter-lg': '2rem', // 32px
  },
} as const;

export type SpacingToken = keyof typeof spacing;
