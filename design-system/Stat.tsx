'use client';

import { CSSProperties, ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  /** Optional secondary line under value */
  sub?: ReactNode;
  /** Accent color for value. Defaults to var(--color-text). */
  valueColor?: string;
  /** Layout direction */
  direction?: 'vertical' | 'horizontal';
  style?: CSSProperties;
}

export function Stat({ label, value, sub, valueColor, direction = 'vertical', style }: StatProps) {
  if (direction === 'horizontal') {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', ...style }}>
        <span style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          lineHeight: 1.4,
        }}>
          {label}
        </span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: valueColor ?? 'var(--color-text)',
          fontFamily: 'var(--font-serif), Georgia, serif',
          letterSpacing: '-0.01em',
          lineHeight: 1,
        }}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', ...style }}>
      <span style={{
        fontSize: '11px',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        lineHeight: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 'clamp(20px, 2.5vw, 28px)',
        fontWeight: 700,
        color: valueColor ?? 'var(--color-text)',
        fontFamily: 'var(--font-serif), Georgia, serif',
        letterSpacing: '-0.025em',
        lineHeight: 1.1,
      }}>
        {value}
      </span>
      {sub && (
        <span style={{
          fontSize: '12px',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          lineHeight: 1.4,
        }}>
          {sub}
        </span>
      )}
    </div>
  );
}
