'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepAdvanced } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepMarket({ inputs, patch }: Props) {
  const returnPct  = Math.round(inputs.investmentReturnPct * 100);
  const appreciation = Math.round(inputs.homeAppreciationPct * 100);
  const inflationPct = Math.round((inputs.inflationPct ?? 0.02) * 100);
  const mtr = Math.round(inputs.marginalTaxRatePct * 100);
  const disc = Math.round(inputs.savingsDisciplinePct * 100);

  return (
    <div>
      {/* Investment return */}
      <div style={{ marginBottom: '28px' }}>
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
          description="Nominal annual return on the renter's portfolio. 7% = ~4% real + 3% inflation."
        />
      </div>

      {/* Home appreciation */}
      <RangeInput
        label="Home appreciation"
        value={appreciation}
        min={0}
        max={8}
        step={1}
        onChange={(v) => patch({ homeAppreciationPct: v / 100 })}
        formatValue={(v) => `${v}%`}
        color="var(--color-owner)"
        minLabel="0%"
        maxLabel="8%"
        description="Nominal annual home price growth. 3% is the Canadian long-run average."
      />

      {/* Advanced */}
      <StepAdvanced label="Advanced">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <RangeInput
            label="Inflation"
            value={inflationPct}
            min={1}
            max={5}
            step={0.5}
            onChange={(v) => patch({ inflationPct: v / 100 })}
            formatValue={(v) => `${v}%`}
            color="var(--color-text-muted)"
            minLabel="1%"
            maxLabel="5%"
            description="Bank of Canada target is 2%."
          />
          <RangeInput
            label="Marginal tax rate"
            value={mtr}
            min={20}
            max={55}
            step={1}
            onChange={(v) => patch({ marginalTaxRatePct: v / 100 })}
            formatValue={(v) => `${v}%`}
            color="var(--color-owner)"
            minLabel="20%"
            maxLabel="55%"
            description="Drives RRSP refund size, FHSA benefit, and capital gains treatment."
          />
          <RangeInput
            label="Savings discipline"
            value={disc}
            min={0}
            max={100}
            step={5}
            onChange={(v) => patch({ savingsDisciplinePct: v / 100 })}
            formatValue={(v) => `${v}%`}
            color="var(--color-renter)"
            minLabel="0%"
            maxLabel="100%"
            description="Fraction of the monthly rent-vs-buy gap the renter actually invests."
          />
        </div>
      </StepAdvanced>
    </div>
  );
}
