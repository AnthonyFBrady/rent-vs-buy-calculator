'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import type { CalculatorInputs, SimulationResult, SensitivityResult } from '@/engine';

interface EventMarker {
  id: string;
  year: number;
  side: 'owner' | 'renter' | 'both';
  yValue: number;
  line1: string;
  line2: string;
  amount: number;
  isPositive: boolean;
  description: string;
}

interface Props {
  result: SimulationResult;
  sensitivity: SensitivityResult | null;
  phase: number;
  isDark: boolean;
  activeEvent: string | null;
  onEventClick: (id: string | null) => void;
  inputs: CalculatorInputs;
  activeSide: 'owner' | 'renter' | 'both';
  ownerLabel: string;
  renterLabel: string;
}

const CROSS_COLOR = '#A78BFA';

const PROVINCE_NAMES: Record<string, string> = {
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta', QC: 'Quebec',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick',
  NL: 'Newfoundland', PE: 'Prince Edward Island',
};

function fmtWealth(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

const fmtFull = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

function ownerTotal(snap: { ownerEquity: number; ownerPortfolioEnd: number }) {
  return snap.ownerEquity + snap.ownerPortfolioEnd;
}
function renterTotal(snap: { renterPortfolioEnd: number; renterRrspBalance: number; renterDepositBalance: number }) {
  return snap.renterPortfolioEnd + snap.renterRrspBalance + snap.renterDepositBalance;
}
// For the chart line: exclude deposit so renter moves cause a visible dip.
// The deposit is returned at exit and appears in finalRenterWealth (via exit haircut line).
function renterChartValue(snap: { renterPortfolioEnd: number; renterRrspBalance: number }) {
  return snap.renterPortfolioEnd + snap.renterRrspBalance;
}

function computeEvents(result: SimulationResult, inputs: CalculatorInputs): EventMarker[] {
  const events: EventMarker[] = [];

  // Build adjusted owner y values matching the chart line (cumulative move costs stripped out)
  const ownerAdjY = new Map<number, number>();
  let cumMoveCost = 0;
  for (const snap of result.yearByYear) {
    cumMoveCost += snap.ownerMoveTransactionCost;
    ownerAdjY.set(snap.year, ownerTotal(snap) - cumMoveCost);
  }

  // Renewal events — one per term boundary after the first
  for (let i = 1; i < result.renewalBoundaries.length; i++) {
    const rb = result.renewalBoundaries[i]!;
    const yr = rb.termStartYear;
    if (yr >= inputs.holdingPeriodYears || yr >= inputs.amortizationYears) continue;
    const snap = result.yearByYear[yr - 1];
    const prev = result.yearByYear[yr - 2];
    if (!snap) continue;
    const delta = snap.ownerMonthlyPayment - (prev?.ownerMonthlyPayment ?? snap.ownerMonthlyPayment);
    if (Math.abs(delta) < 2) continue;
    events.push({
      id: `renewal-${yr}`,
      year: yr,
      side: 'owner',
      yValue: ownerAdjY.get(yr) ?? ownerTotal(snap),
      line1: 'Rate renewed',
      line2: `${delta > 0 ? '+' : ''}${fmtWealth(delta)}/mo`,
      amount: -delta * 12,
      isPositive: delta <= 0,
      description: `Renewed at ${(rb.rate * 100).toFixed(1)}% — payment ${delta > 0 ? '+' : ''}${fmtFull.format(delta)}/mo vs prior term.`,
    });
  }

  if (result.breakEvenYear !== null) {
    const snap = result.yearByYear[result.breakEvenYear - 1];
    if (snap) {
      events.push({
        id: 'breakeven', year: result.breakEvenYear, side: 'both',
        yValue: ((ownerAdjY.get(result.breakEvenYear) ?? ownerTotal(snap)) + renterChartValue(snap)) / 2,
        line1: 'Lines cross', line2: `Yr ${result.breakEvenYear}`,
        amount: 0, isPositive: true,
        description: 'Owner net worth catches up to the renter for the first time.',
      });
    }
  }

  const amort = inputs.amortizationYears;
  if (amort <= inputs.holdingPeriodYears) {
    const snap = result.yearByYear[amort - 1];
    if (snap) {
      const freed = snap.ownerMonthlyPayment;
      const exitNote = inputs.holdingPeriodYears === amort ? ' Exit costs shown are for a sale at this exact year.' : '';
      events.push({
        id: 'payoff', year: amort, side: 'owner',
        yValue: ownerAdjY.get(amort) ?? ownerTotal(snap),
        line1: 'Mortgage free',
        line2: `+${fmtWealth(freed)}/mo freed`,
        amount: freed * 12, isPositive: true,
        description: `${fmtFull.format(freed)}/mo freed — owner now invests the difference.${exitNote}`,
      });
    }
  }

  for (const snap of result.yearByYear) {
    if (snap.ownerMoveOccurredThisYear) {
      events.push({
        id: `owner-move-${snap.year}`, year: snap.year, side: 'owner',
        yValue: ownerAdjY.get(snap.year) ?? ownerTotal(snap),
        line1: 'Owner moved',
        line2: `−${fmtWealth(snap.ownerMoveTransactionCost)}`,
        amount: -snap.ownerMoveTransactionCost, isPositive: false,
        description: `Sell + rebuy: ${fmtFull.format(snap.ownerMoveTransactionCost)} in commissions, LTT, legal, moving.`,
      });
    }
    if (snap.renterMoveOccurredThisYear) {
      const cost = snap.renterPhysicalMovingCost + snap.renterDepositNetCostThisYear;
      const snapIdx = result.yearByYear.indexOf(snap);
      const prevSnap = result.yearByYear[snapIdx - 1];
      const prevInPlaceRent = prevSnap ? prevSnap.renterAnnualRent / 12 : null;
      const rentGap = prevInPlaceRent != null ? snap.marketMonthlyRent - prevInPlaceRent : 0;
      const line2 = rentGap > 1
        ? `Rent +${fmtWealth(rentGap)}/mo`
        : `${fmtWealth(snap.marketMonthlyRent)}/mo`;
      const descRentPart = prevInPlaceRent != null && rentGap > 1
        ? `Rent reset from ${fmtFull.format(prevInPlaceRent)} to market ${fmtFull.format(snap.marketMonthlyRent)}/mo (+${fmtFull.format(rentGap)}/mo permanently).`
        : `Rent reset to ${fmtFull.format(snap.marketMonthlyRent)}/mo market rate.`;
      events.push({
        id: `renter-move-${snap.year}`, year: snap.year, side: 'renter', yValue: renterChartValue(snap),
        line1: 'Renter moved',
        line2,
        amount: -cost, isPositive: false,
        description: `${descRentPart} Moving cost: ${fmtFull.format(snap.renterPhysicalMovingCost)}.`,
      });
    }
  }

  return events;
}

export function ExperienceChart({ result, sensitivity, phase, isDark, activeEvent, onEventClick, inputs, activeSide, ownerLabel, renterLabel }: Props) {
  const OWNER_COLOR = isDark ? '#E8C87A' : '#A86A00';
  const RENTER_COLOR = isDark ? '#6CBFB8' : '#0B8278';

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [ownerDrawn, setOwnerDrawn] = useState(false);
  const [renterDrawn, setRenterDrawn] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase >= 4 && !ownerDrawn) {
      const t = setTimeout(() => setOwnerDrawn(true), 800);
      return () => clearTimeout(t);
    }
  }, [phase, ownerDrawn]);

  useEffect(() => {
    if (phase >= 9 && !renterDrawn) {
      const t = setTimeout(() => setRenterDrawn(true), 800);
      return () => clearTimeout(t);
    }
  }, [phase, renterDrawn]);

  const { w: width, h: height } = size;
  const isNarrow = width < 520;
  const MARGIN = {
    top: 44,
    right: isNarrow ? 72 : 108,
    bottom: 44,
    left: isNarrow ? 44 : 72,
  };
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const xMax = result.inputs.holdingPeriodYears;

  const ownerPoints = useMemo(() => {
    let cumulativeMoveCost = 0;
    return [
      { year: 0, value: result.inputs.homePrice * result.inputs.downPaymentPct },
      ...result.yearByYear.map((y) => {
        cumulativeMoveCost += y.ownerMoveTransactionCost;
        return { year: y.year, value: ownerTotal(y) - cumulativeMoveCost };
      }),
    ];
  }, [result]);

  const renterPoints = useMemo(() => [
    { year: 0, value: result.yearByYear[0]?.renterPortfolioStart ?? 0 },
    ...result.yearByYear.map((y) => ({ year: y.year, value: renterChartValue(y) })),
  ], [result]);

  const ownerExitValue = result.exit.finalOwnerWealth;
  const renterExitValue = result.exit.finalRenterWealth;
  const exitYear = result.inputs.holdingPeriodYears;

  const introLinePath = useMemo(() => d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveMonotoneX), []);

  const makeRacePath = useCallback((yFracs: number[], xFrac = 1.0): [number, number][] => {
    const n = yFracs.length;
    return yFracs.map((yf, i) => [
      (i / (n - 1)) * innerWidth * xFrac,
      Math.max(4, Math.min(innerHeight - 4, innerHeight * yf)),
    ]);
  }, [innerWidth, innerHeight]);

  // Race frames — both trend upward-right (A=even, B=owner surges, C=renter surges)
  // xFrac < 1 = shorter line = falling behind; xFrac = 1 = full width = leading
  const ownerRaceA = useMemo(() => introLinePath(makeRacePath([0.82, 0.73, 0.64, 0.55, 0.47, 0.41, 0.37, 0.35], 1.00)) ?? '', [introLinePath, makeRacePath]);
  const ownerRaceB = useMemo(() => introLinePath(makeRacePath([0.82, 0.68, 0.50, 0.35, 0.23, 0.16, 0.13, 0.11], 1.00)) ?? '', [introLinePath, makeRacePath]);
  const ownerRaceC = useMemo(() => introLinePath(makeRacePath([0.35, 0.33, 0.31, 0.29, 0.27, 0.26, 0.25, 0.25], 0.78)) ?? '', [introLinePath, makeRacePath]);
  const renterRaceA = useMemo(() => introLinePath(makeRacePath([0.85, 0.77, 0.69, 0.61, 0.54, 0.48, 0.45, 0.43], 1.00)) ?? '', [introLinePath, makeRacePath]);
  const renterRaceB = useMemo(() => introLinePath(makeRacePath([0.85, 0.79, 0.73, 0.67, 0.62, 0.57, 0.54, 0.52], 0.72)) ?? '', [introLinePath, makeRacePath]);
  const renterRaceC = useMemo(() => introLinePath(makeRacePath([0.43, 0.33, 0.23, 0.15, 0.10, 0.07, 0.06, 0.05], 1.00)) ?? '', [introLinePath, makeRacePath]);

  const mergedPts = useMemo(() =>
    ownerPoints.map((op, i) => ({ year: op.year, owner: op.value, renter: renterPoints[i]?.value ?? 0 })),
    [ownerPoints, renterPoints],
  );

  const bands = useMemo(() => {
    if (!sensitivity || phase < 14) return null;
    const ownerLowPts = [{ year: 0, value: 0 }, ...sensitivity.ownerLow.yearByYear.map((y) => ({ year: y.year, value: ownerTotal(y) }))];
    const ownerHighPts = [{ year: 0, value: 0 }, ...sensitivity.ownerHigh.yearByYear.map((y) => ({ year: y.year, value: ownerTotal(y) }))];
    const renterLowPts = [{ year: 0, value: sensitivity.renterLow.yearByYear[0]?.renterPortfolioStart ?? 0 }, ...sensitivity.renterLow.yearByYear.map((y) => ({ year: y.year, value: renterTotal(y) }))];
    const renterHighPts = [{ year: 0, value: sensitivity.renterHigh.yearByYear[0]?.renterPortfolioStart ?? 0 }, ...sensitivity.renterHigh.yearByYear.map((y) => ({ year: y.year, value: renterTotal(y) }))];
    return { ownerLowPts, ownerHighPts, renterLowPts, renterHighPts };
  }, [sensitivity, phase]);

  const allValues = [
    ...ownerPoints.map(p => p.value),
    ...renterPoints.map(p => p.value),
    ownerExitValue,
    renterExitValue,
    ...(bands ? [...bands.ownerLowPts.map(p => p.value), ...bands.ownerHighPts.map(p => p.value), ...bands.renterLowPts.map(p => p.value), ...bands.renterHighPts.map(p => p.value)] : []),
  ];
  const yMax = Math.max(...allValues, 1);
  const yMin = Math.min(...allValues, 0);

  const x = useMemo(() => d3.scaleLinear().domain([0, xMax]).range([0, innerWidth]), [xMax, innerWidth]);
  const y = useMemo(() => d3.scaleLinear().domain([yMin, yMax]).nice().range([innerHeight, 0]), [yMin, yMax, innerHeight]);

  const linePath = useMemo(() => d3.line<{ year: number; value: number }>().x(d => x(d.year)).y(d => y(d.value)).curve(d3.curveMonotoneX), [x, y]);
  const areaPath = useMemo(() => d3.area<{ year: number; low: number; high: number }>().x(d => x(d.year)).y0(d => y(d.low)).y1(d => y(d.high)).curve(d3.curveMonotoneX), [x, y]);

  const renterLeadArea = useMemo(() => d3.area<{ year: number; owner: number; renter: number }>().x(d => x(d.year)).y0(d => y(d.owner)).y1(d => y(Math.max(d.owner, d.renter))).curve(d3.curveMonotoneX), [x, y]);
  const ownerLeadArea = useMemo(() => d3.area<{ year: number; owner: number; renter: number }>().x(d => x(d.year)).y0(d => y(d.renter)).y1(d => y(Math.max(d.owner, d.renter))).curve(d3.curveMonotoneX), [x, y]);

  const ownerPath = phase >= 4 ? (linePath(ownerPoints) ?? '') : '';
  const renterPath = phase >= 9 ? (linePath(renterPoints) ?? '') : '';
  const renterLeadPath = (phase >= 9 ? renterLeadArea(mergedPts) : null) ?? '';
  const ownerLeadPath = (phase >= 4 ? ownerLeadArea(mergedPts) : null) ?? '';

  const ownerBandPath = useMemo(() => { if (!bands) return ''; const m = bands.ownerLowPts.map((p, i) => ({ year: p.year, low: Math.min(p.value, bands.ownerHighPts[i]?.value ?? p.value), high: Math.max(p.value, bands.ownerHighPts[i]?.value ?? p.value) })); return areaPath(m) ?? ''; }, [bands, areaPath]);
  const renterBandPath = useMemo(() => { if (!bands) return ''; const m = bands.renterLowPts.map((p, i) => ({ year: p.year, low: Math.min(p.value, bands.renterHighPts[i]?.value ?? p.value), high: Math.max(p.value, bands.renterHighPts[i]?.value ?? p.value) })); return areaPath(m) ?? ''; }, [bands, areaPath]);

  const xTicks = x.ticks(Math.min(xMax, 8));
  const yTicks = y.ticks(5);

  const events = useMemo(() => {
    if (phase < 4) return [];
    return computeEvents(result, inputs).filter(ev => ev.id !== 'breakeven' || phase >= 9);
  }, [result, inputs, phase]);

  const hoverData = useMemo(() => {
    if (hoverYear === null) return null;
    const o = ownerPoints.find(p => p.year === hoverYear);
    const r = renterPoints.find(p => p.year === hoverYear);
    if (!o || !r) return null;
    const snap = hoverYear > 0 ? result.yearByYear.find(y => y.year === hoverYear) ?? null : null;
    return {
      year: hoverYear, owner: o.value, renter: r.value,
      inPlaceRent: snap ? snap.renterAnnualRent / 12 : null,
      marketRent: snap ? snap.marketMonthlyRent : null,
      ownerMonthlyPayment: snap ? snap.ownerMonthlyPayment : null,
    };
  }, [hoverYear, ownerPoints, renterPoints, result.yearByYear]);

  const activeEventData = useMemo(() => activeEvent ? events.find(e => e.id === activeEvent) ?? null : null, [activeEvent, events]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const yr = Math.max(0, Math.min(xMax, Math.round(x.invert(e.clientX - rect.left))));
    setHoverYear(yr);
    const cRect = containerRef.current?.getBoundingClientRect();
    if (cRect) setCursorPos({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
  }, [x, xMax]);
  const handleLeave = useCallback(() => { setHoverYear(null); setCursorPos(null); }, []);

  const gridColor = isDark ? 'rgba(252,252,252,0.05)' : 'rgba(50,48,47,0.055)';
  const axisColor = isDark ? 'rgba(252,252,252,0.12)' : 'rgba(50,48,47,0.12)';
  const labelColor = isDark ? 'rgba(201,198,196,0.75)' : 'rgba(104,102,100,0.9)';
  const textColor = isDark ? '#FCFCFC' : '#32302F';
  const bgColor = isDark ? '#1C1B1B' : '#F5F3EF';
  const surfaceColor = isDark ? '#272523' : '#FCFCFC';
  const borderColor = isDark ? 'rgba(148,144,141,0.25)' : '#E4E2E1';
  const labelHalo = bgColor;
  const pillBg = isDark ? 'rgba(28,27,27,0.88)' : 'rgba(245,243,239,0.94)';

  const advantage = result.exit.netAdvantageToOwner;
  const winner = advantage > 5000 ? 'buy' : advantage < -5000 ? 'rent' : 'tie';

  const ownerLabelValue = phase >= 14
    ? ownerExitValue
    : (ownerPoints[ownerPoints.length - 1]?.value ?? 0);
  const renterLabelValue = phase >= 14
    ? renterExitValue
    : (renterPoints[renterPoints.length - 1]?.value ?? 0);
  const ownerEndRawY = phase >= 4 ? y(ownerLabelValue) : 0;
  const renterEndRawY = phase >= 9 ? y(renterLabelValue) : 0;
  const MIN_GAP = 26;
  let ownerLabelY = ownerEndRawY;
  let renterLabelY = renterEndRawY;
  if (phase >= 9 && Math.abs(ownerEndRawY - renterEndRawY) < MIN_GAP) {
    const mid = (ownerEndRawY + renterEndRawY) / 2;
    ownerLabelY = ownerEndRawY <= renterEndRawY ? mid - MIN_GAP / 2 : mid + MIN_GAP / 2;
    renterLabelY = ownerEndRawY <= renterEndRawY ? mid + MIN_GAP / 2 : mid - MIN_GAP / 2;
  }

  const showXAxis = phase >= 2;
  const showYAxis = phase >= 4;
  const showGrid = phase >= 4;

  const tooltipLeft = cursorPos ? (cursorPos.x > width * 0.58 ? cursorPos.x - 168 : cursorPos.x + 16) : 0;
  const tooltipTop = cursorPos ? Math.max(8, cursorPos.y - 60) : 0;

  const renterYear0 = renterPoints[0]?.value ?? 0;

  const futurePayoffYear = inputs.amortizationYears > inputs.holdingPeriodYears ? inputs.amortizationYears : null;

  // Line isolation: owner d-transition is instant when renter-only phase, vice versa
  const ownerDTransition = activeSide === 'renter'
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] };
  const renterDTransition = activeSide === 'owner'
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number] };

  // Label pill dimensions (two-line: name + wealth value)
  const ownerValueStr = fmtWealth(ownerLabelValue);
  const renterValueStr = fmtWealth(renterLabelValue);
  const ownerPillWidth = Math.max(ownerLabel.length * 7.2 + 16, ownerValueStr.length * 8 + 16, 56);
  const renterPillWidth = Math.max(renterLabel.length * 7.2 + 16, renterValueStr.length * 8 + 16, 56);

  // Name from ownerLabel (strip " buys" suffix if present, otherwise use as-is)
  const displayName = ownerLabel.endsWith(' buys') ? ownerLabel.slice(0, -5) : null;

  // Progressive visual commitment of the owner line through phases 5–8.
  // Each phase adds a confirmed parameter: price (5), down payment (6), rate (7), amort (8).
  // The line transitions from dashed+translucent toward fully solid.
  const ownerLineDash: string =
    phase === 4 ? '7 5' :
    phase === 5 ? '4 3' :
    phase === 6 ? '2 1.5' :
    '1000 0';
  const ownerLineOpacity: number =
    phase === 4 ? 0.45 :
    phase === 5 ? 0.68 :
    phase === 6 ? 0.88 :
    1.0;

  return (
    <div ref={containerRef} className="relative h-full w-full" style={{ backgroundColor: bgColor }}>

      {/* Outcome headline — handled by the hero banner in page.tsx at phase 14 */}

      {/* Narrative progress header — fills in as user answers each phase */}
      {phase >= 1 && phase < 14 && (
        <motion.div
          key="narrative-header"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'absolute',
            top: '10px',
            left: `${MARGIN.left}px`,
            right: `${MARGIN.right + 4}px`,
            fontFamily: 'var(--font-sans), system-ui, sans-serif',
            fontSize: '12.5px',
            letterSpacing: '0.01em',
            color: isDark ? 'rgba(201,198,196,0.80)' : 'rgba(80,78,76,0.82)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 8,
          }}
        >
          <span style={{ fontFamily: 'var(--font-serif), Georgia, serif', fontStyle: 'italic', letterSpacing: '-0.01em', color: isDark ? 'rgba(252,252,252,0.90)' : 'rgba(50,48,47,0.90)' }}>
            {displayName ?? '______'}
          </span>
          {' buys or rents in '}
          {phase >= 3 ? (PROVINCE_NAMES[inputs.province] ?? inputs.province) : '______'}
          {' with '}
          {phase >= 4 ? `${Math.round(inputs.downPaymentPct * 100)}%` : '______'}
          {' down'}
          {phase >= 5 && (
            <>{' · '}<span style={{ color: OWNER_COLOR }}>{fmtWealth(inputs.homePrice)}</span></>
          )}
          {phase >= 6 && inputs.homeType && (
            <>{' '}<span style={{ opacity: 0.7 }}>{
              inputs.homeType === 'condo-apt' ? 'condo' :
              inputs.homeType === 'condo-townhouse' ? 'condo TH' :
              inputs.homeType === 'freehold-townhouse' ? 'freehold TH' :
              inputs.homeType === 'semi-detached' ? 'semi' :
              'detached'
            }</span></>
          )}
        </motion.div>
      )}

      <svg width={width} height={height} role="img" aria-label={`Wealth map over ${xMax} years`}>
        <defs>
          <clipPath id="chart-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

          {/* Province stamp — top-right of chart, persists from phase 3; hidden on narrow to avoid overlap with narrative header */}
          {!isNarrow && phase >= 3 && phase < 14 && (
            <motion.text
              x={innerWidth}
              y={-22}
              textAnchor="end"
              fontSize={11}
              fill={isDark ? 'rgba(252,252,252,0.35)' : 'rgba(50,48,47,0.3)'}
              fontFamily="var(--font-sans), system-ui, sans-serif"
              letterSpacing="0.1em"
              style={{ textTransform: 'uppercase' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {PROVINCE_NAMES[inputs.province] ?? inputs.province}
            </motion.text>
          )}

          {/* Gridlines */}
          <AnimatePresence>
            {yTicks.map((t, i) => (
              <motion.g
                key={i}
                animate={{ y: y(t) }}
                initial={{ y: y(t) }}
                transition={{ type: 'spring', stiffness: 180, damping: 26, mass: 0.7 }}
              >
                <motion.line
                  x1={0} x2={innerWidth}
                  stroke={gridColor} strokeWidth={1}
                  animate={{ opacity: showGrid ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                />
                <motion.text
                  x={-10} dy="0.32em" textAnchor="end" fontSize={11}
                  fill={labelColor} fontFamily="var(--font-sans), system-ui, sans-serif"
                  animate={{ opacity: showYAxis ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: showYAxis ? 0.15 : 0 }}
                >
                  {fmtWealth(t)}
                </motion.text>
              </motion.g>
            ))}
          </AnimatePresence>

          {/* X axis */}
          <g transform={`translate(0,${innerHeight})`}>
            <motion.line
              x1={0} x2={innerWidth} stroke={axisColor} strokeWidth={1}
              animate={{ opacity: showXAxis ? 1 : 0 }}
              transition={{ duration: 0.5 }}
            />
            {xTicks.map(t => (
              <motion.g
                key={t}
                animate={{ x: x(t), opacity: showXAxis ? 1 : 0 }}
                initial={{ x: x(t), opacity: 0 }}
                transition={{ x: { type: 'spring', stiffness: 180, damping: 26 }, opacity: { duration: 0.4 } }}
              >
                <line y2={4} stroke={axisColor} />
                <text y={16} textAnchor="middle" fontSize={11} fill={labelColor} fontFamily="var(--font-sans), system-ui, sans-serif">
                  {t === 0 ? 'Now' : `Yr ${t}`}
                </text>
              </motion.g>
            ))}
          </g>

          {/* Negative zone — tinted red below zero */}
          {yMin < 0 && y(0) < innerHeight && (
            <rect
              x={0} y={y(0)} width={innerWidth}
              height={Math.max(0, innerHeight - y(0))}
              fill={isDark ? 'rgba(220,60,40,0.07)' : 'rgba(200,40,20,0.05)'}
            />
          )}

          {/* Zero line */}
          {yMin < 0 && <line x1={0} x2={innerWidth} y1={y(0)} y2={y(0)} stroke={isDark ? 'rgba(220,80,60,0.35)' : 'rgba(200,40,20,0.30)'} strokeDasharray="4 4" strokeWidth={1.5} />}

          {/* Intro wandering placeholder lines (phases 0–3). AnimatePresence gives them a
              graceful exit when phase 4 is entered — they slide down and fade before the
              owner data line draws in at phase 5. */}
          <AnimatePresence>
            {phase <= 3 && innerWidth > 0 && ownerRaceA && renterRaceA && (
              <motion.g
                key="intro-lines"
                initial={{ opacity: 1, y: 0 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24, transition: { duration: 0.55, ease: [0.4, 0, 1, 1] } }}
              >
                <motion.path
                  d={ownerRaceA}
                  animate={{
                    d: [ownerRaceA, ownerRaceB, ownerRaceC, ownerRaceA],
                    strokeWidth: [2.5, 3.5, 1.8, 2.5],
                  }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
                  fill="none" stroke={OWNER_COLOR} strokeOpacity={0.72}
                />
                <motion.path
                  d={renterRaceA}
                  animate={{
                    d: [renterRaceA, renterRaceB, renterRaceC, renterRaceA],
                    strokeWidth: [2.5, 1.8, 3.5, 2.5],
                  }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.3, repeatDelay: 0.5 }}
                  fill="none" stroke={RENTER_COLOR} strokeOpacity={0.72}
                />
                <motion.text
                  dy="0.32em"
                  fontSize={9}
                  fill={OWNER_COLOR}
                  fillOpacity={0.85}
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  fontWeight={500}
                  initial={{ x: innerWidth + 4, y: innerHeight * 0.35 }}
                  animate={{
                    x: [innerWidth + 4, innerWidth + 4, innerWidth * 0.78 + 4, innerWidth + 4],
                    y: [innerHeight * 0.35, innerHeight * 0.11, innerHeight * 0.25, innerHeight * 0.35],
                  }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.5 }}
                >
                  {ownerLabel}?
                </motion.text>
                <motion.text
                  dy="0.32em"
                  fontSize={9}
                  fill={RENTER_COLOR}
                  fillOpacity={0.85}
                  fontFamily="var(--font-sans), system-ui, sans-serif"
                  fontWeight={500}
                  initial={{ x: innerWidth + 4, y: innerHeight * 0.43 }}
                  animate={{
                    x: [innerWidth + 4, innerWidth * 0.72 + 4, innerWidth + 4, innerWidth + 4],
                    y: [innerHeight * 0.43, innerHeight * 0.52, innerHeight * 0.05, innerHeight * 0.43],
                  }}
                  transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.3, repeatDelay: 0.5 }}
                >
                  {renterLabel}?
                </motion.text>
              </motion.g>
            )}
          </AnimatePresence>

          {/* Break-even guide */}
          {result.breakEvenYear !== null && phase >= 9 && (
            <g transform={`translate(${x(result.breakEvenYear)},0)`}>
              <line y1={0} y2={innerHeight} stroke={CROSS_COLOR} strokeDasharray="3 5" strokeOpacity={0.4} strokeWidth={1.5} />
            </g>
          )}

          {/* Mortgage-free year — top-left label, shown from phase 7 once amort is confirmed */}
          {phase >= 7 && (
            <motion.text
              x={0} y={-22}
              fontSize={10} fill={OWNER_COLOR} fillOpacity={0.5}
              fontFamily="var(--font-sans), system-ui, sans-serif"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Mortgage-free yr {inputs.amortizationYears}
            </motion.text>
          )}

          {/* Post-payoff acceleration zone */}
          {inputs.amortizationYears < inputs.holdingPeriodYears && phase >= 4 && (
            <motion.g
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <rect
                x={x(inputs.amortizationYears)}
                y={0}
                width={Math.max(1, x(inputs.holdingPeriodYears) - x(inputs.amortizationYears))}
                height={innerHeight}
                fill={OWNER_COLOR}
                fillOpacity={0.04}
              />
              <line
                x1={x(inputs.amortizationYears)} y1={0}
                x2={x(inputs.amortizationYears)} y2={innerHeight}
                stroke={OWNER_COLOR} strokeWidth={1.5} strokeOpacity={0.35} strokeDasharray="3 4"
              />
              <text
                x={x(inputs.amortizationYears) + 5} y={10}
                fontSize={8} fill={OWNER_COLOR} fillOpacity={0.45}
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                payoff
              </text>
            </motion.g>
          )}

          {/* Interline fill (both lines present) */}
          {phase >= 9 && (
            <g clipPath="url(#chart-clip)">
              <motion.path d={renterLeadPath} fill={RENTER_COLOR} fillOpacity={0.09} stroke="none"
                initial={{ opacity: 0 }} animate={{ opacity: 1, d: renterLeadPath }}
                transition={{ duration: 0.35 }} />
              <motion.path d={ownerLeadPath} fill={OWNER_COLOR} fillOpacity={0.09} stroke="none"
                initial={{ opacity: 0 }} animate={{ opacity: 1, d: ownerLeadPath }}
                transition={{ duration: 0.35 }} />
            </g>
          )}

          {/* Sensitivity bands */}
          {ownerBandPath && <motion.path d={ownerBandPath} fill={OWNER_COLOR} fillOpacity={0.06} stroke="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />}
          {renterBandPath && <motion.path d={renterBandPath} fill={RENTER_COLOR} fillOpacity={0.06} stroke="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }} />}

          {/* Exit haircut dashed segments (results phase only) */}
          {phase >= 14 && (
            <>
              <motion.line
                x1={x(exitYear)} y1={y(ownerPoints[ownerPoints.length - 1]?.value ?? 0)}
                x2={x(exitYear)} y2={y(ownerExitValue)}
                stroke={OWNER_COLOR} strokeWidth={1.5} strokeDasharray="3 4" strokeOpacity={0.55}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.4 }}
              />
              <motion.circle
                cx={x(exitYear)} cy={y(ownerExitValue)} r={4}
                fill={OWNER_COLOR} fillOpacity={0.85}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24, delay: 0.55 }}
              />
              <motion.line
                x1={x(exitYear)} y1={y(renterPoints[renterPoints.length - 1]?.value ?? 0)}
                x2={x(exitYear)} y2={y(renterExitValue)}
                stroke={RENTER_COLOR} strokeWidth={1.5} strokeDasharray="3 4" strokeOpacity={0.55}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.4 }}
              />
              <motion.circle
                cx={x(exitYear)} cy={y(renterExitValue)} r={4}
                fill={RENTER_COLOR} fillOpacity={0.85}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 340, damping: 24, delay: 0.55 }}
              />
            </>
          )}

          {/* Owner line (phase 4+) — progressive commitment: dashed+translucent at phase 4,
              solidifying through phases 5–6, fully solid at phase 7+ */}
          {phase >= 4 && ownerPath && (
            <motion.path
              d={ownerPath} fill="none" stroke={OWNER_COLOR} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              initial={ownerDrawn ? false : { pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: 1,
                d: ownerPath,
                strokeDasharray: ownerLineDash,
                strokeOpacity: ownerLineOpacity,
              }}
              transition={ownerDrawn
                ? {
                    pathLength: { duration: 0 },
                    opacity: { duration: 0 },
                    d: ownerDTransition,
                    strokeDasharray: { duration: 0.45, ease: 'easeOut' },
                    strokeOpacity: { duration: 0.45, ease: 'easeOut' },
                  }
                : { duration: 1.6, ease: [0.4, 0, 0.2, 1] }
              }
            />
          )}

          {/* Renter line (phase 9+) */}
          {phase >= 9 && renterPath && (
            <motion.path
              d={renterPath} fill="none" stroke={RENTER_COLOR} strokeWidth={2.5}
              strokeLinecap="round" strokeLinejoin="round"
              initial={renterDrawn ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1, d: renterPath }}
              transition={renterDrawn
                ? { pathLength: { duration: 0 }, opacity: { duration: 0 }, d: renterDTransition }
                : { duration: 1.6, ease: [0.4, 0, 0.2, 1] }
              }
            />
          )}

          {/* Year-0 anchor dot — appears at phase 4 when down payment sets the starting position */}
          {drawn && phase >= 4 && phase < 8 && (
            <motion.circle
              cx={x(0)}
              cy={y(ownerPoints[0]?.value ?? 0)}
              r={3.5}
              fill={OWNER_COLOR}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: phase >= 7 ? 0 : 0.65 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22, delay: 0.15 }}
            />
          )}

          {/* Owner label pill — appears at phase 7 once the line is nearly committed */}
          {drawn && phase >= 7 && (
            <motion.g
              initial={{ opacity: 0, y: ownerLabelY }}
              animate={{ opacity: 1, y: ownerLabelY }}
              transition={{
                opacity: { duration: 0.4, delay: ownerDrawn ? 1.7 : 0.3 },
                y: ownerDTransition,
              }}
            >
              <rect x={innerWidth + 6} y={-14} width={ownerPillWidth} height={28} rx={3} fill={pillBg} />
              <text x={innerWidth + 12} y={-4} dy="0.32em" fontSize={10} fill={OWNER_COLOR} fontWeight={500} fontFamily="var(--font-sans), system-ui, sans-serif">
                {ownerLabel}
              </text>
              <text x={innerWidth + 12} y={10} dy="0.32em" fontSize={13} fill={OWNER_COLOR} fontWeight={600} fontFamily="var(--font-serif), Georgia, serif">
                {ownerValueStr}
              </text>
            </motion.g>
          )}
          {drawn && phase >= 9 && (
            <motion.g
              initial={{ opacity: 0, y: renterLabelY }}
              animate={{ opacity: 1, y: renterLabelY }}
              transition={{
                opacity: { duration: 0.4, delay: renterDrawn ? 1.7 : 0.3 },
                y: renterDTransition,
              }}
            >
              <rect x={innerWidth + 6} y={-14} width={renterPillWidth} height={28} rx={3} fill={pillBg} />
              <text x={innerWidth + 12} y={-4} dy="0.32em" fontSize={10} fill={RENTER_COLOR} fontWeight={500} fontFamily="var(--font-sans), system-ui, sans-serif">
                {renterLabel}
              </text>
              <text x={innerWidth + 12} y={10} dy="0.32em" fontSize={13} fill={RENTER_COLOR} fontWeight={600} fontFamily="var(--font-serif), Georgia, serif">
                {renterValueStr}
              </text>
            </motion.g>
          )}
          {drawn && phase >= 14 && (
            <motion.text
              x={innerWidth + 8}
              dy="0.35em"
              fontSize={9}
              fill={labelColor}
              fontFamily="var(--font-sans), system-ui, sans-serif"
              initial={{ opacity: 0, y: Math.max(ownerLabelY, renterLabelY) + 22 }}
              animate={{ opacity: 1, y: Math.max(ownerLabelY, renterLabelY) + 22 }}
              transition={{
                opacity: { duration: 0.4, delay: 0.8 },
                y: { type: 'spring', stiffness: 180, damping: 28 },
              }}
            >
              after exit costs
            </motion.text>
          )}

          {/* Inline event callout labels */}
          {drawn && events.map((ev, idx) => {
            const cx = x(ev.year);
            const rawCy = y(ev.yValue);
            const isActive = ev.id === activeEvent;
            const color = ev.side === 'owner' ? OWNER_COLOR : ev.side === 'renter' ? RENTER_COLOR : CROSS_COLOR;
            const above = rawCy > innerHeight * 0.5;
            const labelY = rawCy + (above ? -26 : 26);
            let textAnchor: 'start' | 'middle' | 'end' = 'middle';
            let labelX = cx;
            if (cx < innerWidth * 0.12) { textAnchor = 'start'; labelX = cx; }
            else if (cx > innerWidth * 0.88) { textAnchor = 'end'; labelX = cx; }

            return (
              <motion.g key={ev.id} onClick={() => onEventClick(isActive ? null : ev.id)} style={{ cursor: 'pointer' }}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.04 * idx + 0.2 }}>
                <line x1={cx} y1={rawCy + (above ? -7 : 7)} x2={labelX} y2={labelY + (above ? 10 : -10)}
                  stroke={color} strokeOpacity={0.25} strokeWidth={1} />
                <text x={labelX} y={labelY} textAnchor={textAnchor} fontSize={9.5}
                  fontFamily="var(--font-sans), system-ui, sans-serif" fontWeight={500} fill={color}
                  stroke={labelHalo} strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"
                  fillOpacity={isActive ? 1 : 0.9}>
                  {ev.line1}
                </text>
                {ev.line2 && (
                  <text x={labelX} y={labelY + 12} textAnchor={textAnchor} fontSize={8.5}
                    fontFamily="var(--font-sans), system-ui, sans-serif" fill={color}
                    stroke={labelHalo} strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"
                    fillOpacity={isActive ? 0.9 : 0.65}>
                    {ev.line2}
                  </text>
                )}
                {isActive && <circle cx={cx} cy={rawCy} r={11} fill={color} fillOpacity={0.12} stroke="none" />}
                <circle cx={cx} cy={rawCy} r={isActive ? 6 : 5} fill={bgColor} stroke={color} strokeWidth={2} />
                {!ev.isPositive && <circle cx={cx} cy={rawCy} r={2} fill={color} fillOpacity={0.9} />}
                {ev.isPositive && ev.amount > 0 && <circle cx={cx} cy={rawCy} r={1.5} fill={color} fillOpacity={0.7} />}
                {ev.side === 'both' && (
                  <path d={`M ${cx - 3},${rawCy - 3} L ${cx + 3},${rawCy + 3} M ${cx - 3},${rawCy + 3} L ${cx + 3},${rawCy - 3}`}
                    stroke={color} strokeWidth={1.5} strokeOpacity={0.8} />
                )}
              </motion.g>
            );
          })}


          {/* Hover crosshair */}
          {hoverData && (
            <g transform={`translate(${x(hoverData.year)},0)`}>
              <line y1={0} y2={innerHeight} stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'} strokeWidth={1} />
              {phase >= 4 && <circle cy={y(hoverData.owner)} r={4.5} fill={OWNER_COLOR} />}
              {phase >= 9 && <circle cy={y(hoverData.renter)} r={4.5} fill={RENTER_COLOR} />}
            </g>
          )}

          {/* Mouse capture */}
          <rect x={0} y={0} width={innerWidth} height={innerHeight} fill="transparent" onMouseMove={handleMouseMove} onMouseLeave={handleLeave} />
        </g>
      </svg>

      {/* Floating hover tooltip — text uses dark/light textColor for readability */}
      <AnimatePresence>
        {hoverData && cursorPos && (
          <motion.div key="tooltip"
            initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.08 }}
            style={{ position: 'absolute', left: tooltipLeft, top: tooltipTop, pointerEvents: 'none', zIndex: 20, width: '180px', backgroundColor: surfaceColor, border: `1px solid ${borderColor}`, borderRadius: '7px', padding: '10px 13px', color: textColor }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.07em', opacity: 0.4, marginBottom: '8px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>YEAR {hoverData.year}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {phase >= 4 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: OWNER_COLOR, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: textColor, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{ownerLabel}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: textColor, fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 500 }}>{fmtWealth(hoverData.owner)}</span>
                </div>
              )}
              {phase >= 9 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', backgroundColor: RENTER_COLOR, flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', color: textColor, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{renterLabel}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: textColor, fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 500 }}>{fmtWealth(hoverData.renter)}</span>
                </div>
              )}
              {/* Year-0 breakdown — explains different starting positions */}
              {phase >= 4 && hoverData.year === 0 && (
                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {phase >= 4 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '9.5px', color: OWNER_COLOR, opacity: 0.75, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Down payment equity</span>
                      <span style={{ fontSize: '9.5px', color: OWNER_COLOR, opacity: 0.75, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{Math.round(inputs.downPaymentPct * 100)}% of home</span>
                    </div>
                  )}
                  {phase >= 9 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '9.5px', color: RENTER_COLOR, opacity: 0.75, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Invested equivalent</span>
                      <span style={{ fontSize: '9.5px', color: RENTER_COLOR, opacity: 0.75, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>down pmt − deposit</span>
                    </div>
                  )}
                </div>
              )}
              {phase >= 9 && hoverData.year > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '10px', opacity: 0.4, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{hoverData.owner > hoverData.renter ? 'Buy leads' : 'Rent leads'}</span>
                  <span style={{ fontSize: '12px', color: hoverData.owner > hoverData.renter ? OWNER_COLOR : RENTER_COLOR, fontFamily: 'var(--font-serif), Georgia, serif' }}>
                    +{fmtWealth(Math.abs(hoverData.owner - hoverData.renter))}
                  </span>
                </div>
              )}
              {phase >= 9 && hoverData.inPlaceRent != null && hoverData.year > 0 && (
                <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '10px', color: textColor, opacity: 0.6, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>In-place rent</span>
                    <span style={{ fontSize: '10px', color: textColor, opacity: 0.8, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{fmtWealth(hoverData.inPlaceRent)}/mo</span>
                  </div>
                  {hoverData.marketRent != null && hoverData.marketRent - hoverData.inPlaceRent > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '10px', opacity: 0.38, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Market rent</span>
                      <span style={{ fontSize: '10px', opacity: 0.38, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{fmtWealth(hoverData.marketRent)}/mo</span>
                    </div>
                  )}
                  {hoverData.marketRent != null && hoverData.marketRent - hoverData.inPlaceRent > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '10px', color: RENTER_COLOR, opacity: 0.75, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>Staying saves</span>
                      <span style={{ fontSize: '10px', color: RENTER_COLOR, opacity: 0.75, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{fmtWealth(hoverData.marketRent - hoverData.inPlaceRent)}/mo</span>
                    </div>
                  )}
                </div>
              )}
              {phase >= 4 && hoverData.ownerMonthlyPayment != null && hoverData.ownerMonthlyPayment > 0 && hoverData.year > 0 && hoverData.year <= inputs.amortizationYears && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '10px', color: textColor, opacity: 0.5, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>P+I</span>
                  <span style={{ fontSize: '10px', color: textColor, opacity: 0.7, fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>{fmtWealth(hoverData.ownerMonthlyPayment)}/mo</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Event detail card */}
      <AnimatePresence>
        {activeEventData && !hoverData && (
          <motion.div key="event-card"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            style={{ position: 'absolute', right: '24px', top: phase >= 14 ? '80px' : '24px', zIndex: 20, maxWidth: '228px', backgroundColor: surfaceColor, border: `1px solid ${borderColor}`, borderRadius: '8px', padding: '14px 16px', color: textColor }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '10px', letterSpacing: '0.06em', color: activeEventData.side === 'owner' ? OWNER_COLOR : activeEventData.side === 'renter' ? RENTER_COLOR : CROSS_COLOR, marginBottom: '3px', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                  YR {activeEventData.year} · {activeEventData.side === 'both' ? 'CROSSOVER' : activeEventData.side.toUpperCase()}
                </p>
                <p style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.3 }}>{activeEventData.line1}</p>
              </div>
              {activeEventData.amount !== 0 && (
                <p style={{ fontSize: '17px', fontFamily: 'var(--font-serif), Georgia, serif', color: activeEventData.isPositive ? (isDark ? '#99B56E' : '#486635') : (isDark ? '#FF8A71' : '#A43D12'), flexShrink: 0, letterSpacing: '-0.02em' }}>
                  {activeEventData.isPositive ? '+' : ''}{fmtFull.format(activeEventData.amount)}
                </p>
              )}
            </div>
            <p style={{ marginTop: '8px', fontSize: '12px', lineHeight: 1.55, opacity: 0.55 }}>{activeEventData.description}</p>
            <button onClick={() => onEventClick(null)} style={{ marginTop: '10px', fontSize: '11px', opacity: 0.38, background: 'none', border: 'none', cursor: 'pointer', color: textColor, padding: 0 }}>Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom legend */}
      {!hoverData && phase >= 7 && (
        <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', fontSize: '11px', color: labelColor, fontFamily: 'var(--font-sans), system-ui, sans-serif', pointerEvents: 'none' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', height: '2px', width: '16px', borderRadius: '2px', backgroundColor: OWNER_COLOR }} />{ownerLabel}
          </span>
          {phase >= 9 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', height: '2px', width: '16px', borderRadius: '2px', backgroundColor: RENTER_COLOR }} />{renterLabel}
            </span>
          )}
          {bands && <span style={{ opacity: 0.5 }}>Shaded = ±2% uncertainty</span>}
        </div>
      )}
    </div>
  );
}
