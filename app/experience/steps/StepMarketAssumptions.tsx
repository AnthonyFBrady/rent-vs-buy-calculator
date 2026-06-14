'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepWrapper } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepMarketAssumptions({ inputs, patch }: Props) {
  const returnPct = Math.round(inputs.investmentReturnPct * 100);
  const appreciationPct = Math.round(inputs.homeAppreciationPct * 100);

  return (
    <StepWrapper
      heading="Market assumptions."
      description="These move both lines equally. Defaults are long-run Canadian averages."
    >
      <div className="mt-8">
        <RangeInput
          label="Investment return"
          value={returnPct}
          min={3}
          max={12}
          step={1}
          onChange={(v) => patch({ investmentReturnPct: v / 100 })}
          formatValue={(v) => `${v}%`}
          color="var(--color-renter)"
          minLabel="3%"
          maxLabel="12%"
          description="Nominal annual return on the renter's portfolio. 7% = ~4% real + 3% inflation. Ben Felix benchmark: 7–8% for global diversified equities."
        />
      </div>

      <div className="mt-8">
        <RangeInput
          label="Home appreciation"
          value={appreciationPct}
          min={0}
          max={8}
          step={1}
          onChange={(v) => patch({ homeAppreciationPct: v / 100 })}
          formatValue={(v) => `${v}%`}
          color="var(--color-owner)"
          minLabel="0%"
          maxLabel="8%"
          description="Nominal annual home price growth. 3% is the Canadian long-run average. Short-run varies significantly by market."
        />
      </div>
    </StepWrapper>
  );
}
