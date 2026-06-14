'use client';

import { motion } from 'motion/react';

interface Props {
  phase: number;
  total: number;
}

export function ProgressBar({ phase, total }: Props) {
  const pct = Math.min(100, (phase / total) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={phase}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${phase} of ${total}`}
      style={{
        position: 'fixed',
        top: '40px',
        left: 0,
        right: 0,
        height: '1px',
        backgroundColor: 'var(--color-outline)',
        zIndex: 50,
      }}
    >
      <motion.div
        style={{
          height: '100%',
          backgroundColor: 'var(--color-owner)',
          originX: 0,
        }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.24, ease: [0.0, 0, 0.2, 1] }}
      />
    </div>
  );
}
