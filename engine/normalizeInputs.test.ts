import { describe, it, expect } from 'vitest';
import { defaultInputsFor, normalizeInputs } from './index';

describe('normalizeInputs', () => {
  it('derives ownerPriorEquity from ownerExtraSavings and the current price/down payment', () => {
    const base = { ...defaultInputsFor('ON'), homePrice: 700_000, downPaymentPct: 0.2, ownerExtraSavings: 50_000 };
    const n = normalizeInputs(base);
    const down = 700_000 * 0.2;
    const closing = 700_000 * 0.02;
    expect(n.ownerPriorEquity).toBeCloseTo(down + closing + 50_000, 2);
  });

  it('keeps prior equity in sync when home price changes (the result-sidebar bug)', () => {
    const a = normalizeInputs({ ...defaultInputsFor('ON'), homePrice: 700_000, downPaymentPct: 0.2, ownerExtraSavings: 50_000 });
    const b = normalizeInputs({ ...defaultInputsFor('ON'), homePrice: 1_000_000, downPaymentPct: 0.2, ownerExtraSavings: 50_000 });
    expect(b.ownerPriorEquity).toBeGreaterThan(a.ownerPriorEquity!);
    expect(b.ownerPriorEquity).toBeCloseTo(1_000_000 * 0.22 + 50_000, 2);
  });

  it('respects an explicit ownerPriorEquity when ownerExtraSavings is absent', () => {
    const n = normalizeInputs({ ...defaultInputsFor('ON'), ownerPriorEquity: 300_000 });
    expect(n.ownerPriorEquity).toBe(300_000);
  });

  it('clamps FHSA and HBP down-payment draws to the down payment', () => {
    const n = normalizeInputs({ ...defaultInputsFor('ON'), homePrice: 300_000, downPaymentPct: 0.05, ownerFhsaDown: 40_000, ownerRrspHbpDown: 60_000 });
    const down = 300_000 * 0.05; // 15k
    expect(n.ownerFhsaDown).toBeLessThanOrEqual(down);
    expect(n.ownerRrspHbpDown).toBeLessThanOrEqual(down);
  });

  it('clamps owner surplus split to the invested extra savings', () => {
    const n = normalizeInputs({ ...defaultInputsFor('ON'), homePrice: 700_000, downPaymentPct: 0.2, ownerExtraSavings: 30_000, ownerSurplusRrspAmt: 100_000 });
    expect(n.ownerSurplusRrspAmt).toBeLessThanOrEqual(30_000);
  });

  it('preserves undefined optionals so engine ?? fallbacks keep working', () => {
    const n = normalizeInputs({ ...defaultInputsFor('ON'), ownerPriorEquity: 250_000, ownerSurplusUsesRRSP: true });
    expect(n.ownerSurplusRrspAmt).toBeUndefined();
    expect(n.ownerSurplusUsesRRSP).toBe(true);
  });

  it('is idempotent', () => {
    const once = normalizeInputs({ ...defaultInputsFor('ON'), homePrice: 800_000, downPaymentPct: 0.15, ownerExtraSavings: 25_000 });
    const twice = normalizeInputs(once);
    expect(twice.ownerPriorEquity).toBeCloseTo(once.ownerPriorEquity!, 6);
  });
});
