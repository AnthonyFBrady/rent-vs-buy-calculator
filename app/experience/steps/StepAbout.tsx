'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepWrapper } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function StepAbout({ inputs, patch }: Props) {
  const incomeK = Math.round((inputs.annualIncome ?? 120_000) / 1_000);

  return (
    <StepWrapper
      heading="Let's start with you."
      description="Income sets your RRSP contribution room."
    >
      <div className="mt-7">
        <RangeInput
          label="Age"
          value={2026 - (inputs.birthYear ?? 1990)}
          min={18}
          max={70}
          step={1}
          onChange={(v) => patch({ birthYear: 2026 - v })}
          formatValue={(v) => `${v}`}
          color="var(--color-renter)"
          minLabel="18"
          maxLabel="70"
          description="Sets your TFSA room and RRSP timing."
        />
      </div>

      <div className="mt-7">
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
          description={`RRSP room = 18% of income, max ${fmt.format(31_560)}/yr. Sets the RRSP contribution cap if you use it later.`}
        />
      </div>
    </StepWrapper>
  );
}
