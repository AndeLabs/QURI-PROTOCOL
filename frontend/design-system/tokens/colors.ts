/**
 * Design System - Color Tokens
 * Complete color palette for QURI Protocol
 */

export const colors = {
  // Museum Theme - Primary Palette
  museum: {
    white: '#FAFAF9',
    cream: '#F5F4F0',
    'light-gray': '#E8E6E1',
    'dark-gray': '#6B6B6B',
    charcoal: '#2C2C2C',
    black: '#1A1A1A',
  },

  // Museum Premium - Luxury Additions
  premium: {
    'cream-white': '#FDFDF8',
    'exhibition-gray': '#F5F5F0',
    'frame-charcoal': '#2C2C2C',
    'gallery-white': '#FFFFFF',
    'accent-gold': '#FFD666',
  },

  // Gold - Accent Color (Premium)
  gold: {
    50: '#FFFBF0',
    100: '#FFF4D6',
    200: '#FFE9AD',
    300: '#FFD666', // Premium gold accent
    400: '#FFC233',
    500: '#FFB800', // Bright premium gold
    600: '#D4AF37', // Classic gold
    700: '#B8952E',
    800: '#9A7B25',
    900: '#604916',
  },

  // Orange - Bitcoin/ckBTC
  orange: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },

  // Blue - Info/Links
  blue: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Green - Success
  green: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
    800: '#166534',
    900: '#14532D',
  },

  // Red - Error/Danger
  red: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },

  // Purple - Special/Premium
  purple: {
    50: '#FAF5FF',
    100: '#F3E8FF',
    200: '#E9D5FF',
    300: '#D8B4FE',
    400: '#C084FC',
    500: '#A855F7',
    600: '#9333EA',
    700: '#7E22CE',
    800: '#6B21A8',
    900: '#581C87',
  },

  // Yellow - Warning
  yellow: {
    50: '#FEFCE8',
    100: '#FEF9C3',
    200: '#FEF08A',
    300: '#FDE047',
    400: '#FACC15',
    500: '#EAB308',
    600: '#CA8A04',
    700: '#A16207',
    800: '#854D0E',
    900: '#713F12',
  },

  // Gray - Neutral Scale
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic Colors
  semantic: {
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
    info: '#3B82F6',
    primary: '#D4AF37', // gold-500
    secondary: '#6B6B6B', // museum-dark-gray
  },

  // Gradients
  gradients: {
    gold: 'linear-gradient(135deg, #FFD875 0%, #D4AF37 100%)',
    orange: 'linear-gradient(135deg, #FB923C 0%, #EA580C 100%)',
    blue: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)',
    purple: 'linear-gradient(135deg, #C084FC 0%, #9333EA 100%)',
    sunset: 'linear-gradient(135deg, #FFD875 0%, #FB923C 50%, #EA580C 100%)',
    ocean: 'linear-gradient(135deg, #60A5FA 0%, #2563EB 50%, #1E3A8A 100%)',
    museum: 'linear-gradient(135deg, #FAFAF9 0%, #F5F4F0 100%)',
  },

  // Special Effects
  overlays: {
    dark: 'rgba(0, 0, 0, 0.5)',
    darker: 'rgba(0, 0, 0, 0.75)',
    light: 'rgba(255, 255, 255, 0.5)',
    lighter: 'rgba(255, 255, 255, 0.75)',
    gold: 'rgba(212, 175, 55, 0.1)',
  },
} as const;

export type ColorToken = keyof typeof colors;
