'use client';

import { motion } from 'motion/react';

/*
  Reckon wordmark — Playfair Display 900 italic.
  Already loaded globally as var(--font-serif).

  Static:  plain span, renders instantly.
  Animated: clip-path inset sweeps left → right, simulating a write-on reveal.

  width prop controls fontSize (font renders ~3.7x wider than fontSize,
  so fontSize = width / 3.7).
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
  const fontSize = Math.round(width / 3.7);

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
    return <span style={style}>Reckon</span>;
  }

  return (
    <motion.span
      style={style}
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      Reckon
    </motion.span>
  );
}
