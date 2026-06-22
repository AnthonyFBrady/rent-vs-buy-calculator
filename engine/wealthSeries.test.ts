import { describe, it, expect } from 'vitest';
import { simulate, defaultInputsFor, buildWealthSeries } from './index';

describe('buildWealthSeries', () => {
  it('returns one point per year plus a year-0 seed', () => {
    const inputs = defaultInputsFor('ON');
    const sim = simulate(inputs);
    const { ownerData, renterData } = buildWealthSeries(sim);
    expect(ownerData).toHaveLength(sim.yearByYear.length + 1);
    expect(renterData).toHaveLength(sim.yearByYear.length + 1);
    expect(ownerData[0]!.year).toBe(0);
    expect(renterData[0]!.year).toBe(0);
  });

  it('owner final value carries every shelter term (regression lock for the dropped-formula bug)', () => {
    // Scenario that forces non-zero HBP RRSP and surplus TFSA balances, the
    // exact terms the old reduced formula silently dropped on the result page.
    const inputs = {
      ...defaultInputsFor('ON'),
      ownerPriorEquity: 300_000,
      ownerSurplusTfsaAmt: 60_000,
      ownerRrspHbpDown: 40_000,
    };
    const sim = simulate(inputs);
    const last = sim.yearByYear.at(-1)!;

    // Guard: the scenario actually exercises the shelter path.
    expect(last.ownerHbpRrspBalance).toBeGreaterThan(0);
    expect(last.ownerSurplusTfsaBalance).toBeGreaterThan(0);

    const mr = inputs.marginalTaxRatePct ?? 0.4;
    const cumMove = sim.yearByYear.reduce((s, y) => s + y.ownerMoveTransactionCost, 0);
    const expected =
      last.ownerEquity +
      last.ownerPortfolioEnd +
      last.ownerSurplusRrspBalance * (1 - mr) +
      last.ownerSurplusTfsaBalance +
      last.ownerHbpRrspBalance * (1 - mr) -
      cumMove;

    expect(buildWealthSeries(sim).ownerData.at(-1)!.value).toBeCloseTo(expected, 2);
  });

  it('renter line equals taxable portfolio plus RRSP balance each year', () => {
    const inputs = defaultInputsFor('ON');
    const sim = simulate({ ...inputs, renterUsesRRSP: true });
    const { renterData } = buildWealthSeries(sim);
    sim.yearByYear.forEach((y, i) => {
      expect(renterData[i + 1]!.value).toBeCloseTo(
        y.renterPortfolioEnd + y.renterRrspBalance,
        2,
      );
    });
  });
});
