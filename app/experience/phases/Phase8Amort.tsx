'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function Phase8Amort({ inputs, patch }: Props) {
  const currentYear = new Date().getFullYear();
  const ratePct = (inputs.mortgageRatePct * 100).toFixed(1);
  const renewalRatePct = ((inputs.mortgageRenewalRatePct ?? inputs.mortgageRatePct) * 100).toFixed(1);
  const renewalDelta = parseFloat(renewalRatePct) - parseFloat(ratePct);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        Amortization and renewal.
      </h2>

      {/* Amortization — single row of 4 buttons */}
      <div className="mt-6">
        <p className="mb-3 text-xs uppercase tracking-[0.1em] font-medium text-muted">Amortization</p>
        <div className="grid grid-cols-4 gap-2">
          {[15, 20, 25, 30].map((n) => {
            const selected = inputs.amortizationYears === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => patch({ amortizationYears: n })}
                className="rounded-sm py-3 text-center transition-colors duration-150"
                style={{
                  border: `1px solid ${selected ? 'rgba(232,200,122,0.6)' : 'var(--color-outline)'}`,
                  backgroundColor: selected ? 'rgba(232,200,122,0.07)' : 'transparent',
                  color: selected ? '#E8C87A' : 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                <p className="text-sm font-medium">{n}yr</p>
                <p className="text-[10px] text-muted mt-0.5">{currentYear + n}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Renewal rate */}
      <div className="mt-6">
        <RangeInput
          label="Rate at renewal (yr 6, 11, 16…)"
          value={(inputs.mortgageRenewalRatePct ?? inputs.mortgageRatePct) * 100}
          min={2}
          max={10}
          step={0.25}
          onChange={(v) => patch({ mortgageRenewalRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(2)}%`}
          color="var(--color-owner)"
          minLabel="2%"
          maxLabel="10%"
          description={
            Math.abs(renewalDelta) > 0.05
              ? `Rate ${renewalDelta > 0 ? 'rises' : 'falls'} ${Math.abs(renewalDelta).toFixed(2)}% at yr ${(inputs.mortgageTermYears ?? 5) + 1} renewal. Applied for all remaining years.`
              : 'Same as initial rate — no payment change at renewal.'
          }
        />
      </div>
    </motion.div>
  );
}
