// Canadian transaction taxes: land transfer tax (provincial + Toronto MLTT), CMHC insurance, capital gains.
// All amounts in CAD. All percentages as decimals.
//
// Sources:
// - Ontario LTT: https://www.ontario.ca/document/land-transfer-tax
// - Toronto MLTT: https://www.toronto.ca/services-payments/property-taxes-utilities/municipal-land-transfer-tax-mltt/
// - CMHC premium schedule: https://www.cmhc-schl.gc.ca/professionals/project-funding-and-mortgage-financing/mortgage-loan-insurance/mortgage-loan-insurance-homeownership/cmhc-mortgage-loan-insurance-premiums

import type { Province } from './types';

interface BracketRow {
  upTo: number; // upper bound of bracket, Infinity for top
  ratePct: number;
}

// Ontario LTT brackets (province-wide, applies everywhere in ON including Toronto)
const ONTARIO_LTT_BRACKETS: BracketRow[] = [
  { upTo: 55_000, ratePct: 0.005 },
  { upTo: 250_000, ratePct: 0.01 },
  { upTo: 400_000, ratePct: 0.015 },
  { upTo: 2_000_000, ratePct: 0.02 },
  { upTo: Infinity, ratePct: 0.025 },
];

// Toronto MLTT brackets (additional, on top of Ontario LTT)
const TORONTO_MLTT_BRACKETS: BracketRow[] = [
  { upTo: 55_000, ratePct: 0.005 },
  { upTo: 250_000, ratePct: 0.01 },
  { upTo: 400_000, ratePct: 0.015 },
  { upTo: 2_000_000, ratePct: 0.02 },
  { upTo: 3_000_000, ratePct: 0.025 },
  { upTo: 4_000_000, ratePct: 0.035 },
  { upTo: 5_000_000, ratePct: 0.045 },
  { upTo: 10_000_000, ratePct: 0.055 },
  { upTo: 20_000_000, ratePct: 0.065 },
  { upTo: Infinity, ratePct: 0.075 },
];

// BC PTT brackets
const BC_PTT_BRACKETS: BracketRow[] = [
  { upTo: 200_000, ratePct: 0.01 },
  { upTo: 2_000_000, ratePct: 0.02 },
  { upTo: 3_000_000, ratePct: 0.03 },
  { upTo: Infinity, ratePct: 0.05 },
];

// First-time homebuyer rebates (CAD)
const ONTARIO_FTB_REBATE_MAX = 4000;
const TORONTO_FTB_REBATE_MAX = 4475;

function applyBrackets(price: number, brackets: BracketRow[]): number {
  let tax = 0;
  let remaining = price;
  let lower = 0;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const span = bracket.upTo - lower;
    const taxable = Math.min(remaining, span);
    tax += taxable * bracket.ratePct;
    remaining -= taxable;
    lower = bracket.upTo;
  }

  return tax;
}

export interface LandTransferTaxResult {
  provincialLTT: number;
  municipalLTT: number;
  ftbRebate: number;
  total: number;
}

/** Land transfer tax with first-time buyer rebate applied. */
export function landTransferTax(
  homePrice: number,
  province: Province,
  options: { isTorontoMunicipalLTT?: boolean; isFirstTimeBuyer?: boolean } = {},
): LandTransferTaxResult {
  let provincialLTT = 0;
  let municipalLTT = 0;
  let ftbRebate = 0;

  switch (province) {
    case 'ON': {
      provincialLTT = applyBrackets(homePrice, ONTARIO_LTT_BRACKETS);
      if (options.isTorontoMunicipalLTT) {
        municipalLTT = applyBrackets(homePrice, TORONTO_MLTT_BRACKETS);
      }
      if (options.isFirstTimeBuyer) {
        ftbRebate = Math.min(ONTARIO_FTB_REBATE_MAX, provincialLTT);
        if (options.isTorontoMunicipalLTT) {
          ftbRebate += Math.min(TORONTO_FTB_REBATE_MAX, municipalLTT);
        }
      }
      break;
    }
    case 'BC': {
      provincialLTT = applyBrackets(homePrice, BC_PTT_BRACKETS);
      // BC FTB exemption is full PTT exemption up to $500K, partial up to $835K.
      // Simplified model for MVP: apply $8,000 max rebate.
      if (options.isFirstTimeBuyer && homePrice <= 835_000) {
        ftbRebate = Math.min(8000, provincialLTT);
      }
      break;
    }
    case 'AB':
    case 'SK':
      // Alberta and Saskatchewan have no LTT, only registration fees (model as ~$200 flat).
      provincialLTT = 200;
      break;
    case 'QC':
      // Quebec "welcome tax" (droits de mutation), simplified Montreal-style brackets.
      provincialLTT = applyBrackets(homePrice, [
        { upTo: 53_200, ratePct: 0.005 },
        { upTo: 266_200, ratePct: 0.01 },
        { upTo: 532_300, ratePct: 0.015 },
        { upTo: 1_064_600, ratePct: 0.02 },
        { upTo: Infinity, ratePct: 0.025 },
      ]);
      break;
    case 'MB':
      // Manitoba LTT, simplified
      provincialLTT = applyBrackets(homePrice, [
        { upTo: 30_000, ratePct: 0 },
        { upTo: 90_000, ratePct: 0.005 },
        { upTo: 150_000, ratePct: 0.01 },
        { upTo: 200_000, ratePct: 0.015 },
        { upTo: Infinity, ratePct: 0.02 },
      ]);
      break;
    case 'NS':
    case 'NB':
    case 'NL':
    case 'PE':
      // Maritimes: typically 1% deed transfer tax. Simplified.
      provincialLTT = homePrice * 0.01;
      break;
  }

  return {
    provincialLTT,
    municipalLTT,
    ftbRebate,
    total: provincialLTT + municipalLTT - ftbRebate,
  };
}

/** CMHC mortgage insurance premium. Required for down payment < 20%. */
export function cmhcPremium(homePrice: number, downPaymentPct: number): number {
  if (downPaymentPct >= 0.20) return 0;
  if (homePrice > 1_500_000) return 0; // CMHC ineligible above $1.5M as of Dec 2024.

  const loanAmount = homePrice * (1 - downPaymentPct);

  let premiumPct: number;
  if (downPaymentPct >= 0.15) premiumPct = 0.028;
  else if (downPaymentPct >= 0.10) premiumPct = 0.031;
  else if (downPaymentPct >= 0.05) premiumPct = 0.040;
  else return 0; // CMHC requires minimum 5% down

  return loanAmount * premiumPct;
}

/**
 * Provincial sales tax owed on the CMHC premium. ON, QC, SK charge it; others
 * do not. Paid in cash at closing (cannot be rolled into the mortgage).
 */
export function cmhcPremiumPST(
  premium: number,
  province: Province,
): number {
  if (premium <= 0) return 0;
  // 8% in ON and QC, 6% in SK. Other provinces: 0.
  switch (province) {
    case 'ON':
    case 'QC':
      return premium * 0.08;
    case 'SK':
      return premium * 0.06;
    default:
      return 0;
  }
}

/**
 * Capital gains tax on a non-principal-residence portfolio (the renter's invested-difference).
 * Canada: 50% inclusion rate (as of 2026; the 2024 proposed 66.67% above $250K is excluded for MVP simplicity).
 * Applied at the user's marginal tax rate at liquidation.
 */
export function capitalGainsTax(
  realizedGain: number,
  marginalTaxRatePct: number,
  inclusionRate = 0.5,
): number {
  if (realizedGain <= 0) return 0;
  return realizedGain * inclusionRate * marginalTaxRatePct;
}
