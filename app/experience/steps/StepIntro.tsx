'use client';

import { motion } from 'motion/react';

export function StepIntro() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col items-start gap-3 pt-2"
    >
      <p className="text-xs uppercase tracking-[0.1em] font-medium text-muted">Canada · Evidence-based</p>
      <h1 className="font-sans text-2xl font-medium leading-snug sm:text-3xl">
        Two futures. Same starting money.
        <br />
        One buys. One rents.
      </h1>
      <p className="text-sm text-muted">Building your chart…</p>
    </motion.div>
  );
}
