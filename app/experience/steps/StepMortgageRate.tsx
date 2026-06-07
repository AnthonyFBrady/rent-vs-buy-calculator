'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepMortgageRate({ inputs, patch }: Props) {
  const monthlyPayment = (() => {
    const principal = inputs.homePrice * (1 - inputs.downPaymentPct);
    const r = inputs.mortgageRatePct / 2; // Canadian semi-annual compounding → effective monthly
    const effectiveMonthly = Math.pow(1 + r, 1 / 6) - 1;
    const n = inputs.amortizationYears * 12;
    if (effectiveMonthly === 0) return principal / n;
    return principal * effectiveMonthly / (1 - Math.pow(1 + effectiveMonthly, -n));
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        Initial mortgage rate.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The rate for your first 5-year term. Drives the monthly payment line on the chart.
      </p>

      <div className="mt-6">
        <RangeInput
          label="Rate"
          value={inputs.mortgageRatePct * 100}
          min={2}
          max={10}
          step={0.25}
          onChange={(v) => patch({ mortgageRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(2)}%`}
          color="var(--color-owner)"
          minLabel="2%"
          maxLabel="10%"
          description={monthlyPayment > 0
            ? `Monthly payment: $${Math.round(monthlyPayment).toLocaleString('en-CA')} principal + interest.`
            : '5-year fixed rate, first term.'}
        />
      </div>
    </motion.div>
  );
}
