'use client';

import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { MethodologyContent } from '@/components/MethodologyContent';
import { FaqContent } from '@/components/FaqContent';
import { HomeLoader } from './HomeLoader';
import { ReckonSignature } from '@/components/ReckonSignature';

// ─── Flip counter hook ────────────────────────────────────────────────────────

function useFlipCounter(target: number, delayMs: number): { phase: 'counting' | 'flipping'; counted: number } {
  const [phase, setPhase] = useState<'counting' | 'flipping'>('counting');
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    setPhase('counting');
    setCounted(0);
    if (target === 0) return;

    const COUNT_MS = 900;
    const startTime = performance.now() + delayMs;
    let raf: number;
    let done = false;

    function tick(now: number) {
      if (done) return;
      const elapsed = Math.max(0, now - startTime);
      const t = Math.min(elapsed / COUNT_MS, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setCounted(Math.round(target * eased));
      if (t >= 1) {
        done = true;
        setTimeout(() => setPhase('flipping'), 60);
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => { done = true; cancelAnimationFrame(raf); };
  }, [target, delayMs]);

  return { phase, counted };
}

// ─── City price chart (beat 1) ────────────────────────────────────────────────

const CITY_PRICES = [
  { name: 'Vancouver', price: 1250, label: '$1.25M', highlight: false },
  { name: 'Toronto', price: 1100, label: '$1.10M', highlight: false },
  { name: 'National avg', price: 716, label: '$716k', highlight: true },
  { name: 'Ottawa', price: 640, label: '$640k', highlight: false },
  { name: 'Calgary', price: 590, label: '$590k', highlight: false },
];
const MAX_PRICE = 1400;

function CityPriceChart({ visible }: { visible: boolean }) {
  return (
    <div style={{ width: '100%', marginTop: '24px' }}>
      {CITY_PRICES.map((city, i) => (
        <div key={city.name} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: i < CITY_PRICES.length - 1 ? '10px' : 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-faint)', width: '80px', flexShrink: 0, textAlign: 'right' }}>
            {city.name}
          </span>
          <div style={{ flex: 1, height: '28px', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={visible ? { width: `${(city.price / MAX_PRICE) * 100}%` } : { width: 0 }}
              transition={{ duration: 0.7, delay: i * 0.13, ease: [0.4, 0, 0.2, 1] }}
              style={{
                height: '100%',
                backgroundColor: city.highlight ? 'var(--color-owner)' : 'rgba(245,158,11,0.25)',
                borderRadius: '4px',
              }}
            />
          </div>
          <span style={{
            fontSize: '13px', fontWeight: 600,
            color: city.highlight ? 'var(--color-owner)' : 'var(--color-text-faint)',
            width: '52px', flexShrink: 0, fontVariantNumeric: 'tabular-nums',
          }}>
            {city.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Cost pie chart (beat 4) ─────────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutSegmentPath(cx: number, cy: number, outerR: number, innerR: number, startDeg: number, endDeg: number): string {
  const o1 = polarToXY(cx, cy, outerR, startDeg);
  const o2 = polarToXY(cx, cy, outerR, endDeg);
  const i1 = polarToXY(cx, cy, innerR, endDeg);
  const i2 = polarToXY(cx, cy, innerR, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${o1.x.toFixed(2)} ${o1.y.toFixed(2)} A${outerR} ${outerR} 0 ${large} 1 ${o2.x.toFixed(2)} ${o2.y.toFixed(2)} L${i1.x.toFixed(2)} ${i1.y.toFixed(2)} A${innerR} ${innerR} 0 ${large} 0 ${i2.x.toFixed(2)} ${i2.y.toFixed(2)}Z`;
}

const PIE_SLICES = [
  { label: 'Cost of capital', color: '#F59E0B',                pct: 60, desc: '3% / yr' },
  { label: 'Property tax',    color: 'rgba(245,158,11,0.55)',  pct: 20, desc: '1% / yr' },
  { label: 'Maintenance',     color: 'rgba(245,158,11,0.30)',  pct: 20, desc: '1% / yr' },
];

function CostPieChart({ visible }: { visible: boolean }) {
  const cx = 78, cy = 76, outerR = 62, innerR = 38, GAP = 3;
  let cum = 0;
  const segments = PIE_SLICES.map(s => {
    const start = cum + GAP / 2;
    const end = cum + (s.pct / 100) * 360 - GAP / 2;
    cum += (s.pct / 100) * 360;
    return { ...s, start, end };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
      <svg viewBox="0 0 156 152" width="130" height="126" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={(outerR + innerR) / 2} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={outerR - innerR} />
        {segments.map((seg, i) => (
          <motion.path
            key={seg.label}
            d={donutSegmentPath(cx, cy, outerR, innerR, seg.start, seg.end)}
            fill={seg.color}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
            transition={{ delay: i * 0.14, duration: 0.38, ease: [0.34, 1.3, 0.64, 1] }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
          />
        ))}
        <text x={cx} y={cy - 5} textAnchor="middle" style={{ fill: 'var(--color-text)' }} fontSize="17" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">5%</text>
        <text x={cx} y={cy + 11} textAnchor="middle" style={{ fill: 'var(--color-text-dim)' }} fontSize="8.5" fontFamily="var(--font-sans), system-ui, sans-serif">per year</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {PIE_SLICES.map((slice, i) => (
          <motion.div
            key={slice.label}
            initial={{ opacity: 0, x: 8 }}
            animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
            transition={{ delay: i * 0.14 + 0.28, duration: 0.28 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}
          >
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: slice.color, flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500, lineHeight: 1.2 }}>{slice.desc}</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginTop: '1px' }}>{slice.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Compound growth line (beat 6) ────────────────────────────────────────────

function CompoundGrowthLine({ visible }: { visible: boolean }) {
  return (
    <div style={{ width: '100%', marginTop: '24px' }}>
      <svg viewBox="0 0 420 120" width="100%" height="auto" aria-hidden="true" style={{ display: 'block' }}>
        <motion.path
          d="M 10 108 C 40 107, 80 103, 120 94 C 165 82, 210 67, 255 50 C 295 35, 350 17, 410 8"
          fill="none"
          stroke="var(--color-renter)"
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={visible ? { pathLength: 1 } : { pathLength: 0 }}
          transition={{ duration: 1.8, ease: [0.4, 0, 0.2, 1] }}
        />
        <motion.circle
          cx="410" cy="8" r="5"
          fill="var(--color-renter)"
          initial={{ opacity: 0, scale: 0 }}
          animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ delay: 1.7, type: 'spring', stiffness: 260, damping: 18 }}
          style={{ transformOrigin: '410px 8px' }}
        />
        <text x="10" y="118" style={{ fill: 'var(--color-text-dimmer)' }} fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif">Year 0</text>
        <text x="410" y="118" textAnchor="end" style={{ fill: 'var(--color-text-dimmer)' }} fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif">Year 25</text>
      </svg>
    </div>
  );
}

// ─── Canada city map (beat 7) ─────────────────────────────────────────────────

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

// Simplified Canada landmass outline — approximate polygon at 600×250 scale
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
        {/* Faint Canada silhouette */}
        <path d={CANADA_OUTLINE} fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeLinejoin="round" />
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
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 22 }}
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
                transition={{ delay: i * 0.08 + 0.1, duration: 0.25 }}
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

// ─── Story beats ──────────────────────────────────────────────────────────────

type StatType = { raw: number; label: string; fmt: 'dollars-k' | 'dollars-m' | 'dollars-k-yr' } | null;
type VisualType = 'cityPriceChart' | 'compoundGrowthLine' | 'canadaCityMap' | 'costPieChart' | null;
type LayoutType = 'A' | 'B' | 'C';

interface Beat {
  eyebrow: string;
  headline: string;
  body: string;
  source?: string;
  stat: StatType;
  statAccent?: 'owner' | 'renter';
  visual: VisualType;
  layout: LayoutType;
  pauseMs: number;
}

const BEATS: Beat[] = [
  {
    eyebrow: 'The belief',
    headline: 'Most Canadians believe owning a home is the best financial decision they can make.',
    body: 'It is handed down like received wisdom. From parents, from brokers, from headlines. It has rarely been seriously questioned.',
    stat: null, visual: null, layout: 'A', pauseMs: 2200,
  },
  {
    eyebrow: 'The market',
    headline: 'The average Canadian home costs $716,000.',
    body: 'Toronto: $1.1M. Vancouver: $1.25M. Even mid-sized cities have seen prices double in a decade.',
    source: 'CREA, February 2025',
    stat: null, statAccent: 'owner', visual: 'cityPriceChart', layout: 'B', pauseMs: 3600,
  },
  {
    eyebrow: 'The entry cost',
    headline: "At 20% down, that's $143,000 before you move in.",
    body: 'Before closing costs, land transfer tax, legal fees, and moving expenses. Most Canadians do not have it in liquid savings.',
    stat: { raw: 143000, label: 'Minimum 20% down payment', fmt: 'dollars-k' },
    statAccent: 'owner', visual: null, layout: 'B', pauseMs: 3200,
  },
  {
    eyebrow: 'The 5% rule',
    headline: "Ben Felix quantified it: 5% of the home's value, every year, gone.",
    body: 'On a $1M home, that is $50,000 per year in unrecoverable costs. Property tax alone in Toronto runs $6,000 to $9,000 annually.',
    source: 'PWL Capital, 2023',
    stat: { raw: 50000, label: 'Annual unrecoverable cost on a $1M home', fmt: 'dollars-k-yr' },
    statAccent: 'owner', visual: 'costPieChart', layout: 'B', pauseMs: 3800,
  },
  {
    eyebrow: 'The number',
    headline: 'At the Canadian blended index return, it becomes over $1M in 25 years.',
    body: 'The 20-year nominal return on a blended Canadian index was 8.19%. The invested down payment compounds the entire time.',
    source: 'Rational Reminder ep. 323, September 2024 — 8.19% nominal, 2005-2024',
    stat: { raw: 1_000_000, label: 'Invested down payment after 25 years', fmt: 'dollars-m' },
    statAccent: 'renter', visual: 'compoundGrowthLine', layout: 'B', pauseMs: 3800,
  },
  {
    eyebrow: 'The research',
    headline: 'Renters came out ahead in 7 of 12 Canadian cities over 20 years.',
    body: 'Owners won in 5. The margin was rarely large. Savings discipline, home type, mortgage rate, and tax shelters shifted the outcome.',
    source: 'PWL Capital, 2024 — 12-city Canadian study, 20-year hold',
    stat: null, visual: 'canadaCityMap', layout: 'C', pauseMs: 4000,
  },
  {
    eyebrow: 'Why reckon',
    headline: 'The explicit costs of renting are obvious. The implicit costs of owning are not.',
    body: 'We built reckon to make both visible. Every assumption editable. Every formula cited. Canadian tax code built in. LTT, CMHC, PRE, TFSA, FHSA, RRSP.',
    stat: null, visual: null, layout: 'A', pauseMs: 1400,
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

// ─── Stat display ─────────────────────────────────────────────────────────────

function StatDisplay({ stat, accent, visible: _visible }: { stat: NonNullable<StatType>; accent: 'owner' | 'renter'; visible: boolean }) {
  const { phase, counted } = useFlipCounter(stat.raw, 320);

  function fmt(n: number) {
    if (stat.fmt === 'dollars-m') return `$${(n / 1_000_000).toFixed(n >= 990_000 ? 1 : 2)}M${n >= 990_000 ? '+' : ''}`;
    if (stat.fmt === 'dollars-k-yr') return `$${Math.round(n / 1000)}k/yr`;
    return `$${Math.round(n / 1000)}k`;
  }

  const accentColor = accent === 'owner' ? 'var(--color-owner)' : 'var(--color-renter)';
  const finalStr = fmt(stat.raw);
  // dollars-m: early format ($0.00M) can be slightly wider than final ($1.0M+)
  const ghostStr = stat.fmt === 'dollars-m' ? '$0.00M' : finalStr;

  const numStyle: React.CSSProperties = {
    fontSize: 'clamp(40px, 5.5vw, 64px)',
    fontWeight: 700,
    letterSpacing: '-0.05em',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    display: 'block',
    color: accentColor,
  };

  return (
    <motion.div
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.16, type: 'spring', stiffness: 340, damping: 32 }}
      style={{
        display: 'inline-block',
        marginTop: '24px',
        backgroundColor: 'var(--color-bg-subtle)',
        border: '1px solid var(--color-outline)',
        borderRadius: '12px',
        padding: '18px 22px 16px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}
    >
      <span style={{ display: 'inline-grid' }}>
        {/* Ghost reserves max width so the card never resizes during count-up */}
        <span aria-hidden style={{ gridArea: '1/1', visibility: 'hidden', userSelect: 'none', pointerEvents: 'none', ...numStyle }}>
          {ghostStr}
        </span>
        {phase === 'counting' ? (
          <span style={{ gridArea: '1/1', ...numStyle }}>{fmt(counted)}</span>
        ) : (
          <span style={{ gridArea: '1/1', display: 'inline-flex' }}>
            {finalStr.split('').map((char, i) => (
              <span key={i} style={{ display: 'inline-block', overflow: 'hidden', lineHeight: '1' }}>
                <motion.span
                  style={{ display: 'block', ...numStyle }}
                  initial={{ y: '110%' }}
                  animate={{ y: '0%' }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 380, damping: 26 }}
                >
                  {char}
                </motion.span>
              </span>
            ))}
          </span>
        )}
      </span>
      <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', marginTop: '8px', lineHeight: 1.4 }}>
        {stat.label}
      </p>
    </motion.div>
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
              position: 'fixed', bottom: 0, left: 'clamp(8px, 3vw, 32px)', right: 'clamp(8px, 3vw, 32px)',
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
              <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-outline)', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
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

// ─── Headline font size by layout ─────────────────────────────────────────────

function headlineFontSize(layout: LayoutType): string {
  if (layout === 'A') return 'clamp(34px, 5.5vw, 64px)';
  if (layout === 'C') return 'clamp(18px, 2.5vw, 28px)';
  return 'clamp(22px, 3vw, 38px)';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HomeLanding() {
  const router = useRouter();
  const [loaderDone, setLoaderDone] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'cta'>('typing');
  const [beatVisible, setBeatVisible] = useState(true);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isPaused, setIsPaused] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [postalCode, setPostalCode] = useState('');
  const pcInputId = useId();

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('reckon_loaded')) {
      setLoaderDone(true);
    }
  }, []);

  // Preload map bundle while user reads the story — avoids cold-load delay on experience page
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

  const advanceBeat = useCallback(() => {
    const next = currentBeat + 1;
    if (next >= TOTAL_BEATS) {
      setBeatVisible(false);
      setTimeout(() => setPhase('cta'), 320);
      return;
    }
    setDirection('forward');
    setBeatVisible(false);
    setTimeout(() => {
      setCurrentBeat(next);
      setBeatVisible(true);
      setPhase('typing');
    }, 320);
  }, [currentBeat]);

  const goBack = useCallback(() => {
    if (currentBeat === 0 || phase === 'cta') return;
    setDirection('back');
    setBeatVisible(false);
    setTimeout(() => {
      setCurrentBeat(b => b - 1);
      setBeatVisible(true);
      setPhase('holding');
    }, 300);
  }, [currentBeat, phase]);

  const handleTypingComplete = useCallback(() => setPhase('holding'), []);

  useEffect(() => {
    if (phase !== 'holding' || !beatVisible || isPaused) return;
    const beat = BEATS[currentBeat];
    if (!beat) return;
    const t = setTimeout(advanceBeat, beat.pauseMs);
    return () => clearTimeout(t);
  }, [phase, currentBeat, advanceBeat, beatVisible, isPaused]);

  const handleStoryClick = useCallback(() => {
    if (phase === 'cta' || !beatVisible) return;
    if (phase === 'typing') {
      setPhase('holding');
      return;
    }
    advanceBeat();
  }, [phase, advanceBeat, beatVisible]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleStoryClick(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleStoryClick, goBack]);

  const beat = BEATS[currentBeat];
  const isCta = phase === 'cta';
  const isLastBeat = currentBeat === TOTAL_BEATS - 1;
  const bodyVisible = phase === 'holding';
  const progress = (currentBeat + 1) / TOTAL_BEATS;

  // Directional slide values
  const enterX = direction === 'forward' ? 80 : -80;
  const exitX = direction === 'forward' ? -80 : 80;

  return (
    <>
      {!loaderDone && <HomeLoader onComplete={handleLoaderComplete} />}


      {loaderDone && (
        <>
          {/* Nav — outside the exit animation so it persists through navigation */}
          <nav style={{
            height: '52px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 24px',
            borderBottom: '1px solid var(--color-outline)',
            position: 'sticky', top: 0, backgroundColor: 'var(--color-bg)',
            zIndex: 20, flexShrink: 0,
          }}>
            <ReckonSignature color="var(--color-text)" width={72} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button onClick={() => setMethodologyOpen(true)} style={{ fontSize: '13px', color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)' }}>
                How this works
              </button>
              <button onClick={() => setFaqOpen(true)} style={{ fontSize: '13px', color: 'var(--color-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-sans), system-ui, sans-serif', letterSpacing: '-0.01em', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: 'var(--color-outline)' }}>
                FAQ
              </button>
              <button onClick={() => handleNavigate()} style={{ height: '34px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', backgroundColor: 'var(--color-outline)', color: 'var(--color-text)', borderRadius: '9999px', fontSize: '13px', fontWeight: 500, letterSpacing: '-0.01em', border: '1px solid var(--color-outline-active)', cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                Calculator
              </button>
            </div>
          </nav>

          <motion.div
            animate={{ opacity: isExiting ? 0 : 1, scale: isExiting ? 0.97 : 1 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 1, 1] }}
            style={{
              minHeight: 'calc(100dvh - 52px)', backgroundColor: 'var(--color-bg)',
              color: 'var(--color-text)', fontFamily: 'var(--font-sans), system-ui, sans-serif',
              display: 'flex', flexDirection: 'column',
              transformOrigin: 'center',
            }}
          >

          {/* Story area */}
          <div
            onClick={handleStoryClick}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', cursor: isCta ? 'default' : 'pointer', userSelect: 'none', overflow: 'hidden' }}
          >
            {/* Prev chevron */}
            {!isCta && currentBeat > 0 && (
              <button
                onClick={e => { e.stopPropagation(); goBack(); }}
                aria-label="Previous"
                style={{
                  position: 'absolute', left: 'clamp(24px, 4vw, 56px)', top: '50%', transform: 'translateY(-50%)',
                  width: '40px', height: '40px', borderRadius: '50%',
                  border: '1px solid var(--color-outline)', background: 'none',
                  cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.35, zIndex: 10, transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M7 1L1 7L7 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}

            {/* Next chevron */}
            {!isCta && (
              <button
                onClick={e => { e.stopPropagation(); handleStoryClick(); }}
                aria-label="Next"
                style={{
                  position: 'absolute', right: 'clamp(24px, 4vw, 56px)', top: '50%', transform: 'translateY(-50%)',
                  width: '40px', height: '40px', borderRadius: '50%',
                  border: '1px solid var(--color-outline)', background: 'none',
                  cursor: 'pointer', color: 'var(--color-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0.35, zIndex: 10, transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
              >
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none"><path d="M1 1L7 7L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}

            {/* Beat */}
            {!isCta && beat && (
              <motion.div
                key={currentBeat}
                initial={{ x: enterX, opacity: 0 }}
                animate={{ x: beatVisible ? 0 : exitX, opacity: beatVisible ? 1 : 0 }}
                transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                  paddingTop: beat.layout === 'C' ? 'clamp(48px, 8vh, 100px)' : 'clamp(100px, 20vh, 220px)',
                  paddingBottom: 'clamp(80px, 10vh, 140px)',
                  paddingLeft: beat.layout === 'C' ? 'clamp(60px, 10vw, 140px)' : 'clamp(60px, 10vw, 140px)',
                  paddingRight: beat.layout === 'C' ? 'clamp(60px, 10vw, 140px)' : 'clamp(60px, 10vw, 140px)',
                  maxWidth: beat.layout === 'C' ? '100%' : '860px',
                  width: '100%', margin: '0 auto',
                  boxSizing: 'border-box', minHeight: 0,
                }}
              >
                <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '20px', fontWeight: 500 }}>
                  {beat.eyebrow}
                </p>

                <h1 style={{
                  fontFamily: 'var(--font-serif), Georgia, serif',
                  fontSize: headlineFontSize(beat.layout),
                  fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1,
                  color: 'var(--color-text)', marginBottom: '28px', minHeight: '1.1em',
                  maxWidth: beat.layout === 'C' ? '480px' : undefined,
                }}>
                  {phase === 'typing' ? (
                    <TypewriterText key={currentBeat} text={beat.headline} onComplete={handleTypingComplete} />
                  ) : beat.headline}
                </h1>

                <AnimatePresence>
                  {bodyVisible && (
                    <motion.div
                      key={`body-${currentBeat}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.0, 0.0, 0.2, 1] }}
                      onClick={e => e.stopPropagation()}
                    >
                      <div style={{ maxWidth: beat.layout === 'A' ? '560px' : '480px' }}>
                        <p style={{ fontSize: 'clamp(15px, 1.8vw, 18px)', color: 'var(--color-text-muted)', lineHeight: 1.65, letterSpacing: '-0.01em', marginBottom: beat.source ? '12px' : 0 }}>
                          {beat.body}
                        </p>
                        {beat.source && (
                          <p style={{ fontSize: '11px', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>{beat.source}</p>
                        )}
                      </div>

                      {beat.visual === 'cityPriceChart' && <CityPriceChart visible={bodyVisible} />}
                      {beat.visual === 'costPieChart' && (
                        <>
                          <CostPieChart visible={bodyVisible} />
                          {beat.stat && <StatDisplay stat={beat.stat} accent={beat.statAccent ?? 'owner'} visible={bodyVisible} />}
                        </>
                      )}
                      {beat.visual === 'compoundGrowthLine' && (
                        <>
                          <CompoundGrowthLine visible={bodyVisible} />
                          {beat.stat && <StatDisplay stat={beat.stat} accent={beat.statAccent ?? 'owner'} visible={bodyVisible} />}
                        </>
                      )}
                      {beat.visual === 'canadaCityMap' && <CanadaCityMap visible={bodyVisible} />}

                      {beat.stat && !beat.visual && (
                        <StatDisplay stat={beat.stat} accent={beat.statAccent ?? 'owner'} visible={bodyVisible} />
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* CTA */}
            <AnimatePresence>
              {isCta && (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.30, ease: [0.0, 0.0, 0.2, 1] }}
                  style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center',
                    textAlign: 'center', padding: 'clamp(32px, 6vw, 80px) 24px',
                    backgroundColor: 'var(--color-bg)',
                  }}
                >
                  <div style={{ marginBottom: '28px' }}>
                    <ReckonSignature color="var(--color-text-dimmer)" width={64} />
                  </div>
                  <h2 style={{
                    fontFamily: 'var(--font-serif), Georgia, serif',
                    fontSize: 'clamp(32px, 6vw, 68px)',
                    fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.05,
                    color: 'var(--color-text)', marginBottom: '40px', maxWidth: '600px',
                  }}>
                    Know your number.
                  </h2>

                  {/* Postal code entry — pre-fills regional defaults */}
                  <form
                    onSubmit={handlePostalSubmit}
                    style={{ display: 'flex', gap: '10px', alignItems: 'stretch', maxWidth: '360px', width: '100%' }}
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
                      marginTop: '14px', background: 'none', border: 'none',
                      fontSize: '12px', color: 'var(--color-text-dimmer)',
                      cursor: 'pointer', fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      textDecoration: 'underline', textUnderlineOffset: '2px',
                      textDecorationColor: 'var(--color-outline)',
                    }}
                  >
                    Skip — enter manually
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom controls row */}
            {!isCta && (
              <div style={{ position: 'absolute', bottom: '28px', left: '40px', right: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                {/* Pause / play */}
                <button
                  onClick={e => { e.stopPropagation(); setIsPaused(p => !p); }}
                  aria-label={isPaused ? 'Play' : 'Pause'}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: '1px solid var(--color-outline-active)',
                    backgroundColor: 'var(--color-outline)',
                    cursor: 'pointer', color: 'var(--color-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isPaused ? (
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><path d="M1 1L9 6L1 11V1Z" fill="currentColor"/></svg>
                  ) : (
                    <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><rect x="1" y="1" width="3" height="10" rx="1" fill="currentColor"/><rect x="6" y="1" width="3" height="10" rx="1" fill="currentColor"/></svg>
                  )}
                </button>

                {/* Skip pill */}
                {!isLastBeat && (
                  <button
                    onClick={e => { e.stopPropagation(); handleNavigate(); }}
                    style={{
                      display: 'inline-flex', alignItems: 'center',
                      height: '36px', padding: '0 16px',
                      borderRadius: '9999px',
                      backgroundColor: 'var(--color-text)',
                      color: 'var(--color-bg)', fontSize: '13px', fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-sans), system-ui, sans-serif',
                      letterSpacing: '-0.01em', whiteSpace: 'nowrap',
                    }}
                  >
                    Skip to calculator
                  </button>
                )}
              </div>
            )}

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
        </>
      )}
    </>
  );
}
