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
  { value: 'AB', label: 'Alberta',          note: 'no LTT, no rent control' },
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
  void taxOpen; void setTaxOpen;

  function selectProvince(p: Province) {
    const next = defaultInputsFor(p);
    const prev = defaultInputsFor(current);

    const updates: Partial<CalculatorInputs> = {
      province: p,
      propertyTaxPct: next.propertyTaxPct,
      rentControlCapPct: next.rentControlCapPct,
      marginalTaxRatePct: next.marginalTaxRatePct,
      isTorontoMunicipalLTT: false,
    };

    // Re-seed price/rent only if the user hasn't changed them from the previous province default
    if (inputs.homePrice === prev.homePrice) updates.homePrice = next.homePrice;
    if (inputs.monthlyRent === prev.monthlyRent) updates.monthlyRent = next.monthlyRent;

    patch(updates);
  }

  const hasRentControl = inputs.rentControlCapPct != null;
  const capPct = inputs.rentControlCapPct ?? 0.025;
  const taxPct = (inputs.propertyTaxPct * 100).toFixed(2);
  const marginalPct = Math.round((inputs.marginalTaxRatePct ?? 0.43) * 1000) / 10;

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

      <StepAdvanced label="Rent control">
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--color-text-muted)',
          }}
        >
          <input
            type="checkbox"
            checked={hasRentControl}
            onChange={(e) =>
              patch({
                rentControlCapPct: e.target.checked
                  ? (defaultInputsFor(current).rentControlCapPct ?? 0.025)
                  : null,
              })
            }
            style={{ accentColor: 'var(--color-owner)', width: '15px', height: '15px' }}
          />
          Rent control applies (caps in-place rent increases)
        </label>

        {hasRentControl && (
          <RangeInput
            label={`Annual cap: ${(capPct * 100).toFixed(1)}%`}
            value={capPct * 100}
            min={0.5}
            max={5}
            step={0.25}
            onChange={(v) => patch({ rentControlCapPct: v / 100 })}
            formatValue={(v) => `${v.toFixed(1)}%`}
            color="var(--color-renter)"
            minLabel="0.5%"
            maxLabel="5%"
            description="ON guideline: 2.5%. BC: 3.0%. On a renter move, in-place rent resets to market."
          />
        )}
      </StepAdvanced>

      <StepAdvanced label="Tax rates">
        <RangeInput
          label={`Marginal income tax: ${marginalPct.toFixed(1)}%`}
          value={marginalPct}
          min={20}
          max={58}
          step={0.5}
          onChange={(v) => patch({ marginalTaxRatePct: v / 100 })}
          formatValue={(v) => `${v.toFixed(1)}%`}
          color="var(--color-owner)"
          minLabel="20%"
          maxLabel="58%"
          description="Combined federal + provincial at your income level. Affects capital gains tax on the renter's portfolio and RRSP/FHSA refunds."
        />

        <div style={{ marginTop: '20px' }}>
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
            description="Province default applied on selection. ON Toronto ~0.65%, BC ~0.3%, MB/SK ~1.2%."
          />
        </div>
      </StepAdvanced>
    </div>
  );
}
