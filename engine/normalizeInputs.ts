// Single place that enforces cross-field invariants on CalculatorInputs.
//
// Why this exists: several inputs are not independent. Prior equity is a
// composite of (down payment + closing + extra savings), and the down-payment-
// funded accounts (FHSA, HBP) and owner surplus splits cannot exceed their
// sources. These relationships used to be hand-maintained inside individual step
// onChange handlers, so editing the same field elsewhere (e.g. the result-page
// sidebar) left the dependents stale. simulate() now runs every input set
// through here, so the rules hold no matter which screen made the edit.

import type { CalculatorInputs } from './types';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function clampIfDefined(v: number | undefined, lo: number, hi: number): number | undefined {
  return v === undefined ? undefined : clamp(v, lo, hi);
}

/** Lifetime TFSA room accrued to 2026, $7k/yr from max(birthYear+18, 2009), capped $95k. */
function ownerTfsaRoom(birthYear: number): number {
  const eligibleSince = Math.max(birthYear + 18, 2009);
  return Math.min(95_000, Math.max(0, (2026 - eligibleSince) * 7_000));
}

const FHSA_MAX = 40_000;
const HBP_MAX = 60_000;
const CLOSING_RATE = 0.02; // matches the 2% estimate shown in the down-payment step

/**
 * Return a copy of `inputs` with all cross-field invariants enforced.
 * Idempotent. Preserves `undefined` for optional fields so the engine's `??`
 * fallbacks (e.g. ownerSurplusUsesRRSP without an explicit amount) keep working.
 */
export function normalizeInputs(inputs: CalculatorInputs): CalculatorInputs {
  const next = { ...inputs };

  const downAmount = inputs.homePrice * inputs.downPaymentPct;
  const closing = inputs.homePrice * CLOSING_RATE;

  // Prior equity: derive from the user's "extra savings" intent when present so
  // it tracks home price and down payment. Otherwise respect an explicit value.
  let extraSavings: number;
  if (inputs.ownerExtraSavings !== undefined && inputs.ownerExtraSavings !== null) {
    extraSavings = Math.max(0, inputs.ownerExtraSavings);
    next.ownerPriorEquity = downAmount + closing + extraSavings;
  } else {
    extraSavings = Math.max(0, (inputs.ownerPriorEquity ?? 0) - downAmount - closing);
  }

  // Down-payment-funded accounts cannot exceed the down payment or their caps.
  next.ownerFhsaDown = clampIfDefined(inputs.ownerFhsaDown, 0, Math.min(FHSA_MAX, downAmount));
  next.ownerRrspHbpDown = clampIfDefined(inputs.ownerRrspHbpDown, 0, Math.min(HBP_MAX, downAmount));

  // Owner surplus split cannot exceed the invested extra savings (TFSA also room-capped).
  next.ownerSurplusRrspAmt = clampIfDefined(inputs.ownerSurplusRrspAmt, 0, extraSavings);
  const tfsaCap = Math.max(
    0,
    Math.min(extraSavings - (next.ownerSurplusRrspAmt ?? 0), ownerTfsaRoom(inputs.birthYear ?? 1990)),
  );
  next.ownerSurplusTfsaAmt = clampIfDefined(inputs.ownerSurplusTfsaAmt, 0, tfsaCap);

  return next;
}
