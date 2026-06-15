// URL-encoded shareable state.
// Inputs round-trip via short query-string keys. Defaults are filtered out
// so the URL stays clean for the common case.

import type { CalculatorInputs, HomeType, Province } from './types';
import { defaultInputsFor } from './defaults';
import { HOME_TYPES } from './homeType';

// Short keys preserve URL readability when "share with your partner" is the use case.
const KEY_MAP: Record<keyof CalculatorInputs, string> = {
  province: 'p',
  isTorontoMunicipalLTT: 'tor',
  isFirstTimeBuyer: 'ftb',
  postalCode: 'pc',
  homePrice: 'hp',
  monthlyRent: 'mr',
  downPaymentPct: 'dp',
  mortgageRatePct: 'mort',
  amortizationYears: 'amort',
  holdingPeriodYears: 'hold',
  propertyTaxPct: 'ptax',
  maintenancePct: 'maint',
  homeInsuranceMonthly: 'hins',
  rentInsuranceMonthly: 'rins',
  rentEscalationPct: 'resc',
  homeAppreciationPct: 'app',
  inflationPct: 'inf',
  investmentReturnPct: 'inv',
  investmentFeePct: 'fee',
  savingsDisciplinePct: 'disc',
  marginalTaxRatePct: 'mtr',
  realtorCommissionPct: 'rcom',
  legalFeesAtPurchase: 'lgp',
  legalFeesAtSale: 'lgs',
  renterUsesTFSA: 'tfsa',
  renterStartingUsesTFSA: 'sttfsa',
  renterTfsaStartingBalance: 'tfsabal',
  renterFhsaStartingBalance: 'fhsabal',
  renterRrspStartingBalance: 'rrspbal',
  ownerSurplusUsesTFSA: 'osttfsa',
  ownerSurplusUsesRRSP: 'ostrrsp',
  monthlyStrataFee: 'strata',
  rentControlCapPct: 'rcap',
  ownerMoves: 'om',
  renterMoves: 'rm',
  useFHSA: 'fhsa',
  homeType: 'ht',
  // v3
  mortgageTermYears: 'mterm',
  mortgageRenewalRatePct: 'mrenew',
  ownerMovingCostPerMove: 'omc',
  renterMovingCostPerMove: 'rmc',
  renterSavingsDisciplinePct: 'rdisc',
  ownerSavingsDisciplinePct: 'odisc',
  renterUsesRRSP: 'rrsp',
  rrspWithdrawalTaxRatePct: 'rrsprate',
  birthYear: 'by',
  annualIncome: 'inc',
  ownerPriorEquity: 'oeq',
  renterTfsaRoomOverride: 'tfsaroom',
  renterFhsaRoomOverride: 'fhsaroom',
  renterRrspCarryforward: 'rrspcarry',
  // v4
  monthlyRentalIncome: 'rsuite',
  rentalIncomeGrowthPct: 'rsuiteG',
  // v5
  ownerFhsaDown: 'fhsadp',
  ownerRrspHbpDown: 'hbpdp',
};

function isHomeType(v: string): v is HomeType {
  return (HOME_TYPES as readonly string[]).includes(v);
}

// Sentinel used to encode null (no rent cap) when the provincial default is a cap value.
const NONE_SENTINEL = 'none';

const VALID_PROVINCES: Province[] = [
  'ON',
  'BC',
  'AB',
  'QC',
  'MB',
  'SK',
  'NS',
  'NB',
  'NL',
  'PE',
];

function isProvince(v: string): v is Province {
  return (VALID_PROVINCES as string[]).includes(v);
}

/**
 * Encode inputs as URL search params, omitting any fields that match the
 * provincial defaults. Keeps the URL compact and human-readable.
 */
export function inputsToSearchParams(inputs: CalculatorInputs): URLSearchParams {
  const params = new URLSearchParams();
  const defaults = defaultInputsFor(inputs.province);

  // Always include province.
  params.set(KEY_MAP.province, inputs.province);

  for (const [field, shortKey] of Object.entries(KEY_MAP) as [
    keyof CalculatorInputs,
    string,
  ][]) {
    if (field === 'province') continue;
    const value = inputs[field];
    const def = defaults[field];

    if (typeof value === 'boolean') {
      if (value !== def) params.set(shortKey, value ? '1' : '0');
    } else if (value === null) {
      // Explicit null (e.g. rent cap turned off in a province with a default cap).
      if (def !== null) params.set(shortKey, NONE_SENTINEL);
    } else if (typeof value === 'number') {
      if (typeof def === 'number' && !floatEq(value, def)) {
        params.set(shortKey, formatNum(value));
      } else if (typeof def !== 'number') {
        params.set(shortKey, formatNum(value));
      }
    } else if (typeof value === 'string') {
      if (value !== def && value.length > 0) {
        params.set(shortKey, value);
      }
    }
  }

  return params;
}

/**
 * Decode inputs from a URLSearchParams. Any missing field falls back to the
 * provincial default. Province is required (defaults to ON).
 */
export function searchParamsToInputs(
  params: URLSearchParams | undefined,
): CalculatorInputs {
  const rawProvince = params?.get(KEY_MAP.province) ?? 'ON';
  const province: Province = isProvince(rawProvince) ? rawProvince : 'ON';
  const inputs = { ...defaultInputsFor(province) };

  if (!params) return inputs;

  for (const [field, shortKey] of Object.entries(KEY_MAP) as [
    keyof CalculatorInputs,
    string,
  ][]) {
    if (field === 'province') continue;
    const raw = params.get(shortKey);
    if (raw === null) continue;

    if (field === 'homeType') {
      if (isHomeType(raw)) {
        (inputs as Record<string, unknown>).homeType = raw;
      }
      continue;
    }

    const currentValue = inputs[field];
    if (raw === NONE_SENTINEL) {
      (inputs as Record<string, unknown>)[field] = null;
    } else if (typeof currentValue === 'boolean') {
      (inputs as Record<string, unknown>)[field] = raw === '1';
    } else if (typeof currentValue === 'number' || currentValue === null) {
      const parsed = parseFloat(raw);
      if (!isNaN(parsed) && isFinite(parsed)) {
        (inputs as Record<string, unknown>)[field] = parsed;
      }
    } else if (typeof currentValue === 'string') {
      (inputs as Record<string, unknown>)[field] = raw;
    }
  }

  return inputs;
}

function floatEq(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) < eps;
}

function formatNum(v: number): string {
  // Avoid floating-point noise: ".0050000001" → ".005"
  return Number.isInteger(v) ? String(v) : Number(v.toFixed(6)).toString();
}
