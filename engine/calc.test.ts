import { describe, it, expect } from 'vitest';
import {
  fivePercentRule,
  monthlyMortgagePayment,
  canadianEffectiveMonthlyRate,
  amortizationSchedule,
  landTransferTax,
  cmhcPremium,
  capitalGainsTax,
  simulate,
  defaultInputsFor,
} from './index';

// ─── 5% Rule ────────────────────────────────────────────────────────────

describe('fivePercentRule', () => {
  it('produces the canonical $500K example', () => {
    // $500K home × 5% = $25,000 / year = $2,083.33 / month break-even rent
    const result = fivePercentRule(500_000, 2000, {
      propertyTaxPct: 0.01,
      maintenancePct: 0.01,
      costOfCapitalPct: 0.03,
    });
    expect(result.annualUnrecoverable).toBeCloseTo(25_000, 0);
    expect(result.monthlyBreakEvenRent).toBeCloseTo(2_083.33, 0);
    expect(result.verdict).toBe('rent-favored'); // $2000 rent is below $2083 threshold
  });

  it('correctly identifies buy-favored when rent is above threshold', () => {
    // $500K home, $3000 rent → rent well above $2083 threshold
    const result = fivePercentRule(500_000, 3000, {
      propertyTaxPct: 0.01,
      maintenancePct: 0.01,
      costOfCapitalPct: 0.03,
    });
    expect(result.verdict).toBe('buy-favored');
    expect(result.marginPctOfThreshold).toBeGreaterThan(0.4); // ~44% above threshold
  });

  it('identifies tie when rent is within ±2% of threshold', () => {
    const result = fivePercentRule(500_000, 2083, {
      propertyTaxPct: 0.01,
      maintenancePct: 0.01,
      costOfCapitalPct: 0.03,
    });
    expect(result.verdict).toBe('tie');
  });

  it('Felix higher-maintenance default of 1.5% lifts the threshold', () => {
    // With 1.5% maintenance instead of 1%, the threshold should be higher → more rent-favored
    const standard = fivePercentRule(500_000, 2200, {
      propertyTaxPct: 0.01,
      maintenancePct: 0.01,
      costOfCapitalPct: 0.03,
    });
    const felix = fivePercentRule(500_000, 2200, {
      propertyTaxPct: 0.01,
      maintenancePct: 0.015,
      costOfCapitalPct: 0.03,
    });
    expect(felix.monthlyBreakEvenRent).toBeGreaterThan(standard.monthlyBreakEvenRent);
  });

  it('uses Felix defaults (1.5% maintenance) when options omitted', () => {
    const result = fivePercentRule(500_000, 2000);
    // 1% + 1.5% + 3% = 5.5% of $500K = $27,500 / yr = $2,291.67 / mo
    expect(result.monthlyBreakEvenRent).toBeCloseTo(2_291.67, 0);
  });
});

// ─── Canadian mortgage math ────────────────────────────────────────────

describe('canadianEffectiveMonthlyRate', () => {
  it('converts 5% annual to ~0.4124% monthly via semi-annual compounding', () => {
    const r = canadianEffectiveMonthlyRate(0.05);
    // (1.025)^(1/6) - 1 ≈ 0.004124
    expect(r).toBeCloseTo(0.004124, 5);
  });

  it('handles zero rate', () => {
    expect(canadianEffectiveMonthlyRate(0)).toBe(0);
  });
});

describe('monthlyMortgagePayment', () => {
  it('reproduces the standard Canadian benchmark: $400K @ 5% over 25y ≈ $2,326', () => {
    const payment = monthlyMortgagePayment(400_000, 0.05, 25);
    // Canadian semi-annual compounding gives roughly $2,326/mo
    expect(payment).toBeGreaterThan(2_320);
    expect(payment).toBeLessThan(2_335);
  });

  it('returns principal / months at zero rate', () => {
    expect(monthlyMortgagePayment(120_000, 0, 10)).toBeCloseTo(1_000, 1);
  });

  it('returns 0 for zero principal', () => {
    expect(monthlyMortgagePayment(0, 0.05, 25)).toBe(0);
  });

  it('throws on non-positive amortization', () => {
    expect(() => monthlyMortgagePayment(100_000, 0.05, 0)).toThrow();
  });
});

describe('amortizationSchedule', () => {
  it('produces exactly 12 × years rows', () => {
    const schedule = amortizationSchedule(300_000, 0.05, 25);
    expect(schedule.length).toBe(300);
  });

  it('ends with zero (or near-zero) balance', () => {
    const schedule = amortizationSchedule(300_000, 0.05, 25);
    const last = schedule[schedule.length - 1]!;
    expect(last.endingBalance).toBeCloseTo(0, 0);
  });

  it('principal paid in year 1 is small (mostly interest)', () => {
    const schedule = amortizationSchedule(400_000, 0.05, 25);
    const yearOne = schedule.slice(0, 12);
    const principalY1 = yearOne.reduce((s, r) => s + r.principal, 0);
    const interestY1 = yearOne.reduce((s, r) => s + r.interest, 0);
    // Early years: interest dominates
    expect(interestY1).toBeGreaterThan(principalY1);
  });
});

// ─── Land transfer tax ─────────────────────────────────────────────────

describe('landTransferTax', () => {
  it('Ontario $1M provincial LTT is $16,475', () => {
    const result = landTransferTax(1_000_000, 'ON', {
      isTorontoMunicipalLTT: false,
      isFirstTimeBuyer: false,
    });
    expect(result.provincialLTT).toBeCloseTo(16_475, 0);
    expect(result.municipalLTT).toBe(0);
  });

  it('Toronto $1M total LTT is $32,950 (provincial + MLTT)', () => {
    const result = landTransferTax(1_000_000, 'ON', {
      isTorontoMunicipalLTT: true,
      isFirstTimeBuyer: false,
    });
    expect(result.total).toBeCloseTo(32_950, 0);
  });

  it('First-time buyer rebate caps at $4,000 in Ontario (provincial)', () => {
    const result = landTransferTax(1_000_000, 'ON', {
      isTorontoMunicipalLTT: false,
      isFirstTimeBuyer: true,
    });
    expect(result.ftbRebate).toBeCloseTo(4_000, 0);
    expect(result.total).toBeCloseTo(12_475, 0);
  });

  it('Alberta has only nominal registration fees', () => {
    const result = landTransferTax(500_000, 'AB');
    expect(result.total).toBeLessThan(500);
  });
});

// ─── CMHC ─────────────────────────────────────────────────────────────

describe('cmhcPremium', () => {
  it('returns 0 with 20% down', () => {
    expect(cmhcPremium(500_000, 0.20)).toBe(0);
  });

  it('10% down on $500K → 3.1% of $450K = $13,950', () => {
    expect(cmhcPremium(500_000, 0.10)).toBeCloseTo(13_950, 0);
  });

  it('5% down on $500K → 4.0% of $475K = $19,000', () => {
    expect(cmhcPremium(500_000, 0.05)).toBeCloseTo(19_000, 0);
  });

  it('homes above $1.5M are CMHC-ineligible (assume 0 premium for MVP)', () => {
    expect(cmhcPremium(1_600_000, 0.10)).toBe(0);
  });

  it('below 5% down is not insurable', () => {
    expect(cmhcPremium(500_000, 0.03)).toBe(0);
  });
});

// ─── Capital gains tax (renter side) ───────────────────────────────────

describe('capitalGainsTax', () => {
  it('50% inclusion at 43% marginal on $100K gain → $21,500', () => {
    expect(capitalGainsTax(100_000, 0.43)).toBeCloseTo(21_500, 0);
  });

  it('zero gain → zero tax', () => {
    expect(capitalGainsTax(0, 0.43)).toBe(0);
  });

  it('negative gain (loss) → zero tax', () => {
    expect(capitalGainsTax(-10_000, 0.43)).toBe(0);
  });
});

// ─── Simulation ────────────────────────────────────────────────────────

describe('simulate (end-to-end)', () => {
  it('Toronto-style high-price-to-rent scenario favors the renter', () => {
    // $1M home, $3K rent. Price-to-rent ratio = 27.8, well above 20.
    // PWL 2005-2024 shows renters won in Toronto at baseline.
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);

    expect(result.fivePercentRule.verdict).toBe('rent-favored');
    expect(result.exit.netAdvantageToOwner).toBeLessThan(0); // renter wins
  });

  it('low-price-to-rent scenario favors the buyer', () => {
    // Cheap home, high rent → buyer wins.
    const inputs = defaultInputsFor('ON');
    inputs.homePrice = 400_000;
    inputs.monthlyRent = 3500;
    const result = simulate(inputs);

    expect(result.fivePercentRule.verdict).toBe('buy-favored');
    expect(result.exit.netAdvantageToOwner).toBeGreaterThan(0); // buyer wins
  });

  it('high investment fees flip the result toward owner (PWL sensitivity finding)', () => {
    const baseline = defaultInputsFor('ON');
    const highFee = { ...baseline, investmentFeePct: 0.0176 };

    const baselineSim = simulate(baseline);
    const highFeeSim = simulate(highFee);

    // High fees should reduce the renter advantage (renter wealth drops)
    expect(highFeeSim.exit.netAdvantageToOwner).toBeGreaterThan(
      baselineSim.exit.netAdvantageToOwner,
    );
  });

  it('low savings discipline flips the result toward owner', () => {
    const baseline = defaultInputsFor('ON');
    const lowDiscipline = { ...baseline, savingsDisciplinePct: 0.8 };

    const baselineSim = simulate(baseline);
    const lowDisciplineSim = simulate(lowDiscipline);

    expect(lowDisciplineSim.exit.netAdvantageToOwner).toBeGreaterThan(
      baselineSim.exit.netAdvantageToOwner,
    );
  });

  it('year-by-year array length equals holding period', () => {
    const inputs = defaultInputsFor('ON');
    inputs.holdingPeriodYears = 15;
    const result = simulate(inputs);
    expect(result.yearByYear.length).toBe(15);
  });

  it('owner mortgage balance decreases each year', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    for (let i = 1; i < result.yearByYear.length; i++) {
      expect(result.yearByYear[i]!.ownerMortgageBalance).toBeLessThan(
        result.yearByYear[i - 1]!.ownerMortgageBalance,
      );
    }
  });

  it('Principal Residence Exemption: no capital gains tax on owner side', () => {
    // The exit summary should not subtract cap gains for the owner.
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    // The owner's net proceeds equal sale price minus realtor + legal + mortgage payoff.
    // No PRE field needed because we never subtract gains tax.
    const expected =
      result.exit.ownerSalePrice -
      result.exit.ownerRealtorCommission -
      result.exit.ownerLegalFees -
      result.exit.ownerMortgagePayoff;
    expect(result.exit.ownerHomeNetProceeds).toBeCloseTo(expected, 0);
  });

  it('renter capital gains tax is non-zero when portfolio appreciates', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    if (result.exit.renterRealizedGain > 0) {
      expect(result.exit.renterCapitalGainsTax).toBeGreaterThan(0);
    }
  });
});

// ─── PWL 2005-2024 directional sanity ──────────────────────────────────
// We don't have the exact paper fixtures, but the directional findings should hold:
// - Baseline Toronto-style: renter wins
// - High fees: owner wins
// - Low discipline: owner wins
// - Cheap home + high rent: owner wins

describe('Commitment summary', () => {
  it('exposes the renter\'s starting lump sum and monthly contribution', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    expect(result.commitment.renterStartingLumpSum).toBeGreaterThan(0);
    expect(result.commitment.renterFirstYearMonthlyContribution).toBeGreaterThanOrEqual(0);
    expect(result.commitment.renterTotalInvested).toBeGreaterThanOrEqual(
      result.commitment.renterStartingLumpSum,
    );
  });

  it('exposes the owner\'s closing cash and monthly carry', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    expect(result.commitment.ownerStartingCashOut).toBeGreaterThan(0);
    expect(result.commitment.ownerFirstYearMonthlyCarry).toBeGreaterThan(0);
    expect(result.commitment.ownerTotalOutOfPocket).toBeGreaterThan(
      result.commitment.ownerStartingCashOut,
    );
  });

  it('renter starting lump sum equals the owner year-0 cash-out minus renter deposit and moving cost', () => {
    // Textbook NPV: renter invests the owner's full year-0 cash-out (down payment +
    // closing costs) minus the renter's own first+last deposit and moving cost.
    const inputs = defaultInputsFor('ON');
    const result = simulate(inputs);
    const deposit = 2 * inputs.monthlyRent;
    const movingCost = inputs.renterMovingCostPerMove ?? 400;
    expect(result.commitment.renterStartingLumpSum).toBeCloseTo(
      result.commitment.ownerStartingCashOut - deposit - movingCost,
      0,
    );
  });

  it('lower savings discipline reduces total invested', () => {
    const inputs = defaultInputsFor('ON');
    const baseline = simulate(inputs);
    const lowDiscipline = simulate({ ...inputs, savingsDisciplinePct: 0.5 });
    expect(lowDiscipline.commitment.renterTotalInvested).toBeLessThan(
      baseline.commitment.renterTotalInvested,
    );
  });
});

describe('TFSA toggle on the renter side', () => {
  it('reduces capital gains tax at exit (partial shelter — TFSA room capped at $95k)', () => {
    // The year-0 lump sum for a $1M ON home (~$233k) exceeds the $95k TFSA lifetime cap,
    // so only the TFSA-allocated portion is sheltered. The taxable remainder still incurs
    // cap gains at exit. TFSA reduces (but does not eliminate) the tax.
    const inputs = defaultInputsFor('ON');
    const taxable = simulate({ ...inputs, renterUsesTFSA: false });
    const sheltered = simulate({ ...inputs, renterUsesTFSA: true });
    expect(taxable.exit.renterCapitalGainsTax).toBeGreaterThan(0);
    expect(sheltered.exit.renterCapitalGainsTax).toBeGreaterThan(0);
    expect(sheltered.exit.renterCapitalGainsTax).toBeLessThan(taxable.exit.renterCapitalGainsTax);
  });

  it('increases the renter\'s final wealth (net advantage shifts toward renter)', () => {
    const inputs = defaultInputsFor('ON');
    const taxable = simulate({ ...inputs, renterUsesTFSA: false });
    const sheltered = simulate({ ...inputs, renterUsesTFSA: true });
    expect(sheltered.exit.finalRenterWealth).toBeGreaterThanOrEqual(
      taxable.exit.finalRenterWealth,
    );
    expect(sheltered.exit.netAdvantageToOwner).toBeLessThanOrEqual(
      taxable.exit.netAdvantageToOwner,
    );
  });
});

describe('PWL 2005-2024 directional sanity', () => {
  it('baseline favors renter in expensive markets, owner in low-price-to-rent markets', () => {
    // Expensive market (Toronto-style): high P/R ratio → renter advantage.
    const expensive = simulate(defaultInputsFor('ON'));
    expect(expensive.exit.netAdvantageToOwner).toBeLessThan(0);

    // Low-P/R market: P/R must be ≤ ~18 for buying to win cleanly.
    // $400K home, $2500 rent → P/R = 13.3 → buy-favored.
    const lowPR = simulate({
      ...defaultInputsFor('AB'),
      homePrice: 400_000,
      monthlyRent: 2_500,
    });
    expect(lowPR.exit.netAdvantageToOwner).toBeGreaterThan(0);
  });
});
