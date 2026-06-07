import { describe, it, expect } from 'vitest';
import {
  normalizeFSAPrefix,
  provinceFromPostalCode,
  suggestRent,
} from './postalCode';

describe('normalizeFSAPrefix', () => {
  it('handles a full postal code', () => {
    expect(normalizeFSAPrefix('M5V 3A8')).toBe('M5');
    expect(normalizeFSAPrefix('M5V3A8')).toBe('M5');
  });

  it('handles just the FSA', () => {
    expect(normalizeFSAPrefix('m5v')).toBe('M5');
  });

  it('handles shortest 2-char input', () => {
    expect(normalizeFSAPrefix('M5')).toBe('M5');
  });

  it('rejects invalid shapes', () => {
    expect(normalizeFSAPrefix('')).toBeNull();
    expect(normalizeFSAPrefix('X')).toBeNull();
    expect(normalizeFSAPrefix('55V')).toBeNull();
  });
});

describe('provinceFromPostalCode', () => {
  it('maps Toronto FSAs to ON', () => {
    expect(provinceFromPostalCode('M5V 3A8')).toBe('ON');
  });

  it('maps Vancouver FSAs to BC', () => {
    expect(provinceFromPostalCode('V6B')).toBe('BC');
  });

  it('maps Montreal FSAs to QC', () => {
    expect(provinceFromPostalCode('H2X')).toBe('QC');
  });

  it('maps Calgary FSAs to AB', () => {
    expect(provinceFromPostalCode('T2P')).toBe('AB');
  });
});

describe('suggestRent', () => {
  it('Toronto downtown M5V at the median home price returns the base P/R', () => {
    // Toronto median ~ $1.1M, base P/R 26. At median, adjusted P/R = base.
    const s = suggestRent(1_100_000, 'M5V 2H1');
    expect(s).not.toBeNull();
    expect(s!.metro).toBe('Toronto');
    expect(s!.basePriceToRent).toBe(26);
    expect(s!.priceToRent).toBeCloseTo(26, 0);
    expect(s!.metroMedianHomePrice).toBe(1_100_000);
  });

  it('Vancouver V6B is identified and reports the metro median', () => {
    const s = suggestRent(1_500_000, 'V6B 1A1');
    expect(s).not.toBeNull();
    expect(s!.metro).toBe('Vancouver');
    expect(s!.basePriceToRent).toBe(30);
    expect(s!.metroMedianHomePrice).toBe(1_300_000);
  });

  it('Winnipeg R3 produces a much higher rent estimate per dollar of price', () => {
    const winnipeg = suggestRent(400_000, 'R3M 2J6');
    const toronto = suggestRent(400_000, 'M5V');
    expect(winnipeg).not.toBeNull();
    expect(toronto).not.toBeNull();
    // Same home price, Winnipeg has lower base P/R so rent should be higher.
    expect(winnipeg!.suggestedMonthlyRent).toBeGreaterThan(
      toronto!.suggestedMonthlyRent,
    );
  });

  it('falls back to provincial average for unmatched ON FSA', () => {
    // L1 is Whitby/Pickering, not in the metro list.
    const s = suggestRent(700_000, 'L1A 1A1');
    expect(s).not.toBeNull();
    expect(s!.confidence).toBe('low');
    expect(s!.metro).toContain('ON');
  });

  it('returns null for invalid inputs', () => {
    expect(suggestRent(1_000_000, '')).toBeNull();
    expect(suggestRent(0, 'M5V')).toBeNull();
    expect(suggestRent(-100_000, 'M5V')).toBeNull();
  });

  it('produces sensible Toronto rent for a $1M home', () => {
    // Below the $1.1M median: slightly lower effective P/R, so rent dips below
    // the flat $1M/360 = $2,778 figure.
    const s = suggestRent(1_000_000, 'M5V');
    expect(s!.suggestedMonthlyRent).toBeGreaterThan(2_500);
    expect(s!.suggestedMonthlyRent).toBeLessThan(3_500);
  });
});

describe('price-tier elasticity', () => {
  it('a higher home price in the same metro increases the effective P/R', () => {
    const cheap = suggestRent(500_000, 'M5V')!;
    const median = suggestRent(1_100_000, 'M5V')!;
    const expensive = suggestRent(2_000_000, 'M5V')!;
    expect(cheap.priceToRent).toBeLessThan(median.priceToRent);
    expect(median.priceToRent).toBeLessThan(expensive.priceToRent);
  });

  it('a higher home price still produces higher rent (rent rises sub-linearly with price)', () => {
    const cheap = suggestRent(500_000, 'M5V')!;
    const expensive = suggestRent(2_000_000, 'M5V')!;
    expect(expensive.suggestedMonthlyRent).toBeGreaterThan(
      cheap.suggestedMonthlyRent,
    );
    // 4x the price should NOT produce 4x the rent. That is the whole point.
    expect(expensive.suggestedMonthlyRent).toBeLessThan(
      cheap.suggestedMonthlyRent * 4,
    );
  });

  it('Toronto $500K condo suggested rent is in a realistic range ($2,000-$2,800/mo)', () => {
    const s = suggestRent(500_000, 'M5V')!;
    expect(s.suggestedMonthlyRent).toBeGreaterThan(2_000);
    expect(s.suggestedMonthlyRent).toBeLessThan(2_800);
  });

  it('Toronto $2M house suggested rent is in a realistic range ($4,500-$5,500/mo)', () => {
    const s = suggestRent(2_000_000, 'M5V')!;
    expect(s.suggestedMonthlyRent).toBeGreaterThan(4_500);
    expect(s.suggestedMonthlyRent).toBeLessThan(5_500);
  });

  it('Vancouver $1.3M (median) at base P/R 30', () => {
    const s = suggestRent(1_300_000, 'V6B')!;
    expect(s.priceToRent).toBeCloseTo(30, 0);
    expect(s.suggestedMonthlyRent).toBeCloseTo(1_300_000 / (30 * 12), -1);
  });
});
