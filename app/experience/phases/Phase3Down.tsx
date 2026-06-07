'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput, Toggle } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function Phase3Down({ inputs, patch }: Props) {
  const downPct = Math.round(inputs.downPaymentPct * 100);
  const downAmount = inputs.homePrice * inputs.downPaymentPct;
  const isCMHC = inputs.downPaymentPct < 0.2;
  const priorEquity = inputs.ownerPriorEquity ?? 0;
  const hasEquity = priorEquity > 0;

  // Equity that stays invested after the down payment
  const closingApprox = inputs.homePrice * 0.02; // rough estimate of LTT + legal
  const ownerYear0Approx = downAmount + closingApprox;
  const equityKept = Math.max(0, priorEquity - ownerYear0Approx);
  const equityToHouse = Math.min(priorEquity, ownerYear0Approx);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        How much are you putting down?
      </h2>

      <div className="mt-6">
        <RangeInput
          label="Down payment"
          value={downPct}
          min={5}
          max={50}
          step={1}
          onChange={(v) => patch({ downPaymentPct: v / 100 })}
          formatValue={(v) => `${v}%`}
          color="var(--color-owner)"
          minLabel="5% min"
          maxLabel="50%"
          description={fmt.format(downAmount)}
        />
        {isCMHC && (
          <p className="mt-2 text-xs" style={{ color: 'rgba(164,61,18,0.9)' }}>
            Under 20% — CMHC insurance premium added to mortgage balance.
          </p>
        )}
      </div>

      <div className="mt-5">
        <Toggle
          checked={hasEquity}
          onChange={(v) => patch({ ownerPriorEquity: v ? Math.max(downAmount + 50000, 300000) : 0 })}
          label="I have additional cash to deploy"
          description="Savings, investments, or home equity you're putting toward the purchase."
        />
      </div>

      {hasEquity && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.2 }}
          className="mt-4"
        >
          <RangeInput
            label="Equity to deploy"
            value={priorEquity / 1000}
            min={100}
            max={2000}
            step={25}
            onChange={(v) => patch({ ownerPriorEquity: v * 1000 })}
            formatValue={(v) => `$${v}k`}
            color="var(--color-owner)"
            minLabel="$100k"
            maxLabel="$2M"
          />
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {fmt.format(equityToHouse)} goes to the house. {fmt.format(equityKept)} stays invested.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
