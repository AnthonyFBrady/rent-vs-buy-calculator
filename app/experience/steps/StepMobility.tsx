'use client';

import type { CalculatorInputs } from '@/engine';
import { StepCounter } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmtCad = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function StepMobility({ inputs, patch }: Props) {
  const ownerMoves = inputs.ownerMoves ?? 0;
  const renterMoves = inputs.renterMoves ?? 0;
  const ownerCostEst = inputs.homePrice * 0.09;
  const hasRentControl = inputs.rentControlCapPct != null && inputs.rentControlCapPct > 0;

  return (
    <div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Owner moves */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-owner)' }}>Owner</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Each move: commission, LTT, legal, movers
            </p>
          </div>
          <StepCounter
            value={ownerMoves}
            min={0}
            max={4}
            color="var(--color-owner)"
            onChange={(v) => patch({ ownerMoves: v })}
          />
          {ownerMoves > 0 && (
            <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--color-owner) 70%, transparent)' }}>
              ~{fmtCad.format(ownerCostEst * ownerMoves)} total in friction
            </p>
          )}
          {ownerMoves === 0 && (
            <p className="text-xs text-muted" style={{ opacity: 0.5 }}>Stay put the full period</p>
          )}
        </div>

        {/* Renter moves */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-renter)' }}>Renter</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Each move: $400 movers + rent resets to market
            </p>
          </div>
          <StepCounter
            value={renterMoves}
            min={0}
            max={4}
            color="var(--color-renter)"
            onChange={(v) => patch({ renterMoves: v })}
          />
          {renterMoves > 0 && hasRentControl && (
            <p className="text-xs" style={{ color: 'color-mix(in srgb, var(--color-renter) 70%, transparent)' }}>
              Each move gives up the rent-control discount
            </p>
          )}
          {renterMoves === 0 && (
            <p className="text-xs text-muted" style={{ opacity: 0.5 }}>Stay put the full period</p>
          )}
        </div>
      </div>
    </div>
  );
}
