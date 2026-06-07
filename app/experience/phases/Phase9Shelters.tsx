'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs, SimulationResult } from '@/engine';
import { Toggle } from '../components';

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

export function Phase9Shelters({ inputs, patch, sim }: Props) {
  const annualIncome = inputs.annualIncome ?? 120_000;
  const rrspAnnualRoom = Math.min(annualIncome * 0.18, 31_560);

  const tfsaRoom = Math.min(95_000, Math.max(0, (2026 - Math.max((inputs.birthYear ?? 1990) + 18, 2009)) * 7_000));
  const tfsaSavings = sim.exit.renterCapitalGainsTax;
  const tfsaImpact = tfsaSavings > 500
    ? `$${Math.round(tfsaRoom / 1000)}k in TFSA room. Saves ${fmt.format(tfsaSavings)} in cap gains tax at exit.`
    : null;

  const fhsaTotalRefund = Math.round(40_000 * inputs.marginalTaxRatePct);
  const fhsaImpact = `$8k/yr (up to $40k lifetime) invested tax-free. Generates ${fmt.format(fhsaTotalRefund)} in total refunds reinvested in taxable. All gains sheltered at exit.`;

  const rrspImpact = `Up to ${fmt.format(Math.round(rrspAnnualRoom))}/yr sheltered in RRSP. Refunds reinvested. Balance taxed as income at exit.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        Tax shelters.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Toggle the accounts you plan to use. Each one moves the renter line — watch it respond.
      </p>

      <div className="mt-6 flex flex-col" style={{ borderTop: '1px solid var(--color-outline)', gap: 0 }}>
        <div className="py-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
          <Toggle
            checked={inputs.isFirstTimeBuyer}
            onChange={(v) => patch({ isFirstTimeBuyer: v })}
            label="First-time buyer"
            description="LTT rebate at purchase. Province-specific amount added to owner's year-0 closing costs."
          />
        </div>
        <div className="py-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
          <Toggle
            checked={inputs.renterUsesTFSA}
            onChange={(v) => patch({ renterUsesTFSA: v })}
            label="Renter uses TFSA"
            description="Tax-free growth. No capital gains at exit on the TFSA-sheltered portion."
            impact={tfsaImpact}
          />
        </div>
        <div className="py-4" style={{ borderBottom: '1px solid var(--color-outline)' }}>
          <Toggle
            checked={inputs.useFHSA ?? false}
            onChange={(v) => patch({ useFHSA: v })}
            label="Renter uses FHSA"
            description="First Home Savings Account. $8k/yr tax-deductible, tax-free growth, pools with TFSA at exit."
            impact={fhsaImpact}
          />
        </div>
        <div className="py-4">
          <Toggle
            checked={inputs.renterUsesRRSP ?? false}
            onChange={(v) => patch({ renterUsesRRSP: v })}
            label="Renter uses RRSP"
            description="Annual refund reinvested. Full balance taxed as income at withdrawal."
            impact={rrspImpact}
          />
        </div>
      </div>
    </motion.div>
  );
}
