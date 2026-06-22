'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { simulate, buildWealthSeries, applyLifestyleToInputs } from '@/engine';
import type { CalculatorInputs } from '@/engine';
import { useCalculatorStore } from '@/lib/store';
import { FactorSlider } from '../experience/components';
import { FACTORS } from '../experience/config/factors';
import { LifestyleFit } from '../experience/LifestyleFit';
import { encodeShare } from '@/lib/share';
import { WealthChart } from '@/components/chart/WealthChart';
import type { BandPoint } from '@/components/chart/WealthChart';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { ReckonSignature } from '@/components/ReckonSignature';
import { BottomSheet } from '@/components/BottomSheet';
import { fmtWealth, verdict } from '@/lib/format';

// ─── Helpers ────────────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const startTime = performance.now() + delayMs;
    let raf: number;
    function tick(now: number) {
      const elapsed = Math.max(0, now - startTime);
      const t = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);
  return val;
}

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick',
  NL: 'Newfoundland', PE: 'Prince Edward Island',
};

const HOME_TYPE_LABELS: Record<string, string> = {
  'condo-apt': 'Condo', 'condo-townhouse': 'Condo TH',
  'freehold-townhouse': 'Freehold TH', 'semi-detached': 'Semi-detached', 'detached': 'Detached',
};

type ResultPhase = 'verdict' | 'chart' | 'fit' | 'share';
const PHASES: ResultPhase[] = ['verdict', 'chart', 'fit', 'share'];
const ease = [0.0, 0.0, 0.2, 1] as [number, number, number, number];

function DrawerSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-faint)', marginBottom: '10px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
        {title}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px 24px' }}>
        {items.map(a => (
          <div key={a.label}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '1px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{a.label}</p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{a.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ label, value, body, accentColor = 'var(--color-text)' }: { label: string; value: string; body: string; accentColor?: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-outline)', backgroundColor: 'var(--color-bg-subtle)' }}>
      <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-dim)', marginBottom: '6px', fontWeight: 600, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: 700, color: accentColor, marginBottom: '4px', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.45, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{body}</p>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const { result, inputs, sensitivity, lifestyleAnswers, setLifestyleAnswers } = useCalculatorStore();
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [resultPhase, setResultPhase] = useState<ResultPhase>('verdict');
  const [direction, setDirection] = useState<1 | -1>(1);
  const [localInputs, setLocalInputs] = useState<CalculatorInputs>(() => inputs ? { ...inputs } : {} as CalculatorInputs);
  const patchLocal = useCallback((p: Partial<CalculatorInputs>) => setLocalInputs(prev => ({ ...prev, ...p })), []);
  const [chartH, setChartH] = useState(380);

  const advance = useCallback(() => {
    const idx = PHASES.indexOf(resultPhase);
    if (idx < PHASES.length - 1) {
      setDirection(1);
      setResultPhase(PHASES[idx + 1]!);
    }
  }, [resultPhase]);

  const back = useCallback(() => {
    const idx = PHASES.indexOf(resultPhase);
    if (idx > 0) {
      setDirection(-1);
      setResultPhase(PHASES[idx - 1]!);
    }
  }, [resultPhase]);

  useEffect(() => {
    if (!result || !inputs) router.replace('/experience');
  }, [result, inputs, router]);

  useEffect(() => {
    const update = () => {
      const h = window.innerHeight;
      // chart height = viewport - nav(52) - compact bar(44) - sliders(180) - label(24) - cta(72) - padding(32)
      setChartH(Math.max(240, h - 420));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    document.body.style.overflow = (drawerOpen || methodologyOpen || faqOpen) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen, methodologyOpen, faqOpen]);

  const ownerMoveYears = useMemo(() => {
    if (!inputs) return [];
    const n = inputs.ownerMoves ?? 0;
    const h = inputs.holdingPeriodYears;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * h / (n + 1)));
  }, [inputs]);

  const renterMoveYears = useMemo(() => {
    if (!inputs) return [];
    const n = inputs.renterMoves ?? 0;
    const h = inputs.holdingPeriodYears;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * h / (n + 1)));
  }, [inputs]);

  const localResult = useMemo(() => {
    if (!localInputs || !localInputs.homePrice) return null;
    try { return simulate(localInputs); } catch { return null; }
  }, [localInputs]);

  const localOwnerData = useMemo((): { year: number; value: number }[] => {
    if (!localResult || !localInputs?.homePrice) return [];
    return buildWealthSeries(localResult).ownerData;
  }, [localResult, localInputs]);

  const localRenterData = useMemo((): { year: number; value: number }[] => {
    if (!localResult) return [];
    return buildWealthSeries(localResult).renterData;
  }, [localResult]);

  const fitResult = useMemo(() => {
    if (!inputs) return null;
    const hasFitLevers =
      lifestyleAnswers.discipline !== undefined || lifestyleAnswers.mobility !== undefined;
    if (!hasFitLevers) return null;
    try { return simulate(applyLifestyleToInputs(inputs, lifestyleAnswers)); } catch { return null; }
  }, [inputs, lifestyleAnswers]);

  const ownerBand = useMemo((): BandPoint[] | undefined => {
    if (sensitivity.length < 2) return undefined;
    const years = sensitivity[0]!.ownerData.map(d => d.year);
    return years.map(yr => {
      const vals = sensitivity.map(s => s.ownerData.find(d => d.year === yr)?.value ?? 0);
      return { year: yr, lo: Math.min(...vals), hi: Math.max(...vals) };
    });
  }, [sensitivity]);

  const renterBand = useMemo((): BandPoint[] | undefined => {
    if (sensitivity.length < 2) return undefined;
    const years = sensitivity[0]!.renterData.map(d => d.year);
    return years.map(yr => {
      const vals = sensitivity.map(s => s.renterData.find(d => d.year === yr)?.value ?? 0);
      return { year: yr, lo: Math.min(...vals), hi: Math.max(...vals) };
    });
  }, [sensitivity]);

  // Hooks must be called unconditionally — safe values before early return.
  const _advantage = result?.exit.netAdvantageToOwner ?? 0;
  const _absAdvantage = Math.abs(_advantage);
  const _winner = result ? verdict(_advantage) : ('tie' as const);
  const countedValue = useCountUp(_winner !== 'tie' ? _absAdvantage : 0, 2200, 700);

  if (!result || !inputs || sensitivity.length === 0) return null;

  const advantage = _advantage;
  const absAdvantage = _absAdvantage;
  const winner = _winner;
  const ownerColor = 'var(--color-owner)';
  const renterColor = 'var(--color-renter)';
  const winnerColor = winner === 'buy' ? ownerColor : winner === 'rent' ? renterColor : 'var(--color-text-muted)';

  const h = inputs.holdingPeriodYears;
  const milestoneYears = Array.from(new Set(
    h >= 15
      ? [5, 10, Math.round(h / 2), h]
      : h >= 10
      ? [5, 10, h]
      : [Math.round(h / 2), h]
  )).filter((y): y is number => y > 0 && y <= h).sort((a, b) => a - b);

  const baseScenario = sensitivity.find(s => s.id === 'base') ?? sensitivity[0]!;

  const ownerMilestonesData = localOwnerData.length ? localOwnerData : baseScenario.ownerData;
  const renterMilestonesData = localRenterData.length ? localRenterData : baseScenario.renterData;

  const totalInterest = result.yearByYear.reduce((sum, y) => sum + y.ownerAnnualInterest, 0);
  const fiveRuleRent = result.fivePercentRule.monthlyBreakEvenRent;
  const fiveRuleGap = Math.abs(inputs.monthlyRent - fiveRuleRent);
  const downPayment = inputs.homePrice * inputs.downPaymentPct;
  const monthlyDelta = result.commitment.ownerFirstYearMonthlyCarry - inputs.monthlyRent;

  const ownerSubLabel = `Home ${fmtWealth(result.exit.ownerHomeNetProceeds)} + Inv ${fmtWealth(result.exit.ownerPortfolioNetProceeds)}`;
  const renterSubLabel = `Portfolio ${fmtWealth(result.exit.finalRenterWealth)}`;

  const fmtCAD = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

  async function handleShare() {
    if (typeof window === 'undefined') return;
    const shareId = encodeShare(inputs!);
    const url = `${window.location.origin}/result/${shareId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My reckon result', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  const drawerSections = [
    {
      title: 'Home & financing',
      items: [
        { label: 'Home price', value: fmtCAD(inputs.homePrice) },
        ...(inputs.homeType ? [{ label: 'Home type', value: HOME_TYPE_LABELS[inputs.homeType] ?? inputs.homeType }] : []),
        { label: 'Province', value: PROVINCE_NAMES[inputs.province] ?? inputs.province },
        { label: 'Down payment', value: `${Math.round(inputs.downPaymentPct * 100)}% (${fmtCAD(inputs.homePrice * inputs.downPaymentPct)})` },
        { label: 'Mortgage rate', value: fmtPct(inputs.mortgageRatePct, 2) },
        { label: 'Amortization', value: `${inputs.amortizationYears} years` },
      ],
    },
    {
      title: 'Property costs',
      items: [
        { label: 'Maintenance', value: `${fmtPct(inputs.maintenancePct)}/yr of value` },
        ...(inputs.monthlyStrataFee && inputs.monthlyStrataFee > 0 ? [{ label: 'Strata fee', value: `${fmtCAD(inputs.monthlyStrataFee)}/mo` }] : []),
        { label: 'Property tax', value: `${fmtPct(inputs.propertyTaxPct)}/yr` },
        { label: 'Home appreciation', value: `${fmtPct(inputs.homeAppreciationPct)}/yr` },
        ...(inputs.monthlyRentalIncome && inputs.monthlyRentalIncome > 0 ? [{ label: 'Rental income', value: `${fmtCAD(inputs.monthlyRentalIncome)}/mo` }] : []),
      ],
    },
    {
      title: 'Renter',
      items: [
        { label: 'Monthly rent', value: `${fmtCAD(inputs.monthlyRent)}/mo` },
        { label: 'Rent growth', value: `${fmtPct(inputs.rentEscalationPct)}/yr` },
        { label: 'Renter insurance', value: `${fmtCAD(inputs.rentInsuranceMonthly)}/mo` },
        { label: 'Savings discipline', value: `${Math.round(inputs.savingsDisciplinePct * 100)}%` },
      ],
    },
    {
      title: 'Tax shelters',
      items: [
        { label: 'TFSA', value: inputs.renterUsesTFSA ? 'Yes' : 'No' },
        { label: 'FHSA', value: inputs.useFHSA ? `Yes — ${fmtCAD(inputs.renterFhsaRoomOverride ?? 40_000)} room` : 'No' },
        { label: 'RRSP', value: inputs.renterUsesRRSP ? `Yes — ${fmtCAD(inputs.renterRrspCarryforward ?? 0)} carryforward` : 'No' },
      ],
    },
    {
      title: 'Market',
      items: [
        { label: 'Investment return', value: `${fmtPct(inputs.investmentReturnPct)}/yr` },
        { label: 'Inflation', value: `${fmtPct(inputs.inflationPct)}/yr` },
        { label: 'Marginal tax rate', value: fmtPct(inputs.marginalTaxRatePct) },
        { label: 'Time horizon', value: `${inputs.holdingPeriodYears} years` },
      ],
    },
    {
      title: 'Mobility',
      items: [
        { label: 'Owner moves', value: `${inputs.ownerMoves ?? 0}` },
        { label: 'Renter moves', value: `${inputs.renterMoves ?? 0}` },
      ],
    },
  ];

  // ─── Shared compact verdict bar (phases 2–4) ─────────────────────────────
  const CompactBar = (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      style={{ padding: '10px clamp(20px, 5vw, 60px)', borderBottom: '1px solid var(--color-outline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', minHeight: '44px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: '15px', fontWeight: 700, color: winnerColor, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {fmtWealth(absAdvantage)}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-dim)', letterSpacing: '-0.01em' }}>
          {winner === 'buy' ? 'buying wins' : winner === 'rent' ? 'renting wins' : 'tied'} · {h}yr · {PROVINCE_NAMES[inputs.province] ?? inputs.province}
        </span>
      </div>
      <button
        onClick={back}
        style={{ fontSize: '12px', color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
      >
        ← Back
      </button>
    </motion.div>
  );

  // ─── 4-dot phase indicator ────────────────────────────────────────────────
  const PhaseIndicator = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '20px 0 24px' }}>
      {PHASES.map(p => (
        <div
          key={p}
          style={{
            height: '6px',
            width: resultPhase === p ? '20px' : '6px',
            borderRadius: '3px',
            backgroundColor: resultPhase === p ? 'var(--color-text)' : 'var(--color-outline-active)',
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      ))}
    </div>
  );

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-sans), system-ui, sans-serif', overflow: 'hidden' }}>

      {/* ─── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--color-outline)',
        backgroundColor: 'var(--color-bg)',
        flexShrink: 0,
        zIndex: 20,
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <ReckonSignature color="var(--color-text)" width={72} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setMethodologyOpen(true)} style={{ fontSize: '13px', color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)' }}>
            How this works
          </button>
          <button onClick={() => setFaqOpen(true)} style={{ fontSize: '13px', color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)' }}>
            FAQ
          </button>
          <button onClick={handleShare} style={{ fontSize: '13px', color: copied ? 'var(--color-renter)' : 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)', transition: 'color 0.2s' }}>
            {copied ? 'Copied' : 'Share'}
          </button>
          <button onClick={() => router.push('/experience')} style={{ height: '34px', padding: '0 16px', borderRadius: '9999px', border: '1px solid var(--color-outline-active)', backgroundColor: 'transparent', color: 'var(--color-text)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}>
            Recalculate →
          </button>
        </div>
      </nav>

      {/* ─── Phase content ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={resultPhase}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.28, ease }}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: resultPhase === 'chart' ? 'auto' : 'hidden' }}
            className={resultPhase === 'chart' ? 'thin-scroll' : undefined}
          >

            {/* ════════════════════════════════════════════════════════
                STATE 1: VERDICT
                ════════════════════════════════════════════════════════ */}
            {resultPhase === 'verdict' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 clamp(24px, 8vw, 120px)', position: 'relative' }}>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease }}
                  style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-dim)', marginBottom: '24px', fontWeight: 500 }}
                >
                  {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
                </motion.p>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.35, ease }}
                  style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 4.5vw, 56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--color-text)', marginBottom: '14px', maxWidth: '720px' }}
                >
                  {winner === 'tie' ? (
                    <>Within <span style={{ color: winnerColor, fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(absAdvantage)}</span> either way after {inputs.holdingPeriodYears} years.</>
                  ) : (
                    <>{winner === 'buy' ? 'Buying' : 'Renting'} comes out{' '}
                      <span style={{ display: 'inline-grid', color: winnerColor, whiteSpace: 'nowrap' }}>
                        <span style={{ gridArea: '1/1', color: 'transparent', userSelect: 'none', pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(absAdvantage)}</span>
                        <span style={{ gridArea: '1/1', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(countedValue)}</span>
                      </span>
                      {' '}ahead after {inputs.holdingPeriodYears} years.</>
                  )}
                </motion.h1>

                {result.breakEvenYear !== null && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.9, ease }}
                    style={{ fontSize: '13px', color: 'var(--color-text-dim)', marginBottom: '0' }}
                  >
                    Lines cross at year {result.breakEvenYear}
                  </motion.p>
                )}

                {/* 2×2 stat grid */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.0, ease }}
                  style={{ marginTop: '40px', border: '1px solid var(--color-outline)', borderRadius: '14px', overflow: 'hidden', width: 'min(100%, 280px)' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--color-outline)' }}>
                    <div style={{ padding: '15px 14px', borderRight: '1px solid var(--color-outline)', backgroundColor: winner === 'buy' ? 'var(--color-owner-tint)' : 'transparent', position: 'relative' }}>
                      {winner === 'buy' && <div style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '8px', backgroundColor: ownerColor, color: 'var(--color-bg)', padding: '2px 5px', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>WIN</div>}
                      <p style={{ fontSize: '9px', color: ownerColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '5px' }}>Owner</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(result.exit.finalOwnerWealth)}</p>
                      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '3px' }}>After exit costs</p>
                    </div>
                    <div style={{ padding: '15px 14px', backgroundColor: winner === 'rent' ? 'var(--color-renter-tint)' : 'transparent', position: 'relative' }}>
                      {winner === 'rent' && <div style={{ position: 'absolute', top: '6px', right: '6px', fontSize: '8px', backgroundColor: renterColor, color: 'var(--color-bg)', padding: '2px 5px', borderRadius: '3px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>WIN</div>}
                      <p style={{ fontSize: '9px', color: renterColor, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '5px' }}>Renter</p>
                      <p style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(result.exit.finalRenterWealth)}</p>
                      <p style={{ fontSize: '10px', color: 'var(--color-text-dim)', marginTop: '3px' }}>After cap. gains tax</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ padding: '13px 14px', borderRight: '1px solid var(--color-outline)' }}>
                      <p style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '5px' }}>Break-even</p>
                      <p style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: result.breakEvenYear !== null ? 'var(--color-cross)' : 'var(--color-text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                        {result.breakEvenYear !== null ? `Yr ${result.breakEvenYear}` : 'Never'}
                      </p>
                    </div>
                    <div style={{ padding: '13px 14px' }}>
                      <p style={{ fontSize: '9px', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: '5px' }}>Month 1 delta</p>
                      <p style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em', color: monthlyDelta > 0 ? renterColor : ownerColor, fontVariantNumeric: 'tabular-nums' }}>
                        {monthlyDelta > 0 ? `+${fmtCAD(Math.round(monthlyDelta))}` : `-${fmtCAD(Math.round(-monthlyDelta))}`}
                      </p>
                      <p style={{ fontSize: '9px', color: 'var(--color-text-dim)', marginTop: '2px' }}>
                        {monthlyDelta > 0 ? 'renter invests/mo' : 'owner saves/mo'}
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* CTA */}
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.2, duration: 0.4, ease }}
                  onClick={advance}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  style={{ marginTop: '36px', height: '44px', padding: '0 24px', borderRadius: '9999px', backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  See it play out
                  <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.3 }}>→</motion.span>
                </motion.button>

                {PhaseIndicator}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                STATE 2: CHART
                ════════════════════════════════════════════════════════ */}
            {resultPhase === 'chart' && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {CompactBar}

                <div style={{ padding: '20px clamp(20px, 5vw, 60px) 0' }}>
                  <WealthChart
                    key="result-chart"
                    ownerData={localOwnerData.length ? localOwnerData : baseScenario.ownerData}
                    renterData={localRenterData.length ? localRenterData : baseScenario.renterData}
                    ownerBand={ownerBand}
                    renterBand={renterBand}
                    breakEvenYear={localResult?.breakEvenYear ?? result.breakEvenYear}
                    holdingPeriodYears={localInputs.holdingPeriodYears}
                    height={chartH}
                    ownerSubLabel={ownerSubLabel}
                    renterSubLabel={renterSubLabel}
                    yearlyBreakdown={localResult?.yearByYear ?? result.yearByYear}
                    ownerMoveYears={ownerMoveYears}
                    renterMoveYears={renterMoveYears}
                    animateOnMount
                  />
                </div>

                {/* 4 live sliders */}
                <div style={{ padding: '16px clamp(20px, 5vw, 60px) 0' }}>
                  <p style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-dim)', marginBottom: '12px' }}>Adjust to see the outcome shift</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 32px' }}>
                    <FactorSlider factor={FACTORS.homeAppreciation} inputs={localInputs} patch={patchLocal} hideDescription />
                    <FactorSlider factor={FACTORS.investmentReturn} inputs={localInputs} patch={patchLocal} hideDescription />
                    <FactorSlider factor={FACTORS.mortgageRate} inputs={localInputs} patch={patchLocal} hideDescription />
                    <FactorSlider factor={FACTORS.timeHorizon} inputs={localInputs} patch={patchLocal} hideDescription />
                  </div>
                </div>

                {/* Breakdown toggle */}
                <div style={{ margin: '16px clamp(20px, 5vw, 60px) 0', borderTop: '1px solid var(--color-outline)' }}>
                  <button
                    onClick={() => setBreakdownOpen(p => !p)}
                    style={{ width: '100%', padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-dim)', fontSize: '11px', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}
                    onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-dim)')}
                  >
                    {breakdownOpen ? 'Hide breakdown ↑' : 'See the full breakdown ↓'}
                  </button>

                  <AnimatePresence initial={false}>
                    {breakdownOpen && (
                      <motion.div
                        key="breakdown"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ paddingBottom: '8px' }}>
                          {/* Month 1 cost story */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--color-outline)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                            <div style={{ padding: '14px 16px', borderRight: '1px solid var(--color-outline)' }}>
                              <p style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: ownerColor, marginBottom: '6px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Owner — year 1</p>
                              <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', marginBottom: '3px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{fmtCAD(Math.round(result.commitment.ownerFirstYearMonthlyCarry))}/mo</p>
                              <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Mortgage + tax + maintenance</p>
                            </div>
                            <div style={{ padding: '14px 16px' }}>
                              <p style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: renterColor, marginBottom: '6px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Renter — year 1</p>
                              <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', marginBottom: '3px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{fmtCAD(Math.round(inputs.monthlyRent))}/mo</p>
                              <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                                {monthlyDelta > 0 ? `+ ${fmtCAD(Math.round(monthlyDelta))}/mo invested` : `Owner saves ${fmtCAD(Math.round(-monthlyDelta))}/mo — also invested`}
                              </p>
                            </div>
                          </div>

                          {/* Milestones */}
                          <div style={{ marginBottom: '12px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-dim)', marginBottom: '8px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Who leads at each milestone</p>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {milestoneYears.map(yr => {
                                const ownerVal = ownerMilestonesData.find(d => d.year === yr)?.value ?? null;
                                const renterVal = renterMilestonesData.find(d => d.year === yr)?.value ?? null;
                                if (ownerVal == null || renterVal == null) return null;
                                const delta = ownerVal - renterVal;
                                const isFinal = yr === milestoneYears[milestoneYears.length - 1];
                                const color = Math.abs(delta) < 500 ? 'var(--color-text-dim)' : delta > 0 ? ownerColor : renterColor;
                                const label = Math.abs(delta) < 500 ? 'Tied' : delta > 0 ? 'Owner' : 'Renter';
                                return (
                                  <div key={yr} style={{ flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: '8px', backgroundColor: 'var(--color-bg-subtle)', border: `1px solid ${isFinal ? color : 'var(--color-outline)'}` }}>
                                    <p style={{ fontSize: '9px', color: 'var(--color-text-dim)', marginBottom: '3px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Yr {yr}</p>
                                    <p style={{ fontSize: '11px', fontWeight: 600, color, marginBottom: '1px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{label}</p>
                                    <p style={{ fontSize: '9px', color, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>+{fmtWealth(Math.abs(delta))}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Insight cards */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                            <InsightCard
                              label="5% rule"
                              value={`${fmtCAD(Math.round(fiveRuleRent))}/mo`}
                              body={inputs.monthlyRent < fiveRuleRent
                                ? `Break-even threshold. Your rent is ${fmtCAD(Math.round(fiveRuleGap))} below it — the renter keeps more to invest.`
                                : `Break-even threshold. Your rent is ${fmtCAD(Math.round(fiveRuleGap))} above it — owning makes more sense.`}
                              accentColor={inputs.monthlyRent < fiveRuleRent ? renterColor : ownerColor}
                            />
                            <InsightCard
                              label="Down payment opportunity cost"
                              value={fmtWealth(downPayment)}
                              body={`Locked in the home from day one. The renter invests this amount and compounds it for ${h} years.`}
                              accentColor="var(--color-text)"
                            />
                            {result.breakEvenYear !== null ? (
                              <InsightCard
                                label="Break-even point"
                                value={`Year ${result.breakEvenYear}`}
                                body={winner === 'rent'
                                  ? `Owner closes the gap here. Holds shorter than year ${result.breakEvenYear} favor renting.`
                                  : `Renter leads until year ${result.breakEvenYear}. Patience pays off for the owner.`}
                                accentColor="var(--color-cross)"
                              />
                            ) : (
                              <InsightCard
                                label="Total mortgage interest"
                                value={fmtWealth(totalInterest)}
                                body={`Paid over ${h} years. Every dollar of interest reduces net equity — it does not build wealth.`}
                                accentColor="var(--color-text)"
                              />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* CTA */}
                <div style={{ padding: '16px clamp(20px, 5vw, 60px) 0', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={advance}
                    style={{ height: '40px', padding: '0 22px', borderRadius: '9999px', backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
                  >
                    Does this fit your life? →
                  </button>
                </div>

                {PhaseIndicator}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                STATE 3: FIT
                ════════════════════════════════════════════════════════ */}
            {resultPhase === 'fit' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {CompactBar}
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px clamp(20px, 5vw, 60px) 0' }} className="thin-scroll">
                  <p style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15, color: 'var(--color-text)', marginBottom: '24px' }}>
                    Great. Now let's see how you actually live.
                  </p>
                  <LifestyleFit
                    financialVerdict={winner}
                    advantageLabel={fmtWealth(absAdvantage)}
                    answers={lifestyleAnswers}
                    onAnswersChange={setLifestyleAnswers}
                    fitResult={fitResult}
                  />
                </div>
                <div style={{ padding: '16px clamp(20px, 5vw, 60px)', borderTop: '1px solid var(--color-outline)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={advance}
                    style={{ height: '40px', padding: '0 22px', borderRadius: '9999px', backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
                  >
                    Share your result →
                  </button>
                </div>
                {PhaseIndicator}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                STATE 4: SHARE
                ════════════════════════════════════════════════════════ */}
            {resultPhase === 'share' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {CompactBar}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 clamp(24px, 8vw, 120px)' }}>

                  <div style={{ width: '100%', maxWidth: '440px' }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                      reckon — {h}yr outlook, {PROVINCE_NAMES[inputs.province] ?? inputs.province}
                    </p>
                    <p style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--color-text)', marginBottom: result.breakEvenYear !== null ? '6px' : '24px' }}>
                      {winner === 'tie'
                        ? `Within ${fmtWealth(absAdvantage)} either way after ${h} years.`
                        : `${winner === 'buy' ? 'Buying' : 'Renting'} comes out ${fmtWealth(absAdvantage)} ahead.`}
                    </p>
                    {result.breakEvenYear !== null && (
                      <p style={{ fontSize: '13px', color: 'var(--color-text-dim)', marginBottom: '24px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Break-even at year {result.breakEvenYear}.</p>
                    )}

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={handleShare}
                        style={{ flex: '1 1 160px', height: '44px', borderRadius: '9999px', backgroundColor: 'var(--color-text)', color: 'var(--color-bg)', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
                      >
                        {copied ? 'Link copied' : 'Share result →'}
                      </button>
                      <button
                        onClick={() => router.push('/experience')}
                        style={{ flex: '1 1 140px', height: '44px', borderRadius: '9999px', backgroundColor: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-outline-active)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
                      >
                        Recalculate →
                      </button>
                    </div>

                    <div style={{ marginTop: '20px' }}>
                      <button
                        onClick={() => setDrawerOpen(true)}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--color-outline)', backgroundColor: 'var(--color-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', color: 'var(--color-text)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-elevated)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-subtle)'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500 }}>View all assumptions</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                            {inputs.holdingPeriodYears}yr · {PROVINCE_NAMES[inputs.province] ?? inputs.province} · {fmtPct(inputs.mortgageRatePct, 2)} rate
                          </span>
                        </div>
                        <span style={{ fontSize: '16px', color: 'var(--color-text-dim)', lineHeight: 1 }}>↑</span>
                      </button>
                    </div>

                    <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--color-text-dim)', lineHeight: 1.55 }}>
                      Not financial advice. Every assumption is editable.{' '}
                      <button onClick={() => setMethodologyOpen(true)} style={{ color: 'var(--color-text-faint)', textDecoration: 'underline', textUnderlineOffset: '2px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                        Read methodology
                      </button>
                    </p>
                  </div>
                </div>
                {PhaseIndicator}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Assumptions drawer ──────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 40 }} />
            <motion.div key="drawer-panel" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }} style={{ position: 'fixed', bottom: 0, left: 'clamp(8px, 3vw, 32px)', right: 'clamp(8px, 3vw, 32px)', maxHeight: '80vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.10)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', cursor: 'pointer', flexShrink: 0 }} onClick={() => setDrawerOpen(false)}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-outline-active)' }} />
              </div>
              <div style={{ padding: '0 24px 14px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-sans), system-ui, sans-serif', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>All assumptions</p>
                <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-faint)', lineHeight: 1, padding: '4px' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 48px' }} className="thin-scroll">
                {drawerSections.map(section => <DrawerSection key={section.title} title={section.title} items={section.items} />)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Methodology drawer ──────────────────────────────────────── */}
      <BottomSheet open={methodologyOpen} onClose={() => setMethodologyOpen(false)} eyebrow="Methodology" title="How this calculator thinks">
        <MethodologyContent />
      </BottomSheet>

      {/* ─── FAQ drawer ──────────────────────────────────────────────── */}
      <BottomSheet open={faqOpen} onClose={() => setFaqOpen(false)} eyebrow="FAQ" title="Frequently asked questions">
        <FaqContent />
      </BottomSheet>

    </div>
  );
}
