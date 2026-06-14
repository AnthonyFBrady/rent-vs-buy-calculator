// Provincial defaults for the calculator.
// These are starting points the user can override. Every number sourced.
//
// Property tax: municipal rates vary widely. Defaults are reasonable mid-province estimates.
// Sources: provincial property tax averages compiled from municipal data 2024-2025.

import type { Province, CalculatorInputs, HomeType } from './types';
import { homeTypeDefaults } from './homeType';

export interface ProvincialDefaults {
  province: Province;
  defaultPropertyTaxPct: number;
  exampleHomePrice: number;
  exampleMonthlyRent: number;
  notes: string;
  /**
   * Annual rent-increase cap on in-place tenancies. ON guideline ~2.5%, BC
   * close behind. Other provinces have no statutory cap. Null means no cap.
   */
  defaultRentControlCapPct: number | null;
}

interface ProvincialDefaultsExtended extends ProvincialDefaults {
  defaultPostalCode: string;
}

export const PROVINCIAL_DEFAULTS: Record<Province, ProvincialDefaultsExtended> = {
  ON: {
    province: 'ON',
    defaultPropertyTaxPct: 0.0066,
    exampleHomePrice: 1_000_000,
    exampleMonthlyRent: 3000,
    defaultPostalCode: 'M5V',
    notes: 'Toronto 0.7%, Ottawa 1.1%, Mississauga 0.8%. Defaults use Toronto-area benchmark.',
    defaultRentControlCapPct: 0.025,
  },
  BC: {
    province: 'BC',
    defaultPropertyTaxPct: 0.0036,
    exampleHomePrice: 1_200_000,
    exampleMonthlyRent: 3200,
    defaultPostalCode: 'V6B',
    notes: 'Vancouver ~0.27%, but municipal services are higher. Default uses Lower Mainland median.',
    defaultRentControlCapPct: 0.03,
  },
  AB: {
    province: 'AB',
    defaultPropertyTaxPct: 0.0075,
    exampleHomePrice: 600_000,
    exampleMonthlyRent: 2000,
    defaultPostalCode: 'T2P',
    notes: 'Calgary 0.74%, Edmonton 0.95%. Default uses Calgary benchmark.',
    defaultRentControlCapPct: null,
  },
  QC: {
    province: 'QC',
    defaultPropertyTaxPct: 0.0095,
    exampleHomePrice: 550_000,
    exampleMonthlyRent: 1800,
    defaultPostalCode: 'H3B',
    notes: 'Montreal ~0.95%, Quebec City ~1.1%. Default uses Montreal benchmark.',
    defaultRentControlCapPct: null,
  },
  MB: {
    province: 'MB',
    defaultPropertyTaxPct: 0.0125,
    exampleHomePrice: 400_000,
    exampleMonthlyRent: 1600,
    defaultPostalCode: 'R3C',
    notes: 'Winnipeg ~1.25%, the highest in Canada.',
    defaultRentControlCapPct: null,
  },
  SK: {
    province: 'SK',
    defaultPropertyTaxPct: 0.0115,
    exampleHomePrice: 350_000,
    exampleMonthlyRent: 1400,
    defaultPostalCode: 'S7K',
    notes: 'Regina/Saskatoon ~1.1-1.2%.',
    defaultRentControlCapPct: null,
  },
  NS: {
    province: 'NS',
    defaultPropertyTaxPct: 0.0125,
    exampleHomePrice: 500_000,
    exampleMonthlyRent: 2000,
    defaultPostalCode: 'B3J',
    notes: 'Halifax ~1.2-1.3%.',
    defaultRentControlCapPct: null,
  },
  NB: {
    province: 'NB',
    defaultPropertyTaxPct: 0.014,
    exampleHomePrice: 350_000,
    exampleMonthlyRent: 1400,
    defaultPostalCode: 'E1C',
    notes: 'Provincial + municipal combined ~1.4%.',
    defaultRentControlCapPct: null,
  },
  NL: {
    province: 'NL',
    defaultPropertyTaxPct: 0.0095,
    exampleHomePrice: 350_000,
    exampleMonthlyRent: 1300,
    defaultPostalCode: 'A1C',
    notes: 'St. Johns ~0.95%.',
    defaultRentControlCapPct: null,
  },
  PE: {
    province: 'PE',
    defaultPropertyTaxPct: 0.0125,
    exampleHomePrice: 400_000,
    exampleMonthlyRent: 1500,
    defaultPostalCode: 'C1A',
    notes: 'PEI provincial + municipal combined ~1.25%.',
    defaultRentControlCapPct: null,
  },
};

/**
 * Reasonable starting inputs for a fresh calculator session.
 * User can override every value.
 *
 * If `homeType` is supplied, maintenance %, monthly strata fee, and
 * appreciation default are seeded from `homeTypeDefaults()` instead of the
 * province baseline. The v1 path (no homeType) preserves the original
 * province-only behavior so existing tests stay green.
 */
export function defaultInputsFor(
  province: Province,
  homeType?: HomeType,
): CalculatorInputs {
  const prov = PROVINCIAL_DEFAULTS[province];
  const ht = homeType ? homeTypeDefaults(homeType) : null;

  return {
    province,
    isTorontoMunicipalLTT: false,
    isFirstTimeBuyer: false,
    ownerSurplusUsesTFSA: false,
    ownerSurplusUsesRRSP: false,
    postalCode: prov.defaultPostalCode,

    homePrice: prov.exampleHomePrice,
    monthlyRent: prov.exampleMonthlyRent,

    downPaymentPct: 0.20,
    mortgageRatePct: 0.05,         // Bank of Canada 5-year posted, June 2026 placeholder
    amortizationYears: 25,
    holdingPeriodYears: 10,

    propertyTaxPct: prov.defaultPropertyTaxPct,
    maintenancePct: ht ? ht.maintenancePct : 0.015,
    homeInsuranceMonthly: 150,

    rentInsuranceMonthly: 25,
    rentEscalationPct: 0.05,       // CMHC asking-rent average for major Canadian cities 2019-2024

    homeAppreciationPct: ht ? ht.homeAppreciationPct : 0.03,
    inflationPct: 0.02,            // Bank of Canada target

    investmentReturnPct: 0.07,     // Nominal, 4% real + 3% inflation
    investmentFeePct: 0.006,       // Low-cost Canadian ETF MER
    savingsDisciplinePct: 1.0,     // Honest baseline: full discipline

    marginalTaxRatePct: 0.43,      // Ontario top-marginal placeholder

    realtorCommissionPct: 0.05,
    legalFeesAtPurchase: 1500,
    legalFeesAtSale: 1200,

    renterUsesTFSA: false,
    renterStartingUsesTFSA: false,

    monthlyStrataFee: ht ? ht.monthlyStrataFee : 0,
    rentControlCapPct: prov.defaultRentControlCapPct,
    ownerMoves: 0,
    renterMoves: 0,
    useFHSA: false,
    homeType,

    // v3: mortgageRenewalRatePct, renterSavingsDisciplinePct, ownerSavingsDisciplinePct are
    // intentionally absent — engine falls back to mortgageRatePct / savingsDisciplinePct.
    mortgageTermYears: 5,
    ownerMovingCostPerMove: 2_500,
    renterMovingCostPerMove: 400,
    renterUsesRRSP: false,
    birthYear: 1990,
    annualIncome: 120_000,
  };
}
