'use client';

import { useState } from 'react';
import type { CalculatorInputs, Province } from '@/engine';
import { defaultInputsFor } from '@/engine';
import { SelectionCard, RangeInput, StepAdvanced } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const PROVINCES: { value: Province; label: string; note?: string }[] = [
  { value: 'ON', label: 'Ontario',          note: '+Toronto LTT option' },
  { value: 'BC', label: 'British Columbia', note: 'rent control' },
  { value: 'AB', label: 'Alberta',          note: 'no LTT' },
  { value: 'QC', label: 'Quebec' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland' },
  { value: 'PE', label: 'PEI' },
];

export function StepProvince({ inputs, patch }: Props) {
  const current = inputs.province;
  const [taxOpen, setTaxOpen] = useState(false);
  const taxPct = (inputs.propertyTaxPct * 100).toFixed(2);

  function selectProvince(p: Province) {
    const d = defaultInputsFor(p);
    patch({
      province: p,
      propertyTaxPct: d.propertyTaxPct,
      homePrice: d.homePrice,
      monthlyRent: d.monthlyRent,
      rentControlCapPct: d.rentControlCapPct,
      mortgageRatePct: d.mortgageRatePct,
      isTorontoMunicipalLTT: false,
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {PROVINCES.map((p) => (
          <SelectionCard
            key={p.value}
            selected={current === p.value}
            onClick={() => selectProvince(p.value)}
            label={p.label}
            sublabel={p.note}
            compact
          />
        ))}
      </div>

      {current === 'ON' && (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginTop: '16px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          <input
            type="checkbox"
            checked={inputs.isTorontoMunicipalLTT ?? false}
            onChange={(e) => patch({ isTorontoMunicipalLTT: e.target.checked })}
            style={{ accentColor: 'var(--color-owner)', width: '15px', height: '15px' }}
          />
          Within the City of Toronto (adds municipal LTT)
        </label>
      )}

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '12px',
          cursor: 'pointer',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
        }}
      >
        <input
          type="checkbox"
          checked={inputs.isFirstTimeBuyer ?? false}
          onChange={(e) => patch({ isFirstTimeBuyer: e.target.checked })}
          style={{ accentColor: 'var(--color-owner)', width: '15px', height: '15px' }}
        />
        First-time buyer (LTT rebate applied at closing)
      </label>

      <StepAdvanced label="Property tax">
        <RangeInput
          label={`Property tax: ${taxPct}%/yr`}
          value={inputs.propertyTaxPct * 100}
          min={0.3}
          max={2.5}
          step={0.05}
          onChange={(v) => patch({ propertyTaxPct: v / 100 })}
          formatValue={(v) => `${v.toFixed(2)}%`}
          color="var(--color-owner)"
          minLabel="0.30%"
          maxLabel="2.50%"
          description="Province default applied on selection. Ontario ~0.65–1.1%, BC ~0.3–0.6%."
        />
      </StepAdvanced>
    </div>
  );
}
