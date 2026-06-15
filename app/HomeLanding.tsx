'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { HomeLoader } from './HomeLoader';

// ─── Story beats ────────────────────────────────────────────────────────────

interface Beat {
  eyebrow: string;
  headline: string;
  body: string;
  source?: string;
  stat?: { value: string; label: string; accent: 'owner' | 'renter' };
  pauseMs: number;
}

const BEATS: Beat[] = [
  {
    eyebrow: 'The belief',
    headline: 'Owning a home is the best financial decision you can make.',
    body: 'For most Canadians, this has never been seriously questioned. It is handed down like received wisdom — from parents, from brokers, from headlines.',
    pauseMs: 1200,
  },
  {
    eyebrow: 'The Canadian market',
    headline: 'The average Canadian home now costs $716,000.',
    body: 'Toronto: $1.1M. Vancouver: $1.2M. A 20% down payment alone exceeds most Canadians\' entire liquid savings — before closing costs are added.',
    source: 'CREA, February 2025',
    stat: { value: '$143k', label: 'Minimum down payment, average Canadian home', accent: 'owner' },
    pauseMs: 1400,
  },
  {
    eyebrow: 'What owning actually costs',
    headline: 'The mortgage payment is not the full story.',
    body: 'Property tax, maintenance, and insurance are unrecoverable. Ben Felix quantified the total unrecoverable annual cost of owning at roughly 5% of the home\'s value. On a $1M home, that is $50,000 per year leaving your pocket — building no equity.',
    source: 'PWL Capital, 2023',
    stat: { value: '5%', label: 'Annual unrecoverable cost of owning', accent: 'owner' },
    pauseMs: 1400,
  },
  {
    eyebrow: 'The renter\'s invisible wealth',
    headline: 'A renter does not lose that $143,000. They invest it.',
    body: 'At the Canadian blended index return from 2005–2024, that down payment grows to over $1M over 25 years — before counting the annual cash-flow savings invested every year on top.',
    source: 'Rational Reminder ep. 323, September 2024 — 8.19% nominal return',
    stat: { value: '$1M+', label: 'Invested down payment after 25 years', accent: 'renter' },
    pauseMs: 1400,
  },
  {
    eyebrow: 'The ownership case',
    headline: 'But ownership wins sometimes too.',
    body: 'The Principal Residence Exemption shields your entire home gain from capital gains tax — no investment account can match that. Forced savings, leverage on an appreciating asset, and rising rents all move the needle toward buying.',
    pauseMs: 1200,
  },
  {
    eyebrow: 'The research',
    headline: 'Renters came out ahead in 7 of 12 Canadian cities over 20 years.',
    body: 'Owners won in 5. The margin was rarely large. Savings discipline, mortgage rate, home type, and tax shelters shifted the outcome more than people expected.',
    source: 'PWL Capital, 2024 — 12-city Canadian study, 20-year hold, standard assumptions',
    stat: { value: '7 of 12', label: 'Cities where renters won over 20 years', accent: 'renter' },
    pauseMs: 1400,
  },
  {
    eyebrow: 'Why Reckon exists',
    headline: 'The explicit costs of renting are obvious. The implicit costs of owning are not.',
    body: 'We built Reckon to make both visible. Every assumption editable. Every formula cited. Canadian tax code built in — LTT, CMHC, PRE, TFSA, FHSA, RRSP.',
    pauseMs: 800,
  },
];

const TOTAL_BEATS = BEATS.length;

// ─── Typewriter component ────────────────────────────────────────────────────

function TypewriterText({
  text,
  onComplete,
  speed = 28,
}: {
  text: string;
  onComplete: () => void;
  speed?: number;
}) {
  const [idx, setIdx] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setIdx(0);
  }, [text]);

  useEffect(() => {
    if (idx >= text.length) {
      onCompleteRef.current();
      return;
    }
    const t = setTimeout(() => setIdx(i => i + 1), speed);
    return () => clearTimeout(t);
  }, [idx, text.length, speed]);

  return (
    <span>
      {text.slice(0, idx)}
      {idx < text.length && <span className="cursor-blink" aria-hidden="true">|</span>}
    </span>
  );
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────

function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 50 }}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 12px', borderBottom: '1px solid var(--color-outline)', flexShrink: 0 }}>
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

// ─── Main component ──────────────────────────────────────────────────────────

export function HomeLanding() {
  const [loaderDone, setLoaderDone] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  // phase: waiting for typing to finish | holding after type | transitioning between beats | cta shown
  const [phase, setPhase] = useState<'typing' | 'holding' | 'out' | 'cta'>('typing');
  const [beatVisible, setBeatVisible] = useState(true);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  // Check sessionStorage on mount — skip loader if already visited this session
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('reckon_loaded')) {
      setLoaderDone(true);
    }
  }, []);

  const handleLoaderComplete = useCallback(() => {
    setLoaderDone(true);
  }, []);

  // Advance to next beat
  const advanceBeat = useCallback(() => {
    const next = currentBeat + 1;
    if (next >= TOTAL_BEATS) {
      // Story complete — show CTA
      setBeatVisible(false);
      setTimeout(() => {
        setPhase('cta');
        setCtaVisible(true);
      }, 280);
      return;
    }
    setPhase('out');
    setBeatVisible(false);
    setTimeout(() => {
      setCurrentBeat(next);
      setBeatVisible(true);
      setPhase('typing');
    }, 300);
  }, [currentBeat]);

  // Called when typewriter finishes
  const handleTypingComplete = useCallback(() => {
    setPhase('holding');
  }, []);

  // Auto-advance after hold period
  useEffect(() => {
    if (phase !== 'holding') return;
    const beat = BEATS[currentBeat];
    if (!beat) return;
    const t = setTimeout(advanceBeat, beat.pauseMs);
    return () => clearTimeout(t);
  }, [phase, currentBeat, advanceBeat]);

  // Click to advance immediately
  const handleStoryClick = useCallback(() => {
    if (phase === 'cta') return;
    advanceBeat();
  }, [phase, advanceBeat]);

  const beat = BEATS[currentBeat];
  const isCta = phase === 'cta';
  const isLastBeat = currentBeat === TOTAL_BEATS - 1;
  const progress = (currentBeat + 1) / TOTAL_BEATS;

  return (
    <>
      {/* Loading screen — shown on first session visit */}
      {!loaderDone && <HomeLoader onComplete={handleLoaderComplete} />}

      {loaderDone && (
        <div
          style={{
            minHeight: '100dvh',
            backgroundColor: '#0F0F11',
            color: '#FAFAFA',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Nav — unchanged */}
          <nav
            style={{
              height: '52px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              position: 'sticky',
              top: 0,
              backgroundColor: '#0F0F11',
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '-0.02em', color: '#FAFAFA' }}>
              Reckon
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={() => setMethodologyOpen(true)}
                style={{ fontSize: '13px', color: '#71717A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.12)' }}
              >
                How this works
              </button>
              <button
                onClick={() => setFaqOpen(true)}
                style={{ fontSize: '13px', color: '#71717A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'rgba(255,255,255,0.12)' }}
              >
                FAQ
              </button>
              <Link
                href="/experience"
                style={{ height: '34px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', backgroundColor: '#FAFAFA', color: '#0F0F11', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', letterSpacing: '-0.01em' }}
              >
                Calculator →
              </Link>
            </div>
          </nav>

          {/* Story / CTA — full remaining height */}
          <div
            onClick={handleStoryClick}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              cursor: isCta ? 'default' : 'pointer',
              userSelect: 'none',
            }}
          >
            <AnimatePresence mode="wait">
              {!isCta && beat && (
                <motion.div
                  key={currentBeat}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: beatVisible ? 1 : 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: 'clamp(32px, 6vw, 80px) clamp(24px, 8vw, 120px)',
                    maxWidth: '900px',
                    width: '100%',
                    margin: '0 auto',
                    boxSizing: 'border-box',
                    minHeight: 0,
                  }}
                >
                  {/* Eyebrow */}
                  <p style={{
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#52525B',
                    marginBottom: '20px',
                    fontWeight: 500,
                  }}>
                    {beat.eyebrow}
                  </p>

                  {/* Headline — typed */}
                  <h1 style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(26px, 4.5vw, 52px)',
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1.1,
                    color: '#FAFAFA',
                    marginBottom: '28px',
                    minHeight: '1.1em',
                  }}>
                    {phase === 'typing' ? (
                      <TypewriterText
                        key={currentBeat}
                        text={beat.headline}
                        onComplete={handleTypingComplete}
                      />
                    ) : beat.headline}
                  </h1>

                  {/* Body + stat — fade in after headline done */}
                  <AnimatePresence>
                    {phase !== 'typing' && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
                        style={{ display: 'flex', gap: '48px', alignItems: 'flex-start', flexWrap: 'wrap' }}
                      >
                        <div style={{ flex: '1 1 320px' }}>
                          <p style={{
                            fontSize: 'clamp(15px, 1.8vw, 18px)',
                            color: '#A1A1AA',
                            lineHeight: 1.65,
                            letterSpacing: '-0.01em',
                            marginBottom: beat.source ? '12px' : 0,
                          }}>
                            {beat.body}
                          </p>
                          {beat.source && (
                            <p style={{ fontSize: '11px', color: '#3F3F46', fontStyle: 'italic' }}>
                              {beat.source}
                            </p>
                          )}
                        </div>

                        {beat.stat && (
                          <div style={{ flexShrink: 0, textAlign: 'right' }}>
                            <p style={{
                              fontSize: 'clamp(40px, 5vw, 64px)',
                              fontWeight: 700,
                              letterSpacing: '-0.04em',
                              lineHeight: 1,
                              color: beat.stat.accent === 'owner' ? 'var(--color-owner)' : 'var(--color-renter)',
                              fontVariantNumeric: 'tabular-nums',
                              fontFamily: 'var(--font-sans), system-ui, sans-serif',
                            }}>
                              {beat.stat.value}
                            </p>
                            <p style={{ fontSize: '11px', color: '#52525B', marginTop: '6px', maxWidth: '160px', lineHeight: 1.4, marginLeft: 'auto' }}>
                              {beat.stat.label}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* CTA beat */}
              {isCta && (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 'clamp(32px, 6vw, 80px) 24px',
                  }}
                >
                  <p style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525B', marginBottom: '24px', fontWeight: 500 }}>
                    Reckon
                  </p>
                  <h2 style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(32px, 6vw, 68px)',
                    fontWeight: 700,
                    letterSpacing: '-0.04em',
                    lineHeight: 1.05,
                    color: '#FAFAFA',
                    marginBottom: '40px',
                    maxWidth: '640px',
                  }}>
                    Know your number.
                  </h2>
                  <Link
                    href="/experience"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '60px',
                      padding: '0 40px',
                      backgroundColor: '#FAFAFA',
                      color: '#0F0F11',
                      borderRadius: '9999px',
                      fontSize: '17px',
                      fontWeight: 600,
                      textDecoration: 'none',
                      letterSpacing: '-0.02em',
                      boxShadow: '0 4px 24px rgba(255,255,255,0.08)',
                    }}
                  >
                    Start the calculator →
                  </Link>
                  <p style={{ marginTop: '16px', fontSize: '12px', color: '#3F3F46' }}>
                    Free. No account. 3 minutes.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Skip button — visible on beats 0–5 */}
            <AnimatePresence>
              {!isCta && !isLastBeat && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.8, duration: 0.3 }}
                  style={{
                    position: 'absolute',
                    bottom: '48px',
                    right: '24px',
                    zIndex: 10,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <Link
                    href="/experience"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '32px',
                      padding: '0 14px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: '#52525B',
                      fontSize: '12px',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      letterSpacing: '-0.01em',
                      backgroundColor: 'transparent',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Just show me my number →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Progress bar — bottom */}
            {!isCta && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  flexShrink: 0,
                }}
              >
                <motion.div
                  animate={{ width: `${progress * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{
                    height: '100%',
                    backgroundColor: 'var(--color-owner)',
                    opacity: 0.7,
                  }}
                />
              </div>
            )}
          </div>

          {/* Methodology bottom sheet */}
          <BottomSheet open={methodologyOpen} onClose={() => setMethodologyOpen(false)} eyebrow="Methodology" title="How this calculator thinks">
            <MethodologyContent />
          </BottomSheet>

          {/* FAQ bottom sheet */}
          <BottomSheet open={faqOpen} onClose={() => setFaqOpen(false)} eyebrow="FAQ" title="Frequently asked questions">
            <FaqContent />
          </BottomSheet>
        </div>
      )}
    </>
  );
}
