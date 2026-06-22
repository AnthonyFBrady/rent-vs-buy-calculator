// Municipality-level data for property tax rates, LTT flags, and insurance escalation.
//
// Property tax varies by 2.7x across Canada (Windsor 1.79% vs Vancouver 0.28%).
// Using the provincial default for all cities in a province is a significant error.
//
// Update schedule: annually in January from each city's budget documents.
// Source URLs are in each record's `source` field.
//
// Lookup: FSA prefixes use 2-char (e.g. 'M5' for Toronto) OR 3-char (e.g. 'L4N' for Barrie)
// where cities share a 2-char prefix. getMunicipalProfile() tries 3-char first.

import type { Province } from '../../types';

export const MUNICIPAL_DATA_METADATA = {
  asOf: '2025-01',
  validYear: 2025,
  source: 'MPAC 2024-2025, municipal budget documents, BC Assessment, MRCA, TAMA',
  nextRefresh: '2026-12',
};

export interface MunicipalProfile {
  name: string;
  province: Province;
  /**
   * 2-char FSA prefixes (e.g. 'M5') OR 3-char FSA prefixes (e.g. 'L4N') when
   * multiple cities share the same 2-char prefix. getMunicipalProfile() tries
   * 3-char before 2-char, so the more specific entry wins.
   */
  postalPrefixes: readonly string[];
  /** Annual residential property tax rate as a decimal (0.01 = 1%). 2024-2025 data. */
  propertyTaxPct: number;
  /** Whether this municipality charges a second-layer municipal LTT on top of the provincial one. Currently Toronto only. */
  municipalLTT: boolean;
  /**
   * How much faster than inflation home insurance premiums are rising in this region.
   * National baseline: 0.03 (3% above CPI, driven by climate-related claims).
   * Higher in wildfire-prone (BC, AB) and severe-flood regions.
   * Source: NBER Housing Climate Risk 2025, IBC Canada 2024.
   */
  insuranceEscalationOverInflationPct: number;
  /** Source document or URL for the property tax rate. */
  source: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ONTARIO
// ─────────────────────────────────────────────────────────────────────────────

const ONTARIO_MUNICIPALITIES: MunicipalProfile[] = [
  {
    name: 'Toronto',
    province: 'ON',
    postalPrefixes: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
    propertyTaxPct: 0.006644,
    municipalLTT: true,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Toronto Final 2024 Property Tax Rate',
  },
  {
    name: 'Ottawa',
    province: 'ON',
    postalPrefixes: ['K1', 'K2', 'K4'],
    propertyTaxPct: 0.010968,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Ottawa 2024 Property Tax Rates',
  },
  {
    name: 'Mississauga',
    province: 'ON',
    // L5 = Mississauga core. L4T/V/W/X/Y/Z = north Mississauga (3-char to avoid
    // conflict with L4 = Barrie/York Region).
    postalPrefixes: ['L5', 'L4T', 'L4V', 'L4W', 'L4X', 'L4Y', 'L4Z'],
    propertyTaxPct: 0.007968,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Mississauga 2024 Property Tax Rate',
  },
  {
    name: 'Brampton',
    province: 'ON',
    // L6P-Z = Brampton proper. L6B/C/E = inner Brampton. L7A = northwest Brampton.
    postalPrefixes: ['L6P', 'L6R', 'L6S', 'L6T', 'L6V', 'L6W', 'L6X', 'L6Y', 'L6Z', 'L6B', 'L6C', 'L6E', 'L7A'],
    propertyTaxPct: 0.009420,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Brampton 2024 Property Tax Rate',
  },
  {
    name: 'Oakville',
    province: 'ON',
    // L6H-M = Oakville (3-char to avoid conflict with L6 = Brampton)
    postalPrefixes: ['L6H', 'L6J', 'L6K', 'L6L', 'L6M'],
    propertyTaxPct: 0.007285,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'Town of Oakville 2024 Property Tax Rate',
  },
  {
    name: 'Burlington',
    province: 'ON',
    // L7L-T = Burlington
    postalPrefixes: ['L7L', 'L7M', 'L7N', 'L7P', 'L7R', 'L7S', 'L7T'],
    propertyTaxPct: 0.008284,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Burlington 2024 Property Tax Rate',
  },
  {
    name: 'York Region (Markham / Richmond Hill / Vaughan)',
    province: 'ON',
    // L3 = Markham core. L4B/C/E/H/J/K/L/S = Richmond Hill / Vaughan (3-char to avoid
    // L4M/N = Barrie, L4T-Z = Mississauga).
    postalPrefixes: ['L3', 'L4B', 'L4C', 'L4E', 'L4G', 'L4H', 'L4J', 'L4K', 'L4L', 'L4S'],
    propertyTaxPct: 0.006700,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'York Region municipalities 2024 (Markham 0.64%, Richmond Hill 0.67%, Vaughan 0.74% — blended)',
  },
  {
    name: 'Barrie',
    province: 'ON',
    // L4M, L4N = Barrie core; L4P, L4R = south Barrie / Innisfil
    postalPrefixes: ['L4M', 'L4N', 'L4P', 'L4R'],
    propertyTaxPct: 0.013427,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Barrie 2024 Property Tax Rate',
  },
  {
    name: 'Oshawa / Durham Region',
    province: 'ON',
    postalPrefixes: ['L1'],
    propertyTaxPct: 0.013308,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Oshawa 2024 Property Tax Rate',
  },
  {
    name: 'Hamilton',
    province: 'ON',
    postalPrefixes: ['L8', 'L9'],
    propertyTaxPct: 0.012648,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Hamilton 2024 Property Tax Rate',
  },
  {
    name: 'Guelph',
    province: 'ON',
    postalPrefixes: ['N1'],
    propertyTaxPct: 0.011938,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Guelph 2024 Property Tax Rate',
  },
  {
    name: 'Kitchener-Waterloo',
    province: 'ON',
    postalPrefixes: ['N2'],
    propertyTaxPct: 0.011576,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Kitchener 2024 Property Tax Rate',
  },
  {
    name: 'London',
    province: 'ON',
    postalPrefixes: ['N5', 'N6'],
    propertyTaxPct: 0.013547,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of London 2024 Property Tax Rate',
  },
  {
    name: 'Windsor',
    province: 'ON',
    postalPrefixes: ['N8', 'N9'],
    propertyTaxPct: 0.017913,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Windsor 2024 Property Tax Rate',
  },
  {
    name: 'Kingston',
    province: 'ON',
    postalPrefixes: ['K7'],
    propertyTaxPct: 0.014000,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Kingston 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Greater Sudbury',
    province: 'ON',
    postalPrefixes: ['P3'],
    propertyTaxPct: 0.015820,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Greater Sudbury 2024 Property Tax Rate',
  },
  {
    name: 'Thunder Bay',
    province: 'ON',
    postalPrefixes: ['P7'],
    propertyTaxPct: 0.016250,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Thunder Bay 2024 Property Tax Rate (approximate)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// BRITISH COLUMBIA
// ─────────────────────────────────────────────────────────────────────────────

const BC_MUNICIPALITIES: MunicipalProfile[] = [
  {
    name: 'Vancouver',
    province: 'BC',
    postalPrefixes: ['V5', 'V6', 'V7'],
    propertyTaxPct: 0.002799,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04, // Wildfire + atmospheric river flooding risk
    source: 'City of Vancouver 2024 Property Tax Rate',
  },
  {
    name: 'Surrey',
    province: 'BC',
    postalPrefixes: ['V3'],
    propertyTaxPct: 0.003419,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04,
    source: 'City of Surrey 2024 Property Tax Rate',
  },
  {
    name: 'Victoria',
    province: 'BC',
    postalPrefixes: ['V8', 'V9'],
    propertyTaxPct: 0.004060,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04,
    source: 'City of Victoria 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Kelowna',
    province: 'BC',
    postalPrefixes: ['V1', 'V4'],
    propertyTaxPct: 0.003996,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.05, // Active wildfire zone (Okanagan)
    source: 'City of Kelowna 2024 Property Tax Rate',
  },
  {
    name: 'Abbotsford / Fraser Valley',
    province: 'BC',
    postalPrefixes: ['V2'],
    propertyTaxPct: 0.004224,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.045, // Flood risk (Sumas Prairie, atmospheric rivers)
    source: 'City of Abbotsford 2024 Property Tax Rate',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ALBERTA
// ─────────────────────────────────────────────────────────────────────────────

const AB_MUNICIPALITIES: MunicipalProfile[] = [
  {
    name: 'Calgary',
    province: 'AB',
    postalPrefixes: ['T2', 'T3'],
    propertyTaxPct: 0.007397,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04, // Hail risk + wildland-urban interface
    source: 'City of Calgary 2024 Property Tax Rate',
  },
  {
    name: 'Edmonton',
    province: 'AB',
    postalPrefixes: ['T5', 'T6'],
    propertyTaxPct: 0.009738,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04,
    source: 'City of Edmonton 2024 Property Tax Rate',
  },
  {
    name: 'Red Deer',
    province: 'AB',
    // T4N, T4R, T4S = Red Deer (3-char to avoid conflict with T4A = Airdrie)
    postalPrefixes: ['T4N', 'T4R', 'T4S'],
    propertyTaxPct: 0.013009,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04,
    source: 'City of Red Deer 2024 Property Tax Rate',
  },
  {
    name: 'Airdrie',
    province: 'AB',
    postalPrefixes: ['T4A'],
    propertyTaxPct: 0.007850,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04,
    source: 'City of Airdrie 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Lethbridge',
    province: 'AB',
    postalPrefixes: ['T1'],
    propertyTaxPct: 0.010960,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.04,
    source: 'City of Lethbridge 2024 Property Tax Rate',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// QUEBEC
// ─────────────────────────────────────────────────────────────────────────────

const QC_MUNICIPALITIES: MunicipalProfile[] = [
  {
    name: 'Montreal',
    province: 'QC',
    postalPrefixes: ['H1', 'H2', 'H3', 'H4', 'H5', 'H7', 'H8', 'H9'],
    propertyTaxPct: 0.009500,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'Ville de Montréal 2024 Residential Tax Rate (general rate)',
  },
  {
    name: 'Quebec City',
    province: 'QC',
    postalPrefixes: ['G1', 'G2'],
    propertyTaxPct: 0.008800,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'Ville de Québec 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Laval',
    province: 'QC',
    postalPrefixes: ['H7'],
    propertyTaxPct: 0.008600,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'Ville de Laval 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Longueuil / South Shore',
    province: 'QC',
    postalPrefixes: ['J4', 'J5'],
    propertyTaxPct: 0.010400,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'Agglomération de Longueuil 2024 (approximate)',
  },
  {
    name: 'Gatineau',
    province: 'QC',
    postalPrefixes: ['J8', 'J9'],
    propertyTaxPct: 0.011800,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'Ville de Gatineau 2024 Property Tax Rate (approximate)',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PRAIRIES + MARITIMES
// ─────────────────────────────────────────────────────────────────────────────

const OTHER_MUNICIPALITIES: MunicipalProfile[] = [
  {
    name: 'Winnipeg',
    province: 'MB',
    postalPrefixes: ['R2', 'R3'],
    propertyTaxPct: 0.012400,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Winnipeg 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Saskatoon',
    province: 'SK',
    postalPrefixes: ['S7'],
    propertyTaxPct: 0.011500,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Saskatoon 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Regina',
    province: 'SK',
    postalPrefixes: ['S4'],
    propertyTaxPct: 0.011800,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Regina 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Halifax',
    province: 'NS',
    postalPrefixes: ['B3'],
    propertyTaxPct: 0.012400,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.035, // Coastal flood risk
    source: 'Halifax Regional Municipality 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Moncton',
    province: 'NB',
    postalPrefixes: ['E1'],
    propertyTaxPct: 0.014400,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.035,
    source: 'City of Moncton 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Saint John',
    province: 'NB',
    postalPrefixes: ['E2'],
    propertyTaxPct: 0.016000,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.035,
    source: 'City of Saint John 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Fredericton',
    province: 'NB',
    postalPrefixes: ['E3'],
    propertyTaxPct: 0.015300,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: 'City of Fredericton 2024 Property Tax Rate (approximate)',
  },
  {
    name: 'Charlottetown',
    province: 'PE',
    postalPrefixes: ['C1'],
    propertyTaxPct: 0.012500,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.035, // Sea-level risk
    source: 'City of Charlottetown 2024 Property Tax Rate (approximate)',
  },
  {
    name: "St. John's",
    province: 'NL',
    postalPrefixes: ['A1'],
    propertyTaxPct: 0.009500,
    municipalLTT: false,
    insuranceEscalationOverInflationPct: 0.03,
    source: "City of St. John's 2024 Property Tax Rate (approximate)",
  },
];

export const MUNICIPAL_PROFILES: readonly MunicipalProfile[] = [
  ...ONTARIO_MUNICIPALITIES,
  ...BC_MUNICIPALITIES,
  ...AB_MUNICIPALITIES,
  ...QC_MUNICIPALITIES,
  ...OTHER_MUNICIPALITIES,
];

/**
 * Look up a municipal profile from a postal code or FSA string.
 *
 * Tries 3-char FSA first (e.g. 'L4N' matches Barrie, not generic L4), then
 * 2-char prefix (e.g. 'M5' matches Toronto). Returns null if no match is found
 * — callers should fall back to provincial defaults in that case.
 */
export function getMunicipalProfile(postalCodeOrFSA: string): MunicipalProfile | null {
  if (!postalCodeOrFSA) return null;
  const clean = postalCodeOrFSA.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 2) return null;

  const fsa3 = clean.length >= 3 ? clean.slice(0, 3) : null;
  const fsa2 = clean.slice(0, 2);

  // 3-char match wins (more specific; resolves cities sharing a 2-char prefix)
  if (fsa3) {
    for (const profile of MUNICIPAL_PROFILES) {
      if (profile.postalPrefixes.includes(fsa3)) return profile;
    }
  }

  // 2-char match fallback
  for (const profile of MUNICIPAL_PROFILES) {
    if (profile.postalPrefixes.includes(fsa2)) return profile;
  }

  return null;
}
