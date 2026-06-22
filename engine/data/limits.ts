// Government-set contribution limits and tax-shelter parameters.
// Update each January when CRA publishes the new year's limits.
// Source: https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html

export const LIMITS_METADATA = {
  asOf: '2026-01',
  validYear: 2026,
  source: 'CRA 2024 contribution limits + 2025 TFSA accrual',
};

// TFSA: Tax-Free Savings Account
// $7,000/yr from 2024 onward. Total cumulative room through 2025 is $95,000
// for someone who has been eligible since the program launched in 2009.
export const TFSA_ANNUAL_ACCRUAL = 7_000;
export const TFSA_LIFETIME_CAP = 95_000;   // through 2025; update each January
export const TFSA_ELIGIBLE_FROM_YEAR = 2009;

// RRSP: Registered Retirement Savings Plan
// 18% of prior-year earned income, capped at the annual dollar limit.
export const RRSP_CONTRIBUTION_RATE = 0.18;
export const RRSP_ANNUAL_MAX = 31_560;     // 2024 limit; update each year

// FHSA: First Home Savings Account (introduced 2023)
// $8,000/yr for up to 5 years. Tax-deductible contributions, tax-free withdrawals
// for a qualifying first home purchase.
export const FHSA_ANNUAL_ROOM = 8_000;
export const FHSA_LIFETIME_LIMIT = 40_000;

// CMHC mortgage default insurance premiums by LTV tier.
// Source: https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance
export const CMHC_METADATA = {
  asOf: '2024-03',
  source: 'CMHC — Mortgage Loan Insurance Premium Rates',
};
