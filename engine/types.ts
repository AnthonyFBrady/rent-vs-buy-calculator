// Canadian rent vs buy calculator — type definitions.
// Source-of-truth for math contract between engine and UI.

export type Province =
  | 'ON'
  | 'BC'
  | 'AB'
  | 'QC'
  | 'MB'
  | 'SK'
  | 'NS'
  | 'NB'
  | 'NL'
  | 'PE';

// Home type drives maintenance %, monthly strata, and appreciation defaults.
// Used by `homeTypeDefaults()` and `ontarioBoroughs.ts` median-price lookups.
export type HomeType =
  | 'condo-apt'
  | 'condo-townhouse'
  | 'freehold-townhouse'
  | 'semi-detached'
  | 'detached';

// All currency in CAD. All rates as decimals (0.05 = 5%).
// Holding period in whole years.
export interface CalculatorInputs {
  province: Province;
  isTorontoMunicipalLTT?: boolean;
  isFirstTimeBuyer: boolean;

  /** Optional. Drives the rent-suggestion heuristic. */
  postalCode: string;

  homePrice: number;
  monthlyRent: number;

  downPaymentPct: number;
  mortgageRatePct: number;
  amortizationYears: number;
  holdingPeriodYears: number;

  // Ownership cost assumptions
  propertyTaxPct: number;
  maintenancePct: number;
  homeInsuranceMonthly: number;

  // Renter assumptions
  rentInsuranceMonthly: number;
  rentEscalationPct: number;

  // Growth assumptions
  homeAppreciationPct: number;
  inflationPct: number;

  // Investment side
  investmentReturnPct: number;
  investmentFeePct: number;
  savingsDisciplinePct: number;

  // Tax (for renter's capital gains at exit)
  marginalTaxRatePct: number;

  // Transaction costs at sale
  realtorCommissionPct: number;
  legalFeesAtPurchase: number;
  legalFeesAtSale: number;

  // Tax shelter on the renter side. If true, gains compound tax-free and are
  // not taxed at exit. Assumes contributions stay within TFSA room.
  renterUsesTFSA: boolean;

  // ─── v2 extensions ────────────────────────────────────────────────────
  // All optional. Engine treats missing/undefined as the documented default.

  /** Monthly condo / strata fee. Default 0 (detached home). Escalates at inflation. */
  monthlyStrataFee?: number;

  /**
   * Annual rent-control cap (decimal, e.g. 0.025 = 2.5%). When set, the
   * in-place renter's rent escalates at min(market, cap). On a move year,
   * the in-place rent jumps to current market rent (vacancy decontrol).
   * Null / undefined means no cap.
   */
  rentControlCapPct?: number | null;

  /**
   * Number of times the owner sells and rebuys during the holding period.
   * 0 means stay put. Moves spaced evenly. Each move year incurs realtor
   * commission + LTT + legal on the owner side.
   */
  ownerMoves?: number;

  /**
   * Number of times the renter relocates during the holding period.
   * 0 means stay put. Moves spaced evenly. Each move year resets in-place
   * rent to market (vacancy decontrol). No sell+rebuy friction on the renter.
   */
  renterMoves?: number;

  /**
   * First Home Savings Account modeling for the renter side (path to first
   * purchase). Simplified: equivalent to a TFSA shelter on portfolio gains
   * PLUS a one-time $40,000 × marginalTaxRate refund added to the renter's
   * year-0 lump sum (representing 5y of $8K/yr deductible contributions
   * already in the bag by purchase time).
   */
  useFHSA?: boolean;

  /**
   * Home type. Drives maintenance %, strata fee, and appreciation defaults
   * via `homeTypeDefaults()` and median-price seeding via `ontarioBoroughs.ts`.
   * Undefined means the engine uses province-level defaults (legacy v1 path).
   */
  homeType?: HomeType;

  // ─── v3 extensions ────────────────────────────────────────────────────

  /** Length of the initial mortgage term before renewal. Default 5 years. */
  mortgageTermYears?: number;

  /**
   * Rate applied at the first renewal. Defaults to mortgageRatePct (no
   * change). Set higher to model rate-reset risk at the 5-year mark.
   */
  mortgageRenewalRatePct?: number;

  /**
   * Physical moving cost for the owner per move (movers, truck, misc).
   * Added to ownerYear0CashOut at purchase and to ownerMoveTransactionCost
   * in each subsequent owner-move year. Default $2,500.
   */
  ownerMovingCostPerMove?: number;

  /**
   * Physical moving cost for the renter per move (truck rental, gas).
   * Subtracted from renterYear0Investment at move-in and charged in each
   * renter-move year. Default $400.
   */
  renterMovingCostPerMove?: number;

  /**
   * Fraction of the monthly cash-out gap the renter actually invests.
   * The key behavioural load-bearing assumption in the model. A renter
   * who does not invest the difference loses the comparison at any horizon.
   * Defaults to savingsDisciplinePct.
   */
  renterSavingsDisciplinePct?: number;

  /**
   * Fraction of freed cash flow the owner actually invests, primarily
   * relevant post-payoff when P+I drops to zero. Defaults to
   * savingsDisciplinePct.
   */
  ownerSavingsDisciplinePct?: number;

  /**
   * RRSP shelter on the renter's invest-the-difference contributions.
   * Each year's contribution generates a marginalTaxRate refund reinvested
   * into the renter's taxable portfolio. At exit the RRSP balance is taxed
   * at marginalTaxRatePct as income (full withdrawal, not capital gains).
   * Default false.
   */
  renterUsesRRSP?: boolean;

  /**
   * Tax rate applied to RRSP withdrawals at exit. In retirement, income is
   * typically lower than working-years marginal rate, so this should be set
   * below marginalTaxRatePct. Defaults to marginalTaxRatePct when absent.
   * A value of 0.27 corresponds to roughly $50k/yr retirement income in ON.
   */
  rrspWithdrawalTaxRatePct?: number;

  /**
   * Year of birth. Used to compute cumulative TFSA room (each calendar year
   * from max(birthYear + 18, 2009) to the current year adds $7,000, capped
   * at the $95,000 lifetime room accumulated through 2025). Default 1990.
   */
  birthYear?: number;

  /**
   * Annual employment income. Used to compute RRSP deduction room:
   * min(annualIncome × 18%, $31,560). Default $120,000.
   */
  annualIncome?: number;

  /**
   * Prior home equity being deployed into this purchase (e.g., proceeds from
   * selling a current home). When > 0, the renter comparison uses this full
   * amount as their starting investment rather than just the owner's closing
   * costs. Any equity above ownerYear0CashOut stays in the owner's portfolio.
   * Default 0 (fresh buyer, no prior equity).
   */
  ownerPriorEquity?: number;

  /**
   * Explicit TFSA room available at the start of the simulation. When set,
   * overrides the birth-year-derived TFSA room calculation. Useful when the
   * user knows their exact remaining room (e.g., $60k of $95k used).
   * Only relevant when renterUsesTFSA = true.
   */
  renterTfsaRoomOverride?: number;

  /**
   * Explicit FHSA lifetime room remaining at the start of the simulation.
   * Overrides the default $40k lifetime cap. Set to 0 if already exhausted.
   * Only relevant when useFHSA = true.
   */
  renterFhsaRoomOverride?: number;

  /**
   * Explicit RRSP room available at the start of the simulation (unused
   * contribution room carried forward). When set, the renter can contribute
   * up to this amount in year 1 in addition to that year's annual room.
   * Default 0 (no prior room assumed).
   */
  renterRrspCarryforward?: number;
}

export interface YearSnapshot {
  year: number;

  // Owner side
  ownerMonthlyPayment: number;
  /** Effective mortgage rate this year. mortgageRatePct pre-renewal, mortgageRenewalRatePct after. */
  ownerMortgageRate: number;
  ownerAnnualMortgagePayment: number;
  ownerAnnualInterest: number;
  ownerAnnualPrincipal: number;
  ownerAnnualPropertyTax: number;
  ownerAnnualMaintenance: number;
  ownerAnnualInsurance: number;
  ownerAnnualStrata: number;
  /** Sell + rebuy transaction cost (including physical moving cost) in owner-move years. 0 otherwise. */
  ownerMoveTransactionCost: number;
  /** Physical moving cost component of ownerMoveTransactionCost. 0 in non-move years. */
  ownerPhysicalMovingCost: number;
  ownerAnnualCashOut: number;
  ownerHomeValue: number;
  ownerMortgageBalance: number;
  ownerEquity: number;

  /** Owner-side surplus invested in the same portfolio as the renter when
   * owner cash flow is lower than renter cash flow (e.g., high down payment
   * or paid-off home). Zero in typical scenarios. */
  ownerPortfolioStart: number;
  ownerPortfolioContribution: number;
  ownerPortfolioGrowth: number;
  ownerPortfolioEnd: number;
  ownerPortfolioCostBasis: number;

  // Renter side
  renterAnnualRent: number;
  renterAnnualInsurance: number;
  renterAnnualCashOut: number;
  /** Open-market monthly rent for a new lease this year. Diverges from in-place
   * rent when a rent-control cap is binding. */
  marketMonthlyRent: number;
  /** True if the owner sells and rebuys this year. */
  ownerMoveOccurredThisYear: boolean;
  /** True if the renter relocates this year. Rent resets to market. */
  renterMoveOccurredThisYear: boolean;
  /** Physical moving cost this year (renter). 0 in non-move years. */
  renterPhysicalMovingCost: number;
  /** Net deposit outflow this year. Non-zero only in renter-move years when market rent has risen. */
  renterDepositNetCostThisYear: number;
  /** Deposit balance held by landlord. Returned to renter at exit. */
  renterDepositBalance: number;
  /** RRSP portfolio balance end of this year. 0 if renterUsesRRSP is false. */
  renterRrspBalance: number;
  /** RRSP contribution this year. 0 if renterUsesRRSP is false. */
  renterRrspContribution: number;
  renterPortfolioStart: number;
  renterPortfolioContribution: number;
  renterPortfolioGrowth: number;
  renterPortfolioEnd: number;
  renterCostBasis: number;

  // Comparison this year
  cashOutDelta: number; // owner - renter (positive = owner pays more this year)
  wealthDelta: number;  // (owner equity + owner portfolio) - renter portfolio
}

export interface ExitSummary {
  ownerSalePrice: number;
  ownerRealtorCommission: number;
  ownerLegalFees: number;
  ownerMortgagePayoff: number;
  ownerHomeNetProceeds: number;    // PRE applies, no cap gains on the home

  /** Owner's invested-surplus portfolio at exit. Zero in most scenarios. */
  ownerPortfolioValue: number;
  ownerPortfolioRealizedGain: number;
  ownerPortfolioCapitalGainsTax: number;
  ownerPortfolioNetProceeds: number;

  renterPortfolioValue: number;
  renterRealizedGain: number;
  renterCapitalGainsTax: number;
  /** Deposit returned at end of holding period. */
  renterDepositReturned: number;
  /** RRSP balance at exit before income tax. 0 if renterUsesRRSP is false. */
  renterRrspBalance: number;
  /** Income tax on full RRSP withdrawal (marginalTaxRatePct × balance). 0 if not using RRSP. */
  renterRrspExitTax: number;
  /** Taxable portfolio net + deposit returned + RRSP net proceeds. */
  renterNetProceeds: number;

  /** Home net proceeds + owner-side invested-surplus portfolio. */
  finalOwnerWealth: number;
  finalRenterWealth: number;
  netAdvantageToOwner: number;     // positive = buy wins, negative = rent wins
}

/**
 * What each side actually has to put up over the holding period.
 * Surfaces the discipline requirement that Felix flags as load-bearing.
 */
export interface CommitmentSummary {
  /** Lump sum required at year 0 (matches owner closing costs for apples-to-apples). */
  renterStartingLumpSum: number;
  /** Monthly amount the renter must invest in year 1 (before any escalation). */
  renterFirstYearMonthlyContribution: number;
  /** Sum of the starting lump sum plus every yearly contribution over the holding period. */
  renterTotalInvested: number;

  /** Out-of-pocket at year 0 for the owner (down payment + closing + LTT + CMHC cash). */
  ownerStartingCashOut: number;
  /** Owner's all-in carrying cost in year 1 (mortgage + tax + maint + insurance), monthly. */
  ownerFirstYearMonthlyCarry: number;
  /** Total out-of-pocket over the holding period (year 0 cash plus all yearly carrying costs). */
  ownerTotalOutOfPocket: number;
  /**
   * Equity the owner keeps invested at year 0 (prior equity minus closing costs).
   * Zero for fresh buyers. When > 0, the owner starts with a portfolio in addition to the home.
   */
  ownerStartingPortfolio: number;
}

export interface FivePercentRuleResult {
  components: {
    propertyTaxPct: number;
    maintenancePct: number;
    costOfCapitalPct: number;
  };
  totalUnrecoverablePct: number;
  annualUnrecoverable: number;
  monthlyBreakEvenRent: number;
  verdict: 'rent-favored' | 'buy-favored' | 'tie';
  marginPctOfThreshold: number;    // (actualRent - threshold) / threshold
}

export interface RenewalBoundary {
  /** Year at which this mortgage term begins. 0 = initial purchase. */
  termStartYear: number;
  rate: number;
  monthlyPayment: number;
}

export interface SimulationResult {
  inputs: CalculatorInputs;
  fivePercentRule: FivePercentRuleResult;
  yearByYear: YearSnapshot[];
  exit: ExitSummary;
  commitment: CommitmentSummary;
  breakEvenYear: number | null;    // first year owner net worth >= renter, null if never
  /** One entry per mortgage term. First entry is the initial purchase term. */
  renewalBoundaries: RenewalBoundary[];
}
