'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useCalculatorStore } from '@/lib/store';
import { encodeShare } from '@/lib/share';
import { WealthChart } from '@/components/chart/WealthChart';
import { MetricCard } from '@/components/MetricCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

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
        fontSize: '11px', fontWeight: 500, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: 'var(--color-text-faint)',
        marginBottom: '12px', fontFamily: 'var(--font-sans), system-ui, sans-serif',
      }}>
        {title}
      </p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '10px 20px',
      }}>
        {items.map(a => (
          <div key={a.label}>
            <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '2px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
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

  useEffect(() => {
    if (!result || !inputs) {
      router.replace('/experience');
    }
  }, [result, inputs, router]);

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
        await navigator.share({ title: 'My Rent vs Buy result', url });
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
        { label: 'Maintenance', value: `${fmtPct(inputs.maintenancePct ?? 0.015)}/yr of value` },
        ...(inputs.monthlyStrataFee && inputs.monthlyStrataFee > 0
          ? [{ label: 'Strata fee', value: `${fmtCAD(inputs.monthlyStrataFee)}/mo` }]
          : []),
        { label: 'Property tax', value: `${fmtPct(inputs.propertyTaxPct ?? 0.01)}/yr` },
        { label: 'Home appreciation', value: `${fmtPct(inputs.homeAppreciationPct ?? 0.035)}/yr` },
        ...(inputs.monthlyRentalIncome && inputs.monthlyRentalIncome > 0
          ? [{ label: 'Rental suite income', value: `${fmtCAD(inputs.monthlyRentalIncome)}/mo` }]
          : []),
      ],
    },
    {
      title: 'Renter',
      items: [
        { label: 'Monthly rent', value: `${fmtCAD(inputs.monthlyRent)}/mo` },
        { label: 'Rent growth', value: `${fmtPct(inputs.rentEscalationPct ?? 0.03)}/yr` },
        { label: 'Renter insurance', value: `${fmtCAD(inputs.rentInsuranceMonthly ?? 40)}/mo` },
        { label: 'Savings discipline', value: `${Math.round((inputs.savingsDisciplinePct ?? 1) * 100)}%` },
      ],
    },
    {
      title: 'Tax shelters',
      items: [
        { label: 'TFSA', value: inputs.renterUsesTFSA ? 'Yes' : 'No' },
        { label: 'FHSA', value: inputs.useFHSA
            ? `Yes — ${fmtCAD(inputs.renterFhsaRoomOverride ?? 40_000)} room`
            : 'No' },
        { label: 'RRSP', value: inputs.renterUsesRRSP
            ? `Yes — ${fmtCAD(inputs.renterRrspCarryforward ?? 0)} carryforward`
            : 'No' },
      ],
    },
    {
      title: 'Market',
      items: [
        { label: 'Investment return', value: `${fmtPct(inputs.investmentReturnPct ?? 0.07)}/yr` },
        { label: 'Inflation', value: `${fmtPct(inputs.inflationPct ?? 0.025)}/yr` },
        { label: 'Marginal tax rate', value: fmtPct(inputs.marginalTaxRatePct ?? 0.4) },
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
    <div
      style={{
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--color-outline)',
          position: 'sticky',
          top: 0,
          backgroundColor: 'var(--color-bg)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleShare}
            style={{
              fontSize: '13px',
              color: copied ? 'var(--color-renter)' : 'var(--color-text-muted)',
              background: 'none', border: 'none', cursor: 'pointer',
              transition: 'color 0.2s',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
            }}
          >
            {copied ? 'Copied' : 'Share'}
          </button>
          <button
            onClick={() => router.push('/experience')}
            style={{
              height: '34px',
              padding: '0 16px',
              borderRadius: '9999px',
              border: '1px solid var(--color-outline-active)',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            Recalculate →
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '0 24px 80px' }}>

        {/* Verdict hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
          style={{ paddingTop: '44px', paddingBottom: '32px' }}
        >
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
              marginBottom: '14px',
            }}
          >
            {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-serif), Georgia, serif',
              fontSize: 'clamp(30px, 5vw, 52px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.05,
              color: winnerColor,
              marginBottom: '12px',
            }}
          >
            {verdictLine}
          </h1>
          <p
            style={{
              fontSize: 'clamp(18px, 3vw, 28px)',
              fontWeight: 600,
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
              color: 'var(--color-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {deltaLine}
          </p>
          {result.breakEvenYear !== null && (
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              Lines cross at year {result.breakEvenYear}
            </p>
          )}
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1], delay: 0.12 }}
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
          />
        </motion.div>

        {/* Metric cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1], delay: 0.22 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))',
            gap: '8px',
            marginTop: '24px',
          }}
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

        {/* Assumptions drawer trigger */}
        <div style={{ marginTop: '32px' }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              width: '100%',
              padding: '14px 20px',
              borderRadius: '12px',
              border: '1px solid var(--color-outline)',
              backgroundColor: 'var(--color-bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              color: 'var(--color-text)',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 500 }}>View all assumptions</span>
            <span style={{ fontSize: '16px', color: 'var(--color-text-muted)' }}>↑</span>
          </button>
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '40px',
            paddingTop: '28px',
            borderTop: '1px solid var(--color-outline)',
          }}
        >
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              minWidth: '160px',
              height: '52px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-btn-primary-bg)',
              color: 'var(--color-btn-primary-text)',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            {copied ? 'Link copied' : 'Share result'}
          </button>
          <button
            onClick={() => router.push('/experience')}
            style={{
              flex: 1,
              minWidth: '160px',
              height: '52px',
              borderRadius: '9999px',
              backgroundColor: 'transparent',
              color: 'var(--color-text)',
              border: '1px solid var(--color-outline-active)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              letterSpacing: '-0.01em',
            }}
          >
            Recalculate →
          </button>
        </div>

        <p
          style={{
            marginTop: '24px',
            fontSize: '11px',
            color: 'var(--color-text-faint)',
            lineHeight: 1.55,
          }}
        >
          Not financial advice. Every assumption is editable.{' '}
          <a
            href="/methodology"
            style={{
              color: 'var(--color-text-muted)',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            Read methodology
          </a>
        </p>
      </div>

      {/* Slide-up assumptions drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          style={{
            maxHeight: '75vh',
            overflowY: 'auto',
            padding: '24px 24px 40px',
            borderRadius: '20px 20px 0 0',
          }}
        >
          <SheetHeader style={{ marginBottom: '24px' }}>
            <SheetTitle style={{ fontFamily: 'var(--font-sans), system-ui, sans-serif', fontSize: '16px', fontWeight: 600 }}>
              All assumptions
            </SheetTitle>
          </SheetHeader>
          <div style={{ maxWidth: '680px' }}>
            {drawerSections.map(section => (
              <DrawerSection key={section.title} title={section.title} items={section.items} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
