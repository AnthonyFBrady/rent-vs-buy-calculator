'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs, SimulationResult } from '@/engine';
import { RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  sim: SimulationResult;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function StepFinancials({ inputs, patch, sim }: Props) {
  const mtr = Math.round(inputs.marginalTaxRatePct * 100);
  const disc = Math.round(inputs.savingsDisciplinePct * 100);
  const monthlyGap = Math.max(0, (sim.yearByYear[0]?.cashOutDelta ?? 0) / 12);
  const actualMonthly = monthlyGap * inputs.savingsDisciplinePct;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        Your tax rate and discipline.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The most load-bearing assumptions. Adjust them — the chart updates live.
      </p>

      {/* Marginal tax rate */}
      <div className="mt-8">
        <RangeInput
          label="Marginal tax rate"
          value={mtr}
          min={20}
          max={55}
          step={1}
          onChange={(v) => patch({ marginalTaxRatePct: v / 100 })}
          formatValue={(v) => `${v}%`}
          color="var(--color-owner)"
          minLabel="20%"
          maxLabel="55%"
          description="Drives RRSP refund size, FHSA stipend, and cap gains treatment."
        />
      </div>

      {/* Savings discipline */}
      <div className="mt-8">
        <RangeInput
          label="Savings discipline"
          value={disc}
          min={0}
          max={100}
          step={5}
          onChange={(v) => patch({ savingsDisciplinePct: v / 100 })}
          formatValue={(v) => `${v}%`}
          color="var(--color-renter)"
          minLabel="0%"
          maxLabel="100%"
        />
        {monthlyGap > 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {disc === 100
              ? `Investing the full ${fmt.format(Math.round(monthlyGap))}/mo housing advantage.`
              : disc === 0
              ? 'Not investing the monthly advantage — renting almost always loses this way.'
              : `Investing ${fmt.format(Math.round(actualMonthly))}/mo of a ${fmt.format(Math.round(monthlyGap))}/mo advantage.`}
          </p>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Owner's monthly costs are lower — no renter investment gap this year.
          </p>
        )}
      </div>

    </motion.div>
  );
}
