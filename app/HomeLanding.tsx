'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { HomeLoader } from './HomeLoader';
import { NavRail } from './components/NavRail';

// ─── Typewriter ───────────────────────────────────────────────────────────────

function TypewriterText({ text, onComplete, speed = 32 }: { text: string; onComplete: () => void; speed?: number }) {
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

// ─── Canada city map ──────────────────────────────────────────────────────────

type CityEntry = {
  name: string; x: number; y: number; winner: 'renter' | 'owner';
  labelSide: 'left' | 'right' | 'top' | 'bottom';
};

const CANADA_CITIES: CityEntry[] = [
  { name: 'Victoria',     x: 22,  y: 188, winner: 'renter', labelSide: 'left' },
  { name: 'Vancouver',    x: 50,  y: 162, winner: 'renter', labelSide: 'left' },
  { name: 'Calgary',      x: 130, y: 162, winner: 'renter', labelSide: 'bottom' },
  { name: 'Edmonton',     x: 132, y: 105, winner: 'owner',  labelSide: 'top' },
  { name: 'Winnipeg',     x: 270, y: 140, winner: 'renter', labelSide: 'top' },
  { name: 'London',       x: 368, y: 210, winner: 'owner',  labelSide: 'bottom' },
  { name: 'Hamilton',     x: 396, y: 198, winner: 'owner',  labelSide: 'bottom' },
  { name: 'Toronto',      x: 412, y: 182, winner: 'renter', labelSide: 'right' },
  { name: 'Ottawa',       x: 448, y: 155, winner: 'renter', labelSide: 'top' },
  { name: 'Montreal',     x: 466, y: 168, winner: 'owner',  labelSide: 'right' },
  { name: 'Qc. City',     x: 483, y: 143, winner: 'owner',  labelSide: 'right' },
  { name: 'Halifax',      x: 548, y: 172, winner: 'renter', labelSide: 'right' },
];

function getLabelOffset(side: CityEntry['labelSide']): { dx: number; dy: number; anchor: 'end' | 'start' | 'middle' } {
  switch (side) {
    case 'left':   return { dx: -10, dy: 3,  anchor: 'end' };
    case 'right':  return { dx: 10,  dy: 3,  anchor: 'start' };
    case 'top':    return { dx: 0,   dy: -9, anchor: 'middle' };
    case 'bottom': return { dx: 0,   dy: 17, anchor: 'middle' };
  }
}

const CANADA_OUTLINE = `
  M 20 195 L 22 180 L 28 172 L 35 168 L 42 175 L 48 162
  L 52 150 L 60 148 L 70 152 L 80 148 L 92 140 L 105 138
  L 115 132 L 125 128 L 132 108 L 136 90 L 140 78 L 148 72
  L 156 74 L 160 80 L 162 92 L 168 88 L 172 78 L 180 72
  L 192 70 L 205 68 L 218 66 L 232 64 L 248 62 L 265 60
  L 280 60 L 295 62 L 310 64 L 326 66 L 340 68 L 355 72
  L 368 78 L 380 88 L 390 100 L 398 112 L 402 125 L 406 138
  L 412 148 L 420 152 L 430 155 L 440 150 L 448 145 L 456 140
  L 464 138 L 470 140 L 476 136 L 482 130 L 490 125 L 498 128
  L 504 135 L 510 140 L 518 145 L 526 148 L 534 150 L 542 155
  L 550 160 L 556 165 L 562 168 L 568 172 L 572 178 L 575 185
  L 574 195 L 568 200 L 560 205 L 548 208 L 530 210 L 510 212
  L 488 214 L 465 215 L 440 215 L 415 214 L 390 212 L 365 210
  L 340 210 L 315 210 L 290 210 L 265 210 L 240 210 L 215 210
  L 190 210 L 165 210 L 140 208 L 115 205 L 90 202 L 65 200
  L 42 198 L 28 197 Z
`;

function CanadaCityMap({ visible }: { visible: boolean }) {
  return (
    <div style={{ width: '100%', marginTop: '16px' }}>
      <svg viewBox="-50 0 650 250" width="100%" height="auto" aria-hidden="true" style={{ display: 'block' }}>
        <path d={CANADA_OUTLINE} fill="rgba(0,0,0,0.03)" stroke="var(--color-outline)" strokeWidth="1" strokeLinejoin="round" />
        {CANADA_CITIES.map((city, i) => {
          const color = city.winner === 'renter' ? 'var(--color-renter)' : 'var(--color-owner)';
          const lbl = getLabelOffset(city.labelSide);
          return (
            <g key={city.name} transform={`translate(${city.x}, ${city.y})`}>
              <motion.circle
                cx={0} cy={0} r={5}
                fill={color}
                opacity={0.9}
                initial={{ scale: 0, opacity: 0 }}
                animate={visible ? { scale: 1, opacity: 0.9 } : { scale: 0, opacity: 0 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 22 }}
                style={{ transformOrigin: '0px 0px' }}
              />
              <motion.text
                x={lbl.dx} y={lbl.dy}
                textAnchor={lbl.anchor}
                style={{ fill: 'var(--color-text-dim)' }}
                fontSize="9.5"
                fontFamily="var(--font-sans), system-ui, sans-serif"
                initial={{ opacity: 0 }}
                animate={visible ? { opacity: 1 } : { opacity: 0 }}
                transition={{ delay: i * 0.07 + 0.1, duration: 0.25 }}
              >
                {city.name}
              </motion.text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
          <span style={{ color: 'var(--color-renter)', fontWeight: 600 }}>7 cities</span> renter ahead
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
          <span style={{ color: 'var(--color-owner)', fontWeight: 600 }}>5 cities</span> owner ahead
        </span>
      </div>
    </div>
  );
}

// ─── Conversation ─────────────────────────────────────────────────────────────

const CONVERSATION = [
  { from: 'user',   text: 'Should I rent or buy in Toronto right now?' },
  { from: 'reckon', text: 'Rent. By about $80k over 25 years at today\'s prices.' },
  { from: 'user',   text: 'I thought buying always builds wealth.' },
  { from: 'reckon', text: 'Owning a $1.1M condo costs ~5% per year in unrecoverable costs. Your invested down payment compounds the whole time.' },
  { from: 'user',   text: 'Is this the same everywhere in Canada?' },
  { from: 'reckon', text: 'No. Edmonton and Hamilton favor owners. It depends on your city, your rent alternative, and how long you hold.' },
] as const;

function Conversation() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingIdx, setTypingIdx] = useState(0);

  const handleMessageComplete = useCallback(() => {
    const next = typingIdx + 1;
    if (next >= CONVERSATION.length) {
      // All messages shown — loop after pause
      const t = setTimeout(() => {
        setVisibleCount(0);
        setTypingIdx(0);
      }, 2800);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setVisibleCount(next);
      setTypingIdx(next);
    }, 600);
    return () => clearTimeout(t);
  }, [typingIdx]);

  // Start first message on mount
  useEffect(() => {
    setVisibleCount(0);
    setTypingIdx(0);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {CONVERSATION.map((msg, i) => {
        if (i > visibleCount) return null;
        const isUser = msg.from === 'user';
        const isTyping = i === typingIdx && i === visibleCount;

        return (
          <motion.div
            key={`${i}-${visibleCount}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.0, 0.0, 0.2, 1] }}
            style={{
              display: 'flex',
              justifyContent: isUser ? 'flex-end' : 'flex-start',
            }}
          >
            {!isUser && (
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                backgroundColor: 'var(--color-outline)',
                border: '1px solid var(--color-outline-active)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginRight: '8px', marginTop: '2px',
                fontSize: '9px', fontWeight: 700, color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                letterSpacing: '0.02em',
              }}>
                R
              </div>
            )}
            <div
              style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                backgroundColor: isUser ? 'var(--color-outline)' : 'var(--color-bg-elevated)',
                border: isUser ? 'none' : '1px solid var(--color-outline)',
                fontSize: '14px',
                lineHeight: 1.55,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {isTyping ? (
                <TypewriterText text={msg.text} onComplete={handleMessageComplete} speed={30} />
              ) : msg.text}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeLanding() {
  const router = useRouter();
  const [loaderDone, setLoaderDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const pcInputId = useId();

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('reckon_loaded')) {
      setLoaderDone(true);
    }
  }, []);

  // Preload map bundle while user reads
  useEffect(() => {
    import('./experience/map/MapPanel');
  }, []);

  const handleLoaderComplete = useCallback(() => setLoaderDone(true), []);

  const handleNavigate = useCallback((pc?: string) => {
    setIsExiting(true);
    const dest = pc ? `/experience?pc=${encodeURIComponent(pc.trim().toUpperCase())}` : '/experience';
    setTimeout(() => router.push(dest), 230);
  }, [router]);

  const handlePostalSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    handleNavigate(postalCode);
  }, [postalCode, handleNavigate]);

  return (
    <>
      {!loaderDone && <HomeLoader onComplete={handleLoaderComplete} />}

      <NavRail />

      {loaderDone && (
        <motion.div
          animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.97 : 1 }}
          transition={{ duration: 0.22, ease: [0.4, 0, 1, 1] }}
          style={{
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            transformOrigin: 'center',
          }}
        >
          {/* Desktop split: lg:flex-row, mobile: flex-col-reverse (CTAs on top on mobile) */}
          <div
            className="flex flex-col-reverse lg:flex-row"
            style={{
              minHeight: '100dvh',
              // On desktop, leave 52px for the left rail. On mobile, leave 52px for the top bar.
              paddingLeft: 0,
            }}
          >
            {/* LEFT — Conversation */}
            <div
              className="lg:pl-[52px]"
              style={{
                flex: '0 0 55%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: 'clamp(40px, 6vh, 80px) clamp(32px, 5vw, 72px)',
                borderRight: '1px solid var(--color-outline)',
              }}
            >
              <p style={{
                fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'var(--color-text-faint)', fontWeight: 500,
                marginBottom: '32px',
              }}>
                A conversation
              </p>
              <Conversation />
            </div>

            {/* RIGHT — CTA */}
            <div
              className="lg:pt-0 pt-[52px]"
              style={{
                flex: '0 0 45%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: 'clamp(40px, 6vh, 80px) clamp(32px, 5vw, 64px)',
                borderBottom: '1px solid var(--color-outline)',
              }}
            >
              <h1 style={{
                fontFamily: 'var(--font-serif), Georgia, serif',
                fontSize: 'clamp(36px, 4.5vw, 60px)',
                fontWeight: 700,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'var(--color-text)',
                marginBottom: '8px',
              }}>
                Know your number.
              </h1>
              <p style={{
                fontSize: '15px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.55,
                marginBottom: '28px',
                maxWidth: '340px',
              }}>
                Canadian rent vs buy. Every assumption editable. Every formula cited.
              </p>

              <CanadaCityMap visible={true} />

              <form
                onSubmit={handlePostalSubmit}
                style={{ display: 'flex', gap: '10px', alignItems: 'stretch', maxWidth: '360px', width: '100%', marginTop: '28px' }}
              >
                <div style={{ flex: 1, position: 'relative' }}>
                  <label htmlFor={pcInputId} style={{
                    position: 'absolute', top: '-22px', left: '2px',
                    fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--color-text-faint)', fontWeight: 500,
                  }}>
                    Your postal code
                  </label>
                  <input
                    id={pcInputId}
                    type="text"
                    placeholder="M5V, K2G, V6B…"
                    value={postalCode}
                    onChange={e => setPostalCode(e.target.value)}
                    maxLength={7}
                    autoComplete="postal-code"
                    style={{
                      width: '100%', height: '52px', padding: '0 16px',
                      backgroundColor: 'var(--color-bg-elevated)',
                      border: '1px solid var(--color-outline-active)',
                      borderRadius: '12px', color: 'var(--color-text)',
                      fontSize: '16px', fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    height: '52px', padding: '0 24px', flexShrink: 0,
                    backgroundColor: 'var(--color-text)', color: 'var(--color-bg)',
                    borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                    letterSpacing: '-0.01em', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  }}
                >
                  Calculate
                </button>
              </form>

              <button
                onClick={() => handleNavigate()}
                style={{
                  marginTop: '12px', background: 'none', border: 'none',
                  fontSize: '12px', color: 'var(--color-text-dimmer)',
                  cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  textDecoration: 'underline', textUnderlineOffset: '2px',
                  textDecorationColor: 'var(--color-outline)',
                  textAlign: 'left', padding: 0,
                }}
              >
                Start without a postal code →
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
