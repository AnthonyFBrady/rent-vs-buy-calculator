'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useCalculatorStore } from '@/lib/store';
import type { SensitivityScenario } from '@/lib/store';
import { encodeShare } from '@/lib/share';
import { WealthChart } from '@/components/chart/WealthChart';
import { MetricCard } from '@/components/MetricCard';

function fmtWealth(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

const SCENARIO_ORDER: SensitivityScenario['id'][] = ['base', 'growth+2', 'growth-2', 'rate+1', 'rate-1'];

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick',
  NL: 'Newfoundland', PE: 'Prince Edward Island',
};

export default function ResultPage() {
  const router = useRouter();
  const { result, inputs, sensitivity, activeSensitivity, setActiveSensitivity } = useCalculatorStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!result || !inputs) {
      router.replace('/experience');
    }
  }, [result, inputs, router]);

  if (!result || !inputs || sensitivity.length === 0) return null;

  const activeScenario = sensitivity.find(s => s.id === activeSensitivity) ?? sensitivity[0]!;
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

  const keyAssumptions = [
    { label: 'Home price',       value: `$${Math.round(inputs.homePrice / 1000)}k` },
    { label: 'Down payment',     value: `${Math.round(inputs.downPaymentPct * 100)}%` },
    { label: 'Mortgage rate',    value: `${(inputs.mortgageRatePct * 100).toFixed(2)}%` },
    { label: 'Monthly rent',     value: `$${Math.round(inputs.monthlyRent / 100) * 100}/mo` },
    { label: 'Home appreciation',value: `${(inputs.homeAppreciationPct * 100).toFixed(1)}%/yr` },
    { label: 'Investment return',value: `${(inputs.investmentReturnPct * 100).toFixed(1)}%/yr` },
    { label: 'Province',         value: PROVINCE_NAMES[inputs.province] ?? inputs.province },
    { label: 'Time horizon',     value: `${inputs.holdingPeriodYears} years` },
    ...(inputs.monthlyRentalIncome && inputs.monthlyRentalIncome > 0
      ? [{ label: 'Suite income', value: `$${inputs.monthlyRentalIncome}/mo` }]
      : []),
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
          style={{ paddingTop: '52px', paddingBottom: '44px' }}
        >
          <p
            style={{
              fontSize: '12px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-text-faint)',
              marginBottom: '16px',
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
              marginBottom: '14px',
            }}
          >
            {verdictLine}
          </h1>
          <p
            style={{
              fontSize: 'clamp(20px, 3.5vw, 34px)',
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
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '10px' }}>
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
            key={activeSensitivity}
            ownerData={activeScenario.ownerData}
            renterData={activeScenario.renterData}
            breakEvenYear={result.breakEvenYear}
            holdingPeriodYears={inputs.holdingPeriodYears}
            height={typeof window !== 'undefined' && window.innerWidth < 480 ? 260 : 340}
          />
        </motion.div>

        {/* Chart legend / context */}
        <div
          style={{
            display: 'flex',
            gap: '20px',
            marginTop: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--color-owner)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Owner — equity + portfolio
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '24px', height: '2px', backgroundColor: 'var(--color-renter)' }} />
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Renter — portfolio + RRSP
            </span>
          </div>
        </div>

        {/* Sensitivity pills */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '20px',
          }}
        >
          {SCENARIO_ORDER.map(id => {
            const scenario = sensitivity.find(s => s.id === id);
            if (!scenario) return null;
            const isActive = activeSensitivity === id;
            return (
              <button
                key={id}
                onClick={() => setActiveSensitivity(id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  border: `1px solid ${isActive ? 'var(--color-text)' : 'var(--color-outline)'}`,
                  backgroundColor: isActive ? 'var(--color-text)' : 'transparent',
                  color: isActive ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {scenario.label}
              </button>
            );
          })}
        </div>

        {/* Metric cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1], delay: 0.22 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(172px, 1fr))',
            gap: '10px',
            marginTop: '36px',
          }}
        >
          <MetricCard
            label="Net advantage"
            value={fmtWealth(Math.abs(advantage))}
            subvalue={winner === 'buy' ? 'Owner ahead' : winner === 'rent' ? 'Renter ahead' : 'Tied'}
            accentColor={winnerColor}
          />
          <MetricCard
            label="Break-even year"
            value={result.breakEvenYear !== null ? `Yr ${result.breakEvenYear}` : 'Never'}
            subvalue={result.breakEvenYear !== null ? 'Owner catches up' : 'Renter stays ahead'}
          />
          <MetricCard
            label="Final owner wealth"
            value={fmtWealth(result.exit.finalOwnerWealth)}
            subvalue="After exit costs"
            accentColor="var(--color-owner)"
          />
          <MetricCard
            label="Final renter wealth"
            value={fmtWealth(result.exit.finalRenterWealth)}
            subvalue="After capital gains tax"
            accentColor="var(--color-renter)"
          />
        </motion.div>

        {/* Assumptions accordion */}
        <AssumptionsAccordion assumptions={keyAssumptions} />

        {/* Footer CTA */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '48px',
            paddingTop: '32px',
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
    </div>
  );
}

function AssumptionsAccordion({ assumptions }: { assumptions: { label: string; value: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        marginTop: '36px',
        border: '1px solid var(--color-outline)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Key assumptions</span>
        <span
          style={{
            fontSize: '12px',
            color: 'var(--color-text-muted)',
            transition: 'transform 0.2s',
            display: 'inline-block',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          ↓
        </span>
      </button>
      {open && (
        <div
          style={{
            borderTop: '1px solid var(--color-outline)',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '12px 24px',
          }}
        >
          {assumptions.map(a => (
            <div key={a.label}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '2px' }}>
                {a.label}
              </p>
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                {a.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
