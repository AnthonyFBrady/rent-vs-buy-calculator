'use client';

import { CSSProperties } from 'react';

interface DividerProps {
  spacing?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

export function Divider({ spacing = 'md', style }: DividerProps) {
  const margin = spacing === 'sm' ? '8px 0' : spacing === 'lg' ? '24px 0' : '16px 0';
  return (
    <div
      aria-hidden
      style={{
        height: '1px',
        backgroundColor: 'var(--color-outline)',
        margin,
        ...style,
      }}
    />
  );
}
