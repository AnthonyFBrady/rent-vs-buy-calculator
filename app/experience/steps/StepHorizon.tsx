'use client';

import type { CalculatorInputs } from '@/engine';
import { FactorSlider } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepHorizon({ inputs, patch }: Props) {
  const years = inputs.holdingPeriodYears ?? 10;

  return (
    <div>
      <FactorSlider
        factor={FACTORS.timeHorizon}
        inputs={inputs}
        patch={patch}
        description={`At ${years} ${years === 1 ? 'year' : 'years'}, transaction costs and mortgage interest are ${years < 5 ? 'still eating into your equity' : years < 10 ? 'starting to amortize' : 'well amortized'}. Drag left to see why short horizons almost always favour renting.`}
      />
    </div>
  );
}
