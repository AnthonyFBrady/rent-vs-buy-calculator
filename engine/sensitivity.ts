// Sensitivity analysis: re-run the simulation with the two highest-leverage
// assumptions perturbed. Yields the upper and lower bands shown on the chart.
//
// Felix's framing: future appreciation and investment return are the two biggest
// drivers of outcomes AND the two most uncertain. Single-parameter bands keep
// the visualization legible while honestly conveying "this is not certain."

import { simulate } from './simulate';
import type { CalculatorInputs, SimulationResult } from './types';

/** Default ±2 percentage-point swing for the sensitivity bands. */
export const DEFAULT_SENSITIVITY_SWING_PCT = 0.02;

export interface SensitivityResult {
  base: SimulationResult;
  /** Owner sensitivity driven by home appreciation. */
  ownerLow: SimulationResult;
  ownerHigh: SimulationResult;
  /** Renter sensitivity driven by investment return. */
  renterLow: SimulationResult;
  renterHigh: SimulationResult;
  swingPct: number;
}

export function simulateSensitivity(
  inputs: CalculatorInputs,
  swingPct: number = DEFAULT_SENSITIVITY_SWING_PCT,
): SensitivityResult {
  const base = simulate(inputs);

  const ownerLow = simulate({
    ...inputs,
    homeAppreciationPct: Math.max(-0.10, inputs.homeAppreciationPct - swingPct),
  });
  const ownerHigh = simulate({
    ...inputs,
    homeAppreciationPct: inputs.homeAppreciationPct + swingPct,
  });

  const renterLow = simulate({
    ...inputs,
    investmentReturnPct: Math.max(0, inputs.investmentReturnPct - swingPct),
  });
  const renterHigh = simulate({
    ...inputs,
    investmentReturnPct: inputs.investmentReturnPct + swingPct,
  });

  return { base, ownerLow, ownerHigh, renterLow, renterHigh, swingPct };
}
