'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { useCalculatorStore } from '@/lib/store';
import { encodeShare } from '@/lib/share';
import { WealthChart } from '@/components/chart/WealthChart';
import { MetricCard } from '@/components/MetricCard';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';

function fmtWealth(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick',
  NL: 'Newfoundland', PE: 'Prince Edward Island',
};

const HOME_TYPE_LABELS: Record<string, string> = {
  'condo-apt': 'Condo',
  'condo-townhouse': 'Condo TH',
  'freehold-townhouse': 'Freehold TH',
  'semi-detached': 'Semi-detached',
  'detached': 'Detached',
};

function DrawerSection({ title, items }: { title: string; items: { label: string; value: string }[] }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{
        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'var(--color-text-faint)',
        marginBottom: '10px', fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}>
        {title}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px 24px',
      }}>
        {items.map(a => (
          <div key={a.label}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '1px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              {a.label}
            </p>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              {a.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const { result, inputs, sensitivity } = useCalculatorStore();
  const [copied, setCopied] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    if (!result || !inputs) router.replace('/experience');
  }, [result, inputs, router]);

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

  const baseScenario = sensitivity.find(s => s.id === 'base') ?? sensitivity[0]!;
  const advantage = result.exit.netAdvantageToOwner;
  const winner = advantage > 500 ? 'buy' : advantage < -500 ? 'rent' : 'tie';
  const winnerColor = winner === 'buy' ? 'var(--color-owner)' : winner === 'rent' ? 'var(--color-renter)' : 'var(--color-text-muted)';

  const verdictLine =
    winner === 'buy'  ? 'Buying comes out ahead' :
    winner === 'rent' ? 'Renting comes out ahead' :
    'Roughly tied';

  const deltaLine =
    winner === 'tie'
      ? `Within ${fmtWealth(Math.abs(advantage))} either way`
      : `${fmtWealth(Math.abs(advantage))} ahead after ${inputs.holdingPeriodYears} years`;

  async function handleShare() {
    if (typeof window === 'undefined') return;
    const shareId = encodeShare(inputs!);
    const url = `${window.location.origin}/result/${shareId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Reckon result', url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  const ownerSubLabel = `Home ${fmtWealth(result.exit.ownerHomeNetProceeds)} + Inv ${fmtWealth(result.exit.ownerPortfolioNetProceeds)}`;
  const renterSubLabel = `Portfolio ${fmtWealth(result.exit.finalRenterWealth)}`;

  const fmtCAD = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  const fmtPct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`;

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
        ...(inputs.monthlyStrataFee && inputs.monthlyStrataFee > 0
          ? [{ label: 'Strata fee', value: `${fmtCAD(inputs.monthlyStrataFee)}/mo` }]
          : []),
        { label: 'Property tax', value: `${fmtPct(inputs.propertyTaxPct)}/yr` },
        { label: 'Home appreciation', value: `${fmtPct(inputs.homeAppreciationPct)}/yr` },
        ...(inputs.monthlyRentalIncome && inputs.monthlyRentalIncome > 0
          ? [{ label: 'Rental income', value: `${fmtCAD(inputs.monthlyRentalIncome)}/mo` }]
          : []),
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
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--color-bg)',
      color: 'var(--color-text)',
      fontFamily: 'var(--font-sans), system-ui, sans-serif',
    }}>
      {/* Nav */}
      <nav style={{
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--color-outline)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--color-bg)',
        zIndex: 20,
      }}>
        <a href="/" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--color-text)', textDecoration: 'none' }}>
          Reckon
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setMethodologyOpen(true)}
            style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)' }}
          >
            How this works
          </button>
          <button
            onClick={() => setFaqOpen(true)}
            style={{ fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)' }}
          >
            FAQ
          </button>
          <button
            onClick={handleShare}
            style={{ fontSize: '13px', color: copied ? 'var(--color-renter)' : 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)', transition: 'color 0.2s' }}
          >
            {copied ? 'Copied' : 'Share'}
          </button>
          <button
            onClick={() => router.push('/experience')}
            style={{ height: '34px', padding: '0 16px', borderRadius: '9999px', border: 'none', backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-btn-primary-text)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
          >
            Recalculate →
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Verdict hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          style={{ paddingTop: '40px', paddingBottom: '28px' }}
        >
          <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '12px' }}>
            {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
          </p>
          <h1 style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
            color: winnerColor,
            marginBottom: '10px',
          }}>
            {verdictLine}
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2.8vw, 26px)', fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
            {deltaLine}
          </p>
          {result.breakEvenYear !== null && (
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Lines cross at year {result.breakEvenYear}
            </p>
          )}
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0, 0, 0.2, 1], delay: 0.1 }}
        >
          <WealthChart
            key="result"
            ownerData={baseScenario.ownerData}
            renterData={baseScenario.renterData}
            breakEvenYear={result.breakEvenYear}
            holdingPeriodYears={inputs.holdingPeriodYears}
            height={typeof window !== 'undefined' && window.innerWidth < 480 ? 280 : 420}
            ownerSubLabel={ownerSubLabel}
            renterSubLabel={renterSubLabel}
            yearlyBreakdown={result.yearByYear}
            ownerMoveYears={ownerMoveYears}
            renterMoveYears={renterMoveYears}
          />
        </motion.div>

        {/* Metric cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1], delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: '8px', marginTop: '20px' }}
        >
          <MetricCard
            label="Net advantage"
            value={fmtWealth(Math.abs(advantage))}
            subvalue={winner === 'buy' ? 'Owner ahead' : winner === 'rent' ? 'Renter ahead' : 'Tied'}
            accentColor={winnerColor}
          />
          <MetricCard
            label="Break-even"
            value={result.breakEvenYear !== null ? `Yr ${result.breakEvenYear}` : 'Never'}
            subvalue={result.breakEvenYear !== null ? 'Owner catches up' : 'Renter stays ahead'}
          />
          <MetricCard
            label="Owner wealth"
            value={fmtWealth(result.exit.finalOwnerWealth)}
            subvalue="After exit costs"
            accentColor="var(--color-owner)"
          />
          <MetricCard
            label="Renter wealth"
            value={fmtWealth(result.exit.finalRenterWealth)}
            subvalue="After tax"
            accentColor="var(--color-renter)"
          />
        </motion.div>

        {/* Assumptions trigger */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          style={{ marginTop: '20px' }}
        >
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: '10px',
              border: '1px solid var(--color-outline)',
              backgroundColor: 'var(--color-bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              color: 'var(--color-text)',
              transition: 'background-color 0.15s',
            }}
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
        </motion.div>

        {/* Footer CTAs */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--color-outline)' }}>
          <button
            onClick={handleShare}
            style={{ flex: 1, minWidth: '140px', height: '48px', borderRadius: '9999px', backgroundColor: 'var(--color-btn-primary-bg)', color: 'var(--color-btn-primary-text)', border: 'none', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
          >
            {copied ? 'Link copied' : 'Share result'}
          </button>
          <button
            onClick={() => router.push('/experience')}
            style={{ flex: 1, minWidth: '140px', height: '48px', borderRadius: '9999px', backgroundColor: 'transparent', color: 'var(--color-text)', border: '1px solid var(--color-outline-active)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em' }}
          >
            Recalculate →
          </button>
        </div>

        <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--color-text-faint)', lineHeight: 1.55 }}>
          Not financial advice. Every assumption is editable.{' '}
          <button
            onClick={() => setMethodologyOpen(true)}
            style={{ color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
          >
            Read methodology
          </button>
        </p>
      </div>

      {/* Assumptions drawer — Motion-based slide-up */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }}
            />

            {/* Panel */}
            <motion.div
              key="drawer-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: '80vh',
                backgroundColor: 'var(--color-bg)',
                borderTop: '1px solid var(--color-outline)',
                borderRadius: '20px 20px 0 0',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Drag handle */}
              <div
                style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px', cursor: 'pointer', flexShrink: 0 }}
                onClick={() => setDrawerOpen(false)}
              >
                <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-outline-active)' }} />
              </div>

              {/* Header */}
              <div style={{ padding: '0 24px 14px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-sans), system-ui, sans-serif', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                  All assumptions
                </p>
                <button
                  onClick={() => setDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-faint)', lineHeight: 1, padding: '4px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px 48px', WebkitOverflowScrolling: 'touch' }}>
                <div style={{ maxWidth: '680px' }}>
                  {drawerSections.map(section => (
                    <DrawerSection key={section.title} title={section.title} items={section.items} />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Methodology drawer */}
      <AnimatePresence>
        {methodologyOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setMethodologyOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={() => setFaqOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, maxHeight: '82vh', backgroundColor: 'var(--color-bg)', borderRadius: '16px 16px 0 0', zIndex: 50, display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.18)' }}>
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
    </div>
  );
}
