'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useCalculatorStore } from '@/lib/store';
import type { SensitivityScenario } from '@/lib/store';
import { encodeShare } from '@/lib/share';
import { WealthChart } from '@/components/chart/WealthChart';
import { MetricCard } from '@/components/MetricCard';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { ReckonSignature } from '@/components/ReckonSignature';
// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtWealth(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

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

const SCENARIO_ORDER: SensitivityScenario['id'][] = ['base', 'growth+2', 'growth-2', 'rate+1', 'rate-1'];

const ease = [0.0, 0.0, 0.2, 1] as [number, number, number, number];

// ─── Assumptions drawer section ──────────────────────────────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const { result, inputs, sensitivity } = useCalculatorStore();
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [activeSensitivity, setActiveSensitivity] = useState<SensitivityScenario['id']>('base');
  const [chartH, setChartH] = useState(380);
  const [activePanel, setActivePanel] = useState<'verdict' | 'chart'>('verdict');
  const [desktopChartH, setDesktopChartH] = useState(520);

  useEffect(() => {
    if (!result || !inputs) router.replace('/experience');
  }, [result, inputs, router]);

  useEffect(() => {
    if (window.innerWidth < 480) setChartH(260);
    setDesktopChartH(Math.max(360, window.innerHeight - 52 - 200));
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

  if (!result || !inputs || sensitivity.length === 0) return null;

  const advantage = result.exit.netAdvantageToOwner;
  const absAdvantage = Math.abs(advantage);
  const winner = advantage > 500 ? 'buy' : advantage < -500 ? 'rent' : 'tie';
  const ownerColor = 'var(--color-owner)';
  const renterColor = 'var(--color-renter)';
  const winnerColor = winner === 'buy' ? ownerColor : winner === 'rent' ? renterColor : 'var(--color-text-muted)';

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const countedValue = useCountUp(winner !== 'tie' ? absAdvantage : 0, 2200, 1100);

  const activeScenario = sensitivity.find(s => s.id === activeSensitivity) ?? sensitivity[0]!;
  const baseScenario = sensitivity.find(s => s.id === 'base') ?? sensitivity[0]!;

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.30, ease: [0.0, 0.0, 0.2, 1] }}
      style={{ minHeight: '100dvh', backgroundColor: '#0F0F11', fontFamily: 'var(--font-sans), system-ui, sans-serif', position: 'relative', transformOrigin: 'center' }}
    >

      {/* ─── Dark nav ──────────────────────────────────────────────────── */}
      <nav style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        backgroundColor: '#17171B',
        zIndex: 20,
        flexShrink: 0,
      }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <ReckonSignature color="#FAFAFA" width={72} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => setMethodologyOpen(true)} style={{ fontSize: '13px', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.1)' }}>
            How this works
          </button>
          <button onClick={() => setFaqOpen(true)} style={{ fontSize: '13px', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.1)' }}>
            FAQ
          </button>
          <button onClick={handleShare} style={{ fontSize: '13px', color: copied ? 'var(--color-renter)' : '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.1)', transition: 'color 0.2s' }}>
            {copied ? 'Copied' : 'Share'}
          </button>
          <button onClick={() => router.push('/experience')} style={{ height: '34px', padding: '0 16px', borderRadius: '9999px', border: 'none', backgroundColor: '#FAFAFA', color: '#0F0F11', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}>
            Recalculate →
          </button>
        </div>
      </nav>

      {/* ─── Desktop: horizontal two-panel layout ─────────────────────── */}
      <div className="hidden lg:block" style={{ overflow: 'hidden' }}>
        <motion.div
          animate={{ x: activePanel === 'chart' ? '-50%' : '0%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 34 }}
          style={{ display: 'flex', width: '200vw' }}
        >
          {/* Panel 1: verdict */}
          <div style={{ width: '100vw', height: 'calc(100dvh - 52px)', backgroundColor: '#0F0F11', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 clamp(48px, 8vw, 120px)', position: 'relative', overflow: 'hidden' }}>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.3, ease }} style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525B', marginBottom: '28px', fontWeight: 500 }}>
              {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease }}
              style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 4vw, 56px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#FAFAFA', marginBottom: '16px', maxWidth: '720px' }}
            >
              {winner === 'tie' ? (
                <>Within <span style={{ color: winnerColor, fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(absAdvantage)}</span> either way after {inputs.holdingPeriodYears} years.</>
              ) : (
                <>{winner === 'buy' ? 'Buying' : 'Renting'} comes out{' '}
                  <span style={{ display: 'inline-grid', color: winnerColor }}>
                    <span style={{ gridArea: '1/1', color: 'transparent', userSelect: 'none', pointerEvents: 'none', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(absAdvantage)}</span>
                    <span style={{ gridArea: '1/1', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(countedValue)}</span>
                  </span>
                  {' '}ahead after {inputs.holdingPeriodYears} years.</>
              )}
            </motion.h1>

            {result.breakEvenYear !== null && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 1.1, ease }} style={{ fontSize: '13px', color: '#52525B', marginBottom: '4px' }}>
                Lines cross at year {result.breakEvenYear}
              </motion.p>
            )}

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.4, ease }}
              style={{ display: 'flex', gap: 0, marginTop: '48px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '400px' }}
            >
              <div style={{ flex: 1, padding: '20px 16px', textAlign: 'left', backgroundColor: winner === 'buy' ? 'rgba(217,119,6,0.07)' : 'rgba(255,255,255,0.01)', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                {winner === 'buy' && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', backgroundColor: ownerColor, color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>WINNER</div>}
                <p style={{ fontSize: '10px', color: ownerColor, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: '8px' }}>Owner</p>
                <p style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#FAFAFA', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(result.exit.finalOwnerWealth)}</p>
                <p style={{ fontSize: '11px', color: '#52525B', marginTop: '4px' }}>After exit costs</p>
              </div>
              <div style={{ flex: 1, padding: '20px 16px', textAlign: 'left', backgroundColor: winner === 'rent' ? 'rgba(20,184,166,0.07)' : 'rgba(255,255,255,0.01)', position: 'relative' }}>
                {winner === 'rent' && <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', backgroundColor: renterColor, color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>WINNER</div>}
                <p style={{ fontSize: '10px', color: renterColor, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: '8px' }}>Renter</p>
                <p style={{ fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#FAFAFA', fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(result.exit.finalRenterWealth)}</p>
                <p style={{ fontSize: '11px', color: '#52525B', marginTop: '4px' }}>After capital gains tax</p>
              </div>
            </motion.div>

            {/* Affordance: sparklines + pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.8, duration: 0.5, ease: [0, 0, 0.2, 1] }}
              style={{ position: 'absolute', bottom: '40px', right: '48px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}
            >
              <svg viewBox="0 0 100 36" style={{ width: '90px', opacity: 0.22 }}>
                <motion.path d="M0 30 C 20 24 40 14 55 9 S 80 3 100 1" fill="none" stroke="var(--color-owner)" strokeWidth="1.8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 3.0, duration: 1.1, ease: 'easeOut' }} />
                <motion.path d="M0 33 C 20 30 40 26 55 22 S 80 16 100 13" fill="none" stroke="var(--color-renter)" strokeWidth="1.8" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 3.15, duration: 1.1, ease: 'easeOut' }} />
              </svg>
              <motion.button
                onClick={() => setActivePanel('chart')}
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(255,255,255,0.14)' }}
                whileTap={{ scale: 0.97 }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '44px', padding: '0 18px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)', color: '#FAFAFA', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
              >
                See it play out
                <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }}>→</motion.span>
              </motion.button>
            </motion.div>
          </div>

          {/* Panel 2: chart */}
          <div style={{ width: '100vw', height: 'calc(100dvh - 52px)', backgroundColor: '#0F0F11', overflowY: 'auto', padding: '32px clamp(32px, 6vw, 80px) 48px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              {/* Back + title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <button
                  onClick={() => setActivePanel('verdict')}
                  style={{ fontSize: '13px', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  ← Result
                </button>
                <p style={{ fontSize: '13px', color: '#52525B', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}>
                  {inputs.firstName ? `${inputs.firstName}'s wealth trajectory` : 'Wealth trajectory'} — {inputs.holdingPeriodYears} yr
                </p>
                <div style={{ width: '80px' }} />
              </div>

              <WealthChart
                key={`desktop-${activeSensitivity}`}
                ownerData={activeScenario.ownerData}
                renterData={activeScenario.renterData}
                breakEvenYear={result.breakEvenYear}
                holdingPeriodYears={inputs.holdingPeriodYears}
                height={desktopChartH}
                ownerSubLabel={ownerSubLabel}
                renterSubLabel={renterSubLabel}
                yearlyBreakdown={result.yearByYear}
                ownerMoveYears={ownerMoveYears}
                renterMoveYears={renterMoveYears}
              />

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
                {SCENARIO_ORDER.map(id => {
                  const scenario = sensitivity.find(s => s.id === id);
                  if (!scenario) return null;
                  const isActive = activeSensitivity === id;
                  return (
                    <button key={id} onClick={() => setActiveSensitivity(id)}
                      style={{ padding: '6px 14px', borderRadius: '100px', fontSize: '12px', fontFamily: 'var(--font-sans), system-ui, sans-serif', border: `1px solid ${isActive ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.1)'}`, backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent', color: isActive ? '#FAFAFA' : '#71717A', cursor: 'pointer', transition: 'all 0.15s', letterSpacing: '-0.01em' }}
                    >
                      {scenario.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginTop: '20px' }}>
                <MetricCard label="Net advantage" value={fmtWealth(absAdvantage)} subvalue={winner === 'buy' ? 'Owner ahead' : winner === 'rent' ? 'Renter ahead' : 'Tied'} accentColor={winnerColor} />
                <MetricCard label="Break-even" value={result.breakEvenYear !== null ? `Yr ${result.breakEvenYear}` : 'Never'} subvalue={result.breakEvenYear !== null ? 'Owner catches up' : 'Renter stays ahead'} />
                <MetricCard label="Owner wealth" value={fmtWealth(result.exit.finalOwnerWealth)} subvalue="After exit costs" accentColor="var(--color-owner)" />
                <MetricCard label="Renter wealth" value={fmtWealth(result.exit.finalRenterWealth)} subvalue="After tax" accentColor="var(--color-renter)" />
              </div>

              <div style={{ marginTop: '16px' }}>
                <button
                  onClick={() => setDrawerOpen(true)}
                  style={{ width: '100%', padding: '12px 18px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', color: '#FAFAFA' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>View all assumptions</span>
                  <span style={{ fontSize: '18px', color: '#52525B', lineHeight: 1 }}>↑</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ─── Mobile: vertical layout ────────────────────────────────────── */}
      <div className="lg:hidden">

      {/* ─── Dark cinematic hero ───────────────────────────────────────── */}
      <div style={{
        minHeight: 'calc(100dvh - 52px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'clamp(48px, 8vh, 80px) 24px clamp(64px, 10vh, 100px)',
        position: 'relative',
      }}>
        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3, ease }}
          style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525B', marginBottom: '28px', fontWeight: 500 }}
        >
          {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
        </motion.p>

        {/* Combined verdict headline */}
        <motion.h1
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease }}
          style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: '#FAFAFA', marginBottom: '16px', maxWidth: '760px' }}
        >
          {winner === 'tie' ? (
            <>Within <span style={{ color: winnerColor, fontVariantNumeric: 'tabular-nums' }}>{fmtWealth(absAdvantage)}</span> either way after {inputs.holdingPeriodYears} years.</>
          ) : (
            <>{winner === 'buy' ? 'Buying' : 'Renting'} comes out{' '}
              <span style={{ display: 'inline-grid', color: winnerColor }}>
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
            transition={{ duration: 0.4, delay: 1.1, ease }}
            style={{ fontSize: '13px', color: '#52525B', marginTop: '4px', marginBottom: '4px' }}
          >
            Lines cross at year {result.breakEvenYear}
          </motion.p>
        )}

        {/* Owner vs Renter split card */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 1.4, ease }}
          style={{ display: 'flex', gap: 0, marginTop: '56px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', overflow: 'hidden', width: '100%', maxWidth: '440px' }}
        >
          {/* Owner */}
          <div style={{ flex: 1, padding: '24px 20px', textAlign: 'left', backgroundColor: winner === 'buy' ? 'rgba(217,119,6,0.07)' : 'rgba(255,255,255,0.01)', borderRight: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
            {winner === 'buy' && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '9px', backgroundColor: ownerColor, color: '#000', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                WINNER
              </div>
            )}
            <p style={{ fontSize: '10px', color: ownerColor, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: '10px' }}>Owner</p>
            <p style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#FAFAFA', fontVariantNumeric: 'tabular-nums' }}>
              {fmtWealth(result.exit.finalOwnerWealth)}
            </p>
            <p style={{ fontSize: '11px', color: '#52525B', marginTop: '6px', lineHeight: 1.4 }}>After exit costs</p>
          </div>

          {/* Renter */}
          <div style={{ flex: 1, padding: '24px 20px', textAlign: 'left', backgroundColor: winner === 'rent' ? 'rgba(20,184,166,0.07)' : 'rgba(255,255,255,0.01)', position: 'relative' }}>
            {winner === 'rent' && (
              <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '9px', backgroundColor: renterColor, color: '#000', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                WINNER
              </div>
            )}
            <p style={{ fontSize: '10px', color: renterColor, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: '10px' }}>Renter</p>
            <p style={{ fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 700, letterSpacing: '-0.03em', color: '#FAFAFA', fontVariantNumeric: 'tabular-nums' }}>
              {fmtWealth(result.exit.finalRenterWealth)}
            </p>
            <p style={{ fontSize: '11px', color: '#52525B', marginTop: '6px', lineHeight: 1.4 }}>After capital gains tax</p>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 3.0, ease }}
          style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <p style={{ fontSize: '12px', color: '#A1A1AA', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Scroll ↓</p>
        </motion.div>
      </div>

      {/* ─── Light detail section ──────────────────────────────────────── */}
      <div style={{ backgroundColor: 'var(--color-bg)', clipPath: 'polygon(0 28px, 100% 0%, 100% 100%, 0 100%)', marginTop: '-28px', color: 'var(--color-text)', padding: '72px 24px 80px' }}>
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>

          {/* Chart */}
          <WealthChart
            key={activeSensitivity}
            ownerData={activeScenario.ownerData}
            renterData={activeScenario.renterData}
            breakEvenYear={result.breakEvenYear}
            holdingPeriodYears={inputs.holdingPeriodYears}
            height={chartH}
            ownerSubLabel={ownerSubLabel}
            renterSubLabel={renterSubLabel}
            yearlyBreakdown={result.yearByYear}
            ownerMoveYears={ownerMoveYears}
            renterMoveYears={renterMoveYears}
          />

          {/* Sensitivity pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            {SCENARIO_ORDER.map(id => {
              const scenario = sensitivity.find(s => s.id === id);
              if (!scenario) return null;
              const isActive = activeSensitivity === id;
              return (
                <button key={id} onClick={() => setActiveSensitivity(id)}
                  style={{
                    padding: '6px 14px', borderRadius: '100px', fontSize: '12px',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                    border: `1px solid ${isActive ? 'var(--color-text)' : 'var(--color-outline)'}`,
                    backgroundColor: isActive ? 'var(--color-text)' : 'transparent',
                    color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)',
                    cursor: 'pointer', transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {scenario.label}
                </button>
              );
            })}
          </div>

          {/* Metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginTop: '24px' }}>
            <MetricCard label="Net advantage" value={fmtWealth(absAdvantage)} subvalue={winner === 'buy' ? 'Owner ahead' : winner === 'rent' ? 'Renter ahead' : 'Tied'} accentColor={winnerColor} />
            <MetricCard label="Break-even" value={result.breakEvenYear !== null ? `Yr ${result.breakEvenYear}` : 'Never'} subvalue={result.breakEvenYear !== null ? 'Owner catches up' : 'Renter stays ahead'} />
            <MetricCard label="Owner wealth" value={fmtWealth(result.exit.finalOwnerWealth)} subvalue="After exit costs" accentColor="var(--color-owner)" />
            <MetricCard label="Renter wealth" value={fmtWealth(result.exit.finalRenterWealth)} subvalue="After tax" accentColor="var(--color-renter)" />
          </div>

          {/* Break-even callout */}
          {result.breakEvenYear !== null && (
            <div style={{ marginTop: '24px', padding: '14px 18px', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-outline)', borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Owner and renter wealth lines cross at <strong style={{ color: 'var(--color-text)' }}>year {result.breakEvenYear}</strong>.
                {winner === 'rent'
                  ? ` The owner trails until then. If the holding period extends beyond year ${result.breakEvenYear}, buying becomes the stronger outcome.`
                  : ` The renter leads until then. Shorter hold periods favor renting.`}
              </span>
            </div>
          )}

          {/* Assumptions trigger */}
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ width: '100%', padding: '13px 20px', borderRadius: '10px', border: '1px solid var(--color-outline)', backgroundColor: 'var(--color-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', color: 'var(--color-text)', transition: 'background-color 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-elevated)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--color-bg-subtle)'; }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>View all assumptions</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                  {inputs.holdingPeriodYears}yr horizon · {PROVINCE_NAMES[inputs.province] ?? inputs.province} · {fmtPct(inputs.mortgageRatePct, 2)} rate
                </span>
              </div>
              <span style={{ fontSize: '18px', color: 'var(--color-text-faint)', lineHeight: 1 }}>↑</span>
            </button>
          </div>

          {/* Footer CTAs */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-outline)' }}>
            <button onClick={handleShare} style={{ flex: 1, minWidth: '140px', height: '48px', borderRadius: '9999px', backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-btn-primary-text)', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}>
              {copied ? 'Link copied' : 'Share result'}
            </button>
            <button onClick={() => router.push('/experience')} style={{ flex: 1, minWidth: '140px', height: '48px', borderRadius: '9999px', backgroundColor: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-outline-active)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}>
              Recalculate →
            </button>
          </div>

          <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--color-text-faint)', lineHeight: 1.55 }}>
            Not financial advice. Every assumption is editable.{' '}
            <button onClick={() => setMethodologyOpen(true)} style={{ color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              Read methodology
            </button>
          </p>
        </div>
      </div>

      </div>{/* end lg:hidden */}

      {/* ─── Assumptions drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div key="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setDrawerOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
            <motion.div key="drawer-panel" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '80vh', backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-outline)', borderRadius: '20px 20px 0 0', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', cursor: 'pointer', flexShrink: 0 }} onClick={() => setDrawerOpen(false)}>
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-outline-active)' }} />
              </div>
              <div style={{ padding: '0 24px 14px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-sans), system-ui, sans-serif', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>All assumptions</p>
                <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-faint)', lineHeight: 1, padding: '4px' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px clamp(24px, 6vw, 56px) 48px', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                  {drawerSections.map(section => <DrawerSection key={section.title} title={section.title} items={section.items} />)}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── Methodology drawer ────────────────────────────────────────── */}
      <AnimatePresence>
        {methodologyOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setMethodologyOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '9999px', backgroundColor: 'var(--color-outline-active)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '2px' }}>Methodology</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>How this calculator thinks</p>
                </div>
                <button onClick={() => setMethodologyOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, padding: '0 clamp(20px, 6vw, 56px) 48px' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                  <MethodologyContent />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── FAQ drawer ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {faqOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setFaqOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', flexShrink: 0 }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '9999px', backgroundColor: 'var(--color-outline-active)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '2px' }}>FAQ</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>Frequently asked questions</p>
                </div>
                <button onClick={() => setFaqOpen(false)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, padding: '0 clamp(20px, 6vw, 56px) 48px' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                  <FaqContent />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </motion.div>
  );
}

