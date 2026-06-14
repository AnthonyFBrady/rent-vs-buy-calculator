'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepWrapper, TrustSignal } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepMortgageRate({ inputs, patch }: Props) {
  const monthlyPayment = (() => {
    const principal = inputs.homePrice * (1 - inputs.downPaymentPct);
    const r = inputs.mortgageRatePct / 2; // Canadian semi-annual compounding → effective monthly
    const effectiveMonthly = Math.pow(1 + r, 1 / 6) - 1;
    const n = inputs.amortizationYears * 12;
    if (effectiveMonthly === 0) return principal / n;
    return principal * effectiveMonthly / (1 - Math.pow(1 + effectiveMonthly, -n));
  })();

  return (
    <StepWrapper
      heading="Initial mortgage rate."
      description="The rate for your first 5-year term. Drives the monthly payment line on the chart."
    >
      <div className="mt-6">
        <RangeInput
          label="Rate"
          value={inputs.mortgageRatePct * 100}
          min={2}
          max={10}
          step={0.25}
          onChange={(v) => patch({ mortgageRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(2)}%`}
          color="var(--color-owner)"
          minLabel="2%"
          maxLabel="10%"
          description={monthlyPayment > 0
            ? `Monthly payment: $${Math.round(monthlyPayment).toLocaleString('en-CA')} principal + interest.`
            : '5-year fixed rate, first term.'}
        />
        <TrustSignal>
          Rate for your first 5-year term. Renewals use Bank of Canada forward curve defaults.
        </TrustSignal>
      </div>
    </StepWrapper>
  );
}
