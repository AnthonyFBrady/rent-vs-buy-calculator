'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs } from '@/engine';
import { Toggle, RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function Phase4Accounts({ inputs, patch }: Props) {
  const totalCash = inputs.ownerPriorEquity ?? 0;
  const hasCash = totalCash > 0;

  // TFSA room
  const useTFSA = inputs.renterUsesTFSA;
  const tfsaRoom = inputs.renterTfsaRoomOverride ?? Math.min(95_000, Math.max(0, (2026 - Math.max((inputs.birthYear ?? 1990) + 18, 2009)) * 7_000));

  // FHSA room
  const useFHSA = inputs.useFHSA ?? false;
  const fhsaRoom = inputs.renterFhsaRoomOverride ?? 40_000;

  // RRSP carryforward
  const useRRSP = inputs.renterUsesRRSP ?? false;
  const rrspCarry = inputs.renterRrspCarryforward ?? 0;

  // Compute allocation for display
  let remaining = totalCash;
  const tfsaAlloc = useTFSA ? Math.min(remaining, tfsaRoom) : 0;
  remaining -= tfsaAlloc;
  const fhsaAlloc = useFHSA ? Math.min(remaining, fhsaRoom) : 0;
  remaining -= fhsaAlloc;
  const rrspAlloc = useRRSP ? Math.min(remaining, rrspCarry) : 0;
  remaining -= rrspAlloc;
  const taxableAlloc = Math.max(0, remaining);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-3 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        Which accounts is this in?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        We fill accounts in the optimal order. Toggle on what you have room in.
      </p>

      <div className="mt-5 flex flex-col" style={{ borderTop: '1px solid var(--color-outline)', gap: 0 }}>

        {/* TFSA */}
        <div className="py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
          <Toggle
            checked={useTFSA}
            onChange={(v) => patch({ renterUsesTFSA: v, renterTfsaRoomOverride: v ? tfsaRoom : undefined })}
            label="TFSA"
            description="Tax-free growth, no capital gains at exit."
          />
          {useTFSA && (
            <div className="mt-3">
              <RangeInput
                label="Remaining room"
                value={Math.round(tfsaRoom / 1000)}
                min={0}
                max={95}
                step={5}
                onChange={(v) => patch({ renterTfsaRoomOverride: v * 1_000 })}
                formatValue={(v) => `$${v}k`}
                color="var(--color-renter)"
                minLabel="$0"
                maxLabel="$95k"
                description={hasCash ? `${fmt.format(tfsaAlloc)} of your cash goes here first.` : undefined}
              />
            </div>
          )}
        </div>

        {/* FHSA */}
        <div className="py-3" style={{ borderBottom: '1px solid var(--color-outline)' }}>
          <Toggle
            checked={useFHSA}
            onChange={(v) => patch({ useFHSA: v, renterFhsaRoomOverride: v ? fhsaRoom : undefined })}
            label="FHSA"
            description="$8k/yr tax-deductible, tax-free growth. Up to $40k lifetime."
          />
          {useFHSA && (
            <div className="mt-3">
              <RangeInput
                label="Lifetime room remaining"
                value={Math.round(fhsaRoom / 1000)}
                min={0}
                max={40}
                step={8}
                onChange={(v) => patch({ renterFhsaRoomOverride: v * 1_000 })}
                formatValue={(v) => `$${v}k`}
                color="var(--color-renter)"
                minLabel="$0"
                maxLabel="$40k"
                description={hasCash ? `${fmt.format(fhsaAlloc)} of your cash fills this next.` : undefined}
              />
            </div>
          )}
        </div>

        {/* RRSP */}
        <div className="py-3">
          <Toggle
            checked={useRRSP}
            onChange={(v) => patch({ renterUsesRRSP: v, renterRrspCarryforward: v ? rrspCarry : 0 })}
            label="RRSP"
            description="Deferred tax. Refunds reinvested. Balance taxed as income at exit."
          />
          {useRRSP && (
            <div className="mt-3">
              <RangeInput
                label="Unused contribution room"
                value={Math.round(rrspCarry / 1000)}
                min={0}
                max={200}
                step={5}
                onChange={(v) => patch({ renterRrspCarryforward: v * 1_000 })}
                formatValue={(v) => `$${v}k`}
                color="var(--color-renter)"
                minLabel="$0"
                maxLabel="$200k"
                description={hasCash ? `${fmt.format(rrspAlloc)} of your cash fills RRSP after TFSA and FHSA.` : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {hasCash && (
        <div
          className="mt-3 rounded-sm px-3 py-2 text-xs leading-relaxed"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-outline)' }}
        >
          <span style={{ color: 'var(--color-text-muted)' }}>Breakdown of {fmt.format(totalCash)}: </span>
          {useTFSA && tfsaAlloc > 0 && <span style={{ color: 'var(--color-renter)' }}>{fmt.format(tfsaAlloc)} TFSA</span>}
          {useFHSA && fhsaAlloc > 0 && <span style={{ color: 'var(--color-renter)' }}> · {fmt.format(fhsaAlloc)} FHSA</span>}
          {useRRSP && rrspAlloc > 0 && <span style={{ color: 'var(--color-text)' }}> · {fmt.format(rrspAlloc)} RRSP</span>}
          {taxableAlloc > 0 && <span style={{ color: 'var(--color-text-muted)' }}> · {fmt.format(taxableAlloc)} taxable</span>}
        </div>
      )}
    </motion.div>
  );
}
