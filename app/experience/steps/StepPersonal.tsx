'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

export function StepPersonal({ inputs, patch }: Props) {
  const age = 2026 - (inputs.birthYear ?? 1990);
  const incomeK = Math.round((inputs.annualIncome ?? 120_000) / 1_000);
  const firstName = inputs.firstName ?? '';

  return (
    <div>
      {/* Name */}
      <div style={{ marginBottom: '28px' }}>
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
          First name
        </label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => patch({ firstName: e.target.value || undefined })}
          placeholder="Optional — personalizes your chart"
          maxLength={32}
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
        <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginTop: '6px', lineHeight: 1.5 }}>
          Shows as "{firstName || 'Your'} wealth outlook" on the chart.
        </p>
      </div>

      {/* Age */}
      <div style={{ marginBottom: '28px' }}>
        <RangeInput
          label="Age"
          value={age}
          min={18}
          max={70}
          step={1}
          onChange={(v) => patch({ birthYear: 2026 - v })}
          formatValue={(v) => `${v}`}
          color="var(--color-renter)"
          minLabel="18"
          maxLabel="70"
          description="Sets your TFSA room and RRSP contribution timing."
        />
      </div>

      {/* Annual income */}
      <RangeInput
        label="Annual income"
        value={incomeK}
        min={40}
        max={300}
        step={5}
        onChange={(v) => patch({ annualIncome: v * 1_000 })}
        formatValue={(v) => `$${v}k`}
        color="var(--color-owner)"
        minLabel="$40k"
        maxLabel="$300k"
        description={`RRSP room = 18% of income, max ${fmtCAD.format(31_560)}/yr.`}
      />
    </div>
  );
}
