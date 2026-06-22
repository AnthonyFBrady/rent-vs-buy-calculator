'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { CalculatorInputs, HomeType } from '@/engine';
import { homeTypeDefaults, HOME_TYPES } from '@/engine';
import { RangeInput, ChoiceGroup, FactorSlider } from '../components';
import { FACTORS } from '../config/factors';

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

export function StepHome({ inputs, patch }: Props) {
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
        <FactorSlider
          factor={FACTORS.homePrice}
          inputs={inputs}
          patch={patch}
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
        <ChoiceGroup
          ariaLabel="Home type"
          columns={3}
          variant="chip"
          align="center"
          options={HOME_TYPES.map((ht) => ({ value: ht, label: HOME_TYPE_SHORT[ht] }))}
          value={selectedType}
          onChange={handleHomeType}
        />

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
              Maintenance and any strata fee adjust below. You set appreciation in the market step.
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Sliders — always visible, update immediately when type changes */}
      <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <FactorSlider
          factor={FACTORS.maintenance}
          inputs={inputs}
          patch={patch}
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
      </div>
    </div>
  );
}
