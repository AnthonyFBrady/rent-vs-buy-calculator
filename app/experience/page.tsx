'use client';

import { useReducer, useMemo, useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'motion/react';
import { simulate, simulateSensitivity, defaultInputsFor, buildWealthSeries, provinceFromPostalCode, suggestPriceAndRent } from '@/engine';
import { metrosForProvince } from '@/engine/data/regions/coordinates';
import type { CalculatorInputs, Province } from '@/engine';
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
  | { type: 'GOTO'; phase: number }
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
    case 'GOTO':
      return {
        ...state,
        direction: action.phase > state.phase ? 1 : -1,
        phase: Math.max(0, Math.min(TOTAL_STEPS - 1, action.phase)) as Phase,
      };
    case 'PATCH':
      return { ...state, inputs: { ...state.inputs, ...action.payload } };
    default:
      return state;
  }
}

// Act groups for the segmented progress stepper
const ACTS: Array<{ label: string; steps: number[] }> = [
  { label: 'WHERE', steps: [0, 1] },
  { label: 'WHAT',  steps: [2, 3, 4, 5] },
  { label: 'HOW',   steps: [6, 7] },
  { label: 'YOU',   steps: [8, 9, 10] },
];

type MapPending =
  | { kind: 'province'; province: Province; label: string }
  | { kind: 'city'; fsa: string; label: string; homePrice?: number; monthlyRent?: number; propertyTaxPct?: number }
  | null;

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
  const [homeCompareBuyConfirmed, setHomeCompareBuyConfirmed] = useState(false);

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
  const goto    = useCallback((p: number) => dispatch({ type: 'GOTO', phase: p }), []);

  const [mapPending, setMapPending] = useState<MapPending>(null);
  // Clear any pending map selection when the user navigates to a different step
  useEffect(() => { setMapPending(null); }, [phase]);

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

  const stepLabel   = STEP_HEADINGS[phase] ?? '';
  const whyCopy     = STEP_WHY[phase] ?? '';
  const isFirstStep = phase === 0;
  const isLastStep  = phase === TOTAL_STEPS - 1;
  const accent      = STEP_ACCENT[phase] ?? 'neutral';
  const accentColor = ACCENT_COLOR[accent];

  // Express lane: from EXPRESS_LAST_STEP the primary action is "see my result",
  // and continuing to refine becomes an opt-in secondary action.
  const pastEssentials = phase >= EXPRESS_LAST_STEP;
  const primaryLabel   = pastEssentials ? 'See my result' : (CONTINUE_LABEL[phase] ?? 'Continue');
  const showRefine     = pastEssentials && !isLastStep;

  const selectedCityName =
    phase === STEP.CITY && inputs.postalCode && !mapPending
      ? metrosForProvince(inputs.province).find(c => c.fsa === inputs.postalCode)?.metro
      : undefined;
  const refineCount    = TOTAL_STEPS - 1 - phase;

  // Verdict signal — computed unconditionally, rendered below the input glass
  const showVerdict  = phase >= STEP.RENT && inputs.homePrice > 0 && inputs.monthlyRent > 0;
  const verdictKind  = liveSim.fivePercentRule.verdict;
  const verdictAdv   = liveSim.exit.netAdvantageToOwner;
  const verdictFmt   = (() => { const a = Math.abs(verdictAdv); return a >= 1000 ? `$${Math.round(a / 1000)}k` : `$${Math.round(a)}`; })();
  const verdictColor = verdictKind === 'rent-favored' ? 'var(--color-renter)' : verdictKind === 'buy-favored' ? 'var(--color-owner)' : 'var(--color-cross)';
  const verdictLabel = verdictKind === 'rent-favored' ? `Renting ahead by ~${verdictFmt}` : verdictKind === 'buy-favored' ? `Buying ahead by ~${verdictFmt}` : 'Roughly even';

  // CTA click handler — shared between footer (mobile) and inline (desktop scroll area)
  const handleCtaClick = useCallback(() => {
    setKbHintSeen(true);
    if (mapPending?.kind === 'city') {
      patch({ postalCode: mapPending.fsa, homePrice: mapPending.homePrice, monthlyRent: mapPending.monthlyRent, propertyTaxPct: mapPending.propertyTaxPct, isTorontoMunicipalLTT: false });
      setMapPending(null);
      advance();
    } else {
      handleContinue();
    }
  }, [mapPending, patch, advance, handleContinue]);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: isNavigating ? 0 : 1, scale: isNavigating ? 0.97 : 1 }}
      transition={{ duration: isNavigating ? 0.22 : 0.30, ease: isNavigating ? [0.4, 0, 1, 1] : [0.0, 0.0, 0.2, 1] }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        height: '100dvh',
        color: 'var(--color-text)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        transformOrigin: 'center',
      } as React.CSSProperties}
    >

      {/* Full-width top nav */}
      <nav
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between"
        style={{
          height: '52px',
          padding: '0 24px',
          backgroundColor: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-outline)',
        }}
      >
        <a href="/" style={{ textDecoration: 'none' }}>
          <ReckonSignature color="var(--color-text)" width={68} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => setMethodologyOpen(true)}
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            How this works
          </button>
          <button
            onClick={() => setFaqOpen(true)}
            style={{
              fontSize: '12px',
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            FAQ
          </button>
        </div>
      </nav>

      {/* Left card — floats off left edge on desktop (lg:left-4), full-bleed on mobile */}
      <div
        className="absolute left-0 top-[52px] bottom-0 w-full lg:left-4 lg:w-[400px] lg:top-[68px] lg:bottom-4 z-10 flex flex-col overflow-hidden rounded-none lg:rounded-xl"
        style={{
          backgroundColor: 'var(--color-bg)',
          boxShadow: 'var(--shadow-float)',
        }}
      >

        {/* Scrollable body — absorbs progress pips, heading, input glass, verdict, CTA */}
        <div className="thin-scroll" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column' }}>

          {/* Progress pips — sticky inside scroll, frosted */}
          <div style={{ flexShrink: 0, padding: '10px 20px 8px 28px', position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'var(--color-bg)', backdropFilter: 'blur(8px)', display: 'flex', gap: '8px' }}>
            {ACTS.map((act) => (
              <div key={act.label} style={{ flex: act.steps.length, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-dimmer)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                  {act.label}
                </span>
                <div style={{ display: 'flex', gap: '3px' }}>
                  {act.steps.map((i) => {
                    const isCompleted = i < phase;
                    const isCurrent   = i === phase;
                    return (
                      <button
                        key={i}
                        title={STEP_HEADINGS[i] ?? `Step ${i + 1}`}
                        onClick={() => { if (isCompleted) goto(i); }}
                        style={{
                          flex: 1,
                          height: '3px',
                          borderRadius: '9999px',
                          border: 'none',
                          padding: 0,
                          cursor: isCompleted ? 'pointer' : 'default',
                          backgroundColor: isCurrent
                            ? accentColor
                            : isCompleted
                              ? 'rgba(var(--brand-owner-rgb),0.45)'
                              : 'var(--color-outline)',
                          transition: 'background-color 0.3s',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Animated step content: heading + input glass + verdict + CTA, all inline */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`step-${phase}`}
              initial={{ opacity: 0, x: direction * 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -20 }}
              transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
              style={{ padding: '24px 20px 0 28px', display: 'flex', flexDirection: 'column' }}
            >
              {/* Heading block — on the bg surface, not inside the white card */}
              <div style={{ marginBottom: '20px' }}>
                <h1 className="step-heading-xl">{stepLabel}</h1>
                {whyCopy && (
                  <p style={{ marginTop: '8px', fontSize: '14px', lineHeight: 1.55, color: 'var(--color-text-muted)', margin: '8px 0 0', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                    {whyCopy}
                  </p>
                )}
              </div>

              {/* Input glass — white card with inputs only, no internal header */}
              <div className="input-glass">
                {phase === STEP.PROVINCE     && <StepProvince    inputs={inputs} patch={patch} />}
                {phase === STEP.CITY         && <StepCity        inputs={inputs} patch={patch} onAdvance={advance} pendingFSA={mapPending?.kind === 'city' ? mapPending.fsa : undefined} onPendingSelect={(p) => setMapPending({ kind: 'city', ...p })} />}
                {phase === STEP.HOME_COMPARE && <StepHomeCompare inputs={inputs} patch={patch} onBuyConfirmed={() => setHomeCompareBuyConfirmed(true)} />}
                {phase === STEP.HOME_PRICE   && <StepHomePrice   inputs={inputs} patch={patch} />}
                {phase === STEP.RENT         && <StepRent        inputs={inputs} patch={patch} />}
                {phase === STEP.HORIZON      && <StepHorizon     inputs={inputs} patch={patch} />}
                {phase === STEP.DOWN_PAYMENT && <StepDownPayment inputs={inputs} patch={patch} />}
                {phase === STEP.MORTGAGE     && <StepMortgage    inputs={inputs} patch={patch} />}
                {phase === STEP.FINANCES     && <StepFinances    inputs={inputs} patch={patch} />}
                {phase === STEP.SHELTERS     && <StepShelters    inputs={inputs} patch={patch} />}
                {phase === STEP.MOBILITY     && <StepMobility    inputs={inputs} patch={patch} />}
              </div>

              {/* Verdict signal — below inputs, only when live data is available */}
              {showVerdict && (
                <div className="verdict-signal">
                  <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, backgroundColor: verdictColor }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: verdictColor, lineHeight: 1 }}>{verdictLabel}</span>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1 }}>— updates live</span>
                </div>
              )}

              {/* CTA block — inline, directly below inputs/verdict */}
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Back button — small ghost circle, left of CTA */}
                <button
                  onClick={back}
                  disabled={isFirstStep}
                  aria-label="Go back"
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: isFirstStep ? '1px solid var(--color-outline)' : '1px solid var(--color-outline-active)',
                    backgroundColor: 'transparent',
                    color: isFirstStep ? 'var(--color-text-dimmer)' : 'var(--color-text-muted)',
                    cursor: isFirstStep ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    opacity: isFirstStep ? 0.3 : 1,
                    transition: 'opacity 0.15s, border-color 0.15s',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  }}
                >
                  ←
                </button>

                {/* Primary CTA + secondary actions */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <motion.button
                    onClick={handleCtaClick}
                    whileHover={{ y: -1, boxShadow: '0 4px 16px rgba(0,0,0,0.20)' }}
                    whileTap={{ scale: 0.98, y: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
                    style={{
                      width: '100%',
                      height: '52px',
                      borderRadius: '9999px',
                      backgroundColor: pastEssentials ? 'var(--color-owner)' : 'var(--color-btn-primary-bg)',
                      color: pastEssentials ? 'var(--color-surface-raised)' : 'var(--color-btn-primary-text)',
                      border: 'none',
                      fontSize: '15px',
                      fontWeight: pastEssentials ? 600 : 500,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      letterSpacing: '-0.01em',
                      boxShadow: pastEssentials ? '0 2px 16px rgba(var(--brand-owner-rgb),0.35)' : '0 2px 8px rgba(0,0,0,0.12)',
                      transition: 'background-color 0.3s, box-shadow 0.3s',
                    }}
                  >
                    {mapPending
                      ? `Use ${mapPending.label} →`
                      : selectedCityName
                        ? `Use ${selectedCityName} →`
                        : `${primaryLabel} →`
                    }
                  </motion.button>
                  {mapPending && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', textAlign: 'center', margin: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                      Tap a different {mapPending.kind === 'province' ? 'province' : 'city'} to explore
                    </p>
                  )}
                  {!mapPending && showRefine && (
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
                    {!kbHintSeen && !showRefine && !mapPending && (
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

              {/* Bottom breathing room */}
              <div style={{ height: 'calc(24px + env(safe-area-inset-bottom))', flexShrink: 0 }} />
            </motion.div>
          </AnimatePresence>

        </div>

      </div>{/* end left rail */}

      {/* Map — fills viewport below the top nav */}
      <div
        className="hidden lg:block absolute left-0 right-0 bottom-0"
        style={{ top: '52px', zIndex: 0 }}
      >
        <LazyMapPanel step={phase} inputs={inputs} onPatch={patch} onAdvance={advance} pendingSelection={mapPending} onPendingSelect={setMapPending} homeCompareBuyConfirmed={homeCompareBuyConfirmed} />
      </div>

    </motion.div>

    {/* Drawers — outside motion.div so they aren't clipped by its bounds */}
    <BottomSheet open={methodologyOpen} onClose={() => setMethodologyOpen(false)} eyebrow="Methodology" title="How this calculator thinks">
      <MethodologyContent />
    </BottomSheet>
    <BottomSheet open={faqOpen} onClose={() => setFaqOpen(false)} eyebrow="FAQ" title="Frequently asked questions">
      <FaqContent />
    </BottomSheet>
    </>
  );
}

export default function ExperiencePage() {
  return (
    <Suspense>
      <ExperiencePageInner />
    </Suspense>
  );
}
