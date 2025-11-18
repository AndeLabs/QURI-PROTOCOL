/**
 * Design System - Typography Tokens
 * Complete typography scale for QURI Protocol
 */

export const typography = {
  // Font Families
  fontFamily: {
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  },

  // Font Sizes (rem-based for accessibility)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
    '8xl': '6rem', // 96px
    '9xl': '8rem', // 128px
  },

  // Font Weights
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  // Text Styles - Predefined combinations
  textStyles: {
    // Display (Hero text)
    'display-large': {
      fontSize: '6rem', // 96px
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.025em',
      fontFamily: 'serif',
    },
    'display-medium': {
      fontSize: '4.5rem', // 72px
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.025em',
      fontFamily: 'serif',
    },
    'display-small': {
      fontSize: '3.75rem', // 60px
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.025em',
      fontFamily: 'serif',
    },

    // Headings
    'h1': {
      fontSize: '3rem', // 48px
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
      fontFamily: 'serif',
    },
    'h2': {
      fontSize: '2.25rem', // 36px
      fontWeight: '700',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
      fontFamily: 'serif',
    },
    'h3': {
      fontSize: '1.875rem', // 30px
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '0em',
      fontFamily: 'serif',
    },
    'h4': {
      fontSize: '1.5rem', // 24px
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },
    'h5': {
      fontSize: '1.25rem', // 20px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },
    'h6': {
      fontSize: '1.125rem', // 18px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },

    // Body Text
    'body-large': {
      fontSize: '1.125rem', // 18px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },
    'body-base': {
      fontSize: '1rem', // 16px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },
    'body-small': {
      fontSize: '0.875rem', // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },

    // Labels & Captions
    'label-large': {
      fontSize: '1rem', // 16px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'sans',
    },
    'label-medium': {
      fontSize: '0.875rem', // 14px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
      fontFamily: 'sans',
    },
    'label-small': {
      fontSize: '0.75rem', // 12px
      fontWeight: '500',
      lineHeight: '1.5',
      letterSpacing: '0.05em',
      fontFamily: 'sans',
    },

    // Code & Mono
    'code-large': {
      fontSize: '1rem', // 16px
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: '0em',
      fontFamily: 'mono',
    },
    'code-base': {
      fontSize: '0.875rem', // 14px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'mono',
    },
    'code-small': {
      fontSize: '0.75rem', // 12px
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
      fontFamily: 'mono',
    },

    // Buttons
    'button-large': {
      fontSize: '1rem', // 16px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
      fontFamily: 'sans',
    },
    'button-medium': {
      fontSize: '0.875rem', // 14px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.025em',
      fontFamily: 'sans',
    },
    'button-small': {
      fontSize: '0.75rem', // 12px
      fontWeight: '600',
      lineHeight: '1.5',
      letterSpacing: '0.05em',
      fontFamily: 'sans',
    },
  },
} as const;

export type TypographyToken = keyof typeof typography;
export type TextStyle = keyof typeof typography.textStyles;
