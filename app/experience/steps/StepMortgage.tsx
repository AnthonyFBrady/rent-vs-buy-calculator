'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepAdvanced } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

function calcMonthlyPayment(inputs: CalculatorInputs): number {
  const principal = inputs.homePrice * (1 - inputs.downPaymentPct);
  const r = inputs.mortgageRatePct / 2;
  const effectiveMonthly = Math.pow(1 + r, 1 / 6) - 1;
  const n = inputs.amortizationYears * 12;
  if (effectiveMonthly === 0 || n === 0) return 0;
  return principal * effectiveMonthly / (1 - Math.pow(1 + effectiveMonthly, -n));
}

export function StepMortgage({ inputs, patch }: Props) {
  const monthly = calcMonthlyPayment(inputs);
  const totalInterest = monthly * inputs.amortizationYears * 12
    - inputs.homePrice * (1 - inputs.downPaymentPct);

  return (
    <div>
      <RangeInput
        label="Mortgage rate"
        value={inputs.mortgageRatePct * 100}
        min={2}
        max={10}
        step={0.25}
        onChange={(v) => patch({ mortgageRatePct: v / 100 })}
        formatValue={(v) => `${v.toFixed(2)}%`}
        color="var(--color-owner)"
        minLabel="2%"
        maxLabel="10%"
        description={
          monthly > 0
            ? `$${Math.round(monthly).toLocaleString('en-CA')}/mo — $${Math.round(totalInterest / 1_000)}k total interest over ${inputs.amortizationYears} years`
            : 'First 5-year term. Renewals use Bank of Canada forward curve defaults.'
        }
      />

      <StepAdvanced label="Advanced">
        <RangeInput
          label="Amortization"
          value={inputs.amortizationYears}
          min={5}
          max={30}
          step={5}
          onChange={(v) => patch({ amortizationYears: v })}
          formatValue={(v) => `${v} yr`}
          color="var(--color-owner)"
          minLabel="5 yr"
          maxLabel="30 yr"
          description="Longer amortization lowers monthly payments but increases total interest paid."
        />
      </StepAdvanced>
    </div>
  );
}
