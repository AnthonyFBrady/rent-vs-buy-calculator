'use client';

import { CSSProperties, MouseEvent, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'cta' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
  'aria-label'?: string;
}

const SIZE: Record<ButtonSize, CSSProperties> = {
  sm: { height: '36px', padding: '0 14px', fontSize: '13px', borderRadius: '8px' },
  md: { height: '48px', padding: '0 20px', fontSize: '14px', borderRadius: '10px' },
  lg: { height: '56px', padding: '0 28px', fontSize: '15px', borderRadius: '12px' },
};

const VARIANT: Record<ButtonVariant, CSSProperties> = {
  primary: {
    backgroundColor: 'var(--color-btn-primary-bg)',
    color: 'var(--color-btn-primary-text)',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'transparent',
    color: 'var(--color-text)',
    border: '1.5px solid var(--color-outline-active)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    border: 'none',
  },
  cta: {
    backgroundColor: 'var(--color-accent-cta)',
    color: 'var(--color-text)',
    border: 'none',
  },
  destructive: {
    backgroundColor: 'transparent',
    color: 'var(--color-negative)',
    border: '1.5px solid var(--color-negative)',
  },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  fullWidth,
  type = 'button',
  style,
  'aria-label': ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'opacity 0.15s, background-color 0.15s',
        width: fullWidth ? '100%' : 'auto',
        flexShrink: 0,
        ...SIZE[size],
        ...VARIANT[variant],
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '0.82'; }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1'; }}
    >
      {children}
    </button>
  );
}
