'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { TextInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function StepHomePrice({ inputs, patch }: Props) {
  const loanAmount = inputs.homePrice * (1 - inputs.downPaymentPct);
  const yr1Interest = loanAmount * inputs.mortgageRatePct;
  const yr1Tax = inputs.propertyTaxPct * inputs.homePrice;
  const yr1Maintenance = (inputs.maintenancePct ?? 0.015) * inputs.homePrice;
  const yr1Insurance = (inputs.homeInsuranceMonthly ?? 150) * 12;
  const yr1Strata = (inputs.monthlyStrataFee ?? 0) * 12;
  const yr1Unrecoverable = yr1Interest + yr1Tax + yr1Maintenance + yr1Insurance + yr1Strata;
  const unrecoverablePct = inputs.homePrice > 0
    ? ((yr1Unrecoverable / inputs.homePrice) * 100).toFixed(1)
    : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        What's the home price?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        This sets the year-0 drop on the chart — down payment plus closing costs.
      </p>

      <div className="mt-6">
        <TextInput
          label="Home price"
          value={inputs.homePrice}
          onChange={(v) => patch({ homePrice: parseFloat(v) || inputs.homePrice })}
          prefix="$"
          type="number"
          min={100000}
          max={5000000}
          step={25000}
          focusColor="var(--color-owner)"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted">
          ~{unrecoverablePct}% per year builds no equity ({fmt.format(Math.round(yr1Unrecoverable))}/yr in interest, tax, maintenance, and insurance{yr1Strata > 0 ? ', strata' : ''}).
        </p>
      </div>
    </motion.div>
  );
}
