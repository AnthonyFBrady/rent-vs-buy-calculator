'use client';

import type { CalculatorInputs } from '@/engine';
import { FactorSlider, StepAdvanced } from '../components';
import { FACTORS } from '../config/factors';

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

  const rateDescription = monthly > 0
    ? `$${Math.round(monthly).toLocaleString('en-CA')}/mo — $${Math.round(totalInterest / 1_000)}k total interest over ${inputs.amortizationYears} years`
    : 'First 5-year term. Renewals use Bank of Canada forward curve defaults.';

  return (
    <div>
      <FactorSlider factor={FACTORS.mortgageRate} inputs={inputs} patch={patch} description={rateDescription} />

      <StepAdvanced label="Advanced">
        <FactorSlider
          factor={FACTORS.amortization}
          inputs={inputs}
          patch={patch}
          description="Longer amortization lowers monthly payments but increases total interest paid."
        />
      </StepAdvanced>
    </div>
  );
}
