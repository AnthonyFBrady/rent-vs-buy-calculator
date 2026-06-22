'use client';

import type { CalculatorInputs } from '@/engine';
import { fivePercentRule } from '@/engine';
import { FactorSlider, StepAdvanced } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

export function StepRent({ inputs, patch }: Props) {
  const breakEvenRent = Math.round(
    fivePercentRule(inputs.homePrice, inputs.monthlyRent, {
      propertyTaxPct: inputs.propertyTaxPct,
      maintenancePct: inputs.maintenancePct,
    }).monthlyBreakEvenRent,
  );
  const diff = Math.round(inputs.monthlyRent - breakEvenRent);
  const rentCue =
    diff <= 0
      ? `Break-even rent at your price: ${fmtCAD.format(breakEvenRent)}/mo. You're ${fmtCAD.format(Math.abs(diff))} below it — renting leaves more to invest.`
      : `Break-even rent at your price: ${fmtCAD.format(breakEvenRent)}/mo. You're ${fmtCAD.format(diff)} above it — buying starts to look better.`;

  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <FactorSlider
          factor={FACTORS.monthlyRent}
          inputs={inputs}
          patch={patch}
          description={rentCue}
        />
      </div>

      <StepAdvanced label="Advanced">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FactorSlider factor={FACTORS.rentGrowth} inputs={inputs} patch={patch} />
          <FactorSlider factor={FACTORS.renterInsurance} inputs={inputs} patch={patch} />
        </div>
      </StepAdvanced>
    </div>
  );
}
