'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { CalculatorInputs, HomeType } from '@/engine';
import { homeTypeDefaults, HOME_TYPES } from '@/engine';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const fmt = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

const HOME_TYPE_SHORT: Record<HomeType, string> = {
  'condo-apt': 'Condo',
  'condo-townhouse': 'Condo TH',
  'freehold-townhouse': 'Freehold TH',
  'semi-detached': 'Semi',
  detached: 'Detached',
};

const HOME_TYPE_IMPACT: Record<HomeType, { headline: string; details: string }> = {
  'condo-apt': {
    headline: 'Lower appreciation, lower maintenance — but strata adds ongoing cost.',
    details: "Condo apartments have appreciated ~2.5%/yr in Ontario vs ~3.5% for ground-oriented homes (CREA HPI 2014–2024). The strata fee ($650/mo) is added to the owner's annual carrying cost, making the owner line higher in early years.",
  },
  'condo-townhouse': {
    headline: 'Moderate appreciation with a small strata fee.',
    details: 'Condo townhouses share appreciation closer to ground-oriented housing (~3.0%/yr). Reduced strata ($300/mo) covers only common elements. Lower maintenance than freehold since the condo corp handles exterior capex.',
  },
  'freehold-townhouse': {
    headline: 'Ground-oriented appreciation, no strata, full maintenance.',
    details: 'Freehold means no condo fee, but you own the full envelope — roof, windows, mechanicals. Maintenance budgeted at 1.0%/yr. Appreciation aligns with ground-oriented housing (~3.5%/yr).',
  },
  'semi-detached': {
    headline: 'Close to detached appreciation with slightly higher maintenance.',
    details: 'Shares one wall but is otherwise a full freehold property. Maintenance at 1.3%/yr reflects a similar envelope responsibility to detached. Appreciation tracks detached at ~3.5%/yr.',
  },
  detached: {
    headline: 'Highest appreciation potential — and highest maintenance budget.',
    details: 'Full envelope responsibility: roof, siding, foundation, mechanicals. CMHC benchmarks maintenance at 1.5–2.0%/yr for detached homes. This is the home type where the payoff advantage is largest at long horizons.',
  },
};

export function StepHomeType({ inputs, patch }: Props) {
  function handleHomeType(ht: HomeType) {
    const d = homeTypeDefaults(ht);
    patch({
      homeType: ht,
      maintenancePct: d.maintenancePct,
      monthlyStrataFee: d.monthlyStrataFee,
      homeAppreciationPct: d.homeAppreciationPct,
    });
  }

  const selectedType = inputs.homeType;
  const impact = selectedType ? HOME_TYPE_IMPACT[selectedType] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >
      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        What are you buying?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Home type sets appreciation rate, maintenance budget, and strata fee — watch the owner line react.
      </p>

      <div className="mt-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {HOME_TYPES.map((ht) => {
            const d = homeTypeDefaults(ht);
            const selected = inputs.homeType === ht;
            return (
              <button
                key={ht}
                type="button"
                onClick={() => handleHomeType(ht)}
                className="rounded-sm border px-3 py-3 text-left transition-all duration-150"
                style={{
                  borderColor: selected ? 'color-mix(in srgb, var(--color-owner) 55%, transparent)' : 'var(--color-outline)',
                  backgroundColor: selected ? 'color-mix(in srgb, var(--color-owner) 9%, transparent)' : 'transparent',
                }}
              >
                <p className="text-xs font-medium leading-snug" style={{ color: selected ? 'var(--color-owner)' : 'var(--color-text)' }}>
                  {HOME_TYPE_SHORT[ht]}
                </p>
                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="text-[10px] text-muted" style={{ opacity: 0.65 }}>↑ {(d.homeAppreciationPct * 100).toFixed(1)}%/yr</span>
                  <span className="text-[10px] text-muted" style={{ opacity: 0.65 }}>⚙ {(d.maintenancePct * 100).toFixed(1)}%</span>
                  {d.monthlyStrataFee > 0 && (
                    <span className="text-[10px] text-muted" style={{ opacity: 0.65 }}>≡ {fmt.format(d.monthlyStrataFee)}/mo</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {impact && (
            <motion.div
              key={selectedType}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22 }}
              className="mt-4"
            >
              <div>
                <p className="text-xs font-medium leading-snug" style={{ color: 'var(--color-owner)' }}>{impact.headline}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{impact.details}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
