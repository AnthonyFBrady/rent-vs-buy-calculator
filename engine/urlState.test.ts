import { describe, it, expect } from 'vitest';
import {
  inputsToSearchParams,
  searchParamsToInputs,
  defaultInputsFor,
} from './index';

describe('URL state round-trip', () => {
  it('defaults produce a near-empty URL (only province)', () => {
    const inputs = defaultInputsFor('ON');
    const params = inputsToSearchParams(inputs);
    expect(params.get('p')).toBe('ON');
    expect([...params.keys()].length).toBe(1);
  });

  it('overridden home price + rent survive the round-trip', () => {
    const inputs = defaultInputsFor('ON');
    inputs.homePrice = 850_000;
    inputs.monthlyRent = 2750;
    const params = inputsToSearchParams(inputs);
    const decoded = searchParamsToInputs(params);
    expect(decoded.homePrice).toBe(850_000);
    expect(decoded.monthlyRent).toBe(2750);
  });

  it('different provinces use different defaults', () => {
    const ontario = defaultInputsFor('ON');
    const alberta = defaultInputsFor('AB');
    expect(ontario.homePrice).not.toBe(alberta.homePrice);
    expect(ontario.propertyTaxPct).not.toBe(alberta.propertyTaxPct);
  });

  it('boolean toggles survive the round-trip', () => {
    const inputs = defaultInputsFor('ON');
    inputs.isFirstTimeBuyer = true;
    const params = inputsToSearchParams(inputs);
    expect(params.get('ftb')).toBe('1');
    const decoded = searchParamsToInputs(params);
    expect(decoded.isFirstTimeBuyer).toBe(true);
  });

  it('invalid province falls back to ON', () => {
    const params = new URLSearchParams('p=XX');
    const decoded = searchParamsToInputs(params);
    expect(decoded.province).toBe('ON');
  });

  it('missing params produce default inputs', () => {
    const decoded = searchParamsToInputs(new URLSearchParams());
    const defaults = defaultInputsFor('ON');
    expect(decoded.homePrice).toBe(defaults.homePrice);
    expect(decoded.monthlyRent).toBe(defaults.monthlyRent);
  });

  it('percent values survive without floating-point drift', () => {
    const inputs = defaultInputsFor('ON');
    inputs.maintenancePct = 0.0225;
    inputs.investmentReturnPct = 0.0825;
    const params = inputsToSearchParams(inputs);
    const decoded = searchParamsToInputs(params);
    expect(decoded.maintenancePct).toBeCloseTo(0.0225, 6);
    expect(decoded.investmentReturnPct).toBeCloseTo(0.0825, 6);
  });

  it('changing province discards the prior province defaults', () => {
    const inputs = defaultInputsFor('BC');
    const params = inputsToSearchParams(inputs);
    expect(params.get('p')).toBe('BC');
    // BC home price differs from ON. Should NOT be encoded as override.
    // Re-decoding with no other params should give BC defaults.
    const decoded = searchParamsToInputs(params);
    expect(decoded.province).toBe('BC');
    expect(decoded.homePrice).toBe(defaultInputsFor('BC').homePrice);
  });
});
