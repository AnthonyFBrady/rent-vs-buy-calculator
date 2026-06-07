/**
 * Design tokens — single source of truth for visual constants.
 * All CSS custom properties in globals.css should mirror these values.
 * Components reference tokens directly; never hardcode hex values.
 */

export const color = {
  // Brand
  owner:      { light: '#A86A00', dark: '#E8C87A' },
  renter:     { light: '#0B8278', dark: '#6CBFB8' },
  cross:      { light: '#7C3AED', dark: '#A78BFA' },

  // Semantic
  positive:   { light: '#486635', dark: '#99B56E' },
  negative:   { light: '#A43D12', dark: '#FF8A71' },

  // Neutral scale — warm, Wealthsimple-inspired
  ink:        { light: '#1A1917', dark: '#FCFCFC' },
  inkMuted:   { light: '#5C5A58', dark: '#C9C6C4' },
  bg:         { light: '#F5F3EF', dark: '#1C1B1B' },
  surface:    { light: '#FDFCFA', dark: '#242220' },
  surfaceRaised: { light: '#FFFFFF', dark: '#2C2A28' },
  outline:    { light: '#E4E2E1', dark: 'rgba(148,144,141,0.22)' },
  outlineActive: { light: '#AFAAA7', dark: 'rgba(148,144,141,0.55)' },

  // CTA — Wealthsimple green
  cta:        { light: '#008A5E', dark: '#00C17B' },
  ctaSurface: { light: '#E6F5EF', dark: 'rgba(0,193,123,0.12)' },
  ctaText:    { light: '#FFFFFF', dark: '#1A1917' },
} as const;

export const font = {
  sans:   'var(--font-sans), Inter, system-ui, sans-serif',
  serif:  'var(--font-serif), Georgia, serif',
} as const;

export const radius = {
  xs:   '4px',
  sm:   '6px',
  md:   '10px',
  lg:   '14px',
  xl:   '20px',
  full: '9999px',
} as const;

export const space = {
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const shadow = {
  sm:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md:  '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
  lg:  '0 12px 32px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
} as const;

export const type = {
  display:  { size: 'clamp(32px, 4vw, 52px)', weight: 700, lineHeight: 1.1,  letterSpacing: '-0.03em', family: font.serif },
  h1:       { size: 'clamp(24px, 3vw, 36px)', weight: 700, lineHeight: 1.15, letterSpacing: '-0.025em', family: font.serif },
  h2:       { size: 'clamp(20px, 2.5vw, 28px)', weight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', family: font.serif },
  h3:       { size: '18px',   weight: 600, lineHeight: 1.3, letterSpacing: '-0.015em', family: font.sans },
  body:     { size: '15px',   weight: 400, lineHeight: 1.6, letterSpacing: '0',        family: font.sans },
  small:    { size: '13px',   weight: 400, lineHeight: 1.5, letterSpacing: '0',        family: font.sans },
  caption:  { size: '11px',   weight: 400, lineHeight: 1.4, letterSpacing: '0.04em',  family: font.sans },
  label:    { size: '11px',   weight: 500, lineHeight: 1.4, letterSpacing: '0.08em',  family: font.sans },
  mono:     { size: '13px',   weight: 500, lineHeight: 1.4, letterSpacing: '-0.01em', family: 'var(--font-mono, ui-monospace, monospace)' },
} as const;

export const motion = {
  spring:   { type: 'spring', stiffness: 340, damping: 30 } as const,
  snappy:   { type: 'spring', stiffness: 460, damping: 38 } as const,
  ease:     { duration: 0.22, ease: [0.4, 0, 0.2, 1] as [number,number,number,number] },
  slow:     { duration: 0.4,  ease: [0.4, 0, 0.2, 1] as [number,number,number,number] },
} as const;

/** Returns the correct token value for the current theme. */
export function t<T extends { light: string; dark: string }>(token: T, isDark: boolean): string {
  return isDark ? token.dark : token.light;
}
