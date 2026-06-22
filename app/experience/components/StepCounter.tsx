'use client';

interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}

export function StepCounter({ value, min, max, onChange, color = 'var(--color-owner)' }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: `1px solid ${color}`,
          borderColor: `color-mix(in srgb, ${color} 40%, transparent)`,
          background: 'none',
          color,
          fontSize: '18px',
          lineHeight: 1,
          cursor: value <= min ? 'not-allowed' : 'pointer',
          opacity: value <= min ? 0.3 : 1,
        }}
      >
        −
      </button>
      <span
        style={{
          fontFamily: 'var(--font-serif), Georgia, serif',
          fontSize: '48px',
          color,
          minWidth: '2ch',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '4px',
          border: `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
          background: 'none',
          color,
          fontSize: '18px',
          lineHeight: 1,
          cursor: value >= max ? 'not-allowed' : 'pointer',
          opacity: value >= max ? 0.3 : 1,
        }}
      >
        +
      </button>
    </div>
  );
}
