'use client';

import type { CalculatorInputs, Province } from '@/engine';
import { defaultInputsFor } from '@/engine';
import { RangeInput, StepAdvanced, Toggle } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const PROVINCES: { value: Province; label: string }[] = [
  { value: 'ON', label: 'Ontario' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
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

  function selectProvince(p: Province) {
    const next = defaultInputsFor(p);
    patch({
      province: p,
      propertyTaxPct: next.propertyTaxPct,
      rentControlCapPct: next.rentControlCapPct,
      marginalTaxRatePct: next.marginalTaxRatePct,
      isTorontoMunicipalLTT: false,
    });
  }

  const hasRentControl = inputs.rentControlCapPct != null;
  const capPct = inputs.rentControlCapPct ?? 0.025;
  const taxPct = (inputs.propertyTaxPct * 100).toFixed(2);
  const marginalPct = Math.round((inputs.marginalTaxRatePct ?? 0.43) * 1000) / 10;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '16px' }}>
        {PROVINCES.map((p) => {
          const isSelected = current === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => selectProvince(p.value)}
              style={{
                height: '38px',
                padding: '0 12px',
                borderRadius: '8px',
                border: `1px solid ${isSelected ? 'transparent' : 'var(--color-outline)'}`,
                backgroundColor: isSelected ? 'var(--color-owner)' : 'var(--color-surface)',
                color: isSelected ? '#fff' : 'var(--color-text-muted)',
                fontSize: '13px',
                fontWeight: isSelected ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
                fontFamily: 'var(--font-sans), system-ui, sans-serif',
                letterSpacing: '-0.01em',
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {current === 'ON' && (
        <div style={{ marginTop: '8px' }}>
          <Toggle
            checked={inputs.isTorontoMunicipalLTT ?? false}
            onChange={(v) => patch({ isTorontoMunicipalLTT: v })}
            label="Within the City of Toronto"
            description="Adds the Toronto municipal LTT at closing. Moves the owner's wealth line down — renter unaffected."
            accentColor="var(--color-owner)"
          />
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <Toggle
          checked={inputs.isFirstTimeBuyer ?? false}
          onChange={(v) => patch({ isFirstTimeBuyer: v })}
          label="First-time buyer"
          description="Applies the LTT rebate at closing. Moves the owner's wealth line up — renter unaffected."
          accentColor="var(--color-owner)"
        />
      </div>

      <StepAdvanced label="Rent control">
        <div style={{ marginBottom: '16px' }}>
          <Toggle
            checked={hasRentControl}
            onChange={(v) =>
              patch({
                rentControlCapPct: v
                  ? (defaultInputsFor(current).rentControlCapPct ?? 0.025)
                  : null,
              })
            }
            label="Rent control applies"
            description="Caps annual in-place rent increases. On a renter move, rent resets to market (vacancy decontrol)."
            accentColor="var(--color-renter)"
          />
        </div>

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
          <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
            Property tax is a direct, unrecoverable owner cost. Higher rates move the owner&apos;s wealth line down.
          </p>
        </div>
      </StepAdvanced>
    </div>
  );
}
