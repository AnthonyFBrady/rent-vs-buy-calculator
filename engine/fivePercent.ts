// The Ben Felix 5% Rule.
//
// Annual unrecoverable cost of owning = home price × (property tax % + maintenance % + cost of capital %).
// Standard components: 1% property tax + 1% maintenance + 3% cost of capital = 5% total.
// Felix's research suggests real-world maintenance is closer to 1.5-2.5%, so the calculator defaults
// to 1.5% and surfaces a 1-3% sensitivity slider.
//
// Reference: Ben Felix YouTube "Is It Better to Rent or Buy?" / PWL Capital research / Eichholtz et al. (2021).

import type { FivePercentRuleResult } from './types';

export interface FivePercentRuleOptions {
  propertyTaxPct?: number;
  maintenancePct?: number;
  costOfCapitalPct?: number;
}

/** Default cost-of-capital spread: 4% real equity return minus 1% real residential return per Eichholtz et al. */
export const DEFAULT_COST_OF_CAPITAL_PCT = 0.03;
export const DEFAULT_PROPERTY_TAX_PCT = 0.01;
export const DEFAULT_MAINTENANCE_PCT = 0.015; // Felix's higher real-world default

export function fivePercentRule(
  homePrice: number,
  monthlyRent: number,
  options: FivePercentRuleOptions = {},
): FivePercentRuleResult {
  if (homePrice <= 0) throw new Error('homePrice must be positive');
  if (monthlyRent < 0) throw new Error('monthlyRent cannot be negative');

  const propertyTaxPct = options.propertyTaxPct ?? DEFAULT_PROPERTY_TAX_PCT;
  const maintenancePct = options.maintenancePct ?? DEFAULT_MAINTENANCE_PCT;
  const costOfCapitalPct = options.costOfCapitalPct ?? DEFAULT_COST_OF_CAPITAL_PCT;

  const totalUnrecoverablePct = propertyTaxPct + maintenancePct + costOfCapitalPct;
  const annualUnrecoverable = homePrice * totalUnrecoverablePct;
  const monthlyBreakEvenRent = annualUnrecoverable / 12;

  // Threshold: if actual rent < monthly break-even rent, renting is favored.
  const marginPctOfThreshold = monthlyBreakEvenRent === 0
    ? 0
    : (monthlyRent - monthlyBreakEvenRent) / monthlyBreakEvenRent;

  let verdict: FivePercentRuleResult['verdict'];
  if (Math.abs(marginPctOfThreshold) < 0.02) {
    verdict = 'tie'; // within ±2% of threshold = tie
  } else if (monthlyRent < monthlyBreakEvenRent) {
    verdict = 'rent-favored';
  } else {
    verdict = 'buy-favored';
  }

  return {
    components: {
      propertyTaxPct,
      maintenancePct,
      costOfCapitalPct,
    },
    totalUnrecoverablePct,
    annualUnrecoverable,
    monthlyBreakEvenRent,
    verdict,
    marginPctOfThreshold,
  };
}
