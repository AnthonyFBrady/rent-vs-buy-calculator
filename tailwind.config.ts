import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:       'var(--color-bg)',
        surface:  'var(--color-surface)',
        hover:    'var(--color-hover)',
        body:     'var(--color-text)',
        muted:    'var(--color-text-muted)',
        outline:  'var(--color-outline)',
        positive: 'var(--color-positive)',
        negative: 'var(--color-negative)',
        owner:    'var(--color-owner)',
        renter:   'var(--color-renter)',
        accent:   'var(--color-accent-cta)',
        cross:    'var(--color-cross)',
        // Legacy — will deprecate
        ink: '#1A1A1A',
        paper: '#FAF7F2',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
