'use client';

import type { CalculatorInputs } from '@/engine';
import { suggestPriceAndRent } from '@/engine';
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

  const benchmark = inputs.postalCode
    ? suggestPriceAndRent(inputs.postalCode, inputs.homeType ?? 'condo-apt')
    : null;

  const delta =
    benchmark && benchmark.medianPrice > 0 && price > 0
      ? (price - benchmark.medianPrice) / benchmark.medianPrice
      : null;

  const benchmarkNode =
    benchmark && benchmark.medianPrice > 0 ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-dimmer)', fontWeight: 500 }}>
          Metro median: {fmtCAD.format(benchmark.medianPrice)}
        </span>
        {delta !== null && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: delta > 0.05 ? 'var(--color-owner)' : delta < -0.05 ? 'var(--color-renter)' : 'var(--color-text-muted)',
              background:
                delta > 0.05
                  ? 'rgba(245,158,11,0.10)'
                  : delta < -0.05
                  ? 'rgba(16,185,129,0.10)'
                  : 'rgba(0,0,0,0.05)',
              padding: '2px 7px',
              borderRadius: '999px',
            }}
          >
            {delta > 0 ? '+' : ''}{(delta * 100).toFixed(0)}%
          </span>
        )}
      </div>
    ) : null;

  return (
    <div>
      <div style={{ marginBottom: '8px' }}>
        <FactorSlider
          factor={FACTORS.homePrice}
          inputs={inputs}
          patch={patch}
          benchmark={benchmarkNode}
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
