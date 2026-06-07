// Design tokens for the Rent or Buy experience.
// All colour values, typography scale, and spacing units live here.
// Import these instead of hardcoding hex values in components.

export const colors = {
  // Chart lines
  ownerGold: '#E8C87A',
  renterTeal: '#6CBFB8',
  crossoverPurple: '#A78BFA',
  positiveGreen: '#4CAF85',
  negativeRed: '#E05C5C',

  // Dark mode surfaces
  dark: {
    bg: '#0C0C0E',
    surface: '#141416',
    border: 'rgba(255,255,255,0.08)',
    text: '#F2F2F0',
    muted: 'rgba(242,242,240,0.45)',
    grid: 'rgba(255,255,255,0.04)',
  },

  // Light mode surfaces
  light: {
    bg: '#FAF8F5',
    surface: '#FFFFFF',
    border: 'rgba(0,0,0,0.1)',
    text: '#1A1A1A',
    muted: 'rgba(26,26,26,0.4)',
    grid: 'rgba(0,0,0,0.04)',
  },
} as const;

// Derive surface tokens from isDark flag — avoids ternary chains in components.
export function surfaceTokens(isDark: boolean) {
  const theme = isDark ? colors.dark : colors.light;
  return {
    bg: theme.bg,
    surface: theme.surface,
    border: theme.border,
    text: theme.text,
    muted: theme.muted,
    grid: theme.grid,
  };
}

export const typography = {
  serif: 'var(--font-serif), Georgia, serif',
  sans: 'var(--font-sans), system-ui, sans-serif',
} as const;

export const radius = {
  sm: '4px',
  md: '8px',
} as const;

export const easing = {
  // Standard material curve
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number],
  // Spring overshoot for chart path morph
  spring: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const;
