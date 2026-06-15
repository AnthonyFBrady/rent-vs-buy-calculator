'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { scaleLinear } from '@visx/scale';
import { ParentSize } from '@visx/responsive';
import { line as d3Line, area as d3Area, curveCatmullRom } from 'd3-shape';
import type { YearSnapshot } from '@/engine';

export interface DataPoint {
  year: number;
  value: number;
}

export interface BandPoint {
  year: number;
  lo: number;
  hi: number;
}

export interface WealthChartProps {
  ownerData: DataPoint[];
  renterData: DataPoint[];
  ownerBand?: BandPoint[];
  renterBand?: BandPoint[];
  breakEvenYear?: number | null;
  holdingPeriodYears: number;
  height?: number;
  animateOnMount?: boolean;
  ownerMoveYears?: number[];
  renterMoveYears?: number[];
  ownerSubLabel?: string;
  renterSubLabel?: string;
  yearlyBreakdown?: YearSnapshot[];
}

function computeMoveMarkers(
  years: number[],
  data: DataPoint[],
  xScale: (v: number) => number,
  yScale: (v: number) => number,
): Array<{ bx: number; by: number; key: number }> {
  return years.flatMap(y => {
    const d = data.find(p => p.year === y);
    if (!d) return [];
    return [{ bx: xScale(y), by: yScale(d.value), key: y }];
  });
}

function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function fmtK(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
  return `${sign}$${Math.round(abs)}`;
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipRow {
  label: string;
  value: string;
  indent?: boolean;
  dim?: boolean;
  color?: string;
}

function TRow({ label, value, indent, dim, color }: TooltipRow) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: 8,
      paddingLeft: indent ? 10 : 0,
    }}>
      <span style={{
        fontSize: 11,
        color: dim ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11,
        fontWeight: dim ? 400 : 500,
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        color: color ?? (dim ? 'var(--color-text-faint)' : 'var(--color-text)'),
        whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: 'var(--color-chart-tooltip-border)', margin: '6px 0' }} />;
}

interface DetailedTooltipProps {
  year: number;
  ownerWealth: number;
  renterWealth: number | null;
  snapshot: YearSnapshot | null;
  hasRenter: boolean;
}

function DetailedTooltip({ year, ownerWealth, renterWealth, snapshot, hasRenter }: DetailedTooltipProps) {
  const advantage = renterWealth != null ? ownerWealth - renterWealth : null;

  return (
    <div style={{
      backgroundColor: 'var(--color-chart-tooltip-bg)',
      border: '1px solid var(--color-chart-tooltip-border)',
      borderRadius: 10,
      padding: '12px 14px',
      color: 'var(--color-text)',
      width: 220,
    }}>
      {/* Year header */}
      <p style={{
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        marginBottom: 8,
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
        color: 'var(--color-text)',
      }}>
        {year === 0 ? 'Today' : `Year ${year}`}
      </p>

      {/* Owner section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-owner)', flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-owner)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
          Owner — {fmt(ownerWealth)}
        </span>
      </div>

      {snapshot && (
        <>
          <TRow label="Home value" value={fmtK(snapshot.ownerHomeValue)} indent />
          <TRow label="Mortgage" value={`−${fmtK(snapshot.ownerMortgageBalance)}`} indent dim />
          <TRow label="Equity" value={fmtK(snapshot.ownerEquity)} indent />
          {snapshot.ownerPortfolioEnd > 100 && (
            <TRow label="Portfolio" value={fmtK(snapshot.ownerPortfolioEnd)} indent />
          )}
          <Divider />
          <TRow label="Costs this year" value={fmtK(snapshot.ownerAnnualCashOut)} indent />
          <TRow label="  Mortgage P+I" value={fmtK(snapshot.ownerAnnualMortgagePayment)} indent dim />
          <TRow label="  Tax" value={fmtK(snapshot.ownerAnnualPropertyTax)} indent dim />
          <TRow label="  Maintenance" value={fmtK(snapshot.ownerAnnualMaintenance)} indent dim />
          {snapshot.ownerAnnualStrata > 0 && (
            <TRow label="  Strata" value={fmtK(snapshot.ownerAnnualStrata)} indent dim />
          )}
        </>
      )}

      {hasRenter && renterWealth != null && (
        <>
          <div style={{ height: 8 }} />

          {/* Renter section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-renter)', flexShrink: 0, display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-renter)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
              Renter — {fmt(renterWealth)}
            </span>
          </div>

          {snapshot && (
            <>
              <TRow label="Portfolio" value={fmtK(snapshot.renterPortfolioEnd)} indent />
              {snapshot.renterRrspBalance > 100 && (
                <TRow label="RRSP" value={fmtK(snapshot.renterRrspBalance)} indent dim />
              )}
              <Divider />
              <TRow label="Rent this year" value={fmtK(snapshot.renterAnnualRent)} indent />
              <TRow label="Invested this year" value={fmtK(snapshot.renterPortfolioContribution)} indent dim />
            </>
          )}

          {/* Advantage */}
          {advantage != null && (
            <>
              <Divider />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
                  {advantage > 0 ? 'Buy leads' : 'Rent leads'}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'var(--font-sans), system-ui, sans-serif',
                  color: advantage > 0 ? 'var(--color-owner)' : 'var(--color-renter)',
                }}>
                  +{fmt(Math.abs(advantage))}
                </span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Chart inner ─────────────────────────────────────────────────────────────

interface ChartInnerProps extends WealthChartProps {
  width: number;
}

function ChartInner({
  width,
  ownerData,
  renterData,
  ownerBand,
  renterBand,
  breakEvenYear,
  holdingPeriodYears,
  height = 340,
  animateOnMount = true,
  ownerMoveYears,
  renterMoveYears,
  ownerSubLabel,
  renterSubLabel,
  yearlyBreakdown,
}: ChartInnerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [vpCursor, setVpCursor] = useState<{ x: number; y: number } | null>(null);

  const isNarrow = width < 480;
  const hasSubLabels = !!ownerSubLabel || !!renterSubLabel;
  const MARGIN = {
    top: 28,
    right: isNarrow ? 70 : (hasSubLabels ? 130 : 92),
    bottom: 36,
    left: isNarrow ? 44 : 64,
  };
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const hasRenter = renterData.length > 0;

  // Domain
  const allValues = [
    ...ownerData.map(d => d.value),
    ...(hasRenter ? renterData.map(d => d.value) : []),
    ...(ownerBand?.flatMap(d => [d.lo, d.hi]) ?? []),
    ...(hasRenter && renterBand ? renterBand.flatMap(d => [d.lo, d.hi]) : []),
  ];
  const yRawMin = Math.min(...allValues, 0);
  const yRawMax = Math.max(...allValues, 1);

  const xScale = useMemo(() => scaleLinear({
    domain: [0, holdingPeriodYears],
    range: [0, innerWidth],
  }), [holdingPeriodYears, innerWidth]);

  const yScale = useMemo(() => scaleLinear({
    domain: [yRawMin, yRawMax],
    range: [innerHeight, 0],
    nice: true,
  }), [yRawMin, yRawMax, innerHeight]);

  // Path generators
  const lineGen = useMemo(() =>
    d3Line<DataPoint>()
      .x(d => xScale(d.year))
      .y(d => yScale(d.value))
      .curve(curveCatmullRom.alpha(0.5)),
    [xScale, yScale]);

  const bandGen = useMemo(() =>
    d3Area<BandPoint>()
      .x(d => xScale(d.year))
      .y0(d => yScale(d.lo))
      .y1(d => yScale(d.hi))
      .curve(curveCatmullRom.alpha(0.5)),
    [xScale, yScale]);

  const fillGen = useMemo(() =>
    d3Area<DataPoint>()
      .x(d => xScale(d.year))
      .y0(innerHeight)
      .y1(d => yScale(d.value))
      .curve(curveCatmullRom.alpha(0.5)),
    [xScale, yScale, innerHeight]);

  const ownerPath      = lineGen(ownerData)  ?? '';
  const renterPath     = lineGen(renterData) ?? '';
  const ownerFillPath  = fillGen(ownerData)  ?? '';
  const renterFillPath = hasRenter ? (fillGen(renterData) ?? '') : '';
  const ownerBandPath  = ownerBand  ? (bandGen(ownerBand)  ?? '') : '';
  const renterBandPath = renterBand ? (bandGen(renterBand) ?? '') : '';

  // Tick generation
  const yTicks = yScale.ticks(isNarrow ? 3 : 5);
  const tickInterval = holdingPeriodYears <= 10 ? 2 : 5;
  const xTicks = Array.from(
    { length: Math.floor(holdingPeriodYears / tickInterval) + 1 },
    (_, i) => i * tickInterval,
  ).filter(t => t <= holdingPeriodYears);

  // End label positions
  const ownerEndValue  = ownerData[ownerData.length - 1]?.value  ?? 0;
  const renterEndValue = renterData[renterData.length - 1]?.value ?? 0;
  const MIN_GAP = 22;
  let ownerLabelY  = yScale(ownerEndValue);
  let renterLabelY = yScale(renterEndValue);
  if (Math.abs(ownerLabelY - renterLabelY) < MIN_GAP) {
    const mid = (ownerLabelY + renterLabelY) / 2;
    if (ownerLabelY <= renterLabelY) {
      ownerLabelY  = mid - MIN_GAP / 2;
      renterLabelY = mid + MIN_GAP / 2;
    } else {
      ownerLabelY  = mid + MIN_GAP / 2;
      renterLabelY = mid - MIN_GAP / 2;
    }
  }

  // Hover
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const yr = Math.max(0, Math.min(holdingPeriodYears, Math.round(xScale.invert(e.clientX - rect.left))));
    setHoverYear(yr);
    const cRect = containerRef.current?.getBoundingClientRect();
    if (cRect) setCursor({ x: e.clientX - cRect.left, y: e.clientY - cRect.top });
    setVpCursor({ x: e.clientX, y: e.clientY });
  }, [xScale, holdingPeriodYears]);

  const handleLeave = useCallback(() => {
    setHoverYear(null);
    setCursor(null);
    setVpCursor(null);
  }, []);

  const hoverData = useMemo(() => {
    if (hoverYear === null) return null;
    const o = ownerData.find(d => d.year === hoverYear);
    if (!o) return null;
    const r = hasRenter ? renterData.find(d => d.year === hoverYear) : undefined;
    const snap = yearlyBreakdown?.find(y => y.year === hoverYear) ?? null;
    return { year: hoverYear, owner: o.value, renter: r?.value ?? null, snap };
  }, [hoverYear, ownerData, renterData, hasRenter, yearlyBreakdown]);

  const TOOLTIP_W = 220;
  const ttLeft = vpCursor
    ? (typeof window !== 'undefined' && vpCursor.x > window.innerWidth * 0.6
        ? vpCursor.x - TOOLTIP_W - 12
        : vpCursor.x + 16)
    : 0;
  const ttTop = vpCursor ? Math.max(8, vpCursor.y - 60) : 0;

  // Breakeven
  const bx = breakEvenYear != null ? xScale(breakEvenYear) : null;
  const beOwner  = ownerData.find(d => d.year === breakEvenYear);
  const beRenter = renterData.find(d => d.year === breakEvenYear);
  const bAvgY = bx != null && beOwner && beRenter
    ? (yScale(beOwner.value) + yScale(beRenter.value)) / 2
    : null;

  const labelDelay = animateOnMount ? 1.5 : 0.2;

  if (width === 0) return <div style={{ height }} />;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`Wealth comparison over ${holdingPeriodYears} years`}
      >
        <defs>
          <clipPath id="wc-clip">
            <rect x={0} y={0} width={innerWidth} height={innerHeight} />
          </clipPath>
          <linearGradient id="wc-grad-owner" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-owner)', stopOpacity: 0.22 }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-owner)', stopOpacity: 0 }} />
          </linearGradient>
          <linearGradient id="wc-grad-renter" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-renter)', stopOpacity: 0.18 }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-renter)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

          {/* Grid */}
          {yTicks.map(t => (
            <g key={t} transform={`translate(0,${yScale(t)})`}>
              <line x1={0} x2={innerWidth} stroke="var(--color-chart-grid)" strokeWidth={1} strokeDasharray="2 4" />
              <text
                x={-8} dy="0.32em" textAnchor="end"
                fontSize={isNarrow ? 9 : 10}
                fill="var(--color-chart-axis)"
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                {fmt(t)}
              </text>
            </g>
          ))}

          {/* X axis */}
          <line
            x1={0} x2={innerWidth}
            y1={innerHeight} y2={innerHeight}
            stroke="var(--color-chart-grid)" strokeWidth={1}
          />
          {xTicks.map(t => (
            <g key={t} transform={`translate(${xScale(t)},${innerHeight})`}>
              <text
                y={16} textAnchor="middle"
                fontSize={isNarrow ? 9 : 10}
                fill="var(--color-chart-axis)"
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                {t === 0 ? 'Now' : `Yr ${t}`}
              </text>
            </g>
          ))}

          {/* Sensitivity bands */}
          {ownerBandPath && (
            <motion.path
              d={ownerBandPath}
              fill="var(--color-owner-band)"
              stroke="none"
              clipPath="url(#wc-clip)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: labelDelay + 0.2 }}
            />
          )}
          {renterBandPath && (
            <motion.path
              d={renterBandPath}
              fill="var(--color-renter-band)"
              stroke="none"
              clipPath="url(#wc-clip)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: labelDelay + 0.4 }}
            />
          )}

          {/* Area fills */}
          {ownerFillPath && (
            <motion.path
              d={ownerFillPath}
              fill="url(#wc-grad-owner)"
              stroke="none"
              clipPath="url(#wc-clip)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          )}
          {hasRenter && renterFillPath && (
            <motion.path
              d={renterFillPath}
              fill="url(#wc-grad-renter)"
              stroke="none"
              clipPath="url(#wc-clip)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            />
          )}

          {/* Wealth lines */}
          {ownerPath && (
            <motion.path
              key={`owner-${ownerData.length}`}
              d={ownerPath}
              fill="none"
              stroke="var(--color-owner)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#wc-clip)"
              initial={animateOnMount ? { pathLength: 0, opacity: 0 } : false}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1] }}
            />
          )}
          {hasRenter && renterPath && (
            <motion.path
              key={`renter-${renterData.length}`}
              d={renterPath}
              fill="none"
              stroke="var(--color-renter)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath="url(#wc-clip)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            />
          )}

          {/* Move annotations */}
          {computeMoveMarkers(ownerMoveYears ?? [], ownerData, xScale, yScale).map(({ bx: mbx, by: mby, key }) => (
            <motion.g key={`om-${key}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <line x1={mbx} y1={mby} x2={mbx} y2={mby + 20}
                stroke="var(--color-owner)" strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.55} />
              <path d={`M ${mbx - 4} ${mby} L ${mbx + 4} ${mby} L ${mbx} ${mby + 7} Z`}
                fill="var(--color-owner)" fillOpacity={0.5} />
            </motion.g>
          ))}
          {computeMoveMarkers(renterMoveYears ?? [], renterData, xScale, yScale).map(({ bx: mbx, by: mby, key }) => (
            <motion.g key={`rm-${key}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <line x1={mbx} y1={mby} x2={mbx} y2={mby + 20}
                stroke="var(--color-renter)" strokeWidth={1} strokeDasharray="2 3" strokeOpacity={0.55} />
              <path d={`M ${mbx - 4} ${mby} L ${mbx + 4} ${mby} L ${mbx} ${mby + 7} Z`}
                fill="var(--color-renter)" fillOpacity={0.5} />
            </motion.g>
          ))}

          {/* Breakeven annotation */}
          {bx != null && bAvgY != null && (
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: labelDelay + 0.1 }}
              style={{ transformOrigin: `${bx}px ${bAvgY}px` }}
            >
              <line
                x1={bx} y1={0} x2={bx} y2={innerHeight}
                stroke="var(--color-cross)"
                strokeWidth={1} strokeDasharray="3 4" strokeOpacity={0.45}
              />
              <circle cx={bx} cy={bAvgY} r={8}
                fill="var(--color-cross)" fillOpacity={0.12}
                stroke="var(--color-cross)" strokeWidth={1.5} />
              <circle cx={bx} cy={bAvgY} r={3} fill="var(--color-cross)" />
              <text
                x={bx} y={bAvgY - 16} textAnchor="middle"
                fontSize={10} fontWeight={500}
                fill="var(--color-cross)"
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                Yr {breakEvenYear}
              </text>
            </motion.g>
          )}

          {/* End label pills */}
          <motion.g
            transform={`translate(0,${ownerLabelY})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: labelDelay }}
          >
            <line x1={4} y1={0} x2={10} y2={0}
              stroke="var(--color-owner)" strokeWidth={1.5} strokeOpacity={0.5} />
            <rect x={innerWidth + 12} y={hasSubLabels ? -21 : -14}
              width={hasSubLabels ? 110 : 74} height={hasSubLabels ? 42 : 28} rx={4}
              fill="var(--color-bg-elevated)" stroke="var(--color-outline)" strokeWidth={1} />
            <text x={innerWidth + 18} y={-4} dy="0.32em" fontSize={9}
              fill="var(--color-owner)" fontFamily="var(--font-sans), system-ui, sans-serif">
              Owner
            </text>
            <text x={innerWidth + 18} y={10} dy="0.32em" fontSize={11} fontWeight={600}
              fill="var(--color-owner)" fontFamily="var(--font-sans), system-ui, sans-serif"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
              {fmt(ownerEndValue)}
            </text>
            {ownerSubLabel && (
              <text x={innerWidth + 18} y={24} dy="0.32em" fontSize={8}
                fill="var(--color-text-faint)" fontFamily="var(--font-sans), system-ui, sans-serif"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {ownerSubLabel}
              </text>
            )}
          </motion.g>

          {hasRenter && (
            <motion.g
              transform={`translate(0,${renterLabelY})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: labelDelay + 0.15 }}
            >
              <line x1={4} y1={0} x2={10} y2={0}
                stroke="var(--color-renter)" strokeWidth={1.5} strokeOpacity={0.5} />
              <rect x={innerWidth + 12} y={hasSubLabels ? -21 : -14}
                width={hasSubLabels ? 110 : 74} height={hasSubLabels ? 42 : 28} rx={4}
                fill="var(--color-bg-elevated)" stroke="var(--color-outline)" strokeWidth={1} />
              <text x={innerWidth + 18} y={-4} dy="0.32em" fontSize={9}
                fill="var(--color-renter)" fontFamily="var(--font-sans), system-ui, sans-serif">
                Renter
              </text>
              <text x={innerWidth + 18} y={10} dy="0.32em" fontSize={11} fontWeight={600}
                fill="var(--color-renter)" fontFamily="var(--font-sans), system-ui, sans-serif"
                style={{ fontVariantNumeric: 'tabular-nums' }}>
                {fmt(renterEndValue)}
              </text>
              {renterSubLabel && (
                <text x={innerWidth + 18} y={24} dy="0.32em" fontSize={8}
                  fill="var(--color-text-faint)" fontFamily="var(--font-sans), system-ui, sans-serif"
                  style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {renterSubLabel}
                </text>
              )}
            </motion.g>
          )}

          {/* Hover crosshair */}
          {hoverData && (
            <g>
              <rect
                x={xScale(hoverData.year) - 0.5} y={0}
                width={1} height={innerHeight}
                fill="var(--color-chart-crosshair)" fillOpacity={0.08}
              />
              <circle cx={xScale(hoverData.year)} cy={yScale(hoverData.owner)} r={5}
                fill="var(--color-owner)" stroke="var(--color-chart-bg)" strokeWidth={2} />
              {hasRenter && hoverData.renter != null && (
                <circle cx={xScale(hoverData.year)} cy={yScale(hoverData.renter)} r={5}
                  fill="var(--color-renter)" stroke="var(--color-chart-bg)" strokeWidth={2} />
              )}
            </g>
          )}

          {/* Mouse capture overlay */}
          <rect
            x={0} y={0} width={innerWidth} height={innerHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleLeave}
          />
        </g>
      </svg>

      {/* Hover tooltip */}
      <AnimatePresence>
        {hoverData && vpCursor && (
          <motion.div
            key="wc-tooltip"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.08 }}
            style={{
              position: 'fixed',
              left: ttLeft,
              top: ttTop,
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          >
            <DetailedTooltip
              year={hoverData.year}
              ownerWealth={hoverData.owner}
              renterWealth={hoverData.renter}
              snapshot={hoverData.snap}
              hasRenter={hasRenter}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WealthChart(props: WealthChartProps) {
  const { height = 340 } = props;
  return (
    <div
      style={{
        width: '100%',
        height,
        backgroundColor: 'var(--color-chart-bg)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <ParentSize debounceTime={16}>
        {({ width }) => <ChartInner {...props} width={width} height={height} />}
      </ParentSize>
    </div>
  );
}
