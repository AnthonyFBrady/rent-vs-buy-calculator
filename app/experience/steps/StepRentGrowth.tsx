'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, StepWrapper } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepRentGrowth({ inputs, patch }: Props) {
  const escalPct = (inputs.rentEscalationPct * 100).toFixed(1);
  const hasRentControl = inputs.rentControlCapPct != null && inputs.rentControlCapPct > 0;
  const capPct = inputs.rentControlCapPct != null ? (inputs.rentControlCapPct * 100).toFixed(1) : null;

  const tenYearGap =
    hasRentControl && inputs.rentControlCapPct != null
      ? Math.round(
          (Math.pow(1 + inputs.rentEscalationPct, 10) /
            Math.pow(1 + inputs.rentControlCapPct, 10) - 1) * 100,
        )
      : null;

  return (
    <StepWrapper
      heading="How fast does rent grow?"
      description={hasRentControl
        ? `Market rate rises at the speed below. Your in-place rent is capped at ${capPct}%/yr.`
        : `How fast asking rents grow. You track this rate — no cap in ${inputs.province}.`}
    >
      <div className="mt-6">
        <RangeInput
          label="Market rent growth"
          value={inputs.rentEscalationPct * 100}
          min={0}
          max={8}
          step={0.25}
          onChange={(v) => patch({ rentEscalationPct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-renter)"
          minLabel="0%"
          maxLabel="8%"
        />
      </div>

      {hasRentControl && tenYearGap !== null && tenYearGap > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Stay-longer benefit: ~{tenYearGap}% below asking after 10 years. Moving permanently resets this.
        </p>
      )}
      {!hasRentControl && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          No rent control in {inputs.province}. Staying put gives no discount.
        </p>
      )}
    </StepWrapper>
  );
}
