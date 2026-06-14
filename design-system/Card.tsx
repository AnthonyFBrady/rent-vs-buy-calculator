'use client';

import { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Padding preset. Default 'md'. */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Visual variant. Default 'surface'. */
  variant?: 'surface' | 'raised' | 'outline' | 'tinted';
  /** Extra inline styles */
  style?: CSSProperties;
  onClick?: () => void;
  role?: string;
  'aria-label'?: string;
}

const PADDING: Record<string, string> = {
  none: '0',
  sm:   '12px 14px',
  md:   '16px 20px',
  lg:   '24px 28px',
};

export function Card({
  children,
  className,
  padding = 'md',
  variant = 'surface',
  style,
  onClick,
  role,
  'aria-label': ariaLabel,
}: CardProps) {
  const base: CSSProperties = {
    borderRadius: '16px',
    padding: PADDING[padding],
    transition: 'box-shadow 0.15s, border-color 0.15s',
    ...style,
  };

  const variants: Record<string, CSSProperties> = {
    surface: {
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-outline)',
    },
    raised: {
      backgroundColor: 'var(--color-surface)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
      border: '1px solid var(--color-outline)',
    },
    outline: {
      backgroundColor: 'transparent',
      border: '1px solid var(--color-outline)',
    },
    tinted: {
      backgroundColor: 'var(--color-hover)',
      border: '1px solid transparent',
    },
  };

  return (
    <div
      className={className}
      style={{ ...base, ...variants[variant] }}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
