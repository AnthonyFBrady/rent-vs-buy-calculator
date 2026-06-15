'use client';

import { motion } from 'motion/react';

/*
  Reckon signature — 9 strokes in natural pen order.
  ViewBox: 0 0 248 72  (ratio 3.44:1)

  Stroke order follows real handwriting:
    s1  R vertical stem (up)
    s2  R bowl + diagonal leg
    s3  e loop (clockwise, crossbar implicit)
    s4  c open arc
    s5  k stem (from c base, going up)
    s6  k upper kick (right)
    s7  k lower kick (right-down)
    s8  o full oval (clockwise, exits into n)
    s9  n two humps

  relStart + relDur are fractions of the total `duration` prop.
  They sum so the final stroke ends exactly at t = duration.
*/

const STROKES: [string, number, number][] = [
  // [path,  relStart, relDuration]
  ['M 17,61 L 17,8',                                                                                          0.000, 0.053],
  ['M 17,8 C 17,3 28,1 38,6 C 48,11 50,24 42,31 C 36,37 23,37 17,32 M 25,34 C 36,45 49,56 57,61',           0.046, 0.160],
  ['M 57,61 C 61,47 67,33 75,31 C 83,29 87,41 83,50 C 79,59 68,61 64,52 C 60,43 64,29 77,27',               0.191, 0.176],
  ['M 77,27 C 90,22 107,27 111,42 C 115,55 108,65 97,65',                                                    0.344, 0.130],
  ['M 97,65 C 99,50 105,28 110,10',                                                                           0.458, 0.099],
  ['M 110,38 C 118,29 128,25 136,27',                                                                         0.542, 0.069],
  ['M 112,42 C 120,52 128,60 136,65',                                                                         0.595, 0.069],
  ['M 150,59 C 150,41 156,27 166,25 C 176,23 184,36 184,50 C 184,63 177,70 168,68 C 157,66 149,53 151,40 C 153,28 163,24 173,27 C 179,31 182,46 181,59', 0.649, 0.176],
  ['M 181,59 C 183,43 188,29 197,27 C 205,25 210,38 210,55 C 212,38 217,27 227,26 C 235,25 240,40 238,58',   0.802, 0.198],
];

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
  duration = 1.2,
  delay = 0,
}: Props) {
  const height = Math.round(width * (72 / 248));
  const sw = Math.max(2.5, width * 0.026);

  const pathStyle = {
    fill: 'none' as const,
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      viewBox="0 0 248 72"
      width={width}
      height={height}
      aria-label="Reckon"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {STROKES.map(([d, relStart, relDur], i) =>
        animate ? (
          <motion.path
            key={i}
            d={d}
            style={pathStyle}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              pathLength: {
                duration: duration * relDur,
                delay: delay + duration * relStart,
                ease: EASE_DRAW,
              },
            }}
          />
        ) : (
          <path key={i} d={d} style={pathStyle} />
        )
      )}
    </svg>
  );
}
