'use client';

import { motion, AnimatePresence } from 'motion/react';
import type { CalculatorInputs, HomeType } from '@/engine';
import { homeTypeDefaults, HOME_TYPES, suggestPriceAndRent } from '@/engine';
import { ChoiceGroup, FactorSlider, RangeInput, StepAdvanced } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const HOME_TYPE_LABEL: Record<HomeType, string> = {
  'condo-apt':          'Condo',
  'condo-townhouse':    'Condo TH',
  'freehold-townhouse': 'Freehold TH',
  'semi-detached':      'Semi',
  'detached':           'Detached',
};

const HOME_TYPE_FULL: Record<HomeType, string> = {
  'condo-apt':          'Condo apartment',
  'condo-townhouse':    'Condo townhouse',
  'freehold-townhouse': 'Freehold townhouse',
  'semi-detached':      'Semi-detached',
  'detached':           'Detached house',
};

export function StepHomeType({ inputs, patch }: Props) {
  const selectedType = inputs.homeType;
  const selectedDefaults = selectedType ? homeTypeDefaults(selectedType) : null;
  const maintenancePct = inputs.maintenancePct ?? 0.015;
  const strataFee = inputs.monthlyStrataFee ?? 0;
  const hasStrata = strataFee > 0 || (selectedType === 'condo-apt' || selectedType === 'condo-townhouse');
  const appreciation = inputs.homeAppreciationPct ?? 0.035;

  function handleHomeType(ht: HomeType) {
    const d = homeTypeDefaults(ht);
    const pc = inputs.postalCode;
    const suggestion = pc ? suggestPriceAndRent(pc, ht) : null;
    patch({
      homeType: ht,
      maintenancePct: d.maintenancePct,
      monthlyStrataFee: d.monthlyStrataFee,
      homeAppreciationPct: d.homeAppreciationPct,
      ...(suggestion
        ? {
            homePrice: suggestion.medianPrice,
            monthlyRent: Math.round(suggestion.suggestedMonthlyRent),
          }
        : {}),
    });
  }

  return (
    <div>
      {/* Type picker */}
      <div style={{ marginBottom: '16px' }}>
        <ChoiceGroup
          ariaLabel="Home type"
          columns={3}
          variant="chip"
          align="center"
          options={HOME_TYPES.map((ht) => ({ value: ht, label: HOME_TYPE_LABEL[ht] }))}
          value={selectedType}
          onChange={handleHomeType}
        />
      </div>

      {/* Contextual description */}
      <AnimatePresence mode="wait">
        {selectedDefaults && (
          <motion.p
            key={selectedType}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{
              fontSize: '13px',
              color: 'var(--color-text-muted)',
              lineHeight: 1.55,
              fontFamily: 'var(--font-sans), system-ui, sans-serif',
              marginBottom: '20px',
            }}
          >
            {HOME_TYPE_FULL[selectedType!]}. Defaults to {(maintenancePct * 100).toFixed(1)}% annual maintenance
            {strataFee > 0 ? `, $${strataFee.toLocaleString('en-CA')}/mo strata` : ', no strata fee'},
            and {(appreciation * 100).toFixed(1)}%/yr appreciation.
          </motion.p>
        )}
      </AnimatePresence>

      {/* Maintenance slider — always visible */}
      <FactorSlider
        factor={FACTORS.maintenance}
        inputs={inputs}
        patch={patch}
        description="Annual reserve for repairs and replacements, as a % of home value."
      />

      <StepAdvanced label="Strata fee and appreciation">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {hasStrata && (
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
              description="Mandatory fee to the condo corporation."
            />
          )}
          <FactorSlider factor={FACTORS.homeAppreciation} inputs={inputs} patch={patch} />
        </div>
      </StepAdvanced>
    </div>
  );
}
