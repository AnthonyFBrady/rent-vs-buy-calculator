'use client';

import { useState, useEffect } from 'react';
import type { CalculatorInputs, Province } from '@/engine';
import {
  defaultInputsFor,
  provinceFromPostalCode,
  suggestPriceAndRent,
  normalizeFSA3,
} from '@/engine';
import {
  METRO_CENTROIDS,
  metrosForProvince,
} from '@/engine/data/regions/coordinates';
import { TextInput, Toggle, ChoiceGroup, StepAdvanced, FactorSlider, RangeInput } from '../components';
import { FACTORS } from '../config/factors';

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

// Toronto sub-regions with representative FSAs matching ontarioBoroughs data
const TORONTO_BOROUGHS: { label: string; fsa: string }[] = [
  { label: 'Downtown',    fsa: 'M5V' },
  { label: 'East End',    fsa: 'M4K' },
  { label: 'West End',    fsa: 'M6J' },
  { label: 'North York',  fsa: 'M3C' },
  { label: 'Scarborough', fsa: 'M1C' },
  { label: 'Etobicoke',   fsa: 'M8V' },
];
const TORONTO_BOROUGH_FSAS = new Set(TORONTO_BOROUGHS.map(b => b.fsa));

function patchFromFSA(
  fsa: string,
  currentInputs: CalculatorInputs,
  patch: (p: Partial<CalculatorInputs>) => void,
  setStatus: (s: string | null) => void,
) {
  const homeType = currentInputs.homeType ?? 'condo-apt';
  const suggestion = suggestPriceAndRent(fsa, homeType);
  const province = currentInputs.province;
  const provDefaults = defaultInputsFor(province);

  patch({
    postalCode: fsa,
    propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
    isTorontoMunicipalLTT: suggestion?.municipalLTT ?? false,
    ...(suggestion
      ? {
          homePrice: suggestion.medianPrice,
          monthlyRent: Math.round(suggestion.suggestedMonthlyRent),
        }
      : {}),
  });

  setStatus(suggestion ? `Showing data for ${suggestion.regionName}.` : null);
}

export function StepLocation({ inputs, patch }: Props) {
  // pcRaw mirrors the postal code text input (Advanced section)
  const [pcRaw, setPcRaw] = useState(inputs.postalCode ?? '');
  const [pcStatus, setPcStatus] = useState<string | null>(null);

  // Which city was selected from the dropdown (stores MetroCentroid.fsa)
  const [selectedCityFSA, setSelectedCityFSA] = useState<string>(() => {
    if (!inputs.postalCode || inputs.postalCode.length < 3) return '';
    const fsa3 = inputs.postalCode.substring(0, 3).toUpperCase();
    const metro = METRO_CENTROIDS.find(m => m.fsa === fsa3 && m.province === inputs.province);
    return metro?.fsa ?? '';
  });

  const hasRentControl = inputs.rentControlCapPct != null;
  const capPct = inputs.rentControlCapPct ?? 0.025;

  const citiesForProvince = metrosForProvince(inputs.province);

  // Show borough picker only when Toronto was explicitly selected from dropdown
  const showBoroughPicker = selectedCityFSA === 'M5V';

  // Which borough chip is active (first 3 chars of postalCode if it's a known Toronto FSA)
  const fsa3 = (inputs.postalCode ?? '').substring(0, 3).toUpperCase();
  const selectedBorough = TORONTO_BOROUGH_FSAS.has(fsa3) ? fsa3 : '';

  function selectProvince(p: Province) {
    const next = defaultInputsFor(p);
    setSelectedCityFSA('');
    setPcRaw('');
    setPcStatus(null);
    patch({
      province: p,
      postalCode: undefined,
      propertyTaxPct: next.propertyTaxPct,
      rentControlCapPct: next.rentControlCapPct,
      marginalTaxRatePct: next.marginalTaxRatePct,
      isTorontoMunicipalLTT: false,
    });
  }

  function selectCity(fsa: string) {
    setSelectedCityFSA(fsa);
    setPcRaw(fsa);
    if (!fsa) {
      const next = defaultInputsFor(inputs.province);
      patch({ postalCode: undefined, propertyTaxPct: next.propertyTaxPct });
      setPcStatus(null);
      return;
    }
    patchFromFSA(fsa, inputs, patch, setPcStatus);
  }

  function selectBorough(fsa: string) {
    setPcRaw(fsa);
    patchFromFSA(fsa, inputs, patch, setPcStatus);
  }

  // Called from the Advanced postal code text input only
  function applyPostalCode(raw: string) {
    const clean = raw.replace(/\s+/g, '').toUpperCase();
    setPcRaw(clean);

    if (clean.length < 3) {
      setPcStatus(null);
      return;
    }

    const province = provinceFromPostalCode(clean);
    if (!province) {
      setPcStatus('Postal code not recognized.');
      return;
    }

    const fsa3local = normalizeFSA3(clean);
    const homeType = inputs.homeType ?? 'condo-apt';
    const suggestion = fsa3local ? suggestPriceAndRent(clean, homeType) : null;
    const provDefaults = defaultInputsFor(province);

    setPcStatus(suggestion ? `Showing data for ${suggestion.regionName}.` : null);

    // Update selectedCityFSA if this FSA matches a known metro centroid
    const matchedMetro = METRO_CENTROIDS.find(m => m.fsa === clean.substring(0, 3) && m.province === province);
    if (matchedMetro) setSelectedCityFSA(matchedMetro.fsa);

    patch({
      postalCode: clean,
      province,
      propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
      isTorontoMunicipalLTT: suggestion?.municipalLTT ?? false,
      rentControlCapPct: provDefaults.rentControlCapPct,
      marginalTaxRatePct: provDefaults.marginalTaxRatePct,
      ...(suggestion
        ? {
            homePrice: suggestion.medianPrice,
            monthlyRent: Math.round(suggestion.suggestedMonthlyRent),
          }
        : {}),
    });
  }

  // When postalCode is cleared externally (e.g. map province click), reset local city state.
  useEffect(() => {
    if (!inputs.postalCode && selectedCityFSA) {
      setSelectedCityFSA('');
      setPcRaw('');
      setPcStatus(null);
    }
  }, [inputs.postalCode, selectedCityFSA]);

  // Seed status text if postal code was pre-populated (from ?pc= URL param)
  useEffect(() => {
    if (inputs.postalCode && !pcStatus) {
      const homeType = inputs.homeType ?? 'condo-apt';
      const suggestion = suggestPriceAndRent(inputs.postalCode, homeType);
      if (suggestion) setPcStatus(`Showing data for ${suggestion.regionName}.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* Province chips */}
      <div style={{ marginBottom: '20px' }}>
        <ChoiceGroup
          ariaLabel="Province"
          columns={2}
          variant="chip"
          align="left"
          options={PROVINCES.map(p => ({ value: p.value, label: p.label }))}
          value={inputs.province}
          onChange={selectProvince}
        />
      </div>

      {/* City dropdown — always shown once province is selected */}
      {citiesForProvince.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-faint)',
              marginBottom: '8px',
            }}
          >
            City
          </label>
          <div style={{ position: 'relative' }}>
            <select
              value={selectedCityFSA}
              onChange={e => selectCity(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 36px 10px 12px',
                borderRadius: '8px',
                border: '1.5px solid var(--color-border, rgba(0,0,0,0.12))',
                background: 'var(--color-surface, #fff)',
                color: selectedCityFSA ? 'var(--color-text)' : 'var(--color-text-faint)',
                fontSize: '14px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                outline: 'none',
              }}
            >
              <option value="">Select a city</option>
              {citiesForProvince.map(city => (
                <option key={city.fsa} value={city.fsa}>
                  {city.metro}
                </option>
              ))}
            </select>
            {/* Custom dropdown arrow */}
            <div
              style={{
                position: 'absolute',
                right: '12px',
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
        </div>
      )}

      {/* Borough picker — Toronto only */}
      {showBoroughPicker && (
        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-text-faint)',
              marginBottom: '8px',
            }}
          >
            Neighbourhood (optional)
          </label>
          <ChoiceGroup
            ariaLabel="Toronto neighbourhood"
            columns={2}
            variant="chip"
            align="left"
            options={TORONTO_BOROUGHS.map(b => ({ value: b.fsa, label: b.label }))}
            value={selectedBorough}
            onChange={selectBorough}
          />
        </div>
      )}

      {/* Status text */}
      {pcStatus && (
        <div
          style={{
            fontSize: '12px',
            color: 'var(--color-renter)',
            marginBottom: '12px',
            marginTop: '-4px',
          }}
        >
          {pcStatus}
        </div>
      )}

      {/* First-time buyer */}
      <div style={{ marginBottom: '12px' }}>
        <Toggle
          checked={inputs.isFirstTimeBuyer ?? false}
          onChange={v => patch({ isFirstTimeBuyer: v })}
          label="First-time buyer"
          description="Applies the provincial LTT rebate at closing."
          accentColor="var(--color-owner)"
        />
      </div>

      {inputs.province === 'ON' && (
        <div style={{ marginBottom: '12px' }}>
          <Toggle
            checked={inputs.isTorontoMunicipalLTT ?? false}
            onChange={v => patch({ isTorontoMunicipalLTT: v })}
            label="Within the City of Toronto"
            description="Adds the Toronto municipal LTT. Auto-set when you pick a Toronto neighbourhood."
            accentColor="var(--color-owner)"
          />
        </div>
      )}

      <StepAdvanced label="Postal code and tax overrides">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TextInput
            label="Postal code (optional)"
            value={pcRaw}
            onChange={applyPostalCode}
            placeholder="e.g. M5V or T2P3C2"
            maxLength={7}
            description="Enter your FSA (first 3 chars) or full postal code for more precise defaults."
          />

          <FactorSlider
            factor={FACTORS.propertyTax}
            inputs={inputs}
            patch={patch}
            description="Province default applied on selection. ON Toronto ~0.65%, BC ~0.3%, MB/SK ~1.2%."
          />

          <div>
            <Toggle
              checked={hasRentControl}
              onChange={v =>
                patch({
                  rentControlCapPct: v
                    ? (defaultInputsFor(inputs.province ?? 'ON').rentControlCapPct ?? 0.025)
                    : null,
                })
              }
              label="Rent control applies"
              description="Caps annual in-place rent increases. On a renter move, rent resets to market."
              accentColor="var(--color-renter)"
            />
            {hasRentControl && (
              <div style={{ marginTop: '12px' }}>
                <RangeInput
                  label={`Annual cap: ${(capPct * 100).toFixed(1)}%`}
                  value={capPct * 100}
                  min={0.5}
                  max={5}
                  step={0.25}
                  onChange={v => patch({ rentControlCapPct: v / 100 })}
                  formatValue={v => `${v.toFixed(1)}%`}
                  color="var(--color-renter)"
                  minLabel="0.5%"
                  maxLabel="5%"
                  description="ON guideline: 2.5%. BC: 3.0%. Vacancy decontrol means each renter move resets to market."
                />
              </div>
            )}
          </div>
        </div>
      </StepAdvanced>
    </div>
  );
}
