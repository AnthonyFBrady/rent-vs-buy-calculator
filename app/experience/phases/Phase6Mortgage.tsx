'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function Phase6Mortgage({ inputs, patch }: Props) {
  const ratePct = (inputs.mortgageRatePct * 100).toFixed(1);
  const renewalRatePct = ((inputs.mortgageRenewalRatePct ?? inputs.mortgageRatePct) * 100).toFixed(1);
  const renewalDelta = parseFloat(renewalRatePct) - parseFloat(ratePct);
  const currentYear = new Date().getFullYear();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <p className="text-xs uppercase tracking-[0.1em] font-medium text-muted">Step 6 of 10</p>
      <h2 className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">
        The mortgage.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        These drive the monthly payment line on the chart and when the mortgage-free milestone fires.
      </p>

      {/* Mortgage rate */}
      <div className="mt-7">
        <RangeInput
          label="Rate"
          value={inputs.mortgageRatePct * 100}
          min={2}
          max={10}
          step={0.25}
          onChange={(v) => patch({ mortgageRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-owner)"
          minLabel="2%"
          maxLabel="10%"
          description="5-year fixed rate (first term)."
        />
      </div>

      {/* Renewal rate */}
      <div className="mt-7">
        <RangeInput
          label="Renewal rate (yr 6+)"
          value={(inputs.mortgageRenewalRatePct ?? inputs.mortgageRatePct) * 100}
          min={2}
          max={10}
          step={0.25}
          onChange={(v) => patch({ mortgageRenewalRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-owner)"
          minLabel="2%"
          maxLabel="10%"
          description={
            Math.abs(renewalDelta) > 0.05
              ? `Rate ${renewalDelta > 0 ? 'rises' : 'falls'} by ${Math.abs(renewalDelta).toFixed(2)}% at year 6 renewal.`
              : 'Match to initial rate to model no rate change at renewal.'
          }
        />
      </div>

      {/* Amortization */}
      <div className="mt-7">
        <p className="mb-3 text-xs uppercase tracking-[0.1em] font-medium text-muted">Amortization</p>
        <div className="grid grid-cols-2 gap-2">
          {[15, 20, 25, 30].map((n) => {
            const selected = inputs.amortizationYears === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => patch({ amortizationYears: n })}
                className="rounded-sm px-3 py-3 text-left transition-colors duration-150"
                style={{
                  border: `1px solid ${selected ? 'rgba(232,200,122,0.6)' : 'var(--color-outline)'}`,
                  backgroundColor: selected ? 'rgba(232,200,122,0.07)' : 'transparent',
                  color: selected ? '#E8C87A' : 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                <p className="text-sm font-medium">{n} years</p>
                <p className="mt-0.5 text-[10px] text-muted">free {currentYear + n}</p>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
