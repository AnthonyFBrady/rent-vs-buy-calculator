'use client';

import { useReducer, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { simulate, simulateSensitivity, defaultInputsFor } from '@/engine';
import type { CalculatorInputs } from '@/engine';
import { useCalculatorStore } from '@/lib/store';
import type { SensitivityScenario } from '@/lib/store';
import { WealthChart } from '@/components/chart/WealthChart';
import {
  STEP,
  TOTAL_STEPS,
  STEP_HEADINGS,
  STEP_WHY,
  CONTINUE_LABEL,
} from './config/steps';
import { StepProvince }    from './steps/StepProvince';
import { StepHome }        from './steps/StepHome';
import { StepDownPayment } from './steps/StepDownPayment';
import { StepMortgage }    from './steps/StepMortgage';
import { StepRentHorizon } from './steps/StepRentHorizon';
import { StepMarket }      from './steps/StepMarket';
import { StepSituation }   from './steps/StepSituation';
import { StepMobility }    from './steps/StepMobility';

const SIDEBAR_CONTEXT: Record<number, string> = {
  [STEP.PROVINCE]:     'Land transfer tax is largest at purchase. Toronto buyers pay an additional municipal layer.',
  [STEP.HOME]:         'Home type sets maintenance rate and appreciation defaults. Condos carry strata fees.',
  [STEP.DOWN_PAYMENT]: 'The renter invests your down payment from day 1. Larger down payment means a stronger renter start.',
  [STEP.MORTGAGE]:     'Year-1 mortgage interest is unrecoverable. It does not build equity.',
  [STEP.RENT_HORIZON]: 'Time horizon is the most load-bearing variable. Under 5 years, renting almost always wins.',
  [STEP.MARKET]:       'Investment return is the highest-leverage assumption for the renter. Discipline to actually invest the gap matters as much as the return.',
  [STEP.SITUATION]:    'Tax shelters can shift the outcome by $50k or more over a 10-year horizon.',
  [STEP.MOBILITY]:     'Owner moves cost 8-9% of the home price in friction. Watch the owner line dip each time.',
};

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface State {
  phase: Phase;
  inputs: CalculatorInputs;
  direction: 1 | -1;
}

type Action =
  | { type: 'ADVANCE' }
  | { type: 'BACK' }
  | { type: 'PATCH'; payload: Partial<CalculatorInputs> };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADVANCE':
      return {
        ...state,
        direction: 1,
        phase: Math.min(TOTAL_STEPS - 1, state.phase + 1) as Phase,
      };
    case 'BACK':
      return {
        ...state,
        direction: -1,
        phase: Math.max(0, state.phase - 1) as Phase,
      };
    case 'PATCH':
      return { ...state, inputs: { ...state.inputs, ...action.payload } };
    default:
      return state;
  }
}

export default function ExperiencePage() {
  const router = useRouter();
  const { setResult } = useCalculatorStore();

  const [state, dispatch] = useReducer(reducer, {
    phase: 0,
    inputs: defaultInputsFor('ON'),
    direction: 1,
  });

  const { phase, inputs, direction } = state;

  const advance = useCallback(() => dispatch({ type: 'ADVANCE' }), []);
  const back    = useCallback(() => dispatch({ type: 'BACK' }), []);
  const patch   = useCallback(
    (payload: Partial<CalculatorInputs>) => dispatch({ type: 'PATCH', payload }),
    [],
  );

  // Live simulation — updates on every input change
  const liveSim = useMemo(() => simulate(inputs), [inputs]);

  const liveOwnerData = useMemo(() => {
    const marginalRate = inputs.marginalTaxRatePct ?? 0.4;
    let cumMoveCost = 0;
    return [
      { year: 0, value: inputs.homePrice * inputs.downPaymentPct },
      ...liveSim.yearByYear.map((y) => {
        cumMoveCost += y.ownerMoveTransactionCost;
        const rrspNet = y.ownerSurplusRrspBalance * (1 - marginalRate);
        return { year: y.year, value: y.ownerEquity + y.ownerPortfolioEnd + rrspNet - cumMoveCost };
      }),
    ];
  }, [liveSim, inputs.homePrice, inputs.downPaymentPct, inputs.marginalTaxRatePct]);

  const liveRenterData = useMemo(() => [
    { year: 0, value: liveSim.yearByYear[0]?.renterPortfolioStart ?? 0 },
    ...liveSim.yearByYear.map(y => ({ year: y.year, value: y.renterPortfolioEnd + y.renterRrspBalance })),
  ], [liveSim]);

  const ownerMoveYears = useMemo(() => {
    const n = inputs.ownerMoves ?? 0;
    const h = inputs.holdingPeriodYears;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * h / (n + 1)));
  }, [inputs.ownerMoves, inputs.holdingPeriodYears]);

  const renterMoveYears = useMemo(() => {
    const n = inputs.renterMoves ?? 0;
    const h = inputs.holdingPeriodYears;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * h / (n + 1)));
  }, [inputs.renterMoves, inputs.holdingPeriodYears]);

  const chartRenterData = liveRenterData;
  const chartRenterMoveYears = renterMoveYears;

  function handleContinue() {
    if (phase < TOTAL_STEPS - 1) {
      advance();
      return;
    }

    // Last step: reuse liveSim, run sensitivity, navigate to result page.
    const sim         = liveSim;
    const sensitivity = simulateSensitivity(inputs);

    const toPoints = (r: typeof sim) => {
      let cumMoveCost = 0;
      return [
        {
          year: 0,
          ownerValue: r.inputs.homePrice * r.inputs.downPaymentPct,
          renterValue: r.yearByYear[0]?.renterPortfolioStart ?? 0,
        },
        ...r.yearByYear.map((y) => {
          cumMoveCost += y.ownerMoveTransactionCost;
          return {
            year: y.year,
            ownerValue:  y.ownerEquity + y.ownerPortfolioEnd - cumMoveCost,
            renterValue: y.renterPortfolioEnd + y.renterRrspBalance,
          };
        }),
      ];
    };

    const scenarios: SensitivityScenario[] = [
      { id: 'base',     label: 'Base case',          ownerData: toPoints(sensitivity.base).map(p => ({ year: p.year, value: p.ownerValue })),      renterData: toPoints(sensitivity.base).map(p => ({ year: p.year, value: p.renterValue })) },
      { id: 'growth+2', label: 'Home prices +2%/yr', ownerData: toPoints(sensitivity.ownerHigh).map(p => ({ year: p.year, value: p.ownerValue })), renterData: toPoints(sensitivity.ownerHigh).map(p => ({ year: p.year, value: p.renterValue })) },
      { id: 'growth-2', label: 'Home prices -2%/yr', ownerData: toPoints(sensitivity.ownerLow).map(p => ({ year: p.year, value: p.ownerValue })),  renterData: toPoints(sensitivity.ownerLow).map(p => ({ year: p.year, value: p.renterValue })) },
      { id: 'rate+1',   label: 'Returns +2%/yr',     ownerData: toPoints(sensitivity.renterHigh).map(p => ({ year: p.year, value: p.ownerValue })), renterData: toPoints(sensitivity.renterHigh).map(p => ({ year: p.year, value: p.renterValue })) },
      { id: 'rate-1',   label: 'Returns -2%/yr',     ownerData: toPoints(sensitivity.renterLow).map(p => ({ year: p.year, value: p.ownerValue })),  renterData: toPoints(sensitivity.renterLow).map(p => ({ year: p.year, value: p.renterValue })) },
    ];

    setResult(inputs, sim, scenarios);
    router.push('/result');
  }

  const stepLabel    = STEP_HEADINGS[phase] ?? '';
  const whyCopy      = STEP_WHY[phase] ?? '';
  const continueBtn  = CONTINUE_LABEL[phase] ?? 'Continue';
  const isFirstStep  = phase === 0;
  const progress     = (phase + 1) / TOTAL_STEPS;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          height: '52px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: '1px solid var(--color-outline)',
          backgroundColor: 'var(--color-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <a
          href="/"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--color-text)',
            textDecoration: 'none',
          }}
        >
          longrun.ca
        </a>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-faint)',
            letterSpacing: '-0.01em',
          }}
        >
          {phase + 1} of {TOTAL_STEPS}
        </span>
      </nav>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          flexShrink: 0,
          backgroundColor: 'var(--color-outline)',
          position: 'relative',
        }}
      >
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'var(--color-owner)',
            transformOrigin: 'left',
          }}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
        />
      </div>

      {/* Content area: form left + chart right */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: scrollable form column */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            minWidth: 0,
          }}
        >
          <div
            style={{
              maxWidth: '520px',
              margin: '0 auto',
              padding: '36px 24px 24px',
            }}
          >
            {/* Step heading */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`heading-${phase}`}
                initial={{ opacity: 0, y: direction * 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -8 }}
                transition={{ duration: 0.28, ease: [0.0, 0.0, 0.2, 1] }}
              >
                <h1
                  style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(22px, 4vw, 30px)',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.15,
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                  }}
                >
                  {stepLabel}
                </h1>
                {whyCopy && (
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-text-muted)',
                      lineHeight: 1.5,
                      marginBottom: '28px',
                    }}
                  >
                    {whyCopy}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Step content */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`content-${phase}`}
                initial={{ opacity: 0, y: direction * 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -12 }}
                transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1], delay: 0.04 }}
              >
                {phase === STEP.PROVINCE     && <StepProvince    inputs={inputs} patch={patch} />}
                {phase === STEP.HOME         && <StepHome        inputs={inputs} patch={patch} />}
                {phase === STEP.DOWN_PAYMENT && <StepDownPayment inputs={inputs} patch={patch} />}
                {phase === STEP.MORTGAGE     && <StepMortgage    inputs={inputs} patch={patch} />}
                {phase === STEP.RENT_HORIZON && <StepRentHorizon inputs={inputs} patch={patch} />}
                {phase === STEP.MARKET       && <StepMarket      inputs={inputs} patch={patch} />}
                {phase === STEP.SITUATION    && <StepSituation   inputs={inputs} patch={patch} />}
                {phase === STEP.MOBILITY     && <StepMobility    inputs={inputs} patch={patch} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: live chart column (desktop only) */}
        <div
          className="hidden lg:flex"
          style={{
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '16px',
            borderLeft: '1px solid var(--color-outline)',
            backgroundColor: 'var(--color-chart-bg)',
            overflowY: 'auto',
          }}
        >
          <WealthChart
            ownerData={liveOwnerData}
            renterData={chartRenterData}
            holdingPeriodYears={inputs.holdingPeriodYears}
            breakEvenYear={liveSim.breakEvenYear}
            ownerMoveYears={ownerMoveYears}
            renterMoveYears={chartRenterMoveYears}
            yearlyBreakdown={liveSim.yearByYear}
            height={480}
            animateOnMount={false}
          />
        </div>

      </div>

      {/* Bottom button bar */}
      <div
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--color-outline)',
          backgroundColor: 'var(--color-bg)',
          padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <button
            onClick={back}
            disabled={isFirstStep}
            style={{
              height: '48px',
              padding: '0 16px',
              fontSize: '14px',
              color: isFirstStep ? 'var(--color-outline)' : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: isFirstStep ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              transition: 'color 0.15s',
              flexShrink: 0,
            }}
          >
            ← Back
          </button>

          <button
            onClick={handleContinue}
            style={{
              flex: 1,
              height: '52px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-btn-primary-bg)',
              color: 'var(--color-btn-primary-text)',
              border: 'none',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.88'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {continueBtn} →
          </button>
        </div>
      </div>
    </div>
  );
}
