'use client';

import type { CalculatorInputs } from '@/engine';
import { TextInput, StepWrapper } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function StepHomePrice({ inputs, patch }: Props) {
  const loanAmount = inputs.homePrice * (1 - inputs.downPaymentPct);
  const yr1Interest = loanAmount * inputs.mortgageRatePct;
  const yr1Tax = inputs.propertyTaxPct * inputs.homePrice;
  const yr1Maintenance = (inputs.maintenancePct ?? 0.015) * inputs.homePrice;
  const yr1Insurance = (inputs.homeInsuranceMonthly ?? 150) * 12;
  const yr1Strata = (inputs.monthlyStrataFee ?? 0) * 12;
  const yr1Unrecoverable = yr1Interest + yr1Tax + yr1Maintenance + yr1Insurance + yr1Strata;
  const unrecoverablePct = inputs.homePrice > 0
    ? ((yr1Unrecoverable / inputs.homePrice) * 100).toFixed(1)
    : '0.0';

  return (
    <StepWrapper
      heading="What home are you considering?"
      description="This sets the year-0 drop on the chart — down payment plus closing costs."
    >
      <div className="mt-6">
        <TextInput
          label="Home price"
          value={inputs.homePrice}
          onChange={(v) => patch({ homePrice: parseFloat(v) || inputs.homePrice })}
          prefix="$"
          type="number"
          min={100000}
          max={5000000}
          step={25000}
        />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          ~{unrecoverablePct}% per year builds no equity ({fmt.format(Math.round(yr1Unrecoverable))}/yr in interest, tax, maintenance, and insurance{yr1Strata > 0 ? ', strata' : ''}).
        </p>
        <p className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--color-text-faint)' }}>
          The renter is assumed to invest your down payment and closing costs from day 1, then invest whatever they save each year versus your housing costs. Rent amount and other assumptions use provincial defaults — you will set them next.
        </p>
      </div>
    </StepWrapper>
  );
}
