'use client';

import { CSSProperties, ReactNode } from 'react';

type BadgeVariant = 'owner' | 'renter' | 'neutral' | 'positive' | 'negative' | 'cta';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

const VARIANT_STYLES: Record<BadgeVariant, CSSProperties> = {
  owner: {
    backgroundColor: 'rgba(168,106,0,0.12)',
    color: 'var(--color-owner)',
    border: '1px solid rgba(168,106,0,0.20)',
  },
  renter: {
    backgroundColor: 'rgba(11,130,120,0.10)',
    color: 'var(--color-renter)',
    border: '1px solid rgba(11,130,120,0.18)',
  },
  neutral: {
    backgroundColor: 'var(--color-hover)',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-outline)',
  },
  positive: {
    backgroundColor: 'rgba(72,102,53,0.10)',
    color: 'var(--color-positive)',
    border: '1px solid rgba(72,102,53,0.18)',
  },
  negative: {
    backgroundColor: 'rgba(164,61,18,0.10)',
    color: 'var(--color-negative)',
    border: '1px solid rgba(164,61,18,0.18)',
  },
  cta: {
    backgroundColor: 'var(--color-accent-cta)',
    color: 'var(--color-text)',
    border: '1px solid transparent',
  },
};

export function Badge({ children, variant = 'neutral', size = 'sm', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '9999px',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        padding: size === 'sm' ? '3px 8px' : '5px 12px',
        fontSize: size === 'sm' ? '11px' : '13px',
        letterSpacing: size === 'sm' ? '0.03em' : '0.01em',
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
