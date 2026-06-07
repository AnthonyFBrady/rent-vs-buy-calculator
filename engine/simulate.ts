// Year-by-year wealth simulation for the rent vs buy comparison.
//
// Owner path:
//   Year 0: Pay down payment + closing costs (LTT, CMHC if applicable, legal fees, moving cost).
//   Each year: Mortgage P+I, property tax, maintenance, home insurance, strata.
//              Home appreciates. Mortgage paid down. Equity = home value - mortgage balance.
//              Past amortizationYears: mortgage P+I drops to zero, freed cash flow
//              shifts to the owner's invested-surplus portfolio (post-payoff reinvestment).
//   Move years: re-applies sell-side commission + buy-side LTT + legal + physical moving cost.
//   Renewal: at mortgageTermYears, amortization continues at mortgageRenewalRatePct.
//   Exit: Sell at home value. Subtract realtor commission, legal, mortgage payoff.
//         Principal Residence Exemption: no capital gains tax in Canada.
//
// Renter path:
//   Year 0: Invest (owner year-0 cash-out − renter moving cost − first+last deposit).
//           If useFHSA, add a marginalTaxRate × $40,000 FHSA refund stipend on top.
//   Each year: Pay rent + renter insurance + deposit delta on move years + moving cost.
//              In-place rent escalates at min(market, rentControlCapPct) when a cap is set.
//              At move years, in-place rent jumps to current market (vacancy decontrol).
//              Invest the difference between owner and renter cash-out, monthly compounded.
//              If renterUsesRRSP: contributions go to RRSP, annual refund to taxable account.
//   Exit: Liquidate portfolio + RRSP (income tax on RRSP) + deposit returned.
//         renterUsesTFSA or useFHSA eliminates exit cap gains on the taxable portfolio.
//
// Output: year-by-year snapshots, exit summary, break-even year if any.

import type {
  CalculatorInputs,
  YearSnapshot,
  ExitSummary,
  CommitmentSummary,
  SimulationResult,
  RenewalBoundary,
} from './types';
import { yearlyAmortization, monthlyMortgagePayment } from './mortgage';
import {
  landTransferTax,
  cmhcPremium,
  cmhcPremiumPST,
  capitalGainsTax,
} from './taxes';
import { fivePercentRule } from './fivePercent';

/**
 * Home insurance has been escalating faster than CPI in Canada due to
 * climate-driven losses. We use this as the escalation rate for the owner's
 * home insurance and the renter's contents insurance.
 */
const INSURANCE_ESCALATION_OVER_INFLATION_PCT = 0.03;

/** FHSA lifetime contribution room. $8K/yr for 5 years. */
const FHSA_LIFETIME_LIMIT = 40_000;

/**
 * Compute the years a move occurs given an evenly-spaced moves count.
 * Example: holdingPeriod=10, moves=2 → years 3 and 7.
 * Returns a Set for O(1) membership checks.
 */
function moveYears(moves: number, holdingPeriodYears: number): Set<number> {
  const out = new Set<number>();
  if (moves <= 0 || holdingPeriodYears <= 0) return out;
  for (let i = 1; i <= moves; i++) {
    const y = Math.round((i * holdingPeriodYears) / (moves + 1));
    if (y >= 1 && y <= holdingPeriodYears) out.add(y);
  }
  return out;
}

/**
 * Grow a portfolio for one year using monthly compounding. Beginning-of-month
 * contributions land before each month's growth. Closes the ~0.5% understatement
 * of annual-end-deposit modeling over a 10y horizon.
 */
function growMonthly(
  startBalance: number,
  annualContribution: number,
  annualReturnPct: number,
): { end: number; growth: number } {
  const monthlyR = Math.pow(1 + annualReturnPct, 1 / 12) - 1;
  const monthlyContribution = annualContribution / 12;
  let balance = startBalance;
  for (let m = 0; m < 12; m++) {
    balance = (balance + monthlyContribution) * (1 + monthlyR);
  }
  const growth = balance - startBalance - annualContribution;
  return { end: balance, growth };
}

export function simulate(inputs: CalculatorInputs): SimulationResult {
  const {
    province,
    isTorontoMunicipalLTT,
    isFirstTimeBuyer,
    homePrice,
    monthlyRent,
    downPaymentPct,
    mortgageRatePct,
    amortizationYears,
    holdingPeriodYears,
    propertyTaxPct,
    maintenancePct,
    homeInsuranceMonthly,
    rentInsuranceMonthly,
    rentEscalationPct,
    homeAppreciationPct,
    inflationPct,
    investmentReturnPct,
    investmentFeePct,
    savingsDisciplinePct,
    marginalTaxRatePct,
    realtorCommissionPct,
    legalFeesAtPurchase,
    legalFeesAtSale,
    monthlyStrataFee = 0,
    rentControlCapPct,
    ownerMoves = 0,
    renterMoves = 0,
    useFHSA = false,
    // v3
    mortgageTermYears = 5,
    ownerMovingCostPerMove = 2_500,
    renterMovingCostPerMove = 400,
    renterUsesRRSP = false,
  } = inputs;

  const effectiveRenewalRate = inputs.mortgageRenewalRatePct ?? mortgageRatePct;
  const renterDiscipline = inputs.renterSavingsDisciplinePct ?? savingsDisciplinePct;
  const ownerDiscipline = inputs.ownerSavingsDisciplinePct ?? savingsDisciplinePct;

  // TFSA room: lifetime cap $95k accumulated through 2025.
  // Simplified: each year from max(birthYear+18, 2009) to 2025 contributes $7k.
  const birthYear = inputs.birthYear ?? 1990;
  const tfsaEligibleSince = Math.max(birthYear + 18, 2009);
  const TFSA_ANNUAL_ACCRUAL = 7_000;
  const TFSA_LIFETIME_CAP = 95_000;
  let tfsaRemainingRoom = inputs.renterUsesTFSA
    ? Math.min(TFSA_LIFETIME_CAP, Math.max(0, (2026 - tfsaEligibleSince) * TFSA_ANNUAL_ACCRUAL))
    : 0;

  // RRSP annual deduction limit: 18% of prior-year earned income, max $31,560 (2024 limit).
  const annualIncome = inputs.annualIncome ?? 120_000;
  const rrspAnnualRoom = Math.min(annualIncome * 0.18, 31_560);

  // (firstTermMonthlyPayment and firstTermYears are no longer needed — see multi-term loop below)

  // ─── Year 0: closing costs ─────────────────────────────────────────────
  const downPayment = homePrice * downPaymentPct;
  const mortgagePrincipal = homePrice - downPayment;
  const cmhc = cmhcPremium(homePrice, downPaymentPct);
  // CMHC premium is added to the mortgage balance (not paid in cash).
  const financedPrincipal = mortgagePrincipal + cmhc;
  // PST on the CMHC premium is paid in cash at closing in ON, QC, SK.
  const cmhcPST = cmhcPremiumPST(cmhc, province);

  const ltt = landTransferTax(homePrice, province, {
    isTorontoMunicipalLTT: isTorontoMunicipalLTT ?? false,
    isFirstTimeBuyer,
  });

  const ownerYear0CashOut =
    downPayment + ltt.total + legalFeesAtPurchase + cmhcPST + ownerMovingCostPerMove;

  // First + last month deposit paid by renter at move-in.
  const firstLastDeposit = 2 * monthlyRent;

  // The renter invests: owner's year-0 outlay + FHSA stipend − deposit − moving cost.
  // If the owner is deploying prior equity, the renter comparison uses the full equity
  // amount (they keep all of it invested instead of splitting it toward a down payment).
  const fhsaRefundStipend = useFHSA
    ? FHSA_LIFETIME_LIMIT * marginalTaxRatePct
    : 0;
  const priorEquity = inputs.ownerPriorEquity ?? 0;
  const equityBase = priorEquity > 0 ? priorEquity : ownerYear0CashOut;
  const renterYear0Investment =
    equityBase + fhsaRefundStipend - firstLastDeposit - renterMovingCostPerMove;

  // ─── Multi-term mortgage schedule ─────────────────────────────────────
  // Each 5-year renewal recalculates the monthly payment from the current
  // balance and remaining amortization, which is what Canadian lenders do.
  const renewalBoundaries: RenewalBoundary[] = [];
  let ownerYearlyAmort = [] as ReturnType<typeof yearlyAmortization>;
  const paymentByYear = new Map<number, number>();
  const rateByYear = new Map<number, number>();

  let termBalance = financedPrincipal;
  let yearCursor = 0;

  while (yearCursor < Math.min(holdingPeriodYears, amortizationYears) && termBalance > 1) {
    const isFirst = yearCursor === 0;
    const termRate = isFirst ? mortgageRatePct : effectiveRenewalRate;
    const termLen = Math.min(
      mortgageTermYears,
      holdingPeriodYears - yearCursor,
      amortizationYears - yearCursor,
    );
    const remainingAmort = amortizationYears - yearCursor;
    const termPayment = monthlyMortgagePayment(termBalance, termRate, remainingAmort);

    renewalBoundaries.push({ termStartYear: yearCursor, rate: termRate, monthlyPayment: termPayment });

    const rows = yearlyAmortization(termBalance, termRate, remainingAmort, termLen);
    for (let y = yearCursor + 1; y <= yearCursor + termLen; y++) {
      paymentByYear.set(y, termPayment);
      rateByYear.set(y, termRate);
    }
    ownerYearlyAmort = [...ownerYearlyAmort, ...rows];
    termBalance = rows[rows.length - 1]?.endingBalance ?? 0;
    yearCursor += termLen;
  }

  // ─── Investment growth rate (after fees) ───────────────────────────────
  const netInvestmentReturnPct = investmentReturnPct - investmentFeePct;

  // ─── Move schedules (owner and renter are independent) ────────────────
  const ownerMovesAt = moveYears(ownerMoves, holdingPeriodYears);
  const renterMovesAt = moveYears(renterMoves, holdingPeriodYears);
  const hasRentCap =
    rentControlCapPct !== null &&
    rentControlCapPct !== undefined &&
    rentControlCapPct < rentEscalationPct;
  const inPlaceEscalationPct = hasRentCap
    ? Math.min(rentEscalationPct, rentControlCapPct as number)
    : rentEscalationPct;

  // ─── Year-by-year loop ────────────────────────────────────────────────
  const yearByYear: YearSnapshot[] = [];

  let currentHomeValue = homePrice;

  // Renter portfolio split: TFSA (tax-free) and taxable (cap-gains on exit).
  // Year-0 lump sum is allocated to TFSA first (up to room), then taxable.
  let renterTfsaPortfolio = 0;
  let renterTaxablePortfolio = 0;
  let renterTaxableCostBasis = 0;
  if (inputs.renterUsesTFSA && tfsaRemainingRoom > 0) {
    const tfsaAlloc = Math.min(renterYear0Investment, tfsaRemainingRoom);
    renterTfsaPortfolio = tfsaAlloc;
    renterTaxablePortfolio = Math.max(0, renterYear0Investment - tfsaAlloc);
    tfsaRemainingRoom -= tfsaAlloc;
  } else {
    renterTaxablePortfolio = Math.max(0, renterYear0Investment);
  }
  renterTaxableCostBasis = renterTaxablePortfolio;

  // Owner-side surplus portfolio. Starts at 0 for fresh buyers; non-zero if
  // the owner deploys prior equity that exceeds the year-0 cash-out.
  const ownerStartingEquity = priorEquity > ownerYear0CashOut
    ? priorEquity - ownerYear0CashOut
    : 0;
  let ownerPortfolio = ownerStartingEquity;
  let ownerPortfolioCostBasis = ownerStartingEquity;
  let currentRent = monthlyRent;       // in-place rent (what renter actually pays)
  let currentMarketRent = monthlyRent;  // open-market rent for a new lease
  let currentHomeInsurance = homeInsuranceMonthly;
  let currentRentInsurance = rentInsuranceMonthly;
  let currentStrataFee = monthlyStrataFee;
  let currentDeposit = firstLastDeposit;
  let renterRrspBalance = 0;
  let renterRrspCostBasis = 0;
  let breakEvenYear: number | null = null;

  const insuranceEscalationPct =
    inflationPct + INSURANCE_ESCALATION_OVER_INFLATION_PCT;

  let cumulativeOwnerMoveCosts = 0;

  for (let y = 1; y <= holdingPeriodYears; y++) {
    // Past the amortization cliff the mortgage is fully paid; use a zero-out row.
    const amort = ownerYearlyAmort[y - 1] ?? {
      year: y, startingBalance: 0, totalPayment: 0,
      totalInterest: 0, totalPrincipal: 0, endingBalance: 0,
    };
    const ownerMoveThisYear = ownerMovesAt.has(y);
    const renterMoveThisYear = renterMovesAt.has(y);

    // Effective mortgage rate and monthly payment this year.
    const mortgageRateThisYear = rateByYear.get(y) ?? mortgageRatePct;
    const ownerMonthlyPaymentThisYear = paymentByYear.get(y) ?? 0;

    // Vacancy decontrol: on a renter move, in-place rent jumps to current market.
    if (renterMoveThisYear) {
      currentRent = currentMarketRent;
    }

    // Owner annual costs
    const ownerAnnualMortgagePayment = amort.totalPayment;
    const ownerAnnualInterest = amort.totalInterest;
    const ownerAnnualPrincipal = amort.totalPrincipal;
    const ownerAnnualPropertyTax = currentHomeValue * propertyTaxPct;
    const ownerAnnualMaintenance = currentHomeValue * maintenancePct;
    const ownerAnnualInsurance = currentHomeInsurance * 12;
    const ownerAnnualStrata = currentStrataFee * 12;

    // Owner move years: re-apply sell + rebuy frictions + physical moving cost.
    const ownerPhysicalMovingCost = ownerMoveThisYear ? ownerMovingCostPerMove : 0;
    const ownerMoveTransactionCost = ownerMoveThisYear
      ? currentHomeValue * realtorCommissionPct +
        landTransferTax(currentHomeValue, province, {
          isTorontoMunicipalLTT: isTorontoMunicipalLTT ?? false,
          isFirstTimeBuyer: false, // FTB rebate only on first purchase
        }).total +
        legalFeesAtPurchase +
        legalFeesAtSale +
        ownerPhysicalMovingCost
      : 0;

    const ownerAnnualCashOut =
      ownerAnnualMortgagePayment +
      ownerAnnualPropertyTax +
      ownerAnnualMaintenance +
      ownerAnnualInsurance +
      ownerAnnualStrata +
      ownerMoveTransactionCost;

    // Renter costs: rent + insurance + deposit delta on move years + physical moving cost.
    const renterPhysicalMovingCost = renterMoveThisYear ? renterMovingCostPerMove : 0;
    const depositNetCostThisYear = renterMoveThisYear
      ? Math.max(0, 2 * currentMarketRent - currentDeposit)
      : 0;
    if (renterMoveThisYear) currentDeposit = 2 * currentMarketRent;

    const renterAnnualRent = currentRent * 12;
    const renterAnnualInsurance = currentRentInsurance * 12;
    const renterAnnualCashOut =
      renterAnnualRent +
      renterAnnualInsurance +
      renterPhysicalMovingCost +
      depositNetCostThisYear;

    // Symmetric invest-the-difference: whichever side pays less invests the
    // gap into the SAME portfolio as the other side would have.
    // Track cumulative mid-hold move costs — deducted from finalOwnerWealth at exit.
    cumulativeOwnerMoveCosts += ownerMoveTransactionCost;

    // Owner move transaction costs are friction losses, not investable savings for the renter.
    // Excluding them keeps the renter line flat when only the owner's move frequency changes.
    const ownerBaselineCashOut = ownerAnnualCashOut - ownerMoveTransactionCost;
    const annualDifference = ownerBaselineCashOut - renterAnnualCashOut;
    const renterContribution =
      annualDifference > 0
        ? annualDifference * renterDiscipline
        : 0;
    const ownerContribution =
      annualDifference < 0
        ? Math.abs(annualDifference) * ownerDiscipline
        : 0;

    // Distribute annual contribution: TFSA → RRSP → taxable (account priority order).
    if (inputs.renterUsesTFSA) tfsaRemainingRoom += TFSA_ANNUAL_ACCRUAL;
    let remaining = renterContribution;
    let renterTfsaContribThisYear = 0;
    let rrspContributionThisYear = 0;
    let renterTaxableContribThisYear = 0;

    // 1. TFSA (tax-free growth, no exit cap gains)
    if (inputs.renterUsesTFSA && remaining > 0 && tfsaRemainingRoom > 0) {
      renterTfsaContribThisYear = Math.min(remaining, tfsaRemainingRoom);
      tfsaRemainingRoom -= renterTfsaContribThisYear;
      remaining -= renterTfsaContribThisYear;
    }

    // 2. RRSP (deferred tax; refund reinvested into taxable portfolio)
    if (renterUsesRRSP && remaining > 0) {
      rrspContributionThisYear = Math.min(remaining, rrspAnnualRoom);
      const rrspRefund = rrspContributionThisYear * marginalTaxRatePct;
      renterTaxableContribThisYear += rrspRefund;
      renterTaxableCostBasis += rrspRefund;
      renterRrspBalance = growMonthly(renterRrspBalance, rrspContributionThisYear, netInvestmentReturnPct).end;
      renterRrspCostBasis += rrspContributionThisYear;
      remaining -= rrspContributionThisYear;
    }

    // 3. Taxable remainder
    renterTaxableContribThisYear += remaining;
    renterTaxableCostBasis += remaining;

    // Portfolio growth: monthly compounded, beginning-of-month contributions.
    const renterPortfolioStart = renterTfsaPortfolio + renterTaxablePortfolio;

    const tfsaGrown = growMonthly(renterTfsaPortfolio, renterTfsaContribThisYear, netInvestmentReturnPct);
    renterTfsaPortfolio = tfsaGrown.end;

    const taxableGrown = growMonthly(renterTaxablePortfolio, renterTaxableContribThisYear, netInvestmentReturnPct);
    renterTaxablePortfolio = taxableGrown.end;

    const renterPortfolioEnd = renterTfsaPortfolio + renterTaxablePortfolio;
    const renterPortfolioGrowth = tfsaGrown.growth + taxableGrown.growth;

    const ownerPortfolioStart = ownerPortfolio;
    const ownerGrown = growMonthly(
      ownerPortfolioStart,
      ownerContribution,
      netInvestmentReturnPct,
    );
    const ownerPortfolioGrowth = ownerGrown.growth;
    const ownerPortfolioEnd = ownerGrown.end;
    ownerPortfolioCostBasis += ownerContribution;
    ownerPortfolio = ownerPortfolioEnd;

    // Owner home value appreciates
    currentHomeValue = currentHomeValue * (1 + homeAppreciationPct);
    const ownerMortgageBalance = amort.endingBalance;
    const ownerEquity = currentHomeValue - ownerMortgageBalance;

    // Wealth comparison: owner equity + owner portfolio vs renter portfolio + RRSP + deposit
    const ownerWealthThisYear = ownerEquity + ownerPortfolioEnd;
    const renterWealthThisYear = renterPortfolioEnd + renterRrspBalance + currentDeposit;
    const wealthDelta = ownerWealthThisYear - renterWealthThisYear;
    if (breakEvenYear === null && wealthDelta >= 0 && y > 0) {
      breakEvenYear = y;
    }

    yearByYear.push({
      year: y,
      ownerMonthlyPayment: ownerMonthlyPaymentThisYear,
      ownerMortgageRate: mortgageRateThisYear,
      ownerAnnualMortgagePayment,
      ownerAnnualInterest,
      ownerAnnualPrincipal,
      ownerAnnualPropertyTax,
      ownerAnnualMaintenance,
      ownerAnnualInsurance,
      ownerAnnualStrata,
      ownerMoveTransactionCost,
      ownerPhysicalMovingCost,
      ownerAnnualCashOut,
      ownerHomeValue: currentHomeValue,
      ownerMortgageBalance,
      ownerEquity,
      ownerPortfolioStart,
      ownerPortfolioContribution: ownerContribution,
      ownerPortfolioGrowth,
      ownerPortfolioEnd,
      ownerPortfolioCostBasis,
      renterAnnualRent,
      renterAnnualInsurance,
      renterAnnualCashOut,
      marketMonthlyRent: currentMarketRent,
      ownerMoveOccurredThisYear: ownerMoveThisYear,
      renterMoveOccurredThisYear: renterMoveThisYear,
      renterPhysicalMovingCost,
      renterDepositNetCostThisYear: depositNetCostThisYear,
      renterDepositBalance: currentDeposit,
      renterRrspBalance,
      renterRrspContribution: rrspContributionThisYear,
      renterPortfolioStart,
      renterPortfolioContribution: renterContribution,
      renterPortfolioGrowth,
      renterPortfolioEnd,
      renterCostBasis: renterTaxableCostBasis,
      cashOutDelta: ownerAnnualCashOut - renterAnnualCashOut,
      wealthDelta,
    });

    // Escalate next-year values. In-place rent escalates at min(market, cap).
    // Market rent always escalates at the unconstrained rate, so a future move
    // reset captures the cumulative market growth.
    currentRent = currentRent * (1 + inPlaceEscalationPct);
    currentMarketRent = currentMarketRent * (1 + rentEscalationPct);
    currentHomeInsurance = currentHomeInsurance * (1 + insuranceEscalationPct);
    currentRentInsurance = currentRentInsurance * (1 + insuranceEscalationPct);
    currentStrataFee = currentStrataFee * (1 + inflationPct);
  }

  // ─── Exit summary ─────────────────────────────────────────────────────
  const lastYear = yearByYear[yearByYear.length - 1]!;

  // Owner exit: home equity (PRE-sheltered) + portfolio (taxed if not sheltered)
  const ownerSalePrice = lastYear.ownerHomeValue;
  const ownerRealtorCommission = ownerSalePrice * realtorCommissionPct;
  const ownerLegalFees = legalFeesAtSale;
  const ownerMortgagePayoff = lastYear.ownerMortgageBalance;
  const ownerHomeNetProceeds =
    ownerSalePrice - ownerRealtorCommission - ownerLegalFees - ownerMortgagePayoff;

  const ownerPortfolioValue = lastYear.ownerPortfolioEnd;
  const ownerPortfolioRealizedGain = Math.max(
    0,
    ownerPortfolioValue - lastYear.ownerPortfolioCostBasis,
  );
  // Owner's surplus portfolio is always taxable — no owner TFSA in this model.
  const ownerPortfolioCapGainsTax = capitalGainsTax(ownerPortfolioRealizedGain, marginalTaxRatePct);
  const ownerPortfolioNetProceeds =
    ownerPortfolioValue - ownerPortfolioCapGainsTax;

  // Renter exit: TFSA (no tax) + taxable (cap gains on taxable portion only) + RRSP net + deposit.
  // TFSA is already split out — renterTaxablePortfolio tracks only the non-sheltered portion.
  // FHSA overrides: shelters any remaining taxable gains (fully simplified model).
  const renterPortfolioValue = lastYear.renterPortfolioEnd; // total TFSA + taxable (for display)
  const renterTaxableRealizedGain = Math.max(0, renterTaxablePortfolio - lastYear.renterCostBasis);
  const renterCapGainsTax = useFHSA
    ? 0
    : capitalGainsTax(renterTaxableRealizedGain, marginalTaxRatePct);
  // Expose combined gain for ExitSummary (total unrealized gain across both TFSA and taxable).
  const renterRealizedGain = Math.max(0, renterPortfolioValue - lastYear.renterCostBasis);

  const renterDepositReturned = currentDeposit;
  const rrspExitRate = inputs.rrspWithdrawalTaxRatePct ?? marginalTaxRatePct;
  const renterRrspExitTax = renterUsesRRSP
    ? renterRrspBalance * rrspExitRate
    : 0;
  const renterRrspNetProceeds = renterRrspBalance - renterRrspExitTax;

  const renterNetProceeds =
    renterPortfolioValue - renterCapGainsTax + renterDepositReturned + renterRrspNetProceeds;

  const finalOwnerWealth = ownerHomeNetProceeds + ownerPortfolioNetProceeds - cumulativeOwnerMoveCosts;
  const finalRenterWealth = renterNetProceeds;
  const netAdvantageToOwner = finalOwnerWealth - finalRenterWealth;

  const exit: ExitSummary = {
    ownerSalePrice,
    ownerRealtorCommission,
    ownerLegalFees,
    ownerMortgagePayoff,
    ownerHomeNetProceeds,
    ownerPortfolioValue,
    ownerPortfolioRealizedGain,
    ownerPortfolioCapitalGainsTax: ownerPortfolioCapGainsTax,
    ownerPortfolioNetProceeds,
    renterPortfolioValue,
    renterRealizedGain,
    renterCapitalGainsTax: renterCapGainsTax,
    renterDepositReturned,
    renterRrspBalance,
    renterRrspExitTax,
    renterNetProceeds,
    finalOwnerWealth,
    finalRenterWealth,
    netAdvantageToOwner,
  };

  // ─── Commitment summary ───────────────────────────────────────────────
  const firstYear = yearByYear[0]!;
  const totalContributions = yearByYear.reduce(
    (s, y) => s + y.renterPortfolioContribution,
    0,
  );
  const totalOwnerCarry = yearByYear.reduce((s, y) => s + y.ownerAnnualCashOut, 0);

  const commitment: CommitmentSummary = {
    renterStartingLumpSum: renterYear0Investment,
    renterFirstYearMonthlyContribution: firstYear.renterPortfolioContribution / 12,
    renterTotalInvested: renterYear0Investment + totalContributions,
    ownerStartingCashOut: ownerYear0CashOut,
    ownerFirstYearMonthlyCarry: firstYear.ownerAnnualCashOut / 12,
    ownerTotalOutOfPocket: ownerYear0CashOut + totalOwnerCarry,
    ownerStartingPortfolio: ownerStartingEquity,
  };

  return {
    inputs,
    fivePercentRule: fivePercentRule(homePrice, monthlyRent, {
      propertyTaxPct,
      maintenancePct,
    }),
    yearByYear,
    exit,
    commitment,
    breakEvenYear,
    renewalBoundaries,
  };
}
