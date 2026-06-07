// Home-type defaults.
//
// Maintenance, monthly strata, and nominal appreciation differ materially by
// home type. A condo apartment carries a strata fee but the unit-level
// maintenance burden is small (interior only). A detached freehold has no
// strata fee but full envelope-to-mechanicals maintenance over a 25-year hold.
//
// Numbers below are starting points the user can override.
//
// Sources:
// - Maintenance %: CMHC "Cost of Homeownership" 2023, RBC Royal LePage
//   Carrying Cost Survey 2024, PWL Capital rent-vs-buy methodology 2024.
//   Detached at 1.5-2.0% is the consensus envelope-maintenance range.
//   Condo-apt at 0.5% covers interior-only since the strata fee covers
//   common-element capex.
// - Strata: TRREB Q4-2024 condo fee survey (median $0.74/sqft, median
//   apartment 800 sqft → ~$590-$650). Detached and freehold townhouse pay no
//   strata. Condo-townhouse pays a reduced common-element fee.
// - Appreciation: CREA HPI 2005-2024 by structure type. Condo apartments
//   underperformed ground-oriented housing in Ontario over the last decade
//   (Toronto condo HPI +75% vs detached +135%, 2014-2024). The defaults
//   compress the spread to long-run-realistic numbers, not 2014-2021 tail.

import type { HomeType } from './types';

export interface HomeTypeDefaults {
  homeType: HomeType;
  /** Annual maintenance as a fraction of home value. */
  maintenancePct: number;
  /** Monthly strata / condo fee in CAD at year 0. Escalates at inflation. */
  monthlyStrataFee: number;
  /** Nominal annual appreciation default for this type in Ontario. */
  homeAppreciationPct: number;
  /** Short label for UI. */
  label: string;
  /** One-line description for UI tooltip. */
  description: string;
}

const DEFAULTS: Record<HomeType, HomeTypeDefaults> = {
  'condo-apt': {
    homeType: 'condo-apt',
    maintenancePct: 0.005,
    monthlyStrataFee: 650,
    homeAppreciationPct: 0.025,
    label: 'Condo apartment',
    description: 'Unit in an apartment-style condo building. Strata covers the envelope and amenities.',
  },
  'condo-townhouse': {
    homeType: 'condo-townhouse',
    maintenancePct: 0.007,
    monthlyStrataFee: 300,
    homeAppreciationPct: 0.030,
    label: 'Condo townhouse',
    description: 'Townhouse within a condo corporation. Reduced strata covers common-element grounds and roof.',
  },
  'freehold-townhouse': {
    homeType: 'freehold-townhouse',
    maintenancePct: 0.010,
    monthlyStrataFee: 0,
    homeAppreciationPct: 0.035,
    label: 'Freehold townhouse',
    description: 'Townhouse with no condo fee. Owner responsible for full envelope.',
  },
  'semi-detached': {
    homeType: 'semi-detached',
    maintenancePct: 0.013,
    monthlyStrataFee: 0,
    homeAppreciationPct: 0.035,
    label: 'Semi-detached',
    description: 'Half of a two-unit freehold. Owner responsible for full envelope.',
  },
  detached: {
    homeType: 'detached',
    maintenancePct: 0.017,
    monthlyStrataFee: 0,
    homeAppreciationPct: 0.035,
    label: 'Detached',
    description: 'Single freehold house. Full envelope, full lot, full mechanical responsibility.',
  },
};

export function homeTypeDefaults(homeType: HomeType): HomeTypeDefaults {
  return DEFAULTS[homeType];
}

export const HOME_TYPES: readonly HomeType[] = [
  'condo-apt',
  'condo-townhouse',
  'freehold-townhouse',
  'semi-detached',
  'detached',
];

export function allHomeTypeDefaults(): HomeTypeDefaults[] {
  return HOME_TYPES.map((t) => DEFAULTS[t]);
}
