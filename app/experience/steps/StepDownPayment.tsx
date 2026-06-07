'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs, HomeType } from '@/engine';
import { RangeInput, Toggle } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  name?: string;
  city?: string;
}

const HOME_TYPE_LABEL: Record<HomeType, string> = {
  'condo-apt': 'condo',
  'condo-townhouse': 'condo TH',
  'freehold-townhouse': 'freehold TH',
  'semi-detached': 'semi',
  'detached': 'detached',
};

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function StepDownPayment({ inputs, patch, name, city }: Props) {
  const downPct = Math.round(inputs.downPaymentPct * 100);
  const downAmount = inputs.homePrice * inputs.downPaymentPct;
  const isCMHC = inputs.downPaymentPct < 0.2;
  const priorEquity = inputs.ownerPriorEquity ?? 0;
  const hasEquity = priorEquity > 0;

  const closingApprox = inputs.homePrice * 0.02;
  const ownerYear0Approx = downAmount + closingApprox;
  const equityKept = Math.max(0, priorEquity - ownerYear0Approx);
  const equityToHouse = Math.min(priorEquity, ownerYear0Approx);

  const homeTypeLabel = inputs.homeType ? HOME_TYPE_LABEL[inputs.homeType] : null;
  const fmtCompact = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0, notation: 'compact' });

  const summaryLine = [
    name ? `${name} buys` : null,
    fmtCompact.format(inputs.homePrice),
    homeTypeLabel,
    city ? `in ${city}` : null,
  ].filter(Boolean).join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      {summaryLine && (
        <p className="mt-3 text-xs tracking-wide" style={{ opacity: 0.5 }}>
          {summaryLine}
        </p>
      )}

      <h2 className="mt-2 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
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
          onChange={(v) => patch({ ownerPriorEquity: v ? Math.max(downAmount + 50000, 50000) : 0 })}
          label="I have additional cash to deploy toward this purchase"
          description="Savings, investments, or home equity beyond the down payment."
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
            label="Total cash to deploy"
            value={priorEquity / 1000}
            min={10}
            max={2000}
            step={10}
            onChange={(v) => patch({ ownerPriorEquity: v * 1000 })}
            formatValue={(v) => `$${v}k`}
            color="var(--color-owner)"
            minLabel="$10k"
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
