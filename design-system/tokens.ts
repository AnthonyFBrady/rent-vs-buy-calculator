/**
 * Design tokens — single source of truth for visual constants.
 * All CSS custom properties in globals.css should mirror these values.
 * Components reference tokens directly; never hardcode hex values.
 */

// Light theme is the shipped theme. Dark values are specced but not active —
// the experience page no longer applies dark overrides.
export const color = {
  // Brand
  owner:      { light: '#B07800', dark: '#F2C94C' },
  renter:     { light: '#009B8F', dark: '#4ECDC4' },
  cross:      { light: '#7C3AED', dark: '#B69EFF' },

  // Semantic
  positive:   { light: '#486635', dark: '#4DB87A' },
  negative:   { light: '#A43D12', dark: '#F06A5A' },

  // Neutral scale — warm, Wealthsimple-inspired
  ink:        { light: '#32302F', dark: '#F5F4F0' },
  inkMuted:   { light: '#686664', dark: '#9C9A97' },
  inkFaint:   { light: '#AFAAA7', dark: '#5C5A57' },
  bg:         { light: '#F5F3EF', dark: '#171614' },
  surface:    { light: '#FCFCFC', dark: '#1F1E1B' },
  surfaceRaised: { light: '#FFFFFF', dark: '#272523' },
  outline:    { light: '#E4E2E1', dark: 'rgba(255,255,255,0.07)' },
  outlineActive: { light: '#AFAAA7', dark: 'rgba(255,255,255,0.18)' },

  // CTA — high contrast, no color
  ctaBg:      { light: '#32302F', dark: '#F5F4F0' },
  ctaText:    { light: '#FFFFFF', dark: '#171614' },
} as const;

export const font = {
  sans:   'var(--font-sans), Inter, system-ui, sans-serif',
  serif:  'Georgia, serif',
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
  display:  { size: 'clamp(32px, 4vw, 52px)', weight: 700, lineHeight: 1.1,  letterSpacing: '-0.03em',  family: font.sans },
  h1:       { size: 'clamp(24px, 3vw, 36px)', weight: 700, lineHeight: 1.15, letterSpacing: '-0.025em', family: font.sans },
  h2:       { size: 'clamp(20px, 2.5vw, 28px)', weight: 600, lineHeight: 1.2, letterSpacing: '-0.02em', family: font.sans },
  h3:       { size: '18px',   weight: 600, lineHeight: 1.3, letterSpacing: '-0.015em', family: font.sans },
  body:     { size: '15px',   weight: 400, lineHeight: 1.6, letterSpacing: '0',        family: font.sans },
  small:    { size: '13px',   weight: 400, lineHeight: 1.5, letterSpacing: '0',        family: font.sans },
  caption:  { size: '11px',   weight: 400, lineHeight: 1.4, letterSpacing: '0.04em',  family: font.sans },
  label:    { size: '11px',   weight: 500, lineHeight: 1.4, letterSpacing: '0.08em',  family: font.sans },
  mono:     { size: '13px',   weight: 500, lineHeight: 1.4, letterSpacing: '-0.01em', family: 'var(--font-mono, ui-monospace, monospace)' },
  outcome:  { size: 'clamp(40px, 5vw, 60px)', weight: 700, lineHeight: 1.0, letterSpacing: '-0.04em', family: font.sans, tabular: true },
} as const;

export const motion = {
  fast:        { duration: 0.12, ease: [0.3, 0, 0.6, 1]  as [number,number,number,number] },
  medium:      { duration: 0.22, ease: [0.0, 0, 0.2, 1]  as [number,number,number,number] },
  slow:        { duration: 0.38, ease: [0.0, 0, 0.2, 1]  as [number,number,number,number] },
  panel:       { duration: 0.24, ease: [0.0, 0, 0.2, 1]  as [number,number,number,number] },
  sidebar:     { duration: 0.26, ease: [0.0, 0, 0.2, 1]  as [number,number,number,number] },
  chart:       { duration: 0.70, ease: [0.0, 0, 0.2, 1]  as [number,number,number,number] },
  chartUpdate: { duration: 0.32, ease: [0.0, 0, 0.2, 1]  as [number,number,number,number] },
} as const;

/** Returns the correct token value for the current theme. */
export function t<T extends { light: string; dark: string }>(token: T, isDark: boolean): string {
  return isDark ? token.dark : token.light;
}
