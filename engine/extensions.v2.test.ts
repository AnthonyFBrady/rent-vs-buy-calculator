// Tests for v2.1 engine extensions:
//   - HomeType union + homeTypeDefaults()
//   - Ontario borough lookup
//   - suggestPriceAndRent() routing (ON → borough table, non-ON → v1 fallback)
//   - defaultInputsFor merges home-type defaults when supplied
//   - URL state round-trip preserves homeType

import { describe, it, expect } from 'vitest';
import {
  HOME_TYPES,
  ONTARIO_REGION_LIST,
  ONTARIO_REGIONS,
  allHomeTypeDefaults,
  defaultInputsFor,
  homeTypeDefaults,
  inputsToSearchParams,
  regionFromFSA,
  searchParamsToInputs,
  suggestPriceAndRent,
} from './index';

describe('HOME_TYPES catalog', () => {
  it('exposes all five home types in order', () => {
    expect(HOME_TYPES).toEqual([
      'condo-apt',
      'condo-townhouse',
      'freehold-townhouse',
      'semi-detached',
      'detached',
    ]);
  });

  it('allHomeTypeDefaults returns one entry per type with the expected shape', () => {
    const all = allHomeTypeDefaults();
    expect(all).toHaveLength(5);
    for (const d of all) {
      expect(d.maintenancePct).toBeGreaterThan(0);
      expect(d.maintenancePct).toBeLessThan(0.05);
      expect(d.monthlyStrataFee).toBeGreaterThanOrEqual(0);
      expect(d.homeAppreciationPct).toBeGreaterThan(0);
      expect(d.label.length).toBeGreaterThan(0);
      expect(d.description.length).toBeGreaterThan(0);
    }
  });
});

describe('homeTypeDefaults', () => {
  it('condo-apt has lower maintenance % and a strata fee, detached is the opposite', () => {
    const condo = homeTypeDefaults('condo-apt');
    const detached = homeTypeDefaults('detached');
    expect(condo.maintenancePct).toBeLessThan(detached.maintenancePct);
    expect(condo.monthlyStrataFee).toBeGreaterThan(0);
    expect(detached.monthlyStrataFee).toBe(0);
  });

  it('maintenance % rises monotonically from condo-apt to detached', () => {
    const seq = HOME_TYPES.map((t) => homeTypeDefaults(t).maintenancePct);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThan(seq[i - 1]!);
    }
  });

  it('condo-townhouse carries a smaller strata fee than condo-apt', () => {
    const apt = homeTypeDefaults('condo-apt');
    const th = homeTypeDefaults('condo-townhouse');
    expect(th.monthlyStrataFee).toBeLessThan(apt.monthlyStrataFee);
    expect(th.monthlyStrataFee).toBeGreaterThan(0);
  });

  it('freehold-townhouse and detached both have zero strata', () => {
    expect(homeTypeDefaults('freehold-townhouse').monthlyStrataFee).toBe(0);
    expect(homeTypeDefaults('semi-detached').monthlyStrataFee).toBe(0);
    expect(homeTypeDefaults('detached').monthlyStrataFee).toBe(0);
  });
});

describe('Ontario regions table', () => {
  it('exposes 19 regions (six Toronto boroughs + 13 other ON municipalities)', () => {
    expect(ONTARIO_REGION_LIST).toHaveLength(19);
  });

  it('every region has prices and P/R values for every home type', () => {
    for (const region of ONTARIO_REGION_LIST) {
      const profile = ONTARIO_REGIONS[region];
      for (const t of HOME_TYPES) {
        expect(profile.medianPriceByType[t]).toBeGreaterThan(0);
        expect(profile.priceToRentByType[t]).toBeGreaterThan(0);
      }
    }
  });

  it('detached costs more than condo-apt in every region', () => {
    for (const region of ONTARIO_REGION_LIST) {
      const profile = ONTARIO_REGIONS[region];
      expect(profile.medianPriceByType['detached']).toBeGreaterThan(
        profile.medianPriceByType['condo-apt'],
      );
    }
  });

  it('median price rises monotonically by home type in Downtown Toronto', () => {
    const tor = ONTARIO_REGIONS['toronto-downtown'];
    const seq = HOME_TYPES.map((t) => tor.medianPriceByType[t]);
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]).toBeGreaterThan(seq[i - 1]!);
    }
  });

  it('Downtown Toronto condo-apt sits in a defensible 2024-2025 range', () => {
    const tor = ONTARIO_REGIONS['toronto-downtown'];
    expect(tor.medianPriceByType['condo-apt']).toBeGreaterThan(700_000);
    expect(tor.medianPriceByType['condo-apt']).toBeLessThan(900_000);
  });

  it('Downtown Toronto detached is the priciest detached in the table', () => {
    const downtown = ONTARIO_REGIONS['toronto-downtown'].medianPriceByType['detached'];
    for (const region of ONTARIO_REGION_LIST) {
      if (region === 'toronto-downtown') continue;
      expect(ONTARIO_REGIONS[region].medianPriceByType['detached']).toBeLessThanOrEqual(downtown);
    }
  });

  it('Ottawa detached is cheaper than Downtown Toronto detached', () => {
    expect(ONTARIO_REGIONS['ottawa'].medianPriceByType['detached']).toBeLessThan(
      ONTARIO_REGIONS['toronto-downtown'].medianPriceByType['detached'],
    );
  });

  it('Scarborough detached is cheaper than Downtown Toronto detached', () => {
    expect(
      ONTARIO_REGIONS['toronto-scarborough'].medianPriceByType['detached'],
    ).toBeLessThan(
      ONTARIO_REGIONS['toronto-downtown'].medianPriceByType['detached'],
    );
  });

  it('Windsor is the cheapest detached market in the table', () => {
    const detachedByRegion = ONTARIO_REGION_LIST.map((r) => ({
      region: r,
      price: ONTARIO_REGIONS[r].medianPriceByType['detached'],
    }));
    const cheapest = detachedByRegion.sort((a, b) => a.price - b.price)[0]!;
    expect(cheapest.region).toBe('windsor');
  });
});

describe('regionFromFSA', () => {
  it('maps Toronto FSAs to their borough', () => {
    expect(regionFromFSA('M5V')).toBe('toronto-downtown');
    expect(regionFromFSA('M4Y')).toBe('toronto-east');
    expect(regionFromFSA('M6P')).toBe('toronto-west');
    expect(regionFromFSA('M2N')).toBe('toronto-north-york');
    expect(regionFromFSA('M3H')).toBe('toronto-north-york');
    expect(regionFromFSA('M1B')).toBe('toronto-scarborough');
    expect(regionFromFSA('M8V')).toBe('toronto-etobicoke');
    expect(regionFromFSA('M9V')).toBe('toronto-etobicoke');
  });

  it('maps Mississauga FSAs to mississauga', () => {
    expect(regionFromFSA('L4Z')).toBe('mississauga');
    expect(regionFromFSA('L5B')).toBe('mississauga');
  });

  it('maps Ottawa central FSAs to ottawa', () => {
    expect(regionFromFSA('K1P')).toBe('ottawa');
    expect(regionFromFSA('K2P')).toBe('ottawa');
  });

  it('maps KW FSAs to kitchener-waterloo', () => {
    expect(regionFromFSA('N2G')).toBe('kitchener-waterloo');
    expect(regionFromFSA('N2L')).toBe('kitchener-waterloo');
  });

  it('returns null for non-ON FSAs', () => {
    expect(regionFromFSA('V6B')).toBeNull(); // Vancouver
    expect(regionFromFSA('H2X')).toBeNull(); // Montreal
    expect(regionFromFSA('T2P')).toBeNull(); // Calgary
  });

  it('returns null for ON FSAs not seeded (e.g. small towns)', () => {
    // L1A is Whitby/Ajax/Pickering, not in any seeded region's FSA list.
    expect(regionFromFSA('L1A')).toBeNull();
  });
});

describe('suggestPriceAndRent', () => {
  it('Downtown Toronto M5V condo-apt returns the borough median and matching rent', () => {
    const s = suggestPriceAndRent('M5V 1A1', 'condo-apt');
    expect(s).not.toBeNull();
    expect(s!.region).toBe('toronto-downtown');
    expect(s!.regionName).toBe('Downtown Toronto');
    expect(s!.homeType).toBe('condo-apt');
    expect(s!.medianPrice).toBe(805_000);
    expect(s!.priceToRent).toBe(22);
    // rent = price / (PR * 12)
    expect(s!.suggestedMonthlyRent).toBeCloseTo(805_000 / (22 * 12), 0);
    expect(s!.confidence).toBe('high');
  });

  it('Downtown Toronto M5V detached returns a much higher median than condo-apt', () => {
    const condo = suggestPriceAndRent('M5V', 'condo-apt')!;
    const detached = suggestPriceAndRent('M5V', 'detached')!;
    expect(detached.medianPrice).toBeGreaterThan(condo.medianPrice * 2);
    expect(detached.suggestedMonthlyRent).toBeGreaterThan(condo.suggestedMonthlyRent);
  });

  it('Scarborough M1 detached is materially cheaper than Downtown M5 detached', () => {
    const downtown = suggestPriceAndRent('M5V', 'detached')!;
    const scar = suggestPriceAndRent('M1B', 'detached')!;
    expect(scar.medianPrice).toBeLessThan(downtown.medianPrice * 0.7);
  });

  it('Mississauga L4Z detached routes to mississauga, not Toronto', () => {
    const s = suggestPriceAndRent('L4Z 1A1', 'detached')!;
    expect(s.region).toBe('mississauga');
    expect(s.medianPrice).toBe(ONTARIO_REGIONS['mississauga'].medianPriceByType['detached']);
  });

  it('Ottawa K2P returns Ottawa-level pricing', () => {
    const s = suggestPriceAndRent('K2P 0A1', 'detached')!;
    expect(s.region).toBe('ottawa');
    expect(s.medianPrice).toBeLessThan(1_000_000);
  });

  it('falls back to v1 metro logic for non-ON postal codes (Vancouver)', () => {
    const s = suggestPriceAndRent('V6B 1A1', 'condo-apt');
    expect(s).not.toBeNull();
    expect(s!.region).toBeNull();
    expect(s!.regionName).toBe('Vancouver');
    expect(s!.suggestedMonthlyRent).toBeGreaterThan(0);
  });

  it('returns null for malformed postal codes', () => {
    expect(suggestPriceAndRent('', 'detached')).toBeNull();
    expect(suggestPriceAndRent('XX', 'detached')).toBeNull();
  });

  it('Downtown Toronto suggested rent for a condo-apt lands in a sane range', () => {
    const s = suggestPriceAndRent('M5V', 'condo-apt')!;
    // $805K / (22 * 12) = ~$3,049/mo. Sanity band $2,700-$3,400.
    expect(s.suggestedMonthlyRent).toBeGreaterThan(2_700);
    expect(s.suggestedMonthlyRent).toBeLessThan(3_400);
  });

  it('Downtown Toronto suggested rent for a detached lands in a sane range', () => {
    const s = suggestPriceAndRent('M5V', 'detached')!;
    // $2.4M / (33 * 12) = ~$6,061/mo. Sanity band $5,500-$6,800.
    expect(s.suggestedMonthlyRent).toBeGreaterThan(5_500);
    expect(s.suggestedMonthlyRent).toBeLessThan(6_800);
  });
});

describe('defaultInputsFor with homeType', () => {
  it('without homeType, preserves v1 defaults (maintenance 1.5%, no strata)', () => {
    const inputs = defaultInputsFor('ON');
    expect(inputs.maintenancePct).toBeCloseTo(0.015, 5);
    expect(inputs.monthlyStrataFee).toBe(0);
    expect(inputs.homeAppreciationPct).toBeCloseTo(0.03, 5);
    expect(inputs.homeType).toBeUndefined();
  });

  it('with homeType=condo-apt, merges in condo-apt defaults', () => {
    const inputs = defaultInputsFor('ON', 'condo-apt');
    const ht = homeTypeDefaults('condo-apt');
    expect(inputs.maintenancePct).toBe(ht.maintenancePct);
    expect(inputs.monthlyStrataFee).toBe(ht.monthlyStrataFee);
    expect(inputs.homeAppreciationPct).toBe(ht.homeAppreciationPct);
    expect(inputs.homeType).toBe('condo-apt');
  });

  it('with homeType=detached, no strata and higher maintenance than condo', () => {
    const condo = defaultInputsFor('ON', 'condo-apt');
    const detached = defaultInputsFor('ON', 'detached');
    expect(detached.monthlyStrataFee).toBe(0);
    expect(detached.maintenancePct).toBeGreaterThan(condo.maintenancePct);
  });
});

describe('URL state round-trip for homeType', () => {
  it('homeType encodes and decodes correctly', () => {
    const inputs = { ...defaultInputsFor('ON'), homeType: 'detached' as const };
    const params = inputsToSearchParams(inputs);
    expect(params.get('ht')).toBe('detached');

    const round = searchParamsToInputs(params);
    expect(round.homeType).toBe('detached');
  });

  it('omits homeType from the URL when undefined', () => {
    const inputs = defaultInputsFor('ON');
    const params = inputsToSearchParams(inputs);
    expect(params.get('ht')).toBeNull();
  });

  it('ignores an invalid homeType value in the URL', () => {
    const params = new URLSearchParams();
    params.set('p', 'ON');
    params.set('ht', 'mansion');
    const round = searchParamsToInputs(params);
    expect(round.homeType).toBeUndefined();
  });

  it('encodes condo-apt and round-trips back to condo-apt', () => {
    const inputs = { ...defaultInputsFor('ON'), homeType: 'condo-apt' as const };
    const round = searchParamsToInputs(inputsToSearchParams(inputs));
    expect(round.homeType).toBe('condo-apt');
  });
});
