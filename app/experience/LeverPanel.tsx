'use client';

import { motion } from 'motion/react';
import type { CalculatorInputs, SimulationResult } from '@/engine';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  onClose: () => void;
  sim: SimulationResult;
  isDark: boolean;
  sidebar?: boolean;
}

const OWNER_COLOR = 'var(--color-owner)';
const RENTER_COLOR = 'var(--color-renter)';

const fmtFull = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

// ─── Lever definitions ────────────────────────────────────────────────────────

interface LeverConfig {
  id: string;
  label: string;
  description: string;
  group: 'market' | 'scenario' | 'behaviour' | 'profile';
  color: string;
  min: number;
  max: number;
  step: number;
  formatValue: (v: number) => string;
  getValue: (inputs: CalculatorInputs) => number;
  setValue: (v: number) => Partial<CalculatorInputs>;
}

const LEVERS: LeverConfig[] = [
  {
    id: 'homeAppreciation',
    label: 'Home appreciation',
    description: 'Annual % growth in home value. Long-run Canadian average ~3%.',
    group: 'market',
    color: OWNER_COLOR,
    min: 0, max: 8, step: 0.25,
    formatValue: (v) => `${v.toFixed(1)}%`,
    getValue: (inp) => inp.homeAppreciationPct * 100,
    setValue: (v) => ({ homeAppreciationPct: v / 100 }),
  },
  {
    id: 'investmentReturn',
    label: 'Investment return',
    description: '7% = 4% real + 3% inflation. Nominal, before fees.',
    group: 'market',
    color: RENTER_COLOR,
    min: 2, max: 12, step: 0.25,
    formatValue: (v) => `${v.toFixed(1)}%`,
    getValue: (inp) => inp.investmentReturnPct * 100,
    setValue: (v) => ({ investmentReturnPct: v / 100 }),
  },
  {
    id: 'mortgageRate',
    label: 'Mortgage rate',
    description: 'Initial 5-year term rate.',
    group: 'market',
    color: OWNER_COLOR,
    min: 2, max: 10, step: 0.25,
    formatValue: (v) => `${v.toFixed(2)}%`,
    getValue: (inp) => inp.mortgageRatePct * 100,
    setValue: (v) => ({ mortgageRatePct: v / 100 }),
  },
  {
    id: 'renewalRate',
    label: 'Renewal rate',
    description: 'Rate at 5-year renewal. Match initial rate to model no change.',
    group: 'market',
    color: OWNER_COLOR,
    min: 2, max: 10, step: 0.25,
    formatValue: (v) => `${v.toFixed(2)}%`,
    getValue: (inp) => (inp.mortgageRenewalRatePct ?? inp.mortgageRatePct) * 100,
    setValue: (v) => ({ mortgageRenewalRatePct: v / 100 }),
  },
  {
    id: 'holdingPeriod',
    label: 'Holding period',
    description: 'How many years you are comparing.',
    group: 'scenario',
    color: '#A78BFA',
    min: 5, max: 40, step: 1,
    formatValue: (v) => `${v} yr`,
    getValue: (inp) => inp.holdingPeriodYears,
    setValue: (v) => ({ holdingPeriodYears: v }),
  },
  {
    id: 'downPayment',
    label: 'Down payment',
    description: '% of home price paid upfront. Under 20% triggers CMHC.',
    group: 'scenario',
    color: OWNER_COLOR,
    min: 5, max: 50, step: 1,
    formatValue: (v) => `${v.toFixed(0)}%`,
    getValue: (inp) => inp.downPaymentPct * 100,
    setValue: (v) => ({ downPaymentPct: v / 100 }),
  },
  {
    id: 'monthlyRent',
    label: 'Monthly rent',
    description: 'What the renter pays for a comparable home.',
    group: 'scenario',
    color: RENTER_COLOR,
    min: 500, max: 10000, step: 100,
    formatValue: (v) => fmtFull.format(v),
    getValue: (inp) => inp.monthlyRent,
    setValue: (v) => ({ monthlyRent: v }),
  },
  {
    id: 'discipline',
    label: 'Savings discipline',
    description: 'Fraction of the monthly gap the renter actually invests. Most load-bearing assumption.',
    group: 'behaviour',
    color: RENTER_COLOR,
    min: 0, max: 100, step: 5,
    formatValue: (v) => `${v.toFixed(0)}%`,
    getValue: (inp) => inp.savingsDisciplinePct * 100,
    setValue: (v) => ({ savingsDisciplinePct: v / 100 }),
  },
  {
    id: 'ownerMoves',
    label: 'Owner moves',
    description: 'Each sell + rebuy costs ~8–10% of home value in fees.',
    group: 'behaviour',
    color: OWNER_COLOR,
    min: 0, max: 4, step: 1,
    formatValue: (v) => `${v}`,
    getValue: (inp) => inp.ownerMoves ?? 0,
    setValue: (v) => ({ ownerMoves: v }),
  },
  {
    id: 'renterMoves',
    label: 'Renter moves',
    description: 'Each relocation resets rent to market. Low friction vs. owner moves.',
    group: 'behaviour',
    color: RENTER_COLOR,
    min: 0, max: 4, step: 1,
    formatValue: (v) => `${v}`,
    getValue: (inp) => inp.renterMoves ?? 0,
    setValue: (v) => ({ renterMoves: v }),
  },
  {
    id: 'rrspWithdrawalRate',
    label: 'RRSP withdrawal rate',
    description: 'Effective tax rate when drawing down RRSP in retirement. Usually lower than working MTR.',
    group: 'behaviour',
    color: RENTER_COLOR,
    min: 15, max: 45, step: 1,
    formatValue: (v) => `${v}%`,
    getValue: (inp) => (inp.rrspWithdrawalTaxRatePct ?? 0.25) * 100,
    setValue: (v) => ({ rrspWithdrawalTaxRatePct: v / 100 }),
  },
  {
    id: 'birthYear',
    label: 'Birth year',
    description: 'Sets TFSA room available (eligible from the year you turn 18, earliest 2009).',
    group: 'profile',
    color: '#A78BFA',
    min: 1960, max: 2005, step: 1,
    formatValue: (v) => `${v}`,
    getValue: (inp) => inp.birthYear ?? 1990,
    setValue: (v) => ({ birthYear: v }),
  },
];

const GROUP_LABELS: Record<string, string> = {
  market: 'Market',
  scenario: 'Your scenario',
  behaviour: 'Behaviour',
  profile: 'Your profile',
};

const ALL_GROUPS = ['market', 'scenario', 'behaviour', 'profile'] as const;

export function LeverPanel({ inputs, patch, onClose, sim, isDark, sidebar }: Props) {
  const advantage = sim.exit.netAdvantageToOwner;
  const winner = advantage > 5000 ? 'buy' : advantage < -5000 ? 'rent' : 'tie';

  const content = (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' }}>
      {/* Drag handle — bottom drawer only */}
      {!sidebar && (
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--color-outline)' }} />
        </div>
      )}

      <div style={{ padding: sidebar ? '20px 20px 40px' : '0 32px 56px' }}>
        {/* Header */}
        <div
          className="flex items-start justify-between"
          style={{ paddingBottom: '24px', paddingTop: '20px' }}
        >
          <div>
            <p className="font-medium">Adjust assumptions</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {winner === 'rent' && (
                <>Renting leads by <span style={{ color: RENTER_COLOR }}>{fmtFull.format(Math.abs(advantage))}</span></>
              )}
              {winner === 'buy' && (
                <>Buying leads by <span style={{ color: OWNER_COLOR }}>{fmtFull.format(Math.abs(advantage))}</span></>
              )}
              {winner === 'tie' && 'Roughly a tie at current inputs'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '22px',
              lineHeight: 1,
              marginTop: '2px',
            }}
          >
            ×
          </button>
        </div>

        {/* Levers by group */}
        {ALL_GROUPS.map((group, gi) => {
          const groupLevers = LEVERS.filter((l) => l.group === group);
          if (groupLevers.length === 0) return null;
          return (
            <div
              key={group}
              className={gi > 0 ? 'mt-8 pt-8' : ''}
              style={gi > 0 ? { borderTop: '1px solid var(--color-outline)' } : undefined}
            >
              <p className="mb-6 text-xs uppercase tracking-[0.1em] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-7">
                {groupLevers.map((lever) => {
                  const val = lever.getValue(inputs);
                  return (
                    <div key={lever.id}>
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm">{lever.label}</p>
                        <span
                          className="font-serif text-xl tabular-nums"
                          style={{ color: lever.color }}
                        >
                          {lever.formatValue(val)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={lever.min}
                        max={lever.max}
                        step={lever.step}
                        value={val}
                        onChange={(e) => patch(lever.setValue(parseFloat(e.target.value)))}
                        className="mt-2.5 w-full"
                        style={{
                          '--slider-color': lever.color,
                          '--slider-fill': `${((val - lever.min) / (lever.max - lever.min)) * 100}%`,
                        } as React.CSSProperties}
                      />
                      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                        {lever.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (sidebar) {
    return <div style={{ height: '100%', borderRight: '1px solid var(--color-outline)' }}>{content}</div>;
  }

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 38 }}
      className="fixed inset-x-0 bottom-0 z-50"
      style={{
        borderTop: '1px solid var(--color-outline)',
        maxHeight: '72vh',
      }}
    >
      {content}
    </motion.div>
  );
}
