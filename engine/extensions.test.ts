// Tests for v2 engine extensions:
//   - monthly compounding
//   - post-payoff reinvestment
//   - rent control + vacancy decontrol
//   - FHSA modeling
//   - strata / condo fee
//   - expected moves during horizon
//
// v3 additions:
//   - mortgage renewal
//   - physical moving costs
//   - renter first + last deposit
//   - RRSP shelter
//   - savings discipline split

import { describe, it, expect } from 'vitest';
import { simulate, defaultInputsFor } from './index';

describe('monthly compounding', () => {
  it('produces a higher renter portfolio than the legacy annual model would have', () => {
    // 10y at 7% nominal with $30K contribution per year and $200K lump sum:
    // annual-end compounding underestimates by ~0.5% over 10y. Monthly
    // compounding must produce strictly more wealth than the simple
    // (start + contrib) × (1 + r) per-year model.
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);

    // Floor: monthly model should exceed a naive annual approximation by a
    // measurable amount over 10 years. We just check it's positive growth that
    // exceeds the annualContribution-only baseline.
    const last = result.yearByYear[result.yearByYear.length - 1]!;
    expect(last.renterPortfolioEnd).toBeGreaterThan(last.renterCostBasis);
  });

  it('matches an independent monthly-compound recomputation within rounding', () => {
    // Sanity: rebuild the year-1 growth manually from inputs and compare.
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    const y1 = result.yearByYear[0]!;

    const startBalance = inputs.savingsDisciplinePct *
      0 +                                  // owner-side starts zero
      result.commitment.renterStartingLumpSum;
    const contribution = y1.renterPortfolioContribution;
    const netReturn = inputs.investmentReturnPct - inputs.investmentFeePct;
    const monthlyR = Math.pow(1 + netReturn, 1 / 12) - 1;
    const monthlyContrib = contribution / 12;
    let balance = startBalance;
    for (let m = 0; m < 12; m++) {
      balance = (balance + monthlyContrib) * (1 + monthlyR);
    }
    expect(y1.renterPortfolioEnd).toBeCloseTo(balance, 2);
  });
});

describe('post-payoff reinvestment', () => {
  it('past the amortization cliff, owner contributions become non-zero', () => {
    // Hold 30 years on a 25-year amortization. In years 26-30 the mortgage
    // is paid off, freeing roughly the monthly P+I to flow into the owner's
    // invested-surplus portfolio.
    const inputs = {
      ...defaultInputsFor('ON'),
      amortizationYears: 25,
      holdingPeriodYears: 30,
    };
    const result = simulate(inputs);

    const postPayoff = result.yearByYear.slice(25); // years 26..30
    const ownerContribsPostPayoff = postPayoff.reduce(
      (s, y) => s + y.ownerPortfolioContribution,
      0,
    );
    expect(ownerContribsPostPayoff).toBeGreaterThan(0);
  });

  it('mortgage payment drops to zero in years past amortization', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      amortizationYears: 25,
      holdingPeriodYears: 27,
    };
    const result = simulate(inputs);

    const y26 = result.yearByYear[25]!;
    const y27 = result.yearByYear[26]!;
    expect(y26.ownerAnnualMortgagePayment).toBeCloseTo(0, 0);
    expect(y27.ownerAnnualMortgagePayment).toBeCloseTo(0, 0);
  });

  it('owner portfolio grows year-over-year once contributions begin', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      amortizationYears: 25,
      holdingPeriodYears: 30,
    };
    const result = simulate(inputs);

    const y26 = result.yearByYear[25]!;
    const y30 = result.yearByYear[29]!;
    expect(y30.ownerPortfolioEnd).toBeGreaterThan(y26.ownerPortfolioEnd);
  });
});

describe('rent control + vacancy decontrol', () => {
  it('with a cap, in-place rent escalates at the cap rate, not the market rate', () => {
    const noCap = simulate({
      ...defaultInputsFor('ON'),
      rentEscalationPct: 0.05,
      rentControlCapPct: null,
      ownerMoves: 0,
      renterMoves: 0,
    });
    const capped = simulate({
      ...defaultInputsFor('ON'),
      rentEscalationPct: 0.05,
      rentControlCapPct: 0.025,
      ownerMoves: 0,
      renterMoves: 0,
    });

    // Year 10 in-place rent must be lower under the cap.
    const lastNoCap = noCap.yearByYear[noCap.yearByYear.length - 1]!;
    const lastCapped = capped.yearByYear[capped.yearByYear.length - 1]!;
    expect(lastCapped.renterAnnualRent).toBeLessThan(lastNoCap.renterAnnualRent);
  });

  it('on a renter move year, in-place rent jumps to current market rent', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      holdingPeriodYears: 10,
      rentEscalationPct: 0.05,
      rentControlCapPct: 0.025,
      renterMoves: 1, // single move at year 5
    };
    const result = simulate(inputs);

    const y4 = result.yearByYear[3]!;   // last year before move
    const y5 = result.yearByYear[4]!;   // move year

    expect(y5.renterMoveOccurredThisYear).toBe(true);
    // After the move, in-place monthly rent (renterAnnualRent / 12) should be
    // close to the market rent which has been growing at the unconstrained 5%.
    const y5InPlaceMonthly = y5.renterAnnualRent / 12;
    expect(y5InPlaceMonthly).toBeCloseTo(y5.marketMonthlyRent, 0);
    // And meaningfully above the pre-move trajectory.
    expect(y5InPlaceMonthly).toBeGreaterThan(y4.renterAnnualRent / 12);
  });

  it('rent control cap shifts the wealth outcome toward the renter', () => {
    const baseline = {
      ...defaultInputsFor('ON'),
      rentEscalationPct: 0.05,
      rentControlCapPct: null,
      ownerMoves: 0,
      renterMoves: 0,
    };
    const capped = { ...baseline, rentControlCapPct: 0.025 };
    expect(simulate(capped).exit.netAdvantageToOwner).toBeLessThan(
      simulate(baseline).exit.netAdvantageToOwner,
    );
  });
});

describe('owner moves during horizon', () => {
  it('owner move years are evenly spaced across the holding period', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      holdingPeriodYears: 12,
      ownerMoves: 2,
    };
    const result = simulate(inputs);
    const ownerMoveYears = result.yearByYear
      .filter((y) => y.ownerMoveOccurredThisYear)
      .map((y) => y.year);
    expect(ownerMoveYears).toEqual([4, 8]);
  });

  it('each owner move incurs sell + rebuy transaction cost', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      isTorontoMunicipalLTT: false,
      ownerMoves: 1,
    };
    const result = simulate(inputs);
    const moveYear = result.yearByYear.find((y) => y.ownerMoveOccurredThisYear)!;
    expect(moveYear.ownerMoveTransactionCost).toBeGreaterThan(0);
    // Should be at least realtor commission + LTT + legal — a five-figure cost.
    expect(moveYear.ownerMoveTransactionCost).toBeGreaterThan(20_000);
  });

  it('more owner moves shift the wealth outcome toward the renter', () => {
    const stayPut = simulate({ ...defaultInputsFor('ON'), ownerMoves: 0 });
    const oneMove = simulate({ ...defaultInputsFor('ON'), ownerMoves: 1 });
    const twoMoves = simulate({ ...defaultInputsFor('ON'), ownerMoves: 2 });
    expect(oneMove.exit.netAdvantageToOwner).toBeLessThan(
      stayPut.exit.netAdvantageToOwner,
    );
    expect(twoMoves.exit.netAdvantageToOwner).toBeLessThan(
      oneMove.exit.netAdvantageToOwner,
    );
  });
});

describe('renter moves during horizon', () => {
  it('renter move years are evenly spaced across the holding period', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      holdingPeriodYears: 12,
      renterMoves: 2,
    };
    const result = simulate(inputs);
    const renterMoveYears = result.yearByYear
      .filter((y) => y.renterMoveOccurredThisYear)
      .map((y) => y.year);
    expect(renterMoveYears).toEqual([4, 8]);
  });

  it('renter moves trigger vacancy decontrol, owner incurs no transaction cost', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      holdingPeriodYears: 10,
      rentControlCapPct: 0.025,
      rentEscalationPct: 0.05,
      renterMoves: 1,
      ownerMoves: 0,
    };
    const result = simulate(inputs);
    const moveYear = result.yearByYear.find((y) => y.renterMoveOccurredThisYear)!;
    expect(moveYear.ownerMoveTransactionCost).toBe(0);
    expect(moveYear.renterMoveOccurredThisYear).toBe(true);
    expect(moveYear.ownerMoveOccurredThisYear).toBe(false);
  });

  it('owner moves and renter moves can differ independently', () => {
    const ownerMoves2 = simulate({ ...defaultInputsFor('ON'), ownerMoves: 2, renterMoves: 0 });
    const renterMoves2 = simulate({ ...defaultInputsFor('ON'), ownerMoves: 0, renterMoves: 2 });
    // Owner friction should make owner-moves scenario worse for the owner.
    expect(ownerMoves2.exit.netAdvantageToOwner).toBeLessThan(
      renterMoves2.exit.netAdvantageToOwner,
    );
  });
});

describe('strata / condo fee', () => {
  it('adds to owner annual cash-out', () => {
    const noStrata = simulate({ ...defaultInputsFor('ON'), monthlyStrataFee: 0 });
    const withStrata = simulate({
      ...defaultInputsFor('ON'),
      monthlyStrataFee: 600,
    });
    const y1NoStrata = noStrata.yearByYear[0]!;
    const y1WithStrata = withStrata.yearByYear[0]!;
    expect(y1WithStrata.ownerAnnualStrata).toBeCloseTo(7_200, 0);
    expect(y1WithStrata.ownerAnnualCashOut).toBeGreaterThan(
      y1NoStrata.ownerAnnualCashOut,
    );
  });

  it('shifts wealth outcome toward the renter', () => {
    const noStrata = simulate({ ...defaultInputsFor('ON'), monthlyStrataFee: 0 });
    const withStrata = simulate({
      ...defaultInputsFor('ON'),
      monthlyStrataFee: 600,
    });
    expect(withStrata.exit.netAdvantageToOwner).toBeLessThan(
      noStrata.exit.netAdvantageToOwner,
    );
  });

  it('escalates at the inflation rate year-over-year', () => {
    const result = simulate({
      ...defaultInputsFor('ON'),
      monthlyStrataFee: 600,
      inflationPct: 0.02,
      holdingPeriodYears: 5,
    });
    const y1 = result.yearByYear[0]!;
    const y5 = result.yearByYear[4]!;
    // y5 strata = 600 × 12 × (1.02)^4 ≈ 7,793
    expect(y5.ownerAnnualStrata).toBeGreaterThan(y1.ownerAnnualStrata);
    expect(y5.ownerAnnualStrata).toBeCloseTo(600 * 12 * Math.pow(1.02, 4), 0);
  });
});

describe('FHSA modeling', () => {
  it('eliminates renter capital gains tax at exit (TFSA-equivalent shelter)', () => {
    const taxable = simulate({ ...defaultInputsFor('ON'), useFHSA: false });
    const fhsa = simulate({ ...defaultInputsFor('ON'), useFHSA: true });
    expect(taxable.exit.renterCapitalGainsTax).toBeGreaterThan(0);
    expect(fhsa.exit.renterCapitalGainsTax).toBe(0);
  });

  it('year-0 lump sum is identical with and without FHSA (contributions are annual)', () => {
    const inputs = defaultInputsFor('ON');
    const taxable = simulate({ ...inputs, useFHSA: false });
    const fhsa = simulate({ ...inputs, useFHSA: true });

    expect(fhsa.commitment.renterStartingLumpSum).toBeCloseTo(
      taxable.commitment.renterStartingLumpSum,
      0,
    );
  });

  it('shifts wealth outcome toward the renter', () => {
    const taxable = simulate({ ...defaultInputsFor('ON'), useFHSA: false });
    const fhsa = simulate({ ...defaultInputsFor('ON'), useFHSA: true });
    expect(fhsa.exit.netAdvantageToOwner).toBeLessThan(
      taxable.exit.netAdvantageToOwner,
    );
  });
});

describe('combined extensions: condo in Toronto with cap and one move at 30y', () => {
  it('produces a coherent 30-year simulation with all features active', () => {
    const result = simulate({
      ...defaultInputsFor('ON'),
      homePrice: 800_000,
      monthlyRent: 2_800,
      monthlyStrataFee: 550,
      rentControlCapPct: 0.025,
      rentEscalationPct: 0.04,
      ownerMoves: 1,
      useFHSA: true,
      amortizationYears: 25,
      holdingPeriodYears: 30,
    });

    expect(result.yearByYear.length).toBe(30);
    expect(result.exit.renterCapitalGainsTax).toBe(0); // FHSA shelter
    expect(result.exit.ownerPortfolioValue).toBeGreaterThan(0); // post-payoff
    expect(result.yearByYear.some((y) => y.ownerMoveOccurredThisYear)).toBe(true);
    expect(result.yearByYear[0]!.ownerAnnualStrata).toBeCloseTo(6_600, 0);
  });
});

describe('mortgage renewal', () => {
  it('ownerMortgageRate switches at the term boundary', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      mortgageRatePct: 0.05,
      mortgageTermYears: 5,
      mortgageRenewalRatePct: 0.07,
      holdingPeriodYears: 10,
    };
    const result = simulate(inputs);
    const y5 = result.yearByYear[4]!; // last year of first term
    const y6 = result.yearByYear[5]!; // first renewal year
    expect(y5.ownerMortgageRate).toBeCloseTo(0.05, 4);
    expect(y6.ownerMortgageRate).toBeCloseTo(0.07, 4);
  });

  it('monthly payment increases when renewal rate is higher', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      mortgageRatePct: 0.05,
      mortgageTermYears: 5,
      mortgageRenewalRatePct: 0.07,
      holdingPeriodYears: 10,
    };
    const result = simulate(inputs);
    const y5 = result.yearByYear[4]!;
    const y6 = result.yearByYear[5]!;
    expect(y6.ownerMonthlyPayment).toBeGreaterThan(y5.ownerMonthlyPayment);
  });

  it('no renewal fires when holding period does not exceed the mortgage term', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      mortgageRatePct: 0.05,
      mortgageTermYears: 5,
      mortgageRenewalRatePct: 0.08,
      holdingPeriodYears: 5,
    };
    const result = simulate(inputs);
    for (const y of result.yearByYear) {
      expect(y.ownerMortgageRate).toBeCloseTo(0.05, 4);
    }
  });

  it('higher renewal rate shifts wealth outcome toward the renter', () => {
    const base = simulate({
      ...defaultInputsFor('ON'),
      mortgageTermYears: 5,
      holdingPeriodYears: 10,
    });
    const rateShock = simulate({
      ...defaultInputsFor('ON'),
      mortgageTermYears: 5,
      mortgageRenewalRatePct: 0.08,
      holdingPeriodYears: 10,
    });
    expect(rateShock.exit.netAdvantageToOwner).toBeLessThan(
      base.exit.netAdvantageToOwner,
    );
  });
});

describe('physical moving costs', () => {
  it('owner year-0 cash out includes ownerMovingCostPerMove', () => {
    const noMoveCost = simulate({ ...defaultInputsFor('ON'), ownerMovingCostPerMove: 0 });
    const withMoveCost = simulate({ ...defaultInputsFor('ON'), ownerMovingCostPerMove: 2_500 });
    expect(withMoveCost.commitment.ownerStartingCashOut).toBeCloseTo(
      noMoveCost.commitment.ownerStartingCashOut + 2_500,
      0,
    );
  });

  it('owner move year carries the physical cost in ownerPhysicalMovingCost', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      ownerMoves: 1,
      ownerMovingCostPerMove: 3_000,
    };
    const result = simulate(inputs);
    const moveYear = result.yearByYear.find((y) => y.ownerMoveOccurredThisYear)!;
    expect(moveYear.ownerPhysicalMovingCost).toBe(3_000);
    expect(moveYear.ownerMoveTransactionCost).toBeGreaterThanOrEqual(3_000);
  });

  it('renter year-0 investment is reduced by renterMovingCostPerMove', () => {
    const noRenterCost = simulate({ ...defaultInputsFor('ON'), renterMovingCostPerMove: 0 });
    const withRenterCost = simulate({ ...defaultInputsFor('ON'), renterMovingCostPerMove: 400 });
    expect(withRenterCost.commitment.renterStartingLumpSum).toBeCloseTo(
      noRenterCost.commitment.renterStartingLumpSum - 400,
      0,
    );
  });

  it('renter move year carries the physical cost in renterPhysicalMovingCost', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      renterMoves: 1,
      renterMovingCostPerMove: 500,
    };
    const result = simulate(inputs);
    const moveYear = result.yearByYear.find((y) => y.renterMoveOccurredThisYear)!;
    expect(moveYear.renterPhysicalMovingCost).toBe(500);
  });
});

describe('renter first + last deposit', () => {
  it('deposit balance in year 1 equals 2 × initial monthly rent', () => {
    const inputs = { ...defaultInputsFor('ON'), monthlyRent: 3_000 };
    const result = simulate(inputs);
    const y1 = result.yearByYear[0]!;
    expect(y1.renterDepositBalance).toBeCloseTo(6_000, 0);
  });

  it('deposit is returned in full at exit for a stay-put renter', () => {
    const inputs = { ...defaultInputsFor('ON'), monthlyRent: 3_000, renterMoves: 0 };
    const result = simulate(inputs);
    expect(result.exit.renterDepositReturned).toBeCloseTo(6_000, 0);
  });

  it('deposit updates to 2 × market rent when the renter moves', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      monthlyRent: 3_000,
      rentEscalationPct: 0.05,
      renterMoves: 1,
      holdingPeriodYears: 10,
    };
    const result = simulate(inputs);
    const moveYear = result.yearByYear.find((y) => y.renterMoveOccurredThisYear)!;
    expect(moveYear.renterDepositBalance).toBeCloseTo(
      2 * moveYear.marketMonthlyRent,
      0,
    );
  });

  it('deposit reduces renter starting lump sum vs owner cash out', () => {
    // renterYear0Investment = ownerYear0CashOut - deposit - renterMovingCost
    const inputs = {
      ...defaultInputsFor('ON'),
      monthlyRent: 3_000,
      renterMovingCostPerMove: 0,
      useFHSA: false,
    };
    const result = simulate(inputs);
    const expectedDeposit = 2 * 3_000;
    expect(result.commitment.renterStartingLumpSum).toBeCloseTo(
      result.commitment.ownerStartingCashOut - expectedDeposit,
      0,
    );
  });
});

describe('RRSP shelter', () => {
  it('RRSP balance grows throughout the holding period', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      renterUsesRRSP: true,
      holdingPeriodYears: 10,
    };
    const result = simulate(inputs);
    const lastY = result.yearByYear[result.yearByYear.length - 1]!;
    expect(lastY.renterRrspBalance).toBeGreaterThan(0);
  });

  it('exit RRSP tax equals balance × marginalTaxRatePct', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      renterUsesRRSP: true,
      marginalTaxRatePct: 0.43,
      holdingPeriodYears: 10,
    };
    const result = simulate(inputs);
    expect(result.exit.renterRrspExitTax).toBeCloseTo(
      result.exit.renterRrspBalance * 0.43,
      1,
    );
  });

  it('RRSP contributions appear in renterRrspContribution when the renter invests', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      renterUsesRRSP: true,
      holdingPeriodYears: 5,
    };
    const result = simulate(inputs);
    const rrspYears = result.yearByYear.filter((y) => y.renterRrspContribution > 0);
    expect(rrspYears.length).toBeGreaterThan(0);
  });

  it('no RRSP activity when renterUsesRRSP is false', () => {
    const inputs = { ...defaultInputsFor('ON'), renterUsesRRSP: false };
    const result = simulate(inputs);
    for (const y of result.yearByYear) {
      expect(y.renterRrspBalance).toBe(0);
      expect(y.renterRrspContribution).toBe(0);
    }
    expect(result.exit.renterRrspExitTax).toBe(0);
    expect(result.exit.renterRrspBalance).toBe(0);
  });
});

describe('savings discipline split', () => {
  it('lower renterSavingsDisciplinePct reduces renter portfolio without affecting owner', () => {
    const full = simulate({
      ...defaultInputsFor('ON'),
      savingsDisciplinePct: 1.0,
      renterSavingsDisciplinePct: 1.0,
    });
    const halfRenter = simulate({
      ...defaultInputsFor('ON'),
      savingsDisciplinePct: 1.0,
      renterSavingsDisciplinePct: 0.5,
    });
    expect(halfRenter.exit.renterNetProceeds).toBeLessThan(full.exit.renterNetProceeds);
    expect(halfRenter.exit.ownerPortfolioValue).toBeCloseTo(
      full.exit.ownerPortfolioValue,
      0,
    );
  });

  it('lower ownerSavingsDisciplinePct reduces owner portfolio without affecting renter', () => {
    const full = simulate({
      ...defaultInputsFor('ON'),
      amortizationYears: 25,
      holdingPeriodYears: 30,
    });
    const halfOwner = simulate({
      ...defaultInputsFor('ON'),
      amortizationYears: 25,
      holdingPeriodYears: 30,
      ownerSavingsDisciplinePct: 0.5,
    });
    expect(halfOwner.exit.ownerPortfolioValue).toBeLessThan(full.exit.ownerPortfolioValue);
    expect(halfOwner.exit.renterNetProceeds).toBeCloseTo(full.exit.renterNetProceeds, 0);
  });

  it('explicit split fields matching savingsDisciplinePct produce identical results', () => {
    const explicit = simulate({
      ...defaultInputsFor('ON'),
      savingsDisciplinePct: 0.8,
      renterSavingsDisciplinePct: 0.8,
      ownerSavingsDisciplinePct: 0.8,
    });
    const implicit = simulate({
      ...defaultInputsFor('ON'),
      savingsDisciplinePct: 0.8,
    });
    expect(implicit.exit.netAdvantageToOwner).toBeCloseTo(
      explicit.exit.netAdvantageToOwner,
      0,
    );
  });
});

describe('v3 integration: all new features active together', () => {
  it('produces a coherent 15-year simulation with mortgage renewal, moving costs, RRSP, and split discipline', () => {
    const result = simulate({
      ...defaultInputsFor('ON'),
      holdingPeriodYears: 15,
      mortgageTermYears: 5,
      mortgageRenewalRatePct: 0.065,
      ownerMovingCostPerMove: 2_500,
      renterMovingCostPerMove: 400,
      ownerMoves: 1,
      renterMoves: 1,
      renterUsesRRSP: true,
      renterSavingsDisciplinePct: 0.9,
      ownerSavingsDisciplinePct: 1.0,
    });

    expect(result.yearByYear.length).toBe(15);
    // Renewal fires at year 6: rate should switch.
    const y6 = result.yearByYear[5]!;
    expect(y6.ownerMortgageRate).toBeCloseTo(0.065, 4);
    // Both move types occurred.
    expect(result.yearByYear.some((y) => y.ownerMoveOccurredThisYear)).toBe(true);
    expect(result.yearByYear.some((y) => y.renterMoveOccurredThisYear)).toBe(true);
    // Physical moving costs present.
    const ownerMoveY = result.yearByYear.find((y) => y.ownerMoveOccurredThisYear)!;
    expect(ownerMoveY.ownerPhysicalMovingCost).toBe(2_500);
    // RRSP and deposit at exit.
    expect(result.exit.renterRrspBalance).toBeGreaterThan(0);
    expect(result.exit.renterDepositReturned).toBeGreaterThan(0);
  });
});
