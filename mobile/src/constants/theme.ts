/**
 * FoodWiseAI Design System — Theme Tokens
 * Warm orange + clean white + charcoal typography
 */

import '@/global.css';

import { Platform } from 'react-native';

// Brand Palette
export const Brand = {
  primary:       '#C0392B',
  primaryHover:  '#A93226',
  primaryLight:  '#FFF0EE',
  primaryBorder: '#F5C6C2',
  orange:        '#D4570A',
  orangeLight:   '#FFF4EF',
} as const;

// Surface Palette
export const Surface = {
  white:       '#FFFFFF',
  bg:          '#F7F7F7',
  card:        '#FFFFFF',
  cardAlt:     '#F9F9F9',
  border:      '#E8E8E8',
  borderLight: '#F0F0F0',
  sidebar:     '#F5F5F5',
  inputBg:     '#F5F5F5',
} as const;

// Text Palette
export const TextColors = {
  heading:     '#1A1A1A',
  body:        '#444444',
  muted:       '#888888',
  placeholder: '#AAAAAA',
  inverse:     '#FFFFFF',
  primary:     '#C0392B',
  orange:      '#D4570A',
} as const;

// Macro / Status Colors
export const Status = {
  protein: '#C0392B',
  carbs:   '#C8860A',
  fats:    '#888888',
  success: '#2ECC71',
  warning: '#F39C12',
  info:    '#3498DB',
} as const;

// Legacy colors map (ThemedText / ThemedView compatibility)
export const Colors = {
  light: {
    text:               '#1A1A1A',
    background:         '#FFFFFF',
    backgroundElement:  '#F9F9F9',
    backgroundSelected: '#F0F0F0',
    textSecondary:      '#888888',
  },
  dark: {
    text:               '#FFFFFF',
    background:         '#0F0F0F',
    backgroundElement:  '#1A1A1A',
    backgroundSelected: '#252525',
    textSecondary:      '#888888',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    'var(--font-display)',
    serif:   'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono:    'var(--font-mono)',
  },
});

export const Spacing = {
  half:  2,
  one:   4,
  two:   8,
  three: 16,
  four:  24,
  five:  32,
  six:   64,
} as const;

export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export const BottomTabInset  = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 1200;
export const SidebarWidth    = 200;
