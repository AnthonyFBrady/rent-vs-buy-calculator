// Single source of truth for every editable modelling factor.
//
// Both the step flow and the result-page edit sidebar render their sliders from
// this registry, so a factor's range, step, format, accent, and copy are defined
// exactly once. Previously each surface hand-defined them and they drifted
// (investment return was 3-12 in the flow but 2-14 on the result page).
//
// Cross-field LOGIC (prior equity, account clamps) lives in engine/normalizeInputs.
// This registry owns the per-factor UI contract only.

import type { CalculatorInputs } from '@/engine';

export type FactorAccent = 'owner' | 'renter' | 'neutral';

/** Which part of the flow a factor belongs to. Drives grouping in the restructure. */
export type FactorGroup = 'home' | 'rent' | 'market';

export interface FactorDef {
  key: string;
  label: string;
  group: FactorGroup;
  accent: FactorAccent;
  min: number;
  max: number;
  step: number;
  /** Read the display-scale value (e.g. percent as 5, not 0.05) from inputs. */
  get: (i: CalculatorInputs) => number;
  /** Produce the input patch from a display-scale value. */
  set: (v: number) => Partial<CalculatorInputs>;
  format: (v: number) => string;
  minLabel?: string;
  maxLabel?: string;
  /** Static or input-derived helper copy under the slider. */
  description?: string | ((i: CalculatorInputs) => string);
}

export function accentColor(accent: FactorAccent): string {
  if (accent === 'owner') return 'var(--color-owner)';
  if (accent === 'renter') return 'var(--color-renter)';
  return 'var(--color-text-muted)';
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const fmtCAD0 = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

export const FACTORS = {
  homePrice: {
    key: 'homePrice',
    label: 'Home price',
    group: 'home',
    accent: 'owner',
    min: 200, max: 3000, step: 25,
    get: (i) => Math.round(i.homePrice / 1000),
    set: (v) => ({ homePrice: v * 1000 }),
    format: (v) => (v >= 1000 ? `$${(v / 1000).toFixed(1)}M` : `$${v}k`),
    minLabel: '$200k', maxLabel: '$3M',
  },
  downPayment: {
    key: 'downPayment',
    label: 'Down payment',
    group: 'home',
    accent: 'owner',
    min: 5, max: 50, step: 1,
    get: (i) => Math.round(i.downPaymentPct * 100),
    set: (v) => ({ downPaymentPct: v / 100 }),
    format: (v) => `${v}%`,
    minLabel: '5% min', maxLabel: '50%',
    description: (i) => fmtCAD0.format(i.homePrice * i.downPaymentPct),
  },
  mortgageRate: {
    key: 'mortgageRate',
    label: 'Mortgage rate',
    group: 'home',
    accent: 'owner',
    min: 1, max: 10, step: 0.1,
    get: (i) => round2(i.mortgageRatePct * 100),
    set: (v) => ({ mortgageRatePct: v / 100 }),
    format: (v) => `${v.toFixed(2)}%`,
    minLabel: '1%', maxLabel: '10%',
  },
  amortization: {
    key: 'amortization',
    label: 'Amortization',
    group: 'home',
    accent: 'owner',
    min: 10, max: 30, step: 5,
    get: (i) => i.amortizationYears,
    set: (v) => ({ amortizationYears: v }),
    format: (v) => `${v} yr`,
    minLabel: '10 yr', maxLabel: '30 yr',
  },
  propertyTax: {
    key: 'propertyTax',
    label: 'Property tax',
    group: 'home',
    accent: 'owner',
    min: 0.2, max: 3, step: 0.1,
    get: (i) => round1(i.propertyTaxPct * 100),
    set: (v) => ({ propertyTaxPct: v / 100 }),
    format: (v) => `${v.toFixed(1)}%/yr`,
    minLabel: '0.2%', maxLabel: '3%',
  },
  maintenance: {
    key: 'maintenance',
    label: 'Maintenance',
    group: 'home',
    accent: 'owner',
    min: 0.5, max: 3, step: 0.1,
    get: (i) => round1(i.maintenancePct * 100),
    set: (v) => ({ maintenancePct: v / 100 }),
    format: (v) => `${v.toFixed(1)}%/yr`,
    minLabel: '0.5%', maxLabel: '3%',
    description: 'Felix\'s own homeownership data put real maintenance at 1.5-2.5%.',
  },
  monthlyRent: {
    key: 'monthlyRent',
    label: 'Monthly rent',
    group: 'rent',
    accent: 'renter',
    min: 500, max: 8000, step: 50,
    get: (i) => Math.round(i.monthlyRent / 50) * 50,
    set: (v) => ({ monthlyRent: v }),
    format: (v) => `$${v.toLocaleString('en-CA')}/mo`,
    minLabel: '$500', maxLabel: '$8k',
    description: (i) => `${fmtCAD0.format(i.monthlyRent * 12)}/yr — what renting costs instead of buying.`,
  },
  rentGrowth: {
    key: 'rentGrowth',
    label: 'Annual rent growth',
    group: 'rent',
    accent: 'renter',
    min: 0, max: 10, step: 0.25,
    get: (i) => round2((i.rentEscalationPct ?? 0.05) * 100),
    set: (v) => ({ rentEscalationPct: v / 100 }),
    format: (v) => `${v.toFixed(1)}%/yr`,
    minLabel: '0%', maxLabel: '10%',
    description: 'CMHC asking-rent growth averaged ~5%/yr in major cities 2019-2024.',
  },
  renterInsurance: {
    key: 'renterInsurance',
    label: 'Renter\'s insurance',
    group: 'rent',
    accent: 'renter',
    min: 0, max: 100, step: 5,
    get: (i) => i.rentInsuranceMonthly ?? 25,
    set: (v) => ({ rentInsuranceMonthly: v }),
    format: (v) => `$${v}/mo`,
    minLabel: '$0', maxLabel: '$100',
  },
  homeAppreciation: {
    key: 'homeAppreciation',
    label: 'Home appreciation',
    group: 'market',
    accent: 'owner',
    min: 0, max: 10, step: 0.25,
    get: (i) => round2(i.homeAppreciationPct * 100),
    set: (v) => ({ homeAppreciationPct: v / 100 }),
    format: (v) => `${v.toFixed(1)}%/yr`,
    minLabel: '0%', maxLabel: '10%',
    description: '3% is the Canadian long-run average.',
  },
  investmentReturn: {
    key: 'investmentReturn',
    label: 'Investment return',
    group: 'market',
    accent: 'renter',
    min: 2, max: 14, step: 0.5,
    get: (i) => round1(i.investmentReturnPct * 100),
    set: (v) => ({ investmentReturnPct: v / 100 }),
    format: (v) => `${v.toFixed(1)}%/yr`,
    minLabel: '2%', maxLabel: '14%',
    description: 'Nominal return on the renter\'s portfolio. 7% = ~4% real + 3% inflation.',
  },
  timeHorizon: {
    key: 'timeHorizon',
    label: 'Years you plan to stay',
    group: 'market',
    accent: 'neutral',
    min: 1, max: 30, step: 1,
    get: (i) => i.holdingPeriodYears,
    set: (v) => ({ holdingPeriodYears: v }),
    format: (v) => `${v} yr`,
    minLabel: '1 yr', maxLabel: '30 yr',
    description: 'The chart ends here. Shorter horizons almost always favour renting.',
  },
  inflation: {
    key: 'inflation',
    label: 'Inflation',
    group: 'market',
    accent: 'neutral',
    min: 1, max: 5, step: 0.5,
    get: (i) => round1((i.inflationPct ?? 0.02) * 100),
    set: (v) => ({ inflationPct: v / 100 }),
    format: (v) => `${v.toFixed(1)}%`,
    minLabel: '1%', maxLabel: '5%',
    description: 'Bank of Canada target is 2%.',
  },
  marginalTax: {
    key: 'marginalTax',
    label: 'Marginal tax rate',
    group: 'market',
    accent: 'neutral',
    min: 20, max: 55, step: 1,
    get: (i) => Math.round(i.marginalTaxRatePct * 100),
    set: (v) => ({ marginalTaxRatePct: v / 100 }),
    format: (v) => `${v}%`,
    minLabel: '20%', maxLabel: '55%',
    description: 'Drives RRSP refund size, FHSA benefit, and capital gains treatment.',
  },
  savingsDiscipline: {
    key: 'savingsDiscipline',
    label: 'Savings discipline',
    group: 'market',
    accent: 'renter',
    min: 0, max: 100, step: 5,
    get: (i) => Math.round(i.savingsDisciplinePct * 100),
    set: (v) => ({ savingsDisciplinePct: v / 100 }),
    format: (v) => `${v}%`,
    minLabel: '0%', maxLabel: '100%',
    description: 'Fraction of the monthly rent-vs-buy gap the renter actually invests.',
  },
} satisfies Record<string, FactorDef>;

export type FactorKey = keyof typeof FACTORS;
