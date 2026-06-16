/**
 * Canonical step registry for the 9-step experience flow.
 * No other file may hardcode phase numbers — always import from here.
 */

export const STEP = {
  PERSONAL:     0,
  HOME:         1,
  PROVINCE:     2,
  DOWN_PAYMENT: 3,
  MORTGAGE:     4,
  RENT_HORIZON: 5,
  MARKET:       6,
  SITUATION:    7,
  MOBILITY:     8,
} as const;

export type StepKey = keyof typeof STEP;
export type StepIndex = typeof STEP[StepKey];

/** Total question steps (exclusive — steps 0..8). */
export const TOTAL_STEPS = 9;

export const STEP_HEADINGS: Record<number, string> = {
  [STEP.PERSONAL]:     'Tell me a bit about yourself.',
  [STEP.HOME]:         'What are you buying?',
  [STEP.PROVINCE]:     'Which province?',
  [STEP.DOWN_PAYMENT]: 'How much are you putting down?',
  [STEP.MORTGAGE]:     "What's the mortgage rate?",
  [STEP.RENT_HORIZON]: "What's the rent, and how long will you stay?",
  [STEP.MARKET]:       'What do the markets do?',
  [STEP.SITUATION]:    'Which tax shelters do you use?',
  [STEP.MOBILITY]:     'How often will each of you move?',
};

export const STEP_WHY: Record<number, string> = {
  [STEP.PERSONAL]:     'Age sets your TFSA room. Income sets your RRSP room. Name is optional — it personalizes the chart.',
  [STEP.HOME]:         'Home price sets land transfer tax, CMHC, and total closing costs.',
  [STEP.PROVINCE]:     'Land transfer tax and market conditions vary by province.',
  [STEP.DOWN_PAYMENT]: 'Under 20% triggers CMHC insurance — a 2.8–4.0% upfront cost.',
  [STEP.MORTGAGE]:     'Each 0.5% rate increase adds ~$50k to total interest on a $700k home.',
  [STEP.RENT_HORIZON]: 'Your rent is the alternative. The horizon sets when the comparison ends.',
  [STEP.MARKET]:       "Renting's advantage depends on what your down payment earns instead.",
  [STEP.SITUATION]:    'Tax shelters shift the advantage by tens of thousands.',
  [STEP.MOBILITY]:     'Owner moves cost roughly 9% of the home value each time. Renter moves are cheap but reset any rent-control discount.',
};

export const CONTINUE_LABEL: Record<number, string> = {
  [STEP.PERSONAL]:     'Continue',
  [STEP.HOME]:         'Continue',
  [STEP.PROVINCE]:     'Continue',
  [STEP.DOWN_PAYMENT]: 'Continue',
  [STEP.MORTGAGE]:     'Continue',
  [STEP.RENT_HORIZON]: 'Continue',
  [STEP.MARKET]:       'Continue',
  [STEP.SITUATION]:    'Continue',
  [STEP.MOBILITY]:     'See my result',
};
