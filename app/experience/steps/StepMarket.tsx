'use client';

import type { CalculatorInputs } from '@/engine';
import { FactorSlider, StepAdvanced } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepMarket({ inputs, patch }: Props) {
  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <FactorSlider factor={FACTORS.investmentReturn} inputs={inputs} patch={patch} />
      </div>

      <FactorSlider factor={FACTORS.homeAppreciation} inputs={inputs} patch={patch} />

      <StepAdvanced label="Advanced">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FactorSlider factor={FACTORS.inflation} inputs={inputs} patch={patch} />
          <FactorSlider factor={FACTORS.marginalTax} inputs={inputs} patch={patch} />
          <FactorSlider factor={FACTORS.savingsDiscipline} inputs={inputs} patch={patch} />
        </div>
      </StepAdvanced>
    </div>
  );
}
