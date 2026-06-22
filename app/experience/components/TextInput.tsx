'use client';

import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  description?: ReactNode;
  type?: 'text' | 'email';
  inputMode?: 'text' | 'email';
}

/** Shared text field. Single source for the name field and any future text inputs. */
export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  description,
  type = 'text',
  inputMode,
}: Props) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--color-text-muted)',
          marginBottom: '8px',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        style={{
          width: '100%',
          height: '52px',
          padding: '0 16px',
          borderRadius: '10px',
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          backgroundColor: 'var(--color-surface-raised)',
          color: 'var(--color-text)',
          border: '1px solid var(--color-outline)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
        onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-outline-active)'; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-outline)'; }}
      />
      {description && (
        <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '6px', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </div>
  );
}
