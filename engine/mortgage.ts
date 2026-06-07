// Canadian mortgage math.
//
// Canada uses semi-annual compounding by law (Interest Act). US uses monthly.
// Effective monthly rate = (1 + annualRate/2)^(2/12) - 1.
// This is a 5-15 bps difference vs US convention. Material on a 25-year amortization.

/** Convert annual nominal rate to effective monthly rate using Canadian semi-annual compounding. */
export function canadianEffectiveMonthlyRate(annualRatePct: number): number {
  return Math.pow(1 + annualRatePct / 2, 2 / 12) - 1;
}

/** Standard monthly payment for a fixed-rate amortizing mortgage. */
export function monthlyMortgagePayment(
  principal: number,
  annualRatePct: number,
  amortizationYears: number,
): number {
  if (principal <= 0) return 0;
  if (amortizationYears <= 0) throw new Error('amortizationYears must be positive');

  const r = canadianEffectiveMonthlyRate(annualRatePct);
  const n = amortizationYears * 12;

  if (r === 0) return principal / n;

  const numerator = r * Math.pow(1 + r, n);
  const denominator = Math.pow(1 + r, n) - 1;
  return principal * (numerator / denominator);
}

export interface MonthAmortRow {
  month: number;
  startingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  endingBalance: number;
}

/** Full monthly amortization schedule. */
export function amortizationSchedule(
  principal: number,
  annualRatePct: number,
  amortizationYears: number,
): MonthAmortRow[] {
  const r = canadianEffectiveMonthlyRate(annualRatePct);
  const n = amortizationYears * 12;
  const payment = monthlyMortgagePayment(principal, annualRatePct, amortizationYears);

  const rows: MonthAmortRow[] = [];
  let balance = principal;

  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    const endingBalance = Math.max(0, balance - principalPaid);

    rows.push({
      month: m,
      startingBalance: balance,
      payment,
      interest,
      principal: principalPaid,
      endingBalance,
    });

    balance = endingBalance;
    if (balance <= 0) break;
  }

  return rows;
}

/** Aggregate the amortization schedule into year-level rows for the simulation. */
export interface YearAmortRow {
  year: number;
  startingBalance: number;
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  endingBalance: number;
}

export function yearlyAmortization(
  principal: number,
  annualRatePct: number,
  amortizationYears: number,
  yearsToProject: number,
): YearAmortRow[] {
  const monthly = amortizationSchedule(principal, annualRatePct, amortizationYears);
  const years: YearAmortRow[] = [];

  for (let y = 1; y <= yearsToProject; y++) {
    const slice = monthly.slice((y - 1) * 12, y * 12);
    if (slice.length === 0) {
      // Past the end of the amortization. Loan is paid off.
      years.push({
        year: y,
        startingBalance: 0,
        totalPayment: 0,
        totalInterest: 0,
        totalPrincipal: 0,
        endingBalance: 0,
      });
      continue;
    }

    const startingBalance = slice[0]!.startingBalance;
    const endingBalance = slice[slice.length - 1]!.endingBalance;
    const totalPayment = slice.reduce((s, r) => s + r.payment, 0);
    const totalInterest = slice.reduce((s, r) => s + r.interest, 0);
    const totalPrincipal = slice.reduce((s, r) => s + r.principal, 0);

    years.push({
      year: y,
      startingBalance,
      totalPayment,
      totalInterest,
      totalPrincipal,
      endingBalance,
    });
  }

  return years;
}
