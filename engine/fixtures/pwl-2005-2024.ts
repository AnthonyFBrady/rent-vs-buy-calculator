// PWL Capital "Renting vs. Owning a Home in Canada 2005-2024" parameters.
//
// Source: Rational Reminder podcast episode 323 (September 2025) + the
// underlying PWL white paper. These are the baseline assumptions PWL used
// for their 20-year empirical analysis.
//
// Key differences from the calculator's default values:
//  - Maintenance: PWL uses 2.5% (the high end of Felix's range). The
//    calculator defaults to 1.5% as a more user-friendly starting point.
//  - Investment fees: PWL baseline 0.25% (low-cost ETF). Sensitivity at 1.76%.
//  - Investment return: 8.19% nominal (30% Canadian / 70% global index).
//  - Savings discipline: 100% in baseline, 90% and 80% in sensitivity runs.

import type { CalculatorInputs } from '../types';

/** Apply PWL 2005-2024 baseline assumptions to an existing inputs set. */
export function withPWLBaseline(inputs: CalculatorInputs): CalculatorInputs {
  return {
    ...inputs,
    downPaymentPct: 0.20,
    amortizationYears: 25,
    maintenancePct: 0.025,
    investmentFeePct: 0.0025,
    investmentReturnPct: 0.0819,
    savingsDisciplinePct: 1.0,
    realtorCommissionPct: 0.06,
    holdingPeriodYears: 20,
  };
}

/** PWL high-fees sensitivity (historical average MER). */
export function withPWLHighFees(inputs: CalculatorInputs): CalculatorInputs {
  return { ...withPWLBaseline(inputs), investmentFeePct: 0.0176 };
}

/** PWL low-savings-discipline sensitivity. */
export function withPWLLowDiscipline(
  inputs: CalculatorInputs,
  disciplinePct = 0.80,
): CalculatorInputs {
  return { ...withPWLBaseline(inputs), savingsDisciplinePct: disciplinePct };
}

/**
 * Outcome claims from PWL 2025 paper (Rational Reminder 323).
 * Used as directional fixtures for the simulation tests.
 */
export const PWL_CITY_OUTCOMES = {
  baseline: {
    ownerWins: ['Toronto', 'Vancouver', 'Calgary', 'Edmonton', 'Waterloo'],
    renterWins: [
      'Montreal',
      'Ottawa',
      'Winnipeg',
      'Quebec City',
      'Hamilton',
      'Kitchener',
      'Victoria',
    ],
    averageRenterAdvantageCAD: 15_000,
  },
  sensitivityOwnersWinning: {
    baseline100pctDiscipline: 5,
    discipline90pct: 7,
    discipline80pct: 10,
    fees1pct76: 10,
    maintenance2pct: 7,
    maintenance3pct: 3,
    amortization15: 3,
    amortization35: 6,
    downPayment50pct: 3,
    downPayment5pct: 5,
  },
} as const;
