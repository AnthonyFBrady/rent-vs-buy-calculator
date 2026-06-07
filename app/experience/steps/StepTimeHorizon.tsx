'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepTimeHorizon({ inputs, patch }: Props) {
  const years = inputs.holdingPeriodYears;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >

      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        How long are you thinking about?
      </h2>

      <div className="mt-8 flex items-baseline gap-3">
        <span className="font-serif text-6xl tabular-nums">{years}</span>
        <span className="text-lg text-muted">years</span>
      </div>

      <div className="mt-6">
        <input
          type="range"
          min={5}
          max={40}
          step={1}
          value={years}
          onChange={(e) => patch({ holdingPeriodYears: parseInt(e.target.value, 10) })}
          className="w-full"
          style={{ accentColor: 'var(--color-owner)' }}
        />
        <div className="mt-2 flex justify-between text-xs text-muted" style={{ opacity: 0.6 }}>
          <span>5 years</span>
          <span>40 years</span>
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-muted">
        {years <= 7
          ? 'Short horizon. Transaction friction dominates — buying is very hard to justify at these timescales.'
          : years <= 15
          ? 'Medium horizon. The crossover year matters a lot. Move frequency becomes critical.'
          : 'Long horizon. Post-payoff investing eventually tilts toward the owner.'}
      </p>

    </motion.div>
  );
}
