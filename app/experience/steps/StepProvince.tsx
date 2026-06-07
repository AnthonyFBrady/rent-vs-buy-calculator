'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import type { CalculatorInputs, Province } from '@/engine';
import { defaultInputsFor } from '@/engine';
import { SelectionCard, RangeInput } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const PROVINCES: { value: Province; label: string; note?: string }[] = [
  { value: 'ON', label: 'Ontario', note: 'double LTT' },
  { value: 'BC', label: 'British Columbia', note: 'rent control' },
  { value: 'AB', label: 'Alberta', note: 'no LTT' },
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
      isTorontoMunicipalLTT: p === 'ON',
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="flex flex-col"
    >

      <h2 className="mt-4 font-serif text-3xl leading-[1.15] tracking-[-0.02em] sm:text-4xl">
        Which province?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Sets land transfer tax, rent control rules, and typical market prices.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {PROVINCES.map((p) => (
          <SelectionCard
            key={p.value}
            selected={current === p.value}
            onClick={() => selectProvince(p.value)}
            label={p.value}
            note={p.note}
          />
        ))}
      </div>

      {current === 'ON' && (
        <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={inputs.isTorontoMunicipalLTT ?? true}
            onChange={(e) => patch({ isTorontoMunicipalLTT: e.target.checked })}
            style={{ accentColor: 'var(--color-owner)' }}
          />
          <span className="text-muted">Within the city of Toronto (adds municipal LTT)</span>
        </label>
      )}

      {/* Property tax — collapsible */}
      <div className="mt-5">
        <button
          type="button"
          onClick={() => setTaxOpen((v) => !v)}
          className="flex items-center gap-2 text-xs transition-opacity"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)', opacity: 0.6 }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
        >
          <span>{taxOpen ? '▾' : '▸'}</span>
          <span>Property tax: {taxPct}%/yr</span>
        </button>
        {taxOpen && (
          <div className="mt-3">
            <RangeInput
              label=""
              value={inputs.propertyTaxPct * 100}
              min={0.3}
              max={2.5}
              step={0.05}
              onChange={(v) => patch({ propertyTaxPct: v / 100 })}
              formatValue={(v) => `${v.toFixed(2)}%`}
              color="var(--color-owner)"
              minLabel="0.30%"
              maxLabel="2.50%"
              description="Ontario effective rate ~0.65–1.1% (Toronto lower end). BC ~0.3–0.6%. Province default applied on selection."
            />
          </div>
        )}
      </div>

    </motion.div>
  );
}
