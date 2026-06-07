'use client';

import { useReducer, useMemo, useEffect, useCallback, useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { simulate, simulateSensitivity, defaultInputsFor, inputsToSearchParams } from '@/engine';
import type { CalculatorInputs } from '@/engine';
import { ExperienceChart } from './ExperienceChart';
import { LeverPanel } from './LeverPanel';
import { SummaryPanel } from './SummaryPanel';
import { ProgressBar, ChalkPanel } from './components';
import { Phase0Intro } from './phases/Phase0Intro';
import { Phase1About } from './phases/Phase1About';
import { Phase1TimeHorizon } from './phases/Phase1TimeHorizon';
import { Phase2Province } from './phases/Phase2Province';
import { Phase3HomeType } from './phases/Phase3HomeType';
import { Phase3Price } from './phases/Phase3Price';
import { Phase3Down } from './phases/Phase3Down';
import { Phase7Rate } from './phases/Phase7Rate';
import { Phase8Amort } from './phases/Phase8Amort';
import { Phase4Renting } from './phases/Phase4Renting';
import { Phase10RentGrowth } from './phases/Phase10RentGrowth';
import { Phase5Mobility } from './phases/Phase5Mobility';
import { Phase9Shelters } from './phases/Phase9Shelters';
import { Phase6Financial } from './phases/Phase6Financial';

// Phase map:
//  0  Intro (auto)
//  1  About you (name + income)
//  2  Time horizon
//  3  Province
//  4  Down payment + equity
//  5  Home price
//  6  Home type
//  7  Mortgage rate
//  8  Amortization + renewal
//  9  Monthly rent
// 10  Rent growth
// 11  Mobility
// 12  Tax shelters
// 13  Tax rate + discipline
// 14  Done (results)
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
const MAX_PHASE = 14;

// Owner-specific inputs: changing these should NOT animate the renter line
// Phase 11 (mobility) is included so owner-move changes don't animate the renter line
const OWNER_PHASES = new Set<Phase>([4, 5, 6, 7, 8, 11]);
// Renter-specific inputs: changing these should NOT animate the owner line
const RENTER_PHASES = new Set<Phase>([9, 10]);

interface State {
  phase: Phase;
  name: string;
  inputs: CalculatorInputs;
  isDark: boolean;
  leverOpen: boolean;
  summaryOpen: boolean;
  activeEvent: string | null;
}

type Action =
  | { type: 'ADVANCE' }
  | { type: 'BACK' }
  | { type: 'SKIP' }
  | { type: 'PATCH'; payload: Partial<CalculatorInputs> }
  | { type: 'SET_NAME'; name: string }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_LEVER' }
  | { type: 'TOGGLE_SUMMARY' }
  | { type: 'SET_EVENT'; id: string | null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADVANCE':
      return { ...state, phase: Math.min(MAX_PHASE, state.phase + 1) as Phase };
    case 'BACK':
      return { ...state, phase: Math.max(0, state.phase - 1) as Phase };
    case 'SKIP':
      return { ...state, phase: MAX_PHASE };
    case 'PATCH': {
      const next = { ...state.inputs, ...action.payload };
      return { ...state, inputs: next };
    }
    case 'SET_NAME':
      return { ...state, name: action.name };
    case 'TOGGLE_THEME':
      return { ...state, isDark: !state.isDark };
    case 'TOGGLE_LEVER':
      return { ...state, leverOpen: !state.leverOpen, summaryOpen: false };
    case 'TOGGLE_SUMMARY':
      return { ...state, summaryOpen: !state.summaryOpen, leverOpen: false };
    case 'SET_EVENT':
      return { ...state, activeEvent: action.id };
    default:
      return state;
  }
}

function fmtWealth(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export default function ExperiencePage() {
  const [state, dispatch] = useReducer(reducer, {
    phase: 0,
    name: '',
    inputs: defaultInputsFor('ON'),
    isDark: true,
    leverOpen: false,
    summaryOpen: false,
    activeEvent: null,
  });

  const { phase, name, inputs, isDark, leverOpen, summaryOpen, activeEvent } = state;
  const [copied, setCopied] = useState(false);

  const sim = useMemo(() => simulate(inputs), [inputs]);
  const inResultPhase = phase >= MAX_PHASE;
  const sensitivity = useMemo(
    () => (inResultPhase ? simulateSensitivity(inputs) : null),
    [inResultPhase, inputs],
  );

  // Sync isDark → <html> class so CSS variables + Tailwind dark: variants work
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Auto-advance from phase 0 intro
  useEffect(() => {
    if (phase !== 0) return;
    const t = setTimeout(() => dispatch({ type: 'ADVANCE' }), 3200);
    return () => clearTimeout(t);
  }, [phase]);

  const advance = useCallback(() => dispatch({ type: 'ADVANCE' }), []);
  const back = useCallback(() => dispatch({ type: 'BACK' }), []);
  const patch = useCallback(
    (payload: Partial<CalculatorInputs>) => dispatch({ type: 'PATCH', payload }),
    [],
  );
  const setName = useCallback((n: string) => dispatch({ type: 'SET_NAME', name: n }), []);

  async function handleShare() {
    if (typeof window === 'undefined') return;
    const params = inputsToSearchParams(inputs);
    const url = `${window.location.origin}/experience?${params.toString()}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  const showOverlay = phase >= 0 && phase <= 13;

  // Line isolation: label which side is "active" so the chart can animate only that line
  const activeSide: 'owner' | 'renter' | 'both' =
    OWNER_PHASES.has(phase as Phase) ? 'owner'
    : RENTER_PHASES.has(phase as Phase) ? 'renter'
    : 'both';

  const bgColor = 'var(--color-bg)';
  const surfaceColor = 'var(--color-surface)';
  const borderColor = 'var(--color-outline)';
  const textColor = 'var(--color-text)';
  const mutedColor = 'var(--color-text-muted)';

  // Left nav lever panel width
  const LEVER_WIDTH = 300;

  const ownerLabel = name ? `${name} buys` : 'Owner';
  const renterLabel = name ? `${name} rents` : 'Renter';

  return (
    <MotionConfig reducedMotion="user">
    <div
      style={{
        backgroundColor: bgColor,
        color: textColor,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          height: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '15px', letterSpacing: '-0.02em', opacity: 0.9 }}>
            Rent or Buy
          </span>
          {inResultPhase && (
            <button
              onClick={() => dispatch({ type: 'TOGGLE_LEVER' })}
              style={{
                fontSize: '12px',
                color: leverOpen ? textColor : mutedColor,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                letterSpacing: '0.02em',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
              }}
            >
              {leverOpen ? '← Close' : '≡ Assumptions'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {phase < MAX_PHASE && (
            <button
              onClick={() => dispatch({ type: 'SKIP' })}
              style={{ fontSize: '12px', color: mutedColor, cursor: 'pointer', background: 'none', border: 'none', letterSpacing: '0.02em' }}
            >
              Skip →
            </button>
          )}
          {phase === MAX_PHASE && (
            <button
              onClick={handleShare}
              style={{
                fontSize: '12px',
                color: copied ? '#4CAF85' : mutedColor,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                letterSpacing: '0.02em',
                transition: 'color 0.2s',
              }}
            >
              {copied ? 'Copied ✓' : 'Share'}
            </button>
          )}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
            aria-label="Toggle theme"
            style={{ color: mutedColor, cursor: 'pointer', background: 'none', border: 'none', fontSize: '14px', lineHeight: 1 }}
          >
            {isDark ? '○' : '●'}
          </button>
        </div>
      </nav>

      {/* Main content: chart + optional left lever panel */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Left lever panel — results phase only */}
        <AnimatePresence>
          {leverOpen && inResultPhase && (
            <motion.div
              key="lever-sidebar"
              initial={{ x: -LEVER_WIDTH }}
              animate={{ x: 0 }}
              exit={{ x: -LEVER_WIDTH }}
              transition={{ type: 'spring', stiffness: 340, damping: 38 }}
              style={{
                width: LEVER_WIDTH,
                flexShrink: 0,
                height: '100%',
                borderRight: `1px solid ${borderColor}`,
                overflowY: 'auto',
                zIndex: 10,
              }}
            >
              <LeverPanel
                inputs={inputs}
                patch={patch}
                onClose={() => dispatch({ type: 'TOGGLE_LEVER' })}
                sim={sim}
                isDark={isDark}
                sidebar
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chart area */}
        <motion.div layout style={{ flex: 1, minWidth: 0, padding: '0 20px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {/* Outcome hero — results phase only */}
          <AnimatePresence>
            {inResultPhase && (
              <motion.div
                key="outcome-hero"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1], delay: 0.15 }}
                style={{ borderBottom: `1px solid ${borderColor}`, flexShrink: 0 }}
              >
                {/* Verdict row */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', padding: '10px 4px 4px' }}>
                  <span style={{
                    fontSize: '11px',
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: mutedColor,
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  }}>
                    {sim.exit.netAdvantageToOwner > 500
                      ? 'Buying leads'
                      : sim.exit.netAdvantageToOwner < -500
                      ? 'Renting leads'
                      : 'Roughly tied'}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(24px, 3vw, 38px)',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    color: sim.exit.netAdvantageToOwner > 0 ? 'var(--color-owner)' : 'var(--color-renter)',
                  }}>
                    {fmtWealth(Math.abs(sim.exit.netAdvantageToOwner))}
                  </span>
                  {sim.breakEvenYear && (
                    <span style={{ fontSize: '12px', color: mutedColor, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                      Crossover yr {sim.breakEvenYear}
                    </span>
                  )}
                </div>
                {/* After-cost detail row */}
                <div style={{ display: 'flex', gap: '20px', padding: '0 4px 8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-owner)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                    Owner {fmtWealth(sim.exit.finalOwnerWealth)} <span style={{ opacity: 0.6 }}>after exit costs</span>
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--color-renter)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                    Renter {fmtWealth(sim.exit.finalRenterWealth)} <span style={{ opacity: 0.6 }}>after tax</span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ flex: 1, minHeight: 0, paddingBottom: inResultPhase ? '60px' : '0' }}>
          <ExperienceChart
            result={sim}
            sensitivity={sensitivity}
            phase={phase}
            isDark={isDark}
            activeEvent={activeEvent}
            onEventClick={(id) => dispatch({ type: 'SET_EVENT', id })}
            inputs={inputs}
            activeSide={activeSide}
            ownerLabel={ownerLabel}
            renterLabel={renterLabel}
          />
          </div>
        </motion.div>
      </div>

      {/* Question panel — real flex child, never overlaps the chart */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key="overlay"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 40 }}
            style={{
              flexShrink: 0,
              overflow: 'hidden',
              backgroundColor: surfaceColor,
              borderRadius: '16px 16px 0 0',
              borderTop: `1px solid ${borderColor}`,
              boxShadow: isDark
                ? '0 -4px 24px rgba(0,0,0,0.30)'
                : '0 -4px 24px rgba(0,0,0,0.06)',
              zIndex: 10,
            }}
          >
            <div style={{ width: '100%', display: 'flex', height: '50vh', overflow: 'hidden' }}>
              {/* Left column — questions and controls */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Progress bar — sits at top of panel, no padding */}
                {phase >= 1 && phase <= 13 && (
                  <ProgressBar phase={phase} total={MAX_PHASE - 1} />
                )}

                {/* Content — no scroll, phases are sized to fit */}
                <div style={{ flex: 1, overflow: 'hidden', padding: `${phase > 1 ? '40px' : '24px'} 28px 12px`, position: 'relative' }}>
                  {phase > 1 && (
                    <button
                      onClick={back}
                      style={{
                        position: 'absolute',
                        top: '14px',
                        left: '28px',
                        color: mutedColor,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      ←
                    </button>
                  )}

                  {/* Phase content */}
                  <AnimatePresence mode="wait">
                    {phase === 0 && <Phase0Intro key="p0" />}
                    {phase === 1 && (
                      <Phase1About key="p1" name={name} onName={setName} inputs={inputs} patch={patch} />
                    )}
                    {phase === 2 && (
                      <Phase1TimeHorizon key="p2" inputs={inputs} patch={patch} />
                    )}
                    {phase === 3 && (
                      <Phase2Province key="p3" inputs={inputs} patch={patch} />
                    )}
                    {phase === 4 && (
                      <Phase3Down key="p4" inputs={inputs} patch={patch} />
                    )}
                    {phase === 5 && (
                      <Phase3Price key="p5" inputs={inputs} patch={patch} />
                    )}
                    {phase === 6 && (
                      <Phase3HomeType key="p6" inputs={inputs} patch={patch} />
                    )}
                    {phase === 7 && (
                      <Phase7Rate key="p7" inputs={inputs} patch={patch} />
                    )}
                    {phase === 8 && (
                      <Phase8Amort key="p8" inputs={inputs} patch={patch} />
                    )}
                    {phase === 9 && (
                      <Phase4Renting key="p9" inputs={inputs} patch={patch} />
                    )}
                    {phase === 10 && (
                      <Phase10RentGrowth key="p10" inputs={inputs} patch={patch} />
                    )}
                    {phase === 11 && (
                      <Phase5Mobility key="p11" inputs={inputs} patch={patch} />
                    )}
                    {phase === 12 && (
                      <Phase9Shelters key="p12" inputs={inputs} patch={patch} sim={sim} />
                    )}
                    {phase === 13 && (
                      <Phase6Financial key="p13" inputs={inputs} patch={patch} sim={sim} />
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer button */}
                {phase > 0 && phase <= 13 && (
                  <div style={{ padding: '8px 28px 24px', flexShrink: 0, paddingBottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}>
                    <button
                      onClick={advance}
                      style={{
                        width: '100%', borderRadius: '8px', height: '56px',
                        fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                        border: 'none', letterSpacing: '-0.01em',
                        backgroundColor: phase === 13 ? 'var(--color-accent-cta)' : 'var(--color-btn-primary-bg)',
                        color: phase === 13 ? '#1C1B1B' : 'var(--color-btn-primary-text)',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {phase === 13 ? 'See your result →' : 'Continue →'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right column — chalkboard context panel (hidden below md breakpoint) */}
              {phase >= 1 && phase <= 13 && (
                <ChalkPanel phase={phase} inputs={inputs} sim={sim} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary panel */}
      <AnimatePresence>
        {summaryOpen && (
          <SummaryPanel
            key="summary"
            sim={sim}
            isDark={isDark}
            onClose={() => dispatch({ type: 'TOGGLE_SUMMARY' })}
          />
        )}
      </AnimatePresence>

      {/* Breakdown tab — results phase, hidden when summary is open */}
      <AnimatePresence>
        {inResultPhase && !summaryOpen && (
          <motion.div
            key="breakdown-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              display: 'flex',
              justifyContent: 'center',
              paddingBottom: 'max(20px, env(safe-area-inset-bottom, 0px))',
              paddingTop: '32px',
              background: `linear-gradient(to top, ${bgColor}d8 0%, transparent 100%)`,
              pointerEvents: 'none',
            }}
          >
            <button
              onClick={() => dispatch({ type: 'TOGGLE_SUMMARY' })}
              style={{
                pointerEvents: 'auto',
                background: 'transparent',
                color: mutedColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '100px',
                padding: '7px 22px',
                fontSize: '12px',
                letterSpacing: '0.03em',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ opacity: 0.55, fontSize: '10px' }}>↑</span>
              See breakdown
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}
