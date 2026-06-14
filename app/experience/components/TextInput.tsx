'use client';

import { useId } from 'react';

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
}: Props) {
  const inputId = useId();
  return (
    <div>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 text-xs font-medium block"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </label>
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
          id={inputId}
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          className="w-full tabular"
          style={{
            height: '52px',
            paddingLeft: prefix ? '2rem' : '1rem',
            paddingRight: '1rem',
            borderRadius: '10px',
            fontSize: '24px',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            backgroundColor: 'var(--color-surface-raised)',
            color: 'var(--color-input-text)',
            border: '1px solid var(--color-outline)',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-outline-active)';
            e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }}
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
