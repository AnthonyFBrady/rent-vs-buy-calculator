'use client';

import type { CalculatorInputs } from '@/engine';
import { defaultInputsFor, suggestPriceAndRent } from '@/engine';
import { metrosForProvince } from '@/engine/data/regions/coordinates';
import { ChoiceGroup } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
  onAdvance?: () => void;
}

export function StepCity({ inputs, patch, onAdvance }: Props) {
  const cities = metrosForProvince(inputs.province);

  const activeFSA = (inputs.postalCode ?? '').substring(0, 3).toUpperCase();
  const selectedFSA = cities.find(c => c.fsa === activeFSA)?.fsa ?? undefined;

  function selectCity(fsa: string) {
    const homeType = inputs.homeType ?? 'condo-apt';
    const suggestion = suggestPriceAndRent(fsa, homeType);
    const provDefaults = defaultInputsFor(inputs.province);

    patch({
      postalCode: fsa,
      isTorontoMunicipalLTT: false,
      propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
      ...(suggestion ? {
        homePrice: suggestion.medianPrice,
        monthlyRent: Math.round(suggestion.suggestedMonthlyRent),
      } : {}),
    });

    onAdvance?.();
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
