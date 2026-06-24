'use client';

import type { CalculatorInputs } from '@/engine';
import { defaultInputsFor, suggestPriceAndRent } from '@/engine';
import { metrosForProvince } from '@/engine/data/regions/coordinates';
import { ChoiceGroup } from '../components';

export interface CityPending {
  fsa: string;
  label: string;
  homePrice?: number;
  monthlyRent?: number;
  propertyTaxPct?: number;
}

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  onAdvance?: () => void;
  /** FSA to highlight as selected while pending (postalCode not yet patched). */
  pendingFSA?: string;
  /** Called on chip click instead of patching — lets the CTA handle the actual commit. */
  onPendingSelect?: (p: CityPending) => void;
}

export function StepCity({ inputs, patch, onAdvance, pendingFSA, onPendingSelect }: Props) {
  void patch; void onAdvance; // retained in props for external compatibility
  const cities = metrosForProvince(inputs.province);

  const activeFSA = (inputs.postalCode ?? '').substring(0, 3).toUpperCase();
  const committedFSA = cities.find(c => c.fsa === activeFSA)?.fsa;
  // Show pending as selected; fall back to committed selection.
  const selectedFSA = pendingFSA ?? committedFSA;

  function selectCity(fsa: string) {
    const city = cities.find(c => c.fsa === fsa);
    if (!city) return;
    const homeType = inputs.homeType ?? 'condo-apt';
    const suggestion = suggestPriceAndRent(fsa, homeType);
    const provDefaults = defaultInputsFor(inputs.province);
    onPendingSelect?.({
      fsa,
      label: city.metro,
      homePrice: suggestion?.medianPrice,
      monthlyRent: suggestion ? Math.round(suggestion.suggestedMonthlyRent) : undefined,
      propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
    });
  }

  return (
    <div>
      <ChoiceGroup
        ariaLabel="City"
        columns={2}
        variant="chip"
        align="left"
        options={cities.map(c => ({ value: c.fsa, label: c.metro }))}
        value={selectedFSA}
        onChange={selectCity}
      />
      <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
        Or tap a city on the map.
      </p>
    </div>
  );
}
