'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { HomeLoader } from './HomeLoader';
import { ReckonSignature } from '@/components/ReckonSignature';

// ─── Count-up hook ────────────────────────────────────────────────────────────

function useCountUp(target: number, durationMs: number, delayMs: number): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    setVal(0);
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

// ─── City dot grid (beat 7) ───────────────────────────────────────────────────

function CityDotGrid({ visible }: { visible: boolean }) {
  const dots: ('renter' | 'owner')[] = [
    'renter','renter','renter','renter',
    'renter','renter','renter','owner',
    'owner','owner','owner','owner',
  ];
  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 14px)', gap: '10px', marginBottom: '12px' }}>
        {dots.map((type, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ delay: i * 0.07, duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
            style={{
              width: '14px', height: '14px', borderRadius: '50%',
              backgroundColor: type === 'renter' ? 'var(--color-renter)' : 'var(--color-owner)',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: '11px', color: '#A1A1AA', lineHeight: 1.5 }}>
        <span style={{ color: 'var(--color-renter)', fontWeight: 600 }}>7 cities</span>
        {' renter ahead  ·  '}
        <span style={{ color: 'var(--color-owner)', fontWeight: 600 }}>5 cities</span>
        {' owner ahead'}
      </p>
    </div>
  );
}

// ─── Story beats ──────────────────────────────────────────────────────────────

type StatType = { raw: number; label: string; fmt: 'dollars-k' | 'dollars-m' | 'dollars-k-yr' } | null;

interface Beat {
  eyebrow: string;
  headline: string;
  body: string;
  source?: string;
  stat: StatType;
  statAccent?: 'owner' | 'renter';
  visual: 'cityGrid' | null;
  pauseMs: number;
}

const BEATS: Beat[] = [
  {
    eyebrow: 'The belief',
    headline: 'Most Canadians believe owning a home is the best financial decision they can make.',
    body: 'It is handed down like received wisdom — from parents, from brokers, from headlines. It has rarely been seriously questioned.',
    stat: null, visual: null, pauseMs: 2200,
  },
  {
    eyebrow: 'The market',
    headline: 'The average Canadian home costs $716,000.',
    body: 'Toronto: $1.1M. Vancouver: $1.2M. Even mid-sized cities have seen prices double in a decade.',
    source: 'CREA, February 2025',
    stat: { raw: 716000, label: 'Average Canadian home price', fmt: 'dollars-k' },
    statAccent: 'owner', visual: null, pauseMs: 2800,
  },
  {
    eyebrow: 'The entry cost',
    headline: "At 20% down, that's $143,000 before you move in.",
    body: 'Before closing costs, land transfer tax, legal fees, and moving expenses. Most Canadians do not have it in liquid savings.',
    stat: { raw: 143000, label: 'Minimum 20% down payment', fmt: 'dollars-k' },
    statAccent: 'owner', visual: null, pauseMs: 2800,
  },
  {
    eyebrow: 'The hidden cost',
    headline: 'But the mortgage payment is not the full story.',
    body: 'Property tax, maintenance, and insurance are unrecoverable. They build no equity. They leave every year and do not come back.',
    stat: null, visual: null, pauseMs: 2200,
  },
  {
    eyebrow: 'The 5% rule',
    headline: "Ben Felix quantified it: 5% of the home's value, every year, gone.",
    body: 'On a $1M home, that is $50,000 per year in unrecoverable costs. Property tax alone in Toronto runs $6,000–$9,000 annually.',
    source: 'PWL Capital, 2023',
    stat: { raw: 50000, label: 'Annual unrecoverable cost on a $1M home', fmt: 'dollars-k-yr' },
    statAccent: 'owner', visual: null, pauseMs: 2800,
  },
  {
    eyebrow: 'The other side',
    headline: "That $143,000 does not disappear for a renter. They invest it.",
    body: 'The down payment goes into a diversified portfolio instead. Then the annual cash-flow savings go in on top, every year.',
    stat: null, visual: null, pauseMs: 2200,
  },
  {
    eyebrow: 'The number',
    headline: 'At the Canadian blended index return, it becomes over $1M in 25 years.',
    body: 'The 20-year nominal return on a blended Canadian index was 8.19%. The invested down payment compounds the entire time.',
    source: 'Rational Reminder ep. 323, September 2024 — 8.19% nominal, 2005–2024',
    stat: { raw: 1_000_000, label: 'Invested down payment after 25 years', fmt: 'dollars-m' },
    statAccent: 'renter', visual: null, pauseMs: 2800,
  },
  {
    eyebrow: 'The research',
    headline: 'Renters came out ahead in 7 of 12 Canadian cities over 20 years.',
    body: 'Owners won in 5. The margin was rarely large. Savings discipline, home type, mortgage rate, and tax shelters shifted the outcome more than expected.',
    source: 'PWL Capital, 2024 — 12-city Canadian study, 20-year hold',
    stat: null, visual: 'cityGrid', pauseMs: 3200,
  },
  {
    eyebrow: 'The ownership case',
    headline: 'Owners won in 5 cities. And ownership has real advantages.',
    body: 'The Principal Residence Exemption shields your entire home gain from capital gains tax. No investment account matches that. Leverage and forced savings also matter.',
    stat: null, visual: null, pauseMs: 2200,
  },
  {
    eyebrow: 'The variable',
    headline: 'Savings discipline, mortgage rate, and tax shelters shifted the outcome more than prices.',
    body: 'A renter with 80% savings discipline and no TFSA often loses to the owner. A renter with full TFSA and FHSA use often wins by a wide margin.',
    stat: null, visual: null, pauseMs: 2200,
  },
  {
    eyebrow: 'Why Reckon',
    headline: 'The explicit costs of renting are obvious. The implicit costs of owning are not.',
    body: 'We built Reckon to make both visible. Every assumption editable. Every formula cited. Canadian tax code built in — LTT, CMHC, PRE, TFSA, FHSA, RRSP.',
    stat: null, visual: null, pauseMs: 800,
  },
];

const TOTAL_BEATS = BEATS.length;

// ─── Typewriter ───────────────────────────────────────────────────────────────

function TypewriterText({ text, onComplete, speed = 38 }: { text: string; onComplete: () => void; speed?: number }) {
  const [idx, setIdx] = useState(0);
  const cb = useRef(onComplete);
  cb.current = onComplete;

  useEffect(() => { setIdx(0); }, [text]);
  useEffect(() => {
    if (idx >= text.length) { cb.current(); return; }
    const t = setTimeout(() => setIdx(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [idx, text.length, speed]);

  return (
    <span>
      {text.slice(0, idx)}
      {idx < text.length && <span className="cursor-blink" aria-hidden>|</span>}
    </span>
  );
}

// ─── Stat count-up ────────────────────────────────────────────────────────────

function StatDisplay({ stat, accent, visible }: { stat: NonNullable<StatType>; accent: 'owner' | 'renter'; visible: boolean }) {
  const counted = useCountUp(visible ? stat.raw : 0, 1800, 300);

  function fmt(n: number) {
    if (stat.fmt === 'dollars-m') return `$${(n / 1_000_000).toFixed(n >= 990_000 ? 1 : 2)}M${n >= 990_000 ? '+' : ''}`;
    if (stat.fmt === 'dollars-k-yr') return `$${Math.round(n / 1000)}k/yr`;
    return `$${Math.round(n / 1000)}k`;
  }

  const accentColor = accent === 'owner' ? 'var(--color-owner)' : 'var(--color-renter)';

  return (
    <div style={{ flexShrink: 0, textAlign: 'right' }}>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.5, ease: [0.0, 0.0, 0.2, 1] }}
        style={{
          fontSize: 'clamp(44px, 6vw, 72px)', fontWeight: 700,
          letterSpacing: '-0.05em', lineHeight: 1,
          color: accentColor, fontVariantNumeric: 'tabular-nums',
        }}
      >
        {fmt(counted)}
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={visible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
        style={{ fontSize: '11px', color: '#A1A1AA', marginTop: '6px', maxWidth: '160px', lineHeight: 1.4, marginLeft: 'auto' }}
      >
        {stat.label}
      </motion.p>
    </div>
  );
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, eyebrow, children }: {
  open: boolean; onClose: () => void; title: string; eyebrow: string; children: React.ReactNode;
}) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 50 }}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320, mass: 0.9 }}
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              maxHeight: '82vh', backgroundColor: 'var(--color-bg)',
              borderRadius: '16px 16px 0 0', zIndex: 51,
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -8px 48px rgba(0,0,0,0.24)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px', flexShrink: 0 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '9999px', backgroundColor: 'var(--color-outline-active)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '2px' }}>{eyebrow}</p>
                <p style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--color-text)', fontFamily: 'var(--font-serif), Georgia, serif' }}>{title}</p>
              </div>
              <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', flex: 1, padding: '0 20px 40px' }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeLanding() {
  const router = useRouter();
  const [loaderDone, setLoaderDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'out' | 'cta'>('typing');
  const [beatVisible, setBeatVisible] = useState(true);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('reckon_loaded')) {
      setLoaderDone(true);
    }
  }, []);

  const handleLoaderComplete = useCallback(() => setLoaderDone(true), []);

  const handleNavigate = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => router.push('/experience'), 300);
  }, [router]);

  const advanceBeat = useCallback(() => {
    const next = currentBeat + 1;
    if (next >= TOTAL_BEATS) {
      setBeatVisible(false);
      setTimeout(() => setPhase('cta'), 280);
      return;
    }
    setPhase('out');
    setBeatVisible(false);
    setTimeout(() => {
      setCurrentBeat(next);
      setBeatVisible(true);
      setPhase('typing');
    }, 320);
  }, [currentBeat]);

  const handleTypingComplete = useCallback(() => setPhase('holding'), []);

  useEffect(() => {
    if (phase !== 'holding') return;
    const beat = BEATS[currentBeat];
    if (!beat) return;
    const t = setTimeout(advanceBeat, beat.pauseMs);
    return () => clearTimeout(t);
  }, [phase, currentBeat, advanceBeat]);

  const handleStoryClick = useCallback(() => {
    if (phase === 'cta') return;
    advanceBeat();
  }, [phase, advanceBeat]);

  const beat = BEATS[currentBeat];
  const isCta = phase === 'cta';
  const isLastBeat = currentBeat === TOTAL_BEATS - 1;
  const bodyVisible = phase !== 'typing' && !isCta;
  const progress = (currentBeat + 1) / TOTAL_BEATS;

  return (
    <>
      {!loaderDone && <HomeLoader onComplete={handleLoaderComplete} />}

      {loaderDone && (
        <motion.div
          animate={{ x: isExiting ? -80 : 0, opacity: isExiting ? 0 : 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 1, 1] }}
          style={{
            minHeight: '100dvh', backgroundColor: '#0F0F11',
            color: '#FAFAFA', fontFamily: 'var(--font-sans), system-ui, sans-serif',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Nav */}
          <nav style={{
            height: '52px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position: 'sticky', top: 0, backgroundColor: '#0F0F11',
            zIndex: 20, flexShrink: 0,
          }}>
            <ReckonSignature color="#FAFAFA" width={72} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => setMethodologyOpen(true)} style={{ fontSize: '13px', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.12)' }}>
                How this works
              </button>
              <button onClick={() => setFaqOpen(true)} style={{ fontSize: '13px', color: '#A1A1AA', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.12)' }}>
                FAQ
              </button>
              <button onClick={handleNavigate} style={{ height: '34px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', backgroundColor: '#FAFAFA', color: '#0F0F11', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, letterSpacing: '-0.01em', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                Calculator →
              </button>
            </div>
          </nav>

          {/* Story area */}
          <div
            onClick={handleStoryClick}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', cursor: isCta ? 'default' : 'pointer', userSelect: 'none' }}
          >
            <AnimatePresence mode="wait">
              {!isCta && beat && (
                <motion.div
                  key={currentBeat}
                  animate={{ opacity: beatVisible ? 1 : 0, y: beatVisible ? 0 : -10 }}
                  transition={{ duration: 0.3, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    padding: 'clamp(32px, 6vw, 80px) clamp(24px, 8vw, 120px)',
                    maxWidth: '900px', width: '100%', margin: '0 auto',
                    boxSizing: 'border-box', minHeight: 0,
                  }}
                >
                  <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '20px', fontWeight: 500 }}>
                    {beat.eyebrow}
                  </p>

                  <h1 style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(24px, 4vw, 48px)',
                    fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
                    color: '#FAFAFA', marginBottom: '28px', minHeight: '1.1em',
                  }}>
                    {phase === 'typing' ? (
                      <TypewriterText key={currentBeat} text={beat.headline} onComplete={handleTypingComplete} />
                    ) : beat.headline}
                  </h1>

                  <AnimatePresence>
                    {bodyVisible && (
                      <motion.div
                        key={`body-${currentBeat}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.0, 0.0, 0.2, 1] }}
                        style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div style={{ flex: '1 1 300px' }}>
                          <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: '#D4D4D8', lineHeight: 1.65, letterSpacing: '-0.01em', marginBottom: beat.source ? '12px' : 0 }}>
                            {beat.body}
                          </p>
                          {beat.source && (
                            <p style={{ fontSize: '11px', color: '#A1A1AA', fontStyle: 'italic' }}>{beat.source}</p>
                          )}
                          {beat.visual === 'cityGrid' && <CityDotGrid visible={bodyVisible} />}
                        </div>

                        {beat.stat && (
                          <StatDisplay stat={beat.stat} accent={beat.statAccent ?? 'owner'} visible={bodyVisible} />
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {isCta && (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center',
                    textAlign: 'center', padding: 'clamp(32px, 6vw, 80px) 24px',
                  }}
                >
                  <div style={{ marginBottom: '28px' }}>
                    <ReckonSignature color="#71717A" width={64} />
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(32px, 6vw, 68px)',
                    fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05,
                    color: '#FAFAFA', marginBottom: '40px', maxWidth: '600px',
                  }}>
                    Know your number.
                  </h2>
                  <button
                    onClick={handleNavigate}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      height: '60px', padding: '0 44px',
                      backgroundColor: '#FAFAFA', color: '#0F0F11',
                      borderRadius: '9999px', fontSize: '17px', fontWeight: 600,
                      letterSpacing: '-0.02em', border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      boxShadow: '0 4px 24px rgba(255,255,255,0.08)',
                    }}
                  >
                    Start the calculator →
                  </button>
                  <p style={{ marginTop: '16px', fontSize: '12px', color: '#A1A1AA' }}>
                    Free. No account. 3 minutes.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skip — solid gold pill */}
            <AnimatePresence>
              {!isCta && !isLastBeat && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1.0, duration: 0.4 }}
                  style={{ position: 'absolute', bottom: '48px', right: '24px', zIndex: 10 }}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={handleNavigate}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      height: '36px', padding: '0 16px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-owner)',
                      color: '#0F0F11', fontSize: '13px', fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                    }}
                  >
                    Just show me my number →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar */}
            {!isCta && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{ height: '100%', backgroundColor: 'var(--color-owner)', opacity: 0.7 }}
                />
              </div>
            )}
          </div>

          <BottomSheet open={methodologyOpen} onClose={() => setMethodologyOpen(false)} eyebrow="Methodology" title="How this calculator thinks">
            <MethodologyContent />
          </BottomSheet>
          <BottomSheet open={faqOpen} onClose={() => setFaqOpen(false)} eyebrow="FAQ" title="Frequently asked questions">
            <FaqContent />
          </BottomSheet>
        </motion.div>
      )}
    </>
  );
}


