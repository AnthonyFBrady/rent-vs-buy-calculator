// Canonical owner/renter net-worth trajectory derived from a simulation.
//
// This is the single source of truth for the wealth lines drawn on every chart:
// the live experience preview, the result page, the shared result page, and the
// sensitivity scenarios. Do NOT inline this formula anywhere else. Four separate
// hand-copies previously drifted, so the owner line rendered with shelter terms
// during the questions but without them on the result page.

import type { SimulationResult } from './types';

export interface WealthPoint {
  year: number;
  value: number;
}

export interface WealthSeries {
  ownerData: WealthPoint[];
  renterData: WealthPoint[];
}

/**
 * Owner net worth at year y:
 *   home equity
 *   + invested surplus portfolio (taxable)
 *   + owner surplus RRSP, net of marginal tax
 *   + owner surplus TFSA (tax-free)
 *   + HBP-rebuilt RRSP, net of marginal tax
 *   - cumulative sell/rebuy move costs
 *
 * Property tax and closing costs are captured via the renter's higher starting
 * investment and larger annual invest-the-difference contributions (textbook NPV).
 * They are not deducted here.
 *
 * Renter net worth at year y:
 *   taxable portfolio + RRSP balance
 *
 * Year 0 seeds both lines at their starting investable position so the chart
 * opens from a common baseline.
 */
export function buildWealthSeries(sim: SimulationResult): WealthSeries {
  const { inputs } = sim;
  const marginalRate = inputs.marginalTaxRatePct ?? 0.4;

  let cumMoveCost = 0;
  const ownerData: WealthPoint[] = [
    { year: 0, value: inputs.homePrice * inputs.downPaymentPct },
    ...sim.yearByYear.map((y) => {
      cumMoveCost += y.ownerMoveTransactionCost;
      const rrspNet = y.ownerSurplusRrspBalance * (1 - marginalRate);
      const hbpRrspNet = y.ownerHbpRrspBalance * (1 - marginalRate);
      return {
        year: y.year,
        value:
          y.ownerEquity +
          y.ownerPortfolioEnd +
          rrspNet +
          y.ownerSurplusTfsaBalance +
          hbpRrspNet -
          cumMoveCost,
      };
    }),
  ];

  const renterData: WealthPoint[] = [
    { year: 0, value: sim.yearByYear[0]?.renterPortfolioStart ?? 0 },
    ...sim.yearByYear.map((y) => ({
      year: y.year,
      value: y.renterPortfolioEnd + y.renterRrspBalance,
    })),
  ];

  return { ownerData, renterData };
}
