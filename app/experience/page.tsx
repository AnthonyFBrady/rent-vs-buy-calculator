'use client';

import { useReducer, useMemo, useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import { simulate, simulateSensitivity, defaultInputsFor, buildWealthSeries, provinceFromPostalCode, suggestPriceAndRent } from '@/engine';
import type { CalculatorInputs } from '@/engine';
import { useCalculatorStore } from '@/lib/store';
import type { SensitivityScenario } from '@/lib/store';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { ReckonSignature } from '@/components/ReckonSignature';
import { BottomSheet } from '@/components/BottomSheet';
import {
  STEP,
  TOTAL_STEPS,
  EXPRESS_LAST_STEP,
  STEP_HEADINGS,
  STEP_WHY,
  CONTINUE_LABEL,
  STEP_SECTION,
  SECTION_LABELS,
} from './config/steps';
import { StepProvince }    from './steps/StepProvince';
import { StepCity }        from './steps/StepCity';
import { StepHomeCompare } from './steps/StepHomeCompare';
import { StepHomePrice }   from './steps/StepHomePrice';
import { StepRent }        from './steps/StepRent';
import { StepHorizon }     from './steps/StepHorizon';
import { StepDownPayment } from './steps/StepDownPayment';
import { StepMortgage }    from './steps/StepMortgage';
import { StepFinances }    from './steps/StepFinances';
import { StepShelters }    from './steps/StepShelters';
import { StepMobility }    from './steps/StepMobility';

// MapPanel is loaded client-only: MapLibre accesses window on init.
const LazyMapPanel = dynamic(
  () => import('./map/MapPanel').then((m) => m.MapPanel),
  { ssr: false },
);

// Per-step accent color: 'owner' | 'renter' | 'neutral'
const STEP_ACCENT: Record<number, 'owner' | 'renter' | 'neutral'> = {
  [STEP.PROVINCE]:     'neutral',
  [STEP.CITY]:         'neutral',
  [STEP.HOME_COMPARE]: 'neutral',
  [STEP.HOME_PRICE]:   'owner',
  [STEP.RENT]:         'renter',
  [STEP.HORIZON]:      'neutral',
  [STEP.DOWN_PAYMENT]: 'owner',
  [STEP.MORTGAGE]:     'owner',
  [STEP.FINANCES]:     'neutral',
  [STEP.SHELTERS]:     'renter',
  [STEP.MOBILITY]:     'neutral',
};

const ACCENT_COLOR: Record<string, string> = {
  owner:   'var(--color-owner)',
  renter:  'var(--color-renter)',
  neutral: 'var(--color-text-faint)',
};

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

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

function buildInitialInputs(pc: string | null) {
  if (!pc) return defaultInputsFor('ON');
  const province = provinceFromPostalCode(pc) ?? 'ON';
  const base = defaultInputsFor(province);
  const suggestion = suggestPriceAndRent(pc, base.homeType ?? 'condo-apt');
  return {
    ...base,
    postalCode: pc,
    ...(suggestion ? {
      homePrice: suggestion.medianPrice,
      monthlyRent: suggestion.suggestedMonthlyRent,
      // Municipal overrides: more accurate than province-wide defaults
      ...(suggestion.propertyTaxPct !== undefined
        ? { propertyTaxPct: suggestion.propertyTaxPct }
        : {}),
      ...(suggestion.municipalLTT !== undefined
        ? { isTorontoMunicipalLTT: suggestion.municipalLTT }
        : {}),
      ...(suggestion.insuranceEscalationOverInflationPct !== undefined
        ? { insuranceEscalationOverInflationPct: suggestion.insuranceEscalationOverInflationPct }
        : {}),
    } : {}),
  };
}

function ExperiencePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pc = searchParams.get('pc');
  const { setResult } = useCalculatorStore();

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    phase: 0 as Phase,
    inputs: buildInitialInputs(pc),
    direction: 1 as const,
  }));

  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [kbHintSeen, setKbHintSeen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const { phase, inputs, direction } = state;

  const patch   = useCallback(
    (payload: Partial<CalculatorInputs>) => dispatch({ type: 'PATCH', payload }),
    [],
  );
  const advance = useCallback(() => {
    // Leaving PROVINCE step: clear any default postalCode so CITY step starts with no city selected.
    if (state.phase === STEP.PROVINCE) {
      dispatch({ type: 'PATCH', payload: { postalCode: undefined as unknown as string } });
    }
    dispatch({ type: 'ADVANCE' });
  }, [state.phase]);
  const back    = useCallback(() => dispatch({ type: 'BACK' }), []);

  // Live simulation — drives the per-step contextual cues and the final result.
  const liveSim = useMemo(() => simulate(inputs), [inputs]);

  // Compute the result and navigate. Available from the express boundary onward.
  const finish = useCallback(() => {
    const sim         = liveSim;
    const sensitivity = simulateSensitivity(inputs);

    const scenarios: SensitivityScenario[] = [
      { id: 'base',     label: 'Base case',          ...buildWealthSeries(sensitivity.base) },
      { id: 'growth+2', label: 'Home prices +2%/yr', ...buildWealthSeries(sensitivity.ownerHigh) },
      { id: 'growth-2', label: 'Home prices -2%/yr', ...buildWealthSeries(sensitivity.ownerLow) },
      { id: 'rate+1',   label: 'Returns +2%/yr',     ...buildWealthSeries(sensitivity.renterHigh) },
      { id: 'rate-1',   label: 'Returns -2%/yr',     ...buildWealthSeries(sensitivity.renterLow) },
    ];

    setResult(inputs, sim, scenarios);
    setIsNavigating(true);
    setTimeout(() => router.push('/result'), 220);
  }, [liveSim, inputs, setResult, router]);

  // Primary action. Express lane: past EXPRESS_LAST_STEP the primary action is
  // "see my result"; earlier steps advance. Refining further is opt-in.
  const handleContinue = useCallback(() => {
    if (phase >= EXPRESS_LAST_STEP) {
      finish();
    } else {
      advance();
    }
  }, [phase, finish, advance]);

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
  const isFirstStep  = phase === 0;
  const isLastStep   = phase === TOTAL_STEPS - 1;
  const progress     = (phase + 1) / TOTAL_STEPS;
  const accent       = STEP_ACCENT[phase] ?? 'neutral';
  const accentColor  = ACCENT_COLOR[accent];
  const sectionLabel = SECTION_LABELS[STEP_SECTION[phase] ?? 'you'];

  // Express lane: from EXPRESS_LAST_STEP the primary action is "see my result",
  // and continuing to refine becomes an opt-in secondary action.
  const pastEssentials = phase >= EXPRESS_LAST_STEP;
  const primaryLabel   = pastEssentials ? 'See my result' : (CONTINUE_LABEL[phase] ?? 'Continue');
  const showRefine     = pastEssentials && !isLastStep;
  const refineCount    = TOTAL_STEPS - 1 - phase;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: isNavigating ? 0 : 1, scale: isNavigating ? 0.97 : 1 }}
      transition={{ duration: isNavigating ? 0.22 : 0.30, ease: isNavigating ? [0.4, 0, 1, 1] : [0.0, 0.0, 0.2, 1] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        position: 'relative',
        transformOrigin: 'center',
      } as React.CSSProperties}
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
              background: 'transparent',
              border: '1px solid var(--color-outline)',
              borderRadius: '9999px',
              cursor: 'pointer',
              padding: '4px 12px',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            How this works
          </button>
          <button
            onClick={() => setFaqOpen(true)}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              background: 'transparent',
              border: '1px solid var(--color-outline)',
              borderRadius: '9999px',
              cursor: 'pointer',
              padding: '4px 12px',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            FAQ
          </button>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--color-text-dimmer)',
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
          height: '2px',
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

      {/* Two-panel layout: left = step flow, right = map (desktop only) */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* Left panel: step card + button bar */}
        <div className="w-full lg:w-[45%]" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, flexShrink: 0 }}>

          {/* Step content area */}
          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', boxSizing: 'border-box' }}>
              <div style={{ width: '100%', maxWidth: '560px' }}>
            {/* Unified step card — header zone + divider + inputs in one surface */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`card-${phase}`}
                initial={{ opacity: 0, y: direction * 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -12 }}
                transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
                style={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-outline)',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 24px rgba(0,0,0,0.07)',
                }}
              >
                {/* Section accent edge */}
                <div style={{ height: '3px', backgroundColor: accentColor, opacity: 0.9 }} />

                {/* Header zone */}
                <div style={{ padding: '22px 24px 16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: accentColor, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                      {sectionLabel}
                    </span>
                  </div>
                  <h1 style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--color-text)', margin: 0 }}>
                    {stepLabel}
                  </h1>
                  {whyCopy && (
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', lineHeight: 1.5, margin: '8px 0 0' }}>
                      {whyCopy}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: 'var(--color-outline)' }} />

                {/* Input zone */}
                <div style={{ padding: '20px 24px 24px' }}>
                  {phase === STEP.PROVINCE     && <StepProvince    inputs={inputs} patch={patch} onAdvance={advance} />}
                  {phase === STEP.CITY         && <StepCity        inputs={inputs} patch={patch} onAdvance={advance} />}
                  {phase === STEP.HOME_COMPARE && <StepHomeCompare inputs={inputs} patch={patch} />}
                  {phase === STEP.HOME_PRICE   && <StepHomePrice   inputs={inputs} patch={patch} />}
                  {phase === STEP.RENT         && <StepRent        inputs={inputs} patch={patch} />}
                  {phase === STEP.HORIZON      && <StepHorizon     inputs={inputs} patch={patch} />}
                  {phase === STEP.DOWN_PAYMENT && <StepDownPayment inputs={inputs} patch={patch} />}
                  {phase === STEP.MORTGAGE     && <StepMortgage    inputs={inputs} patch={patch} />}
                  {phase === STEP.FINANCES     && <StepFinances    inputs={inputs} patch={patch} />}
                  {phase === STEP.SHELTERS     && <StepShelters    inputs={inputs} patch={patch} />}
                  {phase === STEP.MOBILITY     && <StepMobility    inputs={inputs} patch={patch} />}
                </div>
              </motion.div>
            </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Button bar — inside left panel so it doesn't stretch under the map */}
          <div
            style={{
              flexShrink: 0,
              borderTop: '1px solid var(--color-outline)',
              backgroundColor: 'rgba(250,250,249,0.92)',
              backdropFilter: 'blur(8px)',
              padding: '12px 20px calc(12px + env(safe-area-inset-bottom))',
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
                  color: isFirstStep ? 'var(--color-text-dimmer)' : 'var(--color-text-muted)',
                  background: 'transparent',
                  border: isFirstStep ? '1px solid var(--color-outline)' : '1px solid var(--color-outline-active)',
                  borderRadius: '9999px',
                  cursor: isFirstStep ? 'default' : 'pointer',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  transition: 'color 0.15s, border-color 0.15s',
                  flexShrink: 0,
                  opacity: isFirstStep ? 0.4 : 1,
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
                  {primaryLabel} →
                </motion.button>
                {showRefine && (
                  <button
                    onClick={() => { setKbHintSeen(true); advance(); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: 'var(--color-text-dim)',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      letterSpacing: '-0.01em',
                      padding: '2px 0',
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      textDecorationColor: 'var(--color-outline)',
                    }}
                  >
                    Answer {refineCount} more to refine →
                  </button>
                )}
                <AnimatePresence>
                  {!kbHintSeen && !showRefine && (
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

        </div>{/* end left panel */}

        {/* Right panel: map (desktop only) */}
        <div
          className="hidden lg:block"
          style={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
            borderLeft: '1px solid var(--color-outline)',
          }}
        >
          <LazyMapPanel step={phase} inputs={inputs} onPatch={patch} onAdvance={advance} />
        </div>

      </div>{/* end two-panel layout */}

      {/* Methodology drawer */}
      <BottomSheet open={methodologyOpen} onClose={() => setMethodologyOpen(false)} eyebrow="Methodology" title="How this calculator thinks">
        <MethodologyContent />
      </BottomSheet>

      {/* FAQ drawer */}
      <BottomSheet open={faqOpen} onClose={() => setFaqOpen(false)} eyebrow="FAQ" title="Frequently asked questions">
        <FaqContent />
      </BottomSheet>

    </motion.div>
  );
}

export default function ExperiencePage() {
  return (
    <Suspense>
      <ExperiencePageInner />
    </Suspense>
  );
}
