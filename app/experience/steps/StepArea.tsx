'use client';

import { useState } from 'react';
import type { CalculatorInputs } from '@/engine';
import { defaultInputsFor, suggestPriceAndRent, provinceFromPostalCode, normalizeFSA3 } from '@/engine';
import { METRO_CENTROIDS } from '@/engine/data/regions/coordinates';
import { Toggle, ChoiceGroup, StepAdvanced, FactorSlider, RangeInput, TextInput } from '../components';
import { FACTORS } from '../config/factors';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

// Toronto sub-regions with representative FSAs
const TORONTO_BOROUGHS: { label: string; fsa: string }[] = [
  { label: 'Downtown',    fsa: 'M5V' },
  { label: 'East End',    fsa: 'M4K' },
  { label: 'West End',    fsa: 'M6J' },
  { label: 'North York',  fsa: 'M3C' },
  { label: 'Scarborough', fsa: 'M1C' },
  { label: 'Etobicoke',   fsa: 'M8V' },
];
const TORONTO_BOROUGH_FSAS = new Set(TORONTO_BOROUGHS.map(b => b.fsa));

export function StepArea({ inputs, patch }: Props) {
  const [pcRaw, setPcRaw] = useState(
    inputs.postalCode && inputs.postalCode.length > 3 ? inputs.postalCode : '',
  );
  const [pcStatus, setPcStatus] = useState<string | null>(null);

  const hasRentControl = inputs.rentControlCapPct != null;
  const capPct = inputs.rentControlCapPct ?? 0.025;

  // Determine current city name from the selected FSA
  const fsa3 = (inputs.postalCode ?? '').substring(0, 3).toUpperCase();
  const selectedMetro =
    METRO_CENTROIDS.find(m => m.fsa === fsa3) ??
    METRO_CENTROIDS.find(m => m.province === inputs.province && m.fsa.startsWith(fsa3.substring(0, 2))) ??
    null;
  const cityName = selectedMetro?.metro ?? '';

  // Toronto: all M-prefix postal codes are within the City of Toronto
  const isToronto = fsa3.startsWith('M');
  const selectedBorough = TORONTO_BOROUGH_FSAS.has(fsa3) ? fsa3 : '';

  function selectBorough(fsa: string) {
    const homeType = inputs.homeType ?? 'condo-apt';
    const suggestion = suggestPriceAndRent(fsa, homeType);
    patch({
      postalCode: fsa,
      isTorontoMunicipalLTT: fsa.startsWith('M'),
      propertyTaxPct: suggestion?.propertyTaxPct ?? inputs.propertyTaxPct,
      ...(suggestion ? { homePrice: suggestion.medianPrice, monthlyRent: Math.round(suggestion.suggestedMonthlyRent) } : {}),
    });
  }

  function applyPostalCode(raw: string) {
    const clean = raw.replace(/\s+/g, '').toUpperCase();
    setPcRaw(clean);
    if (clean.length < 3) { setPcStatus(null); return; }

    const province = provinceFromPostalCode(clean);
    if (!province) { setPcStatus('Postal code not recognized.'); return; }

    const fsa3local = normalizeFSA3(clean);
    const homeType = inputs.homeType ?? 'condo-apt';
    const suggestion = fsa3local ? suggestPriceAndRent(clean, homeType) : null;
    const provDefaults = defaultInputsFor(province);

    setPcStatus(suggestion ? `Data for ${suggestion.regionName}.` : null);

    patch({
      postalCode: clean,
      province,
      propertyTaxPct: suggestion?.propertyTaxPct ?? provDefaults.propertyTaxPct,
      isTorontoMunicipalLTT: suggestion?.municipalLTT ?? false,
      rentControlCapPct: provDefaults.rentControlCapPct,
      marginalTaxRatePct: provDefaults.marginalTaxRatePct,
      ...(suggestion ? { homePrice: suggestion.medianPrice, monthlyRent: Math.round(suggestion.suggestedMonthlyRent) } : {}),
    });
  }

  return (
    <div>
      {/* City badge */}
      {cityName && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor: 'var(--color-bg-subtle, rgba(0,0,0,0.04))',
          border: '1px solid var(--color-border, rgba(0,0,0,0.1))',
          borderRadius: '9999px',
          marginBottom: '16px',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            flexShrink: 0,
          }} />
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-muted)',
            letterSpacing: '-0.01em',
          }}>
            {cityName}
          </span>
        </div>
      )}

      {/* Toronto: Borough picker */}
      {isToronto && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text-faint)',
            marginBottom: '8px',
          }}>
            Neighbourhood
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
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-faint)', lineHeight: 1.5 }}>
            Each neighbourhood has distinct price and rent benchmarks. Skip to use city-wide Toronto defaults.
          </p>
        </div>
      )}

      {/* Non-Toronto: Postal code refinement (visible by default) */}
      {!isToronto && (
        <div style={{ marginBottom: '20px' }}>
          <TextInput
            label="Your postal code (optional)"
            value={pcRaw}
            onChange={applyPostalCode}
            placeholder="e.g. K2G, T2P3C2"
            maxLength={7}
            description={pcStatus ?? 'Enter your FSA (first 3 chars) or full postal code for neighbourhood-level data.'}
          />
        </div>
      )}

      {/* First-time buyer */}
      <div style={{ marginBottom: '12px' }}>
        <Toggle
          checked={inputs.isFirstTimeBuyer ?? false}
          onChange={v => patch({ isFirstTimeBuyer: v })}
          label="First-time buyer"
          description="Applies the provincial LTT rebate at closing. The map shows exactly how much you save."
          accentColor="var(--color-owner)"
        />
      </div>

      {/* Toronto municipal LTT — ON only */}
      {inputs.province === 'ON' && (
        <div style={{ marginBottom: '12px' }}>
          <Toggle
            checked={inputs.isTorontoMunicipalLTT ?? false}
            onChange={v => patch({ isTorontoMunicipalLTT: v })}
            label="Within the City of Toronto"
            description="Adds the Toronto municipal LTT. Auto-set when you pick a neighbourhood above."
            accentColor="var(--color-owner)"
          />
        </div>
      )}

      <StepAdvanced label="Tax and rent control">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Toronto: postal code refinement buried here */}
          {isToronto && (
            <TextInput
              label="Exact postal code (optional)"
              value={pcRaw}
              onChange={applyPostalCode}
              placeholder="e.g. M5V 2T6"
              maxLength={7}
              description={pcStatus ?? 'Refine beyond the neighbourhood level.'}
            />
          )}

          <FactorSlider
            factor={FACTORS.propertyTax}
            inputs={inputs}
            patch={patch}
            description="Province default applied on city selection. ON Toronto ~0.65%, BC ~0.3%, MB/SK ~1.2%."
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
                  description="ON guideline: 2.5%. BC: 3.0%. Each renter move resets in-place rent to market."
                />
              </div>
            )}
          </div>
        </div>
      </StepAdvanced>
    </div>
  );
}
