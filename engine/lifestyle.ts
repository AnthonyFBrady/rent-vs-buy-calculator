// Qualitative "your fit" model. Scores 6 lifestyle dimensions into a directional
// rent/buy lean and feeds the two quantifiable dimensions back into the engine.
//
// Design and citations: research/lifestyle-model.md. Felix's rule (framework
// line 130): non-financial factors are legitimate but SEPARATE from the math.
// So the output is directional by design. No aggregate percentage is exposed.

import type { CalculatorInputs } from './types';

export type LifestyleDimension =
  | 'discipline'
  | 'mobility'
  | 'maintenanceTolerance'
  | 'concentrationTolerance'
  | 'controlValue'
  | 'cashFlowComfort';

/** Raw Likert answers, each an index 0..4 (0 = strongest first anchor). Undefined = unanswered. */
export type LifestyleAnswers = Partial<Record<LifestyleDimension, number>>;

const LIKERT_MAX = 4;

// Does a HIGH Likert answer lean buy (+1) or rent (-1)?
// discipline is the only inverted one: more disciplined neutralizes ownership's
// forced-savings edge, so it leans rent.
const HIGH_ANSWER_DIRECTION: Record<LifestyleDimension, 1 | -1> = {
  discipline: -1,
  mobility: 1,
  maintenanceTolerance: 1,
  concentrationTolerance: 1,
  controlValue: 1,
  cashFlowComfort: 1,
};

const ALL_DIMENSIONS: LifestyleDimension[] = [
  'discipline',
  'mobility',
  'maintenanceTolerance',
  'concentrationTolerance',
  'controlValue',
  'cashFlowComfort',
];

export type LeanLabel = 'rent' | 'slight-rent' | 'neutral' | 'slight-buy' | 'buy';
export type OverallLean = 'rent' | 'lean-rent' | 'balanced' | 'lean-buy' | 'buy';

export interface DimensionScore {
  dimension: LifestyleDimension;
  answered: boolean;
  /** -1 (rent) .. +1 (buy). 0 when unanswered. */
  lean: number;
  label: LeanLabel;
}

export interface LifestyleScore {
  dimensions: DimensionScore[];
  /** Directional overall read. Deliberately not a numeric percentage. */
  overall: OverallLean;
  /** The 1-2 answered dimensions pulling hardest, for the reconciliation copy. */
  dominant: LifestyleDimension[];
}

function leanToLabel(lean: number): LeanLabel {
  if (lean <= -0.6) return 'rent';
  if (lean < -0.15) return 'slight-rent';
  if (lean <= 0.15) return 'neutral';
  if (lean < 0.6) return 'slight-buy';
  return 'buy';
}

function meanToOverall(mean: number): OverallLean {
  if (mean <= -0.5) return 'rent';
  if (mean < -0.15) return 'lean-rent';
  if (mean <= 0.15) return 'balanced';
  if (mean < 0.5) return 'lean-buy';
  return 'buy';
}

function clampAnswer(raw: number): number {
  return Math.max(0, Math.min(LIKERT_MAX, raw));
}

/**
 * Score lifestyle answers into a per-dimension lean plus a directional overall.
 * Unanswered dimensions score neutral and are excluded from the overall mean.
 */
export function scoreLifestyle(answers: LifestyleAnswers): LifestyleScore {
  const dimensions: DimensionScore[] = ALL_DIMENSIONS.map((dimension) => {
    const raw = answers[dimension];
    if (raw === undefined || raw === null) {
      return { dimension, answered: false, lean: 0, label: 'neutral' };
    }
    const normalized = clampAnswer(raw) / LIKERT_MAX; // 0..1
    const signed = normalized * 2 - 1; // -1 (low answer) .. +1 (high answer)
    const lean = signed * HIGH_ANSWER_DIRECTION[dimension];
    return { dimension, answered: true, lean, label: leanToLabel(lean) };
  });

  const answered = dimensions.filter((d) => d.answered);
  const mean = answered.length
    ? answered.reduce((sum, d) => sum + d.lean, 0) / answered.length
    : 0;

  const dominant = [...answered]
    .sort((a, b) => Math.abs(b.lean) - Math.abs(a.lean))
    .filter((d) => Math.abs(d.lean) >= 0.5)
    .slice(0, 2)
    .map((d) => d.dimension);

  return { dimensions, overall: meanToOverall(mean), dominant };
}

/**
 * Feed the two quantifiable lifestyle answers back into the engine inputs.
 * Only discipline and mobility map to a real lever. maintenanceTolerance and
 * cashFlowComfort are deliberately NOT overrides: a feeling does not change the
 * maintenance cost, and cash-flow comfort is read FROM the result (carry vs
 * income), not fed into it. concentrationTolerance and controlValue are purely
 * qualitative. Unanswered dimensions leave the inputs untouched.
 */
export function applyLifestyleToInputs(
  inputs: CalculatorInputs,
  answers: LifestyleAnswers,
): CalculatorInputs {
  const next = { ...inputs };

  if (answers.discipline !== undefined && answers.discipline !== null) {
    const n = clampAnswer(answers.discipline) / LIKERT_MAX;
    const discipline = 0.5 + 0.5 * n; // spends-all (0) → 0.50, all-invested (4) → 1.00
    next.savingsDisciplinePct = discipline;
    next.renterSavingsDisciplinePct = discipline;
  }

  if (answers.mobility !== undefined && answers.mobility !== null) {
    // rooted (4) → 0 owner moves, likely-to-move (0) → 2 owner moves
    const movesByAnswer = [2, 2, 1, 0, 0];
    next.ownerMoves = movesByAnswer[clampAnswer(answers.mobility)] ?? 0;
  }

  return next;
}

/**
 * Derive a cash-flow-comfort lean from engine output instead of a Likert answer.
 * The owner's first-year monthly carry above ~40% of gross monthly income is
 * treated as strained (rent-leaning), below ~25% as comfortable. Returns a lean
 * in [-1, +1] suitable for slotting into the cashFlowComfort dimension.
 */
export function deriveCashFlowComfort(
  monthlyCarry: number,
  annualIncome: number | undefined,
): number {
  const grossMonthly = (annualIncome ?? 120_000) / 12;
  if (grossMonthly <= 0) return 0;
  const ratio = monthlyCarry / grossMonthly;
  const lean = 1 - (ratio - 0.25) / 0.15; // 0.25→+1, 0.40→0, 0.55→-1
  return Math.max(-1, Math.min(1, lean));
}
