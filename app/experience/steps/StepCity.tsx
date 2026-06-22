'use client';

import { useState } from 'react';
import type { CalculatorInputs } from '@/engine';
import { defaultInputsFor, suggestPriceAndRent } from '@/engine';
import { metrosForProvince } from '@/engine/data/regions/coordinates';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

export function StepCity({ inputs, patch }: Props) {
  const cities = metrosForProvince(inputs.province);

  // Derive which city is currently "selected" from the postalCode
  const activeFSA = (inputs.postalCode ?? '').substring(0, 3).toUpperCase();
  const selectedFSA = cities.find(c => c.fsa === activeFSA)?.fsa ?? '';

  const [status, setStatus] = useState<string | null>(null);

  function selectCity(fsa: string) {
    if (!fsa) {
      const next = defaultInputsFor(inputs.province);
      patch({ postalCode: undefined, propertyTaxPct: next.propertyTaxPct, isTorontoMunicipalLTT: false });
      setStatus(null);
      return;
    }

    const homeType = inputs.homeType ?? 'condo-apt';
    const suggestion = suggestPriceAndRent(fsa, homeType);
    const provDefaults = defaultInputsFor(inputs.province);

    patch({
      postalCode: fsa,
      isTorontoMunicipalLTT: false, // refined in AREA step via borough picker
      propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
      ...(suggestion
        ? {
            homePrice: suggestion.medianPrice,
            monthlyRent: Math.round(suggestion.suggestedMonthlyRent),
          }
        : {}),
    });

    setStatus(suggestion ? `Using data for ${suggestion.regionName}.` : null);
  }

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <select
          value={selectedFSA}
          onChange={e => selectCity(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 36px 12px 14px',
            borderRadius: '10px',
            border: '1.5px solid var(--color-border, rgba(0,0,0,0.12))',
            background: 'var(--color-surface, #fff)',
            color: selectedFSA ? 'var(--color-text)' : 'var(--color-text-faint)',
            fontSize: '15px',
            fontFamily: 'inherit',
            cursor: 'pointer',
            appearance: 'none',
            WebkitAppearance: 'none',
            outline: 'none',
          }}
        >
          <option value="">Select a city</option>
          {cities.map(city => (
            <option key={city.fsa} value={city.fsa}>
              {city.metro}
            </option>
          ))}
        </select>
        <div
          style={{
            position: 'absolute',
            right: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-faint)',
            fontSize: '10px',
          }}
        >
          ▼
        </div>
      </div>

      {status && (
        <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
          {status}
        </p>
      )}

      {!selectedFSA && (
        <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
          Selecting a city seeds the price and rent defaults for that market.
          You can refine further in the next step.
        </p>
      )}
    </div>
  );
}
