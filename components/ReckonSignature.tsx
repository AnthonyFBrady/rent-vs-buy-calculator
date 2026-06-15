'use client';

import { motion } from 'motion/react';

/*
  Hand-crafted SVG signature for "Reckon" in connected script.
  ViewBox: 0 0 220 58 — width:height ratio ≈ 3.8:1

  Three strokes drawn sequentially:
  1. R vertical stem  (fast anchor, 0.12s)
  2. R bowl + leg     (sweeping, 0.28s)
  3. eckon            (main flowing stroke, 0.6s)

  At small nav sizes (width≈72) the R is the dominant readable element
  and the eckon tail reads as a flowing brand mark.
*/

// R's vertical stem
const P_STEM = 'M 12,48 L 12,10';

// R's bowl curving right then back, followed by diagonal leg sweeping to where 'e' starts
const P_BOWL =
  'M 12,10 C 26,7 38,13 38,25 C 38,37 26,41 12,37 M 24,37 C 34,43 44,50 52,52';

// eckon: one flowing connected stroke from the end of the R leg
// e — loops and closes, c — open arc, k — stem + kicks, o — closed oval, n — two humps
const P_ECKON =
  'M 52,52 C 54,38 60,27 66,29 C 73,31 74,40 70,46 C 66,51 57,53 53,45 ' +
  'C 51,36 57,26 66,26 ' +
  'C 74,22 88,22 90,33 C 92,42 88,50 80,50 ' +
  'M 78,15 L 78,51 ' +
  'M 78,37 C 84,29 90,24 96,26 ' +
  'M 78,38 C 84,44 90,52 98,56 ' +
  'M 100,50 C 102,36 108,27 118,29 C 126,31 128,42 124,48 ' +
  'C 120,54 110,56 104,48 C 100,40 104,27 116,25 ' +
  'M 128,46 C 130,32 136,24 144,28 C 150,32 150,43 148,49 ' +
  'M 148,32 C 152,24 160,20 166,24 C 172,28 172,41 168,49';

const EASE_DRAW = [0.4, 0, 0.2, 1] as [number, number, number, number];

interface Props {
  color?: string;
  width?: number;
  animate?: boolean;
  duration?: number;
  delay?: number;
}

export function ReckonSignature({
  color = 'currentColor',
  width = 120,
  animate = false,
  duration = 0.9,
  delay = 0,
}: Props) {
  const height = Math.round(width * (58 / 220));

  const strokeProps = (strokeDelay: number, strokeDuration: number) =>
    animate
      ? {
          initial: { pathLength: 0, opacity: 1 },
          animate: { pathLength: 1, opacity: 1 },
          transition: {
            pathLength: {
              duration: strokeDuration,
              delay: delay + strokeDelay,
              ease: EASE_DRAW,
            },
          },
        }
      : {};

  const stemDelay = 0;
  const stemDur = duration * 0.13;
  const bowlDelay = stemDelay + stemDur;
  const bowlDur = duration * 0.29;
  const eckonDelay = bowlDelay + bowlDur * 0.7;
  const eckonDur = duration * 0.58;

  const pathStyle = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: Math.max(1.4, width * 0.018),
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      viewBox="0 0 220 58"
      width={width}
      height={height}
      aria-label="Reckon"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {animate ? (
        <>
          <motion.path d={P_STEM} style={pathStyle} {...strokeProps(stemDelay, stemDur)} />
          <motion.path d={P_BOWL} style={pathStyle} {...strokeProps(bowlDelay, bowlDur)} />
          <motion.path d={P_ECKON} style={pathStyle} {...strokeProps(eckonDelay, eckonDur)} />
        </>
      ) : (
        <>
          <path d={P_STEM} style={pathStyle} />
          <path d={P_BOWL} style={pathStyle} />
          <path d={P_ECKON} style={pathStyle} />
        </>
      )}
    </svg>
  );
}
