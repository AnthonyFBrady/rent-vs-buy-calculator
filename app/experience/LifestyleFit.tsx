'use client';

import { scoreLifestyle } from '@/engine';
import type { LifestyleAnswers, LifestyleDimension, SimulationResult } from '@/engine';
import { verdict, fmtWealth } from '@/lib/format';
import { ChoiceGroup } from './components';

// The qualitative "your fit" panel. Six Likert questions grounded in Felix's
// framework (research/lifestyle-model.md) score into a directional rent/buy lean
// per dimension, then reconcile against the financial verdict. Directional by
// design — no aggregate percentage.
//
// Lifestyle v2: answers are owned by the parent (store) and fed back through
// applyLifestyleToInputs → simulate to produce a fit-adjusted number.

interface Props {
  financialVerdict: 'buy' | 'rent' | 'tie';
  advantageLabel: string;
  answers: LifestyleAnswers;
  onAnswersChange: (a: LifestyleAnswers) => void;
  fitResult?: SimulationResult | null;
}

interface QuestionDef {
  dim: LifestyleDimension;
  label: string;
  question: string;
  options: { value: string; label: string }[];
}

const QUESTIONS: QuestionDef[] = [
  {
    dim: 'discipline',
    label: 'Discipline',
    question: 'When you have extra cash each month, what usually happens to it?',
    options: [
      { value: '0', label: 'It gets spent' },
      { value: '2', label: 'I save some of it' },
      { value: '4', label: 'It invests automatically' },
    ],
  },
  {
    dim: 'mobility',
    label: 'Flexibility',
    question: 'How settled is the next decade for you?',
    options: [
      { value: '0', label: 'I could move in a few years' },
      { value: '2', label: 'Not sure yet' },
      { value: '4', label: 'Rooted here for 10+ years' },
    ],
  },
  {
    dim: 'maintenanceTolerance',
    label: 'Maintenance',
    question: 'A $12,000 repair lands next month. What is your reaction?',
    options: [
      { value: '0', label: 'That would destabilize me' },
      { value: '2', label: 'Annoying, but fine' },
      { value: '4', label: 'Already budgeted for it' },
    ],
  },
  {
    dim: 'concentrationTolerance',
    label: 'Concentration',
    question: 'Most of your net worth in one house, partly borrowed. How does that sit?',
    options: [
      { value: '0', label: 'Uncomfortable' },
      { value: '2', label: 'Neutral' },
      { value: '4', label: 'Totally fine' },
    ],
  },
  {
    dim: 'controlValue',
    label: 'Control',
    question: 'How much does it matter that the place is yours to change and never leave?',
    options: [
      { value: '0', label: 'Not much' },
      { value: '2', label: 'Somewhat' },
      { value: '4', label: 'A great deal' },
    ],
  },
  {
    dim: 'cashFlowComfort',
    label: 'Cash flow',
    question: 'How would the monthly ownership carry feel against your income?',
    options: [
      { value: '0', label: 'Tight' },
      { value: '2', label: 'Manageable' },
      { value: '4', label: 'Comfortable' },
    ],
  },
];

const DIM_LABEL: Record<LifestyleDimension, string> = {
  discipline: 'Discipline',
  mobility: 'Flexibility',
  maintenanceTolerance: 'Maintenance',
  concentrationTolerance: 'Concentration',
  controlValue: 'Control',
  cashFlowComfort: 'Cash flow',
};

const DIM_PHRASE: Record<LifestyleDimension, { rent: string; buy: string }> = {
  discipline: { rent: 'you already invest reliably', buy: 'a mortgage would force you to save' },
  mobility: { rent: 'you value the flexibility to move', buy: 'you expect to stay put' },
  maintenanceTolerance: { rent: 'you would rather not deal with upkeep', buy: 'you can absorb big repairs' },
  concentrationTolerance: { rent: 'you prefer a diversified portfolio', buy: 'concentration does not worry you' },
  controlValue: { rent: 'a place of your own matters less to you', buy: 'you want a place that is truly yours' },
  cashFlowComfort: { rent: 'the monthly carry would strain you', buy: 'the carry is comfortable for you' },
};

function leanColor(lean: number): string {
  if (lean < -0.15) return 'var(--color-renter)';
  if (lean > 0.15) return 'var(--color-owner)';
  return 'var(--color-text-faint)';
}

function overallSide(overall: string): 'rent' | 'buy' | 'balanced' {
  if (overall === 'rent' || overall === 'lean-rent') return 'rent';
  if (overall === 'buy' || overall === 'lean-buy') return 'buy';
  return 'balanced';
}

/** One sentence explaining the fit-adjusted shift, or empty string if not applicable. */
function fitAdjustedSentence(
  baseVerdict: 'buy' | 'rent' | 'tie',
  fitResult: SimulationResult,
  answers: LifestyleAnswers,
): string {
  const fitAdv = fitResult.exit.netAdvantageToOwner;
  const fitVerdict = verdict(fitAdv);
  const fitAbs = Math.abs(fitAdv);

  const disciplineAnswered = answers.discipline !== undefined;
  const mobilityAnswered = answers.mobility !== undefined;
  if (!disciplineAnswered && !mobilityAnswered) return '';

  const leversText =
    disciplineAnswered && mobilityAnswered
      ? 'savings habit and expected moves'
      : disciplineAnswered
        ? 'savings discipline'
        : 'expected moves';

  if (fitVerdict !== baseVerdict && baseVerdict !== 'tie' && fitVerdict !== 'tie') {
    return `Adjusted for your ${leversText}, the math flips: ${fitVerdict === 'buy' ? 'buying' : 'renting'} comes out ${fmtWealth(fitAbs)} ahead.`;
  }

  if (Math.abs(fitAdv) < 500) return '';

  return `Adjusted for your ${leversText}, that margin shifts to ${fmtWealth(fitAbs)}.`;
}

export function LifestyleFit({ financialVerdict, advantageLabel, answers, onAnswersChange, fitResult }: Props) {
  const score = scoreLifestyle(answers);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === QUESTIONS.length;

  const fitSide = overallSide(score.overall);
  const finSide = financialVerdict === 'tie' ? 'balanced' : financialVerdict === 'buy' ? 'buy' : 'rent';

  let agreement = '';
  if (fitSide === 'balanced' || finSide === 'balanced') {
    agreement = 'are mixed';
  } else if (fitSide === finSide) {
    agreement = 'agree';
  } else {
    agreement = 'pull the other way';
  }

  const dominantPhrases = score.dominant
    .map((d) => {
      const dim = score.dimensions.find((x) => x.dimension === d)!;
      return dim.lean < 0 ? DIM_PHRASE[d].rent : DIM_PHRASE[d].buy;
    })
    .slice(0, 2);

  const finText = financialVerdict === 'tie'
    ? `The math is close — within ${advantageLabel} either way.`
    : `The math says ${financialVerdict === 'buy' ? 'buying' : 'renting'} comes out ${advantageLabel} ahead.`;

  const fitSentence = fitResult
    ? fitAdjustedSentence(financialVerdict, fitResult, answers)
    : '';

  const conclusionText = agreement === 'agree'
    ? 'The number and your life point the same way.'
    : agreement === 'pull the other way'
      ? 'When the math and your life disagree, the non-financial factors are a legitimate reason to choose differently.'
      : 'A close call on both fronts — either path is defensible.';

  const reconciliation = [
    finText,
    fitSentence,
    `Your answers ${agreement}${dominantPhrases.length ? `: ${dominantPhrases.join(', and ')}.` : '.'}`,
    conclusionText,
  ].filter(Boolean).join(' ');

  return (
    <div style={{ border: '1px solid var(--color-outline)', borderRadius: '14px', overflow: 'hidden' }}>
      <div style={{ height: '3px', backgroundColor: 'var(--color-cross)', opacity: 0.9 }} />
      <div style={{ padding: '20px 22px 24px' }}>
        <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-cross)', marginBottom: '8px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          Your fit
        </p>
        <h3 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text)', margin: '0 0 6px' }}>
          The math is only half the decision.
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '0 0 20px' }}>
          Six quick questions on the things a spreadsheet can't price. No right answers.
        </p>

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {QUESTIONS.map((q) => (
            <div key={q.dim}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.4 }}>
                {q.question}
              </p>
              <ChoiceGroup
                ariaLabel={q.label}
                columns={1}
                variant="card"
                accent="var(--color-cross)"
                options={q.options}
                value={answers[q.dim] !== undefined ? String(answers[q.dim]) : undefined}
                onChange={(v) => onAnswersChange({ ...answers, [q.dim]: Number(v) })}
              />
            </div>
          ))}
        </div>

        {/* Lean bars */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--color-outline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-renter)' }}>Leans rent</span>
            <span style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-owner)' }}>Leans buy</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {score.dimensions.map((d) => {
              const color = leanColor(d.lean);
              const half = Math.abs(d.lean) * 50;
              return (
                <div key={d.dimension} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '92px', flexShrink: 0, fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                    {DIM_LABEL[d.dimension]}
                  </span>
                  <div style={{ position: 'relative', flex: 1, height: '8px', borderRadius: '9999px', backgroundColor: 'var(--color-outline)' }}>
                    <div style={{ position: 'absolute', left: '50%', top: '-2px', bottom: '-2px', width: '1px', backgroundColor: 'var(--color-text-faint)', opacity: 0.5 }} />
                    {d.answered && Math.abs(d.lean) > 0.001 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          bottom: 0,
                          left: d.lean < 0 ? `${50 - half}%` : '50%',
                          width: `${half}%`,
                          backgroundColor: color,
                          borderRadius: '9999px',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fit-adjusted verdict badge — shown once levers are answered */}
        {fitResult && (answers.discipline !== undefined || answers.mobility !== undefined) && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dimmer)', marginBottom: '4px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Base math</p>
              <p style={{ fontSize: '14px', fontWeight: 600, color: financialVerdict === 'buy' ? 'var(--color-owner)' : financialVerdict === 'rent' ? 'var(--color-renter)' : 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                {advantageLabel} {financialVerdict !== 'tie' ? `${financialVerdict} ahead` : 'tied'}
              </p>
            </div>
            <div style={{ width: '1px', alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-cross)', marginBottom: '4px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Fit-adjusted</p>
              {(() => {
                const fitAdv = fitResult.exit.netAdvantageToOwner;
                const fitV = verdict(fitAdv);
                const fitAbs = Math.abs(fitAdv);
                return (
                  <p style={{ fontSize: '14px', fontWeight: 600, color: fitV === 'buy' ? 'var(--color-owner)' : fitV === 'rent' ? 'var(--color-renter)' : 'var(--color-text-muted)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                    {fmtWealth(fitAbs)} {fitV !== 'tie' ? `${fitV} ahead` : 'tied'}
                  </p>
                );
              })()}
            </div>
          </div>
        )}

        {/* Reconciliation */}
        <div style={{ marginTop: '16px', padding: '16px 18px', borderRadius: '10px', backgroundColor: 'color-mix(in srgb, var(--color-cross) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--color-cross) 25%, transparent)' }}>
          {allAnswered ? (
            <p style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              {reconciliation}
            </p>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              Answer all six to see how your life fits the math. ({answeredCount} of {QUESTIONS.length})
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
