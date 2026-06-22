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
import { getMunicipalProfile } from './data/regions/municipal';
export { getMunicipalProfile, type MunicipalProfile } from './data/regions/municipal';

export const POSTAL_CODE_METADATA = {
  asOf: '2025-01',
  source: 'CREA HPI 2024-2025, CMHC RMR 2024, Rentals.ca 2025',
  nextRefresh: '2026-09',
};

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
  /** Approximate median home price for the metro (CAD) — all types blended. */
  medianHomePrice: number;
  /** Per home-type median prices. When present, used instead of nonOntarioSeedPrice. */
  medianPriceByType?: Partial<Record<HomeType, number>>;
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
// FSA entries may be 2-char prefix (e.g. 'M5') or 3-char full FSA (e.g. 'V9R').
// 3-char entries take precedence and allow precise sub-prefix matching in dense
// markets (BC interior, NB cities) where a 2-char prefix spans multiple metros.
// When multiple entries could match, order here is significant: first match wins.
const METRO_PROFILES: readonly MetroProfile[] = [
  // ── Ontario ───────────────────────────────────────────────────────────────
  // Toronto, Ottawa, Hamilton, KW are handled by ontarioBoroughs at 3-char FSA
  // resolution and only reach this list as a fallback. Secondary ON markets
  // below are not yet in ontarioBoroughs so they rely on this list entirely.
  // 3-char FSAs are used where the 2-char prefix spans multiple municipalities.
  {
    // L4M, L4N = Barrie urban. L4B/C = Richmond Hill; L4S = Richmond Hill.
    name: 'Barrie',
    province: 'ON',
    priceToRent: 23,
    medianHomePrice: 740_000,
    confidence: 'medium',
    fsas: ['L4M', 'L4N', 'L4R'],
    medianPriceByType: {
      'condo-apt': 520_000,
      'condo-townhouse': 640_000,
      'freehold-townhouse': 740_000,
      'semi-detached': 820_000,
      'detached': 960_000,
    },
  },
  {
    name: 'Guelph',
    province: 'ON',
    priceToRent: 22,
    medianHomePrice: 710_000,
    confidence: 'medium',
    fsas: ['N1E', 'N1G', 'N1H', 'N1K', 'N1L'],
    medianPriceByType: {
      'condo-apt': 490_000,
      'condo-townhouse': 610_000,
      'freehold-townhouse': 710_000,
      'semi-detached': 790_000,
      'detached': 940_000,
    },
  },
  {
    // L1G, L1H, L1J, L1K, L1L = Oshawa. L1V–L1Z = Pickering/Ajax/Whitby.
    name: 'Oshawa / Durham',
    province: 'ON',
    priceToRent: 22,
    medianHomePrice: 730_000,
    confidence: 'medium',
    fsas: ['L1G', 'L1H', 'L1J', 'L1K', 'L1L', 'L1V', 'L1W', 'L1X', 'L1Y', 'L1Z'],
    medianPriceByType: {
      'condo-apt': 490_000,
      'condo-townhouse': 610_000,
      'freehold-townhouse': 720_000,
      'semi-detached': 810_000,
      'detached': 950_000,
    },
  },
  {
    name: 'St. Catharines / Niagara',
    province: 'ON',
    priceToRent: 21,
    medianHomePrice: 650_000,
    confidence: 'medium',
    fsas: ['L2M', 'L2N', 'L2P', 'L2R', 'L2S', 'L2T', 'L2W'],
    medianPriceByType: {
      'condo-apt': 440_000,
      'condo-townhouse': 560_000,
      'freehold-townhouse': 660_000,
      'semi-detached': 750_000,
      'detached': 880_000,
    },
  },
  {
    name: 'Peterborough',
    province: 'ON',
    priceToRent: 20,
    medianHomePrice: 600_000,
    confidence: 'medium',
    fsas: ['K9H', 'K9J', 'K9K', 'K9L'],
    medianPriceByType: {
      'condo-apt': 400_000,
      'condo-townhouse': 500_000,
      'freehold-townhouse': 600_000,
      'semi-detached': 680_000,
      'detached': 820_000,
    },
  },
  {
    name: 'Sudbury',
    province: 'ON',
    priceToRent: 15,
    medianHomePrice: 430_000,
    confidence: 'medium',
    fsas: ['P3A', 'P3B', 'P3C', 'P3E'],
    medianPriceByType: {
      'condo-apt': 290_000,
      'condo-townhouse': 360_000,
      'freehold-townhouse': 430_000,
      'semi-detached': 490_000,
      'detached': 580_000,
    },
  },
  {
    name: 'Thunder Bay',
    province: 'ON',
    priceToRent: 13,
    medianHomePrice: 360_000,
    confidence: 'medium',
    fsas: ['P7A', 'P7B', 'P7C', 'P7E'],
    medianPriceByType: {
      'condo-apt': 240_000,
      'condo-townhouse': 300_000,
      'freehold-townhouse': 360_000,
      'semi-detached': 410_000,
      'detached': 460_000,
    },
  },
  {
    name: 'Toronto',
    province: 'ON',
    priceToRent: 26,
    medianHomePrice: 1_100_000,
    confidence: 'high',
    fsas: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
    medianPriceByType: {
      'condo-apt': 720_000,
      'condo-townhouse': 900_000,
      'freehold-townhouse': 1_050_000,
      'semi-detached': 1_200_000,
      'detached': 1_600_000,
    },
  },
  {
    name: 'Ottawa',
    province: 'ON',
    priceToRent: 20,
    medianHomePrice: 660_000,
    confidence: 'high',
    fsas: ['K1', 'K2', 'K4'],
    medianPriceByType: {
      'condo-apt': 420_000,
      'condo-townhouse': 530_000,
      'freehold-townhouse': 640_000,
      'semi-detached': 720_000,
      'detached': 850_000,
    },
  },
  {
    name: 'Hamilton',
    province: 'ON',
    priceToRent: 22,
    medianHomePrice: 720_000,
    confidence: 'high',
    fsas: ['L8', 'L9'],
    medianPriceByType: {
      'condo-apt': 480_000,
      'condo-townhouse': 600_000,
      'freehold-townhouse': 700_000,
      'semi-detached': 780_000,
      'detached': 920_000,
    },
  },
  {
    name: 'Kitchener-Waterloo',
    province: 'ON',
    priceToRent: 22,
    medianHomePrice: 720_000,
    confidence: 'high',
    fsas: ['N2'],
    medianPriceByType: {
      'condo-apt': 470_000,
      'condo-townhouse': 590_000,
      'freehold-townhouse': 690_000,
      'semi-detached': 770_000,
      'detached': 920_000,
    },
  },
  // ── British Columbia ───────────────────────────────────────────────────────
  {
    name: 'Vancouver',
    province: 'BC',
    priceToRent: 30,
    medianHomePrice: 1_300_000,
    confidence: 'high',
    fsas: ['V5', 'V6', 'V7'],
    medianPriceByType: {
      'condo-apt': 820_000,
      'condo-townhouse': 950_000,
      'freehold-townhouse': 1_100_000,
      'semi-detached': 1_400_000,
      'detached': 2_200_000,
    },
  },
  {
    name: 'Kelowna',
    province: 'BC',
    priceToRent: 26,
    medianHomePrice: 850_000,
    confidence: 'medium',
    // 3-char FSAs: V1Y, V1X, V1V = Kelowna urban; V4T = West Kelowna
    fsas: ['V1Y', 'V1X', 'V1V', 'V4T'],
    medianPriceByType: {
      'condo-apt': 550_000,
      'condo-townhouse': 680_000,
      'freehold-townhouse': 780_000,
      'semi-detached': 870_000,
      'detached': 1_100_000,
    },
  },
  {
    name: 'Abbotsford / Mission',
    province: 'BC',
    priceToRent: 24,
    medianHomePrice: 780_000,
    confidence: 'medium',
    // 3-char: V2S, V2T, V3G = Abbotsford; V2V = Mission
    fsas: ['V2S', 'V2T', 'V2V', 'V3G'],
    medianPriceByType: {
      'condo-apt': 530_000,
      'condo-townhouse': 660_000,
      'freehold-townhouse': 780_000,
      'semi-detached': 890_000,
      'detached': 1_100_000,
    },
  },
  {
    name: 'Chilliwack',
    province: 'BC',
    priceToRent: 22,
    medianHomePrice: 650_000,
    confidence: 'medium',
    fsas: ['V2P', 'V2R'],
    medianPriceByType: {
      'condo-apt': 440_000,
      'condo-townhouse': 550_000,
      'freehold-townhouse': 660_000,
      'semi-detached': 750_000,
      'detached': 900_000,
    },
  },
  {
    name: 'Kamloops',
    province: 'BC',
    priceToRent: 22,
    medianHomePrice: 570_000,
    confidence: 'medium',
    fsas: ['V2B', 'V2C', 'V2E', 'V2H'],
    medianPriceByType: {
      'condo-apt': 380_000,
      'condo-townhouse': 480_000,
      'freehold-townhouse': 580_000,
      'semi-detached': 660_000,
      'detached': 780_000,
    },
  },
  // Nanaimo 3-char FSAs listed before Victoria so V9R/V9S/V9T match Nanaimo,
  // while V9A, V9B, V9C (Greater Victoria) fall through to the Victoria entry.
  {
    name: 'Nanaimo',
    province: 'BC',
    priceToRent: 25,
    medianHomePrice: 720_000,
    confidence: 'medium',
    fsas: ['V9R', 'V9S', 'V9T', 'V9V'],
    medianPriceByType: {
      'condo-apt': 490_000,
      'condo-townhouse': 620_000,
      'freehold-townhouse': 720_000,
      'semi-detached': 820_000,
      'detached': 1_050_000,
    },
  },
  {
    name: 'Victoria',
    province: 'BC',
    priceToRent: 28,
    medianHomePrice: 900_000,
    confidence: 'high',
    fsas: ['V8', 'V9'],
    medianPriceByType: {
      'condo-apt': 600_000,
      'condo-townhouse': 720_000,
      'freehold-townhouse': 850_000,
      'semi-detached': 980_000,
      'detached': 1_300_000,
    },
  },
  {
    name: 'Prince George',
    province: 'BC',
    priceToRent: 16,
    medianHomePrice: 390_000,
    confidence: 'low',
    fsas: ['V2L', 'V2M', 'V2N'],
    medianPriceByType: {
      'condo-apt': 280_000,
      'condo-townhouse': 340_000,
      'freehold-townhouse': 400_000,
      'semi-detached': 450_000,
      'detached': 520_000,
    },
  },
  // ── Alberta ───────────────────────────────────────────────────────────────
  {
    name: 'Calgary',
    province: 'AB',
    priceToRent: 16,
    medianHomePrice: 580_000,
    confidence: 'high',
    fsas: ['T2', 'T3'],
    medianPriceByType: {
      'condo-apt': 350_000,
      'condo-townhouse': 430_000,
      'freehold-townhouse': 550_000,
      'semi-detached': 650_000,
      'detached': 780_000,
    },
  },
  {
    name: 'Edmonton',
    province: 'AB',
    priceToRent: 14,
    medianHomePrice: 410_000,
    confidence: 'high',
    fsas: ['T5', 'T6'],
    medianPriceByType: {
      'condo-apt': 230_000,
      'condo-townhouse': 300_000,
      'freehold-townhouse': 380_000,
      'semi-detached': 450_000,
      'detached': 520_000,
    },
  },
  {
    // T4N, T4P, T4R, T4S are Red Deer urban core. T4A/T4B/T4C are Calgary satellites.
    name: 'Red Deer',
    province: 'AB',
    priceToRent: 13,
    medianHomePrice: 340_000,
    confidence: 'low',
    fsas: ['T4N', 'T4P', 'T4R', 'T4S'],
    medianPriceByType: {
      'condo-apt': 210_000,
      'condo-townhouse': 270_000,
      'freehold-townhouse': 330_000,
      'semi-detached': 380_000,
      'detached': 450_000,
    },
  },
  {
    name: 'Lethbridge',
    province: 'AB',
    priceToRent: 12,
    medianHomePrice: 310_000,
    confidence: 'low',
    fsas: ['T1H', 'T1J', 'T1K'],
    medianPriceByType: {
      'condo-apt': 190_000,
      'condo-townhouse': 240_000,
      'freehold-townhouse': 300_000,
      'semi-detached': 350_000,
      'detached': 420_000,
    },
  },
  // ── Quebec ────────────────────────────────────────────────────────────────
  {
    name: 'Montreal',
    province: 'QC',
    priceToRent: 18,
    medianHomePrice: 580_000,
    confidence: 'high',
    fsas: ['H1', 'H2', 'H3', 'H4', 'H5', 'H7', 'H8', 'H9'],
    medianPriceByType: {
      'condo-apt': 430_000,
      'condo-townhouse': 530_000,
      'freehold-townhouse': 620_000,
      'semi-detached': 680_000,
      'detached': 800_000,
    },
  },
  {
    name: 'Quebec City',
    province: 'QC',
    priceToRent: 15,
    medianHomePrice: 400_000,
    confidence: 'high',
    // G3 adds western suburbs (Cap-Rouge, Sillery, Val-Bélair)
    fsas: ['G1', 'G2', 'G3'],
    medianPriceByType: {
      'condo-apt': 260_000,
      'condo-townhouse': 320_000,
      'freehold-townhouse': 390_000,
      'semi-detached': 440_000,
      'detached': 530_000,
    },
  },
  {
    name: 'Sherbrooke',
    province: 'QC',
    priceToRent: 15,
    medianHomePrice: 420_000,
    confidence: 'low',
    fsas: ['J1E', 'J1G', 'J1H', 'J1J', 'J1K', 'J1L', 'J1M', 'J1N'],
    medianPriceByType: {
      'condo-apt': 280_000,
      'condo-townhouse': 350_000,
      'freehold-townhouse': 420_000,
      'semi-detached': 470_000,
      'detached': 560_000,
    },
  },
  {
    name: 'Trois-Rivières',
    province: 'QC',
    priceToRent: 13,
    medianHomePrice: 350_000,
    confidence: 'low',
    fsas: ['G8T', 'G8V', 'G8W', 'G8Y', 'G8Z'],
    medianPriceByType: {
      'condo-apt': 230_000,
      'condo-townhouse': 290_000,
      'freehold-townhouse': 350_000,
      'semi-detached': 400_000,
      'detached': 470_000,
    },
  },
  {
    name: 'Saguenay',
    province: 'QC',
    priceToRent: 12,
    medianHomePrice: 330_000,
    confidence: 'low',
    fsas: ['G7'],
    medianPriceByType: {
      'condo-apt': 210_000,
      'condo-townhouse': 260_000,
      'freehold-townhouse': 320_000,
      'semi-detached': 370_000,
      'detached': 440_000,
    },
  },
  // ── Manitoba ──────────────────────────────────────────────────────────────
  {
    name: 'Winnipeg',
    province: 'MB',
    priceToRent: 13,
    medianHomePrice: 380_000,
    confidence: 'high',
    fsas: ['R2', 'R3'],
    medianPriceByType: {
      'condo-apt': 230_000,
      'condo-townhouse': 300_000,
      'freehold-townhouse': 370_000,
      'semi-detached': 420_000,
      'detached': 500_000,
    },
  },
  {
    name: 'Brandon',
    province: 'MB',
    priceToRent: 11,
    medianHomePrice: 290_000,
    confidence: 'low',
    fsas: ['R7'],
    medianPriceByType: {
      'condo-apt': 190_000,
      'condo-townhouse': 230_000,
      'freehold-townhouse': 280_000,
      'semi-detached': 320_000,
      'detached': 380_000,
    },
  },
  // ── Saskatchewan ──────────────────────────────────────────────────────────
  {
    name: 'Saskatoon',
    province: 'SK',
    priceToRent: 14,
    medianHomePrice: 390_000,
    confidence: 'medium',
    fsas: ['S7'],
    medianPriceByType: {
      'condo-apt': 250_000,
      'condo-townhouse': 310_000,
      'freehold-townhouse': 370_000,
      'semi-detached': 430_000,
      'detached': 510_000,
    },
  },
  {
    name: 'Regina',
    province: 'SK',
    priceToRent: 13,
    medianHomePrice: 350_000,
    confidence: 'medium',
    fsas: ['S4'],
    medianPriceByType: {
      'condo-apt': 220_000,
      'condo-townhouse': 280_000,
      'freehold-townhouse': 330_000,
      'semi-detached': 390_000,
      'detached': 470_000,
    },
  },
  {
    // S6V, S6W, S6X = Prince Albert urban. S6H, S6J = Moose Jaw.
    name: 'Prince Albert',
    province: 'SK',
    priceToRent: 10,
    medianHomePrice: 250_000,
    confidence: 'low',
    fsas: ['S6V', 'S6W', 'S6X'],
    medianPriceByType: {
      'condo-apt': 160_000,
      'condo-townhouse': 200_000,
      'freehold-townhouse': 250_000,
      'semi-detached': 290_000,
      'detached': 340_000,
    },
  },
  // ── Nova Scotia ───────────────────────────────────────────────────────────
  {
    name: 'Halifax',
    province: 'NS',
    priceToRent: 18,
    medianHomePrice: 530_000,
    confidence: 'medium',
    fsas: ['B3'],
    medianPriceByType: {
      'condo-apt': 360_000,
      'condo-townhouse': 450_000,
      'freehold-townhouse': 540_000,
      'semi-detached': 610_000,
      'detached': 680_000,
    },
  },
  {
    name: 'Sydney / Cape Breton',
    province: 'NS',
    priceToRent: 12,
    medianHomePrice: 310_000,
    confidence: 'low',
    fsas: ['B1'],
    medianPriceByType: {
      'condo-apt': 200_000,
      'condo-townhouse': 250_000,
      'freehold-townhouse': 300_000,
      'semi-detached': 340_000,
      'detached': 400_000,
    },
  },
  // ── New Brunswick ─────────────────────────────────────────────────────────
  {
    name: 'Moncton',
    province: 'NB',
    priceToRent: 14,
    medianHomePrice: 300_000,
    confidence: 'low',
    fsas: ['E1'],
    medianPriceByType: {
      'condo-apt': 220_000,
      'condo-townhouse': 270_000,
      'freehold-townhouse': 310_000,
      'semi-detached': 360_000,
      'detached': 410_000,
    },
  },
  {
    // E2J–E2M = Saint John urban. E2E, E2G, E2H = Sussex / Hampton (rural).
    name: 'Saint John',
    province: 'NB',
    priceToRent: 13,
    medianHomePrice: 270_000,
    confidence: 'low',
    fsas: ['E2J', 'E2K', 'E2L', 'E2M'],
    medianPriceByType: {
      'condo-apt': 200_000,
      'condo-townhouse': 245_000,
      'freehold-townhouse': 285_000,
      'semi-detached': 325_000,
      'detached': 390_000,
    },
  },
  {
    name: 'Fredericton',
    province: 'NB',
    priceToRent: 14,
    medianHomePrice: 370_000,
    confidence: 'low',
    fsas: ['E3'],
    medianPriceByType: {
      'condo-apt': 250_000,
      'condo-townhouse': 300_000,
      'freehold-townhouse': 360_000,
      'semi-detached': 410_000,
      'detached': 490_000,
    },
  },
  // ── Newfoundland ──────────────────────────────────────────────────────────
  {
    name: 'St. John\'s',
    province: 'NL',
    priceToRent: 14,
    medianHomePrice: 330_000,
    confidence: 'low',
    fsas: ['A1'],
    medianPriceByType: {
      'condo-apt': 210_000,
      'condo-townhouse': 260_000,
      'freehold-townhouse': 310_000,
      'semi-detached': 360_000,
      'detached': 430_000,
    },
  },
  {
    name: 'Corner Brook',
    province: 'NL',
    priceToRent: 11,
    medianHomePrice: 220_000,
    confidence: 'low',
    fsas: ['A2H'],
    medianPriceByType: {
      'condo-apt': 160_000,
      'condo-townhouse': 200_000,
      'freehold-townhouse': 240_000,
      'semi-detached': 280_000,
      'detached': 320_000,
    },
  },
  // ── Prince Edward Island ──────────────────────────────────────────────────
  {
    name: 'Charlottetown',
    province: 'PE',
    priceToRent: 16,
    medianHomePrice: 390_000,
    confidence: 'low',
    fsas: ['C1'],
    medianPriceByType: {
      'condo-apt': 250_000,
      'condo-townhouse': 310_000,
      'freehold-townhouse': 380_000,
      'semi-detached': 430_000,
      'detached': 520_000,
    },
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

  const fsa3 = normalizeFSA3(postalCodeOrFSA);

  // Match against metro FSAs. Entries may be 2-char prefix or 3-char FSA.
  // 3-char entries are tested against the full FSA; 2-char against the prefix.
  for (const metro of METRO_PROFILES) {
    const matched = metro.fsas.some(f =>
      f.length === 3 ? f === fsa3 : f === prefix,
    );
    if (matched) {
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
  /** Municipal property tax rate, if a matching profile was found. */
  propertyTaxPct?: number;
  /** Whether this municipality charges a second municipal LTT (Toronto only). */
  municipalLTT?: boolean;
  /** Regional insurance escalation factor above inflation. */
  insuranceEscalationOverInflationPct?: number;
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

  // Municipal lookup — runs for all postal codes, supplements price/rent data.
  const municipal = getMunicipalProfile(postalCodeOrFSA);
  const municipalExtras = municipal
    ? {
        propertyTaxPct: municipal.propertyTaxPct,
        municipalLTT: municipal.municipalLTT,
        insuranceEscalationOverInflationPct: municipal.insuranceEscalationOverInflationPct,
      }
    : {};

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
        ...municipalExtras,
      };
    }
  }

  // Non-ON fallback: prefer the metro's per-type median price if available,
  // otherwise fall back to national type-tier seeds.
  const prefix2 = normalizeFSAPrefix(postalCodeOrFSA);
  const fsa3check = normalizeFSA3(postalCodeOrFSA);
  let seedHomePrice = nonOntarioSeedPrice(homeType);
  for (const metro of METRO_PROFILES) {
    const matched = metro.fsas.some(f =>
      f.length === 3 ? f === fsa3check : f === prefix2,
    );
    if (matched && metro.medianPriceByType?.[homeType] != null) {
      seedHomePrice = metro.medianPriceByType[homeType]!;
      break;
    }
  }

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
    ...municipalExtras,
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
