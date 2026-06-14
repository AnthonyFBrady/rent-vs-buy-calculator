'use client';

import type { CalculatorInputs } from '@/engine';
import { StepWrapper } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepTimeHorizon({ inputs, patch }: Props) {
  const years = inputs.holdingPeriodYears;

  return (
    <StepWrapper heading="How long are you thinking about?">
      <div className="mt-4 flex items-baseline gap-3">
        <span className="font-sans text-6xl tabular font-semibold" style={{ letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>{years}</span>
        <span className="text-lg text-muted">years</span>
      </div>

      <div className="mt-6">
        <input
          type="range"
          min={5}
          max={40}
          step={1}
          value={years}
          onChange={(e) => patch({ holdingPeriodYears: parseInt(e.target.value, 10) })}
          className="w-full"
          style={{ accentColor: 'var(--color-owner)' }}
        />
        <div className="mt-2 flex justify-between text-xs text-muted" style={{ opacity: 0.6 }}>
          <span>5 years</span>
          <span>40 years</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted">
        {years <= 7
          ? 'Short horizon. Transaction friction dominates — buying is very hard to justify at these timescales.'
          : years <= 15
          ? 'Medium horizon. The crossover year matters a lot. Move frequency becomes critical.'
          : 'Long horizon. Post-payoff investing eventually tilts toward the owner.'}
      </p>

    </StepWrapper>
  );
}
