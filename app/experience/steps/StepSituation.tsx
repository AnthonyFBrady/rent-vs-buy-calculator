'use client';

import type { CalculatorInputs } from '@/engine';
import { RangeInput, Toggle, StepAdvanced } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});

export function StepSituation({ inputs, patch }: Props) {
  const usesTFSA = inputs.renterUsesTFSA ?? false;
  const useFHSA = inputs.useFHSA ?? false;
  const usesRRSP = inputs.renterUsesRRSP ?? false;

  const fhsaRoom = inputs.renterFhsaRoomOverride ?? 40_000;
  const rrspCarry = inputs.renterRrspCarryforward ?? 0;
  const rrspAnnualRoom = Math.min((inputs.annualIncome ?? 120_000) * 0.18, 31_560);

  return (
    <div>
      {/* Tax shelters */}
      <StepAdvanced label="Accounts" defaultOpen>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid var(--color-outline)',
          }}
        >
          {/* TFSA */}
          <div style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-outline)' }}>
            <Toggle
              checked={usesTFSA}
              onChange={(v) => patch({ renterUsesTFSA: v })}
              label="TFSA"
              description={`$7k/yr new room. Tax-free growth, no capital gains at exit. Est. lifetime room: ${fmtCAD.format(Math.min(95_000, Math.max(0, (2026 - Math.max((inputs.birthYear ?? 1990) + 18, 2009)) * 7_000)))}.`}
            />
          </div>

          {/* FHSA */}
          <div style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-outline)' }}>
            <Toggle
              checked={useFHSA}
              onChange={(v) => patch({ useFHSA: v, renterFhsaRoomOverride: v ? fhsaRoom : undefined })}
              label="FHSA"
              description="$8k/yr tax-deductible, tax-free growth. Up to $40k lifetime."
            />
            {useFHSA && (
              <div style={{ marginTop: '12px' }}>
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
                />
              </div>
            )}
          </div>

          {/* RRSP */}
          <div style={{ paddingTop: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-outline)' }}>
            <Toggle
              checked={usesRRSP}
              onChange={(v) => patch({ renterUsesRRSP: v, renterRrspCarryforward: v ? rrspCarry : 0 })}
              label="RRSP"
              description={`${fmtCAD.format(Math.round(rrspAnnualRoom))}/yr room. Refunds reinvested. Taxed as income at exit.`}
            />
            {usesRRSP && (
              <div style={{ marginTop: '12px' }}>
                <RangeInput
                  label="Unused carryforward room"
                  value={Math.round(rrspCarry / 1000)}
                  min={0}
                  max={200}
                  step={5}
                  onChange={(v) => patch({ renterRrspCarryforward: v * 1_000 })}
                  formatValue={(v) => `$${v}k`}
                  color="var(--color-renter)"
                  minLabel="$0"
                  maxLabel="$200k"
                />
              </div>
            )}
          </div>

          {/* Rental suite income */}
          <div style={{ paddingTop: '16px', paddingBottom: '4px' }}>
            <Toggle
              checked={(inputs.monthlyRentalIncome ?? 0) > 0}
              onChange={(v) => patch({ monthlyRentalIncome: v ? 1_500 : 0 })}
              label="Rental suite income"
              description="Net monthly income from a basement suite or secondary unit. Reduces effective owner housing cost."
            />
            {(inputs.monthlyRentalIncome ?? 0) > 0 && (
              <div style={{ marginTop: '12px' }}>
                <RangeInput
                  label="Monthly net rental income"
                  value={inputs.monthlyRentalIncome ?? 1_500}
                  min={200}
                  max={4_000}
                  step={100}
                  onChange={(v) => patch({ monthlyRentalIncome: v })}
                  formatValue={(v) => `$${v.toLocaleString('en-CA')}/mo`}
                  color="var(--color-owner)"
                  minLabel="$200"
                  maxLabel="$4k"
                  description="Enter income already net of your expected vacancy and expenses."
                />
              </div>
            )}
          </div>
        </div>
      </StepAdvanced>
    </div>
  );
}
