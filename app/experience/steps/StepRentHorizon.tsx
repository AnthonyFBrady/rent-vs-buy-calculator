'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepAdvanced } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

export function StepRentHorizon({ inputs, patch }: Props) {
  const annualRent = inputs.monthlyRent * 12;
  const rentGrowthPct = Math.round((inputs.rentEscalationPct ?? 0.05) * 100 * 10) / 10;

  return (
    <div>
      {/* Monthly rent */}
      <div style={{ marginBottom: '28px' }}>
        <RangeInput
          label="Monthly rent"
          value={Math.round(inputs.monthlyRent / 100) * 100}
          min={500}
          max={8000}
          step={100}
          onChange={(v) => patch({ monthlyRent: v })}
          formatValue={(v) => `$${v.toLocaleString('en-CA')}/mo`}
          color="var(--color-renter)"
          minLabel="$500"
          maxLabel="$8k"
          description={`${fmtCAD.format(annualRent)}/yr — this is what renting costs instead of buying`}
        />
      </div>

      {/* Holding period */}
      <RangeInput
        label="Years you plan to stay"
        value={inputs.holdingPeriodYears}
        min={1}
        max={30}
        step={1}
        onChange={(v) => patch({ holdingPeriodYears: v })}
        formatValue={(v) => `${v} yr`}
        color="var(--color-renter)"
        minLabel="1 yr"
        maxLabel="30 yr"
        description="The chart ends here. Shorter horizons almost always favour renting."
      />

      {/* Advanced */}
      <StepAdvanced label="Advanced">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RangeInput
            label="Annual rent growth"
            value={rentGrowthPct}
            min={0}
            max={10}
            step={0.5}
            onChange={(v) => patch({ rentEscalationPct: v / 100 })}
            formatValue={(v) => `${v.toFixed(1)}%`}
            color="var(--color-renter)"
            minLabel="0%"
            maxLabel="10%"
            description="CMHC asking-rent growth averaged ~5%/yr in major cities 2019–2024."
          />
          <RangeInput
            label="Renter's insurance"
            value={inputs.rentInsuranceMonthly ?? 25}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch({ rentInsuranceMonthly: v })}
            formatValue={(v) => `$${v}/mo`}
            color="var(--color-renter)"
            minLabel="$0"
            maxLabel="$100"
          />
        </div>
      </StepAdvanced>
    </div>
  );
}
