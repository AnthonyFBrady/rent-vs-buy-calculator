'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { CalculatorInputs, HomeType } from '@/engine';
import { homeTypeDefaults, HOME_TYPES, suggestPriceAndRent } from '@/engine';
import { ChoiceGroup } from '../components';

interface Props {
  inputs: CalculatorInputs;
  patch: (p: Partial<CalculatorInputs>) => void;
}

const HOME_TYPE_LABEL: Record<HomeType, string> = {
  'condo-apt':          'Condo',
  'condo-townhouse':    'Condo TH',
  'freehold-townhouse': 'Freehold TH',
  'semi-detached':      'Semi',
  'detached':           'Detached',
};

const BED_OPTIONS = [
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 Bed' },
  { value: '2', label: '2 Bed' },
  { value: '3', label: '3 Bed' },
  { value: '4', label: '4+ Bed' },
];

// Bedroom price multipliers relative to the 2BR baseline from suggestPriceAndRent.
// Source: CMHC market segmentation data for major Canadian cities, 2024.
// Exported so MapPanel can apply the same multipliers to the choropleth.
export const BED_PRICE_MULT: Record<number, number> = { 0: 0.65, 1: 0.82, 2: 1.00, 3: 1.25, 4: 1.55 };
export const BED_RENT_MULT:  Record<number, number>  = { 0: 0.62, 1: 0.80, 2: 1.00, 3: 1.28, 4: 1.60 };

function labelFor(type: HomeType | undefined, beds: number | undefined): string {
  if (!type) return '';
  const typeLabel = HOME_TYPE_LABEL[type];
  if (beds === undefined) return typeLabel;
  const bedLabel = BED_OPTIONS.find(b => Number(b.value) === beds)?.label ?? '';
  return `${bedLabel} ${typeLabel}`;
}

export function StepHomeCompare({ inputs, patch }: Props) {
  // 'buy' phase shows first. Rent section appears after buy is answered.
  const [buyDone, setBuyDone] = useState(
    inputs.homeType !== undefined && inputs.buyBedrooms !== undefined,
  );

  const buyType = inputs.homeType;
  const buyBeds = inputs.buyBedrooms;
  const rentType = inputs.rentHomeType ?? inputs.homeType;
  const rentBeds = inputs.rentBedrooms ?? inputs.buyBedrooms;

  function applyBuyType(ht: HomeType) {
    const d = homeTypeDefaults(ht);
    const sug = inputs.postalCode ? suggestPriceAndRent(inputs.postalCode, ht) : null;
    const basePrice = sug?.medianPrice ?? inputs.homePrice;
    const beds = inputs.buyBedrooms ?? 2;
    const mult = BED_PRICE_MULT[beds] ?? 1;
    patch({
      homeType: ht,
      maintenancePct: d.maintenancePct,
      monthlyStrataFee: d.monthlyStrataFee,
      homeAppreciationPct: d.homeAppreciationPct,
      propertyTaxPct: sug?.propertyTaxPct ?? inputs.propertyTaxPct,
      homePrice: Math.round(basePrice * mult),
    });
    maybeRevealRent(ht, inputs.buyBedrooms);
  }

  function applyBuyBeds(bedsStr: string) {
    const beds = Number(bedsStr);
    const ht = inputs.homeType ?? 'condo-apt';
    const sug = inputs.postalCode ? suggestPriceAndRent(inputs.postalCode, ht) : null;
    const basePrice = sug?.medianPrice ?? inputs.homePrice;
    const mult = BED_PRICE_MULT[beds] ?? 1;
    patch({
      buyBedrooms: beds,
      homePrice: Math.round(basePrice * mult),
    });
    maybeRevealRent(inputs.homeType, beds);
  }

  function applyRentType(ht: HomeType) {
    const sug = inputs.postalCode ? suggestPriceAndRent(inputs.postalCode, ht) : null;
    const baseRent = sug?.suggestedMonthlyRent ?? inputs.monthlyRent;
    const beds = inputs.rentBedrooms ?? inputs.buyBedrooms ?? 2;
    const mult = BED_RENT_MULT[beds] ?? 1;
    patch({
      rentHomeType: ht,
      monthlyRent: Math.round(baseRent * mult),
    });
  }

  function applyRentBeds(bedsStr: string) {
    const beds = Number(bedsStr);
    const ht = inputs.rentHomeType ?? inputs.homeType ?? 'condo-apt';
    const sug = inputs.postalCode ? suggestPriceAndRent(inputs.postalCode, ht) : null;
    const baseRent = sug?.suggestedMonthlyRent ?? inputs.monthlyRent;
    const mult = BED_RENT_MULT[beds] ?? 1;
    patch({
      rentBedrooms: beds,
      monthlyRent: Math.round(baseRent * mult),
    });
  }

  function maybeRevealRent(ht: HomeType | undefined, beds: number | undefined) {
    if (ht !== undefined && beds !== undefined && !buyDone) {
      setBuyDone(true);
    }
  }

  const rentRevealReady = buyDone;
  const fmtCAD = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

  return (
    <div>
      {/* ── BUY SECTION ── */}
      <div style={{ marginBottom: rentRevealReady ? '28px' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'color-mix(in srgb, var(--color-owner) 15%, transparent)',
            border: '1.5px solid var(--color-owner)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-owner)' }}>B</span>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
            What would you buy?
          </span>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <ChoiceGroup
            ariaLabel="Home type to buy"
            columns={3}
            variant="chip"
            align="center"
            options={HOME_TYPES.map(ht => ({ value: ht, label: HOME_TYPE_LABEL[ht] }))}
            value={buyType}
            onChange={applyBuyType}
          />
        </div>

        <ChoiceGroup
          ariaLabel="Bedrooms for buy"
          columns={5}
          variant="chip"
          align="center"
          options={BED_OPTIONS}
          value={buyBeds !== undefined ? String(buyBeds) : undefined}
          onChange={applyBuyBeds}
        />

        {buyType && buyBeds !== undefined && (
          <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            {labelFor(buyType, buyBeds)} — seeding at {fmtCAD.format(inputs.homePrice)}.
          </p>
        )}
      </div>

      {/* ── RENT SECTION — appears once buy is answered ── */}
      <AnimatePresence>
        {rentRevealReady && (
          <motion.div
            key="rent-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.32, ease: [0.0, 0.0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ height: '1px', backgroundColor: 'var(--color-outline)', marginBottom: '20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'color-mix(in srgb, var(--color-renter) 12%, transparent)',
                border: '1.5px solid var(--color-renter)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-renter)' }}>R</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                What would you rent?
              </span>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <ChoiceGroup
                ariaLabel="Home type to rent"
                columns={3}
                variant="chip"
                align="center"
                options={HOME_TYPES.map(ht => ({ value: ht, label: HOME_TYPE_LABEL[ht] }))}
                value={rentType}
                onChange={applyRentType}
              />
            </div>

            <ChoiceGroup
              ariaLabel="Bedrooms for rent"
              columns={5}
              variant="chip"
              align="center"
              options={BED_OPTIONS}
              value={rentBeds !== undefined ? String(rentBeds) : undefined}
              onChange={applyRentBeds}
            />

            {rentType && rentBeds !== undefined && (
              <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                {labelFor(rentType, rentBeds)} — seeding at {fmtCAD.format(inputs.monthlyRent)}/mo.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
