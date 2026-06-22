'use client';

import type { CalculatorInputs, Province } from '@/engine';
import { defaultInputsFor } from '@/engine';
import { ChoiceGroup } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  /** Called after province is selected — auto-advances to city step. */
  onAdvance?: () => void;
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

export function StepProvince({ inputs, patch, onAdvance }: Props) {
  function selectProvince(p: Province) {
    const next = defaultInputsFor(p);
    patch({
      province: p,
      postalCode: undefined,
      propertyTaxPct: next.propertyTaxPct,
      rentControlCapPct: next.rentControlCapPct,
      marginalTaxRatePct: next.marginalTaxRatePct,
      isTorontoMunicipalLTT: false,
    });
    onAdvance?.();
  }

  return (
    <div>
      <ChoiceGroup
        ariaLabel="Province"
        columns={2}
        variant="chip"
        align="left"
        options={PROVINCES.map(p => ({ value: p.value, label: p.label }))}
        value={inputs.province}
        onChange={selectProvince}
      />
      <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
        Or tap a province on the map.
      </p>
    </div>
  );
}
