'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, TextInput } from '../components';

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
        <TextInput
          label="First name"
          value={firstName}
          onChange={(v) => patch({ firstName: v || undefined })}
          placeholder="Optional — personalizes your chart"
          maxLength={32}
          description={`Shows as "${firstName || 'Your'} wealth outlook" on the chart.`}
        />
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
