'use client';

interface Props {
  value: string | number;
  onChange: (v: string) => void;
  label?: string;
  prefix?: string;
  placeholder?: string;
  description?: React.ReactNode;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
  step?: number;
  focusColor?: string;
}

export function TextInput({
  value,
  onChange,
  label,
  prefix,
  placeholder,
  description,
  type = 'text',
  min,
  max,
  step,
  focusColor = 'var(--color-owner)',
}: Props) {
  return (
    <div>
      {label && (
        <p className="mb-2 text-xs uppercase tracking-[0.1em] font-medium" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
      )}
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="w-full rounded-sm py-3.5 text-sm"
          style={{
            paddingLeft: prefix ? '2rem' : '1rem',
            paddingRight: '1rem',
            backgroundColor: 'var(--color-input-bg)',
            color: 'var(--color-input-text)',
            border: '1px solid var(--color-outline)',
            outline: 'none',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = focusColor; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-outline)'; }}
        />
      </div>
      {description && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          {description}
        </p>
      )}
    </div>
  );
}
