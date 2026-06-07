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
        height: '2px',
        backgroundColor: 'var(--color-outline)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}
    >
      <motion.div
        style={{
          height: '100%',
          backgroundColor: 'var(--color-owner)',
          borderRadius: '2px',
          originX: 0,
        }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  );
}
