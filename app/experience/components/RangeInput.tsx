'use client';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
  color?: string;
  minLabel?: string;
  maxLabel?: string;
  description?: React.ReactNode;
}

export function RangeInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  color = 'var(--color-owner)',
  minLabel,
  maxLabel,
  description,
}: Props) {
  const display = formatValue ? formatValue(value) : String(value);
  const fillPct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
        <span
          className="tabular"
          style={{
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: 'clamp(22px, 6vw, 28px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            color: 'var(--color-text)',
          }}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onFocus={(e) => { e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' }); }}
        className="w-full"
        style={{
          '--slider-color': color,
          '--slider-fill': `${fillPct}%`,
          height: '4px',
        } as React.CSSProperties}
      />
      {(minLabel || maxLabel) && (
        <div className="mt-1 flex justify-between text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
          {minLabel && <span>{minLabel}</span>}
          {maxLabel && <span>{maxLabel}</span>}
        </div>
      )}
      {description && (
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
