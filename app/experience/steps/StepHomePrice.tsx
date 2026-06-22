'use client';

import type { CalculatorInputs } from '@/engine';
import { FactorSlider, StepAdvanced } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

export function StepHomePrice({ inputs, patch }: Props) {
  const price = inputs.homePrice;
  const appreciation = inputs.homeAppreciationPct ?? 0.035;

  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <FactorSlider
          factor={FACTORS.homePrice}
          inputs={inputs}
          patch={patch}
          description={price ? fmtCAD.format(price) : undefined}
        />
      </div>

      <StepAdvanced label="Appreciation">
        <FactorSlider
          factor={FACTORS.homeAppreciation}
          inputs={inputs}
          patch={patch}
          description={`Ben Felix baseline: 1% real + 2% inflation = ~3%/yr. You are using ${(appreciation * 100).toFixed(1)}%.`}
        />
      </StepAdvanced>
    </div>
  );
}
