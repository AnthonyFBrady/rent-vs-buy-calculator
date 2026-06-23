/**
 * Canonical step registry for the 11-step experience flow.
 * No other file may hardcode phase numbers — always import from here.
 *
 * ACT 1 — WHERE:  Province → City.
 * ACT 2 — WHAT:   Home compare (buy type + beds, rent type + beds), price, rent, horizon.
 * ACT 3 — HOW:    Down payment, mortgage (express lane ends here).
 * ACT 4 — YOU:    Finances, shelters, mobility (opt-in refinement).
 */

export const STEP = {
  // Act 1 — Where
  PROVINCE:      0,
  CITY:          1,
  // Act 2 — What you are comparing
  HOME_COMPARE:  2,
  HOME_PRICE:    3,
  RENT:          4,
  HORIZON:       5,
  // Act 3 — How (express lane)
  DOWN_PAYMENT:  6,
  MORTGAGE:      7,
  // Act 4 — You + refine
  FINANCES:      8,
  SHELTERS:      9,
  MOBILITY:      10,
} as const;

export type StepKey = keyof typeof STEP;
export type StepIndex = typeof STEP[StepKey];

/** Total question steps (exclusive — steps 0..10). */
export const TOTAL_STEPS = 11;

/** Last step of the express lane. Past this, steps only refine the result. */
export const EXPRESS_LAST_STEP = STEP.MORTGAGE;

export type Section = 'where' | 'what' | 'how' | 'you' | 'refine';

export const SECTION_LABELS: Record<Section, string> = {
  where:  'Where',
  what:   'What you are comparing',
  how:    'How you are buying',
  you:    'About you',
  refine: 'Refinements',
};

export const STEP_SECTION: Record<number, Section> = {
  [STEP.PROVINCE]:     'where',
  [STEP.CITY]:         'where',
  [STEP.HOME_COMPARE]: 'what',
  [STEP.HOME_PRICE]:   'what',
  [STEP.RENT]:         'what',
  [STEP.HORIZON]:      'what',
  [STEP.DOWN_PAYMENT]: 'how',
  [STEP.MORTGAGE]:     'how',
  [STEP.FINANCES]:     'you',
  [STEP.SHELTERS]:     'refine',
  [STEP.MOBILITY]:     'refine',
};

export const STEP_HEADINGS: Record<number, string> = {
  [STEP.PROVINCE]:     'Where in Canada?',
  [STEP.CITY]:         'Which city are you targeting?',
  [STEP.HOME_COMPARE]: 'What types of home are you weighing?',
  [STEP.HOME_PRICE]:   'How much does the home cost?',
  [STEP.RENT]:         'What would you pay in rent instead?',
  [STEP.HORIZON]:      'How long is your time horizon?',
  [STEP.DOWN_PAYMENT]: 'How are you funding it?',
  [STEP.MORTGAGE]:     'What rate can you get?',
  [STEP.FINANCES]:     'Tell us about your finances.',
  [STEP.SHELTERS]:     'Which registered accounts do you use?',
  [STEP.MOBILITY]:     'How often would each of you move?',
};

export const STEP_WHY: Record<number, string> = {
  [STEP.PROVINCE]:     'Determines your land transfer tax, rent control rules, and property tax rate.',
  [STEP.CITY]:         'Sets the price and rent benchmarks used throughout the comparison.',
  [STEP.HOME_COMPARE]: 'Comparable units make the analysis honest. Buying a 2BR condo should be weighed against renting a 2BR unit.',
  [STEP.HOME_PRICE]:   'Drives your land transfer tax, CMHC premium, mortgage balance, and closing costs.',
  [STEP.RENT]:         'Rent is what you pay instead of owning. The break-even rent is the fulcrum of this comparison.',
  [STEP.HORIZON]:      'Under 5 years almost always favours renting. Transaction costs take years to amortize.',
  [STEP.DOWN_PAYMENT]: 'Under 20% triggers CMHC insurance — a 2.8–4.0% premium added to your mortgage balance.',
  [STEP.MORTGAGE]:     'Each 0.5% increase adds roughly $50k in interest on a $700k mortgage over 25 years.',
  [STEP.FINANCES]:     'Age determines your TFSA room. Income sets your RRSP room and marginal tax bracket.',
  [STEP.SHELTERS]:     'Maximizing TFSA and FHSA can shift the advantage by tens of thousands over 10 years.',
  [STEP.MOBILITY]:     'Each owner move costs roughly 9% of home value in friction. Renter moves are cheap but reset any rent-control discount.',
};

export const CONTINUE_LABEL: Record<number, string> = {
  [STEP.PROVINCE]:     'Continue',
  [STEP.CITY]:         'Continue',
  [STEP.HOME_COMPARE]: 'Continue',
  [STEP.HOME_PRICE]:   'Continue',
  [STEP.RENT]:         'Continue',
  [STEP.HORIZON]:      'Continue',
  [STEP.DOWN_PAYMENT]: 'Continue',
  [STEP.MORTGAGE]:     'See my result',
  [STEP.FINANCES]:     'Continue',
  [STEP.SHELTERS]:     'Continue',
  [STEP.MOBILITY]:     'Done',
};

/** What the right-side map panel shows at each step. */
export interface StepMapConfig {
  mode: 'national' | 'province' | 'city-prices' | 'city-rent-signal' | 'stable';
  interactive: boolean;
  label: string;
}

export const STEP_MAP_CONFIG: Record<number, StepMapConfig> = {
  [STEP.PROVINCE]:     { mode: 'province',         interactive: true,  label: 'Tap a province' },
  [STEP.CITY]:         { mode: 'city-prices',       interactive: false, label: 'Tap a city on the map' },
  [STEP.HOME_COMPARE]: { mode: 'stable',            interactive: false, label: 'Your selected area' },
  [STEP.HOME_PRICE]:   { mode: 'city-prices',       interactive: false, label: 'How your price compares to the market' },
  [STEP.RENT]:         { mode: 'city-rent-signal',  interactive: false, label: 'Buy vs rent signal at your price' },
  [STEP.HORIZON]:      { mode: 'city-rent-signal',  interactive: false, label: 'How the verdict shifts over time' },
  [STEP.DOWN_PAYMENT]: { mode: 'stable',            interactive: false, label: 'Closing costs for your market' },
  [STEP.MORTGAGE]:     { mode: 'city-prices',       interactive: false, label: 'Monthly ownership cost by area' },
  [STEP.FINANCES]:     { mode: 'stable',            interactive: false, label: 'Your registered account room' },
  [STEP.SHELTERS]:     { mode: 'stable',            interactive: false, label: 'Shelter-adjusted comparison' },
  [STEP.MOBILITY]:     { mode: 'city-rent-signal',  interactive: false, label: 'Move friction by area' },
};
