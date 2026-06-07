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

export function Phase4Renting({ inputs, patch }: Props) {
  const deposit = 2 * inputs.monthlyRent;

  const rentToPrice = inputs.homePrice > 0 ? (inputs.monthlyRent * 12) / inputs.homePrice : 0;
  const rtpPct = (rentToPrice * 100).toFixed(1);
  const rtpSignal: 'low' | 'mid' | 'high' = rentToPrice < 0.03 ? 'low' : rentToPrice > 0.05 ? 'high' : 'mid';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        The renting scenario.
      </h2>

      {/* Monthly rent */}
      <div className="mt-8">
        <TextInput
          label="Monthly rent"
          value={inputs.monthlyRent}
          onChange={(v) => patch({ monthlyRent: parseFloat(v) || inputs.monthlyRent })}
          prefix="$"
          type="number"
          min={500}
          max={20000}
          step={50}
          focusColor="var(--color-renter)"
          description={`For a comparable home. First + last deposit (${fmt.format(deposit)}) is invested by the renter at year 0 and returned at exit.`}
        />

        {inputs.homePrice > 0 && (
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Rent-to-price ratio: {rtpPct}%
            {rtpSignal === 'low' && ' — buying tends to win at this level.'}
            {rtpSignal === 'mid' && ' — outcome is assumption-sensitive.'}
            {rtpSignal === 'high' && ' — renting often wins at this level.'}
          </p>
        )}
      </div>


    </motion.div>
  );
}
