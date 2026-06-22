// Barrel export for the math engine.
// UI imports from '@/engine' only. Internal modules stay private to the engine.

export type {
  Province,
  HomeType,
  CalculatorInputs,
  YearSnapshot,
  ExitSummary,
  CommitmentSummary,
  FivePercentRuleResult,
  SimulationResult,
} from './types';

export {
  fivePercentRule,
  DEFAULT_PROPERTY_TAX_PCT,
  DEFAULT_MAINTENANCE_PCT,
  DEFAULT_COST_OF_CAPITAL_PCT,
} from './fivePercent';

export {
  monthlyMortgagePayment,
  canadianEffectiveMonthlyRate,
  amortizationSchedule,
  yearlyAmortization,
} from './mortgage';

export {
  landTransferTax,
  cmhcPremium,
  cmhcPremiumPST,
  capitalGainsTax,
} from './taxes';

export { PROVINCIAL_DEFAULTS, defaultInputsFor } from './defaults';

export { simulate } from './simulate';

export { normalizeInputs } from './normalizeInputs';

export { buildWealthSeries } from './wealthSeries';
export type { WealthPoint, WealthSeries } from './wealthSeries';

export {
  scoreLifestyle,
  applyLifestyleToInputs,
  deriveCashFlowComfort,
} from './lifestyle';
export type {
  LifestyleDimension,
  LifestyleAnswers,
  LifestyleScore,
  DimensionScore,
  LeanLabel,
  OverallLean,
} from './lifestyle';

export { CITATIONS } from './citations';
export type { Citation } from './citations';

export { inputsToSearchParams, searchParamsToInputs } from './urlState';

export {
  simulateSensitivity,
  DEFAULT_SENSITIVITY_SWING_PCT,
} from './sensitivity';
export type { SensitivityResult } from './sensitivity';

export {
  withPWLBaseline,
  withPWLHighFees,
  withPWLLowDiscipline,
  PWL_CITY_OUTCOMES,
} from './fixtures/pwl-2005-2024';

export {
  suggestRent,
  suggestPriceAndRent,
  normalizeFSAPrefix,
  normalizeFSA3,
  provinceFromPostalCode,
} from './postalCode';
export type { RentSuggestion, PriceAndRentSuggestion } from './postalCode';

export {
  homeTypeDefaults,
  allHomeTypeDefaults,
  HOME_TYPES,
} from './homeType';
export type { HomeTypeDefaults } from './homeType';

export {
  ONTARIO_REGIONS,
  ONTARIO_REGION_LIST,
  regionFromFSA,
} from './ontarioBoroughs';
export type { OntarioRegion, RegionProfile } from './ontarioBoroughs';
