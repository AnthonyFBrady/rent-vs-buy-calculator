// Postal-code to suggested-rent heuristic.
//
// Canadian postal codes start with a Forward Sortation Area (FSA), 3 chars
// (e.g. "M5V" for Toronto downtown). FSAs map cleanly to metro areas.
//
// Each metro has a typical price-to-rent ratio AT its median home price.
// To estimate rent for a specific home price, we adjust the P/R upward as
// price rises above the metro median and downward as it falls. The elasticity
// coefficient (~0.4) reflects that rent scales sub-linearly with home price.
//
//   adjustedPR = basePR × (homePrice / metroMedian) ^ (1 - rentElasticity)
//   suggestedMonthlyRent = homePrice / (adjustedPR × 12)
//
// Intuition: a $500K condo in Toronto rents for ~$1,800/mo (effective P/R ~23).
// A $2M house in Toronto rents for ~$5,200/mo (effective P/R ~32). Same metro,
// different P/R driven by the price tier.

import type { HomeType, Province } from './types';
import {
  ONTARIO_REGIONS,
  regionFromFSA,
  type OntarioRegion,
} from './ontarioBoroughs';

// Rent elasticity to home price ≈ 0.5 in recent Canadian metro data:
// a 1% rise in home price corresponds to ~0.5% rise in rent.
// So in P/R terms: adjustedPR = basePR × (homePrice / median) ^ (1 - 0.5).
const RENT_ELASTICITY = 0.5;
const MIN_PR = 10;
const MAX_PR = 45;

export interface RentSuggestion {
  metro: string;
  province: Province;
  /** P/R ratio adjusted for this home price tier. */
  priceToRent: number;
  /** Baseline metro P/R before the price-tier adjustment. */
  basePriceToRent: number;
  /** Metro median home price (the price tier at which basePriceToRent applies). */
  metroMedianHomePrice: number;
  suggestedMonthlyRent: number;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

interface MetroProfile {
  name: string;
  province: Province;
  /** Mid-range P/R ratio AT the metro median home price. */
  priceToRent: number;
  /** Approximate median home price for the metro (CAD). */
  medianHomePrice: number;
  /** FSA prefixes that belong to this metro. */
  fsas: readonly string[];
  /** Confidence in the P/R figure based on PWL paper coverage. */
  confidence: 'high' | 'medium' | 'low';
}

// P/R ratios + median home prices sourced from PWL 2005-2024, CREA HPI 2024-2025,
// Rentals.ca 2025-2026 reports, and CMHC market data. The P/R figure applies at
// the metro median home price. The tier adjustment handles the rest.
// Base P/R reflects CURRENT 2024-2025 market (Rentals.ca / CMHC), not the
// 20-year average from the PWL paper. The simulation can still use PWL paper
// numbers via the preset; the suggestion shows what a user could realistically
// rent for today.
const METRO_PROFILES: readonly MetroProfile[] = [
  {
    name: 'Toronto',
    province: 'ON',
    priceToRent: 26,
    medianHomePrice: 1_100_000,
    confidence: 'high',
    fsas: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
  },
  {
    name: 'Vancouver',
    province: 'BC',
    priceToRent: 30,
    medianHomePrice: 1_300_000,
    confidence: 'high',
    fsas: ['V5', 'V6', 'V7'],
  },
  {
    name: 'Victoria',
    province: 'BC',
    priceToRent: 28,
    medianHomePrice: 900_000,
    confidence: 'high',
    fsas: ['V8', 'V9'],
  },
  {
    name: 'Calgary',
    province: 'AB',
    priceToRent: 16,
    medianHomePrice: 580_000,
    confidence: 'high',
    fsas: ['T2', 'T3'],
  },
  {
    name: 'Edmonton',
    province: 'AB',
    priceToRent: 14,
    medianHomePrice: 410_000,
    confidence: 'high',
    fsas: ['T5', 'T6'],
  },
  {
    name: 'Ottawa',
    province: 'ON',
    priceToRent: 20,
    medianHomePrice: 660_000,
    confidence: 'high',
    fsas: ['K1', 'K2', 'K4'],
  },
  {
    name: 'Hamilton',
    province: 'ON',
    priceToRent: 22,
    medianHomePrice: 720_000,
    confidence: 'high',
    fsas: ['L8', 'L9'],
  },
  {
    name: 'Kitchener-Waterloo',
    province: 'ON',
    priceToRent: 22,
    medianHomePrice: 720_000,
    confidence: 'high',
    fsas: ['N2'],
  },
  {
    name: 'Montreal',
    province: 'QC',
    priceToRent: 18,
    medianHomePrice: 580_000,
    confidence: 'high',
    fsas: ['H1', 'H2', 'H3', 'H4', 'H5', 'H7', 'H8', 'H9'],
  },
  {
    name: 'Quebec City',
    province: 'QC',
    priceToRent: 15,
    medianHomePrice: 400_000,
    confidence: 'high',
    fsas: ['G1', 'G2'],
  },
  {
    name: 'Winnipeg',
    province: 'MB',
    priceToRent: 13,
    medianHomePrice: 380_000,
    confidence: 'high',
    fsas: ['R2', 'R3'],
  },
  {
    name: 'Halifax',
    province: 'NS',
    priceToRent: 18,
    medianHomePrice: 530_000,
    confidence: 'medium',
    fsas: ['B3'],
  },
  {
    name: 'Saskatoon / Regina',
    province: 'SK',
    priceToRent: 14,
    medianHomePrice: 370_000,
    confidence: 'medium',
    fsas: ['S7', 'S4'],
  },
  {
    name: 'St. John\'s',
    province: 'NL',
    priceToRent: 14,
    medianHomePrice: 330_000,
    confidence: 'low',
    fsas: ['A1'],
  },
  {
    name: 'Charlottetown',
    province: 'PE',
    priceToRent: 16,
    medianHomePrice: 390_000,
    confidence: 'low',
    fsas: ['C1'],
  },
  {
    name: 'Saint John / Moncton',
    province: 'NB',
    priceToRent: 14,
    medianHomePrice: 320_000,
    confidence: 'low',
    fsas: ['E1', 'E2'],
  },
];

interface ProvincialFallback {
  priceToRent: number;
  medianHomePrice: number;
}

const PROVINCIAL_FALLBACK: Record<Province, ProvincialFallback> = {
  ON: { priceToRent: 20, medianHomePrice: 750_000 },
  BC: { priceToRent: 26, medianHomePrice: 900_000 },
  AB: { priceToRent: 15, medianHomePrice: 480_000 },
  QC: { priceToRent: 16, medianHomePrice: 480_000 },
  MB: { priceToRent: 13, medianHomePrice: 380_000 },
  SK: { priceToRent: 14, medianHomePrice: 370_000 },
  NS: { priceToRent: 16, medianHomePrice: 450_000 },
  NB: { priceToRent: 14, medianHomePrice: 320_000 },
  NL: { priceToRent: 14, medianHomePrice: 330_000 },
  PE: { priceToRent: 15, medianHomePrice: 390_000 },
};

// First letter → province (Canada Post)
const LETTER_TO_PROVINCE: Record<string, Province> = {
  A: 'NL',
  B: 'NS',
  C: 'PE',
  E: 'NB',
  G: 'QC',
  H: 'QC',
  J: 'QC',
  K: 'ON',
  L: 'ON',
  M: 'ON',
  N: 'ON',
  P: 'ON',
  R: 'MB',
  S: 'SK',
  T: 'AB',
  V: 'BC',
};

/**
 * Normalize a Canadian postal code or FSA to its first 2 characters.
 * Strips spaces, uppercases, returns null if shape is wrong.
 */
export function normalizeFSAPrefix(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 2) return null;
  const letter = clean[0]!;
  const digit = clean[1]!;
  if (!/[A-Z]/.test(letter)) return null;
  if (!/[0-9]/.test(digit)) return null;
  return letter + digit;
}

/**
 * Normalize to a full 3-character FSA (e.g. "M5V"). Returns null if the input
 * is shorter than 3 valid chars. Used by ON borough lookup, which is more
 * granular than the v1 2-char metro lookup.
 */
export function normalizeFSA3(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 3) return null;
  const letter = clean[0]!;
  const digit = clean[1]!;
  const third = clean[2]!;
  if (!/[A-Z]/.test(letter)) return null;
  if (!/[0-9]/.test(digit)) return null;
  if (!/[A-Z]/.test(third)) return null;
  return letter + digit + third;
}

export function provinceFromPostalCode(raw: string): Province | null {
  const prefix = normalizeFSAPrefix(raw);
  if (!prefix) return null;
  const letter = prefix[0]!;
  return LETTER_TO_PROVINCE[letter] ?? null;
}

/**
 * Apply the price-tier elasticity adjustment.
 * Returns an effective P/R ratio for this specific home price.
 *
 * At median price, returned P/R = base P/R.
 * Above median, returned P/R rises (rent scales sub-linearly with price).
 * Below median, returned P/R falls.
 *
 * Clamped to [MIN_PR, MAX_PR] to avoid absurd outputs at extreme prices.
 */
function tierAdjustedPR(
  basePR: number,
  homePrice: number,
  medianHomePrice: number,
): number {
  if (medianHomePrice <= 0) return basePR;
  const priceRatio = homePrice / medianHomePrice;
  const exponent = 1 - RENT_ELASTICITY; // 0.6
  const adjusted = basePR * Math.pow(priceRatio, exponent);
  return Math.max(MIN_PR, Math.min(MAX_PR, adjusted));
}

/**
 * Suggest an equivalent monthly rent for a specific home price in a specific
 * postal code area. The rent reflects the price tier: a $500K condo and a $2M
 * house in the same metro produce different rents because rent scales
 * sub-linearly with home price.
 *
 * Returns null if the postal code shape is invalid. Falls back to provincial
 * averages if the FSA does not match a specific metro.
 */
export function suggestRent(
  homePrice: number,
  postalCodeOrFSA: string,
): RentSuggestion | null {
  if (!Number.isFinite(homePrice) || homePrice <= 0) return null;

  const prefix = normalizeFSAPrefix(postalCodeOrFSA);
  if (!prefix) return null;

  // Match against metro FSAs first.
  for (const metro of METRO_PROFILES) {
    if (metro.fsas.includes(prefix)) {
      const adjustedPR = tierAdjustedPR(
        metro.priceToRent,
        homePrice,
        metro.medianHomePrice,
      );
      return {
        metro: metro.name,
        province: metro.province,
        priceToRent: round1(adjustedPR),
        basePriceToRent: metro.priceToRent,
        metroMedianHomePrice: metro.medianHomePrice,
        suggestedMonthlyRent: homePrice / (adjustedPR * 12),
        source:
          'PWL Capital 2005-2024 baseline, CREA HPI 2024-2025, Rentals.ca / CMHC',
        confidence: metro.confidence,
      };
    }
  }

  // Fall back to provincial average.
  const province = provinceFromPostalCode(postalCodeOrFSA);
  if (!province) return null;

  const fallback = PROVINCIAL_FALLBACK[province];
  const adjustedPR = tierAdjustedPR(
    fallback.priceToRent,
    homePrice,
    fallback.medianHomePrice,
  );
  return {
    metro: `${province} (provincial average)`,
    province,
    priceToRent: round1(adjustedPR),
    basePriceToRent: fallback.priceToRent,
    metroMedianHomePrice: fallback.medianHomePrice,
    suggestedMonthlyRent: homePrice / (adjustedPR * 12),
    source: 'Provincial average — postal code outside primary metros',
    confidence: 'low',
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface PriceAndRentSuggestion {
  region: OntarioRegion | null;
  /** Display name of the region. Falls back to metro / province for non-ON. */
  regionName: string;
  homeType: HomeType;
  medianPrice: number;
  suggestedMonthlyRent: number;
  priceToRent: number;
  source: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * v2.1 borough-aware suggestion. Routes Ontario postal codes through the
 * `ontarioBoroughs` table to return a structure-type-specific median price
 * AND suggested rent. Non-ON postal codes fall back to `suggestRent()`
 * using the home type to pick a reasonable home-price tier from the v1
 * provincial fallback.
 *
 * Returns null only if the postal code shape is invalid.
 */
export function suggestPriceAndRent(
  postalCodeOrFSA: string,
  homeType: HomeType,
): PriceAndRentSuggestion | null {
  const fsa3 = normalizeFSA3(postalCodeOrFSA);

  if (fsa3) {
    const region = regionFromFSA(fsa3);
    if (region) {
      const profile = ONTARIO_REGIONS[region];
      const medianPrice = profile.medianPriceByType[homeType];
      const priceToRent = profile.priceToRentByType[homeType];
      const suggestedMonthlyRent = medianPrice / (priceToRent * 12);
      return {
        region,
        regionName: profile.name,
        homeType,
        medianPrice,
        suggestedMonthlyRent,
        priceToRent,
        source: profile.source,
        confidence: 'high',
      };
    }
  }

  // Non-ON fallback: use the v1 metro-or-province price-tier model, seeded
  // with a reasonable starting home price for the chosen type.
  const seedHomePrice = nonOntarioSeedPrice(homeType);
  const v1 = suggestRent(seedHomePrice, postalCodeOrFSA);
  if (!v1) return null;

  return {
    region: null,
    regionName: v1.metro,
    homeType,
    medianPrice: seedHomePrice,
    suggestedMonthlyRent: v1.suggestedMonthlyRent,
    priceToRent: v1.priceToRent,
    source: v1.source,
    confidence: v1.confidence,
  };
}

// Non-ON seed prices. Rough national median by home type, used only when the
// caller has not yet supplied a home price for non-ON locations. v2.1 is
// Ontario-only at launch, so this is a safety net, not a feature.
function nonOntarioSeedPrice(homeType: HomeType): number {
  switch (homeType) {
    case 'condo-apt':
      return 500_000;
    case 'condo-townhouse':
      return 600_000;
    case 'freehold-townhouse':
      return 700_000;
    case 'semi-detached':
      return 800_000;
    case 'detached':
      return 900_000;
  }
}
