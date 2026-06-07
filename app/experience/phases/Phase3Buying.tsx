'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { TextInput, RangeInput, Callout } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function Phase3Buying({ inputs, patch }: Props) {
  const downPct = Math.round(inputs.downPaymentPct * 100);
  const isCMHC = inputs.downPaymentPct < 0.2;

  const loanAmount = inputs.homePrice * (1 - inputs.downPaymentPct);
  const yr1Interest = loanAmount * inputs.mortgageRatePct;
  const yr1Tax = inputs.propertyTaxPct * inputs.homePrice;
  const yr1Maintenance = (inputs.maintenancePct ?? 0.015) * inputs.homePrice;
  const yr1Insurance = (inputs.homeInsuranceMonthly ?? 150) * 12;
  const yr1Strata = (inputs.monthlyStrataFee ?? 0) * 12;
  const yr1Unrecoverable = yr1Interest + yr1Tax + yr1Maintenance + yr1Insurance + yr1Strata;
  const unrecoverablePct = inputs.homePrice > 0 ? ((yr1Unrecoverable / inputs.homePrice) * 100).toFixed(1) : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <p className="text-xs uppercase tracking-[0.1em] font-medium text-muted">Step 5 of 10</p>
      <h2 className="mt-3 font-serif text-2xl leading-tight sm:text-3xl">
        The home.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Price and down payment set the closing cost drop on the chart at year 0.
      </p>

      {/* Home price */}
      <div className="mt-7">
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
          description="Drives year-0 closing costs: down payment + LTT + legal + CMHC if applicable."
        />
        <Callout variant="owner" className="mt-3">
          <p className="text-xs leading-relaxed" style={{ opacity: 0.7 }}>
            Year-1 unrecoverable costs: ~<span className="font-medium" style={{ opacity: 1 }}>{unrecoverablePct}%</span> of home value
            ({fmt.format(Math.round(yr1Unrecoverable))}/yr).
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed" style={{ opacity: 0.5 }}>
            Interest {fmt.format(Math.round(yr1Interest))} + tax {fmt.format(Math.round(yr1Tax))} + maintenance {fmt.format(Math.round(yr1Maintenance))} + insurance {fmt.format(Math.round(yr1Insurance))}{yr1Strata > 0 ? ` + strata ${fmt.format(Math.round(yr1Strata))}` : ''}.
            These build no equity — the equivalent of rent for an owner.
          </p>
        </Callout>
      </div>

      {/* Down payment */}
      <div className="mt-7">
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs uppercase tracking-[0.1em] font-medium text-muted">Down payment</p>
          <div className="text-right">
            <span className="font-serif text-2xl tabular-nums">{downPct}%</span>
            <span className="ml-2 text-sm text-muted">{fmt.format(inputs.homePrice * inputs.downPaymentPct)}</span>
          </div>
        </div>
        <input
          type="range" min={5} max={50} step={1} value={downPct}
          onChange={(e) => patch({ downPaymentPct: parseInt(e.target.value, 10) / 100 })}
          className="w-full"
          style={{ accentColor: 'var(--color-owner)' }}
        />
        <div className="mt-2 flex justify-between text-xs text-muted" style={{ opacity: 0.6 }}>
          <span>5% min</span>
          <span>50%</span>
        </div>
        {isCMHC && (
          <p className="mt-2 text-xs" style={{ color: 'rgba(164,61,18,0.85)' }}>
            Under 20% — CMHC premium added to mortgage.
          </p>
        )}
      </div>

    </motion.div>
  );
}
