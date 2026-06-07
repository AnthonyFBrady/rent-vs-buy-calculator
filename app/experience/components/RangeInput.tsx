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
        <p className="text-xs uppercase tracking-[0.1em] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
        <span className="font-serif text-2xl tabular-nums" style={{ color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
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
        className="w-full"
        style={{
          '--slider-color': color,
          '--slider-fill': `${fillPct}%`,
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
