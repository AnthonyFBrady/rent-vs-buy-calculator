// Ontario regions: median price + price-to-rent ratio by home type.
//
// Used by `suggestPriceAndRent(postalCode, homeType)` so the user lands at
// "for a {condo-apt} in {Toronto}, the median is {$680K} and the median rent is
// {$2,800/mo}" instead of a generic Canadian average.
//
// Coverage at v2.1 launch: 14 ON regions (GTA + major ON metros). Other
// provinces fall back to the v1 metro list via `suggestRent()`.
//
// Median prices: TRREB Q4-2024 by region + structure type. CREA HPI April 2025
// composite benchmarks. Where regional structure-type splits are not directly
// published, derived from regional benchmark × CREA structure-mix ratio.
//
// Price-to-rent ratios: implied from observed median rents in Rentals.ca
// November 2024 Rent Report and CMHC Rental Market Report October 2024 (1- /
// 2- / 3-bedroom medians mapped to the closest structure equivalent). The P/R
// applies at the listed median price for that structure type in that region.
//
// All numbers are 2024-2025 approximations. The user can override every value
// in /situation. The default is meant to be defensible at v2.1 launch, not
// surgically precise. The methodology page surfaces the source for each.
//
// Last verified: 2026-06-05.

import type { HomeType } from './types';

export const ONTARIO_BOROUGHS_METADATA = {
  asOf: '2025-04',
  source: 'TRREB Q4-2024, CREA HPI April 2025, Rentals.ca Nov 2024, CMHC RMR Oct 2024',
  nextRefresh: '2026-09', // Target quarterly refresh: Sept 2026
};

export type OntarioRegion =
  | 'toronto-downtown'
  | 'toronto-east'
  | 'toronto-west'
  | 'toronto-north-york'
  | 'toronto-scarborough'
  | 'toronto-etobicoke'
  | 'mississauga'
  | 'brampton'
  | 'markham'
  | 'vaughan'
  | 'richmond-hill'
  | 'oakville'
  | 'burlington'
  | 'hamilton'
  | 'ottawa'
  | 'kitchener-waterloo'
  | 'london'
  | 'windsor'
  | 'kingston';

export interface RegionProfile {
  region: OntarioRegion;
  name: string;
  /** Median home price by home type, CAD. */
  medianPriceByType: Record<HomeType, number>;
  /** Price-to-rent ratio at the median price for each home type. */
  priceToRentByType: Record<HomeType, number>;
  /** Representative FSAs (Forward Sortation Area prefixes) for this region. */
  fsas: readonly string[];
  /** Default home type to seed when this region is detected. */
  defaultHomeType: HomeType;
  /** Citation string surfaced in the UI. */
  source: string;
}

const TRREB_SOURCE =
  'TRREB Q4-2024 + CREA HPI April 2025; rents from Rentals.ca Nov-2024 + CMHC RMR Oct-2024';

const CREA_SOURCE =
  'CREA HPI April 2025 (regional benchmark); rents from Rentals.ca Nov-2024 + CMHC RMR Oct-2024';

export const ONTARIO_REGIONS: Record<OntarioRegion, RegionProfile> = {
  'toronto-downtown': {
    region: 'toronto-downtown',
    name: 'Downtown Toronto',
    // M5 covers the financial district, King West, Yorkville, midtown. Premium pricing.
    medianPriceByType: {
      'condo-apt': 805_000,
      'condo-townhouse': 1_000_000,
      'freehold-townhouse': 1_350_000,
      'semi-detached': 1_550_000,
      detached: 2_400_000,
    },
    priceToRentByType: {
      'condo-apt': 22,
      'condo-townhouse': 24,
      'freehold-townhouse': 27,
      'semi-detached': 30,
      detached: 33,
    },
    fsas: ['M5'],
    defaultHomeType: 'condo-apt',
    source: TRREB_SOURCE,
  },
  'toronto-east': {
    region: 'toronto-east',
    name: 'East End Toronto',
    // M4 covers East York, Leslieville, Riverdale, the Beach, Don Mills.
    medianPriceByType: {
      'condo-apt': 680_000,
      'condo-townhouse': 820_000,
      'freehold-townhouse': 1_100_000,
      'semi-detached': 1_250_000,
      detached: 1_650_000,
    },
    priceToRentByType: {
      'condo-apt': 21,
      'condo-townhouse': 22,
      'freehold-townhouse': 25,
      'semi-detached': 28,
      detached: 30,
    },
    fsas: ['M4'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  'toronto-west': {
    region: 'toronto-west',
    name: 'West End Toronto',
    // M6 covers Trinity-Bellwoods, Roncesvalles, High Park, Junction, York.
    medianPriceByType: {
      'condo-apt': 695_000,
      'condo-townhouse': 835_000,
      'freehold-townhouse': 1_120_000,
      'semi-detached': 1_300_000,
      detached: 1_720_000,
    },
    priceToRentByType: {
      'condo-apt': 21,
      'condo-townhouse': 22,
      'freehold-townhouse': 25,
      'semi-detached': 28,
      detached: 30,
    },
    fsas: ['M6'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  'toronto-north-york': {
    region: 'toronto-north-york',
    name: 'North York',
    // M2 = Willowdale, M3 = Downsview, Bathurst Manor.
    medianPriceByType: {
      'condo-apt': 620_000,
      'condo-townhouse': 760_000,
      'freehold-townhouse': 1_050_000,
      'semi-detached': 1_180_000,
      detached: 1_550_000,
    },
    priceToRentByType: {
      'condo-apt': 21,
      'condo-townhouse': 22,
      'freehold-townhouse': 25,
      'semi-detached': 28,
      detached: 30,
    },
    fsas: ['M2', 'M3'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  'toronto-scarborough': {
    region: 'toronto-scarborough',
    name: 'Scarborough',
    // M1 covers all of Scarborough.
    medianPriceByType: {
      'condo-apt': 550_000,
      'condo-townhouse': 680_000,
      'freehold-townhouse': 850_000,
      'semi-detached': 980_000,
      detached: 1_150_000,
    },
    priceToRentByType: {
      'condo-apt': 19,
      'condo-townhouse': 21,
      'freehold-townhouse': 23,
      'semi-detached': 25,
      detached: 27,
    },
    fsas: ['M1'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  'toronto-etobicoke': {
    region: 'toronto-etobicoke',
    name: 'Etobicoke',
    // M8 = Mimico, Long Branch, New Toronto. M9 = Rexdale, Humber, Kipling.
    medianPriceByType: {
      'condo-apt': 580_000,
      'condo-townhouse': 720_000,
      'freehold-townhouse': 950_000,
      'semi-detached': 1_100_000,
      detached: 1_350_000,
    },
    priceToRentByType: {
      'condo-apt': 20,
      'condo-townhouse': 22,
      'freehold-townhouse': 24,
      'semi-detached': 26,
      detached: 28,
    },
    fsas: ['M8', 'M9'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  mississauga: {
    region: 'mississauga',
    name: 'Mississauga',
    medianPriceByType: {
      'condo-apt': 635_000,
      'condo-townhouse': 770_000,
      'freehold-townhouse': 1_020_000,
      'semi-detached': 1_140_000,
      detached: 1_445_000,
    },
    priceToRentByType: {
      'condo-apt': 20,
      'condo-townhouse': 22,
      'freehold-townhouse': 24,
      'semi-detached': 26,
      detached: 28,
    },
    fsas: ['L4T', 'L4V', 'L4W', 'L4X', 'L4Y', 'L4Z', 'L5A', 'L5B', 'L5C', 'L5E', 'L5G', 'L5H', 'L5J', 'L5K', 'L5L', 'L5M', 'L5N', 'L5P', 'L5R', 'L5S', 'L5T', 'L5V', 'L5W'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  brampton: {
    region: 'brampton',
    name: 'Brampton',
    medianPriceByType: {
      'condo-apt': 520_000,
      'condo-townhouse': 670_000,
      'freehold-townhouse': 880_000,
      'semi-detached': 1_010_000,
      detached: 1_250_000,
    },
    priceToRentByType: {
      'condo-apt': 19,
      'condo-townhouse': 21,
      'freehold-townhouse': 23,
      'semi-detached': 25,
      detached: 27,
    },
    fsas: ['L6P', 'L6R', 'L6S', 'L6T', 'L6V', 'L6W', 'L6X', 'L6Y', 'L6Z', 'L7A'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  markham: {
    region: 'markham',
    name: 'Markham',
    medianPriceByType: {
      'condo-apt': 720_000,
      'condo-townhouse': 880_000,
      'freehold-townhouse': 1_150_000,
      'semi-detached': 1_280_000,
      detached: 1_720_000,
    },
    priceToRentByType: {
      'condo-apt': 22,
      'condo-townhouse': 24,
      'freehold-townhouse': 26,
      'semi-detached': 28,
      detached: 31,
    },
    fsas: ['L3P', 'L3R', 'L3S', 'L3T', 'L6B', 'L6C', 'L6E', 'L6G'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  vaughan: {
    region: 'vaughan',
    name: 'Vaughan',
    medianPriceByType: {
      'condo-apt': 720_000,
      'condo-townhouse': 880_000,
      'freehold-townhouse': 1_180_000,
      'semi-detached': 1_300_000,
      detached: 1_760_000,
    },
    priceToRentByType: {
      'condo-apt': 22,
      'condo-townhouse': 24,
      'freehold-townhouse': 26,
      'semi-detached': 28,
      detached: 31,
    },
    fsas: ['L4H', 'L4J', 'L4K', 'L4L', 'L6A'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  'richmond-hill': {
    region: 'richmond-hill',
    name: 'Richmond Hill',
    medianPriceByType: {
      'condo-apt': 705_000,
      'condo-townhouse': 870_000,
      'freehold-townhouse': 1_170_000,
      'semi-detached': 1_310_000,
      detached: 1_850_000,
    },
    priceToRentByType: {
      'condo-apt': 22,
      'condo-townhouse': 24,
      'freehold-townhouse': 26,
      'semi-detached': 28,
      detached: 32,
    },
    fsas: ['L4B', 'L4C', 'L4E', 'L4S'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  oakville: {
    region: 'oakville',
    name: 'Oakville',
    medianPriceByType: {
      'condo-apt': 755_000,
      'condo-townhouse': 920_000,
      'freehold-townhouse': 1_220_000,
      'semi-detached': 1_360_000,
      detached: 1_850_000,
    },
    priceToRentByType: {
      'condo-apt': 22,
      'condo-townhouse': 24,
      'freehold-townhouse': 26,
      'semi-detached': 28,
      detached: 31,
    },
    fsas: ['L6H', 'L6J', 'L6K', 'L6L', 'L6M'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  burlington: {
    region: 'burlington',
    name: 'Burlington',
    medianPriceByType: {
      'condo-apt': 640_000,
      'condo-townhouse': 790_000,
      'freehold-townhouse': 1_040_000,
      'semi-detached': 1_160_000,
      detached: 1_450_000,
    },
    priceToRentByType: {
      'condo-apt': 21,
      'condo-townhouse': 23,
      'freehold-townhouse': 25,
      'semi-detached': 27,
      detached: 29,
    },
    fsas: ['L7L', 'L7M', 'L7N', 'L7P', 'L7R', 'L7S', 'L7T'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  hamilton: {
    region: 'hamilton',
    name: 'Hamilton',
    medianPriceByType: {
      'condo-apt': 500_000,
      'condo-townhouse': 600_000,
      'freehold-townhouse': 750_000,
      'semi-detached': 800_000,
      detached: 870_000,
    },
    priceToRentByType: {
      'condo-apt': 22,
      'condo-townhouse': 23,
      'freehold-townhouse': 25,
      'semi-detached': 27,
      detached: 29,
    },
    fsas: ['L8E', 'L8G', 'L8H', 'L8J', 'L8K', 'L8L', 'L8M', 'L8N', 'L8P', 'L8R', 'L8S', 'L8T', 'L8V', 'L8W', 'L9A', 'L9B', 'L9C', 'L9G', 'L9H', 'L9K'],
    defaultHomeType: 'detached',
    source: TRREB_SOURCE,
  },
  ottawa: {
    region: 'ottawa',
    name: 'Ottawa',
    medianPriceByType: {
      'condo-apt': 420_000,
      'condo-townhouse': 510_000,
      'freehold-townhouse': 650_000,
      'semi-detached': 720_000,
      detached: 850_000,
    },
    priceToRentByType: {
      'condo-apt': 18,
      'condo-townhouse': 20,
      'freehold-townhouse': 23,
      'semi-detached': 25,
      detached: 26,
    },
    fsas: ['K1A', 'K1B', 'K1C', 'K1G', 'K1H', 'K1J', 'K1K', 'K1L', 'K1M', 'K1N', 'K1P', 'K1R', 'K1S', 'K1T', 'K1V', 'K1W', 'K1X', 'K1Y', 'K1Z', 'K2A', 'K2B', 'K2C', 'K2E', 'K2G', 'K2H', 'K2J', 'K2K', 'K2L', 'K2M', 'K2P', 'K2R', 'K2S', 'K2T', 'K2V', 'K2W', 'K4A', 'K4B', 'K4C', 'K4M'],
    defaultHomeType: 'detached',
    source: CREA_SOURCE,
  },
  'kitchener-waterloo': {
    region: 'kitchener-waterloo',
    name: 'Kitchener-Waterloo',
    medianPriceByType: {
      'condo-apt': 470_000,
      'condo-townhouse': 580_000,
      'freehold-townhouse': 720_000,
      'semi-detached': 790_000,
      detached: 900_000,
    },
    priceToRentByType: {
      'condo-apt': 19,
      'condo-townhouse': 21,
      'freehold-townhouse': 24,
      'semi-detached': 26,
      detached: 27,
    },
    fsas: ['N2A', 'N2B', 'N2C', 'N2E', 'N2G', 'N2H', 'N2J', 'N2K', 'N2L', 'N2M', 'N2N', 'N2P', 'N2R', 'N2T', 'N2V'],
    defaultHomeType: 'detached',
    source: CREA_SOURCE,
  },
  london: {
    region: 'london',
    name: 'London',
    medianPriceByType: {
      'condo-apt': 380_000,
      'condo-townhouse': 460_000,
      'freehold-townhouse': 560_000,
      'semi-detached': 610_000,
      detached: 700_000,
    },
    priceToRentByType: {
      'condo-apt': 18,
      'condo-townhouse': 20,
      'freehold-townhouse': 22,
      'semi-detached': 24,
      detached: 25,
    },
    fsas: ['N5V', 'N5W', 'N5X', 'N5Y', 'N5Z', 'N6A', 'N6B', 'N6C', 'N6E', 'N6G', 'N6H', 'N6J', 'N6K', 'N6L', 'N6M', 'N6N', 'N6P'],
    defaultHomeType: 'detached',
    source: CREA_SOURCE,
  },
  windsor: {
    region: 'windsor',
    name: 'Windsor',
    medianPriceByType: {
      'condo-apt': 330_000,
      'condo-townhouse': 400_000,
      'freehold-townhouse': 470_000,
      'semi-detached': 510_000,
      detached: 580_000,
    },
    priceToRentByType: {
      'condo-apt': 17,
      'condo-townhouse': 19,
      'freehold-townhouse': 21,
      'semi-detached': 22,
      detached: 23,
    },
    fsas: ['N8N', 'N8P', 'N8R', 'N8S', 'N8T', 'N8V', 'N8W', 'N8X', 'N8Y', 'N9A', 'N9B', 'N9C', 'N9E', 'N9G', 'N9H', 'N9J', 'N9K'],
    defaultHomeType: 'detached',
    source: CREA_SOURCE,
  },
  kingston: {
    region: 'kingston',
    name: 'Kingston',
    medianPriceByType: {
      'condo-apt': 370_000,
      'condo-townhouse': 460_000,
      'freehold-townhouse': 560_000,
      'semi-detached': 610_000,
      detached: 680_000,
    },
    priceToRentByType: {
      'condo-apt': 18,
      'condo-townhouse': 20,
      'freehold-townhouse': 22,
      'semi-detached': 24,
      detached: 25,
    },
    fsas: ['K7K', 'K7L', 'K7M', 'K7N', 'K7P'],
    defaultHomeType: 'detached',
    source: CREA_SOURCE,
  },
};

export const ONTARIO_REGION_LIST: readonly OntarioRegion[] = [
  'toronto-downtown',
  'toronto-east',
  'toronto-west',
  'toronto-north-york',
  'toronto-scarborough',
  'toronto-etobicoke',
  'mississauga',
  'brampton',
  'markham',
  'vaughan',
  'richmond-hill',
  'oakville',
  'burlington',
  'hamilton',
  'ottawa',
  'kitchener-waterloo',
  'london',
  'windsor',
  'kingston',
];

/**
 * Look up the Ontario region for a 2- or 3-character FSA prefix (e.g. "M5V",
 * "L4Z"). The table mixes 2-char entries for Toronto (where all "M__" FSAs
 * belong to one region) and 3-char entries for the GTA suburbs (where one
 * letter+digit pair maps to multiple municipalities). Lookup is by
 * "does the input start with any seeded entry," which handles both.
 *
 * Returns null if the FSA does not match any seeded Ontario region. The
 * caller should fall back to the v1 metro list / provincial fallback for
 * non-ON or unseeded Ontario postal codes.
 */
export function regionFromFSA(fsa: string): OntarioRegion | null {
  const upper = fsa.toUpperCase();
  for (const region of ONTARIO_REGION_LIST) {
    for (const seeded of ONTARIO_REGIONS[region].fsas) {
      if (upper.startsWith(seeded)) {
        return region;
      }
    }
  }
  return null;
}
