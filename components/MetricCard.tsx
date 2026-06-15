'use client';

interface Props {
  label: string;
  value: string;
  subvalue?: string;
  accentColor?: string;
}

export function MetricCard({ label, value, subvalue, accentColor }: Props) {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-subtle)',
        border: '1px solid var(--color-outline)',
        borderRadius: '12px',
        padding: '14px 18px',
      }}
    >
      <p
        style={{
          fontSize: '11px',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--color-text-faint)',
          marginBottom: '8px',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 'clamp(16px, 2.2vw, 22px)',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          color: accentColor ?? 'var(--color-text)',
        }}
      >
        {value}
      </p>
      {subvalue && (
        <p
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            marginTop: '6px',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
          }}
        >
          {subvalue}
        </p>
      )}
    </div>
  );
}
