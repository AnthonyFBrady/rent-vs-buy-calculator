'use client';

import { useState } from 'react';

// Single shared single-select control. One selected-state language (outline +
// accent tint) for every "pick one" question: province, home type, and the
// lifestyle dimensions. Do not hand-roll selection buttons in a step — use this.

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  /** Optional second line, shown in the 'card' variant. */
  sublabel?: string;
}

interface Props<T extends string> {
  options: ChoiceOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** Selected-state accent. Defaults to owner. */
  accent?: string;
  /** Grid columns. Default 1 (vertical stack). */
  columns?: number;
  /** 'card' = taller, supports sublabel. 'chip' = compact single line. */
  variant?: 'card' | 'chip';
  align?: 'left' | 'center';
  ariaLabel?: string;
}

export function ChoiceGroup<T extends string>({
  options,
  value,
  onChange,
  accent = 'var(--color-owner)',
  columns = 1,
  variant = 'card',
  align = 'left',
  ariaLabel,
}: Props<T>) {
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '8px' }}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        const hovered = hoveredValue === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            onMouseEnter={() => setHoveredValue(opt.value)}
            onMouseLeave={() => setHoveredValue(null)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: align === 'center' ? 'center' : 'flex-start',
              gap: opt.sublabel ? '3px' : 0,
              padding: variant === 'chip' ? '0 12px' : '12px 14px',
              height: variant === 'chip' ? '44px' : undefined,
              minHeight: variant === 'card' ? '52px' : undefined,
              borderRadius: '12px',
              textAlign: align,
              border: selected
                ? `1.5px solid ${accent}`
                : hovered
                  ? '1px solid rgba(0,0,0,0.20)'
                  : '1px solid rgba(0,0,0,0.08)',
              backgroundColor: selected
                ? `color-mix(in srgb, ${accent} 12%, white)`
                : '#FFFFFF',
              cursor: 'pointer',
              transition: 'border-color 0.1s, background-color 0.1s',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
            }}
          >
            <span
              style={{
                fontSize: variant === 'chip' ? '13px' : '14px',
                fontWeight: selected ? 600 : 500,
                color: selected ? accent : 'var(--color-text)',
                lineHeight: 1.2,
                letterSpacing: '-0.01em',
              }}
            >
              {opt.label}
            </span>
            {opt.sublabel && (
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.35 }}>
                {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
