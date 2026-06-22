'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import type { CalculatorInputs, SimulationResult } from '@/engine';
import type { SensitivityScenario } from '@/lib/store';
import { WealthChart } from '@/components/chart/WealthChart';
import { ReckonSignature } from '@/components/ReckonSignature';
import { fmtWealth, verdict } from '@/lib/format';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCAD(n: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

function InsightCard({ label, value, body, accentColor = 'var(--color-text)' }: { label: string; value: string; body: string; accentColor?: string }) {
  return (
    <div style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-outline)', backgroundColor: 'rgba(255,255,255,0.03)' }}>
      <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-dimmer)', marginBottom: '6px', fontWeight: 600, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{label}</p>
      <p style={{ fontSize: '15px', fontWeight: 700, color: accentColor, marginBottom: '4px', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{value}</p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.45, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{body}</p>
    </div>
  );
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

const ease = [0.0, 0.0, 0.2, 1] as [number, number, number, number];

interface Props {
  inputs: CalculatorInputs;
  result: SimulationResult;
  scenarios: SensitivityScenario[];
  shareId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function SharedResultClient({ inputs, result, scenarios, shareId }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [chartH, setChartH] = useState(340);

  useEffect(() => {
    if (window.innerWidth < 480) setChartH(260);
  }, []);

  const advantage = result.exit.netAdvantageToOwner;
  const absAdvantage = Math.abs(advantage);
  const winner = verdict(advantage);
  const ownerColor = 'var(--color-owner)';
  const renterColor = 'var(--color-renter)';
  const winnerColor = winner === 'buy' ? ownerColor : winner === 'rent' ? renterColor : 'var(--color-text-muted)';

  const countedValue = useCountUp(absAdvantage, 2200, 1100);

  const activeScenario = scenarios.find(s => s.id === 'base') ?? scenarios[0]!;

  const h = inputs.holdingPeriodYears;
  const ownerMoveYears = (() => {
    const n = inputs.ownerMoves ?? 0;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * h / (n + 1)));
  })();
  const renterMoveYears = (() => {
    const n = inputs.renterMoves ?? 0;
    return Array.from({ length: n }, (_, i) => Math.round((i + 1) * h / (n + 1)));
  })();

  const milestoneYears = Array.from(new Set(
    h >= 15 ? [5, 10, Math.round(h / 2), h]
      : h >= 10 ? [5, 10, h]
      : [Math.round(h / 2), h]
  )).filter((y): y is number => y > 0 && y <= h).sort((a, b) => a - b);

  const totalInterest = result.yearByYear.reduce((sum, y) => sum + y.ownerAnnualInterest, 0);
  const totalPropertyTax = result.yearByYear[result.yearByYear.length - 1]?.ownerCumulativePropertyTax ?? 0;
  const fiveRuleRent = result.fivePercentRule.monthlyBreakEvenRent;
  const fiveRuleGap = Math.abs(inputs.monthlyRent - fiveRuleRent);
  const downPayment = inputs.homePrice * inputs.downPaymentPct;
  const monthlyDelta = result.commitment.ownerFirstYearMonthlyCarry - inputs.monthlyRent;

  async function handleShare() {
    if (typeof window === 'undefined') return;
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

  const keyAssumptions = [
    { label: 'Home price', value: `$${Math.round(inputs.homePrice / 1000)}k` },
    { label: 'Down payment', value: `${Math.round(inputs.downPaymentPct * 100)}%` },
    { label: 'Mortgage rate', value: `${(inputs.mortgageRatePct * 100).toFixed(2)}%` },
    { label: 'Monthly rent', value: `$${Math.round(inputs.monthlyRent / 100) * 100}/mo` },
    { label: 'Home appreciation', value: `${(inputs.homeAppreciationPct * 100).toFixed(1)}%/yr` },
    { label: 'Investment return', value: `${(inputs.investmentReturnPct * 100).toFixed(1)}%/yr` },
    { label: 'Province', value: PROVINCE_NAMES[inputs.province] ?? inputs.province },
    { label: 'Time horizon', value: `${inputs.holdingPeriodYears} years` },
  ];

  return (
    <div style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{
        backgroundColor: 'var(--color-bg)',
        borderBottom: '1px solid var(--color-outline)',
        padding: '0 20px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        flexShrink: 0,
      }}>
        <ReckonSignature color="var(--color-text)" width={72} />
        <p style={{
          fontSize: '12px', color: 'var(--color-text-dimmer)', flex: 1, textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 8px',
        }}>
          Shared result. Run your own to see your number.
        </p>
        <button
          onClick={() => router.push('/experience')}
          style={{
            height: '34px', padding: '0 16px',
            backgroundColor: 'var(--color-outline)', color: 'var(--color-text)',
            border: '1px solid var(--color-outline-active)', borderRadius: '9999px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            letterSpacing: '-0.01em', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Try with my numbers
        </button>
      </div>

      {/* Dark hero */}
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
          style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-dimmer)', marginBottom: '28px', fontWeight: 500 }}
        >
          {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
        </motion.p>

        {/* Combined verdict headline */}
        <motion.h1
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease }}
          style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontSize: 'clamp(28px, 5vw, 60px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--color-text)', marginBottom: '16px', maxWidth: '760px' }}
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
            style={{ fontSize: '13px', color: 'var(--color-text-dimmer)', marginTop: '4px', marginBottom: '4px' }}
          >
            Lines cross at year {result.breakEvenYear}
          </motion.p>
        )}

        {/* Owner vs Renter final wealth split */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 1.4, ease }}
          style={{
            display: 'flex',
            gap: 0,
            marginTop: '56px',
            border: '1px solid var(--color-outline)',
            borderRadius: '16px',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '440px',
          }}
        >
          {/* Owner side */}
          <div style={{
            flex: 1, padding: '24px 20px', textAlign: 'left',
            backgroundColor: winner === 'buy' ? 'var(--color-owner-tint)' : 'transparent',
            borderRight: '1px solid var(--color-outline)',
            position: 'relative',
          }}>
            {winner === 'buy' && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                fontSize: '9px', backgroundColor: ownerColor, color: 'var(--color-btn-primary-text)',
                padding: '2px 7px', borderRadius: '4px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                WINNER
              </div>
            )}
            <p style={{ fontSize: '10px', color: ownerColor, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: '10px' }}>
              Owner
            </p>
            <p style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtWealth(result.exit.finalOwnerWealth)}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-dimmer)', marginTop: '6px', lineHeight: 1.4 }}>After exit costs</p>
          </div>

          {/* Renter side */}
          <div style={{
            flex: 1, padding: '24px 20px', textAlign: 'left',
            backgroundColor: winner === 'rent' ? 'var(--color-renter-tint)' : 'transparent',
            position: 'relative',
          }}>
            {winner === 'rent' && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                fontSize: '9px', backgroundColor: renterColor, color: 'var(--color-btn-primary-text)',
                padding: '2px 7px', borderRadius: '4px', fontWeight: 700,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                WINNER
              </div>
            )}
            <p style={{ fontSize: '10px', color: renterColor, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, marginBottom: '10px' }}>
              Renter
            </p>
            <p style={{
              fontSize: 'clamp(20px, 3.5vw, 28px)', fontWeight: 700,
              letterSpacing: '-0.03em', color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtWealth(result.exit.finalRenterWealth)}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-dimmer)', marginTop: '6px', lineHeight: 1.4 }}>After capital gains tax</p>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 3.0, ease }}
          style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <p style={{ fontSize: '12px', color: 'var(--color-text-faint)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Scroll ↓</p>
        </motion.div>
      </div>

      {/* Dark detail section */}
      <div className="dark-panel" style={{ backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text)', padding: '48px 24px 96px' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          {/* Chart */}
          <WealthChart
            key="shared-chart"
            ownerData={activeScenario.ownerData}
            renterData={activeScenario.renterData}
            breakEvenYear={result.breakEvenYear}
            holdingPeriodYears={inputs.holdingPeriodYears}
            height={chartH}
            ownerMoveYears={ownerMoveYears}
            renterMoveYears={renterMoveYears}
            yearlyBreakdown={result.yearByYear}
            ownerSubLabel={`${fmtCAD(result.commitment.ownerFirstYearMonthlyCarry)}/mo yr 1`}
            renterSubLabel={`${fmtCAD(inputs.monthlyRent)}/mo rent`}
          />

          {/* Break-even callout */}
          {result.breakEvenYear !== null && (
            <div style={{
              marginTop: '24px', padding: '14px 18px',
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-outline)',
              borderRadius: '10px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
                Owner and renter wealth lines cross at <strong style={{ color: 'var(--color-text)' }}>year {result.breakEvenYear}</strong>.
                {winner === 'rent'
                  ? ` The owner trails until then. If the holding period extends beyond year ${result.breakEvenYear}, buying becomes the stronger outcome.`
                  : ` The renter leads until then. Shorter hold periods favor renting.`}
              </span>
            </div>
          )}

          {/* Month 1 cost story */}
          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-outline)' }}>
            <div style={{ padding: '18px 20px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-owner)', marginBottom: '8px', fontWeight: 600 }}>Owner — year 1</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                {fmtCAD(result.commitment.ownerFirstYearMonthlyCarry)}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-dim)' }}>/mo</span>
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', lineHeight: 1.45 }}>Mortgage + tax + maintenance</p>
            </div>
            <div style={{ padding: '18px 20px', backgroundColor: 'rgba(255,255,255,0.03)', borderLeft: '1px solid var(--color-outline)' }}>
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-renter)', marginBottom: '8px', fontWeight: 600 }}>Renter — year 1</p>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.03em', marginBottom: '4px' }}>
                {fmtCAD(inputs.monthlyRent)}<span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--color-text-dim)' }}>/mo</span>
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', lineHeight: 1.45 }}>
                {monthlyDelta > 0
                  ? `+ ${fmtCAD(monthlyDelta)}/mo invested`
                  : `Owner spends ${fmtCAD(Math.abs(monthlyDelta))}/mo less`}
              </p>
            </div>
          </div>

          {/* Milestone timeline */}
          <div style={{ marginTop: '32px' }}>
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-dimmer)', marginBottom: '14px', fontWeight: 600 }}>Wealth at each milestone</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {milestoneYears.map(my => {
                const oSnap = activeScenario.ownerData.find(d => d.year === my);
                const rSnap = activeScenario.renterData.find(d => d.year === my);
                const oVal = oSnap?.value ?? 0;
                const rVal = rSnap?.value ?? 0;
                const diff = oVal - rVal;
                const leader = Math.abs(diff) < 500 ? 'tie' : diff > 0 ? 'owner' : 'renter';
                const leaderColor = leader === 'owner' ? 'var(--color-owner)' : leader === 'renter' ? 'var(--color-renter)' : 'var(--color-text-dim)';
                return (
                  <div key={my} style={{ flex: '1 1 calc(25% - 6px)', minWidth: '80px', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--color-outline)', backgroundColor: 'transparent' }}>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-dimmer)', marginBottom: '6px', fontWeight: 600 }}>Year {my}</p>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: leaderColor, fontVariantNumeric: 'tabular-nums', marginBottom: '2px' }}>
                      {leader === 'tie' ? 'Tied' : `${leader === 'owner' ? 'Owner' : 'Renter'} +${fmtWealth(Math.abs(diff))}`}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--color-text-dimmer)' }}>
                      O: {fmtWealth(oVal)} / R: {fmtWealth(rVal)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insight cards */}
          <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            <InsightCard
              label="5% rule"
              value={inputs.monthlyRent < fiveRuleRent ? `${fmtCAD(fiveRuleGap)}/mo below threshold` : `${fmtCAD(fiveRuleGap)}/mo above threshold`}
              body={`Break-even rent is ${fmtCAD(fiveRuleRent)}/mo. ${inputs.monthlyRent < fiveRuleRent ? 'Renting leaves more to invest.' : 'Buying starts to look better.'}`}
              accentColor={inputs.monthlyRent < fiveRuleRent ? 'var(--color-renter)' : 'var(--color-owner)'}
            />
            <InsightCard
              label="Down payment opportunity cost"
              value={fmtCAD(downPayment)}
              body={`Locked into the property from day one. A renter invests this from year one and compounds it over ${h} years.`}
              accentColor="var(--color-text)"
            />
            {result.breakEvenYear !== null ? (
              <InsightCard
                label="Break-even context"
                value={`Year ${result.breakEvenYear}`}
                body={`Hold shorter than ${result.breakEvenYear} years and renting wins. Hold longer and buying takes over.`}
                accentColor="var(--color-text)"
              />
            ) : (
              <InsightCard
                label="Total mortgage interest"
                value={fmtCAD(totalInterest)}
                body={`Paid over ${h} years. This cost builds no equity — it is the lender's return on your loan.`}
                accentColor="var(--color-text)"
              />
            )}
          </div>

          {/* Share card */}
          <div style={{ marginTop: '32px', padding: '20px 24px', border: '1px solid var(--color-outline)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-dimmer)', marginBottom: '6px' }}>reckon — {h}-year outlook, {PROVINCE_NAMES[inputs.province] ?? inputs.province}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {winner === 'tie' ? `Within ${fmtWealth(absAdvantage)} either way.` : `${winner === 'buy' ? 'Buying' : 'Renting'} comes out ${fmtWealth(absAdvantage)} ahead.`}
              </p>
              {result.breakEvenYear !== null && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-dim)', marginTop: '4px' }}>Break-even at year {result.breakEvenYear}.</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleShare}
                style={{
                  height: '36px', padding: '0 18px',
                  backgroundColor: 'var(--color-text)', color: 'var(--color-bg)',
                  border: 'none', borderRadius: '9999px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  letterSpacing: '-0.01em',
                }}
              >
                {copied ? 'Link copied' : 'Share result'}
              </button>
              <button
                onClick={() => router.push('/experience')}
                style={{
                  height: '36px', padding: '0 18px',
                  backgroundColor: 'transparent', color: 'var(--color-text-faint)',
                  border: '1px solid var(--color-outline-active)', borderRadius: '9999px',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  letterSpacing: '-0.01em',
                }}
              >
                Run my numbers
              </button>
            </div>
          </div>

          {/* Key assumptions */}
          <div style={{ marginTop: '40px', border: '1px solid var(--color-outline)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-outline)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Key assumptions
              </span>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 24px' }}>
              {keyAssumptions.map(a => (
                <div key={a.label}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-dimmer)', marginBottom: '3px' }}>{a.label}</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em', color: 'var(--color-text)' }}>{a.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA — after assumptions */}
          <div style={{ marginTop: '56px', textAlign: 'center', paddingTop: '40px', borderTop: '1px solid var(--color-outline)' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-faint)', marginBottom: '24px', letterSpacing: '-0.01em' }}>
              Every assumption above is editable. Run the numbers on your situation.
            </p>
            <button
              onClick={() => router.push('/experience')}
              style={{
                height: '56px', padding: '0 44px',
                backgroundColor: 'var(--color-text)',
                color: 'var(--color-bg)',
                border: 'none', borderRadius: '9999px',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                letterSpacing: '-0.02em',
                boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
              }}
            >
              Try with my numbers
            </button>
            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-dimmer)' }}>
              Free. No account. 3 minutes.
            </p>
            <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--color-text-dimmer)', lineHeight: 1.6 }}>
              Not financial advice. Every formula is cited.{' '}
              <a href="/methodology" style={{ color: 'var(--color-text-dim)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Read methodology
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
