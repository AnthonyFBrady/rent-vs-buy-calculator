'use client';

import { useReducer, useMemo, useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { simulate, simulateSensitivity, defaultInputsFor } from '@/engine';
import type { CalculatorInputs } from '@/engine';
import { useCalculatorStore } from '@/lib/store';
import type { SensitivityScenario } from '@/lib/store';
import { WealthChart } from '@/components/chart/WealthChart';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { ReckonSignature } from '@/components/ReckonSignature';
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

// Per-step accent color: 'owner' | 'renter' | 'neutral'
const STEP_ACCENT: Record<number, 'owner' | 'renter' | 'neutral'> = {
  [STEP.PROVINCE]:     'neutral',
  [STEP.HOME]:         'owner',
  [STEP.DOWN_PAYMENT]: 'owner',
  [STEP.MORTGAGE]:     'owner',
  [STEP.RENT_HORIZON]: 'neutral',
  [STEP.MARKET]:       'renter',
  [STEP.SITUATION]:    'renter',
  [STEP.MOBILITY]:     'neutral',
};

const ACCENT_COLOR: Record<string, string> = {
  owner:   'var(--color-owner)',
  renter:  'var(--color-renter)',
  neutral: 'var(--color-text-faint)',
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

  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [kbHintSeen, setKbHintSeen] = useState(false);

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
    const closingCosts = liveSim.commitment.ownerStartingCashOut - inputs.homePrice * inputs.downPaymentPct;
    let cumMoveCost = 0;
    return [
      { year: 0, value: inputs.homePrice * inputs.downPaymentPct - closingCosts },
      ...liveSim.yearByYear.map((y) => {
        cumMoveCost += y.ownerMoveTransactionCost;
        const rrspNet    = y.ownerSurplusRrspBalance * (1 - marginalRate);
        const hbpRrspNet = y.ownerHbpRrspBalance * (1 - marginalRate);
        return {
          year: y.year,
          value: y.ownerEquity + y.ownerPortfolioEnd + rrspNet + y.ownerSurplusTfsaBalance + hbpRrspNet - cumMoveCost - y.ownerCumulativePropertyTax - closingCosts,
        };
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

  const handleContinue = useCallback(() => {
    if (phase < TOTAL_STEPS - 1) {
      advance();
      return;
    }
    const sim         = liveSim;
    const sensitivity = simulateSensitivity(inputs);

    const toPoints = (r: typeof sim) => {
      const closingCosts = r.commitment.ownerStartingCashOut - r.inputs.homePrice * r.inputs.downPaymentPct;
      let cumMoveCost = 0;
      return [
        {
          year: 0,
          ownerValue: r.inputs.homePrice * r.inputs.downPaymentPct - closingCosts,
          renterValue: r.yearByYear[0]?.renterPortfolioStart ?? 0,
        },
        ...r.yearByYear.map((y) => {
          cumMoveCost += y.ownerMoveTransactionCost;
          return {
            year: y.year,
            ownerValue:  y.ownerEquity + y.ownerPortfolioEnd - cumMoveCost - y.ownerCumulativePropertyTax - closingCosts,
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
  }, [phase, liveSim, inputs, advance, setResult, router]);

  // Keyboard navigation: Enter/→ advance, ← back. Guards: skip when focused on an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        setKbHintSeen(true);
        handleContinue();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setKbHintSeen(true);
        if (phase > 0) back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, handleContinue, back]);

  // Lock body scroll when any drawer is open
  useEffect(() => {
    document.body.style.overflow = (methodologyOpen || faqOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [methodologyOpen, faqOpen]);

  const stepLabel    = STEP_HEADINGS[phase] ?? '';
  const whyCopy      = STEP_WHY[phase] ?? '';
  const continueBtn  = CONTINUE_LABEL[phase] ?? 'Continue';
  const isFirstStep  = phase === 0;
  const progress     = (phase + 1) / TOTAL_STEPS;
  const accent       = STEP_ACCENT[phase] ?? 'neutral';
  const accentColor  = ACCENT_COLOR[accent];

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.0, 0.0, 0.2, 1] }}
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
        <a href="/" style={{ textDecoration: 'none' }}>
          <ReckonSignature color="var(--color-text)" width={72} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setMethodologyOpen(true)}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              textDecorationColor: 'var(--color-outline)',
            }}
          >
            How this works
          </button>
          <button
            onClick={() => setFaqOpen(true)}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
              textDecorationColor: 'var(--color-outline)',
            }}
          >
            FAQ
          </button>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-text-faint)',
              letterSpacing: '-0.01em',
            }}
          >
            {phase + 1} of {TOTAL_STEPS}
          </span>
        </div>
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
            boxShadow: '2px 0 8px var(--color-owner)',
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
            {/* Step heading with accent pip */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`heading-${phase}`}
                initial={{ opacity: 0, y: direction * 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -8 }}
                transition={{ duration: 0.28, ease: [0.0, 0.0, 0.2, 1] }}
              >
                {/* Accent pip */}
                <div
                  style={{
                    width: '28px',
                    height: '3px',
                    borderRadius: '9999px',
                    backgroundColor: accentColor,
                    marginBottom: '14px',
                    opacity: 0.85,
                  }}
                />
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

            {/* Step content — elevated card */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`content-${phase}`}
                initial={{ opacity: 0, y: direction * 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -12 }}
                transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1], delay: 0.04 }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-outline)',
                    borderRadius: '14px',
                    padding: '20px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)',
                  }}
                >
                  {phase === STEP.PROVINCE     && <StepProvince    inputs={inputs} patch={patch} />}
                  {phase === STEP.HOME         && <StepHome        inputs={inputs} patch={patch} />}
                  {phase === STEP.DOWN_PAYMENT && <StepDownPayment inputs={inputs} patch={patch} />}
                  {phase === STEP.MORTGAGE     && <StepMortgage    inputs={inputs} patch={patch} />}
                  {phase === STEP.RENT_HORIZON && <StepRentHorizon inputs={inputs} patch={patch} />}
                  {phase === STEP.MARKET       && <StepMarket      inputs={inputs} patch={patch} />}
                  {phase === STEP.SITUATION    && <StepSituation   inputs={inputs} patch={patch} />}
                  {phase === STEP.MOBILITY     && <StepMobility    inputs={inputs} patch={patch} />}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Gradient divider — owner gold fades to renter teal top-to-bottom */}
        <div
          className="hidden lg:block"
          style={{
            width: '2px',
            flexShrink: 0,
            background: 'linear-gradient(to bottom, var(--color-owner) 0%, transparent 40%, transparent 60%, var(--color-renter) 100%)',
            opacity: 0.5,
          }}
        />

        {/* Right: live chart column — always dark */}
        <div
          className="dark-panel hidden lg:flex"
          style={{
            flex: 1,
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'var(--color-chart-bg)',
            overflowY: 'auto',
          }}
        >
          <WealthChart
            ownerData={liveOwnerData}
            renterData={liveRenterData}
            holdingPeriodYears={inputs.holdingPeriodYears}
            breakEvenYear={liveSim.breakEvenYear}
            ownerMoveYears={ownerMoveYears}
            renterMoveYears={renterMoveYears}
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

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <motion.button
              onClick={() => { setKbHintSeen(true); handleContinue(); }}
              whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.20)' }}
              whileTap={{ scale: 0.98, y: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
              style={{
                width: '100%',
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
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              }}
            >
              {continueBtn} →
            </motion.button>
            {/* Keyboard hint — shown until user presses a key */}
            <AnimatePresence>
              {!kbHintSeen && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="hidden lg:block"
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-faint)',
                    textAlign: 'center',
                    letterSpacing: '0.01em',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  }}
                >
                  Press ↵ or → to advance · ← to go back
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Methodology drawer */}
      <AnimatePresence>
        {methodologyOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMethodologyOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 50 }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 51, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '9999px', backgroundColor: 'var(--color-outline-active)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 12px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '2px' }}>Methodology</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>How this calculator thinks</p>
                </div>
                <button onClick={() => setMethodologyOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, padding: '0 20px 40px' }}>
                <MethodologyContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAQ drawer */}
      <AnimatePresence>
        {faqOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setFaqOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 50 }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 51, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '9999px', backgroundColor: 'var(--color-outline-active)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 12px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '2px' }}>FAQ</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>Frequently asked questions</p>
                </div>
                <button onClick={() => setFaqOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, padding: '0 20px 40px' }}>
                <FaqContent />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
