'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { TextInput, RangeInput } from '../components';

interface Props {
  name: string;
  onName: (v: string) => void;
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

function PersonIllustration() {
  return (
    <motion.svg
      width="56" height="72" viewBox="0 0 56 72"
      fill="none" stroke="#E8C87A" strokeWidth="1.5" strokeLinecap="round"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <circle cx="28" cy="14" r="10" />
      <path d="M 16 44 Q 16 28 28 28 Q 40 28 40 44" />
      <line x1="16" y1="36" x2="4" y2="46" />
      <line x1="40" y1="36" x2="52" y2="46" />
      <line x1="22" y1="56" x2="18" y2="70" />
      <line x1="34" y1="56" x2="38" y2="70" />
      <line x1="16" y1="44" x2="22" y2="56" />
      <line x1="40" y1="44" x2="34" y2="56" />
    </motion.svg>
  );
}

export function StepAbout({ name, onName, inputs, patch }: Props) {
  const incomeK = Math.round((inputs.annualIncome ?? 120_000) / 1_000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <div className="mt-3 flex items-end gap-5">
        <div>
          <h2 className="font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">Let's start with you.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your name goes on the chart. Income sets your RRSP contribution room.
          </p>
        </div>
        <div className="mb-1 shrink-0">
          <PersonIllustration />
        </div>
      </div>

      <div className="mt-7">
        <TextInput
          label="Your first name"
          value={name}
          onChange={onName}
          placeholder="e.g. Alex"
          focusColor="var(--color-owner)"
        />
      </div>

      <div className="mt-7">
        <RangeInput
          label="Annual income"
          value={incomeK}
          min={40}
          max={300}
          step={5}
          onChange={(v) => patch({ annualIncome: v * 1_000 })}
          formatValue={(v) => `$${v}k`}
          color="var(--color-owner)"
          minLabel="$40k"
          maxLabel="$300k"
          description={`RRSP room = 18% of income, max ${fmt.format(31_560)}/yr. Sets the RRSP contribution cap if you use it later.`}
        />
      </div>
    </motion.div>
  );
}
