'use client';

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
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '6px' }}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: align === 'center' ? 'center' : 'flex-start',
              gap: opt.sublabel ? '3px' : 0,
              padding: variant === 'chip' ? '0 12px' : '11px 13px',
              height: variant === 'chip' ? '38px' : undefined,
              minHeight: variant === 'card' ? '44px' : undefined,
              borderRadius: '8px',
              textAlign: align,
              border: `1px solid ${selected ? accent : 'var(--color-outline)'}`,
              backgroundColor: selected
                ? `color-mix(in srgb, ${accent} 8%, transparent)`
                : 'var(--color-bg-elevated)',
              cursor: 'pointer',
              transition: 'border-color 0.15s, background-color 0.15s',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
            }}
          >
            <span
              style={{
                fontSize: variant === 'chip' ? '13px' : '14px',
                fontWeight: 500,
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
