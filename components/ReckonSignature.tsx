'use client';

import { motion } from 'motion/react';

/*
  reckon wordmark — Playfair Display 900 italic.
  Already loaded globally as var(--font-serif).

  Static:  plain span, renders instantly.
  Animated: clip-path inset sweeps left → right, simulating a write-on reveal.

  width prop controls fontSize (font renders ~2.8x wider than fontSize,
  so fontSize = width / 2.8).
*/

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
  duration = 1.1,
  delay = 0,
}: Props) {
  const fontSize = Math.round(width / 3.5);

  const style: React.CSSProperties = {
    fontFamily: 'var(--font-serif), "Playfair Display", Georgia, serif',
    fontSize: `${fontSize}px`,
    fontWeight: 900,
    fontStyle: 'italic',
    color,
    display: 'block',
    letterSpacing: '-0.03em',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  if (!animate) {
    return <span style={style}>reckon</span>;
  }

  return (
    <motion.span
      style={style}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      reckon
    </motion.span>
  );
}
