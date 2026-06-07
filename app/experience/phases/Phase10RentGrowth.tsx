'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { RangeInput, Callout } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function Phase10RentGrowth({ inputs, patch }: Props) {
  const escalPct = (inputs.rentEscalationPct * 100).toFixed(1);
  const hasRentControl = inputs.rentControlCapPct != null && inputs.rentControlCapPct > 0;
  const capPct = inputs.rentControlCapPct != null ? (inputs.rentControlCapPct * 100).toFixed(1) : null;

  const tenYearGap =
    hasRentControl && inputs.rentControlCapPct != null
      ? Math.round(
          (Math.pow(1 + inputs.rentEscalationPct, 10) /
            Math.pow(1 + inputs.rentControlCapPct, 10) - 1) * 100,
        )
      : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        How fast does rent grow?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {hasRentControl
          ? `Market rate rises at the speed below. Your in-place rent is capped at ${capPct}%/yr.`
          : `How fast asking rents grow. You track this rate — no cap in ${inputs.province}.`}
      </p>

      <div className="mt-6">
        <RangeInput
          label="Market rent growth"
          value={inputs.rentEscalationPct * 100}
          min={0}
          max={8}
          step={0.25}
          onChange={(v) => patch({ rentEscalationPct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-renter)"
          minLabel="0%"
          maxLabel="8%"
        />
      </div>

      {hasRentControl && tenYearGap !== null && tenYearGap > 0 && (
        <Callout variant="renter" className="mt-5">
          <p className="text-xs font-medium">Stay-longer benefit: {tenYearGap}% below asking after 10 years.</p>
          <p className="mt-0.5 text-[10px] leading-relaxed" style={{ opacity: 0.6 }}>
            CMHC data: Ontario long-term tenants pay 20–40% below market. Moving resets this permanently.
          </p>
        </Callout>
      )}

      {!hasRentControl && (
        <Callout variant="neutral" className="mt-5">
          <p className="text-xs leading-relaxed" style={{ opacity: 0.65 }}>
            No rent control in {inputs.province}. Rent resets to market on each renewal — staying put gives no discount.
          </p>
        </Callout>
      )}
    </motion.div>
  );
}
