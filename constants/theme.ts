/**
 * Design tokens shared across the app: color palette (light/dark), spacing,
 * radius and shadow scales. `useThemeColor` (hooks/use-theme-color.ts) pulls
 * from `Colors`; everything else can import `Spacing` / `Radius` / `Shadows`
 * directly.
 */

import { Platform } from 'react-native';

const primary = '#2871E6';
const primaryDark = '#1F5FC4';

export const Colors = {
  light: {
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceSecondary: '#F1F2F5',
    border: 'rgba(17,24,39,0.08)',
    borderStrong: 'rgba(17,24,39,0.14)',
    tint: primary,
    primary,
    primaryPressed: primaryDark,
    primaryMuted: 'rgba(40,113,230,0.10)',
    icon: '#6B7280',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: primary,
    tabBarBackground: '#FFFFFF',
    tabBarBorder: 'rgba(17,24,39,0.08)',
    danger: '#DC2626',
    dangerMuted: 'rgba(220,38,38,0.10)',
    success: '#16A34A',
    successMuted: 'rgba(22,163,74,0.10)',
    warning: '#D97706',
    warningMuted: 'rgba(217,119,6,0.10)',
    shadowColor: '#0F172A',
  },
  dark: {
    text: '#F3F4F6',
    textSecondary: '#9CA3AF',
    textTertiary: '#6B7280',
    background: '#0B0D10',
    surface: '#16181D',
    surfaceSecondary: '#1E2126',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',
    tint: '#5B9BFF',
    primary: '#5B9BFF',
    primaryPressed: '#3D7EE6',
    primaryMuted: 'rgba(91,155,255,0.16)',
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#5B9BFF',
    tabBarBackground: '#16181D',
    tabBarBorder: 'rgba(255,255,255,0.08)',
    danger: '#F87171',
    dangerMuted: 'rgba(248,113,113,0.14)',
    success: '#4ADE80',
    successMuted: 'rgba(74,222,128,0.14)',
    warning: '#FBBF24',
    warningMuted: 'rgba(251,191,36,0.14)',
    shadowColor: '#000000',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
    },
    android: { elevation: 3 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 6 },
    default: {},
  }),
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
