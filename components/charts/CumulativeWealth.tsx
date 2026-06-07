'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import * as d3 from 'd3';
import type { SensitivityResult, SimulationResult } from '@/engine';

interface Props {
  result: SimulationResult;
  sensitivity?: SensitivityResult;
  height?: number;
}

const MARGIN = { top: 28, right: 24, bottom: 40, left: 76 };

/**
 * Cumulative wealth comparison chart.
 *
 * X axis: years from 0 to the holding period.
 * Y axis: CAD wealth (owner equity vs renter portfolio).
 *
 * Visual conventions:
 *  - Owner line in cool navy. Renter line in warm amber.
 *  - Break-even year (if any) annotated with a dashed vertical guide.
 *  - Sensitivity band (if provided) shades the area between low and high outcomes.
 *  - Line transitions are smoothed via motion when inputs change.
 */
export function CumulativeWealthChart({ result, sensitivity, height = 360 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  // Observe container width for responsiveness.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setWidth(rect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ownerYear0 = 0;
  const renterYear0 = result.yearByYear[0]?.renterPortfolioStart ?? 0;

  // Base lines.
  const series = useMemo(() => {
    const ownerPoints = [
      { year: 0, value: ownerYear0 },
      ...result.yearByYear.map((y) => ({ year: y.year, value: y.ownerEquity })),
    ];
    const renterPoints = [
      { year: 0, value: renterYear0 },
      ...result.yearByYear.map((y) => ({ year: y.year, value: y.renterPortfolioEnd })),
    ];
    return { ownerPoints, renterPoints };
  }, [result, renterYear0]);

  // Sensitivity bands.
  const bands = useMemo(() => {
    if (!sensitivity) return null;
    const buildBand = (
      low: SimulationResult,
      high: SimulationResult,
      year0Low: number,
      year0High: number,
      pick: (y: typeof low.yearByYear[number]) => number,
    ) => {
      const lowPts = [
        { year: 0, value: year0Low },
        ...low.yearByYear.map((y) => ({ year: y.year, value: pick(y) })),
      ];
      const highPts = [
        { year: 0, value: year0High },
        ...high.yearByYear.map((y) => ({ year: y.year, value: pick(y) })),
      ];
      return { lowPts, highPts };
    };

    return {
      owner: buildBand(
        sensitivity.ownerLow,
        sensitivity.ownerHigh,
        ownerYear0,
        ownerYear0,
        (y) => y.ownerEquity,
      ),
      renter: buildBand(
        sensitivity.renterLow,
        sensitivity.renterHigh,
        sensitivity.renterLow.yearByYear[0]?.renterPortfolioStart ?? renterYear0,
        sensitivity.renterHigh.yearByYear[0]?.renterPortfolioStart ?? renterYear0,
        (y) => y.renterPortfolioEnd,
      ),
    };
  }, [sensitivity, renterYear0]);

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const xMax = result.inputs.holdingPeriodYears;

  // Y domain must cover the widest possible range (including bands).
  const allValues = [
    ...series.ownerPoints.map((p) => p.value),
    ...series.renterPoints.map((p) => p.value),
    ...(bands
      ? [
          ...bands.owner.lowPts.map((p) => p.value),
          ...bands.owner.highPts.map((p) => p.value),
          ...bands.renter.lowPts.map((p) => p.value),
          ...bands.renter.highPts.map((p) => p.value),
        ]
      : []),
  ];
  const yMax = Math.max(...allValues, 0);
  const yMin = Math.min(...allValues, 0);

  const x = useMemo(
    () => d3.scaleLinear().domain([0, xMax]).range([0, innerWidth]),
    [xMax, innerWidth],
  );
  const y = useMemo(
    () => d3.scaleLinear().domain([yMin, yMax]).nice().range([innerHeight, 0]),
    [yMin, yMax, innerHeight],
  );

  const linePath = useMemo(
    () =>
      d3
        .line<{ year: number; value: number }>()
        .x((d) => x(d.year))
        .y((d) => y(d.value))
        .curve(d3.curveMonotoneX),
    [x, y],
  );

  const areaPath = useMemo(
    () =>
      d3
        .area<{ year: number; low: number; high: number }>()
        .x((d) => x(d.year))
        .y0((d) => y(d.low))
        .y1((d) => y(d.high))
        .curve(d3.curveMonotoneX),
    [x, y],
  );

  const ownerPath = linePath(series.ownerPoints) ?? '';
  const renterPath = linePath(series.renterPoints) ?? '';

  const ownerBandPath = useMemo(() => {
    if (!bands) return '';
    const merged = bands.owner.lowPts.map((p, i) => ({
      year: p.year,
      low: Math.min(p.value, bands.owner.highPts[i]?.value ?? p.value),
      high: Math.max(p.value, bands.owner.highPts[i]?.value ?? p.value),
    }));
    return areaPath(merged) ?? '';
  }, [bands, areaPath]);

  const renterBandPath = useMemo(() => {
    if (!bands) return '';
    const merged = bands.renter.lowPts.map((p, i) => ({
      year: p.year,
      low: Math.min(p.value, bands.renter.highPts[i]?.value ?? p.value),
      high: Math.max(p.value, bands.renter.highPts[i]?.value ?? p.value),
    }));
    return areaPath(merged) ?? '';
  }, [bands, areaPath]);

  const xTicks = x.ticks(Math.min(xMax, 10));
  const yTicks = y.ticks(5);

  const fmtCAD = useMemo(
    () =>
      new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
        notation: 'compact',
      }),
    [],
  );

  const fmtCADFull = useMemo(
    () =>
      new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }),
    [],
  );

  function handleMouseMove(e: React.MouseEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const year = Math.round(x.invert(px));
    setHoverYear(Math.max(0, Math.min(xMax, year)));
  }

  const hoverData = useMemo(() => {
    if (hoverYear === null) return null;
    const owner = series.ownerPoints.find((p) => p.year === hoverYear);
    const renter = series.renterPoints.find((p) => p.year === hoverYear);
    if (!owner || !renter) return null;
    return { year: hoverYear, owner: owner.value, renter: renter.value };
  }, [hoverYear, series]);

  // Accessible chart summary for screen readers.
  const lastOwner = series.ownerPoints[series.ownerPoints.length - 1]?.value ?? 0;
  const lastRenter = series.renterPoints[series.renterPoints.length - 1]?.value ?? 0;
  const summary = `After ${xMax} years, owner equity reaches ${fmtCADFull.format(
    lastOwner,
  )} and renter portfolio reaches ${fmtCADFull.format(lastRenter)}. ${
    result.breakEvenYear !== null
      ? `Buyer pulls ahead in year ${result.breakEvenYear}.`
      : 'Buyer does not catch up during the holding period.'
  }`;

  return (
    <div ref={containerRef} className="w-full">
      <p className="sr-only">{summary}</p>

      <svg
        width={width}
        height={height}
        role="img"
        aria-label={summary}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {/* Y gridlines */}
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line
                x1={0}
                x2={innerWidth}
                stroke="currentColor"
                className="text-ink/10"
                strokeWidth={1}
              />
              <text
                x={-8}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink/60 text-xs"
              >
                {fmtCAD.format(t)}
              </text>
            </g>
          ))}

          {/* X axis */}
          <g transform={`translate(0,${innerHeight})`}>
            <line
              x1={0}
              x2={innerWidth}
              stroke="currentColor"
              className="text-ink/30"
              strokeWidth={1}
            />
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={6} stroke="currentColor" className="text-ink/30" />
                <text
                  y={20}
                  textAnchor="middle"
                  className="fill-ink/60 text-xs"
                >
                  {t === 0 ? 'Now' : `Yr ${t}`}
                </text>
              </g>
            ))}
          </g>

          {/* Sensitivity bands behind the lines */}
          {ownerBandPath && (
            <path
              d={ownerBandPath}
              fill="#2E5C8A"
              fillOpacity={0.12}
              stroke="none"
            />
          )}
          {renterBandPath && (
            <path
              d={renterBandPath}
              fill="#B5552A"
              fillOpacity={0.12}
              stroke="none"
            />
          )}

          {/* Break-even guide */}
          {result.breakEvenYear !== null && (
            <g transform={`translate(${x(result.breakEvenYear)},0)`}>
              <line
                y1={0}
                y2={innerHeight}
                stroke="currentColor"
                className="text-ink/40"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                y={-10}
                textAnchor="middle"
                className="fill-ink/70 text-xs"
              >
                Break-even: Yr {result.breakEvenYear}
              </text>
            </g>
          )}

          {/* Renter line (warm) */}
          <motion.path
            d={renterPath}
            fill="none"
            stroke="#B5552A"
            strokeWidth={2.5}
            initial={false}
            animate={{ d: renterPath }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />

          {/* Owner line (cool) */}
          <motion.path
            d={ownerPath}
            fill="none"
            stroke="#2E5C8A"
            strokeWidth={2.5}
            initial={false}
            animate={{ d: ownerPath }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          />

          {/* Hover guide */}
          {hoverData && (
            <g transform={`translate(${x(hoverData.year)},0)`}>
              <line
                y1={0}
                y2={innerHeight}
                stroke="currentColor"
                className="text-ink/30"
                strokeWidth={1}
              />
              <circle cy={y(hoverData.owner)} r={4} fill="#2E5C8A" />
              <circle cy={y(hoverData.renter)} r={4} fill="#B5552A" />
            </g>
          )}

          {/* Mouse capture rect */}
          <rect
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setHoverYear(null)}
          />
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-buy" />
          <span className="text-ink/80">Owner equity</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-6 bg-rent" />
          <span className="text-ink/80">Renter portfolio</span>
        </span>
        {sensitivity && (
          <span className="text-ink/50 text-xs">
            Shaded bands show ±{(sensitivity.swingPct * 100).toFixed(0)}% on the
            most uncertain assumption (appreciation for buyers, investment
            return for renters).
          </span>
        )}
        {hoverData && (
          <span className="ml-auto text-ink/60">
            Year {hoverData.year}: owner{' '}
            <strong className="text-buy">
              {fmtCADFull.format(hoverData.owner)}
            </strong>{' '}
            · renter{' '}
            <strong className="text-rent">
              {fmtCADFull.format(hoverData.renter)}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}
