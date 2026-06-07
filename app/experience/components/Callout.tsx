'use client';

interface Props {
  variant?: 'owner' | 'renter' | 'neutral' | 'warning';
  children: React.ReactNode;
  className?: string;
}

const STYLES = {
  owner:   { border: 'rgba(232,200,122,0.30)', bg: 'rgba(232,200,122,0.08)', color: 'rgba(232,200,122,0.9)' },
  renter:  { border: 'rgba(108,191,184,0.30)', bg: 'rgba(108,191,184,0.08)', color: 'rgba(108,191,184,0.9)' },
  neutral: { border: 'var(--color-outline)',    bg: 'transparent',            color: 'var(--color-text-muted)' },
  warning: { border: 'rgba(164,61,18,0.25)',    bg: 'rgba(164,61,18,0.04)',  color: 'rgba(164,61,18,0.85)' },
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
