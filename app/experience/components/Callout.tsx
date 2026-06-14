'use client';

interface Props {
  variant?: 'owner' | 'renter' | 'neutral' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const STYLES = {
  owner:   { border: 'color-mix(in srgb, var(--color-owner) 30%, transparent)',    bg: 'color-mix(in srgb, var(--color-owner) 8%, transparent)',    color: 'var(--color-owner)'    },
  renter:  { border: 'color-mix(in srgb, var(--color-renter) 30%, transparent)',   bg: 'color-mix(in srgb, var(--color-renter) 8%, transparent)',   color: 'var(--color-renter)'   },
  neutral: { border: 'var(--color-outline)',                                         bg: 'transparent',                                               color: 'var(--color-text-muted)' },
  warning: { border: 'color-mix(in srgb, var(--color-negative) 25%, transparent)', bg: 'color-mix(in srgb, var(--color-negative) 6%, transparent)', color: 'var(--color-negative)' },
};

export function Callout({ variant = 'neutral', children, className = '' }: Props) {
  const s = STYLES[variant];
  return (
    <div
      className={`rounded-sm px-3 py-2.5 ${className}`}
      style={{ border: `1px solid ${s.border}`, backgroundColor: s.bg, color: s.color }}
    >
      {children}
    </div>
  );
}
