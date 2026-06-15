'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import type { CalculatorInputs, SimulationResult } from '@/engine';
import type { SensitivityScenario } from '@/lib/store';
import { WealthChart } from '@/components/chart/WealthChart';

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

const SCENARIO_ORDER: SensitivityScenario['id'][] = ['base', 'growth+2', 'growth-2', 'rate+1', 'rate-1'];

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
  const [activeSensitivity, setActiveSensitivity] = useState<SensitivityScenario['id']>('base');
  const [copied, setCopied] = useState(false);
  const [chartH, setChartH] = useState(340);

  useEffect(() => {
    if (window.innerWidth < 480) setChartH(260);
  }, []);

  const advantage = result.exit.netAdvantageToOwner;
  const absAdvantage = Math.abs(advantage);
  const winner = advantage > 500 ? 'buy' : advantage < -500 ? 'rent' : 'tie';
  const ownerColor = 'var(--color-owner)';
  const renterColor = 'var(--color-renter)';
  const winnerColor = winner === 'buy' ? ownerColor : winner === 'rent' ? renterColor : 'var(--color-text-muted)';

  const verdictBadge = winner === 'buy' ? 'Buying wins' : winner === 'rent' ? 'Renting wins' : 'Too close to call';
  const verdictHeadline = winner === 'buy'
    ? 'Buying comes out ahead.'
    : winner === 'rent'
    ? 'Renting comes out ahead.'
    : 'Roughly tied.';

  const countedValue = useCountUp(absAdvantage, 2200, 1100);

  const activeScenario = scenarios.find(s => s.id === activeSensitivity) ?? scenarios[0]!;

  async function handleShare() {
    if (typeof window === 'undefined') return;
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
    <div style={{ minHeight: '100dvh', backgroundColor: '#0F0F11', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>

      {/* ─── Single header — grey, sticky ─────────────────────────────── */}
      <div style={{
        backgroundColor: '#17171B',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
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
        <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.02em', color: '#FAFAFA', flexShrink: 0 }}>
          Reckon
        </span>
        <p style={{
          fontSize: '12px', color: '#52525B', flex: 1, textAlign: 'center',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 8px',
        }}>
          Shared result — run your own to see your number
        </p>
        <button
          onClick={() => router.push('/experience')}
          style={{
            height: '34px', padding: '0 16px',
            backgroundColor: '#FAFAFA', color: '#0F0F11',
            border: 'none', borderRadius: '9999px',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            letterSpacing: '-0.01em', flexShrink: 0, whiteSpace: 'nowrap',
          }}
        >
          Try with my numbers →
        </button>
      </div>

      {/* ─── Dark hero ────────────────────────────────────────────────── */}
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
          style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3F3F46', marginBottom: '28px', fontWeight: 500 }}
        >
          {inputs.holdingPeriodYears}-year outlook — {PROVINCE_NAMES[inputs.province] ?? inputs.province}
        </motion.p>

        {/* Verdict badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.55, ease: [0.34, 1.3, 0.64, 1] }}
          style={{
            display: 'inline-flex', alignItems: 'center',
            height: '30px', padding: '0 14px',
            borderRadius: '9999px',
            border: `1px solid ${winnerColor}`,
            marginBottom: '28px',
          }}
        >
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: winnerColor }}>
            {verdictBadge}
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8, ease }}
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 'clamp(34px, 6vw, 68px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            color: '#FAFAFA',
            marginBottom: '32px',
            maxWidth: '700px',
          }}
        >
          {verdictHeadline}
        </motion.h1>

        {/* Animated advantage number */}
        {winner !== 'tie' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.0, ease }}
          >
            <p style={{
              fontSize: 'clamp(64px, 12vw, 140px)',
              fontWeight: 700,
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: winnerColor,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtWealth(countedValue)}
            </p>
          </motion.div>
        )}

        {/* "ahead after N years" */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.5, ease }}
          style={{
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: '#71717A',
            marginTop: '16px',
            letterSpacing: '-0.01em',
          }}
        >
          {winner !== 'tie'
            ? `ahead after ${inputs.holdingPeriodYears} years`
            : `Within ${fmtWealth(absAdvantage)} either way after ${inputs.holdingPeriodYears} years`}
        </motion.p>

        {result.breakEvenYear !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 1.9, ease }}
            style={{ fontSize: '13px', color: '#3F3F46', marginTop: '8px' }}
          >
            Lines cross at year {result.breakEvenYear}
          </motion.p>
        )}

        {/* ─── Owner vs Renter final wealth split ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 2.2, ease }}
          style={{
            display: 'flex',
            gap: 0,
            marginTop: '56px',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            overflow: 'hidden',
            width: '100%',
            maxWidth: '440px',
          }}
        >
          {/* Owner side */}
          <div style={{
            flex: 1, padding: '24px 20px', textAlign: 'left',
            backgroundColor: winner === 'buy' ? 'rgba(217,119,6,0.07)' : 'rgba(255,255,255,0.01)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
          }}>
            {winner === 'buy' && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                fontSize: '9px', backgroundColor: ownerColor, color: '#000',
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
              letterSpacing: '-0.03em', color: '#FAFAFA', fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtWealth(result.exit.finalOwnerWealth)}
            </p>
            <p style={{ fontSize: '11px', color: '#3F3F46', marginTop: '6px', lineHeight: 1.4 }}>After exit costs</p>
          </div>

          {/* Renter side */}
          <div style={{
            flex: 1, padding: '24px 20px', textAlign: 'left',
            backgroundColor: winner === 'rent' ? 'rgba(20,184,166,0.07)' : 'rgba(255,255,255,0.01)',
            position: 'relative',
          }}>
            {winner === 'rent' && (
              <div style={{
                position: 'absolute', top: '10px', right: '10px',
                fontSize: '9px', backgroundColor: renterColor, color: '#000',
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
              letterSpacing: '-0.03em', color: '#FAFAFA', fontVariantNumeric: 'tabular-nums',
            }}>
              {fmtWealth(result.exit.finalRenterWealth)}
            </p>
            <p style={{ fontSize: '11px', color: '#3F3F46', marginTop: '6px', lineHeight: 1.4 }}>After capital gains tax</p>
          </div>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 3.0, ease }}
          style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <p style={{ fontSize: '11px', color: '#3F3F46', letterSpacing: '0.04em' }}>Scroll for full analysis</p>
        </motion.div>
      </div>

      {/* ─── Light detail section ─────────────────────────────────────── */}
      <div style={{
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-outline)',
        color: 'var(--color-text)',
        padding: '48px 24px 96px',
      }}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>

          {/* Chart */}
          <WealthChart
            key={activeSensitivity}
            ownerData={activeScenario.ownerData}
            renterData={activeScenario.renterData}
            breakEvenYear={result.breakEvenYear}
            holdingPeriodYears={inputs.holdingPeriodYears}
            height={chartH}
          />

          {/* Sensitivity pills */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
            {SCENARIO_ORDER.map(id => {
              const scenario = scenarios.find(s => s.id === id);
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

          {/* Break-even callout */}
          {result.breakEvenYear !== null && (
            <div style={{
              marginTop: '24px', padding: '14px 18px',
              backgroundColor: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-outline)',
              borderRadius: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Owner and renter wealth lines cross at <strong style={{ color: 'var(--color-text)' }}>year {result.breakEvenYear}</strong>.
                {winner === 'rent'
                  ? ` The owner trails until then. If the holding period extends beyond year ${result.breakEvenYear}, buying becomes the stronger outcome.`
                  : ` The renter leads until then. Shorter hold periods favor renting.`}
              </span>
            </div>
          )}

          {/* Assumptions */}
          <div style={{ marginTop: '40px', border: '1px solid var(--color-outline)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-outline)', backgroundColor: 'var(--color-bg-subtle)' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Key assumptions
              </span>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px 24px' }}>
              {keyAssumptions.map(a => (
                <div key={a.label}>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-faint)', marginBottom: '3px' }}>{a.label}</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>{a.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Share row */}
          <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
            <button
              onClick={handleShare}
              style={{
                height: '40px', padding: '0 20px',
                backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                border: '1px solid var(--color-outline)', borderRadius: '9999px',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {copied ? 'Link copied' : 'Share this result'}
            </button>
          </div>

          {/* Bottom CTA */}
          <div style={{ marginTop: '56px', textAlign: 'center', paddingTop: '40px', borderTop: '1px solid var(--color-outline)' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '24px', letterSpacing: '-0.01em' }}>
              Every assumption above is editable. Run the numbers on your situation.
            </p>
            <button
              onClick={() => router.push('/experience')}
              style={{
                height: '56px', padding: '0 44px',
                backgroundColor: 'var(--color-btn-primary-bg)',
                color: 'var(--color-btn-primary-text)',
                border: 'none', borderRadius: '9999px',
                fontSize: '16px', fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                letterSpacing: '-0.02em',
                boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
              }}
            >
              Try with my numbers →
            </button>
            <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-faint)' }}>
              Free. No account. 3 minutes.
            </p>
            <p style={{ marginTop: '20px', fontSize: '11px', color: 'var(--color-text-faint)', lineHeight: 1.6 }}>
              Not financial advice. Every formula is cited.{' '}
              <a href="/methodology" style={{ color: 'var(--color-text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Read methodology
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
