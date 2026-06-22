'use client';

import type { CalculatorInputs } from '@/engine';
import type { FactorDef } from '../config/factors';
import { accentColor } from '../config/factors';
import { RangeInput } from './RangeInput';

interface Props {
  factor: FactorDef;
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  /** Override the registry description for a specific placement. */
  description?: string;
  /** Suppress helper copy entirely (used in the compact result sidebar). */
  hideDescription?: boolean;
}

/**
 * Renders a RangeInput from a single FactorDef so the step flow and the result
 * sidebar always share one definition (range, step, format, accent, copy).
 * Do not hand-roll a RangeInput for a registered factor — extend the registry.
 */
export function FactorSlider({ factor, inputs, patch, description, hideDescription }: Props) {
  const desc = hideDescription
    ? undefined
    : description ?? (typeof factor.description === 'function' ? factor.description(inputs) : factor.description);

  return (
    <RangeInput
      label={factor.label}
      value={factor.get(inputs)}
      min={factor.min}
      max={factor.max}
      step={factor.step}
      onChange={(v) => patch(factor.set(v))}
      formatValue={factor.format}
      color={accentColor(factor.accent)}
      minLabel={factor.minLabel}
      maxLabel={factor.maxLabel}
      description={desc}
    />
  );
}
