'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { CalculatorInputs, HomeType } from '@/engine';
import { homeTypeDefaults, HOME_TYPES } from '@/engine';
import { RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const HOME_TYPE_SHORT: Record<HomeType, string> = {
  'condo-apt':          'Condo',
  'condo-townhouse':    'Condo TH',
  'freehold-townhouse': 'Freehold TH',
  'semi-detached':      'Semi',
  'detached':           'Detached',
};

const fmtCAD = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', maximumFractionDigits: 0,
});
const fmtCompact = new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
  notation: 'compact',
});

export function StepHome({ inputs, patch }: Props) {
  const priceK = Math.round(inputs.homePrice / 1_000);
  const selectedType = inputs.homeType;
  const selectedDefaults = selectedType ? homeTypeDefaults(selectedType) : null;

  const maintenancePct = inputs.maintenancePct ?? 0.015;
  const strataFee = inputs.monthlyStrataFee ?? 0;
  const hasStrata = strataFee > 0;
  const appreciation = inputs.homeAppreciationPct ?? 0.035;

  function handleHomeType(ht: HomeType) {
    const d = homeTypeDefaults(ht);
    patch({
      homeType: ht,
      maintenancePct: d.maintenancePct,
      monthlyStrataFee: d.monthlyStrataFee,
      homeAppreciationPct: d.homeAppreciationPct,
    });
  }

  return (
    <div>
      {/* Home price */}
      <div style={{ marginBottom: '28px' }}>
        <RangeInput
          label="Home price"
          value={priceK}
          min={200}
          max={3000}
          step={25}
          onChange={(v) => patch({ homePrice: v * 1_000 })}
          formatValue={(v) => `${fmtCompact.format(v * 1_000)}`}
          color="var(--color-owner)"
          minLabel="$200k"
          maxLabel="$3M"
          description={fmtCAD.format(inputs.homePrice)}
        />
      </div>

      {/* Home type */}
      <div>
        <p
          style={{
            fontSize: '11px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-text-faint)',
            marginBottom: '10px',
          }}
        >
          Home type
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '6px',
          }}
        >
          {HOME_TYPES.map((ht) => {
            const selected = inputs.homeType === ht;
            return (
              <button
                key={ht}
                type="button"
                onClick={() => handleHomeType(ht)}
                style={{
                  padding: '9px 8px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: `1px solid ${selected ? 'var(--color-owner)' : 'var(--color-outline)'}`,
                  backgroundColor: selected
                    ? 'color-mix(in srgb, var(--color-owner) 8%, transparent)'
                    : 'var(--color-bg-elevated)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                }}
              >
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: selected ? 'var(--color-owner)' : 'var(--color-text)',
                    fontFamily: 'var(--font-sans), system-ui, sans-serif',
                    lineHeight: 1.2,
                  }}
                >
                  {HOME_TYPE_SHORT[ht]}
                </p>
              </button>
            );
          })}
        </div>

        {/* Contextual description — updates when type changes */}
        <AnimatePresence mode="wait">
          {selectedDefaults && (
            <motion.p
              key={selectedType}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              style={{
                marginTop: '12px',
                fontSize: '13px',
                color: 'var(--color-text-muted)',
                lineHeight: 1.55,
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
              }}
            >
              {selectedDefaults.description}{' '}
              Defaults to {(maintenancePct * 100).toFixed(1)}% annual maintenance
              {hasStrata ? `, $${strataFee.toLocaleString('en-CA')}/mo strata` : ', no strata fee'},
              and {(appreciation * 100).toFixed(1)}%/yr appreciation.
              Adjust below if yours differs.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Sliders — always visible, update immediately when type changes */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <RangeInput
          label="Annual maintenance"
          value={Math.round(maintenancePct * 100 * 10) / 10}
          min={0.5}
          max={3.0}
          step={0.1}
          onChange={(v) => patch({ maintenancePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-owner)"
          minLabel="0.5%"
          maxLabel="3.0%"
          description="Annual reserve for repairs and replacements, as a % of home value."
        />
        <AnimatePresence>
          {hasStrata && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <RangeInput
                label="Monthly strata fee"
                value={strataFee}
                min={0}
                max={1500}
                step={50}
                onChange={(v) => patch({ monthlyStrataFee: v })}
                formatValue={(v) => `$${v}/mo`}
                color="var(--color-owner)"
                minLabel="$0"
                maxLabel="$1,500"
                description="Mandatory fee to the condo corporation. Covers common-element maintenance and reserve fund."
              />
            </motion.div>
          )}
        </AnimatePresence>
        <RangeInput
          label="Home appreciation"
          value={Math.round(appreciation * 100 * 2) / 2}
          min={0}
          max={8}
          step={0.5}
          onChange={(v) => patch({ homeAppreciationPct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-owner)"
          minLabel="0%"
          maxLabel="8%"
          description="Nominal annual home price growth. Canadian long-run average is ~3%."
        />
      </div>
    </div>
  );
}
