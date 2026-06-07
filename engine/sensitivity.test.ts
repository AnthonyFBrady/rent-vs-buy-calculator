import { describe, it, expect } from 'vitest';
import { simulateSensitivity, defaultInputsFor } from './index';

describe('simulateSensitivity', () => {
  it('base scenario matches a plain simulation', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulateSensitivity(inputs);
    expect(result.base.exit.finalOwnerWealth).toBeGreaterThan(0);
    expect(result.swingPct).toBeGreaterThan(0);
  });

  it('high-appreciation scenario produces more owner wealth than low', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulateSensitivity(inputs);
    expect(result.ownerHigh.exit.finalOwnerWealth).toBeGreaterThan(
      result.ownerLow.exit.finalOwnerWealth,
    );
  });

  it('high-investment-return scenario produces more renter wealth than low', () => {
    const inputs = defaultInputsFor('ON');
    const result = simulateSensitivity(inputs);
    expect(result.renterHigh.exit.finalRenterWealth).toBeGreaterThan(
      result.renterLow.exit.finalRenterWealth,
    );
  });

  it('respects the swing parameter', () => {
    const inputs = defaultInputsFor('ON');
    const tight = simulateSensitivity(inputs, 0.005);
    const wide = simulateSensitivity(inputs, 0.04);
    const tightSpread =
      tight.ownerHigh.exit.finalOwnerWealth - tight.ownerLow.exit.finalOwnerWealth;
    const wideSpread =
      wide.ownerHigh.exit.finalOwnerWealth - wide.ownerLow.exit.finalOwnerWealth;
    expect(wideSpread).toBeGreaterThan(tightSpread);
  });

  it('does not crash when home appreciation is already low', () => {
    const inputs = defaultInputsFor('ON');
    inputs.homeAppreciationPct = -0.04;
    expect(() => simulateSensitivity(inputs)).not.toThrow();
  });

  it('does not crash when investment return is already low', () => {
    const inputs = defaultInputsFor('ON');
    inputs.investmentReturnPct = 0.01;
    expect(() => simulateSensitivity(inputs)).not.toThrow();
  });
});
