// Design tokens for the Rent or Buy experience.
// All colour values, typography scale, and spacing units live here.
// Import these instead of hardcoding hex values in components.

export const colors = {
  // Chart lines
  ownerGold: '#F59E0B',
  ownerGoldDark: '#F2C94C',
  renterTeal: '#14B8A6',
  renterTealDark: '#4ECDC4',
  crossoverPurple: '#8B5CF6',
  crossoverPurpleDark: '#A78BFA',
  positiveGreen: '#16A34A',
  negativeRed: '#DC2626',

  // Dark mode surfaces
  dark: {
    bg: '#0F0F11',
    surface: '#18181B',
    border: 'rgba(255,255,255,0.08)',
    text: '#FAFAFA',
    muted: '#A1A1AA',
    grid: 'rgba(255,255,255,0.05)',
  },

  // Light mode surfaces
  light: {
    bg: '#FFFFFF',
    surface: '#F7F7F8',
    border: '#E4E4E7',
    text: '#0F0F11',
    muted: '#52525B',
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
  sans: 'var(--font-sans), system-ui, sans-serif',
  mono: 'var(--font-mono, ui-monospace), monospace',
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
