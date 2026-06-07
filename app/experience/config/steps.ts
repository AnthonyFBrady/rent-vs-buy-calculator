/**
 * Canonical step registry.
 * When adding/removing a step: edit STEP here, then update page.tsx's STEP_COMPONENTS map.
 * All phase comparisons in ExperienceChart and elsewhere import from here — no magic numbers anywhere.
 */

export const STEP = {
  INTRO:          0,
  ABOUT:          1,
  TIME_HORIZON:   2,
  PROVINCE:       3,
  DOWN_PAYMENT:   4,
  ACCOUNTS:       5,
  HOME_PRICE:     6,
  HOME_TYPE:      7,
  MORTGAGE_RATE:  8,
  AMORTIZATION:   9,
  RENT_AMOUNT:   10,
  RENT_GROWTH:   11,
  MOBILITY:      12,
  TAX_SHELTERS:  13,
  FINANCIALS:    14,
  RESULTS:       15,
} as const;

export type StepKey = keyof typeof STEP;
export type StepIndex = typeof STEP[StepKey];

/** Steps where only the owner line changes — renter line animates with duration: 0 */
export const OWNER_STEPS = new Set<number>([
  STEP.DOWN_PAYMENT,
  STEP.HOME_PRICE,
  STEP.HOME_TYPE,
  STEP.MORTGAGE_RATE,
  STEP.AMORTIZATION,
  STEP.MOBILITY,
]);

/** Steps where only the renter line changes — owner line animates with duration: 0 */
export const RENTER_STEPS = new Set<number>([
  STEP.ACCOUNTS,
  STEP.RENT_AMOUNT,
  STEP.RENT_GROWTH,
]);

/** First step where the owner wealth line is drawn */
export const OWNER_LINE_STEP  = STEP.DOWN_PAYMENT;  // 4

/** First step where the renter wealth line is drawn */
export const RENTER_LINE_STEP = STEP.RENT_AMOUNT;   // 10

/** First step where results-only UI (exit haircut, sensitivity bands) is shown */
export const RESULTS_STEP     = STEP.RESULTS;        // 15

/** Total number of question steps (excludes RESULTS). Used for progress bar. */
export const TOTAL_STEPS      = STEP.RESULTS;        // 15
