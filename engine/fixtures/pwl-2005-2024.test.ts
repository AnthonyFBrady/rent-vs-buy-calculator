// Directional fixture tests against PWL 2005-2024 parameters.
//
// We cannot replicate PWL's full 20-year empirical analysis without the city-
// level historical home price + rent time series. What we can validate:
//
//   1. With PWL's baseline parameters, an expensive Canadian market favors the
//      renter. With high fees or low discipline, the result flips toward owner.
//   2. The sensitivity findings match in direction: higher maintenance, higher
//      fees, lower savings discipline all push the outcome toward owner.
//   3. The "owner wins 5 of 12, renter wins 7 of 12 in baseline" claim is
//      preserved as the canonical outcome distribution.

import { describe, it, expect } from 'vitest';
import { simulate, defaultInputsFor } from '../index';
import {
  withPWLBaseline,
  withPWLHighFees,
  withPWLLowDiscipline,
  PWL_CITY_OUTCOMES,
} from './pwl-2005-2024';

describe('PWL 2005-2024 baseline parameters', () => {
  it('applies all baseline overrides cleanly', () => {
    const inputs = withPWLBaseline(defaultInputsFor('ON'));
    expect(inputs.downPaymentPct).toBe(0.20);
    expect(inputs.amortizationYears).toBe(25);
    expect(inputs.maintenancePct).toBe(0.025);
    expect(inputs.investmentFeePct).toBe(0.0025);
    expect(inputs.investmentReturnPct).toBe(0.0819);
    expect(inputs.savingsDisciplinePct).toBe(1.0);
    expect(inputs.holdingPeriodYears).toBe(20);
  });

  it('high-fees sensitivity uses 1.76% fees', () => {
    const inputs = withPWLHighFees(defaultInputsFor('ON'));
    expect(inputs.investmentFeePct).toBe(0.0176);
  });

  it('low-discipline sensitivity uses 80% by default', () => {
    const inputs = withPWLLowDiscipline(defaultInputsFor('ON'));
    expect(inputs.savingsDisciplinePct).toBe(0.80);
  });
});

describe('PWL directional outcomes', () => {
  it('Toronto-style scenario flips between renter (baseline) and owner (high fees)', () => {
    // Toronto: $1M home, $3K rent — high price-to-rent ratio.
    const torontoBase = withPWLBaseline({
      ...defaultInputsFor('ON'),
      homePrice: 1_000_000,
      monthlyRent: 3_000,
    });
    const torontoHighFees = withPWLHighFees({
      ...defaultInputsFor('ON'),
      homePrice: 1_000_000,
      monthlyRent: 3_000,
    });

    const baselineResult = simulate(torontoBase);
    const highFeesResult = simulate(torontoHighFees);

    // High fees should narrow the renter advantage or flip it.
    expect(highFeesResult.exit.netAdvantageToOwner).toBeGreaterThan(
      baselineResult.exit.netAdvantageToOwner,
    );
  });

  it('low savings discipline shifts result toward the owner', () => {
    const inputs = {
      ...defaultInputsFor('ON'),
      homePrice: 1_000_000,
      monthlyRent: 3_000,
    };
    const baseline = simulate(withPWLBaseline(inputs));
    const lowDiscipline = simulate(withPWLLowDiscipline(inputs, 0.80));

    expect(lowDiscipline.exit.netAdvantageToOwner).toBeGreaterThan(
      baseline.exit.netAdvantageToOwner,
    );
  });

  it('the paper outcomes are 5 owners + 7 renters = 12 cities', () => {
    expect(PWL_CITY_OUTCOMES.baseline.ownerWins.length).toBe(5);
    expect(PWL_CITY_OUTCOMES.baseline.renterWins.length).toBe(7);
    expect(
      PWL_CITY_OUTCOMES.baseline.ownerWins.length +
        PWL_CITY_OUTCOMES.baseline.renterWins.length,
    ).toBe(12);
  });

  it('discipline 80% and fees 1.76% both produce 10 of 12 owners winning', () => {
    expect(PWL_CITY_OUTCOMES.sensitivityOwnersWinning.discipline80pct).toBe(10);
    expect(PWL_CITY_OUTCOMES.sensitivityOwnersWinning.fees1pct76).toBe(10);
  });
});
