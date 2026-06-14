import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      xs:    '375px',
      sm:    '640px',
      md:    '768px',
      lg:    '1024px',
      xl:    '1280px',
      '2xl': '1440px',
    },
    extend: {
      colors: {
        /* Core backgrounds */
        bg:               'var(--color-bg)',
        'bg-subtle':      'var(--color-bg-subtle)',
        'bg-elevated':    'var(--color-bg-elevated)',
        hover:            'var(--color-hover)',
        /* Backward-compat surface aliases */
        surface:          'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        /* Text */
        body:             'var(--color-text)',
        muted:            'var(--color-text-muted)',
        faint:            'var(--color-text-faint)',
        /* Borders */
        outline:          'var(--color-outline)',
        /* Semantic */
        positive:         'var(--color-positive)',
        negative:         'var(--color-negative)',
        /* Brand / chart */
        owner:            'var(--color-owner)',
        renter:           'var(--color-renter)',
        cross:            'var(--color-cross)',
        accent:           'var(--color-accent-cta)',
      },
      fontFamily: {
        sans:  ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono:  ['var(--font-mono, ui-monospace)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
